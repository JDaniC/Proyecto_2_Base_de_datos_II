import type { Institucion } from '../dominio/compartido/institucion.js';
import type {
  BundleInstitucional,
  BundlesInstitucionales,
} from '../aplicacion/puertos/bundle-institucional.js';

export function crearBundlesInstitucionales(
  instituciones: readonly Institucion[],
): BundlesInstitucionales {
  const bundles: BundleInstitucional[] = instituciones.map((institucion) =>
    Object.freeze({
      institucion,
      estadoPersistencia: 'NO_CONFIGURADA' as const,
    }),
  );
  return Object.freeze(bundles);
}
