-- Migracion explicita 001 (v2 -> v3): corregir archivo de historiales en PostgreSQL (A-F01 / E00-P1-02).
-- No destructiva: preserva todas las tablas, filas clinicas, revisiones, operaciones y auditoria.
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
  definicion_funcion text;
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

  IF to_regprocedure('hospital_general.validar_relaciones_clinicas()') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM pg_trigger
       WHERE tgrelid = 'hospital_general.consulta'::regclass
         AND tgname = 'tr_consulta_relaciones'
         AND tgenabled = 'O'
     )
     OR NOT EXISTS (
       SELECT 1 FROM pg_trigger
       WHERE tgrelid = 'hospital_general.consulta'::regclass
         AND tgname = 'tr_consulta_propietario'
         AND tgenabled = 'O'
     ) THEN
    RAISE EXCEPTION 'MODELO_INCOMPATIBLE_REQUIERE_MIGRACION' USING ERRCODE='23514';
  END IF;

  definicion_funcion := pg_get_functiondef('hospital_general.validar_relaciones_clinicas()'::regprocedure);
  IF version_actual = 2 AND position('CORRECCION_CONSULTA_REQUIERE_REVISION' IN definicion_funcion) > 0 THEN
    RAISE EXCEPTION 'MODELO_INCOMPATIBLE_REQUIERE_MIGRACION' USING ERRCODE='23514';
  END IF;
  IF version_actual = 3 AND position('CORRECCION_CONSULTA_REQUIERE_REVISION' IN definicion_funcion) = 0 THEN
    RAISE EXCEPTION 'MODELO_INCOMPATIBLE_REQUIERE_MIGRACION' USING ERRCODE='23514';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION validar_relaciones_clinicas() RETURNS trigger LANGUAGE plpgsql
SET search_path = hospital_general, pg_temp AS $$
DECLARE paciente_a bigint; paciente_b bigint; consulta_a bigint; consulta_b bigint; estado_cita_actual text; estado_historial_actual text;
BEGIN
  IF TG_TABLE_NAME = 'consulta' THEN
    SELECT id_paciente,estado_historial INTO paciente_a,estado_historial_actual FROM historial_clinico WHERE id_historial=NEW.id_historial FOR SHARE;
    IF TG_OP = 'INSERT' THEN
      IF estado_historial_actual IS DISTINCT FROM 'ACTIVO' THEN RAISE EXCEPTION 'HISTORIAL_INACTIVO' USING ERRCODE='23514'; END IF;
    ELSE
      IF NEW.id_historial IS DISTINCT FROM OLD.id_historial OR NEW.id_cita IS DISTINCT FROM OLD.id_cita
         OR NEW.id_personal_atendio IS DISTINCT FROM OLD.id_personal_atendio OR NEW.id_publico IS DISTINCT FROM OLD.id_publico THEN
        RAISE EXCEPTION 'RELACION_CLINICA_INMUTABLE' USING ERRCODE='23514';
      END IF;
      IF OLD.estado = 'FINALIZADA' THEN
        IF NEW.estado <> 'FINALIZADA' OR NEW.revision <> OLD.revision + 1 OR NOT EXISTS(
          SELECT 1 FROM revisiones WHERE tipo_recurso='consulta' AND recurso_id=OLD.id_publico
           AND version=OLD.revision AND contenido_anterior=to_jsonb(OLD)) THEN
          RAISE EXCEPTION 'CORRECCION_CONSULTA_REQUIERE_REVISION' USING ERRCODE='23514';
        END IF;
      ELSIF estado_historial_actual IS DISTINCT FROM 'ACTIVO' AND NEW.estado <> 'FINALIZADA' THEN
        RAISE EXCEPTION 'HISTORIAL_INACTIVO' USING ERRCODE='23514';
      END IF;
    END IF;
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
SET version = 3,
    huella = pg_temp.huella_hospital()
WHERE id = 1;

DO $$
DECLARE
  version_final integer;
  huella_final text;
BEGIN
  SELECT version, huella INTO version_final, huella_final
  FROM hospital_general.modelo_database
  WHERE id = 1;
  IF version_final IS DISTINCT FROM 3 OR huella_final IS DISTINCT FROM pg_temp.huella_hospital() THEN
    RAISE EXCEPTION 'MIGRACION_MANIFIESTO_INCONSISTENTE' USING ERRCODE='23514';
  END IF;
END $$;

COMMIT;
