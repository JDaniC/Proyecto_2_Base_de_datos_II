import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {parse} from 'yaml';
const ordenar=v=>Array.isArray(v)?v.map(ordenar):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordenar(v[k])])):v;
test('preflight cobros captura exactamente validadores/índices M03 sin cambiar inicializador',()=>{
 const contexto={process:{env:{}},db:{getSiblingDB:()=>({version:()=> '8.0',adminCommand:()=>({setName:'prueba'})})},MONGO_LAB_DEFINICIONES_SOLAMENTE:true};
 vm.runInNewContext(readFileSync(new URL('../../../Database/laboratorio_clinico_mongodb.js',import.meta.url),'utf8'),contexto);
 const definiciones=JSON.parse(JSON.stringify(contexto.MONGO_LAB_DEFINICIONES.filter(d=>['facturas','pagos'].includes(d.nombre))));
 const captura=JSON.parse(readFileSync(new URL('../../src/adaptadores/salida/mongodb/cobros/preparacion.ts',import.meta.url),'utf8').split(' = ')[1].replace(/ as const;\s*$/,''));
 assert.deepEqual(captura,definiciones.map(({nombre,validador,indices})=>({nombre,huella:createHash('sha256').update(JSON.stringify(ordenar(validador))).digest('hex'),indices})));
});
test('OpenAPI publica las siete operaciones de cobros con autorización y errores completos',()=>{
 const api=parse(readFileSync(new URL('../../docs/openapi.yaml',import.meta.url),'utf8'),{merge:true});
 const operaciones=Object.entries(api.paths).filter(([k])=>k.startsWith('/laboratorio/facturas')).flatMap(([,v])=>Object.values(v));
 assert.equal(operaciones.length,7);
 for(const o of operaciones){assert.deepEqual(o['x-permisos'],['cobros.administrar']);assert.deepEqual(o['x-instituciones'],['LABORATORIO_CLINICO']);for(const c of ['400','401','403','404','409','413','500','503'])assert.ok(o.responses[c]);}
 for(const dto of ['CobrosEmitir','CobrosPagar','CobrosRevertir','CobrosAnular','CobrosReceptor'])assert.equal(api.components.schemas[dto].additionalProperties,false);
});
