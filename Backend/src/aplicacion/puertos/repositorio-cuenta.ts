import type { CuentaAutorizada } from './contexto-autenticado.js';
import type { UUID } from '../../dominio/compartido/uuid.js';
import type { Rol } from '../../dominio/compartido/autorizacion.js';
import type { Version } from '../../dominio/compartido/version.js';
import type { EventoAuditoria } from './nucleo.js';

export interface ProfesionalLeido {
  readonly id: UUID;
  readonly nombre: string;
  readonly rol: Rol;
  readonly activo: boolean;
}

export interface RepositorioProfesional {
  porId(profesionalId: UUID): Promise<ProfesionalLeido | null>;
}

export interface AuditoriaActivacionCuenta {
  /** UID del actor autenticado; el adaptador lo revalida junto con permisos dentro de la transacción. */
  readonly actorUid: string;
  readonly evento: EventoAuditoria;
}

export interface RepositorioCuenta {
  /** Ya ligado al bundle institucional, sin parámetro de motor o institución. */
  porUid(uidVerificado: string): Promise<CuentaAutorizada | null>;

  /** Operación administrativa condicional, fuera de las UoW clínicas. */
  activarPendiente?(uid: string, versionEsperada: Version, auditoria: AuditoriaActivacionCuenta): Promise<boolean>;
}
