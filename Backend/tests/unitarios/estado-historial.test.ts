import { crearContextoAutenticado } from '../../src/aplicacion/puertos/contexto-autenticado.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CambiarEstadoHistorial } from '../../src/aplicacion/casos-uso/historiales/cambiar-estado-historial.js';
import { AtencionClinica } from '../../src/aplicacion/casos-uso/consultas/atencion-clinica.js';
import { dependenciasComandoPorDefecto } from '../../src/adaptadores/salida/sistema/servicios-sistema.js';
import { INSTITUCIONES_CANONICAS } from '../../src/dominio/compartido/institucion.js';
import { escenarioClinico, nuevoId } from '../fixtures/clinica-comun.js';
const estado = new CambiarEstadoHistorial(dependenciasComandoPorDefecto);
const clinica = new AtencionClinica(dependenciasComandoPorDefecto);
for (const institucion of INSTITUCIONES_CANONICAS) test(`${institucion}: archivo, corrección y versiones atómicas`, async () => {
  const e = escenarioClinico(institucion);
  e.cuenta = {...e.cuenta, permisos: [...e.cuenta.permisos, 'historial.archivar']};
  const contexto = crearContextoAutenticado(e.contexto.identidad, e.cuenta, e.contexto.correlacion);
  const creada = await clinica.ejecutar('completa', {...e, contexto, claveIdempotencia: nuevoId(), entrada: e.entrada});
  const clave = nuevoId();
  const p = {...e, contexto, id: e.paciente.id, claveIdempotencia: clave,
    entrada: {version_esperada: 2, causa: 'FALLECIMIENTO', motivo: 'Registro sintético'}};
  const archivo = await estado.ejecutar('archivar', p);
  assert.equal(archivo.respuesta.estado, 'ARCHIVADO');
  assert.deepEqual(await estado.ejecutar('archivar', p), archivo);
  await assert.rejects(clinica.ejecutar('completa', {...e, contexto, claveIdempotencia: nuevoId(), entrada: {...e.entrada, version_paciente: 3}}), /archivado/);
  const correccion = {...e, contexto, id: creada.respuesta.id, claveIdempotencia: nuevoId(), entrada: {
    version_esperada: 1, motivo_correccion: 'Ajuste sintético', contenido: {motivo: 'Corregido', sintomas: '', signos_vitales: {}, diagnosticos: [], tratamientos: []}}};
  e.control.fallo = 'auditoria';
  await assert.rejects(clinica.ejecutar('corregir', correccion));
  assert.equal(e.consultas.get(creada.respuesta.id)?.version, 1);
  e.control.fallo = '';
  const corregida = await clinica.ejecutar('corregir', correccion);
  assert.equal(corregida.respuesta.version, 2);
  assert.equal(corregida.respuesta.receta, undefined);
  assert.deepEqual(await e.bundle.clinica!.consultas.porVersion(creada.respuesta.id, creada.respuesta.version), creada.respuesta);
  const reactivacion = {...e, contexto, id: e.paciente.id, claveIdempotencia: nuevoId(), entrada: {version_esperada: 4, motivo: 'Corrección administrativa'}};
  await assert.rejects(estado.ejecutar('reactivar', reactivacion));
  if (institucion === 'CENTRO_MEDICO_PEDIATRICO') {
    const r = await estado.ejecutar('reactivar', {...reactivacion, claveIdempotencia: nuevoId(), entrada: {...reactivacion.entrada, correccion_fallecimiento: true}});
    assert.equal(r.respuesta.estado, 'ACTIVO');
    assert.equal(r.respuesta.baja?.causa, 'FALLECIMIENTO');
  }
});

test('una receta semánticamente idéntica conserva versión sin permiso de emisión aunque JSON cambie orden', async () => {
  const e = escenarioClinico('HOSPITAL_GENERAL');
  const creada = await clinica.ejecutar('completa', {...e, claveIdempotencia: nuevoId(), entrada: e.entrada});
  const receta = creada.respuesta.receta!;
  const reordenada = {...creada.respuesta, receta: {...receta, medicamentos: receta.medicamentos.map(m => Object.fromEntries(Object.entries(m).reverse()) as typeof m)}};
  e.consultas.set(creada.respuesta.id, reordenada);
  e.cuenta = {...e.cuenta, permisos: e.cuenta.permisos.filter(p => p !== 'recetas.emitir')};
  const contexto = crearContextoAutenticado(e.contexto.identidad, e.cuenta, e.contexto.correlacion);
  const corregida = await clinica.ejecutar('corregir', {...e, contexto, id: creada.respuesta.id, claveIdempotencia: nuevoId(), entrada: {
    version_esperada: 1, motivo_correccion: 'Solo cambia motivo', contenido: {motivo: 'Motivo corregido', sintomas: '', signos_vitales: {}, diagnosticos: [], tratamientos: [], receta: e.entrada.receta}}});
  assert.equal(corregida.respuesta.receta?.version, 1);
  assert.deepEqual(corregida.respuesta.receta, reordenada.receta);
});
