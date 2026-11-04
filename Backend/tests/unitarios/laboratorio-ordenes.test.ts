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
