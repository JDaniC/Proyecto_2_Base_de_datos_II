import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {MongoClient} from 'mongodb';
import {initializeApp, deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {prepararHistorialMongodb, prepararHistorialFirestore} from '../../Database/migrations/004_historial_documental.mjs';
assert.match(process.env.HISTORIAL_ISOLATED ?? '', /^bdii-ca07-[a-f0-9]{10}$/);
assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? '', /^127\.0\.0\.1:\d+$/);
assert.match(process.env.GCLOUD_PROJECT ?? '', /^demo-/);
const mongo = new MongoClient(`mongodb://127.0.0.1:${process.env.MONGO_TEST_PORT}/?directConnection=true`, {auth: {username: 'mongo_admin', password: (await readFile(process.env.MONGO_ADMIN_TEST_SECRET_FILE,'utf8')).trim()}, authSource:'admin'});
const app = initializeApp({projectId: process.env.GCLOUD_PROJECT}, 'ca07-migraciones');
const firestore = getFirestore(app);
try {
  const db = mongo.db('laboratorio_clinico');
  await prepararHistorialMongodb(db); await prepararHistorialFirestore(firestore);
  execFileSync(process.execPath, ['--test', 'dist-test/tests/integracion/historial.test.js'], {stdio:'inherit',env:process.env});
  const antesMongo = await db.collection('historial_eventos').find({}).sort({_id:1}).toArray();
  const antesFirestore = (await firestore.collection('historial_eventos').orderBy('id').get()).docs.map((d)=>d.data());
  await prepararHistorialMongodb(db); await prepararHistorialFirestore(firestore);
  assert.deepEqual(await db.collection('historial_eventos').find({}).sort({_id:1}).toArray(), antesMongo);
  assert.deepEqual((await firestore.collection('historial_eventos').orderBy('id').get()).docs.map((d)=>d.data()), antesFirestore);
  // Base anterior con clínica: conservar originales y exigir reconciliación, también tras reintento.
  const legado = mongo.db(process.env.HISTORIAL_ISOLATED.replaceAll('-','_'));
  await legado.collection('consultas_clinicas').insertOne({_id:'original-sintetico',fecha_hora:new Date('2020-01-01')});
  await prepararHistorialMongodb(legado); await prepararHistorialMongodb(legado);
  assert.equal((await legado.collection('historial_modelo').findOne({id:1})).estado,'RECONCILIAR');
  assert.equal(await legado.collection('consultas_clinicas').countDocuments(),1);
  await db.collection('historial_eventos').dropIndex('ix_historial_paciente_tipo_fecha');
  await prepararHistorialMongodb(db);
  assert.deepEqual(await db.collection('historial_eventos').find({}).sort({_id:1}).toArray(), antesMongo);
  const legacyApp=initializeApp({projectId:'demo-ca07-legacy-'+process.env.HISTORIAL_ISOLATED.slice(-10)}, 'ca07-legacy');
  const legacyFirestore=getFirestore(legacyApp);
  try {
    const original={revision:1,paciente_id:'00000000-0000-4000-8000-000000009001',fecha_hora:'2020-01-01T00:00:00Z'};
    await legacyFirestore.doc('consultas/original').set(original);
    await prepararHistorialFirestore(legacyFirestore); await prepararHistorialFirestore(legacyFirestore);
    assert.equal((await legacyFirestore.doc('historial_configuracion/modelo').get()).get('estado'),'RECONCILIAR');
    assert.deepEqual((await legacyFirestore.doc('consultas/original').get()).data(),original);
  } finally {await legacyFirestore.terminate();await deleteApp(legacyApp);}
  console.log('PASS migraciones documentales: reejecución sin pérdida, legado bloqueado, recuperación de índice MongoDB.');
} finally { await mongo.close(); await firestore.terminate(); await deleteApp(app); }
