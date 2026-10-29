import type { RepositorioHistorialLectura } from '../aplicacion/puertos/historial.js';
import type { Institucion } from '../dominio/compartido/institucion.js';
import type {
  BundleInstitucional,
  BundlesInstitucionales,
} from '../aplicacion/puertos/bundle-institucional.js';
import type {
  RepositorioCuenta,
  RepositorioProfesional,
} from '../aplicacion/puertos/repositorio-cuenta.js';
import type { RepositorioPacienteLectura } from '../aplicacion/puertos/repositorio-paciente.js';
import type { UnidadDeTrabajo } from '../aplicacion/puertos/nucleo.js';
import type { PuertosClinicos } from '../aplicacion/puertos/clinica.js';

export interface RepositoriosInstitucion {
  readonly clinica?: PuertosClinicos;
  readonly cuenta: RepositorioCuenta;
  readonly profesionales?: RepositorioProfesional;
  readonly pacientes?: RepositorioPacienteLectura;
  readonly historial?: RepositorioHistorialLectura;
  readonly uow?: UnidadDeTrabajo;
}

export type MapaRepositoriosInstitucion = Readonly<
  Partial<Record<Institucion, RepositoriosInstitucion>>
>;

export function crearBundlesInstitucionales(
  instituciones: readonly Institucion[],
  repositorios?: MapaRepositoriosInstitucion,
): BundlesInstitucionales {
  const bundles: BundleInstitucional[] = instituciones.map((institucion) => {
    const repos = repositorios?.[institucion];

    return Object.freeze({
      institucion,
      estadoPersistencia: repos ? 'DISPONIBLE' as const : 'NO_CONFIGURADA' as const,
      ...(repos ? { cuenta: repos.cuenta } : {}),
      ...(repos?.profesionales ? { profesionales: repos.profesionales } : {}),
      ...(repos?.pacientes ? { pacientes: repos.pacientes } : {}),
      ...(repos?.historial ? { historial: repos.historial } : {}),
      ...(repos?.uow ? { uow: repos.uow } : {}),
      ...(repos?.clinica ? { clinica: repos.clinica } : {}),
    });
  });

  return Object.freeze(bundles);
}
