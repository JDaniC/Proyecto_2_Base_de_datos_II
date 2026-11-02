import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/composicion/app.module.js';
import { crearAplicacionHttp } from '../../src/composicion/crear-aplicacion-http.js';
import { leerContratoOpenApi } from '../../src/composicion/leer-contrato-openapi.js';
import { parsearConfiguracion } from '../../src/configuracion/entorno.js';
import { VerificadorIdentidadMemoria } from '../../src/adaptadores/salida/identidad/verificador-identidad-memoria.js';
import { escenarioClinico, nuevoId } from '../fixtures/clinica-comun.js';
const pediatria=escenarioClinico('CENTRO_MEDICO_PEDIATRICO'), hospital=escenarioClinico('HOSPITAL_GENERAL');
const escenarios=[pediatria,hospital];
const tokens=escenarios.map((s,i)=>({token:`vacunas-sintetico-${i}`,uid:s.cuenta.uid,institucion:s.bundle.institucion}));
describe('vacunas HTTP con identidad y persistencia sintéticas',()=>{
 let app:INestApplication,url:string;
 const appId=`${pediatria.paciente.id}__${nuevoId()}__${nuevoId()}`;
 const ruta=`/pacientes/${pediatria.paciente.id}/aplicaciones-vacuna`;
 const entrada={vacunaId:nuevoId(),dosisId:nuevoId(),fechaAplicacion:'2026-01-01',lote:'ENSAYO',sitioAnatomico:'Brazo'};
 const headers=(i=0)=>({authorization:`Bearer ${tokens[i]!.token}`,'content-type':'application/json'});
 const post=(path:string,body:unknown,i=0,key=nuevoId())=>fetch(url+path,{method:'POST',headers:{...headers(i),'idempotency-key':key},body:JSON.stringify(body)});
 before(async()=>{
  const config=parsearConfiguracion({APP_ENV:'test',HOST:'127.0.0.1',PORT:'3000',INSTITUTIONS:'HOSPITAL_GENERAL,CENTRO_MEDICO_PEDIATRICO'});
  app=await crearAplicacionHttp(AppModule.registrar(config,{bundles:escenarios.map(s=>s.bundle),verificadorIdentidad:new VerificadorIdentidadMemoria(tokens)}),leerContratoOpenApi(resolve('docs/openapi.yaml')));
  await app.listen(0,'127.0.0.1');url=`http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}/api/v1`;
 });
 after(async()=>{await app?.close();});
 it('401 sin identidad en lectura y escritura',async()=>{
  assert.equal((await fetch(url+'/vacunas')).status,401);
  assert.equal((await fetch(url+ruta,{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,401);
 });
 it('403 hospital no accede a lectura, aplicación ni corrección pediátrica',async()=>{
  for(const path of ['/vacunas',`/pacientes/${pediatria.paciente.id}/esquemas`,ruta])assert.equal((await fetch(url+path,{headers:headers(1)})).status,403,path);
  assert.equal((await post(ruta,entrada,1)).status,403);
  assert.equal((await post(`/aplicaciones-vacuna/${appId}/correcciones`,{versionEsperada:1,motivo:'Ensayo',lote:'OTRO'},1)).status,403);
  assert.equal((await post(`/aplicaciones-vacuna/${appId}/anulacion`,{versionEsperada:1,motivo:'Ensayo'},1)).status,403);
 });
 it('403 permisos actuales insuficientes y catálogo reservado',async()=>{
  const original=pediatria.cuenta;pediatria.cuenta={...original,permisos:['historial.leer']};
  try{
   assert.equal((await post(ruta,entrada)).status,403);
   assert.equal((await post('/vacunas',{})).status,403);
   assert.equal((await post(`/vacunas/${entrada.vacunaId}/versiones`,{})).status,403);
  }finally{pediatria.cuenta=original;}
 });
 it('400 clave ausente o inválida y dosis malformada',async()=>{
  assert.equal((await fetch(url+ruta,{method:'POST',headers:headers(),body:JSON.stringify(entrada)})).status,400);
  assert.equal((await post(ruta,entrada,0,'invalida')).status,400);
  assert.equal((await post(ruta,{...entrada,dosisId:'invalida'})).status,400);
 });
 it('400 autoridad extra, fecha imposible, nulo, motivo y versión inválidos',async()=>{
  for(const body of [null,{}, {...entrada,actorId:nuevoId()}, {...entrada,institucion:'HOSPITAL_GENERAL'}, {...entrada,fechaAplicacion:'2026-02-30'}]){
   const r=await post(ruta,body);assert.equal(r.status,400);const texto=await r.text();assert.ok(!texto.includes('stack'));assert.ok(!texto.includes('firebase-admin'));
  }
  assert.equal((await post(`/aplicaciones-vacuna/${appId}/correcciones`,{versionEsperada:1,lote:'OTRO'})).status,400);
  assert.equal((await post(`/aplicaciones-vacuna/${appId}/anulacion`,{versionEsperada:0,motivo:'Ensayo'})).status,400);
 });
 it('400 edad cliente no sustituye edad civil',async()=>{
  assert.equal((await fetch(url+`/pacientes/${pediatria.paciente.id}/esquemas?edad_meses=999`,{headers:headers()})).status,400);
 });
 it('503 adaptador ausente no simula catálogo vacío',async()=>{
  const r=await fetch(url+'/vacunas',{headers:headers()});assert.equal(r.status,503);assert.equal('data' in await r.json(),false);
 });
});
