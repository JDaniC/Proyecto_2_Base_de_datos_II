import { isIP } from 'node:net';
import {
  esInstitucion,
  INSTITUCIONES_CANONICAS,
  type Institucion,
} from '../dominio/compartido/institucion.js';

export type AmbienteAplicacion = 'development' | 'test' | 'delivery';

export interface ConfiguracionAplicacion {
  readonly ambiente: AmbienteAplicacion;
  readonly host: string;
  readonly puerto: number;
  readonly instituciones: readonly Institucion[];
}

export class ErrorConfiguracion extends Error {
  constructor(readonly variables: readonly string[]) {
    super('Invalid runtime configuration.');
    this.name = 'ErrorConfiguracion';
  }
}

const AMBIENTES_VALIDOS = new Set<AmbienteAplicacion>([
  'development',
  'test',
  'delivery',
]);

export function parsearConfiguracion(
  variables: Readonly<Record<string, string | undefined>>,
): ConfiguracionAplicacion {
  const errores = new Set<string>();
  const ambiente = variables.APP_ENV?.trim();
  const host = variables.HOST?.trim();
  const textoPuerto = variables.PORT?.trim();
  const textoInstituciones = variables.INSTITUTIONS;

  if (!ambiente || !AMBIENTES_VALIDOS.has(ambiente as AmbienteAplicacion)) {
    errores.add('APP_ENV');
  }

  if (!host || isIP(host) === 0) {
    errores.add('HOST');
  }

  const puerto = textoPuerto && /^\d+$/.test(textoPuerto)
    ? Number(textoPuerto)
    : Number.NaN;
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65_535) {
    errores.add('PORT');
  }

  const instituciones = textoInstituciones === undefined
    ? []
    : textoInstituciones.split(',').map((institucion) => institucion.trim());
  const institucionesDuplicadas =
    new Set(instituciones).size !== instituciones.length;
  const institucionesInvalidas = instituciones.some(
    (institucion) => !esInstitucion(institucion),
  );
  const institucionesFaltantes = INSTITUCIONES_CANONICAS.some(
    (institucion) => !instituciones.includes(institucion),
  );

  if (
    instituciones.length !== INSTITUCIONES_CANONICAS.length ||
    institucionesDuplicadas ||
    institucionesInvalidas ||
    institucionesFaltantes
  ) {
    errores.add('INSTITUTIONS');
  }

  if (errores.size > 0) {
    throw new ErrorConfiguracion(Object.freeze([...errores]));
  }

  const ordenCanonico = Object.freeze([...INSTITUCIONES_CANONICAS]);
  return Object.freeze({
    ambiente: ambiente as AmbienteAplicacion,
    host: host as string,
    puerto,
    instituciones: ordenCanonico,
  });
}
