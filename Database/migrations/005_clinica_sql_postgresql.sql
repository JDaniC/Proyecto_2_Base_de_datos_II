-- Migración explícita 005 (v3 -> v4): extensión clínica SQL del Hospital General (E03-P1-02).
-- Aditiva y transaccional. No borra columnas, filas, revisiones ni auditoría.
-- Añade agenda con duración/consultorio/cancelación, instantánea histórica del
-- profesional en la consulta y metadatos históricos por componente clínico.
BEGIN;
SET LOCAL search_path TO hospital_general, public;
SELECT pg_advisory_xact_lock(hashtext('bdii_hospital_migracion_clinica_v4'));

-- Misma huella que el inicializador; el cuerpo no forma parte del hash (pg_temp).
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
DECLARE version_actual integer; huella_actual text;
BEGIN
 IF to_regclass('hospital_general.modelo_database') IS NULL THEN
   RAISE EXCEPTION 'ESQUEMA_SIN_MANIFIESTO_NO_MIGRABLE';
 END IF;
 SELECT version,huella INTO version_actual,huella_actual FROM hospital_general.modelo_database WHERE id=1;
 IF version_actual IS DISTINCT FROM 3 AND version_actual IS DISTINCT FROM 4 THEN
   RAISE EXCEPTION 'VERSION_MODELO_DESCONOCIDA';
 END IF;
 IF huella_actual IS DISTINCT FROM pg_temp.huella_hospital() THEN
   RAISE EXCEPTION 'MODELO_INCOMPATIBLE_REQUIERE_MIGRACION';
 END IF;
END $$;

ALTER TABLE hospital_general.cita ADD COLUMN IF NOT EXISTS duracion_minutos SMALLINT;
ALTER TABLE hospital_general.cita ADD COLUMN IF NOT EXISTS consultorio VARCHAR(100);
ALTER TABLE hospital_general.cita ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT;
ALTER TABLE hospital_general.cita ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE hospital_general.consulta ADD COLUMN IF NOT EXISTS profesional_historico JSONB;
ALTER TABLE hospital_general.consulta ADD COLUMN IF NOT EXISTS campos_signos JSONB;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='hospital_general.consulta'::regclass AND conname='chk_consulta_campos_signos') THEN
  ALTER TABLE hospital_general.consulta ADD CONSTRAINT chk_consulta_campos_signos CHECK (campos_signos IS NULL OR (jsonb_typeof(campos_signos)='array' AND campos_signos <@ '["peso_kg", "talla_cm", "temperatura_c", "presion_sistolica", "presion_diastolica", "frecuencia_cardiaca_lpm", "frecuencia_respiratoria_rpm", "saturacion_oxigeno_pct"]'::jsonb AND jsonb_array_length(campos_signos)<=8));
 END IF;
END $$;
ALTER TABLE hospital_general.diagnostico ADD COLUMN IF NOT EXISTS nombre_historico VARCHAR(200);
ALTER TABLE hospital_general.diagnostico ADD COLUMN IF NOT EXISTS observacion TEXT;
ALTER TABLE hospital_general.diagnostico ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMP;
ALTER TABLE hospital_general.diagnostico ADD COLUMN IF NOT EXISTS autor_historico JSONB;
ALTER TABLE hospital_general.tratamiento ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMP;
ALTER TABLE hospital_general.tratamiento ADD COLUMN IF NOT EXISTS autor_historico JSONB;

DO $$ BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
   WHERE n.nspname='hospital_general' AND t.relname='cita' AND c.conname='chk_cita_duracion'
 ) THEN
   ALTER TABLE hospital_general.cita ADD CONSTRAINT chk_cita_duracion
     CHECK (duracion_minutos IS NULL OR duracion_minutos BETWEEN 5 AND 480);
 END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_cita_personal_fecha ON hospital_general.cita (id_personal_programado, fecha_hora_inicio);

UPDATE hospital_general.modelo_database SET version=4, huella=pg_temp.huella_hospital() WHERE id=1;
COMMIT;
