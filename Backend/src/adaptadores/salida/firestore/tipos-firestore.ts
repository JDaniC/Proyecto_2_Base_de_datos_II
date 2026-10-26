import type {
  CambioPlanificado,
  ComandoEstable,
  LectorTransaccional,
  UnidadDeTrabajo,
} from '../../../aplicacion/puertos/nucleo.js';
import type { ContextoAutenticado } from '../../../aplicacion/puertos/contexto-autenticado.js';
import type { Firestore, Transaction } from 'firebase-admin/firestore';

export const INSTITUCION_PEDIATRIA = 'CENTRO_MEDICO_PEDIATRICO' as const;
export const MAX_DOCUMENTO_BYTES = 256 * 1024; // 256 KB límite documentado por Firestore

export interface ClienteFirestore {
  readonly firestore: Firestore;
  readonly projectId: string;
  readonly databaseId: string;
  readonly cerrar: () => Promise<void>;
}

export interface DependenciasUnidadDeTrabajoFirestore<
  TCuenta = unknown,
  TPaciente = unknown,
  TCita = unknown,
  TConsulta = unknown,
  TResponsable = unknown,
  TProfesional = unknown,
  TEvento = unknown,
> {
  readonly cliente: ClienteFirestore;
  readonly reintentosMaximos?: number;
  /** Factoría del lector transaccional; todas las lecturas usan la transacción en curso. */
  readonly crearLector: (
    transaction: Transaction,
    usuarioId: string,
  ) => LectorTransaccional<TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento>;
  /** Escritor tipado de cambios; solo usa la transacción en curso sin efectos externos. */
  readonly aplicarCambios: (
    transaction: Transaction,
    contexto: ContextoAutenticado,
    comando: ComandoEstable,
    cambios: readonly CambioPlanificado[],
  ) => Promise<void>;
  readonly esperarReintento?: (intento: number) => Promise<void>;
}

export type UnidadDeTrabajoFirestore<
  TCuenta = unknown,
  TPaciente = unknown,
  TCita = unknown,
  TConsulta = unknown,
  TResponsable = unknown,
  TProfesional = unknown,
  TEvento = unknown,
> = UnidadDeTrabajo<TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento>;
