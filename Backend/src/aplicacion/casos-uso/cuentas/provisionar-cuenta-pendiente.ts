import type { Institucion } from '../../../dominio/compartido/institucion.js';
import type { CuentaAutorizada } from '../../puertos/contexto-autenticado.js';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import type { AdministradorIdentidad } from '../../puertos/administrador-identidad.js';
import type { BloqueoProvision } from '../../puertos/bloqueo-provision.js';
import type { BundleInstitucional, BundlesInstitucionales } from '../../puertos/bundle-institucional.js';
import type { UUID } from '../../../dominio/compartido/uuid.js';
import type { Version } from '../../../dominio/compartido/version.js';

export interface EntradaProvisionarCuentaPendiente {
  /** Selector disponible solo en la herramienta administrativa local, nunca en una ruta HTTP. */
  readonly institucion: Institucion;
  readonly uid: string;
}

export interface ResultadoProvisionarCuenta {
  readonly cuenta_id: UUID;
  readonly institucion: Institucion;
  readonly estado: 'ACTIVA';
  readonly version: Version;
  /** ID estable para reanudar tras una interrupción externa: institución + UID local existente. */
  readonly id_operacion: string;
}

export type ResolverBundlesProvision = () => BundlesInstitucionales;

export class ProvisionarCuentaPendiente {
  constructor(
    private readonly administradorIdentidad: AdministradorIdentidad,
    private readonly resolverBundles: ResolverBundlesProvision,
    private readonly bloqueo: BloqueoProvision,
  ) {}

  async ejecutar(entrada: EntradaProvisionarCuentaPendiente): Promise<ResultadoProvisionarCuenta> {
    if (typeof entrada.uid !== 'string' || entrada.uid.trim().length === 0) {
      throw new ErrorDominio('SOLICITUD_INVALIDA', 'Se requiere el UID ya asignado a la cuenta pendiente.');
    }
    return this.bloqueo.ejecutar(entrada.uid, async () => {
      const bundles = this.resolverBundles();
      const coincidencias: Array<{ bundle: BundleInstitucional; cuenta: CuentaAutorizada }> = [];
      for (const bundle of bundles) {
        if (!bundle.cuenta || bundle.estadoPersistencia !== 'DISPONIBLE') {
          throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'El servicio institucional no está disponible.');
        }
        const cuenta = await consultarCuenta(bundle, entrada.uid);
        if (cuenta) coincidencias.push({ bundle, cuenta });
      }
      if (coincidencias.length === 0) {
        throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'No existe una cuenta local con ese UID.');
      }
      if (coincidencias.length !== 1 || coincidencias[0]?.bundle.institucion !== entrada.institucion) {
        throw new ErrorDominio('SIN_PERMISO', 'El UID tiene un vínculo local institucional discordante.');
      }

      const { bundle, cuenta } = coincidencias[0];
      if (!bundle.cuenta?.activarPendiente) {
        throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'La herramienta administrativa no está habilitada para esta institución.');
      }
      if (cuenta.institucion !== entrada.institucion) {
        throw new ErrorDominio('SIN_PERMISO', 'La cuenta no pertenece al bundle seleccionado.');
      }
      if (cuenta.estado !== 'PENDIENTE' && cuenta.estado !== 'ACTIVA') {
        throw new ErrorDominio('CUENTA_NO_HABILITADA', 'Solo se pueden provisionar cuentas pendientes o ya activas.');
      }
      validarVinculoProfesional(cuenta);

      // Auth y persistencia son sistemas separados: claim primero; si falla, el estado sigue PENDIENTE.
      await this.administradorIdentidad.asegurarClaimInstitucion(entrada.uid, entrada.institucion);
      if (cuenta.estado === 'PENDIENTE') {
        try {
          await bundle.cuenta.activarPendiente(entrada.uid, cuenta.version);
        } catch (error: unknown) {
          if (error instanceof ErrorDominio) throw error;
          throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible activar la cuenta local.');
        }
      }

      const actualizada = await consultarCuenta(bundle, entrada.uid);
      if (!actualizada || actualizada.institucion !== entrada.institucion || actualizada.estado !== 'ACTIVA') {
        throw new ErrorDominio('VERSION_DESACTUALIZADA', 'La cuenta cambió durante la provisión; reanuda con el mismo UID.');
      }
      return Object.freeze({
        cuenta_id: actualizada.id,
        institucion: actualizada.institucion,
        estado: 'ACTIVA',
        version: actualizada.version,
        id_operacion: `${actualizada.institucion}:${actualizada.uid}`,
      });
    });
  }
}

async function consultarCuenta(bundle: BundleInstitucional, uid: string): Promise<CuentaAutorizada | null> {
  try {
    return await bundle.cuenta!.porUid(uid);
  } catch (error: unknown) {
    if (error instanceof ErrorDominio) throw error;
    throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible consultar la cuenta local.');
  }
}

function validarVinculoProfesional(cuenta: CuentaAutorizada): void {
  const requiereProfesional = cuenta.roles.some((rol) =>
    rol === 'MEDICO' || rol === 'ODONTOLOGO' || rol === 'PEDIATRA' || rol === 'MEDICO_LABORATORIO');
  if (requiereProfesional && (!cuenta.profesional || !cuenta.profesional.activo)) {
    throw new ErrorDominio('CUENTA_NO_HABILITADA', 'El rol profesional requiere un vínculo profesional activo.');
  }
}
