import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {Response} from 'express';
import {LaboratorioController} from '../../src/adaptadores/entrada/http/laboratorio/laboratorio.controller.js';
import type {CrearOrdenLaboratorio} from '../../src/aplicacion/casos-uso/laboratorio/crear-orden.js';
import type {GestionarMuestraLaboratorio} from '../../src/aplicacion/casos-uso/laboratorio/gestionar-muestra.js';
import type {GestionarResultadoLaboratorio} from '../../src/aplicacion/casos-uso/laboratorio/gestionar-resultado.js';
import type {ConsultarListadosLaboratorio} from '../../src/aplicacion/casos-uso/laboratorio/consultar-listados.js';
import type {ConsultarRecursosLaboratorio} from '../../src/aplicacion/casos-uso/laboratorio/consultar-recursos.js';
import type {PublicarPruebaLaboratorio} from '../../src/aplicacion/casos-uso/laboratorio/publicar-prueba.js';
import type {PublicarMetodoLaboratorio} from '../../src/aplicacion/casos-uso/laboratorio/publicar-metodo.js';
import type {CambiarEstadoPruebaLaboratorio} from '../../src/aplicacion/casos-uso/laboratorio/cambiar-estado-prueba.js';
import type {CambiarEstadoMetodoLaboratorio} from '../../src/aplicacion/casos-uso/laboratorio/cambiar-estado-metodo.js';
import type {GuardarReferenciaLaboratorio} from '../../src/aplicacion/casos-uso/laboratorio/guardar-referencia.js';
import {escenarioClinico,nuevoId} from '../fixtures/clinica-comun.js';

function controlador(captura:{listado?:unknown[];orden?:unknown[];muestra?:unknown[]}){
 const escritura={ejecutar:async(...args:unknown[])=>{captura.orden=args;return {httpStatus:201,respuesta:{id:nuevoId()}};}};
 const muestra={ejecutar:async(...args:unknown[])=>{captura.muestra=args;return {httpStatus:200,respuesta:{id:nuevoId()}};}};
 const listados={ejecutar:async(...args:unknown[])=>{captura.listado=args;return {datos:[],siguienteCursor:null};},trabajoAnalitico:async(...args:unknown[])=>{captura.listado=args;return [];}};
 const recursos={detalle:async()=>({}),catalogo:async()=>({datos:[],siguienteCursor:null})};
 return new LaboratorioController(
  escritura as unknown as CrearOrdenLaboratorio,
  muestra as unknown as GestionarMuestraLaboratorio,
  muestra as unknown as GestionarResultadoLaboratorio,
  listados as unknown as ConsultarListadosLaboratorio,
  recursos as unknown as ConsultarRecursosLaboratorio,
  escritura as unknown as PublicarPruebaLaboratorio,
  escritura as unknown as PublicarMetodoLaboratorio,
  escritura as unknown as CambiarEstadoPruebaLaboratorio,
  escritura as unknown as CambiarEstadoMetodoLaboratorio,
  escritura as unknown as GuardarReferenciaLaboratorio,
 );
}

test('frontera laboratorio convierte solo escalares previstos y conserva ámbito del servidor',async()=>{
 const e=escenarioClinico('LABORATORIO_CLINICO'),captura:{listado?:unknown[]}={},controller=controlador(captura);
 await controller.listarOrdenes(e.contexto,e.bundle,{limite:'25',orden:'ASC',pacienteId:e.paciente.id});
 assert.deepEqual(captura.listado,['ordenes',{contexto:e.contexto,bundle:e.bundle,entrada:{limite:25,orden:'ASC',pacienteId:e.paciente.id}}]);
 assert.throws(()=>controller.listarOrdenes(e.contexto,e.bundle,{limite:['1','2']}),{codigo:'SOLICITUD_INVALIDA'});
 assert.throws(()=>controller.listarOrdenes(e.contexto,e.bundle,{activo:'1'}),{codigo:'SOLICITUD_INVALIDA'});
});

test('frontera laboratorio propaga idempotencia, código durable e IDs canónicos',async()=>{
 const e=escenarioClinico('LABORATORIO_CLINICO'),captura:{orden?:unknown[];muestra?:unknown[]}={},controller=controlador(captura),clave=nuevoId();
 let status=0,cabecera='';const res={status:(v:number)=>{status=v;return res;},set:(k:string,v:string)=>{if(k==='idempotency-key')cabecera=v;return res;}} as unknown as Response;
 await controller.crear(e.contexto,e.bundle,clave,{pacienteId:e.paciente.id},res);
 assert.equal(status,201);assert.equal(cabecera,clave);
 assert.deepEqual(captura.orden?.[0],{contexto:e.contexto,bundle:e.bundle,claveIdempotencia:clave,entrada:{pacienteId:e.paciente.id}});
 const muestraId=nuevoId();await controller.evento(e.contexto,e.bundle,muestraId,clave,{versionEsperada:1},res);
 assert.equal(status,200);assert.equal(captura.muestra?.[0],'evento');
 assert.deepEqual(captura.muestra?.[1],{contexto:e.contexto,bundle:e.bundle,id:muestraId,claveIdempotencia:clave,entrada:{versionEsperada:1}});
});

test('frontera laboratorio publica solo la consulta analitica dedicada',async()=>{
 const e=escenarioClinico('LABORATORIO_CLINICO'),captura:{listado?:unknown[]}={},controller=controlador(captura);
 await controller.trabajoAnalitico(e.contexto,e.bundle,{ordenId:e.paciente.id});
 assert.deepEqual(captura.listado,[{contexto:e.contexto,bundle:e.bundle,entrada:{ordenId:e.paciente.id}}]);
});
