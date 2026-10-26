import type { ConfiguracionPostgresql } from '../adaptadores/salida/postgresql/crear-pool-postgresql.js';
import type { ConfiguracionMysql } from '../adaptadores/salida/mysql/crear-pool-mysql.js';

export interface ConfiguracionSql {
  readonly postgresql: ConfiguracionPostgresql;
  readonly mysql: ConfiguracionMysql;
}

/** Acepta únicamente las cuentas/base de aplicación definidas por el proyecto. */
export function parsearConfiguracionSql(
  variables: Readonly<Record<string, string | undefined>>,
): ConfiguracionSql {
  const postgresql = leerMotor(variables, 'POSTGRES', {
    baseDatos: 'hospital_general', usuario: 'hospital_app',
  });
  const mysql = leerMotor(variables, 'MYSQL', {
    baseDatos: 'clinica_odontologica', usuario: 'clinica_app',
  });
  return Object.freeze({ postgresql, mysql });
}

function leerMotor<T extends { readonly baseDatos: string; readonly usuario: string }>(
  variables: Readonly<Record<string, string | undefined>>,
  prefijo: 'POSTGRES' | 'MYSQL',
  fijos: T,
): T & { readonly host: string; readonly puerto: number; readonly archivoContrasena: string } {
  const host = variables[`${prefijo}_HOST`]?.trim();
  const textoPuerto = variables[`${prefijo}_PORT`]?.trim();
  const archivoContrasena = variables[`${prefijo}_PASSWORD_FILE`]?.trim();
  const puerto = textoPuerto && /^\d{1,5}$/.test(textoPuerto) ? Number(textoPuerto) : NaN;
  const errores: string[] = [];
  if (!host || !/^[a-zA-Z0-9][a-zA-Z0-9.-]{0,252}$/.test(host)) errores.push(`${prefijo}_HOST`);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65_535) errores.push(`${prefijo}_PORT`);
  if (!archivoContrasena || archivoContrasena.trim().length === 0) errores.push(`${prefijo}_PASSWORD_FILE`);
  if (variables[`${prefijo}_DATABASE`] !== undefined && variables[`${prefijo}_DATABASE`] !== fijos.baseDatos) {
    errores.push(`${prefijo}_DATABASE`);
  }
  if (variables[`${prefijo}_USER`] !== undefined && variables[`${prefijo}_USER`] !== fijos.usuario) {
    errores.push(`${prefijo}_USER`);
  }
  if (errores.length > 0) throw new ErrorConfiguracionSql(errores);
  return Object.freeze({ ...fijos, host: host as string, puerto, archivoContrasena: archivoContrasena as string });
}

export class ErrorConfiguracionSql extends Error {
  constructor(readonly variables: readonly string[]) {
    super('INVALID_SQL_RUNTIME_CONFIGURATION');
    this.name = 'ErrorConfiguracionSql';
    Object.freeze(this.variables);
  }
}
