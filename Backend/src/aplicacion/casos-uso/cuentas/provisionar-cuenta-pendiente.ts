import type { Institucion } from '../../../dominio/compartido/institucion.js';
import { crearContextoAutenticado, type CuentaAutorizada } from '../../puertos/contexto-autenticado.js';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import type { AdministradorIdentidad } from '../../puertos/administrador-identidad.js';
import type { BloqueoProvision } from '../../puertos/bloqueo-provision.js';
import type { BundleInstitucional, BundlesInstitucionales } from '../../puertos/bundle-institucional.js';
import { uuidPublico, type UUID } from '../../../dominio/compartido/uuid.js';
import type { Version } from '../../../dominio/compartido/version.js';
import type { VerificadorIdentidad } from '../../puertos/verificador-identidad.js';
import { instanteUtc } from '../../../dominio/compartido/instante-utc.js';
import type { AuditoriaActivacionCuenta } from '../../puertos/repositorio-cuenta.js';

export interface EntradaProvisionarCuentaPendiente {
  /** Selector disponible solo en la herramienta administrativa local, nunca en una ruta HTTP. */
  readonly institucion: Institucion;
  readonly uid: string;
  /** ID token Firebase del administrador; no se registra ni se devuelve. */
  readonly tokenAdministrador: string;
  readonly auditoria: {
    readonly id: string;
    readonly fechaHora: string;
    readonly correlacion: string;
  };
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
    private readonly verificadorIdentidad: VerificadorIdentidad,
    private readonly administradorIdentidad: AdministradorIdentidad,
    private readonly resolverBundles: ResolverBundlesProvision,
    private readonly bloqueo: BloqueoProvision,
  ) {}

  async ejecutar(entrada: EntradaProvisionarCuentaPendiente): Promise<ResultadoProvisionarCuenta> {
    if (typeof entrada.uid !== 'string' || entrada.uid.trim().length === 0) {
      throw new ErrorDominio('SOLICITUD_INVALIDA', 'Se requiere el UID ya asignado a la cuenta pendiente.');
    }
    if (typeof entrada.tokenAdministrador !== 'string' || entrada.tokenAdministrador.trim().length === 0) {
      throw new ErrorDominio('NO_AUTENTICADO', 'Se requiere una sesión administrativa vigente.');
    }
    const correlacion = uuidPublico(entrada.auditoria.correlacion, 'correlacion');
    const identidadActor = await this.verificadorIdentidad.verificar(entrada.tokenAdministrador.trim());
    if (identidadActor.institucion !== entrada.institucion) {
      throw new ErrorDominio('SIN_PERMISO', 'El administrador no pertenece a la institución seleccionada.');
    }
    return this.bloqueo.ejecutar(entrada.uid, async () => {
      const bundles = this.resolverBundles();
      const bundleActor = bundles.find((item) => item.institucion === identidadActor.institucion);
      if (!bundleActor || bundleActor.estadoPersistencia !== 'DISPONIBLE' || !bundleActor.cuenta) {
        throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'El servicio institucional no está disponible.');
      }
      const actor = await consultarCuenta(bundleActor, identidadActor.uid);
      if (!actor) throw new ErrorDominio('SIN_PERMISO', 'La cuenta administrativa no está autorizada.');
      const contextoActor = crearContextoAutenticado(identidadActor, actor, correlacion);
      if (!contextoActor.cuenta.roles.includes('ADMIN_INSTITUCIONAL') ||
          !contextoActor.cuenta.permisos.includes('usuarios.administrar')) {
        throw new ErrorDominio('SIN_PERMISO', 'La cuenta administrativa no está autorizada.');
      }
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
          const auditoria: AuditoriaActivacionCuenta = Object.freeze({
            actorUid: identidadActor.uid,
            evento: Object.freeze({
              id: uuidPublico(entrada.auditoria.id, 'id_auditoria'),
              actorId: contextoActor.cuenta.id,
              caso: 'CUENTA_PROVISIONADA',
              recursoId: cuenta.id,
              fechaHora: instanteUtc(entrada.auditoria.fechaHora),
              correlacion,
            }),
          });
          const activada = await bundle.cuenta.activarPendiente(entrada.uid, cuenta.version, auditoria);
          if (!activada) {
            throw new ErrorDominio('VERSION_DESACTUALIZADA', 'La cuenta cambió durante la provisión; reanuda con el mismo UID.');
          }
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
