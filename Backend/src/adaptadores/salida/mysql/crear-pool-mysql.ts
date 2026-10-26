import { readFile } from 'node:fs/promises';
import mysql, { type Pool as PoolMysql, type PoolConnection } from 'mysql2/promise';
import type { ConexionSql, EjecutorSql, PoolSql, ResultadoConsultaSql } from '../sql/tipos-sql.js';
import { crearAdquiridorLimitado } from '../sql/adquirir-con-limite.js';

type ValorParametroMysql = string | number | bigint | boolean | Date | null | Buffer | Uint8Array
  | ValorParametroMysql[] | { readonly [clave: string]: ValorParametroMysql };

export interface ConfiguracionMysql {
  readonly host: string;
  readonly puerto: number;
  readonly baseDatos: string;
  readonly usuario: string;
  readonly archivoContrasena: string;
  readonly maxConexiones?: number;
  readonly timeoutConexionMs?: number;
  readonly timeoutConsultaMs?: number;
  readonly timeoutAdquisicionMs?: number;
  readonly maxEspera?: number;
}

export async function crearPoolMysql(configuracion: ConfiguracionMysql): Promise<PoolSql> {
  const password = (await readFile(configuracion.archivoContrasena, 'utf8')).trim();
  if (password.length === 0) throw new Error('CREDENCIAL_MYSQL_VACIA');
  const pool = mysql.createPool({
    host: configuracion.host,
    port: configuracion.puerto,
    database: configuracion.baseDatos,
    user: configuracion.usuario,
    password,
    connectionLimit: configuracion.maxConexiones ?? 10,
    connectTimeout: configuracion.timeoutConexionMs ?? 2_000,
    waitForConnections: true,
    queueLimit: configuracion.maxEspera ?? 20,
    timezone: 'Z',
    supportBigNumbers: true,
    bigNumberStrings: true,
    decimalNumbers: false,
  });
  return crearPoolSqlMysql(pool, {
    timeoutMs: configuracion.timeoutAdquisicionMs ?? 3_000,
    maxEspera: configuracion.maxEspera ?? 20,
    timeoutConsultaMs: configuracion.timeoutConsultaMs ?? 5_000,
  });
}

export function crearPoolSqlMysql(
  pool: Pick<PoolMysql, 'getConnection' | 'execute' | 'end'>,
  limites = { timeoutMs: 3_000, maxEspera: 20, timeoutConsultaMs: 5_000 },
): PoolSql {
  const adquirir = crearAdquiridorLimitado(
    async () => crearConexionSqlMysql(await pool.getConnection(), limites.timeoutConsultaMs), limites,
  );
  return {
    async consultar<TRow extends Record<string, unknown> = Record<string, unknown>>(
      sentencia: string,
      parametros: readonly unknown[] = [],
    ): Promise<ResultadoConsultaSql<TRow>> {
      const conexion = await adquirir();
      try {
        return await conexion.consultar<TRow>(sentencia, parametros);
      } finally {
        conexion.liberar();
      }
    },
    adquirir,
    cerrar: () => pool.end(),
  };
}

function crearConexionSqlMysql(conexion: PoolConnection, timeoutConsultaMs: number): ConexionSql {
  let descartar = false;
  const executor: EjecutorSql = {
    async consultar<TRow extends Record<string, unknown> = Record<string, unknown>>(
      sentencia: string,
      parametros: readonly unknown[] = [],
    ): Promise<ResultadoConsultaSql<TRow>> {
      try {
        const [resultado] = await conexion.execute(
          { sql: sentencia, timeout: timeoutConsultaMs }, validarParametros(parametros),
        );
        return { filas: filasMysql<TRow>(resultado) };
      } catch (error) {
        if (esTimeoutProtocolo(error)) descartar = true;
        throw error;
      }
    },
  };
  const ejecutarControl = async (sentencia: string): Promise<void> => {
    try {
      await conexion.query({ sql: sentencia, timeout: timeoutConsultaMs });
    } catch (error) {
      if (esTimeoutProtocolo(error)) descartar = true;
      throw error;
    }
  };
  return {
    ...executor,
    iniciar: () => ejecutarControl('START TRANSACTION'),
    confirmar: () => ejecutarControl('COMMIT'),
    revertir: () => ejecutarControl('ROLLBACK'),
    liberar: (forzarDescarte = false) => {
      if (descartar || forzarDescarte) conexion.destroy();
      else conexion.release();
    },
  };
}

function esTimeoutProtocolo(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const code = (error as { code?: unknown }).code;
  return code === 'PROTOCOL_SEQUENCE_TIMEOUT' || code === 'PROTOCOL_CONNECTION_LOST' ||
    code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'EPIPE';
}

function filasMysql<TRow extends Record<string, unknown>>(resultado: unknown): readonly TRow[] {
  if (!Array.isArray(resultado)) return [];
  return resultado as TRow[];
}

function validarParametros(parametros: readonly unknown[]): ValorParametroMysql[] {
  return parametros.map((valor) => {
    if (valor === null || typeof valor === 'string' || typeof valor === 'number' ||
        typeof valor === 'bigint' || typeof valor === 'boolean' || valor instanceof Date ||
        Buffer.isBuffer(valor) || valor instanceof Uint8Array) return valor;
    throw new Error('PARAMETRO_MYSQL_NO_ADMITIDO');
  });
}
