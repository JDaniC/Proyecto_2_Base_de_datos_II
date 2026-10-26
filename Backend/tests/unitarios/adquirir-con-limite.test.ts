import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crearAdquiridorLimitado } from '../../src/adaptadores/salida/sql/adquirir-con-limite.js';
import { crearPoolSqlMysql } from '../../src/adaptadores/salida/mysql/crear-pool-mysql.js';
import { crearPoolSqlPostgresql } from '../../src/adaptadores/salida/postgresql/crear-pool-postgresql.js';

test('pool agotado rechaza y devuelve conexiones que llegan después del timeout', async () => {
  let completar!: (value: { liberar(): void }) => void;
  let liberaciones = 0;
  const adquirir = crearAdquiridorLimitado(
    () => new Promise<{ liberar(): void }>((resolve) => { completar = resolve; }),
    { timeoutMs: 5, maxEspera: 1 },
  );
  const solicitud = adquirir();
  await assert.rejects(solicitud, /POOL_AGOTADO/);
  completar({ liberar: () => { liberaciones += 1; } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(liberaciones, 1);
  await assert.rejects(adquirir(), /POOL_AGOTADO/);
});

test('pool PostgreSQL: consultas directas también respetan el timeout de adquisición', async () => {
  let completar!: (value: { query(): Promise<{ rows: never[] }>; release(): void }) => void;
  let liberaciones = 0;
  const falso = {
    connect: () => new Promise((resolve) => { completar = (value) => resolve(value as never); }),
    query: async () => ({ rows: [] }),
    end: async () => undefined,
  } as unknown as Parameters<typeof crearPoolSqlPostgresql>[0];
  const pool = crearPoolSqlPostgresql(falso, { timeoutMs: 5, maxEspera: 1 });
  await assert.rejects(pool.consultar('SELECT 1'), /POOL_AGOTADO/);
  completar({ query: async () => ({ rows: [] }), release: () => { liberaciones += 1; } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(liberaciones, 1);
});

test('pool MySQL: consultas directas también respetan el timeout de adquisición', async () => {
  let completar!: (value: {
    execute(): Promise<readonly [never[], unknown]>;
    query(opciones: { sql: string; timeout: number }): Promise<unknown>;
    release(): void;
    destroy(): void;
  }) => void;
  let liberaciones = 0;
  const falso = {
    getConnection: () => new Promise((resolve) => { completar = (value) => resolve(value as never); }),
    execute: async () => [[], undefined] as const,
    end: async () => undefined,
  } as unknown as Parameters<typeof crearPoolSqlMysql>[0];
  const pool = crearPoolSqlMysql(falso, { timeoutMs: 5, maxEspera: 1, timeoutConsultaMs: 10 });
  await assert.rejects(pool.consultar('SELECT 1'), /POOL_AGOTADO/);
  completar({
    execute: async () => [[], undefined] as const,
    query: async () => undefined,
    release: () => { liberaciones += 1; },
    destroy: () => undefined,
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(liberaciones, 1);
});

test('pool MySQL: limita BEGIN/COMMIT/ROLLBACK y descarta conexión con COMMIT ambiguo', async () => {
  const comandos: { sql: string; timeout: number }[] = [];
  let liberaciones = 0;
  let descartes = 0;
  const falso = {
    getConnection: async () => ({
      execute: async () => [[], undefined] as const,
      query: async (opciones: { sql: string; timeout: number }) => {
        comandos.push(opciones);
        if (opciones.sql === 'COMMIT' || opciones.sql === 'ROLLBACK') {
          throw Object.assign(new Error('acuse perdido'), { code: 'PROTOCOL_SEQUENCE_TIMEOUT' });
        }
      },
      release: () => { liberaciones += 1; },
      destroy: () => { descartes += 1; },
    }),
    execute: async () => [[], undefined] as const,
    end: async () => undefined,
  } as unknown as Parameters<typeof crearPoolSqlMysql>[0];
  const pool = crearPoolSqlMysql(falso, { timeoutMs: 10, maxEspera: 1, timeoutConsultaMs: 17 });
  const conexion = await pool.adquirir();
  await conexion.iniciar();
  await assert.rejects(conexion.confirmar(), { code: 'PROTOCOL_SEQUENCE_TIMEOUT' });
  await assert.rejects(conexion.revertir(), { code: 'PROTOCOL_SEQUENCE_TIMEOUT' });
  conexion.liberar();
  assert.deepEqual(comandos.map(({ sql }) => sql), ['START TRANSACTION', 'COMMIT', 'ROLLBACK']);
  assert.ok(comandos.every(({ timeout }) => timeout === 17));
  assert.equal(descartes, 1);
  assert.equal(liberaciones, 0);
});
