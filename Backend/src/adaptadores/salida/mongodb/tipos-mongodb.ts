import type {
  CambioPlanificado,
  ComandoEstable,
  LectorTransaccional,
  UnidadDeTrabajo,
} from '../../../aplicacion/puertos/nucleo.js';
import type { ContextoAutenticado } from '../../../aplicacion/puertos/contexto-autenticado.js';
import type { ClientSession, Db, MongoClient } from 'mongodb';

export const INSTITUCION_LABORATORIO = 'LABORATORIO_CLINICO' as const;

export const COLECCIONES_MONGODB = {
  OPERACIONES: 'operaciones',
  REVISIONES: 'revisiones',
  AUDITORIA: 'auditoria',
  USUARIOS: 'usuarios',
  ROLES: 'roles',
  PERSONAL: 'personal',
  SOLICITANTES: 'solicitantes',
  PACIENTES: 'pacientes',
  IDENTIDADES: 'identidades_paciente',
  CITAS: 'citas',
  CONSULTAS: 'consultas_clinicas',
} as const;

export interface ClienteMongodb {
  readonly client: MongoClient;
  readonly db: Db;
  readonly verificarReplicaSet: () => Promise<void>;
  readonly iniciarSesion: () => ClientSession;
  readonly cerrar: () => Promise<void>;
}

export interface DependenciasUnidadDeTrabajoMongodb<
  TCuenta = unknown,
  TPaciente = unknown,
  TCita = unknown,
  TConsulta = unknown,
  TResponsable = unknown,
  TProfesional = unknown,
  TEvento = unknown,
> {
  readonly cliente: ClienteMongodb;
  readonly reintentosMaximos?: number;
  /** Factoría del lector transaccional; todas las lecturas usan la sesión en curso. */
  readonly crearLector: (
    db: Db,
    session: ClientSession,
    usuarioId: string,
  ) => LectorTransaccional<TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento>;
  /** Escritor tipado de cambios; solo usa la sesión en curso. */
  readonly aplicarCambios: (
    db: Db,
    session: ClientSession,
    contexto: ContextoAutenticado,
    comando: ComandoEstable,
    cambios: readonly CambioPlanificado[],
  ) => Promise<void>;
  readonly esperarReintento?: (intento: number) => Promise<void>;
}

export type UnidadDeTrabajoMongodb<
  TCuenta = unknown,
  TPaciente = unknown,
  TCita = unknown,
  TConsulta = unknown,
  TResponsable = unknown,
  TProfesional = unknown,
  TEvento = unknown,
> = UnidadDeTrabajo<TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento>;
