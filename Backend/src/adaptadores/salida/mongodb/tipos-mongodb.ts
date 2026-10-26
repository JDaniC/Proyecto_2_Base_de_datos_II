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

export interface DocumentoOperacionMongo {
  readonly _id: string;
  readonly revision: number;
  readonly institucion_id: string;
  readonly usuario_id: string;
  readonly caso_uso: string;
  readonly clave: string;
  readonly hash_entrada: string;
  readonly recurso_tipo: string;
  readonly recurso_id: string;
  readonly fecha_hora: Date;
  readonly codigo_respuesta: number;
  readonly estado: string;
  readonly respuesta: {
    readonly data: Record<string, unknown>;
    readonly meta: { readonly correlacion: string };
  };
}

export interface DocumentoRevisionMongo {
  readonly _id: string;
  readonly revision: number;
  readonly tipo_recurso: string;
  readonly recurso_id: string;
  readonly version: number;
  readonly actor_id: string;
  readonly fecha_hora: Date;
  readonly motivo: string;
  readonly contenido_anterior: unknown;
}

export interface DocumentoAuditoriaMongo {
  readonly _id: string;
  readonly revision: number;
  readonly usuario_id: string;
  readonly auth_uid: string;
  readonly institucion_id: string;
  readonly fecha_hora: Date;
  readonly accion: string;
  readonly coleccion: string;
  readonly documento_id: string;
  readonly correlacion: string;
  readonly motivo?: string;
}
