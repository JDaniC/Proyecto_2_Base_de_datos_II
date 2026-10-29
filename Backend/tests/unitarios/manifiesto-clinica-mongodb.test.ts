import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';

test('manifiesto 005 coincide exactamente con el inicializador MongoDB y conserva reglas/índices previos', () => {
  const root = resolve('..','Database');
  const anterior = JSON.parse(readFileSync(resolve(root,'migrations/esquemas/005_consultas_mongodb_v1.json'),'utf8'));
  const objetivo = JSON.parse(readFileSync(resolve(root,'migrations/esquemas/005_consultas_mongodb_v2.json'),'utf8'));
  const contexto = {process: {env: {}}, MONGO_LAB_DEFINICIONES_SOLAMENTE: true, MONGO_LAB_DEFINICIONES: [] as {nombre: string}[],
    db: {getSiblingDB: () => ({version: () => '8.0', adminCommand: () => ({setName: 'rs0'})})}};
  runInNewContext(readFileSync(resolve(root,'laboratorio_clinico_mongodb.js'),'utf8'),contexto);
  const real = contexto.MONGO_LAB_DEFINICIONES.find(d => d.nombre === 'consultas_clinicas');
  assert.deepEqual(JSON.parse(JSON.stringify(real)),objetivo);
  assert.deepEqual(objetivo.indices,anterior.indices);
  assert.deepEqual(objetivo.validador.$and.slice(1),anterior.validador.$and.slice(1));
  assert.deepEqual(objetivo.esquema.required,anterior.esquema.required);
  const canonico = (v: unknown): unknown => Array.isArray(v) ? v.map(canonico) : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k,canonico((v as Record<string,unknown>)[k])])) : v;
  const huella = createHash('sha256').update(JSON.stringify(canonico(objetivo.validador))).digest('hex');
  assert.ok(readFileSync(resolve('src/adaptadores/salida/mongodb/consultas/clinica-mongodb.ts'),'utf8').includes(huella));
});
