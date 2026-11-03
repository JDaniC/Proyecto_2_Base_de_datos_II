import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import { AppModule } from '../../src/composicion/app.module.js';
import { crearAplicacionHttp } from '../../src/composicion/crear-aplicacion-http.js';
import { leerContratoOpenApi } from '../../src/composicion/leer-contrato-openapi.js';
import { parsearConfiguracion } from '../../src/configuracion/entorno.js';
import { INSTITUCIONES_CANONICAS } from '../../src/dominio/compartido/institucion.js';
import { VerificadorIdentidadMemoria } from '../../src/adaptadores/salida/identidad/verificador-identidad-memoria.js';
import { escenarioClinico } from '../fixtures/clinica-comun.js';
import type { BundleInstitucional } from '../../src/aplicacion/puertos/bundle-institucional.js';

for(const falla of [false,true])test(`cierre HTTP drena lectura ${falla?'fallida':'exitosa'} antes de liberar recursos`,async()=>{
  const escenarios=INSTITUCIONES_CANONICAS.map(escenarioClinico),pedi=escenarios[3]!;
  let iniciar!:()=>void,liberar!:()=>void;
  const iniciada=new Promise<void>(r=>{iniciar=r;}),pendiente=new Promise<void>(r=>{liberar=r;});
  const orden:string[]=[];
  const vacunas:NonNullable<BundleInstitucional['vacunasPediatricas']>={
    obtenerCatalogo:async()=>{orden.push('lectura.inicio');iniciar();await pendiente;orden.push('lectura.fin');if(falla)throw new Error('FALLO_SINTETICO');return [];},
    obtenerVersionEsquema:async()=>null,obtenerEsquemas:async()=>[],obtenerAplicaciones:async()=>[],obtenerPorId:async()=>null,
  };
  const config=parsearConfiguracion({APP_ENV:'test',HOST:'127.0.0.1',PORT:'3000',INSTITUTIONS:INSTITUCIONES_CANONICAS.join(',')});
  const app=await crearAplicacionHttp(AppModule.registrar(config,{bundles:escenarios.map((s,i)=>i===3?{...s.bundle,vacunasPediatricas:vacunas}:s.bundle),verificadorIdentidad:new VerificadorIdentidadMemoria([{token:'cierre-ensayo',uid:pedi.cuenta.uid,institucion:'CENTRO_MEDICO_PEDIATRICO'}]),cerrarRecursos:async()=>{orden.push('recursos.cierre');}}),leerContratoOpenApi(resolve('docs/openapi.yaml')));
  await app.listen(0,'127.0.0.1');
  const url=`http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}/api/v1/vacunas`;
  const respuesta=fetch(url,{headers:{authorization:'Bearer cierre-ensayo'}});
  await iniciada;
  const cierre=app.close();
  await new Promise<void>(resolve=>setImmediate(resolve));
  liberar();
  const r=await respuesta;await r.text();await cierre;
  assert.equal(r.status,falla?500:200);
  assert.deepEqual(orden,['lectura.inicio','lectura.fin','recursos.cierre']);
});
