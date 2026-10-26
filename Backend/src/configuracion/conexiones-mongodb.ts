export interface ConfiguracionMongodb {
  readonly host: string;
  readonly puerto: number;
  readonly baseDatos: string;
  readonly usuario: string;
  readonly archivoContrasena: string;
  readonly replicaSet: string;
  readonly conexionDirecta: boolean;
  readonly timeoutMs: number;
}

export class ErrorConfiguracionMongodb extends Error {
  constructor(readonly variables: readonly string[]) {
    super('INVALID_MONGODB_RUNTIME_CONFIGURATION');
    this.name = 'ErrorConfiguracionMongodb';
    Object.freeze(this.variables);
  }
}

const FIJOS = {
  baseDatos: 'laboratorio_clinico',
  usuario: 'laboratorio_app',
  replicaSet: 'rs0',
} as const;

export function parsearConfiguracionMongodb(
  variables: Readonly<Record<string, string | undefined>>,
): ConfiguracionMongodb {
  const host = variables.MONGO_HOST?.trim();
  const textoPuerto = variables.MONGO_PORT?.trim();
  const archivoContrasena = (variables.MONGO_APP_PASSWORD_FILE ?? variables.MONGO_PASSWORD_FILE)?.trim();
  const replicaSet = variables.MONGO_REPLICA_SET?.trim() ?? FIJOS.replicaSet;
  const puerto = textoPuerto && /^\d{1,5}$/.test(textoPuerto) ? Number(textoPuerto) : NaN;
  const timeoutTexto = variables.MONGO_TIMEOUT_MS?.trim();
  const timeoutMs = timeoutTexto && /^\d{1,6}$/.test(timeoutTexto) ? Number(timeoutTexto) : 5000;

  const errores: string[] = [];
  if (!host || !/^[a-zA-Z0-9][a-zA-Z0-9.-]{0,252}$/.test(host)) errores.push('MONGO_HOST');
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65_535) errores.push('MONGO_PORT');
  if (!archivoContrasena || archivoContrasena.length === 0) errores.push('MONGO_PASSWORD_FILE');
  if (variables.MONGO_DATABASE !== undefined && variables.MONGO_DATABASE !== FIJOS.baseDatos) {
    errores.push('MONGO_DATABASE');
  }
  if (variables.MONGO_USER !== undefined && variables.MONGO_USER !== FIJOS.usuario) {
    errores.push('MONGO_USER');
  }
  if (!replicaSet || !/^[a-zA-Z0-9_]{1,63}$/.test(replicaSet)) {
    errores.push('MONGO_REPLICA_SET');
  }

  if (errores.length > 0) throw new ErrorConfiguracionMongodb(errores);

  const conexionDirecta = variables.MONGO_DIRECT_CONNECTION === 'true' || variables.MONGO_DIRECT_CONNECTION === '1';

  return Object.freeze({
    host: host as string,
    puerto,
    baseDatos: FIJOS.baseDatos,
    usuario: FIJOS.usuario,
    archivoContrasena: archivoContrasena as string,
    replicaSet,
    conexionDirecta,
    timeoutMs,
  });
}
