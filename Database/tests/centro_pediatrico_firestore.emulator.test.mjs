import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, getDocs, collection, setLogLevel } from 'firebase/firestore';
import { conectarFirestore, inicializarFirestore, rolesIniciales, obtenerPlan } from '../centro_pediatrico_firestore.mjs';
import { crearDocumentoValidado, validarDocumento, ErrorModelo } from '../firebase/modelo_pediatrico.mjs';
import { crearFixtures } from './fixtures_firestore.mjs';

const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!host || !/^(127\.0\.0\.1|localhost):[1-9][0-9]{0,4}$/.test(host)) {
  throw new Error('Estas pruebas requieren FIRESTORE_EMULATOR_HOST local. No se conectan a Firebase remoto.');
}
const projectId = `demo-pediatria-test-${process.pid}`;
const [hostname, port] = host.split(':');
const { filas, ids } = crearFixtures();
let entorno, conexion;
setLogLevel('silent');

before(async () => {
  entorno = await initializeTestEnvironment({ projectId, firestore: { host: hostname, port: Number(port),
    rules: await readFile(new URL('../firebase/firestore.rules', import.meta.url), 'utf8') } });
  await entorno.clearFirestore();
  conexion = conectarFirestore(projectId);
});
after(async () => {
  if (entorno) await entorno.clearFirestore();
  if (conexion) await conexion.cerrar();
  if (entorno) await entorno.cleanup();
});

test('inicializacion concurrente crea una configuracion y cuatro roles sin cuentas clinicas', async () => {
  const resultados = await Promise.all([inicializarFirestore(conexion.firestore), inicializarFirestore(conexion.firestore)]);
  assert.equal(resultados.reduce((n, r) => n + r.documentos_creados, 0), 5);
  const colecciones = await conexion.firestore.listCollections();
  assert.deepEqual(colecciones.map((c) => c.id).sort(), ['configuracion', 'roles']);
  assert.equal((await conexion.firestore.collection('roles').get()).size, 4);
  assert.equal((await conexion.firestore.collection('pacientes').get()).size, 0);
  assert.equal((await conexion.firestore.collection('usuarios').get()).size, 0);
});

test('reejecucion preserva permisos administrados y no recrea documentos', async () => {
  const ref = conexion.firestore.doc(`roles/${rolesIniciales[0].id}`);
  await ref.update({ permisos: ['auditoria.leer'], revision: 2 });
  const resultado = await inicializarFirestore(conexion.firestore);
  assert.equal(resultado.documentos_creados, 0);
  assert.deepEqual((await ref.get()).data().permisos, ['auditoria.leer']);
});

test('manifiesto incompatible no se sobrescribe ni completa roles faltantes', async () => {
  const ref = conexion.firestore.doc('configuracion/modelo');
  const original = (await ref.get()).data();
  const rol = conexion.firestore.doc(`roles/${rolesIniciales[3].id}`);
  const datosRol = (await rol.get()).data();
  await ref.update({ hash_modelo: 'f'.repeat(64) });
  await rol.delete();
  await assert.rejects(() => inicializarFirestore(conexion.firestore), (e) => e.codigo === 'MODELO_INCOMPATIBLE_REQUIERE_MIGRACION');
  assert.equal((await ref.get()).data().hash_modelo, 'f'.repeat(64));
  assert.equal((await rol.get()).exists, false);
  await ref.set(original); await rol.create(datosRol);
});

test('CLI aplicar ejecuta sobre emulador y conserva la inicializacion', async () => {
  const { stdout } = await promisify(execFile)(process.execPath, [fileURLToPath(new URL('../centro_pediatrico_firestore.mjs', import.meta.url)),
    '--aplicar', '--project', projectId], { env: { ...process.env, FIRESTORE_EMULATOR_HOST: host }, timeout: 30000 });
  const resultado = JSON.parse(stdout.split('\n')[0]);
  assert.equal(resultado.documentos_creados, 0);
  assert.equal(resultado.proyecto, projectId);
});

test('manifiesto con rutas alteradas exige migracion aunque conserve huella', async () => {
  const ref = conexion.firestore.doc('configuracion/modelo');
  const original = (await ref.get()).data();
  await ref.update({ rutas: ['pacientes/{pacienteId}'] });
  await assert.rejects(() => inicializarFirestore(conexion.firestore), (e) => e.codigo === 'MODELO_INCOMPATIBLE_REQUIERE_MIGRACION');
  await ref.set(original);
});

for (let i = 0; i < filas.length; i += 1) {
  const [ruta, datos] = filas[i];
  test(`persistencia y lectura validadas de ruta ${i + 1}`, async () => {
    if (ruta === 'configuracion/modelo') {
      assert.ok(validarDocumento(ruta, (await conexion.firestore.doc(ruta).get()).data()));
      return;
    }
    await crearDocumentoValidado(conexion.firestore, ruta, datos);
    const persistido = await conexion.firestore.doc(ruta).get();
    assert.ok(persistido.exists);
    assert.ok(validarDocumento(ruta, persistido.data()));
  });
}

for (let i = 0; i < filas.length; i += 1) {
  const [ruta, datos] = filas[i];
  test(`cliente anonimo sin lectura de ruta ${i + 1}`, async () => {
    await assertFails(getDoc(doc(entorno.unauthenticatedContext().firestore(), ruta)));
  });
  test(`cliente autenticado sin lectura directa de ruta ${i + 1}`, async () => {
    const cliente = entorno.authenticatedContext('USUARIO-SINTETICO', { institucion_id: 'CENTRO_MEDICO_PEDIATRICO', rol: 'ADMINISTRADOR' }).firestore();
    await assertFails(getDoc(doc(cliente, ruta)));
  });
  test(`cliente autenticado sin escritura directa de ruta ${i + 1}`, async () => {
    await assertFails(setDoc(doc(entorno.authenticatedContext('USUARIO-SINTETICO').firestore(), ruta), datos));
  });
}

test('cliente tampoco puede listar pacientes ni borrar expediente', async () => {
  const cliente = entorno.authenticatedContext('USUARIO-SINTETICO').firestore();
  await assertFails(getDocs(collection(cliente, 'pacientes')));
  await assertFails(deleteDoc(doc(cliente, `pacientes/${ids.paciente}`)));
});

test('create atomico impide duplicar ID determinista de aplicacion', async () => {
  const [ruta, datos] = filas.find(([r]) => r === `aplicaciones_vacuna/${ids.aplicacion}`);
  await conexion.firestore.doc(ruta).delete();
  const resultados = await Promise.allSettled([crearDocumentoValidado(conexion.firestore, ruta, datos), crearDocumentoValidado(conexion.firestore, ruta, datos)]);
  assert.equal(resultados.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(resultados.filter((r) => r.status === 'rejected' && r.reason.code === 6).length, 1);
});

test('transaccion revierte padre y vinculo ante error de validacion', async () => {
  const paciente = randomUUID();
  const ref = conexion.firestore.doc(`pacientes/${paciente}`);
  const vinculo = ref.collection('responsables').doc(ids.responsable);
  await assert.rejects(() => conexion.firestore.runTransaction(async (tx) => {
    tx.create(ref, validarDocumento(ref.path, filas[0][1]));
    const datos = { ...filas[2][1], es_principal: 'INVALIDO' };
    tx.create(vinculo, validarDocumento(vinculo.path, datos));
  }), ErrorModelo);
  assert.equal((await ref.get()).exists, false);
  assert.equal((await vinculo.get()).exists, false);
});

test('Admin SDK omite reglas y necesita el validador del servidor', async () => {
  const ruta = `pacientes/${randomUUID()}`;
  await conexion.firestore.doc(ruta).create({ campo_invalido: 'SINTETICO' });
  const datos = (await conexion.firestore.doc(ruta).get()).data();
  assert.throws(() => validarDocumento(ruta, datos), ErrorModelo);
  await conexion.firestore.doc(ruta).delete();
});

test('una base con datos sin manifiesto se rechaza sin cambios', async () => {
  const ref = conexion.firestore.doc('configuracion/modelo');
  const original = (await ref.get()).data();
  await ref.delete();
  await assert.rejects(() => inicializarFirestore(conexion.firestore), (e) => e.codigo === 'BASE_EXISTENTE_SIN_MODELO');
  assert.equal((await ref.get()).exists, false);
  await ref.create(original);
});

test('configuracion declarativa contiene huella e indices previstos', async () => {
  const plan = await obtenerPlan();
  assert.equal((await conexion.firestore.doc('configuracion/modelo').get()).data().hash_modelo, plan.hash_modelo);
  assert.equal(plan.indices_compuestos, 12);
  const indices = JSON.parse(await readFile(new URL('../firebase/firestore.indexes.json',import.meta.url),'utf8'));
  assert.ok(indices.indexes.some(i=>i.collectionGroup === 'citas' && i.fields.map(f=>`${f.fieldPath}:${f.order}`).join(',') === 'pediatra_id:ASCENDING,fecha_hora:DESCENDING'));
  assert.ok(indices.indexes.some(i=>i.collectionGroup === 'consultas' && i.fields.map(f=>f.fieldPath).join(',') === 'cita_id,estado'));
});
