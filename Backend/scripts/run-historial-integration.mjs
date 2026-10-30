import {execFile as execFileCallback} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
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
try{
 console.log('Preparando cuatro motores aislados:',proyecto);
 await run('python3',[join(root,'Database/docker/preparar.py'),'--secrets-dir',secretos]);
 await run('docker',[...compose,'up','-d','--build','--wait','--wait-timeout','240','postgres','mysql','mongodb']);
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
 if(clinicaUi) for(const [servicio,archivo] of [['postgres','007_correcciones_postgresql.sql'],['mysql','007_correcciones_mysql.sql']]) {
  await run('docker',[...compose,'cp',join(root,'Database/migrations',archivo),`${servicio}:/tmp/clinica.sql`]);
  await run('docker',[...compose,'exec','-T',servicio,'sh','-c',servicio==='postgres'?'psql -X -v ON_ERROR_STOP=1 -U postgres_admin -d hospital_general -f /tmp/clinica.sql':'MYSQL_PWD="$(cat /run/secrets/mysql_root_password)" mysql -uroot < /tmp/clinica.sql']);
 }
 console.log('PASS preparación SQL: rollback PostgreSQL y recuperación MySQL tras interrupción.');
 Object.assign(entorno,{PG_TEST_PORT:entorno.POSTGRES_PORT,PG_TEST_SECRET_FILE:join(secretos,'postgres_app_password'),MYSQL_TEST_PORT:entorno.MYSQL_PORT,MYSQL_TEST_SECRET_FILE:join(secretos,'mysql_app_password'),MONGO_TEST_PORT:entorno.MONGO_PORT,MONGO_TEST_SECRET_FILE:join(secretos,'mongo_app_password'),MONGO_ADMIN_TEST_SECRET_FILE:join(secretos,'mongo_admin_password')});
 await run('npm',['run','build:test'],{cwd:backend});
 const conf=JSON.parse(await readFile(join(root,'Database/firebase/firebase.json'),'utf8'));
 const baseIndexes=JSON.parse(await readFile(join(root,'Database/firebase/firestore.indexes.json'),'utf8'));
 const extraIndexes=JSON.parse(await readFile(join(root,'Database/firebase/firestore.historial.indexes.json'),'utf8'));
 const indexesPath=join(temporal,'firestore.indexes.json');
 await writeFile(indexesPath,JSON.stringify({indexes:[...baseIndexes.indexes,...extraIndexes.indexes],fieldOverrides:[...baseIndexes.fieldOverrides,...extraIndexes.fieldOverrides]}));
 conf.firestore.rules=join(root,'Database/firebase/firestore.rules');conf.firestore.indexes=indexesPath;
 for(const n of ['auth','firestore','hub','logging'])if(conf.emulators[n])conf.emulators[n].port=Number(await puerto());
 const config=join(temporal,'firebase.json');await writeFile(config,JSON.stringify(conf));
 console.log(await run('firebase',['emulators:exec','--only',pacientesUi ? 'auth,firestore' : 'firestore','--project',`demo-${proyecto}`,'--config',config,`${process.execPath} scripts/${clinicaUi ? 'clinica-ui-integration' : pacientesUi ? 'pacientes-ui-integration' : 'historial-documental-integration'}.mjs`],{cwd:backend, timeout: pacientesUi ? 600000 : 300000}));
 const antes=await estadoSql();
 await migrarSql();
 const despues=await estadoSql();
 if(JSON.stringify(antes)!==JSON.stringify(despues)) throw new Error('MIGRACION_CAMBIO_EVENTOS');
 await run('docker',[...compose,'run','--rm','--no-deps','mongo-init']);
 console.log('PASS SQL: migraciones reejecutadas sobre datos existentes sin eliminar eventos.');
}finally{
 try {await run('docker',[...compose,'down','--volumes','--timeout','30']);}
 finally {await rm(temporal,{recursive:true,force:true});}
}
