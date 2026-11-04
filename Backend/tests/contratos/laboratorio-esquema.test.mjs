import {createHash} from 'node:crypto';
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
test('extensión conserva índices, campos y restricciones previos; agrega procedencia e índices compatibles',()=>{
 for(const anterior of base){
  const nuevo=structuredClone(objetivo.find(d=>d.nombre===anterior.nombre));
  assert.deepEqual(nuevo.indices.slice(0,anterior.indices.length),anterior.indices);
  nuevo.indices=nuevo.indices.slice(0,anterior.indices.length);
  const p=nuevo.validador.$and[0].$jsonSchema.properties;
  if(nuevo.nombre==='ordenes') delete p.items.items.properties.prueba_historica;
  if(nuevo.nombre==='muestras') for(const campo of ['recipiente','muestra_origen_id','retoma_id']) delete p[campo];
  if(nuevo.nombre==='eventos_muestra'){
   p.tipo_evento.enum=p.tipo_evento.enum.filter(e=>e!=='RETOMA');delete p.muestra_relacionada_id;delete p.orden_evento;nuevo.validador.$and.pop();
  }
  assert.deepEqual(nuevo,anterior);
 }
});

test('preflight runtime está sincronizado con huella y contratos de migración011',()=>{
 const codigo=readFileSync(new URL('../../src/adaptadores/salida/mongodb/laboratorio/preparacion-modelo.ts',import.meta.url),'utf8');
 const runtime=JSON.parse(codigo.split(' = ')[1].replace(/ as const;\s*$/,''));
 const ordenar=v=>Array.isArray(v)?v.map(ordenar):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordenar(v[k])])):v;
 const hash=v=>createHash('sha256').update(JSON.stringify(ordenar(v))).digest('hex');
 assert.equal(runtime.huella,hash(objetivo));
 assert.deepEqual(runtime.colecciones,objetivo.map(d=>({nombre:d.nombre,huellaValidador:hash(d.validador),indices:d.indices})));
});
