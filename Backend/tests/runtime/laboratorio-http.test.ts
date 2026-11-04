import assert from 'node:assert/strict';
import {after,before,describe,it} from 'node:test';
import {resolve} from 'node:path';
import type {AddressInfo} from 'node:net';
import type {INestApplication} from '@nestjs/common';
import {AppModule} from '../../src/composicion/app.module.js';
import {crearAplicacionHttp} from '../../src/composicion/crear-aplicacion-http.js';
import {leerContratoOpenApi} from '../../src/composicion/leer-contrato-openapi.js';
import {parsearConfiguracion} from '../../src/configuracion/entorno.js';
import {VerificadorIdentidadMemoria} from '../../src/adaptadores/salida/identidad/verificador-identidad-memoria.js';
import {escenarioClinico,nuevoId} from '../fixtures/clinica-comun.js';
import type {Permiso} from '../../src/dominio/compartido/autorizacion.js';

const laboratorio=escenarioClinico('LABORATORIO_CLINICO'),hospital=escenarioClinico('HOSPITAL_GENERAL');
const tokens=[laboratorio,hospital].map((s,i)=>({token:`laboratorio-http-${i}`,uid:s.cuenta.uid,institucion:s.bundle.institucion}));

describe('laboratorio HTTP aplica identidad, capacidad y DTO estricto antes del motor',()=>{
 let app:INestApplication,url:string;
 const headers=(i=0)=>({authorization:`Bearer ${tokens[i]!.token}`,'content-type':'application/json'});
 before(async()=>{
  laboratorio.cuenta={...laboratorio.cuenta,roles:['ADMIN_INSTITUCIONAL'],permisos:[...new Set<Permiso>([...laboratorio.cuenta.permisos,'ordenes.administrar','muestras.administrar','resultados.validar'])]};
  const config=parsearConfiguracion({APP_ENV:'test',HOST:'127.0.0.1',PORT:'3000',INSTITUTIONS:'HOSPITAL_GENERAL,CLINICA_ODONTOLOGICA,LABORATORIO_CLINICO,CENTRO_MEDICO_PEDIATRICO'});
  const escenarios=[hospital,escenarioClinico('CLINICA_ODONTOLOGICA'),laboratorio,escenarioClinico('CENTRO_MEDICO_PEDIATRICO')];
  app=await crearAplicacionHttp(AppModule.registrar(config,{bundles:escenarios.map(v=>v.bundle),verificadorIdentidad:new VerificadorIdentidadMemoria(tokens)}),leerContratoOpenApi(resolve('docs/openapi.yaml')));
  await app.listen(0,'127.0.0.1');url=`http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}/api/v1/laboratorio`;
 });
 after(async()=>app?.close());
 it('rechaza sin identidad y a otra institución antes de consultar persistencia',async()=>{
  assert.equal((await fetch(url+'/ordenes')).status,401);
  assert.equal((await fetch(url+'/ordenes',{headers:headers(1)})).status,403);
 });
 it('rechaza query repetida, conversiones ambiguas y autoridad del cliente',async()=>{
  assert.equal((await fetch(url+'/ordenes?limite=1&limite=2',{headers:headers()})).status,400);
  assert.equal((await fetch(url+'/catalogos/pruebas?activo=1',{headers:headers()})).status,400);
  const r=await fetch(url+'/ordenes',{method:'POST',headers:{...headers(),'idempotency-key':nuevoId()},body:JSON.stringify({institucion:'LABORATORIO_CLINICO'})});
  assert.equal(r.status,400);assert.doesNotMatch(await r.text(),/stack|mongodb|firebase-admin/i);
 });
 it('no simula datos cuando el adaptador de laboratorio falta',async()=>{
  const r=await fetch(url+'/ordenes?limite=1',{headers:headers()});
  assert.equal(r.status,503);assert.equal('data' in (await r.json() as object),false);
 });
 it('exige clave UUID estable en cada mutación',async()=>{
  const body={pacienteId:laboratorio.paciente.id,versionPaciente:1,solicitanteId:nuevoId(),prioridad:'RUTINA',indicaciones:'Ensayo',moneda:'GTQ',items:[{pruebaId:nuevoId(),centavos:100}]};
  assert.equal((await fetch(url+'/ordenes',{method:'POST',headers:headers(),body:JSON.stringify(body)})).status,400);
  assert.equal((await fetch(url+'/ordenes',{method:'POST',headers:{...headers(),'idempotency-key':'invalida'},body:JSON.stringify(body)})).status,400);
 });
});
