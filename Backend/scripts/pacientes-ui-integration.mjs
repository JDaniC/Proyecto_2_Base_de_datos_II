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
import { recorrerPacientes } from '../../Frontend/scripts/patients-e2e.mjs';

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
  const rol = secretaria ? 'SECRETARIA' : 'ADMIN_INSTITUCIONAL';
  const permisos = secretaria ? ['pacientes.administrar'] : ['pacientes.administrar', 'historial.leer'];
  if (institucion === 'HOSPITAL_GENERAL' || institucion === 'CLINICA_ODONTOLOGICA') {
    const esPg = institucion === 'HOSPITAL_GENERAL', pool = esPg ? pg : mysql;
    await pool.consultar(esPg ? 'INSERT INTO rol(nombre,permisos) VALUES($1,$2::jsonb)' : 'INSERT INTO rol(nombre,permisos) VALUES(?,?)', [rol, JSON.stringify(permisos)]);
    await pool.consultar(esPg ? "INSERT INTO usuario(id_publico,nombre_usuario,auth_uid,estado) VALUES($1,$2,$3,'ACTIVO')" : "INSERT INTO usuario(id_publico,nombre_usuario,auth_uid,estado) VALUES(?,?,?,'ACTIVO')", [id, uid, uid]);
    await pool.consultar(esPg ? 'INSERT INTO usuario_rol(id_usuario,id_rol) SELECT u.id_usuario,r.id_rol FROM usuario u CROSS JOIN rol r WHERE u.auth_uid=$1 AND r.nombre=$2' : 'INSERT INTO usuario_rol(id_usuario,id_rol) SELECT u.id_usuario,r.id_rol FROM usuario u CROSS JOIN rol r WHERE u.auth_uid=? AND r.nombre=?', [uid, rol]);
  } else if (institucion === 'LABORATORIO_CLINICO') {
    const db = mongo.db('laboratorio_clinico');
    await db.collection('roles').insertOne({ _id: rolId, revision: 1, nombre: rol, permisos });
    await db.collection('usuarios').insertOne({ _id: id, revision: 1, auth_uid: uid, proveedor_identidad: 'FIREBASE', institucion_id: institucion, rol_ids: [rolId], estado: 'ACTIVO', activo: true, nombre_usuario: uid });
  } else {
    await firestore.doc(`roles/${rolId}`).set({ revision: 1, nombre: rol, permisos });
    await firestore.doc(`usuarios/${id}`).set({ revision: 1, auth_uid: uid, proveedor_identidad: 'FIREBASE', institucion_id: institucion, rol_ids: [rolId], estado: 'ACTIVO', nombre_usuario: uid });
  }
  return { institucion, email, password, secretaria };
}
try {
  await mongo.connect();
  await prepararHistorialMongodb(mongo.db('laboratorio_clinico')); await prepararHistorialFirestore(firestore);
  for (const institucion of instituciones) cuentas.push(await crearCuenta(institucion));
  cuentas.push(await crearCuenta('HOSPITAL_GENERAL', true));
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
  const resultados = await recorrerPacientes({ browser, url, cuentas,
    reiniciarBackend: async () => { await app.close(); app = await iniciarServidor(runtime); },
    sembrarEventos: async (institucion, pacienteId) => {
      // Fixture del índice de lectura: no acredita escritores clínicos de E03–E05.
      for (let i = 0; i < 21; i++) {
        const e = { id: randomUUID(), tipo: 'CONSULTA', fechaHora: `2026-01-${String(i + 1).padStart(2, '0')}T12:00:00.000000000Z`, recursoId: randomUUID(), versionConsulta: 1, titulo: `Evento sintético ${String(i + 1).padStart(2, '0')}` };
        if (institucion === 'HOSPITAL_GENERAL') await pg.consultar('INSERT INTO hospital_historial.eventos(id,paciente_id,tipo,fecha_hora,contenido) VALUES($1,$2,$3,$4,$5::jsonb)', [e.id, pacienteId, e.tipo, e.fechaHora, JSON.stringify(e)]);
        else if (institucion === 'CLINICA_ODONTOLOGICA') await mysql.consultar('INSERT INTO clinica_historial.eventos(id,paciente_id,tipo,fecha_hora,contenido) VALUES(?,?,?,?,?)', [e.id, pacienteId, e.tipo, e.fechaHora, JSON.stringify(e)]);
        else if (institucion === 'LABORATORIO_CLINICO') await mongo.db('laboratorio_clinico').collection('historial_eventos').insertOne({ _id: e.id, paciente_id: pacienteId, tipo: e.tipo, fecha_hora: e.fechaHora, contenido: e });
        else await firestore.doc(`historial_eventos/${e.id}`).create({ id: e.id, paciente_id: pacienteId, tipo: e.tipo, fecha_hora: e.fechaHora, contenido: e });
      }
    },
  });
  // Solo resultados saneados; nunca credenciales, tokens, respuestas clínicas ni trazas HAR.
  if (process.env.PATIENTS_UI_RESULTS) await writeFile(process.env.PATIENTS_UI_RESULTS, JSON.stringify(resultados, null, 2));
  console.log(JSON.stringify(resultados));
} finally {
  await browser?.close();
  if (vite) { vite.kill('SIGTERM'); await new Promise((ok) => vite.once('exit', ok)); }
  await app?.close(); await pg.cerrar(); await mysql.cerrar(); await mongo.close(); await firestore.terminate(); await deleteApp(firebase);
}
