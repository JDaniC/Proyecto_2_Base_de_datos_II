import assert from 'node:assert/strict';
import {test} from 'node:test';
import {CursorCatalogoLaboratorio} from '../../src/adaptadores/salida/mongodb/laboratorio/cursor-catalogo.js';
const id='00000000-0000-4000-8000-000000000001';
test('cursor UUID autentica ámbito y rechaza alteración, truncado y datos ajenos',()=>{
 const codec=new CursorCatalogoLaboratorio(()=> 'clave-exclusivamente-sintetica-para-pruebas');
 const cursor=codec.codificar('cuenta/catalogo/filtro',id);
 assert.equal(codec.decodificar(cursor,'cuenta/catalogo/filtro'),id);
 assert.throws(()=>codec.decodificar(cursor,'otra-cuenta/catalogo/filtro'));
 for(const valor of [cursor.slice(0,-1),cursor+'A','!', 'A'.repeat(2049),cursor.slice(0,20)+(cursor[20]==='A'?'B':'A')+cursor.slice(21)])assert.throws(()=>codec.decodificar(valor,'cuenta/catalogo/filtro'));
 assert.throws(()=>new CursorCatalogoLaboratorio(()=>undefined).codificar('ambito',id));
});
