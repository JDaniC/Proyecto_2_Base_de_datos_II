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

test('rechaza nombres de host aunque normalmente resuelvan a loopback', () => {
  assert.throws(() => validarDestinoAislado({
    motor: 'postgresql', host: 'localhost', puerto: 15432,
    baseDatos: `bdii_test_${RUN_ID}`, runId: RUN_ID,
  }, entornoSql), { code: 'DESTINO_PRUEBAS_NO_AISLADO' });
});

test('bloquea configuraciones inseguras y límites inválidos antes de preparar', () => {
  const base = {
    motor: 'postgresql', host: '127.0.0.1', puerto: 15432,
    baseDatos: `bdii_test_${RUN_ID}`, runId: RUN_ID,
  };
  for (const entorno of [{}, { NODE_ENV: 'development', BDII_TEST_ISOLATED: '1' }, { NODE_ENV: 'test' }]) {
    assert.throws(() => validarDestinoAislado(base, entorno), { code: 'DESTINO_PRUEBAS_NO_AISLADO' });
  }
  for (const destino of [
    null,
    { ...base, motor: 'oracle' },
    { ...base, puerto: 0 },
    { ...base, puerto: 65536 },
    { ...base, puerto: 15432.5 },
    { ...base, runId: 'invalid' },
    { ...base, host: '127.0.0.2' },
    { ...base, baseDatos: 'bdii_test_reutilizada' },
  ]) {
    assert.throws(() => validarDestinoAislado(destino, entornoSql), { code: 'DESTINO_PRUEBAS_NO_AISLADO' });
  }
});

test('Firestore exige proyecto demo y emulador con host y puerto coincidentes', () => {
  const destino = {
    motor: 'firestore', host: '127.0.0.1', puerto: 8188,
    projectId: `demo-bdii-test-${RUN_ID}`, runId: RUN_ID,
  };
  assert.throws(() => validarDestinoAislado({ ...destino, projectId: 'proyecto-real' }, {
    ...entornoSql, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8188',
  }), { code: 'DESTINO_PRUEBAS_NO_AISLADO' });
  assert.throws(() => validarDestinoAislado(destino, {
    ...entornoSql, FIRESTORE_EMULATOR_HOST: 'localhost:8188',
  }), { code: 'DESTINO_PRUEBAS_NO_AISLADO' });
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

test('ejecuta el escenario y limpia una sola vez cuando termina correctamente', async () => {
  const llamadas = [];
  const resultado = await ejecutarEnDestinoAislado({
    destino: {
      motor: 'postgresql', host: '127.0.0.1', puerto: 15432,
      baseDatos: `bdii_test_${RUN_ID}`, runId: RUN_ID,
    },
    entorno: entornoSql,
    preparar: async () => 'recurso-sintetico',
    ejecutar: async (recurso) => { llamadas.push(['ejecutar', recurso]); return 'ok'; },
    limpiar: async (recurso) => llamadas.push(['limpiar', recurso]),
  });
  assert.equal(resultado, 'ok');
  assert.deepEqual(llamadas, [['ejecutar', 'recurso-sintetico'], ['limpiar', 'recurso-sintetico']]);
});

test('un fallo de validación de callbacks no ejecuta preparación', async () => {
  let llamadas = 0;
  await assert.rejects(() => ejecutarEnDestinoAislado({
    destino: {
      motor: 'postgresql', host: '127.0.0.1', puerto: 15432,
      baseDatos: `bdii_test_${RUN_ID}`, runId: RUN_ID,
    },
    entorno: entornoSql,
    preparar: async () => { llamadas += 1; },
    ejecutar: 'no-es-funcion',
    limpiar: async () => undefined,
  }), /deben ser funciones/);
  assert.equal(llamadas, 0);
});

test('limpia un recurso parcial registrado antes de que falle la preparación', async () => {
  const llamadas = [];
  const recursoParcial = { creado: true };
  await assert.rejects(() => ejecutarEnDestinoAislado({
    destino: {
      motor: 'postgresql', host: '127.0.0.1', puerto: 15432,
      baseDatos: `bdii_test_${RUN_ID}`, runId: RUN_ID,
    },
    entorno: entornoSql,
    preparar: async (_seguro, registrar) => {
      registrar(recursoParcial);
      throw new Error('fallo sintético de preparación');
    },
    ejecutar: async () => assert.fail('no debe ejecutar si la preparación falla'),
    limpiar: async (recurso) => llamadas.push(recurso),
  }), /fallo sintético de preparación/);
  assert.deepEqual(llamadas, [recursoParcial]);
});

test('conserva ambos errores si fallan el escenario y su limpieza', async () => {
  await assert.rejects(() => ejecutarEnDestinoAislado({
    destino: {
      motor: 'postgresql', host: '127.0.0.1', puerto: 15432,
      baseDatos: `bdii_test_${RUN_ID}`, runId: RUN_ID,
    },
    entorno: entornoSql,
    preparar: async () => ({ aislado: true }),
    ejecutar: async () => { throw new Error('fallo del escenario'); },
    limpiar: async () => { throw new Error('fallo de limpieza'); },
  }), (error) => {
    assert.ok(error instanceof AggregateError);
    assert.deepEqual(error.errors.map(({ message }) => message), ['fallo del escenario', 'fallo de limpieza']);
    return true;
  });
});
