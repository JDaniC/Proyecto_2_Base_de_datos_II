import { readFile } from 'node:fs/promises';
import { Pool, type PoolClient, type PoolConfig } from 'pg';
import type { ConexionSql, EjecutorSql, PoolSql, ResultadoConsultaSql } from '../sql/tipos-sql.js';
import { crearAdquiridorLimitado } from '../sql/adquirir-con-limite.js';

export interface ConfiguracionPostgresql {
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

export async function crearPoolPostgresql(configuracion: ConfiguracionPostgresql): Promise<PoolSql> {
  const password = (await readFile(configuracion.archivoContrasena, 'utf8')).trim();
  if (password.length === 0) throw new Error('CREDENCIAL_POSTGRESQL_VACIA');
  const opciones: PoolConfig = {
    host: configuracion.host,
    port: configuracion.puerto,
    database: configuracion.baseDatos,
    user: configuracion.usuario,
    password,
    max: configuracion.maxConexiones ?? 10,
    connectionTimeoutMillis: configuracion.timeoutConexionMs ?? 2_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: configuracion.timeoutConsultaMs ?? 5_000,
    application_name: 'bdii-backend',
  };
  const pool = new Pool(opciones);
  pool.on('error', () => { /* Los errores del pool nunca registran configuración ni payload. */ });
  return crearPoolSqlPostgresql(pool, {
    timeoutMs: configuracion.timeoutAdquisicionMs ?? 3_000,
    maxEspera: configuracion.maxEspera ?? 20,
  });
}

export function crearPoolSqlPostgresql(
  pool: Pick<Pool, 'connect' | 'query' | 'end'>,
  limites = { timeoutMs: 3_000, maxEspera: 20 },
): PoolSql {
  const adquirir = crearAdquiridorLimitado(
    async () => crearConexionSqlPostgresql(await pool.connect()), limites,
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

function crearConexionSqlPostgresql(cliente: PoolClient): ConexionSql {
  const executor: EjecutorSql = {
    async consultar<TRow extends Record<string, unknown> = Record<string, unknown>>(
      sentencia: string,
      parametros: readonly unknown[] = [],
    ): Promise<ResultadoConsultaSql<TRow>> {
      const resultado = await cliente.query<TRow>(sentencia, [...parametros]);
      return { filas: resultado.rows };
    },
  };
  return {
    ...executor,
    iniciar: async () => { await cliente.query('BEGIN'); },
    confirmar: async () => { await cliente.query('COMMIT'); },
    revertir: async () => { await cliente.query('ROLLBACK'); },
    liberar: () => { cliente.release(); },
  };
}
