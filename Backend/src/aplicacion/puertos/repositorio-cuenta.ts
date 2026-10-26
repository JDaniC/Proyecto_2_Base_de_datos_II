import type { CuentaAutorizada } from './contexto-autenticado.js';
import type { UUID } from '../../dominio/compartido/uuid.js';
import type { Rol } from '../../dominio/compartido/autorizacion.js';
import type { Version } from '../../dominio/compartido/version.js';

export interface ProfesionalLeido {
  readonly id: UUID;
  readonly nombre: string;
  readonly rol: Rol;
  readonly activo: boolean;
}

export interface RepositorioProfesional {
  porId(profesionalId: UUID): Promise<ProfesionalLeido | null>;
}

export interface RepositorioCuenta {
  /** Ya ligado al bundle institucional, sin parámetro de motor o institución. */
  porUid(uidVerificado: string): Promise<CuentaAutorizada | null>;

  /** Operación administrativa condicional, fuera de las UoW clínicas. */
  activarPendiente?(uid: string, versionEsperada: Version): Promise<boolean>;
}
