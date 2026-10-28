import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RepositorioPacientesPostgresql } from '../../src/adaptadores/salida/postgresql/pacientes/repositorio-pacientes-postgresql.js';
import { RepositorioPacientesMysql } from '../../src/adaptadores/salida/mysql/pacientes/repositorio-pacientes-mysql.js';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../src/dominio/compartido/uuid.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';
import type { EjecutorSql } from '../../src/adaptadores/salida/sql/tipos-sql.js';

function crearEjecutorQueFalla(): EjecutorSql {
  return {
    async consultar() {
      const err = new Error('Connection terminated unexpectedly');
      Object.assign(err, { code: 'ECONNRESET' });
      throw err;
    },
  };
}

test('RepositorioPacientesPostgresql: traduce fallos de red/consulta a PERSISTENCIA_NO_DISPONIBLE', async () => {
  const repo = new RepositorioPacientesPostgresql(crearEjecutorQueFalla());
  const id = uuidPublico('11111111-1111-4111-8111-111111111111');
  const version = versionPositiva(1);

  await assert.rejects(
    async () => repo.porId(id),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === 'PERSISTENCIA_NO_DISPONIBLE',
  );

  await assert.rejects(
    async () => repo.porVersion(id, version),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === 'PERSISTENCIA_NO_DISPONIBLE',
  );

  await assert.rejects(
    async () => repo.titularIdentidad({ tipo: 'CUI', numero: '1234567890101' }),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === 'PERSISTENCIA_NO_DISPONIBLE',
  );

  await assert.rejects(
    async () => repo.buscar({ q: 'Juan', orden: 'ASC', limite: 10 }),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === 'PERSISTENCIA_NO_DISPONIBLE',
  );
});

test('RepositorioPacientesMysql: traduce fallos de red/consulta a PERSISTENCIA_NO_DISPONIBLE', async () => {
  const repo = new RepositorioPacientesMysql(crearEjecutorQueFalla());
  const id = uuidPublico('22222222-2222-4222-8222-222222222222');
  const version = versionPositiva(1);

  await assert.rejects(
    async () => repo.porId(id),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === 'PERSISTENCIA_NO_DISPONIBLE',
  );

  await assert.rejects(
    async () => repo.porVersion(id, version),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === 'PERSISTENCIA_NO_DISPONIBLE',
  );

  await assert.rejects(
    async () => repo.titularIdentidad({ tipo: 'CUI', numero: '1234567890101' }),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === 'PERSISTENCIA_NO_DISPONIBLE',
  );

  await assert.rejects(
    async () => repo.buscar({ q: 'Juan', orden: 'ASC', limite: 10 }),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === 'PERSISTENCIA_NO_DISPONIBLE',
  );
});
