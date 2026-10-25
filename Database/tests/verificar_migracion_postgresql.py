#!/usr/bin/env python3
"""Prueba en clúster PostgreSQL temporal de instalación nueva v3 y migración explícita v2 -> v3 (E00-P1-02).

Comprueba:
1. Base inicializada en estado v2 con registros sintéticos de pacientes, historiales, consultas,
   recetas, revisiones, auditoría y operaciones reproduce el fallo A-F01 (HISTORIAL_INACTIVO).
2. El inicializador v3 no migra silenciosamente una base v2 (MODELO_INCOMPATIBLE_REQUIERE_MIGRACION).
3. La migración explícita rechaza versión desconocida (VERSION_MODELO_DESCONOCIDA) y deriva de esquema
   (MODELO_INCOMPATIBLE_REQUIERE_MIGRACION) haciendo rollback sin perder datos.
4. La migración explícita actualiza una base v2 a v3 preservando todos los registros previos, dejando
   modelo_database con la misma versión (3) y huella que una instalación limpia v3.
5. En la base migrada pasan la finalización de consulta abierta tras archivo, la corrección con revisión,
   el rechazo de nueva consulta en historial archivado, la reejecución compatible del inicializador v3,
   las 33 regresiones PG y las 8 regresiones de archivo/propiedad inmutable.
6. La reversión explícita v3 -> v2 y posterior remigración v2 -> v3 funcionan sin pérdida de datos.
"""
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[2]
DB = ROOT / "Database"
spec = importlib.util.spec_from_file_location("verificador_database", DB / "tests/verificar_local.py")
modulo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(modulo)
SALIDA_DEFAULT = ROOT / ".test-results/migracion-postgresql"

DATOS_SINTETICOS_V2 = """
SET search_path TO hospital_general, public;
INSERT INTO paciente(id_paciente, primer_nombre, primer_apellido)
VALUES (41001, 'MIGRACION', 'SINTETICA');
INSERT INTO historial_clinico(id_historial, id_paciente, numero_historial)
VALUES (41001, 41001, 'MIG-41001');
INSERT INTO personal_medico(id_personal, primer_nombre, primer_apellido)
VALUES (41001, 'MEDICO', 'MIGRACION');
INSERT INTO usuario(id_usuario, nombre_usuario, auth_uid)
VALUES (41001, 'USR-MIG-41001', 'UID-MIG-41001');
INSERT INTO consulta(id_consulta, id_historial, id_personal_atendio, motivo_consulta, estado)
VALUES
  (41001, 41001, 41001, 'CONSULTA ABIERTA PREVIA A MIGRACION', 'ABIERTA'),
  (41002, 41001, 41001, 'CONSULTA FINALIZADA PREVIA A MIGRACION', 'FINALIZADA');
INSERT INTO receta(id_receta, id_consulta, id_personal_prescriptor, estado, contenido_historico)
VALUES (
  41001, 41002, 41001, 'EMITIDA',
  '{"prescriptor_nombre_historico":"MEDICO MIGRACION","colegiado_historico":"COL-41001","medicamentos":[{"medicamento_id":"MED-1","nombre":"AMOXICILINA","presentacion":"CAPSULA","concentracion":"500MG","dosis":"1","frecuencia":"8H","duracion":"7D","via":"ORAL","indicaciones":"SINTETICO"}]}'::jsonb
);
INSERT INTO auditoria(id_auditoria, id_usuario, accion, tabla_afectada)
VALUES (41001, 41001, 'ALTA_PREVIA_MIGRACION', 'consulta');
INSERT INTO operaciones(id_operacion, id_usuario, caso_uso, clave, hash_entrada, codigo_respuesta, respuesta)
VALUES (
  '41000000-0000-4000-8000-000000000001',
  41001,
  'RegistrarConsulta',
  'idem-mig-41001',
  repeat('a', 64),
  201,
  '{"ok":true}'::jsonb
);
UPDATE historial_clinico
SET estado_historial = 'ARCHIVADO',
    causa_baja = 'TRASLADO',
    motivo_baja = 'ARCHIVO PREVIO A MIGRACION',
    fecha_baja = CURRENT_TIMESTAMP,
    actor_baja = (SELECT id_publico FROM usuario WHERE id_usuario = 41001)
WHERE id_historial = 41001;
"""


def ejecutar_pruebas_migracion(evidencias_dir: Path = SALIDA_DEFAULT) -> dict:
    base = modulo.buscar_binario_dir(None, "initdb", getattr(modulo, "RUTAS_PG", ())) or Path(shutil.which("initdb") or "").parent
    if not (base / "initdb").is_file():
        raise RuntimeError("Falta PostgreSQL nativo para verificar migración.")
    evidencias_dir.mkdir(parents=True, exist_ok=True)
    esquema_v3 = (DB / "hospital_general_postgresql.sql").read_text()
    migracion_sql = (DB / "migrations/001_corregir_archivo_historiales_postgresql.sql").read_text()
    reversion_sql = (DB / "migrations/001_revertir_archivo_historiales_postgresql.sql").read_text()
    regresiones_sql = (DB / "tests/regresiones_postgresql.sql").read_text()
    regresiones_archivo_sql = (DB / "tests/regresiones_archivo_postgresql.sql").read_text()

    comprobaciones = []

    def registrar(caso: str, detalle: str = "PASS"):
        comprobaciones.append({"caso": caso, "estado": "PASS", "detalle": detalle})
        print(f"PASS [Migracion PG] {caso}", flush=True)

    with tempfile.TemporaryDirectory(prefix="bdii-mig-pg-") as temporal:
        carpeta = Path(temporal)
        v = modulo.Verificacion(SimpleNamespace(evidencias=str(evidencias_dir)), carpeta)
        port = modulo.puerto()
        datos = carpeta / "pg"
        v.ejecutar([base / "initdb", "-D", datos, "-A", "trust", "--no-locale"])
        iniciado = False
        try:
            v.ejecutar([base / "pg_ctl", "-D", datos, "-l", carpeta / "postgres.log", "-o",
                        f"-h 127.0.0.1 -p {port} -k {carpeta}", "start"])
            iniciado = True

            db_nueva = "bdii_test_nueva_v3"
            db_migrada = "bdii_test_migrada_v2_v3"
            v.ejecutar([base / "createdb", "-h", "127.0.0.1", "-p", str(port), db_nueva])
            v.ejecutar([base / "createdb", "-h", "127.0.0.1", "-p", str(port), db_migrada])

            def cli_db(nombre_db: str):
                return [base / "psql", "-X", "-q", "-A", "-t", "-h", "127.0.0.1", "-p", str(port),
                        "-d", nombre_db, "-v", "ON_ERROR_STOP=1"]

            # 1. Inicializar base limpia v3 y obtener su huella canónica.
            v.ejecutar(cli_db(db_nueva), esquema_v3, nombre="mig_base_nueva_v3")
            huella_nueva_v3 = v.ejecutar(
                cli_db(db_nueva),
                "SELECT version || ':' || huella FROM hospital_general.modelo_database WHERE id=1;"
            ).stdout.strip()
            assert huella_nueva_v3.startswith("3:"), f"Versión inesperada en base nueva: {huella_nueva_v3}"
            registrar("instalacion limpia v3 y huella canonica", huella_nueva_v3)

            # 2. Preparar base en estado v2 (inicializar y revertir código a v2) y poblar datos sintéticos.
            v.ejecutar(cli_db(db_migrada), esquema_v3)
            v.ejecutar(cli_db(db_migrada), reversion_sql, nombre="mig_preparar_estado_v2")
            huella_v2 = v.ejecutar(
                cli_db(db_migrada),
                "SELECT version || ':' || huella FROM hospital_general.modelo_database WHERE id=1;"
            ).stdout.strip()
            assert huella_v2.startswith("2:"), f"Se esperaba versión 2 antes de migrar: {huella_v2}"
            v.ejecutar(cli_db(db_migrada), DATOS_SINTETICOS_V2, nombre="mig_datos_sinteticos_v2")
            registrar("base v2 con registros sinteticos previos", huella_v2)

            # 3. Verificar que en v2 falla finalizar consulta abierta tras archivo (A-F01).
            fallo_v2 = v.ejecutar(
                cli_db(db_migrada),
                "UPDATE hospital_general.consulta SET estado='FINALIZADA' WHERE id_consulta=41001;",
                esperado=3,
                nombre="mig_fallo_previo_v2"
            )
            assert "HISTORIAL_INACTIVO" in fallo_v2.stderr, fallo_v2.stderr
            registrar("reproduccion de A-F01 en base v2 previa a migracion")

            # 4. Verificar que el inicializador v3 rechaza ejecutarse sobre base v2 sin migrar.
            fallo_init_v3 = v.ejecutar(cli_db(db_migrada), esquema_v3, esperado=3, nombre="mig_rechazo_init_directo")
            assert "MODELO_INCOMPATIBLE_REQUIERE_MIGRACION" in fallo_init_v3.stderr, fallo_init_v3.stderr
            registrar("inicializador v3 no migra silenciosamente volumen v2")

            # 5. Verificar que la migración rechaza versión desconocida sin mutar datos.
            v.ejecutar(cli_db(db_migrada), "UPDATE hospital_general.modelo_database SET version=99 WHERE id=1;")
            fallo_version = v.ejecutar(cli_db(db_migrada), migracion_sql, esperado=3, nombre="mig_rechazo_version_desconocida")
            assert "VERSION_MODELO_DESCONOCIDA" in fallo_version.stderr, fallo_version.stderr
            v.ejecutar(cli_db(db_migrada), "UPDATE hospital_general.modelo_database SET version=2 WHERE id=1;")
            registrar("migracion rechaza version desconocida sin mutar esquema")

            # 6. Verificar que la migración rechaza deriva de esquema sin sobrescribirla.
            v.ejecutar(cli_db(db_migrada), "ALTER TABLE hospital_general.paciente ADD COLUMN deriva_temporal integer;")
            fallo_deriva = v.ejecutar(cli_db(db_migrada), migracion_sql, esperado=3, nombre="mig_rechazo_deriva")
            assert "MODELO_INCOMPATIBLE_REQUIERE_MIGRACION" in fallo_deriva.stderr, fallo_deriva.stderr
            v.ejecutar(cli_db(db_migrada), "ALTER TABLE hospital_general.paciente DROP COLUMN deriva_temporal;")
            registrar("migracion rechaza deriva de esquema sin sobrescribir")

            # 7. Aplicar migración explícita v2 -> v3 y verificar equivalencia de manifiesto con base nueva v3.
            v.ejecutar(cli_db(db_migrada), migracion_sql, nombre="mig_aplicar_001")
            huella_migrada_v3 = v.ejecutar(
                cli_db(db_migrada),
                "SELECT version || ':' || huella FROM hospital_general.modelo_database WHERE id=1;"
            ).stdout.strip()
            assert huella_migrada_v3 == huella_nueva_v3, (
                f"Manifiesto migrado ({huella_migrada_v3}) difiere de instalación limpia ({huella_nueva_v3})"
            )
            registrar("migracion v2 -> v3 iguala manifiesto y huella de instalacion limpia v3", huella_migrada_v3)

            # 8. Comprobar idempotencia de la migración y reejecución compatible del inicializador v3.
            v.ejecutar(cli_db(db_migrada), migracion_sql, nombre="mig_idempotencia_001")
            v.ejecutar(cli_db(db_migrada), esquema_v3, nombre="mig_reejecucion_inicializador_v3")
            registrar("idempotencia de migracion y reejecucion compatible de inicializador v3")

            # 9. Verificar preservación de datos previos y flujos clínicos tras migrar.
            v.ejecutar(
                cli_db(db_migrada),
                """
                SET search_path TO hospital_general, public;
                UPDATE consulta SET estado='FINALIZADA', notas_medicas='FINALIZADA TRAS MIGRACION' WHERE id_consulta=41001;
                INSERT INTO revisiones(id_revision,tipo_recurso,recurso_id,version,id_usuario,motivo,contenido_anterior)
                SELECT gen_random_uuid(),'consulta',id_publico,revision,41001,'CORRECCION POST MIGRACION',to_jsonb(c)
                FROM consulta c WHERE id_consulta=41002;
                UPDATE consulta SET revision=revision+1, observaciones='CORREGIDA TRAS MIGRACION' WHERE id_consulta=41002;
                """,
                nombre="mig_flujos_exitosos_post_migracion"
            )
            fallo_nueva = v.ejecutar(
                cli_db(db_migrada),
                "INSERT INTO hospital_general.consulta(id_historial,id_personal_atendio,motivo_consulta) VALUES(41001,41001,'NUEVA RECHAZADA');",
                esperado=3,
                nombre="mig_rechazo_nueva_consulta_post_migracion"
            )
            assert "HISTORIAL_INACTIVO" in fallo_nueva.stderr, fallo_nueva.stderr

            conteos = v.ejecutar(
                cli_db(db_migrada),
                """
                SET search_path TO hospital_general, public;
                SELECT json_build_object(
                  'pacientes', (SELECT count(*) FROM paciente WHERE id_paciente=41001),
                  'consultas_finalizadas', (SELECT count(*) FROM consulta WHERE id_historial=41001 AND estado='FINALIZADA'),
                  'revision_consulta_41002', (SELECT revision FROM consulta WHERE id_consulta=41002),
                  'recetas', (SELECT count(*) FROM receta WHERE id_receta=41001),
                  'revisiones', (SELECT count(*) FROM revisiones WHERE id_usuario=41001),
                  'auditoria', (SELECT count(*) FROM auditoria WHERE id_auditoria=41001),
                  'operaciones', (SELECT count(*) FROM operaciones WHERE clave='idem-mig-41001')
                )::text;
                """
            ).stdout.strip()
            datos_conteos = json.loads(conteos)
            assert datos_conteos == {
                "pacientes": 1,
                "consultas_finalizadas": 2,
                "revision_consulta_41002": 2,
                "recetas": 1,
                "revisiones": 1,
                "auditoria": 1,
                "operaciones": 1,
            }, f"Conteos inesperados tras migración: {datos_conteos}"
            registrar("preservacion integra de datos, revisiones, auditoria y operaciones tras migrar", conteos)

            # 10. Verificar reversión no destructiva v3 -> v2 y remigración v2 -> v3 sin pérdida de datos.
            v.ejecutar(cli_db(db_migrada), reversion_sql, nombre="mig_reversion_v3_a_v2")
            huella_revertida = v.ejecutar(
                cli_db(db_migrada),
                "SELECT version || ':' || huella FROM hospital_general.modelo_database WHERE id=1;"
            ).stdout.strip()
            assert huella_revertida == huella_v2, f"Huella tras revertir ({huella_revertida}) != huella v2 ({huella_v2})"
            v.ejecutar(cli_db(db_migrada), migracion_sql, nombre="mig_remigracion_v2_a_v3")
            conteos_post_reversion = json.loads(v.ejecutar(
                cli_db(db_migrada),
                """
                SET search_path TO hospital_general, public;
                SELECT json_build_object(
                  'pacientes', (SELECT count(*) FROM paciente WHERE id_paciente=41001),
                  'consultas_finalizadas', (SELECT count(*) FROM consulta WHERE id_historial=41001 AND estado='FINALIZADA'),
                  'revisiones', (SELECT count(*) FROM revisiones WHERE id_usuario=41001),
                  'auditoria', (SELECT count(*) FROM auditoria WHERE id_auditoria=41001),
                  'operaciones', (SELECT count(*) FROM operaciones WHERE clave='idem-mig-41001')
                )::text;
                """
            ).stdout.strip())
            assert conteos_post_reversion == {
                "pacientes": 1,
                "consultas_finalizadas": 2,
                "revisiones": 1,
                "auditoria": 1,
                "operaciones": 1,
            }, f"Pérdida de datos tras reversión/remigración: {conteos_post_reversion}"
            registrar("reversion v3 -> v2 y remigracion v2 -> v3 sin perdida de datos")

            # 11. Ejecutar las 33 regresiones PG y las 8 regresiones de archivo/propiedad sobre la base migrada.
            v.ejecutar(cli_db(db_migrada), regresiones_sql, nombre="mig_33_regresiones_en_base_migrada")
            v.ejecutar(cli_db(db_migrada), regresiones_archivo_sql, nombre="mig_8_regresiones_archivo_en_base_migrada")
            v.ejecutar(cli_db(db_nueva), regresiones_archivo_sql, nombre="mig_8_regresiones_archivo_en_base_nueva")
            registrar("33 regresiones PG + 8 regresiones de archivo en base nueva y base migrada")
        finally:
            if iniciado:
                v.ejecutar([base / "pg_ctl", "-D", datos, "stop", "-m", "fast"])

    resumen = {
        "estado": "PASS",
        "comprobaciones": comprobaciones,
        "cluster_temporal_eliminado": True,
    }
    (evidencias_dir / "resultado.json").write_text(json.dumps(resumen, indent=2, ensure_ascii=False) + "\n")
    return resumen


def main() -> int:
    ejecutar_pruebas_migracion()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
