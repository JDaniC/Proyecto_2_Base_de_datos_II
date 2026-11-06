import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Db} from 'mongodb';
import {leerSnapshotCobros} from '../../src/adaptadores/salida/mongodb/cobros/consultas-cobros.js';
import {ErrorDominio} from '../../src/dominio/compartido/error-dominio.js';
test('lectura conserva error de dominio y sanea driver aunque falle abortTransaction',async()=>{
 for(const original of [new ErrorDominio('SIN_PERMISO','Acceso rechazado.'),new Error('DRIVER_SINTETICO')]){
  let abortos=0,cierres=0,commits=0;
  const db={client:{startSession:()=>({startTransaction(){},inTransaction:()=>true,async abortTransaction(){abortos++;throw new Error('ABORTO_SINTETICO');},async endSession(){cierres++;},async commitTransaction(){commits++;}})}} as unknown as Db;
  await assert.rejects(leerSnapshotCobros(db,async()=>{throw original;},async()=>{}),e=>e instanceof ErrorDominio&&e.codigo===(original instanceof ErrorDominio?'SIN_PERMISO':'PERSISTENCIA_NO_DISPONIBLE')&&!e.message.includes('SINTETICO'));
  assert.equal(abortos,1);assert.equal(cierres,1);assert.equal(commits,0);
 }
});
