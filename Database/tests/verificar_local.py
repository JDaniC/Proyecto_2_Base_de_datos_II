#!/usr/bin/env python3
"""Verifica Database solo en procesos nuevos, con directorios y puertos temporales.
No acepta URL de una base existente. No necesita paquetes Python externos.
Los binarios de motores, Node, Java y Firebase CLI deben estar disponibles.
"""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import shlex
import socket
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[2]
DB = ROOT / 'Database'

RUTAS_POSTGRES = (
    '/opt/homebrew/opt/postgresql@18/bin',
    '/opt/homebrew/opt/postgresql@17/bin',
    '/opt/homebrew/opt/postgresql/bin',
    '/usr/local/opt/postgresql@18/bin',
    '/usr/local/opt/postgresql@17/bin',
    '/usr/local/opt/postgresql/bin',
)
RUTAS_MYSQL = (
    '/opt/homebrew/opt/mysql@8.4/bin',
    '/opt/homebrew/opt/mysql/bin',
    '/usr/local/opt/mysql@8.4/bin',
    '/usr/local/opt/mysql/bin',
    '/usr/local/mysql/bin',
)
RUTAS_JAVA_HOME = (
    '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
    '/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home',
    '/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
    '/usr/local/opt/openjdk/libexec/openjdk.jdk/Contents/Home',
    '/Applications/DBeaver.app/Contents/Eclipse/jre/Contents/Home',
    '/Applications/DataGrip.app/Contents/jbr/Contents/Home',
    '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
)


def buscar_binario_dir(explicito, ejecutable, candidatos):
    if explicito:
        ruta = Path(explicito)
        if (ruta / ejecutable).is_file():
            return ruta
        raise RuntimeError(f'No se encontro {ejecutable} en {ruta}')
    en_path = shutil.which(ejecutable)
    if en_path:
        return Path(en_path).parent
    for candidato in candidatos:
        ruta = Path(candidato)
        if (ruta / ejecutable).is_file():
            return ruta
    return None


def entorno_java():
    env = os.environ.copy()
    candidatos = []
    if env.get('JAVA_HOME'):
        candidatos.append(Path(env['JAVA_HOME']))
    en_path = shutil.which('java')
    if en_path:
        candidatos.append(Path(en_path).resolve().parent.parent)
    candidatos.extend(Path(p) for p in RUTAS_JAVA_HOME)
    for home in candidatos:
        java_bin = home / 'bin' / 'java'
        if not java_bin.is_file():
            continue
        try:
            r = subprocess.run([str(java_bin), '-version'], capture_output=True, text=True, timeout=5)
            if r.returncode == 0 and ('version "21' in r.stderr or 'version "22' in r.stderr or
                                       'version "23' in r.stderr or 'version "24' in r.stderr or
                                       'version "25' in r.stderr):
                env['JAVA_HOME'] = str(home)
                env['PATH'] = f"{home / 'bin'}:{env.get('PATH', '')}"
                return env
        except OSError:
            continue
    return env


def puerto():
    with socket.socket() as conexion:
        conexion.bind(('127.0.0.1', 0))
        return conexion.getsockname()[1]


class Verificacion:
    def __init__(self, args, carpeta):
        self.args, self.carpeta = args, carpeta
        self.evidencias = Path(args.evidencias).resolve()
        self.evidencias.mkdir(parents=True, exist_ok=True)
        self.resultados = []

    def registrar(self, motor, caso):
        self.resultados.append({'motor': motor, 'caso': caso, 'estado': 'PASS'})
        print(f'PASS {motor}: {caso}', flush=True)

    def ejecutar(self, comando, texto=None, nombre=None, esperado=0, cwd=ROOT, env=None):
        resultado = subprocess.run([str(p) for p in comando], input=texto, text=True,
                                   capture_output=True, cwd=cwd, env=env, timeout=180)
        salida = resultado.stdout + resultado.stderr
        if nombre:
            (self.evidencias / f'{nombre}.txt').write_text(salida.rstrip()+'\n' if salida else '')
        if (esperado == 0 and resultado.returncode != 0) or (esperado != 0 and resultado.returncode == 0):
            raise RuntimeError(f'Fallo en {nombre or Path(comando[0]).name}: {salida[-2500:]}')
        return resultado

    def postgres(self):
        base = buscar_binario_dir(self.args.postgres_bin, 'initdb', RUTAS_POSTGRES)
        if not base:
            raise RuntimeError('Falta PostgreSQL 15+: indicar --postgres-bin DIRECTORIO')
        data, port = self.carpeta / 'pg', puerto()
        self.ejecutar([base/'initdb', '-D', data, '-A', 'trust', '--no-locale'], nombre='postgres_inicializacion')
        self.ejecutar([base/'pg_ctl', '-D', data, '-l', self.carpeta/'postgres.log', '-o',
                       f'-h 127.0.0.1 -p {port} -k {self.carpeta}', 'start'])
        cli = [base/'psql', '-X', '-q', '-A', '-t', '-h', '127.0.0.1', '-p', str(port),
               '-d', 'bdii_test_regresion', '-v', 'ON_ERROR_STOP=1']
        def sql(texto, **kw): return self.ejecutar(cli, texto, **kw)
        esquema = (DB/'hospital_general_postgresql.sql').read_text()
        try:
            self.ejecutar([base/'createdb', '-h', '127.0.0.1', '-p', str(port), 'bdii_test_regresion'])
            sql(esquema, nombre='postgres_esquema')
            self.registrar('PostgreSQL', 'carga nueva')
            sql("SELECT row_to_json(c) FROM (SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='hospital_general' ORDER BY table_name,ordinal_position) c;", nombre='diccionario_postgresql')
            sql(esquema, nombre='postgres_reejecucion')
            self.registrar('PostgreSQL', 'reejecucion compatible')
            sql((DB/'tests/regresiones_postgresql.sql').read_text(), nombre='postgres_regresiones')
            self.registrar('PostgreSQL', '33 regresiones SQL')
            sql((DB/'tests/regresiones_archivo_postgresql.sql').read_text(), nombre='postgres_regresiones_archivo')
            self.registrar('PostgreSQL', '8 regresiones de archivo y propiedad inmutable')
            # La segunda conexion espera el commit de la primera, despues rechaza el solapamiento.
            sql("""SET search_path=hospital_general,public;
            INSERT INTO paciente(id_paciente,primer_nombre,primer_apellido) VALUES(20001,'SINTETICO','A'),(20002,'SINTETICO','B');
            INSERT INTO personal_medico(id_personal,primer_nombre,primer_apellido) VALUES(20001,'SINTETICO','A');
            INSERT INTO hospitalizacion(id_hospitalizacion,id_paciente,id_personal_responsable_ingreso,fecha_ingreso,motivo_ingreso) VALUES(20001,20001,20001,'2026-10-19 08:00','SINTETICO'),(20002,20002,20001,'2026-10-19 08:00','SINTETICO');
            INSERT INTO habitacion(id_habitacion,numero) VALUES(20001,'AUD');
            INSERT INTO cama(id_cama,id_habitacion,numero_cama) VALUES(20001,20001,'AUD');""")
            insert = "INSERT INTO hospital_general.asignacion_cama(id_hospitalizacion,id_cama,fecha_hora_inicio) VALUES({hospital},20001,'2026-10-19 09:00');"
            self.concurrentes(cli, 'BEGIN;'+insert.format(hospital=20001)+"SELECT 'LISTO'; SELECT pg_sleep(1); COMMIT;",
                              insert.format(hospital=20002), 'postgres_concurrencia', 'exclusion')
            self.registrar('PostgreSQL', 'dos sesiones no ocupan la misma cama')
            sql('ALTER TABLE hospital_general.paciente ADD COLUMN deriva integer;')
            fallo = sql(esquema, esperado=1, nombre='postgres_deriva')
            assert 'MODELO_INCOMPATIBLE_REQUIERE_MIGRACION' in fallo.stderr
            self.registrar('PostgreSQL', 'rechazo de deriva')
            self.ejecutar([base/'createdb', '-h', '127.0.0.1', '-p', str(port), 'bdii_test_antiguo'])
            antiguo = [str(x) if x != 'bdii_test_regresion' else 'bdii_test_antiguo' for x in cli]
            self.ejecutar(antiguo, 'CREATE SCHEMA hospital_general; CREATE TABLE hospital_general.paciente(id integer);')
            fallo = self.ejecutar(antiguo, esquema, esperado=1, nombre='postgres_esquema_anterior')
            assert 'ESQUEMA_ANTERIOR_SIN_MANIFIESTO' in fallo.stderr
            self.registrar('PostgreSQL', 'rechazo no destructivo de esquema anterior')
            self.ejecutar([base/'createdb', '-h', '127.0.0.1', '-p', str(port), 'bdii_test_migracion'])
            migrada = [str(x) if x != 'bdii_test_regresion' else 'bdii_test_migracion' for x in cli]
            migracion = (DB/'migrations/005_clinica_sql_postgresql.sql').read_text()
            self.ejecutar(migrada, esquema)
            # Simula el modelo v3 quitando una extensión aditiva de v4 y recalculando el manifiesto.
            funcion = re.search(r"CREATE OR REPLACE FUNCTION pg_temp\.huella_hospital\(\) RETURNS text LANGUAGE sql AS \$\$(.*?)\$\$;", esquema, re.S)
            assert funcion is not None
            huella = 'CREATE OR REPLACE FUNCTION pg_temp.huella_hospital() RETURNS text LANGUAGE sql AS $$' + funcion.group(1) + '$$;'
            self.ejecutar(migrada, 'SET search_path TO hospital_general, public;\n' +
                          'ALTER TABLE hospital_general.consulta DROP COLUMN profesional_historico;\n' + huella +
                          'UPDATE hospital_general.modelo_database SET version=3, huella=pg_temp.huella_hospital() WHERE id=1;',
                          nombre='postgres_migracion_estado_v3')
            fallo_init = self.ejecutar(migrada, esquema, esperado=1, nombre='postgres_migracion_rechazo_init')
            assert 'MODELO_INCOMPATIBLE_REQUIERE_MIGRACION' in fallo_init.stderr
            self.ejecutar(migrada, migracion, nombre='postgres_migracion_v3_v4')
            self.ejecutar(migrada, 'SELECT profesional_historico FROM hospital_general.consulta LIMIT 0;', nombre='postgres_migracion_columna')
            self.ejecutar(migrada, esquema, nombre='postgres_migracion_reejecucion')
            self.ejecutar(migrada, (DB/'tests/regresiones_archivo_postgresql.sql').read_text(), nombre='postgres_migracion_regresiones_archivo')
            self.registrar('PostgreSQL', 'migracion explicita v3 -> v4 compatible con inicializador')
        finally:
            self.ejecutar([base/'pg_ctl', '-D', data, 'stop', '-m', 'fast'])

    def concurrentes(self, cli, primera, segunda, nombre, error_esperado):
        proceso = subprocess.Popen([str(x) for x in cli], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE, text=True, cwd=ROOT)
        try:
            proceso.stdin.write(primera)
            proceso.stdin.close()
            proceso.stdin = None
            # Ambos clientes se ejecutan sin buffering. LISTO se emite dentro de la transaccion.
            linea = proceso.stdout.readline()
            if 'LISTO' not in linea:
                raise RuntimeError(f'Primera transaccion no preparada: {linea} {proceso.stderr.read()}')
            rechazo = self.ejecutar(cli, segunda, esperado=1)
            salida, error = proceso.communicate(timeout=15)
            assert proceso.returncode == 0, error
            assert error_esperado.lower() in rechazo.stderr.lower(), rechazo.stderr
            (self.evidencias/f'{nombre}.txt').write_text('Primera transaccion: COMMIT\nSegunda transaccion rechazada:\n'+rechazo.stderr)
        finally:
            if proceso.poll() is None:
                proceso.terminate()
                proceso.wait(timeout=10)

    def mysql(self):
        base = buscar_binario_dir(self.args.mysql_bin, 'mysqld', RUTAS_MYSQL)
        if not base:
            raise RuntimeError('Falta MySQL 8.4+: indicar --mysql-bin DIRECTORIO')
        data, sock, port = self.carpeta/'mysql', self.carpeta/'mysql.sock', puerto()
        self.ejecutar([base/'mysqld', '--no-defaults', '--initialize-insecure', f'--basedir={base.parent}',
                      f'--datadir={data}'], nombre='mysql_inicializacion')
        log = (self.carpeta/'mysql-process.log').open('w')
        proceso = subprocess.Popen([str(base/'mysqld'), '--no-defaults', f'--basedir={base.parent}',
            f'--datadir={data}', f'--socket={sock}', f'--port={port}', '--bind-address=127.0.0.1',
            '--mysqlx=OFF', f'--log-error={self.carpeta / "mysql.log"}'], stdout=log, stderr=log)
        cli = [base/'mysql', '--no-defaults', f'--socket={sock}', '-uroot', '--batch', '--skip-column-names', '--unbuffered', '--raw']
        def sql(texto, **kw): return self.ejecutar(cli, texto, **kw)
        esquema = (DB/'clinica_odontologica_mysql.sql').read_text()
        try:
            for _ in range(100):
                ping = subprocess.run([str(base/'mysqladmin'), '--no-defaults', f'--socket={sock}', '-uroot', 'ping'], capture_output=True)
                if ping.returncode == 0: break
                if proceso.poll() is not None: raise RuntimeError('MySQL no inicio; revisar mysql.log temporal')
                time.sleep(.1)
            else: raise RuntimeError('MySQL no estuvo listo en 10 segundos')
            sql(esquema, nombre='mysql_esquema'); self.registrar('MySQL', 'carga nueva')
            sql("SELECT JSON_OBJECT('table_name',TABLE_NAME,'column_name',COLUMN_NAME,'data_type',COLUMN_TYPE,'is_nullable',IS_NULLABLE,'column_default',COLUMN_DEFAULT) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='clinica_odontologica' ORDER BY TABLE_NAME,ORDINAL_POSITION;",nombre='diccionario_mysql')
            sql(esquema, nombre='mysql_reejecucion'); self.registrar('MySQL', 'reejecucion compatible')
            sql('SET @bdii_pruebas_autorizadas=1;\n'+(DB/'tests/regresiones_mysql.sql').read_text(), nombre='mysql_regresiones')
            self.registrar('MySQL', '27 regresiones SQL')
            sql(esquema, nombre='mysql_reejecucion_tras_tests')
            sql("""USE clinica_odontologica;
            INSERT INTO paciente(id_paciente,nombres,apellidos) VALUES(20001,'SINTETICO','A');
            INSERT INTO historial_clinico(id_historial,id_paciente) VALUES(20001,20001);
            INSERT INTO odontologo(id_odontologo,nombres,apellidos,colegiado) VALUES(20001,'SINTETICO','A','AUD-CONC');
            INSERT INTO secretaria(id_secretaria,nombres,apellidos) VALUES(20001,'SINTETICO','A');
            INSERT INTO cita(id_cita,id_paciente,id_odontologo,id_secretaria,fecha_hora,motivo) VALUES(20001,20001,20001,20001,'2026-10-19 10:00','SINTETICO');""")
            insert = "INSERT INTO clinica_odontologica.consulta_odontologica(id_historial,id_cita,id_odontologo,motivo) VALUES(20001,20001,20001,'SINTETICO');"
            self.concurrentes(cli, 'START TRANSACTION;'+insert+"SELECT 'LISTO'; SELECT SLEEP(1); COMMIT;", insert, 'mysql_concurrencia', 'Duplicate entry')
            self.registrar('MySQL', 'dos sesiones no duplican atencion de cita')
            sql('ALTER TABLE clinica_odontologica.paciente ADD COLUMN deriva integer;')
            fallo = sql(esquema, esperado=1, nombre='mysql_deriva')
            assert 'MODELO_INCOMPATIBLE_REQUIERE_MIGRACION' in fallo.stderr
            self.registrar('MySQL', 'rechazo de deriva')
            # La instancia fue creada aqui: esta eliminacion solo afecta datos sinteticos propios.
            sql('DROP DATABASE clinica_odontologica; CREATE DATABASE clinica_odontologica; CREATE TABLE clinica_odontologica.paciente(id integer);')
            fallo = sql(esquema, esperado=1, nombre='mysql_esquema_anterior')
            assert 'ESQUEMA_ANTERIOR_SIN_MANIFIESTO' in fallo.stderr
            self.registrar('MySQL', 'rechazo de esquema anterior')
            sql('DROP DATABASE clinica_odontologica; CREATE DATABASE clinica_odontologica;')
            sql(esquema, nombre='mysql_migracion_esquema')
            # Simula el modelo v3 retirando una tabla aditiva de v4 y recalculando el manifiesto.
            sql('''USE clinica_odontologica;
            DROP TABLE signos_vitales_consulta;
            CALL _huella_modelo(@bdii_huella_v3);
            UPDATE modelo_database SET version=3, huella=@bdii_huella_v3 WHERE id=1;''',
                nombre='mysql_migracion_estado_v3')
            fallo_init = sql(esquema, esperado=1, nombre='mysql_migracion_rechazo_init')
            assert 'MODELO_INCOMPATIBLE_REQUIERE_MIGRACION' in fallo_init.stderr
            sql((DB/'migrations/005_clinica_sql_mysql.sql').read_text(), nombre='mysql_migracion_v3_v4')
            sql('SELECT 1 FROM clinica_odontologica.signos_vitales_consulta LIMIT 0;', nombre='mysql_migracion_tabla')
            sql(esquema, nombre='mysql_migracion_reejecucion')
            self.registrar('MySQL', 'migracion explicita v3 -> v4 compatible con inicializador')
        finally:
            proceso.terminate()
            proceso.wait(timeout=30)
            log.close()

    def mongo(self):
        mongod = shutil.which('mongod')
        mongosh = shutil.which('mongosh')
        if not mongod or not mongosh: raise RuntimeError('Faltan mongod y mongosh')
        port_standalone, data_standalone = puerto(), self.carpeta/'mongo_standalone'
        data_standalone.mkdir()
        log_standalone = (self.carpeta/'mongo-standalone.log').open('w')
        proc_standalone = subprocess.Popen([mongod, '--dbpath', str(data_standalone), '--bind_ip', '127.0.0.1',
            '--port', str(port_standalone), '--logpath', str(self.carpeta/'mongo_standalone_server.log')],
            stdout=log_standalone, stderr=log_standalone)
        try:
            for _ in range(100):
                try:
                    with socket.create_connection(('127.0.0.1',port_standalone),timeout=.1): break
                except OSError: time.sleep(.1)
            fallo = self.ejecutar([mongosh,f'mongodb://127.0.0.1:{port_standalone}/?directConnection=true','--norc','--quiet','--file',DB/'laboratorio_clinico_mongodb.js'],
                                  esperado=1,nombre='mongo_standalone_rechazo')
            assert 'standalone' in (fallo.stdout + fallo.stderr)
            self.registrar('MongoDB','rechazo de instancia standalone')
        finally:
            proc_standalone.terminate(); proc_standalone.wait(timeout=30); log_standalone.close()
        port, data = puerto(), self.carpeta/'mongo'
        data.mkdir()
        log = (self.carpeta/'mongo-process.log').open('w')
        proceso = subprocess.Popen([mongod, '--dbpath', str(data), '--bind_ip', '127.0.0.1', '--port', str(port),
            '--replSet', 'bdii_test_rs', '--logpath', str(self.carpeta/'mongo.log')], stdout=log, stderr=log)
        try:
            for _ in range(100):
                try:
                    with socket.create_connection(('127.0.0.1',port),timeout=.1): break
                except OSError: time.sleep(.1)
            conexion = f'mongodb://127.0.0.1:{port}/?directConnection=true'
            self.ejecutar([mongosh,conexion,'--norc','--quiet','--eval',
              f'rs.initiate({{_id:"bdii_test_rs",members:[{{_id:0,host:"127.0.0.1:{port}"}}]}}); for(let i=0;i<150&&!db.hello().isWritablePrimary;i++)sleep(100); if(!db.hello().isWritablePrimary)throw Error("NO_PRIMARY");'])
            for file,name in [('laboratorio_clinico_mongodb.test.js','mongo_suite'),('regresiones_mongodb.js','mongo_regresiones')]:
                self.ejecutar([mongosh,f'mongodb://127.0.0.1:{port}/?replicaSet=bdii_test_rs','--norc','--quiet','--file',DB/'tests'/file],nombre=name)
                self.registrar('MongoDB',file)
        finally:
            proceso.terminate(); proceso.wait(timeout=30); log.close()

    def firestore(self):
        self.ejecutar(['node','--test',DB/'tests/centro_pediatrico_firestore.test.mjs'],nombre='firestore_validadores')
        self.registrar('Firestore','82 pruebas offline')
        conf = json.loads((DB/'firebase/firebase.json').read_text())
        conf['firestore']['rules'] = str(DB/'firebase/firestore.rules')
        conf['firestore']['indexes'] = str(DB/'firebase/firestore.indexes.json')
        for name in ('auth', 'firestore', 'hub', 'logging'):
            if name in conf['emulators']:
                conf['emulators'][name]['port'] = puerto()
        config=self.carpeta/'firebase.json';config.write_text(json.dumps(conf))
        env=entorno_java();env['XDG_CONFIG_HOME']=str(self.carpeta/'firebase-config')
        env.pop('FIRESTORE_EMULATOR_HOST',None)
        env.pop('FIREBASE_AUTH_EMULATOR_HOST',None)
        self.ejecutar(['firebase','emulators:exec','--only','auth,firestore','--project','demo-bdii-cierre','--config',config,
                     'node --test '+shlex.quote(str(DB/'tests/centro_pediatrico_firestore.emulator.test.mjs'))],
                     cwd=self.carpeta,env=env,nombre='firestore_emulador')
        self.registrar('Firestore','99 pruebas en emulador (auth + firestore aislados)')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--motores',nargs='+',choices=['postgres','mysql','mongo','firestore'],default=['postgres','mysql','mongo','firestore'])
    parser.add_argument('--postgres-bin')
    parser.add_argument('--mysql-bin')
    parser.add_argument('--evidencias',default=str(ROOT/'.test-results/database'))
    args=parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='bdii-test-') as carpeta:
        ruta_temporal = Path(carpeta)
        v=Verificacion(args,ruta_temporal)
        try:
            for motor in args.motores: getattr(v,motor)()
        except Exception:
            (v.evidencias/'resultado.json').write_text(json.dumps({'estado':'FAIL','grupos_completados':v.resultados},indent=2))
            raise
    limpio = not ruta_temporal.exists()
    assert limpio, f'Directorio temporal no eliminado: {ruta_temporal}'
    (v.evidencias/'resultado.json').write_text(json.dumps({
        'estado':'PASS',
        'limpieza_temporal':limpio,
        'grupos_completados':v.resultados,
    },indent=2))
    print('PASS: todos los motores solicitados. Procesos detenidos y datos temporales eliminados.',flush=True)


if __name__=='__main__': main()
