import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ErrorConfiguracionSql, parsearConfiguracionSql } from '../../src/configuracion/conexiones-sql.js';

const base = {
  POSTGRES_HOST: 'postgres',
  POSTGRES_PORT: '5432',
  POSTGRES_PASSWORD_FILE: '/run/secrets/postgres_app_password',
  MYSQL_HOST: 'mysql',
  MYSQL_PORT: '3306',
  MYSQL_PASSWORD_FILE: '/run/secrets/mysql_app_password',
};

test('conexiones SQL: fija bases y usuarios de aplicación y congela la configuración', () => {
  const configuracion = parsearConfiguracionSql(base);
  assert.equal(configuracion.postgresql.baseDatos, 'hospital_general');
  assert.equal(configuracion.postgresql.usuario, 'hospital_app');
  assert.equal(configuracion.postgresql.puerto, 5432);
  assert.equal(configuracion.mysql.baseDatos, 'clinica_odontologica');
  assert.equal(configuracion.mysql.usuario, 'clinica_app');
  assert.equal(configuracion.mysql.puerto, 3306);
  assert.ok(Object.isFrozen(configuracion));
  assert.ok(Object.isFrozen(configuracion.postgresql));
  assert.ok(Object.isFrozen(configuracion.mysql));
});

test('conexiones SQL: rechaza usuarios administrativos, bases alternas y puertos inválidos', () => {
  for (const variables of [
    { ...base, POSTGRES_USER: 'postgres' },
    { ...base, MYSQL_USER: 'root' },
    { ...base, POSTGRES_DATABASE: 'otra_base' },
    { ...base, MYSQL_DATABASE: 'otra_base' },
    { ...base, POSTGRES_PORT: '0' },
    { ...base, MYSQL_PORT: '65536' },
  ]) {
    assert.throws(() => parsearConfiguracionSql(variables), ErrorConfiguracionSql);
  }
});

test('conexiones SQL: valida todos los campos obligatorios sin mostrar valores', () => {
  assert.throws(
    () => parsearConfiguracionSql({ POSTGRES_HOST: 'secreto.invalid' }),
    (error: unknown) => {
      assert.ok(error instanceof ErrorConfiguracionSql);
      assert.deepEqual(error.variables, ['POSTGRES_PORT', 'POSTGRES_PASSWORD_FILE']);
      assert.equal(error.message.includes('secreto.invalid'), false);
      return true;
    },
  );
});
