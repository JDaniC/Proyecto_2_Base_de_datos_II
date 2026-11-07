import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {test} from 'node:test';

function validadorInicialResultados(){
 const definiciones=[];
 const destino={version:()=> '8.0.0',adminCommand:()=>({setName:'rs'}),getCollectionInfos:()=>[],
  createCollection:(nombre,opciones)=>definiciones.push({nombre,validador:opciones.validator}),getCollection:()=>({createIndex:()=>{},getIndexes:()=>[]})};
 vm.runInNewContext(readFileSync(resolve('..','Database','laboratorio_clinico_mongodb.js'),'utf8'),{db:{getSiblingDB:()=>destino},process:{env:{}},print:()=>{}});
 return structuredClone(definiciones.find(v=>v.nombre==='resultados').validador);
}

function base(collation){
 const extra=collation?{collation}:{};
 const manifiestos=new Map([[11,{id:11,version:1,estado:'LISTO'}]]),estado={validador:validadorInicialResultados(),indices:[
  {name:'_id_',key:{_id:1}},{name:'uq_resultado_serie_version',key:{serie_resultado_id:1,version:1},unique:true,...extra},
  {name:'ix_resultado_orden_item',key:{orden_id:1,item_id:1,fecha_analisis:1,_id:1},...extra},
  {name:'ix_resultado_estado_fecha',key:{estado:1,fecha_analisis:1,_id:1},...extra},
 ]};
 const historial={findOne:async f=>structuredClone(manifiestos.get(f.id)??null),updateOne:async(f,u)=>{
  const actual=manifiestos.get(f.id),nuevo={...(actual??{}),...(!actual?u.$setOnInsert??{}:{}),...(u.$set??{})};manifiestos.set(f.id,structuredClone(nuevo));return {matchedCount:actual?1:0,upsertedCount:actual?0:1};
 }};
 const resultados={listIndexes:()=>({toArray:async()=>structuredClone(estado.indices)}),countDocuments:async()=>0,
  createIndex:async(key,opciones)=>{if(!estado.indices.some(v=>v.name===opciones.name))estado.indices.push({key,...extra,...opciones});return opciones.name;}};
 const db={collection:nombre=>nombre==='historial_modelo'?historial:resultados,listCollections:()=>({toArray:async()=>[{name:'resultados',options:{validator:structuredClone(estado.validador),validationLevel:'strict',validationAction:'error',...extra}}]}),
  command:async cmd=>{estado.validador=structuredClone(cmd.validator);return {ok:1};}};
 return {db,manifiestos,estado};
}

test('012 exige escritores detenidos y recupera una interrupción posterior a collMod sin tocar documentos',async()=>{
 const {migrarResultadosLaboratorioMongodb}=await import(pathToFileURL(resolve('..','Database','migrations','012_resultados_laboratorio_mongodb.mjs')).href);
 const ensayo=base();
 await assert.rejects(migrarResultadosLaboratorioMongodb(ensayo.db),/DETENER_ESCRITORES_RESULTADOS/);
 assert.equal(ensayo.manifiestos.has(12),false);
 await assert.rejects(migrarResultadosLaboratorioMongodb(ensayo.db,{escritoresDetenidos:true,despuesDeValidador:()=>{throw new Error('CORTE_012');}}),/CORTE_012/);
 assert.equal(ensayo.manifiestos.get(12).estado,'MIGRANDO');
 const final=await migrarResultadosLaboratorioMongodb(ensayo.db,{escritoresDetenidos:true});
 assert.equal(final.estado,'LISTO');assert.equal(ensayo.manifiestos.get(12).estado,'LISTO');
 assert.ok(ensayo.estado.indices.some(v=>v.name==='ix_resultado_paciente_fecha'));
 assert.ok(ensayo.estado.indices.some(v=>v.name==='ix_resultado_repeticion'));
 for(const nombre of ['ix_resultado_fecha','ix_resultado_orden_fecha','ix_resultado_item_fecha','ix_resultado_serie_fecha'])assert.ok(ensayo.estado.indices.some(v=>v.name===nombre));
 const esquema=ensayo.estado.validador.$and[0].$jsonSchema;
 assert.ok(esquema.properties.paciente_id);assert.ok(esquema.properties.resultado_repetido_de_id);
});

test('012 rechaza deriva de validador antes de escribir manifiesto',async()=>{
 const {migrarResultadosLaboratorioMongodb}=await import(pathToFileURL(resolve('..','Database','migrations','012_resultados_laboratorio_mongodb.mjs')).href);
 const ensayo=base();ensayo.estado.validador.$and[0].$jsonSchema.properties.deriva={bsonType:'string'};
 await assert.rejects(migrarResultadosLaboratorioMongodb(ensayo.db,{escritoresDetenidos:true}),/ESQUEMA_RESULTADOS_DESCONOCIDO/);
 assert.equal(ensayo.manifiestos.has(12),false);
});

test('012 rechaza un índice destino con cotejamiento incompatible antes de MIGRANDO',async()=>{
 const {migrarResultadosLaboratorioMongodb}=await import(pathToFileURL(resolve('..','Database','migrations','012_resultados_laboratorio_mongodb.mjs')).href);
 const ensayo=base();ensayo.estado.indices.push({name:'ix_resultado_fecha',key:{fecha_analisis:1,_id:1},collation:{locale:'en',strength:2}});
 await assert.rejects(migrarResultadosLaboratorioMongodb(ensayo.db,{escritoresDetenidos:true}),/INDICE_RESULTADOS_INCOMPATIBLE/);
 assert.equal(ensayo.manifiestos.has(12),false);
 const noSimple=base({locale:'es',strength:1});noSimple.estado.indices.push({name:'ix_resultado_fecha',key:{fecha_analisis:1,_id:1}});
 await assert.rejects(migrarResultadosLaboratorioMongodb(noSimple.db,{escritoresDetenidos:true}),/INDICE_RESULTADOS_INCOMPATIBLE/);
 assert.equal(noSimple.manifiestos.has(12),false);
 const compatible=base({locale:'es',strength:1});compatible.estado.indices.push({name:'ix_resultado_fecha',key:{fecha_analisis:1,_id:1},collation:{locale:'es',strength:1}});
 assert.equal((await migrarResultadosLaboratorioMongodb(compatible.db,{escritoresDetenidos:true})).estado,'LISTO');
 assert.equal(compatible.manifiestos.get(12).estado,'LISTO');
});
