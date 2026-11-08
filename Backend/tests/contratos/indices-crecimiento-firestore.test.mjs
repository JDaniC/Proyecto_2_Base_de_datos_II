import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';

test('manifiesto Firestore cubre las dos direcciones de crecimiento por paciente',async()=>{
 const {indexes}=JSON.parse(await readFile(new URL('../../../Database/firebase/firestore.indexes.json',import.meta.url),'utf8'));
 for(const direccion of ['ASCENDING','DESCENDING']){
  assert.ok(indexes.some(i=>i.collectionGroup==='consultas'&&i.queryScope==='COLLECTION'&&
   i.fields.length===2&&i.fields[0].fieldPath==='paciente_id'&&i.fields[0].order==='ASCENDING'&&
   i.fields[1].fieldPath==='fecha_hora'&&i.fields[1].order===direccion),`Falta índice paciente_id / fecha_hora ${direccion}`);
 }
});

test('huella clínica y migración013 coinciden con el plan de instalación actual',async()=>{
 const {obtenerPlan}=await import('../../../Database/centro_pediatrico_firestore.mjs');
 const {HUELLA_OBJETIVO}=await import('../../../Database/migrations/013_manifiesto_pediatrico_firestore.mjs');
 const fuente=await readFile(new URL('../../src/adaptadores/salida/firestore/consultas/clinica-firestore.ts',import.meta.url),'utf8');
 assert.equal((await obtenerPlan()).hash_modelo,HUELLA_OBJETIVO);
 assert.ok(fuente.includes(`HUELLA_CLINICA_FIRESTORE = '${HUELLA_OBJETIVO}'`));
});
