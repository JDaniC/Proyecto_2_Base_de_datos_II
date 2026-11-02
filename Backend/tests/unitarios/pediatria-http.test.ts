import { ConsultarResponsable } from '../../src/aplicacion/casos-uso/pediatria/consultar-responsable.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Response } from 'express';
import { ResponsablesController } from '../../src/adaptadores/entrada/http/pediatria/responsables.controller.js';
import type { GestionarResponsable } from '../../src/aplicacion/casos-uso/pediatria/gestionar-responsable.js';
import { escenarioClinico, nuevoId } from '../fixtures/clinica-comun.js';

test('adaptador HTTP conserva referencias y clave, usando contexto del servidor',async()=>{
  const e=escenarioClinico('CENTRO_MEDICO_PEDIATRICO'),clave=nuevoId();let capturado:unknown[]=[];
  const gestionar={ejecutar:async(...args:unknown[])=>{capturado=args;return {httpStatus:200,respuesta:{id:e.responsableId,activo:true},correlacionOriginal:clave};}} as unknown as GestionarResponsable;
  const controller=new ResponsablesController(gestionar,new ConsultarResponsable());let status=0;
  const res={status:(v:number)=>{status=v;}} as unknown as Response;
  const entrada={version_paciente:1,version_vinculo:1,es_principal:true,autoriza_atencion:false,parentesco:'MADRE'};
  const r=await controller.vinculo(e.contexto,e.bundle,e.paciente.id,e.responsableId,clave,entrada,res);
  assert.equal(status,200);assert.ok('activo' in r.data);assert.equal(r.data.activo,true);
  assert.equal(capturado[0],'vinculo');
  assert.deepEqual(capturado[1],{contexto:e.contexto,bundle:e.bundle,id:e.paciente.id,claveIdempotencia:clave,entrada});
});
