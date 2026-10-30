import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { MongoClient } from 'mongodb';
import { prepararHistorialMongodb, prepararHistorialFirestore } from '../../Database/migrations/004_historial_documental.mjs';
import { crearPoolPostgresql } from '../dist-test/src/adaptadores/salida/postgresql/crear-pool-postgresql.js';
import { crearPoolMysql } from '../dist-test/src/adaptadores/salida/mysql/crear-pool-mysql.js';
import { iniciarServidor } from '../dist-test/src/main.js';
import { recorrerClinica } from '../../Frontend/scripts/clinica-e2e.mjs';
import { migrarClinicaMongodb } from '../../Database/migrations/005_clinica_mongodb.mjs';
import { prepararClinicaFirestore } from '../../Database/migrations/006_clinica_firestore.mjs';
import { inicializarFirestore } from '../../Database/centro_pediatrico_firestore.mjs';

assert.match(process.env.HISTORIAL_ISOLATED ?? '', /^bdii-ca07-[a-f0-9]{10}$/);
assert.match(process.env.GCLOUD_PROJECT ?? '', /^demo-bdii-ca07-[a-f0-9]{10}$/);
for (const name of ['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST']) assert.match(process.env[name] ?? '', /^127\.0\.0\.1:\d+$/);
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || '../../Frontend/node_modules/playwright');
const firebase = initializeApp({ projectId: process.env.GCLOUD_PROJECT }, 'ui-aislado');
const auth = getAuth(firebase), firestore = getFirestore(firebase);
const pg = await crearPoolPostgresql({ host: '127.0.0.1', puerto: Number(process.env.PG_TEST_PORT), baseDatos: 'hospital_general', usuario: 'hospital_app', archivoContrasena: process.env.PG_TEST_SECRET_FILE });
const mysql = await crearPoolMysql({ host: '127.0.0.1', puerto: Number(process.env.MYSQL_TEST_PORT), baseDatos: 'clinica_odontologica', usuario: 'clinica_app', archivoContrasena: process.env.MYSQL_TEST_SECRET_FILE });
const mongo = new MongoClient(`mongodb://127.0.0.1:${process.env.MONGO_TEST_PORT}/?directConnection=true`, { auth: { username: 'mongo_admin', password: (await readFile(process.env.MONGO_ADMIN_TEST_SECRET_FILE, 'utf8')).trim() }, authSource: 'admin' });
let app, vite, browser;
let runtime;
async function puerto() { const server = createServer(); await new Promise((ok, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', ok); }); const p = server.address().port; await new Promise((ok) => server.close(ok)); return p; }
const instituciones = ['HOSPITAL_GENERAL', 'CLINICA_ODONTOLOGICA', 'LABORATORIO_CLINICO', 'CENTRO_MEDICO_PEDIATRICO'];
const cuentas = [];
async function crearCuenta(institucion, secretaria = false) {
  const uid = randomUUID(), id = randomUUID(), rolId = randomUUID();
  const email = `ui-${uid}@example.test`, password = `Sintetica-${randomBytes(12).toString('hex')}`;
  await auth.createUser({ uid, email, password, emailVerified: true });
  await auth.setCustomUserClaims(uid, { institucion });
  const profesionalId = randomUUID();
  const rol = ({HOSPITAL_GENERAL:'MEDICO', CLINICA_ODONTOLOGICA:'ODONTOLOGO', LABORATORIO_CLINICO:'MEDICO_LABORATORIO', CENTRO_MEDICO_PEDIATRICO:'PEDIATRA'})[institucion];
  const permisos = ['pacientes.administrar','historial.leer','historial.archivar','consultas.registrar','diagnosticos.registrar','tratamientos.registrar','recetas.emitir', ...(institucion === 'LABORATORIO_CLINICO' ? [] : ['citas.administrar'])];
  if (institucion === 'HOSPITAL_GENERAL' || institucion === 'CLINICA_ODONTOLOGICA') {
    const esPg = institucion === 'HOSPITAL_GENERAL', pool = esPg ? pg : mysql;
    await pool.consultar(esPg ? 'INSERT INTO rol(nombre,permisos) VALUES($1,$2::jsonb)' : 'INSERT INTO rol(nombre,permisos) VALUES(?,?)', [rol, JSON.stringify(permisos)]);
    await pool.consultar(esPg ? "INSERT INTO usuario(id_publico,nombre_usuario,auth_uid,estado) VALUES($1,$2,$3,'ACTIVO')" : "INSERT INTO usuario(id_publico,nombre_usuario,auth_uid,estado) VALUES(?,?,?,'ACTIVO')", [id, uid, uid]);
    if(esPg) await pool.consultar("INSERT INTO personal_medico(id_publico,primer_nombre,primer_apellido,numero_colegiado,entidad_colegiacion,estado) VALUES($1,'Ana','Sintética',$2,'Colegio sintético','ACTIVO')", [profesionalId, profesionalId]);
    else await pool.consultar("INSERT INTO odontologo(id_publico,nombres,apellidos,colegiado,entidad_colegiacion) VALUES(?,'Ana','Sintética',?,'Colegio sintético')",[profesionalId,profesionalId]);
    await pool.consultar(esPg ? 'UPDATE usuario SET id_personal=(SELECT id_personal FROM personal_medico WHERE id_publico=$1) WHERE auth_uid=$2' : 'UPDATE usuario SET id_odontologo=(SELECT id_odontologo FROM odontologo WHERE id_publico=?) WHERE auth_uid=?', [profesionalId,uid]);
    await pool.consultar(esPg ? 'INSERT INTO usuario_rol(id_usuario,id_rol) SELECT u.id_usuario,r.id_rol FROM usuario u CROSS JOIN rol r WHERE u.auth_uid=$1 AND r.nombre=$2' : 'INSERT INTO usuario_rol(id_usuario,id_rol) SELECT u.id_usuario,r.id_rol FROM usuario u CROSS JOIN rol r WHERE u.auth_uid=? AND r.nombre=?', [uid, rol]);
  } else if (institucion === 'LABORATORIO_CLINICO') {
    const db = mongo.db('laboratorio_clinico');
    await db.collection('roles').insertOne({ _id: rolId, revision: 1, nombre: rol, permisos });
    await db.collection('solicitantes').insertOne({_id:profesionalId,revision:1,nombre_completo:'Ana Sintética',tipo:'MEDICO',activo:true,numero_colegiado:profesionalId,entidad_colegiacion:'Colegio sintético'});
    await db.collection('usuarios').insertOne({ _id: id, revision: 1, auth_uid: uid, proveedor_identidad: 'FIREBASE', institucion_id: institucion, rol_ids: [rolId], solicitante_medico_id:profesionalId, estado: 'ACTIVO', activo: true, nombre_usuario: uid });
  } else {
    await firestore.doc(`pediatras/${profesionalId}`).set({revision:1,nombres:'Ana',apellidos:'Sintética',colegiado:profesionalId,entidad_colegiacion:'Colegio sintético',especialidad:'Pediatría',estado:'ACTIVO'});
    await firestore.doc(`roles/${rolId}`).set({ revision: 1, nombre: rol, permisos });
    await firestore.doc(`usuarios/${id}`).set({ revision: 1, auth_uid: uid, proveedor_identidad: 'FIREBASE', institucion_id: institucion, rol_ids: [rolId], pediatra_id:profesionalId, estado: 'ACTIVO', nombre_usuario: uid });
  }
  return { institucion, email, password, secretaria, profesionalId };
}
try {
  await mongo.connect();
  await prepararHistorialMongodb(mongo.db('laboratorio_clinico')); await migrarClinicaMongodb(mongo.db('laboratorio_clinico')); await inicializarFirestore(firestore); await prepararHistorialFirestore(firestore); await prepararClinicaFirestore(firestore);
  for (const institucion of instituciones) cuentas.push(await crearCuenta(institucion));

  const port = await puerto();
  runtime = { ...process.env, APP_ENV: 'test', HOST: '127.0.0.1', PORT: String(port), INSTITUTIONS: instituciones.join(','),
    POSTGRES_HOST: '127.0.0.1', POSTGRES_PORT: process.env.PG_TEST_PORT, POSTGRES_PASSWORD_FILE: process.env.PG_TEST_SECRET_FILE,
    MYSQL_HOST: '127.0.0.1', MYSQL_PORT: process.env.MYSQL_TEST_PORT, MYSQL_PASSWORD_FILE: process.env.MYSQL_TEST_SECRET_FILE,
    MONGO_HOST: '127.0.0.1', MONGO_PORT: process.env.MONGO_TEST_PORT, MONGO_APP_PASSWORD_FILE: process.env.MONGO_TEST_SECRET_FILE, MONGO_DIRECT_CONNECTION: 'true',
    FIRESTORE_PROJECT_ID: process.env.GCLOUD_PROJECT, FIREBASE_AUTH_PROJECT_ID: process.env.GCLOUD_PROJECT, CURSOR_SIGNING_SECRET: randomBytes(32).toString('hex'),
  };
  app = await iniciarServidor(runtime);
  const frontPort = await puerto();
  vite = spawn(process.execPath, ['../Frontend/node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(frontPort), '--strictPort'], { cwd: new URL('../../Frontend', import.meta.url), env: { ...process.env, VITE_SERVICE_MODE: 'api', VITE_BACKEND_TARGET: `http://127.0.0.1:${port}`, VITE_FIREBASE_AUTH_EMULATOR_URL: `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}` }, stdio: 'ignore' });
  const url = `http://127.0.0.1:${frontPort}`;
  for (let i = 0; i < 100; i++) { try { if ((await fetch(url)).ok) break; } catch { /* arranque local */ } await new Promise((r) => setTimeout(r, 100)); }
  assert.equal((await fetch(url)).status, 200);
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  const resultados = await recorrerClinica({browser,url,cuentas, reiniciarBackend: async () => {await app.close(); app = await iniciarServidor(runtime);}});
  console.log(JSON.stringify(resultados));
  if(process.env.CLINICA_UI_EVIDENCE) await writeFile(process.env.CLINICA_UI_EVIDENCE, JSON.stringify(resultados,null,2));
} finally {
  await browser?.close();
  if (vite) { vite.kill('SIGTERM'); await new Promise((ok) => vite.once('exit', ok)); }
  await app?.close(); await pg.cerrar(); await mysql.cerrar(); await mongo.close(); await firestore.terminate(); await deleteApp(firebase);
}
