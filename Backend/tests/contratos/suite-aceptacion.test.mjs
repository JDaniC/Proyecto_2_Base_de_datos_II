import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  ejecutarSuiteAceptacion,
  planificarSuiteAceptacion,
  validarBundlesDePrueba,
  validarMatrizAceptacion,
} from './suite-aceptacion.mjs';

const urlFixtures = new URL('../fixtures/contextos-aceptacion-v1.json', import.meta.url);

test('matriz de fuente declara CA01–CA20 y cada escenario enlaza fixtures existentes', () => {
  assert.equal(validarMatrizAceptacion(), true);
  const filas = planificarSuiteAceptacion();
  const criterios = new Set(filas.map(({ criterio }) => criterio.id));
  assert.deepEqual([...criterios], Array.from({ length: 20 }, (_, i) => `CA${String(i + 1).padStart(2, '0')}`));
  assert.ok(filas.length > 20);
});

test('selecciona los cuatro motores únicamente desde configuración de prueba permitida', () => {
  const bundles = validarBundlesDePrueba();
  assert.deepEqual(bundles.map(({ institucion, motor }) => [institucion, motor]), [
    ['HOSPITAL_GENERAL', 'postgresql'],
    ['CLINICA_ODONTOLOGICA', 'mysql'],
    ['LABORATORIO_CLINICO', 'mongodb'],
    ['CENTRO_MEDICO_PEDIATRICO', 'firestore'],
  ]);
  assert.throws(() => validarBundlesDePrueba(bundles.map((bundle) => ({ ...bundle, uri: 'mongodb://host/base' }))), /solo admite/);
  assert.throws(() => validarBundlesDePrueba(bundles.map((bundle) =>
    bundle.institucion === 'HOSPITAL_GENERAL' ? { ...bundle, motor: 'mongodb' } : bundle,
  )), /Motor no permitido/);
  assert.throws(() => validarBundlesDePrueba(bundles.slice(1)), /exactamente un bundle/);
  assert.throws(() => validarBundlesDePrueba(null), /exactamente un bundle/);
  assert.throws(() => validarBundlesDePrueba(bundles.map((bundle, indice) =>
    indice === 3 ? { ...bundle, institucion: 'HOSPITAL_GENERAL', motor: 'postgresql' } : bundle,
  )), /Institución duplicada/);
});

test('parametriza casos comunes y declara como no aplicables agenda de laboratorio y reactivación no pediátrica', () => {
  const filas = planificarSuiteAceptacion();
  const equivalencia = filas.find(({ criterio, caso }) => criterio.id === 'CA04' && caso.id === 'perfil-comun-cuatro-adaptadores');
  assert.equal(equivalencia.modo, 'MULTI_BUNDLE');
  assert.deepEqual(equivalencia.bundles.map(({ institucion }) => institucion), [
    'HOSPITAL_GENERAL', 'CLINICA_ODONTOLOGICA', 'LABORATORIO_CLINICO', 'CENTRO_MEDICO_PEDIATRICO',
  ]);

  const agendaLab = filas.find(({ criterio, caso, bundle }) =>
    criterio.id === 'CA06' && bundle?.institucion === 'LABORATORIO_CLINICO' && caso.id === 'citas-y-atencion',
  );
  assert.equal(agendaLab.aplicable, false);
  assert.match(agendaLab.razonNoAplicable, /no publica agenda/);

  const reactivacion = filas.find(({ criterio, caso }) => criterio.id === 'CA08' && caso.id === 'reactivacion-solo-pediatria');
  assert.equal(reactivacion.modo, 'MULTI_BUNDLE');
  assert.equal(reactivacion.bundles.length, 4);
});

test('rechaza una matriz cuyos casos no tienen su fixture dentro del contexto recibido', () => {
  assert.throws(() => planificarSuiteAceptacion({ contextos: { escenarios: [] } }), /fixture inexistente/);
});

test('sin executor cada caso funcional queda NOT_IMPLEMENTED; nunca PASS por ausencia de backend', async () => {
  const plan = planificarSuiteAceptacion();
  const resultados = await ejecutarSuiteAceptacion();
  assert.equal(resultados.length, plan.length);
  assert.equal(resultados.some(({ estado }) => estado === 'PASS' || estado === 'FAIL'), false);
  assert.equal(resultados.filter(({ estado }) => estado === 'NOT_IMPLEMENTED').length,
    plan.filter(({ aplicable }) => aplicable).length);
  assert.equal(resultados.filter(({ estado }) => estado === 'NOT_APPLICABLE').length,
    plan.filter(({ aplicable }) => !aplicable).length);
  assert.ok(resultados.every((resultado) => Object.isFrozen(resultado)));
});

test('executor recibe fixture inmutable y un resultado vacío no puede declararse PASS', async () => {
  let invocaciones = 0;
  const resultados = await ejecutarSuiteAceptacion({ ejecutarCaso: async (entrada) => {
    invocaciones += 1;
    assert.equal(Object.isFrozen(entrada), true);
    assert.equal(Object.isFrozen(entrada.contextos), true);
    if (entrada.modo === 'MULTI_BUNDLE') assert.equal(entrada.bundles.length, 4);
    if (entrada.modo === 'POR_BUNDLE') assert.ok(entrada.bundle);
    return { estado: 'BLOCKED', justificacion: 'Adaptador real todavía no está disponible en este entorno.' };
  } });
  assert.equal(invocaciones, resultados.filter(({ estado }) => estado === 'BLOCKED').length);
  assert.equal(resultados.some(({ estado }) => estado === 'PASS'), false);

  await assert.rejects(() => ejecutarSuiteAceptacion({
    ejecutarCaso: async () => ({ estado: 'PASS', observado: 'parece correcto' }),
  }), /PASS requiere esperado y observado|PASS requiere evidencia portable/);
});

test('clona los fixtures personalizados antes de entregarlos al executor', async () => {
  const contextos = JSON.parse(await readFile(urlFixtures, 'utf8'));
  let invocaciones = 0;
  const resultados = await ejecutarSuiteAceptacion({
    contextos,
    ejecutarCaso: async (entrada) => {
      invocaciones += 1;
      assert.equal(Object.isFrozen(entrada.contextos), true);
      assert.equal(Object.isFrozen(entrada.contextos.escenarios), true);
      return { estado: 'BLOCKED', justificacion: 'Executor usado para probar el contrato del runner.' };
    },
  });
  assert.equal(Object.isFrozen(contextos), false, 'el runner no congela el objeto del llamador');
  assert.equal(invocaciones, resultados.filter(({ estado }) => estado === 'BLOCKED').length);
});

test('con executor y evidencia completa solo se marca PASS al devolver la observación', async () => {
  const resultados = await ejecutarSuiteAceptacion({
    ejecutarCaso: async ({ caso }) => ({
      estado: 'PASS',
      observado: `Resultado observado para ${caso.id}`,
      evidencia: 'salida-sintetica.txt',
    }),
  });
  assert.ok(resultados.some(({ estado }) => estado === 'PASS'));
  assert.equal(resultados.some(({ estado }) => estado === 'FAIL'), false);
  assert.ok(resultados.filter(({ estado }) => estado === 'PASS').every(({ observado, evidencia }) => observado && evidencia));
});
