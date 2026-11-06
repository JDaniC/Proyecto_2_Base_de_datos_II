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
const escenarios=[escenarioClinico('LABORATORIO_CLINICO'),escenarioClinico('HOSPITAL_GENERAL'),escenarioClinico('CLINICA_ODONTOLOGICA'),escenarioClinico('CENTRO_MEDICO_PEDIATRICO')];
const tokens=escenarios.map((s,i)=>({token:`cobros-http-${i}`,uid:s.cuenta.uid,institucion:s.bundle.institucion}));
describe('cobros HTTP aplica identidad institucional, cuenta y contrato cerrado',()=>{
 let app:INestApplication,url:string;let disponible=true;let cursor=false;
 const h=(i=0)=>({authorization:`Bearer ${tokens[i]!.token}`,'content-type':'application/json'});
 before(async()=>{
  for(const s of escenarios)s.cuenta={...s.cuenta,roles:['ADMIN_INSTITUCIONAL'],permisos:[...s.cuenta.permisos,'cobros.administrar']};
  const bundles=escenarios.map((s,i)=>i===0?{...s.bundle,cobros:{async detalle(){return null;},async listar(){if(!disponible)throw new Error('FALLO_INTERNO_SINTETICO');return {elementos:[],...(cursor?{siguienteCursor:'cursor-sintetico'}:{})};}}}:s.bundle);
  const config=parsearConfiguracion({APP_ENV:'test',HOST:'127.0.0.1',PORT:'3000',INSTITUTIONS:'HOSPITAL_GENERAL,CLINICA_ODONTOLOGICA,LABORATORIO_CLINICO,CENTRO_MEDICO_PEDIATRICO'});
  app=await crearAplicacionHttp(AppModule.registrar(config,{bundles,verificadorIdentidad:new VerificadorIdentidadMemoria(tokens)}),leerContratoOpenApi(resolve('docs/openapi.yaml')));
  await app.listen(0,'127.0.0.1');url=`http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}/api/v1/laboratorio/facturas`;
 });
 after(async()=>app?.close());
 it('401 y 403 para cada institución ajena aun con el mismo permiso',async()=>{
  assert.equal((await fetch(url)).status,401);for(const i of [1,2,3])for(const ruta of ['',`/${nuevoId()}`,`/${nuevoId()}/pagos`])assert.equal((await fetch(url+ruta,{headers:h(i)})).status,403);
  for(const i of [1,2,3])for(const ruta of ['',`/${nuevoId()}/pagos`,`/${nuevoId()}/reversiones`,`/${nuevoId()}/anulacion`])assert.equal((await fetch(url+ruta,{method:'POST',headers:{...h(i),'idempotency-key':nuevoId()},body:'{}'})).status,403);
 });
 it('consulta autorizada, inexistente404 y filtros cerrados400',async()=>{
  assert.equal((await fetch(url,{headers:h()})).status,200);assert.equal((await fetch(url+'?limite=100',{headers:h()})).status,200);
  assert.equal((await fetch(`${url}/${nuevoId()}`,{headers:h()})).status,404);
  for(const query of ['?limite=1&limite=2','?limite[x]=1','?actorId=cliente','?limite=101','?estado=BORRADOR','?desde=ayer','?limite=01'])assert.equal((await fetch(url+query,{headers:h()})).status,400,query);
 });
 it('publica data y meta.siguiente_cursor en ambas listas y omite cursor al terminar',async()=>{
  for(const ruta of ['',`/${nuevoId()}/pagos`]){
   cursor=true;const pagina=await (await fetch(url+ruta,{headers:h()})).json() as {data:unknown;meta:{correlacion:string;siguiente_cursor?:string}};
   assert.deepEqual(pagina.data,[]);assert.equal(pagina.meta.siguiente_cursor,'cursor-sintetico');assert.ok(pagina.meta.correlacion);
   cursor=false;const final=await (await fetch(url+ruta,{headers:h()})).json() as {data:unknown;meta:object};assert.deepEqual(final.data,[]);assert.equal('siguiente_cursor' in final.meta,false);
  }
 });
 it('clave UUID y DTO cerrado en mutaciones, sin confianza en actor o moneda omitida',async()=>{
  for(const [ruta,body,clave]of [['',{},''],['',{},'invalida'],['',{actorId:nuevoId()},nuevoId()],[`/${nuevoId()}/pagos`,{versionEsperada:1,importe:1,metodo:'EFECTIVO'},nuevoId()],[`/${nuevoId()}/reversiones`,{versionEsperada:1,pagoId:nuevoId(),motivo:''},nuevoId()]] as const){
   const r=await fetch(url+ruta,{method:'POST',headers:{...h(),'idempotency-key':clave},body:JSON.stringify(body)});assert.equal(r.status,400);assert.doesNotMatch(await r.text(),/stack|mongodb|FALLO_INTERNO/);
  }
 });
 it('bloquea payload excesivo e intento de inyección por query',async()=>{
  const grande=await fetch(url,{method:'POST',headers:{...h(),'idempotency-key':nuevoId()},body:JSON.stringify({receptor:{nombre:'x'.repeat(262144)}})});assert.equal(grande.status,413);
  for(const q of ['?ordenId[$ne]=x','?pacienteId=%7B%22%24ne%22%3Anull%7D','?estado[$regex]=.*','?%24where=1'])assert.equal((await fetch(url+q,{headers:h()})).status,400,q);
 });
 it('permiso retirado y cuenta inactiva bloquean la siguiente petición',async()=>{
  const s=escenarios[0]!,prev=s.cuenta;
  try{s.cuenta={...prev,permisos:[]};assert.equal((await fetch(url,{headers:h()})).status,403);s.cuenta={...prev,estado:'INACTIVA'};assert.equal((await fetch(url,{headers:h()})).status,403);}finally{s.cuenta=prev;}
 });
 it('fallo interno no expone datos técnicos ni simula éxito',async()=>{
  disponible=false;try{const r=await fetch(url,{headers:h()});assert.equal(r.status,500);assert.doesNotMatch(await r.text(),/FALLO_INTERNO|stack|mongodb/);}finally{disponible=true;}
 });
});
