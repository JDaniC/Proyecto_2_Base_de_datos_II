import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ErrorConfiguracionFirestore,
  parsearConfiguracionFirestore,
} from '../../src/configuracion/conexiones-firestore.js';

test('conexiones Firestore: valida configuración de emulador con proyecto demo', () => {
  const configuracion = parsearConfiguracionFirestore({
    FIRESTORE_PROJECT_ID: 'demo-bdii-pediatria',
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8188',
  });
  assert.equal(configuracion.projectId, 'demo-bdii-pediatria');
  assert.equal(configuracion.databaseId, '(default)');
  assert.equal(configuracion.emulatorHost, '127.0.0.1:8188');
  assert.equal(configuracion.institucionalId, 'CENTRO_MEDICO_PEDIATRICO');
  assert.ok(Object.isFrozen(configuracion));
});

test('conexiones Firestore: rechaza proyecto demo sin emulador local', () => {
  assert.throws(
    () => parsearConfiguracionFirestore({ FIRESTORE_PROJECT_ID: 'demo-bdii-pediatria' }),
    ErrorConfiguracionFirestore,
  );
});

test('conexiones Firestore: rechaza emulador con proyecto que no comience por demo-', () => {
  assert.throws(
    () => parsearConfiguracionFirestore({
      FIRESTORE_PROJECT_ID: 'proyecto-produccion-1234',
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    }),
    ErrorConfiguracionFirestore,
  );
});

test('conexiones Firestore: rechaza institución distinta a CENTRO_MEDICO_PEDIATRICO', () => {
  assert.throws(
    () => parsearConfiguracionFirestore({
      FIRESTORE_PROJECT_ID: 'demo-pediatria-1',
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8188',
      FIRESTORE_INSTITUCION: 'OTRA_INSTITUCION',
    }),
    ErrorConfiguracionFirestore,
  );
});
