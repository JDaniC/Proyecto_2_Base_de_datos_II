import type { CuentaAutorizada } from '../../../aplicacion/puertos/contexto-autenticado.js';
import type {
  RepositorioCuenta,
  RepositorioProfesional,
  ProfesionalLeido,
  AuditoriaActivacionCuenta,
} from '../../../aplicacion/puertos/repositorio-cuenta.js';
import type { Institucion } from '../../../dominio/compartido/institucion.js';
import type { UUID } from '../../../dominio/compartido/uuid.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../dominio/compartido/version.js';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';

export class RepositorioCuentaEnMemoria implements RepositorioCuenta, RepositorioProfesional {
  private readonly cuentasPorUid = new Map<string, CuentaAutorizada>();
  private readonly profesionalesPorId = new Map<string, ProfesionalLeido>();
  private readonly eventosProvision = new Map<string, AuditoriaActivacionCuenta['evento']>();

  constructor(
    readonly institucion: Institucion,
    cuentasIniciales: readonly CuentaAutorizada[] = [],
    profesionalesIniciales: readonly ProfesionalLeido[] = [],
  ) {
    for (const cuenta of cuentasIniciales) {
      this.registrarCuenta(cuenta);
    }
    for (const profesional of profesionalesIniciales) {
      this.registrarProfesional(profesional);
    }
  }

  registrarCuenta(cuenta: CuentaAutorizada): void {
    if (cuenta.institucion !== this.institucion) return;
    const segura: CuentaAutorizada = Object.freeze({
      id: uuidPublico(cuenta.id, 'cuenta_id'),
      uid: cuenta.uid,
      institucion: this.institucion,
      estado: cuenta.estado,
      roles: Object.freeze([...new Set(cuenta.roles)]),
      permisos: Object.freeze([...new Set(cuenta.permisos)]),
      version: versionPositiva(cuenta.version, 'version'),
      ...(cuenta.profesional ? {
        profesional: Object.freeze({
          id: uuidPublico(cuenta.profesional.id, 'profesional_id'),
          activo: Boolean(cuenta.profesional.activo),
        }),
      } : {}),
    });
    this.cuentasPorUid.set(cuenta.uid, segura);
  }

  registrarProfesional(profesional: ProfesionalLeido): void {
    const seguro: ProfesionalLeido = Object.freeze({
      id: uuidPublico(profesional.id, 'profesional_id'),
      nombre: profesional.nombre,
      rol: profesional.rol,
      activo: Boolean(profesional.activo),
    });
    this.profesionalesPorId.set(seguro.id, seguro);
  }

  async porUid(uidVerificado: string): Promise<CuentaAutorizada | null> {
    const cuenta = this.cuentasPorUid.get(uidVerificado);
    return cuenta ?? null;
  }

  async activarPendiente(
    uid: string,
    versionEsperada: CuentaAutorizada['version'],
    auditoria: AuditoriaActivacionCuenta,
  ): Promise<boolean> {
    const cuenta = this.cuentasPorUid.get(uid);
    if (!cuenta) return false;
    if (cuenta.estado === 'ACTIVA') return true;
    if (cuenta.estado !== 'PENDIENTE' || cuenta.version !== versionEsperada) return false;
    const actor = this.cuentasPorUid.get(auditoria.actorUid);
    if (!actor || actor.id !== auditoria.evento.actorId || actor.estado !== 'ACTIVA' ||
        actor.institucion !== this.institucion || !actor.roles.includes('ADMIN_INSTITUCIONAL') ||
        !actor.permisos.includes('usuarios.administrar') || auditoria.evento.caso !== 'CUENTA_PROVISIONADA' ||
        auditoria.evento.recursoId !== cuenta.id) {
      throw new ErrorDominio('SIN_PERMISO', 'La cuenta administrativa no está vigente para esta operación.');
    }
    if (!Number.isSafeInteger(cuenta.version + 1)) {
      throw new ErrorDominio('VERSION_DESACTUALIZADA', 'La revisión de cuenta alcanzó el límite admitido.');
    }
    this.registrarCuenta({ ...cuenta, estado: 'ACTIVA', version: versionPositiva(cuenta.version + 1) });
    this.eventosProvision.set(auditoria.evento.id, auditoria.evento);
    return true;
  }

  listarEventosProvision(): readonly AuditoriaActivacionCuenta['evento'][] {
    return Object.freeze([...this.eventosProvision.values()]);
  }

  async guardar(cuenta: CuentaAutorizada): Promise<void> {
    this.registrarCuenta(cuenta);
  }

  async porId(profesionalId: UUID): Promise<ProfesionalLeido | null> {
    const profesional = this.profesionalesPorId.get(profesionalId);
    return profesional ?? null;
  }
}
