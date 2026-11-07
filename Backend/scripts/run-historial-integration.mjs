import {execFile as execFileCallback} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
const execFile=promisify(execFileCallback);
// Comparte únicamente la preparación aislada; cada recorrido conserva sus propias aserciones.
const clinicaUi = process.argv.includes('--clinica-ui');
const pacientesUi = process.argv.includes('--pacientes-ui') || clinicaUi;
const backend=resolve(fileURLToPath(new URL('..',import.meta.url))), root=resolve(backend,'..');
const proyecto=`bdii-ca07-${randomBytes(5).toString('hex')}`;
const temporal=await mkdtemp(join(tmpdir(),'bdii-ca07-')), secretos=join(temporal,'secrets');
async function puerto(){const s=createServer();await new Promise((ok,fail)=>{s.once('error',fail);s.listen(0,'127.0.0.1',ok);});const p=s.address().port;await new Promise((ok)=>s.close(ok));return String(p);}
const entorno={...process.env,DB_SECRETS_DIR:secretos,POSTGRES_PORT:await puerto(),MYSQL_PORT:await puerto(),MONGO_PORT:await puerto(),HISTORIAL_ISOLATED:proyecto};
const javaHome=[process.env.JAVA_HOME,'/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home','/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home','/Applications/DBeaver.app/Contents/Eclipse/jre/Contents/Home'].find((p)=>p&&existsSync(join(p,'bin/java')));
if(javaHome){entorno.JAVA_HOME=javaHome;entorno.PATH=`${join(javaHome,'bin')}:${entorno.PATH}`;}
const compose=['compose','-f',join(root,'compose.yaml'),'-p',proyecto];
async function run(cmd,args,options={}){
 try {const r=await execFile(cmd,args,{cwd:root,env:entorno,timeout:300000,maxBuffer:8*1024*1024,...options});return r.stdout+r.stderr;}
 catch(e){throw new Error(`${cmd}: ${String(e.stdout??'').slice(-3000)} ${String(e.stderr??'').slice(-3000)}`);}
}
async function migrarSql(){
 for(const [servicio,archivo] of [['postgres','004_historial_postgresql.sql'],['mysql','004_historial_mysql.sql']]){
  await run('docker',[...compose,'cp',join(root,'Database/migrations',archivo),`${servicio}:/tmp/historial.sql`]);
  await run('docker',[...compose,'exec','-T',servicio,'sh','-c',servicio==='postgres'?'psql -X -v ON_ERROR_STOP=1 -U postgres_admin -d hospital_general -f /tmp/historial.sql':'MYSQL_PWD="$(cat /run/secrets/mysql_root_password)" mysql -uroot < /tmp/historial.sql']);
 }
}
async function estadoSql(){
 const pg=await run('docker',[...compose,'exec','-T','postgres','psql','-X','-At','-U','postgres_admin','-d','hospital_general','-c',"SELECT count(*)::text||':'||md5(string_agg(contenido::text,'' ORDER BY id)) FROM hospital_historial.eventos"]);
 const my=await run('docker',[...compose,'exec','-T','mysql','sh','-c',`MYSQL_PWD="$(cat /run/secrets/mysql_root_password)" mysql -uroot -N -B -e "SELECT COUNT(*),SHA2(GROUP_CONCAT(CAST(contenido AS CHAR) ORDER BY id),256) FROM clinica_historial.eventos"`]);
 return {pg,my};
}
let errorPrincipal;
try{
 console.log('Preparando cuatro motores aislados:',proyecto);
 await run('python3',[join(root,'Database/docker/preparar.py'),'--secrets-dir',secretos]);
 // El arranque secuencial evita que tres inicializadores pesados compitan por E/S
 // y memoria en equipos de entrega con recursos limitados.
 for (const servicio of ['postgres','mysql','mongodb']) {
  await run('docker',[...compose,'up','-d','--build','--wait','--wait-timeout','240',servicio]);
 }
 await run('docker',[...compose,'run','--rm','--no-deps','mongo-init']);
 // Simula interrupciones antes de habilitar la extensión: PG revierte DDL, MySQL retoma DDL aditivo.
 const pgFallido=join(temporal,'historial-fallo.sql');
 await writeFile(pgFallido,(await readFile(join(root,'Database/migrations/004_historial_postgresql.sql'),'utf8')).replace('COMMIT;','SELECT 1/0;\nCOMMIT;'));
 await run('docker',[...compose,'cp',pgFallido,'postgres:/tmp/historial-fallo.sql']);
 let falloEsperado=false;
 try{await run('docker',[...compose,'exec','-T','postgres','psql','-X','-v','ON_ERROR_STOP=1','-U','postgres_admin','-d','hospital_general','-f','/tmp/historial-fallo.sql']);}catch{falloEsperado=true;}
 if(!falloEsperado)throw new Error('FALLO_PG_NO_INYECTADO');
 const esquema=await run('docker',[...compose,'exec','-T','postgres','psql','-X','-At','-U','postgres_admin','-d','hospital_general','-c',"SELECT to_regnamespace('hospital_historial')"]);
 if(esquema.trim())throw new Error('ROLLBACK_DDL_PG_INCOMPLETO');
 const myFallido=join(temporal,'historial-parcial.sql');
 await writeFile(myFallido,"CREATE DATABASE IF NOT EXISTS clinica_historial CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;\nSIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='FALLO_PRUEBA';");
 await run('docker',[...compose,'cp',myFallido,'mysql:/tmp/historial-parcial.sql']);
 falloEsperado=false;
 try{await run('docker',[...compose,'exec','-T','mysql','sh','-c','MYSQL_PWD="$(cat /run/secrets/mysql_root_password)" mysql -uroot < /tmp/historial-parcial.sql']);}catch{falloEsperado=true;}
 if(!falloEsperado)throw new Error('FALLO_MYSQL_NO_INYECTADO');
 await migrarSql();
 if(clinicaUi) for(const [servicio,archivo] of [['postgres','007_correcciones_postgresql.sql'],['mysql','007_correcciones_mysql.sql'],['postgres','008_servicios_hospital_postgresql.sql']]) {
  await run('docker',[...compose,'cp',join(root,'Database/migrations',archivo),`${servicio}:/tmp/clinica.sql`]);
  await run('docker',[...compose,'exec','-T',servicio,'sh','-c',servicio==='postgres'?'psql -X -v ON_ERROR_STOP=1 -U postgres_admin -d hospital_general -f /tmp/clinica.sql':'MYSQL_PWD="$(cat /run/secrets/mysql_root_password)" mysql -uroot < /tmp/clinica.sql']);
 }
 if(clinicaUi){
  const pg=sql=>run('docker',[...compose,'exec','-T','postgres','psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres_admin','-d','hospital_general','-c',sql]);
  // Un volumen existente con clínica común conserva datos; abortar la extensión revierte todo su DDL.
  const prueba=join(temporal,'servicios-fallo.sql');
  await writeFile(prueba,(await readFile(join(root,'Database/migrations/008_servicios_hospital_postgresql.sql'),'utf8')).replace('COMMIT;','SELECT 1/0;\nCOMMIT;'));
  await pg('CREATE DATABASE servicios_recuperacion TEMPLATE hospital_general');
  await run('docker',[...compose,'cp',prueba,'postgres:/tmp/servicios-fallo.sql']);
  // Base clonada: solo se retira la extensión vacía de este clon de prueba, nunca datos clínicos.
  await run('docker',[...compose,'exec','-T','postgres','psql','-X','-v','ON_ERROR_STOP=1','-U','postgres_admin','-d','servicios_recuperacion','-c','DROP SCHEMA hospital_servicios CASCADE']);
  let interrumpida=false;
  try{await run('docker',[...compose,'exec','-T','postgres','psql','-X','-v','ON_ERROR_STOP=1','-U','postgres_admin','-d','servicios_recuperacion','-f','/tmp/servicios-fallo.sql']);}catch{interrumpida=true;}
  if(!interrumpida)throw new Error('FALLO_SERVICIOS_NO_INYECTADO');
  const ausente=await run('docker',[...compose,'exec','-T','postgres','psql','-X','-At','-U','postgres_admin','-d','servicios_recuperacion','-c',"SELECT to_regnamespace('hospital_servicios')"]);
  if(ausente.trim())throw new Error('ROLLBACK_SERVICIOS_INCOMPLETO');
  await run('docker',[...compose,'cp',join(root,'Database/migrations/008_servicios_hospital_postgresql.sql'),'postgres:/tmp/servicios.sql']);
  for(let i=0;i<2;i++)await run('docker',[...compose,'exec','-T','postgres','psql','-X','-v','ON_ERROR_STOP=1','-U','postgres_admin','-d','servicios_recuperacion','-f','/tmp/servicios.sql']);
  const listo=await pg('SELECT estado FROM hospital_servicios.modelo');
  if(listo.trim()!=='LISTO')throw new Error('SERVICIOS_NUEVOS_NO_LISTOS');
  console.log('PASS migración 008: instalación, rollback DDL y recuperación reejecutable sobre clon aislado.');
 }
 console.log('PASS preparación SQL: rollback PostgreSQL y recuperación MySQL tras interrupción.');
 Object.assign(entorno,{PG_TEST_PORT:entorno.POSTGRES_PORT,PG_TEST_SECRET_FILE:join(secretos,'postgres_app_password'),MYSQL_TEST_PORT:entorno.MYSQL_PORT,MYSQL_TEST_SECRET_FILE:join(secretos,'mysql_app_password'),MONGO_TEST_PORT:entorno.MONGO_PORT,MONGO_TEST_SECRET_FILE:join(secretos,'mongo_app_password'),MONGO_ADMIN_TEST_SECRET_FILE:join(secretos,'mongo_admin_password')});
 await (process.platform==='win32'
  ? run(process.execPath,[join(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),'run','build:test'],{cwd:backend})
  : run('npm',['run','build:test'],{cwd:backend}));
 const conf=JSON.parse(await readFile(join(root,'Database/firebase/firebase.json'),'utf8'));
 const baseIndexes=JSON.parse(await readFile(join(root,'Database/firebase/firestore.indexes.json'),'utf8'));
 const extraIndexes=JSON.parse(await readFile(join(root,'Database/firebase/firestore.historial.indexes.json'),'utf8'));
 const indexesPath=join(temporal,'firestore.indexes.json');
 await writeFile(indexesPath,JSON.stringify({indexes:[...baseIndexes.indexes,...extraIndexes.indexes],fieldOverrides:[...baseIndexes.fieldOverrides,...extraIndexes.fieldOverrides]}));
 conf.firestore.rules=join(root,'Database/firebase/firestore.rules');conf.firestore.indexes=indexesPath;
 for(const n of ['auth','firestore','hub','logging'])if(conf.emulators[n])conf.emulators[n].port=Number(await puerto());
 const config=join(temporal,'firebase.json');await writeFile(config,JSON.stringify(conf));
 const scriptIntegracion=`scripts/${clinicaUi ? 'clinica-ui-integration' : pacientesUi ? 'pacientes-ui-integration' : 'historial-documental-integration'}.mjs`;
 const firebaseArgs=['emulators:exec','--only',pacientesUi ? 'auth,firestore' : 'firestore','--project',`demo-${proyecto}`,'--config',config,`"${process.execPath}" ${scriptIntegracion}`];
 const firebaseCli=process.platform==='win32'&&process.env.APPDATA
  ? join(process.env.APPDATA,'npm/node_modules/firebase-tools/lib/bin/firebase.js')
  : undefined;
 if(process.platform==='win32'&&!firebaseCli)throw new Error('FIREBASE_CLI_NO_LOCALIZADO');
 console.log(await (process.platform==='win32'
  ? run(process.execPath,[firebaseCli,...firebaseArgs],{cwd:backend,timeout:pacientesUi ? 600000 : 300000})
  : run('firebase',firebaseArgs,{cwd:backend,timeout:pacientesUi ? 600000 : 300000})));
 if(clinicaUi){
  const estado=async()=>await run('docker',[...compose,'exec','-T','postgres','psql','-X','-At','-U','postgres_admin','-d','hospital_general','-c',"SELECT count(*)::text||':'||md5(string_agg(contenido::text,'' ORDER BY id)) FROM hospital_servicios.recursos"]);
  const antesServicios=await estado();
  await run('docker',[...compose,'exec','-T','postgres','psql','-X','-v','ON_ERROR_STOP=1','-U','postgres_admin','-d','hospital_general','-f','/tmp/servicios.sql']);
  if(antesServicios!==await estado())throw new Error('MIGRACION_008_CAMBIO_DATOS');
  // Un legado especializado sin snapshots no se habilita mediante reaplicación.
  await run('docker',[...compose,'exec','-T','postgres','psql','-X','-v','ON_ERROR_STOP=1','-U','postgres_admin','-d','hospital_general','-c','CREATE DATABASE servicios_legado TEMPLATE hospital_general']);
  const legadoSql=sql=>run('docker',[...compose,'exec','-T','postgres','psql','-X','-At','-v','ON_ERROR_STOP=1','-U','postgres_admin','-d','servicios_legado','-c',sql]);
  const conteo=await legadoSql('SELECT count(*) FROM hospital_general.orden_examen');
  const tieneLegado=Number((await legadoSql('SELECT (SELECT count(*) FROM hospital_general.orden_examen)+(SELECT count(*) FROM hospital_general.poliza)+(SELECT count(*) FROM hospital_general.procedimiento_realizado)')).trim())>0;
  await legadoSql('DROP SCHEMA hospital_servicios CASCADE');
  for(let i=0;i<2;i++)await run('docker',[...compose,'exec','-T','postgres','psql','-X','-v','ON_ERROR_STOP=1','-U','postgres_admin','-d','servicios_legado','-f','/tmp/servicios.sql']);
  if((await legadoSql('SELECT estado FROM hospital_servicios.modelo')).trim()!==(tieneLegado?'RECONCILIAR':'LISTO')||conteo!==await legadoSql('SELECT count(*) FROM hospital_general.orden_examen'))throw new Error('LEGADO_SERVICIOS_SIN_GUARDA');
  console.log(tieneLegado?'PASS migración 008 legado: RECONCILIAR estable, órdenes existentes conservadas.':'PASS migración 008 sin legado: LISTO estable, no se inventaron órdenes.');
  console.log('PASS migración 008 sobre volumen existente: mismas proyecciones y estado, sin pérdida.');
 }
 const antes=await estadoSql();
 await migrarSql();
 const despues=await estadoSql();
 if(JSON.stringify(antes)!==JSON.stringify(despues)) throw new Error('MIGRACION_CAMBIO_EVENTOS');
 await run('docker',[...compose,'run','--rm','--no-deps','mongo-init']);
 console.log('PASS SQL: migraciones reejecutadas sobre datos existentes sin eliminar eventos.');
}catch(error){
 errorPrincipal=error;
 try { console.error(await run('docker',[...compose,'ps','-a'])); console.error(await run('docker',[...compose,'logs','--tail','80','mysql','mongodb'])); } catch { /* diagnóstico best effort */ }
 throw error;
}finally{
 try {await run('docker',[...compose,'down','--volumes','--timeout','30']);}catch(error){if(!errorPrincipal)throw error;console.error('Limpieza aislada pendiente:',error.message);}
 finally {await rm(temporal,{recursive:true,force:true});}
}
