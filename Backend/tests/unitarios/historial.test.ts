import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CursorHistorialCifrado } from '../../src/adaptadores/salida/historial/cursor-historial.js';
import { validarEventoHistorial, leerProyeccion, verificarManifiestoHistorial } from '../../src/adaptadores/salida/historial/proyeccion-historial.js';
import { mezclarEventos } from '../../src/aplicacion/casos-uso/historiales/mezclar-eventos.js';
import { fallo } from '../fixtures/ca07-historial.js';
const id = '00000000-0000-4000-8000-000000000001';
const evento = {id,fechaHora:'2026-01-01T00:00:00.000000000Z',tipo:'CONSULTA',recursoId:id,titulo:'Consulta',versionConsulta:1};
test('cursor cifrado autentica ámbito, formato, rotación y configuración', () => {
  const codec=new CursorHistorialCifrado(()=> 'clave-sintetica-de-32-caracteres-prueba');
  const c=codec.codificar('ambito',{id,fechaHora:evento.fechaHora});
  assert.deepEqual(codec.decodificar(c,'ambito'),{id,fechaHora:evento.fechaHora});
  assert.ok(!Buffer.from(c,'base64url').toString('utf8').includes(id));
  assert.notEqual(c,codec.codificar('ambito',{id,fechaHora:evento.fechaHora}));
  for(const alterado of ['', 'a'.repeat(2049), c+'=', c.slice(0,-3)+'aaa'])assert.throws(()=>codec.decodificar(alterado,'ambito'),fallo('SOLICITUD_INVALIDA'));
  assert.throws(()=>codec.decodificar(c,'otro'),fallo('SOLICITUD_INVALIDA'));
  assert.throws(()=>new CursorHistorialCifrado(()=> 'otra-clave-sintetica-de-32-caracteres').decodificar(c,'ambito'),fallo('SOLICITUD_INVALIDA'));
  assert.throws(()=>new CursorHistorialCifrado(()=> undefined).codificar('ambito',{id,fechaHora:evento.fechaHora}),fallo('PERSISTENCIA_NO_DISPONIBLE'));
});
test('proyección cerrada preserva versión y rechaza datos ajenos a su contrato/índice', () => {
  assert.equal(validarEventoHistorial(evento,'HOSPITAL_GENERAL').versionConsulta,1);
  for(const valor of [null,{}, {...evento,versionConsulta:undefined},{...evento,versionConsulta:0},{...evento,token:'invalido'},{...evento,tipo:'VACUNA'},{...evento,tipo:'ARCHIVO'},{...evento,titulo:' '},{...evento,tipo:'DIAGNOSTICO'}, {...evento,profesional:{id,nombre:'Dr',rol:'ADMIN_INSTITUCIONAL',activo:true}}]) {
    assert.throws(()=>validarEventoHistorial(valor,'HOSPITAL_GENERAL'),fallo('PERSISTENCIA_NO_DISPONIBLE'));
  }
  assert.throws(()=>leerProyeccion(evento,'HOSPITAL_GENERAL',{id,tipo:'ARCHIVO',fecha_hora:evento.fechaHora}),fallo('PERSISTENCIA_NO_DISPONIBLE'));
  for(const m of [null,{version:1,estado:'RECONCILIAR'},{version:2,estado:'LISTO'}])assert.throws(()=>verificarManifiestoHistorial(m),fallo('PERSISTENCIA_NO_DISPONIBLE'));
});
test('un fallo de fuente espera el cierre de las demás lecturas antes de devolver error', async () => {
  let completada=false;
  await assert.rejects(mezclarEventos({pacienteId:id,limite:1,orden:'ASC',fuentes:[{async leer(){throw new Error('fallo');}},{async leer(){await new Promise((ok)=>setTimeout(ok,10));completada=true;return [];}}]}));
  assert.equal(completada,true);
});

test('caso de uso rechaza tipos, ausencia y rangos inválidos antes de acceder a persistencia', async () => {
  const { ConsultarHistorial, normalizarInstante } = await import('../../src/aplicacion/casos-uso/historiales/consultar-historial.js');
  const { contextoCA07 } = await import('../fixtures/ca07-historial.js');
  const bundle = { institucion: 'HOSPITAL_GENERAL', estadoPersistencia: 'DISPONIBLE' } as const;
  const servicio = new ConsultarHistorial(new CursorHistorialCifrado(() => 'clave-sintetica-de-32-caracteres-prueba'));
  for (const entrada of [undefined, null, [], 'texto', { limite: null }, { limite: -1 }, { limite: Infinity }, { orden: 'OTRO' }, { tipo: null }, { desde: '' }, { desde: '2026-02-30T00:00:00Z' }, { desde: '2026-02-02T00:00:00Z', hasta: '2026-02-01T00:00:00Z' }, { rol: 'ADMIN_INSTITUCIONAL' }]) {
    await assert.rejects(servicio.ejecutar(contextoCA07(bundle), bundle, id, entrada as unknown as import('../../src/aplicacion/puertos/historial.js').FiltrosHistorial), fallo('SOLICITUD_INVALIDA'));
  }
  assert.equal(normalizarInstante('2026-01-01T00:00:00.1Z'), '2026-01-01T00:00:00.100000000Z');
  assert.equal(normalizarInstante('2026-01-01T00:00:00Z'), '2026-01-01T00:00:00.000000000Z');
});
