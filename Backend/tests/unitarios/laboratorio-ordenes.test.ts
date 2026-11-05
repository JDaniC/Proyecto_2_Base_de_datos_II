import {documentoOrdenLaboratorio,mapearOrdenLaboratorio,validarTamanoDocumentoOrdenLaboratorio} from '../../src/adaptadores/salida/mongodb/laboratorio/documento-orden.js';
import {Long} from 'mongodb';
import {ErrorDominio} from '../../src/dominio/compartido/error-dominio.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crearOrdenLaboratorio, congelarPrueba, type PruebaVersionada } from '../../src/dominio/laboratorio/ordenes.js';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const prueba:PruebaVersionada={id:id(1),codigo:'P1',nombre:'Prueba sintética',version:1,activo:true,metodoId:id(2),tiposMuestraIds:[id(3)],parametros:[{id:id(4),codigo:'A',nombre:'Parámetro',tipo:'CATEGORICO',obligatorio:true,opciones:['A','B']}]};
const entrada={id:id(5),pacienteId:id(6),solicitanteId:id(7),registradoPorId:id(8),instante:'2026-11-03T12:00:00Z',prioridad:'RUTINA' as const,indicaciones:''};
test('orden conserva versión y copia profunda ante cambios futuros de catálogo',()=>{
 const catalogo=structuredClone(prueba);
 const orden=crearOrdenLaboratorio(entrada,[{id:id(9),prueba:catalogo,centavos:12345}]);
 (catalogo.parametros[0]!.opciones as string[]).push('C');
 (catalogo as {nombre:string}).nombre='Nombre nuevo';
 assert.equal(orden.items[0]?.prueba.nombre,'Prueba sintética');assert.deepEqual(orden.items[0]?.prueba.parametros[0]?.opciones,['A','B']);
 assert.equal(orden.total.centavos,12345);assert.equal(orden.total.moneda,'GTQ');assert.equal(orden.items[0]?.prueba.version,1);
 assert.ok(Object.isFrozen(orden.items[0]?.prueba.parametros));
});
test('precios enteros, duplicados, catálogo inactivo y total fuera de rango se rechazan',()=>{
 for(const centavos of [-1,1.2,NaN,Infinity]) assert.throws(()=>crearOrdenLaboratorio(entrada,[{id:id(9),prueba,centavos}]));
 assert.throws(()=>crearOrdenLaboratorio(entrada,[]));
 assert.throws(()=>crearOrdenLaboratorio(entrada,[{id:id(9),prueba:{...prueba,activo:false},centavos:1}]));
 assert.throws(()=>crearOrdenLaboratorio(entrada,[{id:id(9),prueba,centavos:1},{id:id(10),prueba,centavos:1}]));
 assert.throws(()=>crearOrdenLaboratorio(entrada,[{id:id(9),prueba,centavos:Number.MAX_SAFE_INTEGER},{id:id(10),prueba:{...prueba,id:id(11)},centavos:1}]));
});
test('catálogo exige parámetros y tipos únicos y opciones categóricas válidas',()=>{
 for(const p of [{...prueba,parametros:[]},{...prueba,parametros:[prueba.parametros[0]!,prueba.parametros[0]!]},{...prueba,tiposMuestraIds:[id(3),id(3)]},{...prueba,parametros:[{...prueba.parametros[0]!,opciones:[]}]},{...prueba,version:0}]) assert.throws(()=>congelarPrueba(p));
});

test('mapper de orden conserva snapshot y almacena dinero como BSON long',()=>{
 const orden=crearOrdenLaboratorio(entrada,[{id:id(9),prueba,centavos:12345}]);
 const doc=documentoOrdenLaboratorio(orden,'ORD-SINT-1');
 assert.ok(Long.isLong(doc.items[0]!.precio_acordado));assert.equal(doc.items[0]!.precio_acordado.toString(),'12345');
 assert.equal(doc.items[0]!.prueba_historica.version,1);assert.deepEqual(doc.items[0]!.prueba_historica.parametros[0].opciones_permitidas,['A','B']);
 assert.equal(doc.fecha_orden.toISOString(),'2026-11-03T12:00:00.000Z');assert.equal(doc.moneda,'GTQ');
});

test('snapshot de orden mayor a 256 KiB se rechaza antes de insertarlo',()=>{
 const seleccion=Array.from({length:100},(_,i)=>({id:id(100+i),centavos:1,prueba:{...prueba,id:id(1000+i),codigo:`P${i}`,nombre:`Prueba ${i}`,
  parametros:Array.from({length:100},(_,j)=>({id:id(2000+i*100+j),codigo:`P${j}`,nombre:'Parámetro '.repeat(20),tipo:'TEXTO' as const,obligatorio:true}))}}));
 const orden=crearOrdenLaboratorio(entrada,seleccion);
 const doc=documentoOrdenLaboratorio(orden,'ORD-GRANDE');
 assert.throws(()=>validarTamanoDocumentoOrdenLaboratorio(doc),e=>e instanceof ErrorDominio&&e.codigo==='LIMITE_AGREGADO');
});

test('lectura de orden reconstruye solo snapshot y rechaza legado o corrupción sin filtrar datos',()=>{
 const orden=crearOrdenLaboratorio(entrada,[{id:id(9),prueba,centavos:12345}]);
 const doc=documentoOrdenLaboratorio(orden,'ORD-SINT-1');
 assert.deepEqual(mapearOrdenLaboratorio(doc),{...orden,instante:'2026-11-03T12:00:00.000Z'});
 const final={...doc,estado:'COMPLETADA' as const,revision:3,items:doc.items.map(i=>({...i,estado:'COMPLETADO'}))};
 assert.equal(mapearOrdenLaboratorio(final).items[0]?.estado,'COMPLETADO');assert.equal(mapearOrdenLaboratorio(final).version,3);
 const legado={...doc,items:doc.items.map(i=>{const r={...i};delete r.prueba_historica;return r;})};
 const fueraRango={...doc,items:doc.items.map(i=>({...i,precio_acordado:Long.fromString('9223372036854775807')}))};
 for(const invalido of [legado,fueraRango,{...doc,revision:0},{...doc,moneda:'USD'}]) assert.throws(()=>mapearOrdenLaboratorio(invalido as typeof doc),e=>e instanceof ErrorDominio&&e.codigo==='PERSISTENCIA_NO_DISPONIBLE'&&!e.message.includes('ORD-SINT'));
});
