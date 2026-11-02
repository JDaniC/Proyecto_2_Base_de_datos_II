import {it} from 'node:test';
import assert from 'node:assert/strict';
import {escenarioClinico,nuevoId} from '../fixtures/clinica-comun.js';
import {ServiciosHospitalarios} from '../../src/aplicacion/casos-uso/hospital/servicios-hospitalarios.js';
import type {SolicitudServicioHospital} from '../../src/aplicacion/puertos/servicios-hospitalarios.js';
it('exámenes rechazan duplicados del mismo UUID con distinta capitalización antes de persistir',()=>{
 const e=escenarioClinico('HOSPITAL_GENERAL'),id='abcdefab-cdef-4abc-8def-abcdefabcdef';
 const bundle={...e.bundle,serviciosHospital:{catalogos:async()=>({}),listar:async()=>[],porId:async()=>null,ejecutar:async()=>{throw new Error('NO_DEBE_ESCRIBIR');}}};
 assert.throws(()=>new ServiciosHospitalarios().ejecutar(e.contexto,bundle,'ordenCrear',nuevoId(),undefined,{consultaId:nuevoId(),versionConsulta:1,versionPaciente:1,pruebasIds:[id,id.toUpperCase()],prioridad:'RUTINA',motivoClinico:'Prueba'},nuevoId()),{codigo:'SOLICITUD_INVALIDA'});
});
it('referencias de examen y parámetros llegan canónicas al puerto para resolver el resultado existente',async()=>{
 const e=escenarioClinico('HOSPITAL_GENERAL'),id='abcdefab-cdef-4abc-8def-abcdefabcdef';let capturada:SolicitudServicioHospital|undefined;
 const bundle={...e.bundle,serviciosHospital:{catalogos:async()=>({}),listar:async()=>[],porId:async()=>null,ejecutar:async(_c:unknown,s:SolicitudServicioHospital)=>{capturada=s;throw new Error('CAPTURADO');}}};
 await assert.rejects(new ServiciosHospitalarios().ejecutar(e.contexto,bundle,'resultadoRegistrar',nuevoId(),nuevoId(),{versionEsperada:1,pruebaId:id.toUpperCase(),parametros:[{parametroId:id.toUpperCase(),valorMedido:'1',alerta:'NORMAL'}],interpretacionClinica:'Prueba'},nuevoId()),/CAPTURADO/);
 assert.equal(capturada!.datos.pruebaId,id);assert.equal((capturada!.datos.parametros as Record<string,unknown>[])[0]!.parametroId,id);
});
