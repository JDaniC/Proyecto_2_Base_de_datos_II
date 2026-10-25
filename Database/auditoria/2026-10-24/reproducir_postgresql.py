#!/usr/bin/env python3
"""Casos de auditoría en un clúster PostgreSQL nuevo; no acepta una conexión externa.

Los casos expresan el diseño adoptado. Con el script auditado, dos casos de la
misma causa raíz deben fallar. Los logs se guardan en .test-results/, sin secretos.
"""
import importlib.util
import json
from pathlib import Path
import secrets
import shutil
import subprocess
import tempfile
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location("verificador_database", ROOT / "Database/tests/verificar_local.py")
modulo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(modulo)
SALIDA = ROOT / ".test-results/auditoria-2026-10-24/adicionales-postgres"

PREPARACION = """
SET LOCAL search_path=hospital_general,public;
INSERT INTO paciente(id_paciente,primer_nombre,primer_apellido) VALUES(91001,'AUDITORIA','SINTETICA');
INSERT INTO historial_clinico(id_historial,id_paciente,numero_historial) VALUES(91001,91001,'AUDITORIA-91001');
INSERT INTO personal_medico(id_personal,primer_nombre,primer_apellido) VALUES(91001,'AUDITORIA','SINTETICA');
INSERT INTO usuario(id_usuario,nombre_usuario,auth_uid) VALUES(91001,'AUDITORIA-91001','UID-AUDITORIA-91001');
INSERT INTO consulta(id_consulta,id_historial,id_personal_atendio,motivo_consulta)
VALUES(91001,91001,91001,'ATENCION SINTETICA INICIADA');
"""
ARCHIVAR = """
UPDATE historial_clinico SET estado_historial='ARCHIVADO',causa_baja='TRASLADO',
motivo_baja='AUDITORIA SINTETICA',fecha_baja=CURRENT_TIMESTAMP,
actor_baja=(SELECT id_publico FROM usuario WHERE id_usuario=91001) WHERE id_historial=91001;
"""


def main():
    base = modulo.buscar_binario_dir(None, "initdb", modulo.RUTAS_POSTGRES) or Path(shutil.which("initdb") or "").parent
    if not (base / "initdb").is_file():
        raise RuntimeError("Falta PostgreSQL nativo: prueba bloqueada.")
    SALIDA.mkdir(parents=True, exist_ok=True)
    resultados = []
    with tempfile.TemporaryDirectory(prefix="bdii-auditoria-pg-") as temporal:
        carpeta = Path(temporal)
        args = SimpleNamespace(evidencias=str(SALIDA))
        v = modulo.Verificacion(args, carpeta)
        puerto = modulo.puerto()
        datos = carpeta / "pg"
        v.ejecutar([base / "initdb", "-D", datos, "-A", "trust", "--no-locale"])
        iniciado = False
        try:
            v.ejecutar([base / "pg_ctl", "-D", datos, "-l", carpeta / "postgres.log", "-o",
                        f"-h 127.0.0.1 -p {puerto} -k {carpeta}", "start"])
            iniciado = True
            nombre = "bdii_test_auditoria_20261024"
            v.ejecutar([base / "createdb", "-h", "127.0.0.1", "-p", puerto, nombre])
            cli = [str(base / "psql"), "-X", "-q", "-A", "-t", "-h", "127.0.0.1", "-p", str(puerto),
                   "-d", nombre, "-v", "ON_ERROR_STOP=1"]
            v.ejecutar(cli, (ROOT / "Database/hospital_general_postgresql.sql").read_text())

            def caso(identificador, titulo, preparacion, sentencia, error_esperado=None, cliente=None):
                texto = "BEGIN;\n" + preparacion + "\n" + sentencia + "\nROLLBACK;"
                r = subprocess.run(cliente or cli, input=texto, text=True, capture_output=True,
                                   cwd=ROOT, timeout=30)
                esperado = error_esperado or "OPERACION_PERMITIDA"
                correcto = (r.returncode == 0 if error_esperado is None else
                            r.returncode != 0 and error_esperado in r.stderr)
                registro = {"id": identificador, "caso": titulo, "estado": "PASS" if correcto else "FAIL",
                            "esperado": esperado, "codigo_salida": r.returncode,
                            "observado": r.stderr.strip() or r.stdout.strip() or "OPERACION_PERMITIDA"}
                resultados.append(registro)
                (SALIDA / f"{identificador}.txt").write_text(r.stdout + r.stderr)
                print(registro["estado"], identificador, titulo, flush=True)

            caso("AUD-PG-01", "finalizar consulta con historial activo", PREPARACION,
                 "UPDATE consulta SET estado='FINALIZADA' WHERE id_consulta=91001;")
            caso("AUD-PG-02", "finalizar atencion iniciada antes del archivo", PREPARACION + ARCHIVAR,
                 "UPDATE consulta SET estado='FINALIZADA' WHERE id_consulta=91001;")
            caso("AUD-PG-03", "corregir consulta finalizada con revision tras archivo",
                 PREPARACION + "UPDATE consulta SET estado='FINALIZADA' WHERE id_consulta=91001;\n" + ARCHIVAR,
                 """INSERT INTO revisiones(id_revision,tipo_recurso,recurso_id,version,id_usuario,motivo,contenido_anterior)
                 SELECT gen_random_uuid(),'consulta',id_publico,revision,91001,'CORRECCION SINTETICA',to_jsonb(c)
                 FROM consulta c WHERE id_consulta=91001;
                 UPDATE consulta SET revision=revision+1,observaciones='CORRECCION SINTETICA' WHERE id_consulta=91001;""")
            caso("AUD-PG-04", "rechazar una nueva consulta despues del archivo", PREPARACION + ARCHIVAR,
                 "INSERT INTO consulta(id_historial,id_personal_atendio,motivo_consulta) VALUES(91001,91001,'NUEVA');",
                 "HISTORIAL_INACTIVO")

            # Perfil de permisos real, adaptando solo el nombre de la base temporal.
            permisos = (ROOT / "Database/docker/postgres/app-user.sql").read_text().replace(
                "GRANT CONNECT ON DATABASE hospital_general", f"GRANT CONNECT ON DATABASE {nombre}")
            import os
            entorno = os.environ.copy()
            entorno["PG_APP_PASSWORD"] = secrets.token_hex(32)
            v.ejecutar(cli, permisos, env=entorno)
            cliente_app = cli + ["-U", "hospital_app"]
            caso("AUD-PG-05", "cuenta de aplicacion puede registrar paciente", "SET LOCAL search_path=hospital_general,public;",
                 "INSERT INTO paciente(primer_nombre,primer_apellido) VALUES('AUDITORIA','SINTETICA');", cliente=cliente_app)
            caso("AUD-PG-06", "cuenta de aplicacion no tiene DDL", "",
                 "CREATE TABLE hospital_general.auditoria_no_permitida(id integer);", "permission denied", cliente_app)
            caso("AUD-PG-07", "cuenta de aplicacion no modifica auditoria", "",
                 "UPDATE hospital_general.auditoria SET accion='CAMBIO' WHERE false;", "permission denied", cliente_app)
            caso("AUD-PG-08", "cuenta de aplicacion no borra revisiones", "",
                 "DELETE FROM hospital_general.revisiones WHERE false;", "permission denied", cliente_app)
            caso("AUD-PG-09", "cuenta de aplicacion no modifica operaciones", "",
                 "UPDATE hospital_general.operaciones SET clave='CAMBIO' WHERE false;", "permission denied", cliente_app)
            caso("AUD-PG-10", "cuenta de aplicacion no accede al manifiesto", "",
                 "SELECT * FROM hospital_general.modelo_database;", "permission denied", cliente_app)
        finally:
            if iniciado:
                v.ejecutar([base / "pg_ctl", "-D", datos, "stop", "-m", "fast"])
    salida = {"estado": "FAIL" if any(r["estado"] == "FAIL" for r in resultados) else "PASS",
              "casos": resultados, "cluster_temporal_eliminado": True}
    SALIDA.mkdir(parents=True, exist_ok=True)
    (SALIDA / "resultado.json").write_text(json.dumps(salida, indent=2, ensure_ascii=False) + "\n")
    return 1 if salida["estado"] == "FAIL" else 0


if __name__ == "__main__":
    raise SystemExit(main())
