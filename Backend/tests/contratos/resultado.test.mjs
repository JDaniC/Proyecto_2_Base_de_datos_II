import test from 'node:test';
import assert from 'node:assert/strict';
import { crearResultado } from './resultado.mjs';

test('PASS requiere resultado observado y evidencia portable', () => {
  const resultado = crearResultado({
    escenario: 'guard-destino-local',
    nivel: 'DOMINIO_CON_DOBLES',
    estado: 'PASS',
    esperado: 'la preparación recibe un destino aislado',
    observado: 'callback preparar invocado una vez',
    evidencia: 'Backend/tests/contratos/entorno-aislado.test.mjs',
  });

  assert.equal(resultado.estado, 'PASS');
  assert.equal(Object.isFrozen(resultado), true);
});

test('no etiqueta como PASS una prueba vacía ni sin evidencia', () => {
  assert.throws(() => crearResultado({
    escenario: 'test-vacío', nivel: 'CONTRATO_PARAMETRIZADO', estado: 'PASS',
  }), /requiere esperado y observado/);

  assert.throws(() => crearResultado({
    escenario: 'sin-evidencia', nivel: 'DOMINIO_CON_DOBLES', estado: 'PASS',
    esperado: 'x', observado: 'x', evidencia: '   ',
  }), /requiere evidencia portable/);
});

test('NOT_IMPLEMENTED y BLOCKED requieren una causa explícita', () => {
  for (const estado of ['NOT_IMPLEMENTED', 'BLOCKED']) {
    assert.throws(() => crearResultado({
      escenario: 'api-real', nivel: 'API_CON_IDENTIDAD', estado,
    }), new RegExp(`${estado} requiere una justificación`));
  }
  assert.equal(crearResultado({
    escenario: 'api-real', nivel: 'API_CON_IDENTIDAD', estado: 'NOT_IMPLEMENTED',
    justificacion: 'El servidor todavía no existe en E00.',
  }).estado, 'NOT_IMPLEMENTED');
});
