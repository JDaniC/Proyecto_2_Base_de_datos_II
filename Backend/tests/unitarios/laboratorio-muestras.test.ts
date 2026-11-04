import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registrarEventoMuestra, rectificarMuestra, retomarMuestra, tomarMuestra, type Muestra, type TipoEventoMuestra } from '../../src/dominio/laboratorio/muestras.js';
const inicial: Muestra = {id:'muestra',ordenId:'orden',codigo:'M-1',recipiente:'Tubo anterior',estado:'TOMADA',version:1,eventos:[{id:'toma',actorId:'cuenta',instante:'2026-11-03T12:00:00.000Z',tipo:'TOMA',detalle:'Toma inicial'}]};
const autor={id:'evento',actorId:'cuenta-verificada',instante:'2026-11-03T12:01:00.000Z'};
test('cadena de custodia conserva eventos, estado y agregado original',()=>{
 let muestra=inicial;
 for(const [i,tipo] of (['RECEPCION','ACEPTACION','TRASLADO','PROCESAMIENTO'] as const).entries()) muestra=registrarEventoMuestra(muestra,muestra.version,tipo,'Detalle de custodia',{...autor,id:`evento-${i}`});
 assert.equal(muestra.estado,'PROCESADA');assert.equal(muestra.version,5);assert.equal(muestra.eventos.length,5);
 assert.equal(inicial.estado,'TOMADA');assert.equal(inicial.eventos.length,1);assert.ok(Object.isFrozen(muestra.eventos));
});
test('rechazo exige recepción, motivo y permite rectificación sin reabrir muestra',()=>{
 assert.throws(()=>registrarEventoMuestra(inicial,1,'RECHAZO','Motivo',autor));
 const recibida=registrarEventoMuestra(inicial,1,'RECEPCION','Recibida',autor);
 assert.throws(()=>registrarEventoMuestra(recibida,2,'RECHAZO',' ',{...autor,id:'rechazo'}));
 const rechazada=registrarEventoMuestra(recibida,2,'RECHAZO','Recipiente incorrecto',{...autor,id:'rechazo'});
 const corregida=rectificarMuestra(rechazada,3,'recipiente','Tubo corregido','Rectifica recipiente',{...autor,id:'rectificacion'});
 assert.equal(corregida.estado,'RECHAZADA');assert.equal(corregida.eventos[2]?.detalle,'Recipiente incorrecto');
 for(const tipo of ['ACEPTACION','PROCESAMIENTO','TRASLADO'] as const) assert.throws(()=>registrarEventoMuestra(rechazada,3,tipo,'Intento',{...autor,id:'otro'}));
});
test('versión, cronología, identidad de evento y transición fallan sin mutar',()=>{
 for(const [version,tipo,datos] of [[0,'RECEPCION',autor],[2,'RECEPCION',autor],[1,'ACEPTACION',autor],[1,'TOMA',autor],[1,'RECEPCION',{...autor,id:'toma'}],[1,'RECEPCION',{...autor,instante:'2026-11-03T11:59:59.000Z'}],[1,'RECEPCION',{...autor,instante:'2026-02-30T12:00:00.000Z'}]] as [number,TipoEventoMuestra,typeof autor][]) assert.throws(()=>registrarEventoMuestra(inicial,version,tipo,'Detalle',datos));
 assert.equal(inicial.version,1);assert.equal(inicial.eventos.length,1);
});

test('rectificación conserva antes/después y rechaza evento sin snapshot',()=>{
 const r=rectificarMuestra(inicial,1,'recipiente','Tubo nuevo','Error de registro',autor);
 assert.deepEqual(r.eventos[1]?.rectificacion,{campo:'recipiente',anterior:'Tubo anterior',nuevo:'Tubo nuevo'});
 assert.equal(inicial.recipiente,'Tubo anterior');assert.equal(r.recipiente,'Tubo nuevo');
 assert.throws(()=>registrarEventoMuestra(inicial,1,'RECTIFICACION','Sin snapshot',autor));
 assert.throws(()=>rectificarMuestra(inicial,1,'recipiente','Tubo anterior','Sin cambio',autor));
});
const ids=Array.from({length:8},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const toma={id:ids[0]!,ordenId:ids[1]!,codigo:'M-1',tipoMuestraId:ids[2]!,recipiente:'Tubo'};
const actor={id:ids[3]!,actorId:ids[4]!,instante:'2026-11-03T12:00:00.000Z'};
test('retoma produce nueva identidad vinculada y conserva origen rechazado',()=>{
 let m=tomarMuestra(toma,actor);
 m=registrarEventoMuestra(m,1,'RECEPCION','Recibida',{...actor,id:ids[5]!});
 m=registrarEventoMuestra(m,2,'RECHAZO','Recipiente dañado',{...actor,id:ids[6]!});
 const entrada={...toma,id:ids[7]!,codigo:'M-2'};
 const autores=[{...actor,id:'10000000-0000-4000-8000-000000000001'},{...actor,id:'10000000-0000-4000-8000-000000000002'}] as const;
 const r=retomarMuestra(m,3,entrada,'Nueva toma',autores[0],autores[1]);
 assert.equal(r.nueva.origenId,m.id);assert.equal(r.origen.retomaId,r.nueva.id);assert.equal(r.origen.estado,'RECHAZADA');assert.equal(r.nueva.estado,'TOMADA');assert.equal(m.eventos.length,3);
 assert.throws(()=>retomarMuestra(r.origen,4,entrada,'Otra',autores[0],autores[1]));
 for(const e of [{...entrada,ordenId:ids[2]!},{...entrada,id:m.id},{...entrada,codigo:m.codigo}]) assert.throws(()=>retomarMuestra(m,3,e,'Nueva toma',autores[0],autores[1]));
 assert.throws(()=>retomarMuestra(m,3,entrada,' ',autores[0],autores[1]));
});
