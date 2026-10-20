#!/usr/bin/env python3
"""Pruebas Docker en un proyecto nuevo aislado; elimina solo sus propios volumenes."""
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import tempfile
from preparar import preparar

ROOT = Path(__file__).resolve().parents[2]


def puerto():
    with socket.socket() as conexion:
        conexion.bind(('127.0.0.1', 0))
        return str(conexion.getsockname()[1])


def main():
    proyecto = 'bdii-db-test-' + secrets.token_hex(4)
    casos = []
    with tempfile.TemporaryDirectory(prefix='bdii-docker-') as temporal:
        credenciales = Path(temporal) / 'secrets'
        preparar(credenciales)
        anteriores = {p.name: p.read_bytes() for p in credenciales.iterdir()}
        assert preparar(credenciales) == 0
        assert anteriores == {p.name: p.read_bytes() for p in credenciales.iterdir()}
        assert all((p.stat().st_mode & 0o777) == 0o600 for p in credenciales.iterdir())
        env = os.environ.copy()
        env.update(DB_SECRETS_DIR=str(credenciales), POSTGRES_PORT=puerto(), MYSQL_PORT=puerto(), MONGO_PORT=puerto())
        compose = ['docker', 'compose', '-f', str(ROOT / 'compose.yaml'), '-p', proyecto]

        def comando(args, texto=None, rechazo=None):
            r = subprocess.run(compose + args, input=texto, text=True, capture_output=True, env=env, cwd=ROOT, timeout=300)
            if rechazo is not None:
                assert r.returncode != 0 and rechazo in r.stderr, r.stderr
            elif r.returncode != 0:
                raise RuntimeError((r.stdout+'\n'+r.stderr)[-1800:])
            return r.stdout.strip()

        def aprobado(caso):
            casos.append(caso)
            print('PASS ' + caso, flush=True)

        def pg(texto, admin=False, rechazo=None):
            if admin:
                args = ['exec', '-T', 'postgres', 'psql', '-X', '-U', 'postgres_admin', '-d', 'hospital_general', '-At', '-v', 'ON_ERROR_STOP=1']
            else:
                args = ['exec', '-T', 'postgres', 'sh', '-c', 'PGPASSWORD="$(cat /run/secrets/postgres_app_password)" exec psql -X -h127.0.0.1 -U hospital_app -d hospital_general -At -v ON_ERROR_STOP=1']
            return comando(args, texto, rechazo)

        def mysql(texto, admin=False, rechazo=None):
            script = ('MYSQL_PWD="$(cat /run/secrets/mysql_root_password)" exec mysql --protocol=socket -uroot' if admin else
                      'MYSQL_PWD="$(cat /run/secrets/mysql_app_password)" exec mysql -h127.0.0.1 -uclinica_app')
            return comando(['exec', '-T', 'mysql', 'sh', '-c', script + ' --database=clinica_odontologica --batch --skip-column-names'], texto, rechazo)

        def verificar_mongo(persistencia=False):
            args = ['run', '--rm', '--no-deps']
            if persistencia:
                args += ['-e', 'SOLO_PERSISTENCIA=1']
            # Reutiliza las credenciales y red de mongo-init; el archivo solo se monta para esta prueba.
            args += ['-v', str(ROOT / 'Database/docker/verificar_mongo.js') + ':/config/verificar.js:ro',
                     '--entrypoint', 'mongosh', 'mongo-init', '--nodb', '--norc', '--quiet', '--file', '/config/verificar.js']
            salida = comando(args)
            assert 'PASS' in salida, salida

        try:
            comando(['config', '--quiet'])
            aprobado('configuracion Compose valida y secretos no reemplazados')
            comando(['up', '-d', '--wait', '--wait-timeout', '240', 'postgres', 'mysql', 'mongodb'])
            aprobado('arranque nuevo: tres motores saludables')
            comando(['run', '--rm', '--no-deps', 'mongo-init'])
            aprobado('bootstrap replica set, esquema y permisos MongoDB')
            assert pg("SELECT count(*) FROM information_schema.tables WHERE table_schema='hospital_general' AND table_type='BASE TABLE';", admin=True) == '50'
            assert mysql("SELECT count(*) FROM information_schema.tables WHERE table_schema='clinica_odontologica' AND table_type='BASE TABLE';", admin=True) == '22'
            aprobado('50 tablas PostgreSQL y 22 MySQL inicializadas')
            pg("CREATE TABLE hospital_general.no_permitida(id integer);", rechazo='permission denied')
            mysql("CREATE TABLE no_permitida(id integer);", rechazo='1142')
            aprobado('usuarios SQL de aplicacion sin DDL')
            pg('DELETE FROM hospital_general.auditoria WHERE false;', rechazo='permission denied')
            mysql('DELETE FROM auditoria WHERE false;', rechazo='1142')
            aprobado('usuarios SQL sin borrado de auditoria')
            pg("INSERT INTO paciente(primer_nombre,primer_apellido,cui) VALUES('SINTETICO','DOCKER','DOCKER-SINTETICO');")
            mysql("INSERT INTO paciente(nombres,apellidos,correo) VALUES('SINTETICO','DOCKER','sintetico@example.invalid');")
            aprobado('conexion autenticada y escritura con usuarios SQL de aplicacion')
            verificar_mongo()
            aprobado('MongoDB: acceso anonimo denegado, sin DDL ni acceso a admin/auditoria; rollback de transaccion')
            comando(['down', '--timeout', '30'])  # Conservar volumenes para probar persistencia.
            comando(['up', '-d', '--wait', '--wait-timeout', '240', 'postgres', 'mysql', 'mongodb'])
            comando(['run', '--rm', '--no-deps', 'mongo-init'])
            assert pg("SELECT count(*) FROM paciente WHERE cui='DOCKER-SINTETICO';") == '1'
            assert mysql("SELECT count(*) FROM paciente WHERE correo='sintetico@example.invalid';") == '1'
            verificar_mongo(persistencia=True)
            aprobado('datos y cuentas persistentes tras recrear contenedores; bootstrap MongoDB repetible')
        finally:
            # -p siempre es el proyecto aleatorio creado por este proceso, nunca el proyecto de trabajo.
            comando(['down', '--volumes', '--timeout', '30'])
    resultado = {'estado': 'PASS', 'firebase_incluido': False, 'proyecto_temporal_eliminado': True, 'casos': casos}
    salida = ROOT / '.test-results/docker/resultado.json'
    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text(json.dumps(resultado, indent=2, ensure_ascii=False) + '\n')
    print('PASS: prueba completa; proyecto temporal y sus volumenes eliminados. Proyecto de trabajo conservado.', flush=True)


if __name__ == '__main__':
    main()
