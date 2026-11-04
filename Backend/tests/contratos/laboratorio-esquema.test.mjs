import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const leer=n=>JSON.parse(readFileSync(new URL(`../../../Database/migrations/esquemas/011_laboratorio_mongodb_${n}.json`,import.meta.url)));
const base=leer('v1');const objetivo=leer('v2');
test('esquema origen 011 corresponde al M03 real sin modificar inicializador',()=>{
 const contexto={process:{env:{}},db:{getSiblingDB:()=>({version:()=> '8.0',adminCommand:()=>({setName:'prueba'})})},MONGO_LAB_DEFINICIONES_SOLAMENTE:true};
 vm.runInNewContext(readFileSync(new URL('../../../Database/laboratorio_clinico_mongodb.js',import.meta.url),'utf8'),contexto);
 const real=JSON.parse(JSON.stringify(contexto.MONGO_LAB_DEFINICIONES.filter(d=>base.some(b=>b.nombre===d.nombre)).map(({nombre,validador,indices})=>({nombre,validador,indices}))));
 assert.deepEqual(base,real);
});
test('extensión conserva índices, campos y restricciones previos; solo agrega procedencia',()=>{
 for(const anterior of base){
  const nuevo=structuredClone(objetivo.find(d=>d.nombre===anterior.nombre));
  assert.deepEqual(nuevo.indices,anterior.indices);
  const p=nuevo.validador.$and[0].$jsonSchema.properties;
  if(nuevo.nombre==='ordenes') delete p.items.items.properties.prueba_historica;
  if(nuevo.nombre==='muestras') for(const campo of ['recipiente','muestra_origen_id','retoma_id']) delete p[campo];
  if(nuevo.nombre==='eventos_muestra'){
   p.tipo_evento.enum=p.tipo_evento.enum.filter(e=>e!=='RETOMA');delete p.muestra_relacionada_id;nuevo.validador.$and.pop();
  }
  assert.deepEqual(nuevo,anterior);
 }
});
