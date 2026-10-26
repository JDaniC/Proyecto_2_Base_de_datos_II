import type { Institucion } from '../../dominio/compartido/institucion.js';

export type EstadoPersistenciaInicial = 'NO_CONFIGURADA';

export interface BundleInstitucional {
  readonly institucion: Institucion;
  readonly estadoPersistencia: EstadoPersistenciaInicial;
}

export type BundlesInstitucionales = readonly BundleInstitucional[];
