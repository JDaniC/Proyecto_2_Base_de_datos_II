import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {migrarLaboratorioMongodb} from '../../../Database/migrations/011_laboratorio_mongodb.mjs';
const origen=JSON.parse(readFileSync(new URL('../../../Database/migrations/esquemas/011_laboratorio_mongodb_v1.json',import.meta.url)));
function doble({legado=false,deriva=false}={}){
 const configuracion=new Map(origen.map(d=>[d.nombre,{options:{validator:structuredClone(d.validador),validationLevel:'strict',validationAction:'error'}}]));
 if(deriva) configuracion.get('muestras').options.validator={incompatible:true};
 const modelos=new Map([[1,{id:1,version:1,estado:'LISTO'}]]);const escrituras=[];
 const db={listCollections:({name})=>({toArray:async()=>[configuracion.get(name)]}),
  collection:nombre=>({aggregate:()=>({next:async()=>null}),createIndex:async()=>{},listIndexes:()=>({toArray:async()=>origen.find(d=>d.nombre===nombre).indices}),countDocuments:async()=>0,
   findOne:async filtro=>nombre==='historial_modelo'?modelos.get(filtro.id)??null:legado&&nombre==='ordenes'?{_id:'legado'}:null,
   updateOne:async(filtro,cambio)=>{escrituras.push('manifiesto');const previo=modelos.get(filtro.id);modelos.set(filtro.id,{...(!previo?cambio.$setOnInsert:{}),...previo,...cambio.$set});}}),
  command:async comando=>{escrituras.push(comando.collMod);configuracion.get(comando.collMod).options.validator=structuredClone(comando.validator);}};
 return {db,modelos,escrituras};
}
test('orquestación offline rechaza escritores activos y deriva antes de mutar',async()=>{
 const d=doble({deriva:true});
 await assert.rejects(migrarLaboratorioMongodb(d.db),/DETENER_ESCRITORES/);
 await assert.rejects(migrarLaboratorioMongodb(d.db,{escritoresDetenidos:true}),/ESQUEMA_LABORATORIO_DESCONOCIDO/);
 assert.deepEqual(d.escrituras,[]);
});
test('orquestación offline conserva respaldo y permite recuperar fallo parcial',async()=>{
 const d=doble();let llamadas=0;
 await assert.rejects(migrarLaboratorioMongodb(d.db,{escritoresDetenidos:true,despuesDeColeccion:()=>{if(++llamadas===1)throw new Error('FALLO_INYECTADO');}}),/FALLO_INYECTADO/);
 assert.equal(d.modelos.get(11).estado,'MIGRANDO');const respaldo=structuredClone(d.modelos.get(11).respaldo);
 assert.equal((await migrarLaboratorioMongodb(d.db,{escritoresDetenidos:true})).estado,'LISTO');
 assert.deepEqual(d.modelos.get(11).respaldo,respaldo);
 assert.equal((await migrarLaboratorioMongodb(d.db,{escritoresDetenidos:true})).estado,'LISTO');
});
test('orquestación offline no inventa snapshots ni quita conciliación previa',async()=>{
 const d=doble({legado:true});assert.equal((await migrarLaboratorioMongodb(d.db,{escritoresDetenidos:true})).estado,'RECONCILIAR');
 assert.equal((await migrarLaboratorioMongodb(d.db,{escritoresDetenidos:true})).estado,'RECONCILIAR');
});
