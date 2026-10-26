import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ErrorConfiguracionMongodb,
  parsearConfiguracionMongodb,
} from '../../src/configuracion/conexiones-mongodb.js';

const base = {
  MONGO_HOST: 'mongodb',
  MONGO_PORT: '27017',
  MONGO_PASSWORD_FILE: '/run/secrets/mongo_app_password',
};

test('conexiones MongoDB: fija base y usuario de aplicación y congela la configuración', () => {
  const configuracion = parsearConfiguracionMongodb(base);
  assert.equal(configuracion.baseDatos, 'laboratorio_clinico');
  assert.equal(configuracion.usuario, 'laboratorio_app');
  assert.equal(configuracion.puerto, 27017);
  assert.equal(configuracion.replicaSet, 'rs0');
  assert.equal(configuracion.conexionDirecta, false);
  assert.ok(Object.isFrozen(configuracion));
});

test('conexiones MongoDB: acepta réplica set y conexión directa opcionales', () => {
  const configuracion = parsearConfiguracionMongodb({
    ...base,
    MONGO_REPLICA_SET: 'rs_lab',
    MONGO_DIRECT_CONNECTION: 'true',
    MONGO_TIMEOUT_MS: '8000',
  });
  assert.equal(configuracion.replicaSet, 'rs_lab');
  assert.equal(configuracion.conexionDirecta, true);
  assert.equal(configuracion.timeoutMs, 8000);
});

test('conexiones MongoDB: rechaza usuarios administrativos, bases alternas y puertos inválidos', () => {
  for (const variables of [
    { ...base, MONGO_USER: 'mongo_admin' },
    { ...base, MONGO_DATABASE: 'otra_base' },
    { ...base, MONGO_PORT: '0' },
    { ...base, MONGO_PORT: '70000' },
    { ...base, MONGO_HOST: '' },
    { ...base, MONGO_REPLICA_SET: 'replica set con espacios!' },
  ]) {
    assert.throws(() => parsearConfiguracionMongodb(variables), ErrorConfiguracionMongodb);
  }
});

test('conexiones MongoDB: valida campos obligatorios sin exponer secretos', () => {
  assert.throws(
    () => parsearConfiguracionMongodb({ MONGO_HOST: 'host.valido' }),
    (error: unknown) => {
      assert.ok(error instanceof ErrorConfiguracionMongodb);
      assert.deepEqual(error.variables, ['MONGO_PORT', 'MONGO_PASSWORD_FILE']);
      return true;
    },
  );
});
