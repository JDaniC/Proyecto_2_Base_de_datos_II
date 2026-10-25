import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { crearResultado, ESTADOS_RESULTADO, NIVELES_PRUEBA } from './resultado.mjs';

const fixtureBase = new URL('../fixtures/contextos-aceptacion-v1.json', import.meta.url);
const matrizUrl = new URL('../fixtures/matriz-aceptacion-v1.json', import.meta.url);
const fixtures = JSON.parse(await readFile(fixtureBase, 'utf8'));
const matriz = JSON.parse(await readFile(matrizUrl, 'utf8'));

const INSTITUCIONES = Object.freeze(fixtures.bundles_prueba.map(({ institucion }) => institucion));
const MOTORES_POR_INSTITUCION = new Map(
  fixtures.bundles_prueba.map(({ institucion, motor }) => [institucion, motor]),
);
const MODOS = new Set(['POR_BUNDLE', 'MULTI_BUNDLE', 'DOCUMENTAL']);
const PRIORIDADES = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);

function congelarProfundo(valor) {
  if (valor && typeof valor === 'object' && !Object.isFrozen(valor)) {
    for (const hijo of Object.values(valor)) congelarProfundo(hijo);
    Object.freeze(valor);
  }
  return valor;
}

congelarProfundo(fixtures);
congelarProfundo(matriz);

function exigir(condicion, mensaje) {
  if (!condicion) throw new TypeError(mensaje);
}

function textoNoVacio(valor) {
  return typeof valor === 'string' && valor.trim().length > 0;
}

export function validarBundlesDePrueba(bundles = fixtures.bundles_prueba) {
  exigir(Array.isArray(bundles) && bundles.length === INSTITUCIONES.length,
    'La suite completa requiere exactamente un bundle por institución.');

  const vistos = new Set();
  const seguros = bundles.map((bundle) => {
    exigir(bundle && typeof bundle === 'object' && !Array.isArray(bundle), 'Bundle de prueba inválido.');
    exigir(Object.keys(bundle).sort().join(',') === 'id,institucion,motor',
      'El bundle de prueba solo admite id, institucion y motor; destinos/secretos se configuran aparte.');
    exigir(textoNoVacio(bundle.id) && textoNoVacio(bundle.institucion) && textoNoVacio(bundle.motor),
      'Bundle de prueba requiere id, institución y motor.');
    exigir(!vistos.has(bundle.institucion), `Institución duplicada: ${bundle.institucion}.`);
    vistos.add(bundle.institucion);
    exigir(MOTORES_POR_INSTITUCION.get(bundle.institucion) === bundle.motor,
      `Motor no permitido para ${bundle.institucion}.`);
    const configurado = fixtures.bundles_prueba.find(({ institucion }) => institucion === bundle.institucion);
    exigir(configurado?.id === bundle.id, `Id de bundle no reconocido para ${bundle.institucion}.`);
    return Object.freeze({ id: bundle.id, institucion: bundle.institucion, motor: bundle.motor });
  });

  exigir(INSTITUCIONES.every((institucion) => vistos.has(institucion)), 'Falta uno o más bundles canónicos.');
  return Object.freeze(seguros);
}

export function validarMatrizAceptacion(definicion = matriz, contextos = fixtures) {
  exigir(definicion && definicion.version === 1 && Array.isArray(definicion.criterios),
    'Matriz de aceptación v1 inválida.');
  exigir(Array.isArray(definicion.fuentes) && definicion.fuentes.length > 0 && definicion.fuentes.every(textoNoVacio),
    'La matriz debe conservar fuentes documentales.');
  exigir(definicion.criterios.length === 20, 'La matriz debe declarar CA01–CA20 exactamente una vez.');

  const idsCriterio = new Set();
  const idsEscenario = new Set((contextos.escenarios ?? []).map(({ id }) => id));
  for (const [indice, criterio] of definicion.criterios.entries()) {
    const idEsperado = `CA${String(indice + 1).padStart(2, '0')}`;
    exigir(criterio?.id === idEsperado, `Se esperaba ${idEsperado} en la posición ${indice + 1}.`);
    exigir(!idsCriterio.has(criterio.id), `Criterio repetido: ${criterio.id}.`);
    idsCriterio.add(criterio.id);
    exigir(textoNoVacio(criterio.titulo) && NIVELES_PRUEBA.includes(criterio.nivel),
      `${criterio.id} requiere título y nivel de prueba válido.`);
    exigir(PRIORIDADES.has(criterio.prioridad), `${criterio.id} tiene prioridad inválida.`);
    exigir(Array.isArray(criterio.casos) && criterio.casos.length > 0, `${criterio.id} no tiene escenarios.`);

    const idsCaso = new Set();
    for (const caso of criterio.casos) {
      exigir(textoNoVacio(caso.id) && !idsCaso.has(caso.id), `${criterio.id} tiene escenario sin id o repetido.`);
      idsCaso.add(caso.id);
      exigir(MODOS.has(caso.modo), `${criterio.id}/${caso.id} tiene modo inválido.`);
      exigir(Array.isArray(caso.aplica_en), `${criterio.id}/${caso.id} debe declarar aplicabilidad.`);
      exigir(caso.aplica_en.every((institucion) => INSTITUCIONES.includes(institucion)),
        `${criterio.id}/${caso.id} referencia institución desconocida.`);
      exigir(new Set(caso.aplica_en).size === caso.aplica_en.length,
        `${criterio.id}/${caso.id} repite instituciones.`);
      exigir(textoNoVacio(caso.preparacion) && textoNoVacio(caso.accion) && textoNoVacio(caso.esperado),
        `${criterio.id}/${caso.id} requiere preparación, acción y resultado esperado.`);
      exigir(Array.isArray(caso.variantes_fixture) && caso.variantes_fixture.every((id) => idsEscenario.has(id)),
        `${criterio.id}/${caso.id} referencia fixture inexistente.`);

      if (caso.modo === 'DOCUMENTAL') {
        exigir(caso.aplica_en.length === 0, `${criterio.id}/${caso.id} documental no debe elegir motor.`);
      } else {
        exigir(caso.aplica_en.length > 0, `${criterio.id}/${caso.id} debe aplicar al menos a un bundle.`);
        if (caso.aplica_en.length < INSTITUCIONES.length) {
          exigir(textoNoVacio(caso.no_aplica), `${criterio.id}/${caso.id} debe justificar instituciones excluidas.`);
        }
      }
      if (caso.modo === 'MULTI_BUNDLE') {
        exigir(INSTITUCIONES.every((institucion) => caso.aplica_en.includes(institucion)),
          `${criterio.id}/${caso.id} multi-bundle debe incluir los cuatro bundles.`);
      }
    }
  }
  return true;
}

/** Expande cada caso por bundle y conserva explícitamente las exclusiones. */
export function planificarSuiteAceptacion({ bundles = fixtures.bundles_prueba, definicion = matriz, contextos = fixtures } = {}) {
  const bundlesSeguros = validarBundlesDePrueba(bundles);
  const definicionSegura = congelarProfundo(structuredClone(definicion));
  const contextosSeguros = congelarProfundo(structuredClone(contextos));
  validarMatrizAceptacion(definicionSegura, contextosSeguros);
  const filas = [];

  for (const criterio of definicionSegura.criterios) {
    for (const caso of criterio.casos) {
      if (caso.modo === 'DOCUMENTAL') {
        filas.push(Object.freeze({ criterio, caso, modo: caso.modo, bundle: null, bundles: Object.freeze([]), aplicable: true }));
        continue;
      }

      const bundlesAplicables = bundlesSeguros.filter(({ institucion }) => caso.aplica_en.includes(institucion));
      if (caso.modo === 'MULTI_BUNDLE') {
        filas.push(Object.freeze({ criterio, caso, modo: caso.modo, bundle: null, bundles: bundlesAplicables, aplicable: true }));
        continue;
      }

      for (const bundle of bundlesSeguros) {
        const aplicable = caso.aplica_en.includes(bundle.institucion);
        filas.push(Object.freeze({
          criterio,
          caso,
          modo: caso.modo,
          bundle,
          bundles: Object.freeze([bundle]),
          aplicable,
          ...(aplicable ? {} : { razonNoAplicable: caso.no_aplica }),
        }));
      }
    }
  }
  return Object.freeze(filas);
}

function nombreEscenario(fila) {
  const destino = fila.modo === 'DOCUMENTAL'
    ? 'DOCUMENTAL'
    : fila.modo === 'MULTI_BUNDLE'
      ? `MULTI:${fila.bundles.map(({ id }) => id).join(',')}`
      : fila.bundle.id;
  return `${fila.criterio.id}/${fila.caso.id}@${destino}`;
}

/**
 * Ejecuta solo cuando se inyecta un executor real. Sin backend/runtime,
 * devuelve NOT_IMPLEMENTED para cada caso aplicable y nunca un PASS vacío.
 */
export async function ejecutarSuiteAceptacion({
  bundles = fixtures.bundles_prueba,
  definicion = matriz,
  ejecutarCaso,
  contextos = fixtures,
} = {}) {
  const definicionSegura = congelarProfundo(structuredClone(definicion));
  const contextosSeguros = congelarProfundo(structuredClone(contextos));
  const filas = planificarSuiteAceptacion({ bundles, definicion: definicionSegura, contextos: contextosSeguros });
  const resultados = [];

  for (const fila of filas) {
    const escenario = nombreEscenario(fila);
    if (!fila.aplicable) {
      resultados.push(crearResultado({
        escenario,
        nivel: fila.criterio.nivel,
        estado: 'NOT_APPLICABLE',
        justificacion: fila.razonNoAplicable,
      }));
      continue;
    }

    if (typeof ejecutarCaso !== 'function') {
      resultados.push(crearResultado({
        escenario,
        nivel: fila.criterio.nivel,
        estado: 'NOT_IMPLEMENTED',
        justificacion: 'No hay executor de backend configurado; el runtime/caso de uso/adaptador todavía no existe.',
      }));
      continue;
    }

    const salida = await ejecutarCaso(Object.freeze({
      criterio: fila.criterio,
      caso: fila.caso,
      modo: fila.modo,
      bundle: fila.bundle,
      bundles: fila.bundles,
      contextos: contextosSeguros,
    }));
    exigir(salida && typeof salida === 'object' && ESTADOS_RESULTADO.includes(salida.estado),
      `${escenario}: executor debe devolver un estado de resultado reconocido.`);
    resultados.push(crearResultado({
      escenario,
      nivel: fila.criterio.nivel,
      estado: salida.estado,
      esperado: fila.caso.esperado,
      observado: salida.observado,
      evidencia: salida.evidencia,
      justificacion: salida.justificacion,
    }));
  }
  return Object.freeze(resultados);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const resultados = await ejecutarSuiteAceptacion();
  const conteo = Object.fromEntries(ESTADOS_RESULTADO.map((estado) => [
    estado,
    resultados.filter((resultado) => resultado.estado === estado).length,
  ]));
  const salida = process.argv.includes('--resumen')
    ? { total: resultados.length, conteo }
    : { total: resultados.length, conteo, resultados };
  process.stdout.write(`${JSON.stringify(salida, null, 2)}\n`);
}
