-- Reversion explicita 001 (v3 -> v2): restaurar definicion v2 de validar_relaciones_clinicas en PostgreSQL.
-- No destructiva: no elimina tablas, volumenes ni registros clinicos, revisiones, operaciones o auditoria.
-- Ejecutar con usuario administrativo (postgres_admin) y ON_ERROR_STOP=1.

BEGIN;

SET LOCAL search_path TO hospital_general, public;
SELECT pg_advisory_xact_lock(hashtext('bdii_hospital_inicializador_v2'));

CREATE OR REPLACE FUNCTION pg_temp.huella_hospital() RETURNS text LANGUAGE sql AS $$
 SELECT md5(coalesce(string_agg(objeto,E'\n' ORDER BY objeto),'')) FROM (
  SELECT 'C:'||c.relname||':'||a.attnum||':'||a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||a.attidentity::text||':'||a.attgenerated::text||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),'') AS objeto
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid
   LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
   WHERE n.nspname='hospital_general' AND c.relkind IN('r','p') AND a.attnum>0 AND NOT a.attisdropped
  UNION ALL SELECT 'K:'||c.relname||':'||k.conname||':'||pg_get_constraintdef(k.oid) FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='hospital_general'
  UNION ALL SELECT 'I:'||i.indisvalid||':'||pg_get_indexdef(i.indexrelid) FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='hospital_general'
  UNION ALL SELECT 'T:'||t.tgenabled::text||':'||pg_get_triggerdef(t.oid) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='hospital_general' AND NOT t.tgisinternal
  UNION ALL SELECT 'F:'||pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='hospital_general' AND p.prokind='f'
 ) estructura;
$$;

DO $$
DECLARE
  version_actual integer;
  huella_actual text;
BEGIN
  IF to_regclass('hospital_general.modelo_database') IS NULL THEN
    RAISE EXCEPTION 'ESQUEMA_SIN_MANIFIESTO_NO_MIGRABLE' USING ERRCODE='23514';
  END IF;

  SELECT version, huella INTO version_actual, huella_actual
  FROM hospital_general.modelo_database
  WHERE id = 1
  FOR UPDATE;

  IF version_actual IS NULL THEN
    RAISE EXCEPTION 'ESQUEMA_SIN_MANIFIESTO_NO_MIGRABLE' USING ERRCODE='23514';
  END IF;

  IF version_actual NOT IN (2, 3) THEN
    RAISE EXCEPTION 'VERSION_MODELO_DESCONOCIDA' USING ERRCODE='23514';
  END IF;

  IF huella_actual IS DISTINCT FROM pg_temp.huella_hospital() THEN
    RAISE EXCEPTION 'MODELO_INCOMPATIBLE_REQUIERE_MIGRACION' USING ERRCODE='23514';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION validar_relaciones_clinicas() RETURNS trigger LANGUAGE plpgsql
SET search_path = hospital_general, pg_temp AS $$
DECLARE paciente_a bigint; paciente_b bigint; consulta_a bigint; consulta_b bigint; estado_cita_actual text; estado_historial_actual text;
BEGIN
  IF TG_TABLE_NAME = 'consulta' THEN
    SELECT id_paciente,estado_historial INTO paciente_a,estado_historial_actual FROM historial_clinico WHERE id_historial=NEW.id_historial FOR SHARE;
    IF estado_historial_actual IS DISTINCT FROM 'ACTIVO' THEN RAISE EXCEPTION 'HISTORIAL_INACTIVO' USING ERRCODE='23514'; END IF;
    IF NEW.id_cita IS NOT NULL THEN
      SELECT id_paciente,estado_cita INTO paciente_b,estado_cita_actual FROM cita WHERE id_cita=NEW.id_cita FOR UPDATE;
      IF paciente_a IS DISTINCT FROM paciente_b OR estado_cita_actual='CANCELADA' THEN
        RAISE EXCEPTION 'CITA_PACIENTE_O_ESTADO_INCOMPATIBLE' USING ERRCODE='23514';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'diagnostico_tratamiento' THEN
    SELECT id_consulta INTO consulta_a FROM diagnostico WHERE id_diagnostico=NEW.id_diagnostico FOR SHARE;
    SELECT id_consulta INTO consulta_b FROM tratamiento WHERE id_tratamiento=NEW.id_tratamiento FOR SHARE;
    IF consulta_a IS DISTINCT FROM consulta_b THEN
      RAISE EXCEPTION 'DIAGNOSTICO_TRATAMIENTO_INCOMPATIBLE' USING ERRCODE='23514';
    END IF;
  ELSE
    SELECT id_paciente INTO paciente_a FROM hospitalizacion WHERE id_hospitalizacion=NEW.id_hospitalizacion FOR SHARE;
    IF TG_TABLE_NAME = 'hospitalizacion_consulta' THEN
      consulta_a := NEW.id_consulta;
    ELSE
      SELECT id_consulta INTO consulta_a FROM diagnostico WHERE id_diagnostico=NEW.id_diagnostico FOR SHARE;
    END IF;
    SELECT h.id_paciente INTO paciente_b FROM consulta c JOIN historial_clinico h USING(id_historial)
      WHERE c.id_consulta=consulta_a FOR SHARE OF c,h;
    IF paciente_a IS DISTINCT FROM paciente_b THEN
      RAISE EXCEPTION 'HOSPITALIZACION_PACIENTE_INCOMPATIBLE' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tr_consulta_relaciones BEFORE INSERT OR UPDATE ON consulta FOR EACH ROW EXECUTE FUNCTION validar_relaciones_clinicas();
CREATE OR REPLACE TRIGGER tr_consulta_propietario BEFORE UPDATE ON consulta FOR EACH ROW EXECUTE FUNCTION impedir_reasignacion('id_historial','id_cita');

UPDATE modelo_database
SET version = 2,
    huella = pg_temp.huella_hospital()
WHERE id = 1;

COMMIT;
