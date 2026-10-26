import type { InstanteUTC } from '../../dominio/compartido/instante-utc.js';
import type { ContextoAutenticado } from './contexto-autenticado.js';
import type { UUID } from '../../dominio/compartido/uuid.js';
import type { Version } from '../../dominio/compartido/version.js';

export interface Reloj { ahora(): InstanteUTC; }
export interface GeneradorIds { nuevo(): UUID; }
export interface HashIntencion {
  /** SHA-256 sobre UTF-8; devuelve 64 dígitos hexadecimales minúsculos. */
  sha256(textoCanonicoJcs: string): Promise<string>;
}

export interface ComandoEstable {
  readonly id: UUID;
  readonly claveIdempotencia: UUID;
  readonly caso: string;
  readonly hashEntrada: string;
  readonly instante: InstanteUTC;
  /** IDs de datos, revisiones y eventos fijados antes de cualquier callback repetible. */
  readonly ids: Readonly<Record<string, UUID>>;
}

export interface ResultadoDurable<T> {
  readonly httpStatus: number;
  readonly respuesta: T;
  readonly correlacionOriginal: UUID;
}

export interface OperacionIdempotente<T> {
  readonly hashEntrada: string;
  readonly resultado: ResultadoDurable<T>;
}

export interface RepositorioOperaciones {
  /** El adaptador aplica ámbito de institución, actor y caso dentro de su bundle/UoW. */
  porClave<T>(actorId: UUID, caso: string, claveIdempotencia: UUID): Promise<OperacionIdempotente<T> | null>;
}

export interface Pagina<T> {
  readonly elementos: readonly T[];
  readonly siguienteCursor?: string;
}
export interface FiltrosPagina {
  readonly limite: number;
  readonly cursor?: string;
  readonly orden: 'ASC' | 'DESC';
}
/** Puertos de lectura ligados a la conexión/sesión transaccional. */
export interface RepositorioPorId<T> { porId(id: UUID): Promise<T | null>; }
export interface RepositorioPorVersion<T> { porVersion(id: UUID, version: Version): Promise<T | null>; }
export interface RepositorioCuenta<TCuenta> { porUid(uidVerificado: string): Promise<TCuenta | null>; }
export interface Identificacion { readonly tipo: 'CUI' | 'PASAPORTE'; readonly numero: string; }
export interface RepositorioIdentidades { titular(identificacionNormalizada: Identificacion): Promise<UUID | null>; }
export type RepositorioPaciente<TPaciente> = RepositorioPorId<TPaciente> & RepositorioPorVersion<TPaciente>;
export type RepositorioCita<TCita> = RepositorioPorId<TCita>;
export type RepositorioConsulta<TConsulta> = RepositorioPorId<TConsulta> & RepositorioPorVersion<TConsulta>;
export interface RepositorioResponsables<TResponsable> extends RepositorioPorId<TResponsable> {
  porPaciente(pacienteId: UUID, pagina: FiltrosPagina): Promise<Pagina<TResponsable>>;
}
export type RepositorioProfesional<TProfesional> = RepositorioPorId<TProfesional>;
export interface ConsultaHistorial<TEvento> {
  eventos(pacienteId: UUID, pagina: FiltrosPagina): Promise<Pagina<TEvento>>;
}

/** Adaptado por tipo de agregado en aplicación, nunca por tabla ni motor. */
export interface LectorTransaccional<
  TCuenta = unknown,
  TPaciente = unknown,
  TCita = unknown,
  TConsulta = unknown,
  TResponsable = unknown,
  TProfesional = unknown,
  TEvento = unknown,
> {
  readonly cuentas: RepositorioCuenta<TCuenta>;
  readonly pacientes: RepositorioPaciente<TPaciente>;
  readonly citas: RepositorioCita<TCita>;
  readonly consultas: RepositorioConsulta<TConsulta>;
  readonly identidades: RepositorioIdentidades;
  readonly responsables: RepositorioResponsables<TResponsable>;
  readonly profesionales: RepositorioProfesional<TProfesional>;
  readonly historial: ConsultaHistorial<TEvento>;
  readonly operaciones: RepositorioOperaciones;
}

export interface CambioPlanificado<TEstado = unknown> {
  readonly agregado: string;
  readonly tipo: string;
  readonly recursoId: UUID;
  readonly versionAnterior: Version | null;
  /** Snapshot tipado por la extensión de aplicación; no contiene SQL ni ruta documental. */
  readonly nuevoEstado: TEstado;
}

export interface RevisionPlanificada<TSnapshot = unknown> {
  readonly id: UUID;
  readonly agregado: string;
  readonly recursoId: UUID;
  readonly versionAnterior: Version;
  readonly snapshotAnterior: TSnapshot;
}

export interface EventoAuditoria {
  readonly id: UUID;
  readonly actorId: UUID;
  readonly caso: string;
  readonly recursoId: UUID;
  readonly fechaHora: InstanteUTC;
  readonly correlacion: UUID;
  // No incluye payload clínico; institución y actor se sellan desde el contexto verificado.
}

export interface PlanConfirmacion<T, TEstado = unknown, TSnapshot = unknown> {
  readonly tipo: 'CONFIRMAR';
  readonly cambios: readonly CambioPlanificado<TEstado>[];
  readonly revisiones: readonly RevisionPlanificada<TSnapshot>[];
  readonly auditoria: readonly EventoAuditoria[];
  readonly resultado: ResultadoDurable<T>;
}

export interface PlanRepeticion<T> {
  readonly tipo: 'REPETIR';
  readonly operacion: OperacionIdempotente<T>;
}

export type PlanDeEscrituras<T, TEstado = unknown, TSnapshot = unknown> = PlanConfirmacion<T, TEstado, TSnapshot> | PlanRepeticion<T>;

/**
 * Un ejecutor valida el plan y aplica datos, revisiones, operación y auditoría en
 * una sola unidad atómica. El callback puede repetirse y por eso no admite efectos
 * externos, commits ni IDs generados dentro de él.
 */
export interface UnidadDeTrabajo<
  TCuenta = unknown,
  TPaciente = unknown,
  TCita = unknown,
  TConsulta = unknown,
  TResponsable = unknown,
  TProfesional = unknown,
  TEvento = unknown,
> {
  ejecutar<T, TEstado = unknown, TSnapshot = unknown>(
    contexto: ContextoAutenticado,
    comando: ComandoEstable,
    planificar: (lector: LectorTransaccional<TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento>) => Promise<PlanDeEscrituras<T, TEstado, TSnapshot>>,
  ): Promise<ResultadoDurable<T>>;
}

export interface RepositorioRevisiones<T> {
  porRecurso(id: UUID, pagina: FiltrosPagina): Promise<Pagina<T>>;
}

/** Lectura paginada; la escritura solo se materializa dentro del plan de UoW. */
export interface RepositorioAuditoria {
  porRecurso(id: UUID, pagina: FiltrosPagina): Promise<Pagina<EventoAuditoria>>;
}
