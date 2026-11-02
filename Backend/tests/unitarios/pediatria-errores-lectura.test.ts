import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {Firestore,Transaction} from 'firebase-admin/firestore';
import {crearAntecedentesFirestore} from '../../src/adaptadores/salida/firestore/pediatria/antecedentes-firestore.js';
import {nuevoId} from '../fixtures/clinica-comun.js';
test('lectura transaccional preserva ABORTED para reintento; lectura externa sanea el fallo',async()=>{
 const aborto=Object.assign(new Error('ABORTED_SINTETICO'),{code:10});
 const db={doc:()=>({get:async()=>{throw aborto;}})} as unknown as Firestore;
 const t={get:async()=>{throw aborto;}} as unknown as Transaction;
 await assert.rejects(crearAntecedentesFirestore(db,t).porPaciente(nuevoId()),error=>error===aborto);
 await assert.rejects(crearAntecedentesFirestore(db).porPaciente(nuevoId()),{codigo:'PERSISTENCIA_NO_DISPONIBLE'});
});
