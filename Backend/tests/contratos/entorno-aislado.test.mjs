import test from 'node:test';
import assert from 'node:assert/strict';
import { crearRunId, ejecutarEnDestinoAislado, validarDestinoAislado } from './entorno-aislado.mjs';

const RUN_ID = '12ab34cd56ef789012ab34cd56ef7890';
const entornoSql = { NODE_ENV: 'test', BDII_TEST_ISOLATED: '1' };

test('genera un identificador hexadecimal distinto por ejecución', () => {
  assert.match(crearRunId(), /^[a-f0-9]{32}$/);
});

test('valida una base PostgreSQL local, única para esta ejecución', () => {
  const destino = validarDestinoAislado({
    motor: 'postgresql', host: '127.0.0.1', puerto: 15432,
    baseDatos: `bdii_test_${RUN_ID}`, runId: RUN_ID,
  }, entornoSql);

  assert.equal(destino.baseDatos, `bdii_test_${RUN_ID}`);
  assert.equal(destino.runId, RUN_ID);
  assert.equal(Object.isFrozen(destino), true);
});

test('acepta Firestore solo en emulador local con proyecto demo por ejecución', () => {
  const entorno = {
    ...entornoSql,
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8188',
  };
  const destino = validarDestinoAislado({
    motor: 'firestore', host: '127.0.0.1', puerto: 8188,
    projectId: `demo-bdii-test-${RUN_ID}`, runId: RUN_ID,
  }, entorno);

  assert.equal(destino.projectId, `demo-bdii-test-${RUN_ID}`);
});

test('rechaza un destino remoto antes de preparar recursos', async () => {
  let preparaciones = 0;
  await assert.rejects(() => ejecutarEnDestinoAislado({
    destino: {
      motor: 'mysql', host: 'db.production.example', puerto: 3306,
      baseDatos: `bdii_test_${RUN_ID}`, runId: RUN_ID,
    },
    entorno: entornoSql,
    preparar: async () => { preparaciones += 1; },
    ejecutar: async () => undefined,
    limpiar: async () => undefined,
  }), { code: 'DESTINO_PRUEBAS_NO_AISLADO' });
  assert.equal(preparaciones, 0);
});

test('rechaza una base compartida aunque el host sea local', () => {
  assert.throws(() => validarDestinoAislado({
    motor: 'mongodb', host: 'localhost', puerto: 27017,
    baseDatos: 'laboratorio_clinico', runId: RUN_ID,
  }, entornoSql), { code: 'DESTINO_PRUEBAS_NO_AISLADO' });
});

test('limpia el recurso creado también cuando falla el escenario', async () => {
  const llamadas = [];
  const destino = {
    motor: 'mysql', host: '127.0.0.1', puerto: 13306,
    baseDatos: `bdii_test_${RUN_ID}`, runId: RUN_ID,
  };

  await assert.rejects(() => ejecutarEnDestinoAislado({
    destino,
    entorno: entornoSql,
    preparar: async (seguro) => { llamadas.push(['preparar', seguro.runId]); return { aislado: true }; },
    ejecutar: async () => { llamadas.push(['ejecutar']); throw new Error('fallo sintético'); },
    limpiar: async (recurso, seguro) => { llamadas.push(['limpiar', recurso.aislado, seguro.runId]); },
  }), /fallo sintético/);

  assert.deepEqual(llamadas, [
    ['preparar', RUN_ID],
    ['ejecutar'],
    ['limpiar', true, RUN_ID],
  ]);
});
