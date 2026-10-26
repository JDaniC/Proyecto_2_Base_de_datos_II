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
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    release(): void;
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
    beginTransaction: async () => undefined,
    commit: async () => undefined,
    rollback: async () => undefined,
    release: () => { liberaciones += 1; },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(liberaciones, 1);
});
