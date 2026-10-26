import type { Institucion } from '../../dominio/compartido/institucion.js';
import type {
  RepositorioCuenta,
  RepositorioProfesional,
} from './repositorio-cuenta.js';

export type EstadoPersistenciaInicial = 'NO_CONFIGURADA' | 'DISPONIBLE';

export interface BundleInstitucional {
  readonly institucion: Institucion;
  readonly estadoPersistencia: EstadoPersistenciaInicial;
  readonly cuenta?: RepositorioCuenta;
  readonly profesionales?: RepositorioProfesional;
}

export type BundlesInstitucionales = readonly BundleInstitucional[];
