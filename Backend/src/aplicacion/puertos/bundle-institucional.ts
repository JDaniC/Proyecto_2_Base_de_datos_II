import type { RepositorioHistorialLectura } from './historial.js';
import type { Institucion } from '../../dominio/compartido/institucion.js';
import type {
  RepositorioCuenta,
  RepositorioProfesional,
} from './repositorio-cuenta.js';
import type { RepositorioPacienteLectura } from './repositorio-paciente.js';
import type { UnidadDeTrabajo } from './nucleo.js';

export type EstadoPersistenciaInicial = 'NO_CONFIGURADA' | 'DISPONIBLE';

export interface BundleInstitucional {
  readonly institucion: Institucion;
  readonly estadoPersistencia: EstadoPersistenciaInicial;
  readonly cuenta?: RepositorioCuenta;
  readonly profesionales?: RepositorioProfesional;
  readonly uow?: UnidadDeTrabajo;
  readonly pacientes?: RepositorioPacienteLectura;
  readonly historial?: RepositorioHistorialLectura;
}

export type BundlesInstitucionales = readonly BundleInstitucional[];
