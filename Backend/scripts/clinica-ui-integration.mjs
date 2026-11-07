import { validarDocumento } from '../dist-test/src/adaptadores/salida/firestore/validador-firestore.js';
import { crearVacunasFirestore } from '../dist-test/src/adaptadores/salida/firestore/pediatria/vacunas-firestore.js';
import { prepararAntecedentesPediatricos } from '../../Database/migrations/009_antecedentes_pediatricos.mjs';
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

import { recorrerClinica } from '../../Frontend/scripts/clinica-e2e.mjs';
import { migrarClinicaMongodb } from '../../Database/migrations/005_clinica_mongodb.mjs';
import { migrarLaboratorioMongodb } from '../../Database/migrations/011_laboratorio_mongodb.mjs';
import { migrarResultadosLaboratorioMongodb } from '../../Database/migrations/012_resultados_laboratorio_mongodb.mjs';
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
async function iniciarBackendAislado() {
  const child=spawn(process.execPath,['dist-test/src/main.js'],{cwd:new URL('..',import.meta.url),env:runtime,stdio:['ignore','ignore','pipe']});
  let errorOutput='';child.stderr.on('data',data=>{errorOutput=(errorOutput+data.toString()).slice(-12000);});
  const exit=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
  child.on('error',error=>{errorOutput+=error.message;});
  let listo=false;
  try {
  for(let i=0;i<200;i++){
    if(child.exitCode!==null||child.signalCode)throw new Error(`Backend aislado terminó antes de escuchar: ${errorOutput}`);
    try{if((await fetch(`http://127.0.0.1:${runtime.PORT}/api/v1/health/live`)).ok){listo=true;break;}}catch{/* arranque aislado */}
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  assert.ok(listo,`Backend aislado no inició: ${errorOutput}`);
  } catch(error) {
    if(child.exitCode===null&&!child.signalCode) child.kill('SIGKILL');
    throw error;
  }
  return {close:async()=>{child.kill('SIGTERM');const result=await exit;assert.ok(result.code===0||result.signal==='SIGTERM',`Cierre backend aislado falló: ${errorOutput}`);}};
}

async function puerto() { const server = createServer(); await new Promise((ok, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', ok); }); const p = server.address().port; await new Promise((ok) => server.close(ok)); return p; }
const instituciones = ['HOSPITAL_GENERAL', 'CLINICA_ODONTOLOGICA', 'LABORATORIO_CLINICO', 'CENTRO_MEDICO_PEDIATRICO'];
const cuentas = [];
async function crearCuenta(institucion, secretaria = false) {
  const uid = randomUUID(), id = randomUUID(), rolId = randomUUID();
  const email = `ui-${uid}@example.test`, password = `Sintetica-${randomBytes(12).toString('hex')}`;
  await auth.createUser({ uid, email, password, emailVerified: true });
  await auth.setCustomUserClaims(uid, { institucion });
  const profesionalId = randomUUID();
  let perfilesAnaliticos;
  const rol = ({HOSPITAL_GENERAL:'MEDICO', CLINICA_ODONTOLOGICA:'ODONTOLOGO', LABORATORIO_CLINICO:'MEDICO_LABORATORIO', CENTRO_MEDICO_PEDIATRICO:'PEDIATRA'})[institucion];
  const permisos = ['pacientes.administrar','historial.leer','historial.archivar','consultas.registrar','diagnosticos.registrar','tratamientos.registrar','recetas.emitir', ...(institucion === 'LABORATORIO_CLINICO' ? [] : ['citas.administrar'])];
  if (institucion === 'HOSPITAL_GENERAL' || institucion === 'CLINICA_ODONTOLOGICA') {
    const esPg = institucion === 'HOSPITAL_GENERAL', pool = esPg ? pg : mysql;
    if (secretaria && !esPg) {
      const permisosSec = ['pacientes.administrar', 'citas.administrar'];
      await pool.consultar("INSERT INTO rol(nombre,permisos) VALUES('SECRETARIA',?) ON DUPLICATE KEY UPDATE permisos=VALUES(permisos)", [JSON.stringify(permisosSec)]);
      await pool.consultar("INSERT INTO secretaria(id_publico,nombres,apellidos,telefono) VALUES(?,'Laura','Secretaría Sintética','55551234')", [profesionalId]);
      await pool.consultar("INSERT INTO usuario(id_publico,id_secretaria,nombre_usuario,auth_uid,estado) VALUES(?,(SELECT id_secretaria FROM secretaria WHERE id_publico=?),?,?,'ACTIVO')", [id, profesionalId, uid, uid]);
      await pool.consultar("INSERT INTO usuario_rol(id_usuario,id_rol) SELECT u.id_usuario,r.id_rol FROM usuario u CROSS JOIN rol r WHERE u.auth_uid=? AND r.nombre='SECRETARIA'", [uid]);
      return { institucion, email, password, secretaria, profesionalId };
    }
    await pool.consultar(esPg ? 'INSERT INTO rol(nombre,permisos) VALUES($1,$2::jsonb)' : 'INSERT INTO rol(nombre,permisos) VALUES(?,?)', [rol, JSON.stringify(permisos)]);
    await pool.consultar(esPg ? "INSERT INTO usuario(id_publico,nombre_usuario,auth_uid,estado) VALUES($1,$2,$3,'ACTIVO')" : "INSERT INTO usuario(id_publico,nombre_usuario,auth_uid,estado) VALUES(?,?,?,'ACTIVO')", [id, uid, uid]);
    if(esPg) await pool.consultar("INSERT INTO personal_medico(id_publico,primer_nombre,primer_apellido,numero_colegiado,entidad_colegiacion,estado) VALUES($1,'Ana','Sintética',$2,'Colegio sintético','ACTIVO')", [profesionalId, profesionalId]);
    else await pool.consultar("INSERT INTO odontologo(id_publico,nombres,apellidos,colegiado,entidad_colegiacion) VALUES(?,'Ana','Sintética',?,'Colegio sintético')",[profesionalId,profesionalId]);
    await pool.consultar(esPg ? 'UPDATE usuario SET id_personal=(SELECT id_personal FROM personal_medico WHERE id_publico=$1) WHERE auth_uid=$2' : 'UPDATE usuario SET id_odontologo=(SELECT id_odontologo FROM odontologo WHERE id_publico=?) WHERE auth_uid=?', [profesionalId,uid]);
    await pool.consultar(esPg ? 'INSERT INTO usuario_rol(id_usuario,id_rol) SELECT u.id_usuario,r.id_rol FROM usuario u CROSS JOIN rol r WHERE u.auth_uid=$1 AND r.nombre=$2' : 'INSERT INTO usuario_rol(id_usuario,id_rol) SELECT u.id_usuario,r.id_rol FROM usuario u CROSS JOIN rol r WHERE u.auth_uid=? AND r.nombre=?', [uid, rol]);
  } else if (institucion === 'LABORATORIO_CLINICO') {
    const db = mongo.db('laboratorio_clinico');
    const rolesLaboratorio = [
      { _id: rolId, revision: 1, nombre: 'ADMIN_INSTITUCIONAL', permisos: ['pacientes.administrar','historial.leer','historial.archivar','consultas.registrar','diagnosticos.registrar','tratamientos.registrar','recetas.emitir','ordenes.administrar','muestras.administrar'] },
      { _id: randomUUID(), revision: 1, nombre: 'ANALISTA_LABORATORIO', permisos: ['resultados.analizar'] },
      { _id: randomUUID(), revision: 1, nombre: 'VALIDADOR_LABORATORIO', permisos: ['resultados.validar'] },
    ];
    await db.collection('roles').insertMany(rolesLaboratorio);
    await db.collection('solicitantes').insertOne({_id:profesionalId,revision:1,nombre_completo:'Ana Sintética',tipo:'MEDICO',activo:true,numero_colegiado:profesionalId,entidad_colegiacion:'Colegio sintético'});
    await db.collection('usuarios').insertOne({ _id: id, revision: 1, auth_uid: uid, proveedor_identidad: 'FIREBASE', institucion_id: institucion, rol_ids: [rolId], solicitante_medico_id:profesionalId, estado: 'ACTIVO', activo: true, nombre_usuario: uid });
    perfilesAnaliticos = {};
    for (const [perfil, rolAnalitico] of [['analista',rolesLaboratorio[1]],['validador',rolesLaboratorio[2]]]) {
      const uidAnalitico=randomUUID(), idAnalitico=randomUUID();
      const correo=`ui-${uidAnalitico}@example.test`, clave=`Sintetica-${randomBytes(12).toString('hex')}`;
      await auth.createUser({uid:uidAnalitico,email:correo,password:clave,emailVerified:true});
      await auth.setCustomUserClaims(uidAnalitico,{institucion});
      await db.collection('usuarios').insertOne({_id:idAnalitico,revision:1,auth_uid:uidAnalitico,proveedor_identidad:'FIREBASE',institucion_id:institucion,rol_ids:[rolAnalitico._id],estado:'ACTIVO',activo:true,nombre_usuario:uidAnalitico});
      perfilesAnaliticos[perfil]={email:correo,password:clave,id:idAnalitico};
    }
  } else {
    await firestore.doc(`pediatras/${profesionalId}`).set({revision:1,nombres:'Ana',apellidos:'Sintética',colegiado:profesionalId,entidad_colegiacion:'Colegio sintético',especialidad:'Pediatría',estado:'ACTIVO'});
    await firestore.doc(`roles/${rolId}`).set({ revision: 1, nombre: rol, permisos });
    await firestore.doc(`usuarios/${id}`).set({ revision: 1, auth_uid: uid, proveedor_identidad: 'FIREBASE', institucion_id: institucion, rol_ids: [rolId], pediatra_id:profesionalId, estado: 'ACTIVO', nombre_usuario: uid });
  }
  return { institucion, email, password, secretaria, profesionalId, perfilesAnaliticos };
}
try {
  await mongo.connect();
  await prepararHistorialMongodb(mongo.db('laboratorio_clinico')); await migrarClinicaMongodb(mongo.db('laboratorio_clinico'));
  await migrarLaboratorioMongodb(mongo.db('laboratorio_clinico'),{escritoresDetenidos:true});
  await migrarResultadosLaboratorioMongodb(mongo.db('laboratorio_clinico'),{escritoresDetenidos:true});
  await inicializarFirestore(firestore); await prepararHistorialFirestore(firestore); await prepararClinicaFirestore(firestore); await prepararAntecedentesPediatricos(firestore);
  for (const institucion of instituciones) cuentas.push(await crearCuenta(institucion));
  const pediCuenta=cuentas.find(c=>c.institucion==='CENTRO_MEDICO_PEDIATRICO');
  const vacunaId=randomUUID(),versionId=randomUUID(),dosisId=randomUUID();
  await firestore.doc(`vacunas/${vacunaId}`).set(validarDocumento(`vacunas/${vacunaId}`,{revision:1,nombre:'Vacuna E2E sintética',enfermedad_objetivo:'Objetivo de ensayo',fabricante:'Fabricante sintético',version_vigente:versionId}));
  await firestore.doc(`vacunas/${vacunaId}/versiones/${versionId}`).set(validarDocumento(`vacunas/${vacunaId}/versiones/${versionId}`,{revision:1,version:1,nombre:'Vacuna E2E sintética',enfermedad_objetivo:'Objetivo de ensayo',fabricante:'Fabricante sintético',fecha_creacion:new Date('2026-01-01T00:00:00Z'),dosis:[{dosis_id:dosisId,numero:1,edad_recomendada_meses:0}]}));
  pediCuenta.vacuna={vacunaId,versionId,dosisId};
  try {await crearVacunasFirestore(firestore).obtenerCatalogo();}catch(error){console.log('VACUNAS_FIXTURE_ERROR',error);throw error;}
  // Cuenta sintética con ambos roles para recorrer administración y acto clínico.
  const todosUsuarios=await firestore.collection('usuarios').get();
  const usuarioEnsayo=todosUsuarios.docs.find(d=>d.data().pediatra_id===pediCuenta.profesionalId);
  const rolAdmin=randomUUID();await firestore.doc(`roles/${rolAdmin}`).set({revision:1,nombre:'ADMIN_INSTITUCIONAL',permisos:['usuarios.administrar']});
  await usuarioEnsayo.ref.update({rol_ids:[...usuarioEnsayo.data().rol_ids,rolAdmin]});
  const hospitalCuenta = cuentas.find(c => c.institucion === 'HOSPITAL_GENERAL');
  const habitacion = await pg.consultar(`INSERT INTO habitacion(numero,piso,tipo) VALUES($1,'1','Medicina General') RETURNING id_habitacion`, [`UI-${randomUUID().slice(0,8)}`]);
  const camas = await pg.consultar(`INSERT INTO cama(id_habitacion,numero_cama) VALUES($1,'UI-A'),($1,'UI-B') RETURNING id_publico`, [habitacion.filas[0].id_habitacion]);
  hospitalCuenta.hospitalCamas = camas.filas.map(c => c.id_publico);
  const secretariaDental = await crearCuenta('CLINICA_ODONTOLOGICA', true);
  const cuentaDental = cuentas.find((c) => c.institucion === 'CLINICA_ODONTOLOGICA');
  if (cuentaDental) cuentaDental.secretariaCuenta = secretariaDental;

  const port = await puerto();
  runtime = { ...process.env, APP_ENV: 'test', HOST: '127.0.0.1', PORT: String(port), INSTITUTIONS: instituciones.join(','),
    POSTGRES_HOST: '127.0.0.1', POSTGRES_PORT: process.env.PG_TEST_PORT, POSTGRES_PASSWORD_FILE: process.env.PG_TEST_SECRET_FILE,
    MYSQL_HOST: '127.0.0.1', MYSQL_PORT: process.env.MYSQL_TEST_PORT, MYSQL_PASSWORD_FILE: process.env.MYSQL_TEST_SECRET_FILE,
    MONGO_HOST: '127.0.0.1', MONGO_PORT: process.env.MONGO_TEST_PORT, MONGO_APP_PASSWORD_FILE: process.env.MONGO_TEST_SECRET_FILE, MONGO_DIRECT_CONNECTION: 'true',
    FIRESTORE_PROJECT_ID: process.env.GCLOUD_PROJECT, FIREBASE_AUTH_PROJECT_ID: process.env.GCLOUD_PROJECT, CURSOR_SIGNING_SECRET: randomBytes(32).toString('hex'),
  };
  app = await iniciarBackendAislado();
  if(process.env.CLINICA_UI_SMOKE_REINICIOS==='1') {
    const tokenResponse=await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-smoke`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:pediCuenta.email,password:pediCuenta.password,returnSecureToken:true})});
    assert.equal(tokenResponse.status,200);const {idToken}=await tokenResponse.json();
    const headers={authorization:`Bearer ${idToken}`,'content-type':'application/json','Idempotency-Key':randomUUID()};
    const base=`http://127.0.0.1:${runtime.PORT}/api/v1`;
    const alta=await fetch(`${base}/pacientes`,{method:'POST',headers,body:JSON.stringify({nombres:'Menor',apellidos:'Smoke sintético',fecha_nacimiento:'2020-02-29',sexo:'MASCULINO',responsables:[{nombres:'Madre',apellidos:'Smoke sintética',telefono:'55555555',parentesco:'MADRE',es_principal:true,autoriza_atencion:true,documento:{tipo:'CUI',numero:'1234567890101'}}]})});assert.equal(alta.status,201,await alta.clone().text());const {data:menor}=await alta.json();
    for(let i=0;i<2;i++){
      await Promise.all(Array.from({length:4},()=>['/vacunas',`/pacientes/${menor.id}/esquemas`,`/pacientes/${menor.id}`].map(async path=>{const response=await fetch(`${base}${path}`,{headers});assert.equal(response.status,200,await response.text());})).flat());
      await app.close();app=await iniciarBackendAislado();
    }
    console.log('PASS backend en proceso separado: consultas HTTP Firestore concurrentes y dos reinicios completos.');
  } else {
  const frontPort = await puerto();
  vite = spawn(process.execPath, ['../Frontend/node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(frontPort), '--strictPort'], { cwd: new URL('../../Frontend', import.meta.url), env: { ...process.env, VITE_SERVICE_MODE: 'api', VITE_BACKEND_TARGET: `http://127.0.0.1:${port}`, VITE_FIREBASE_AUTH_EMULATOR_URL: `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}` }, stdio: 'ignore' });
  const url = `http://127.0.0.1:${frontPort}`;
  for (let i = 0; i < 100; i++) { try { if ((await fetch(url)).ok) break; } catch { /* arranque local */ } await new Promise((r) => setTimeout(r, 100)); }
  assert.equal((await fetch(url)).status, 200);
  const navegadorInstalado=process.env.PLAYWRIGHT_CHANNEL ?? (process.platform==='win32' ? 'msedge' : undefined);
  browser = await chromium.launch({ headless: true, ...(navegadorInstalado ? { channel: navegadorInstalado } : {}) });
  const cuentasRecorrido=process.env.CLINICA_UI_SOLO_PEDIATRIA==='1'
    ? cuentas.filter(c=>c.institucion==='CENTRO_MEDICO_PEDIATRICO')
    : process.env.CLINICA_UI_SOLO_LABORATORIO==='1'
      ? cuentas.filter(c=>c.institucion==='LABORATORIO_CLINICO')
      : cuentas;
  const resultados = await recorrerClinica({browser,url,cuentas:cuentasRecorrido, reiniciarBackend: async () => {await Promise.all(browser.contexts().flatMap(context=>context.pages().map(page=>page.waitForLoadState('networkidle'))));await app.close(); app = await iniciarBackendAislado();}});
  console.log(JSON.stringify(resultados));
  if(process.env.CLINICA_UI_EVIDENCE) await writeFile(process.env.CLINICA_UI_EVIDENCE, JSON.stringify(resultados,null,2));
  }
} finally {
  await browser?.close();
  if (vite) { vite.kill('SIGTERM'); await new Promise((ok) => vite.once('exit', ok)); }
  await app?.close(); await pg.cerrar(); await mysql.cerrar(); await mongo.close(); await firestore.terminate(); await deleteApp(firebase);
}
