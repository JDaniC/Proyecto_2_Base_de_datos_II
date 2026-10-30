-- Actualización explícita v4 -> v5; conserva las filas clínicas emitidas.
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
DO $$ DECLARE v integer; h text; BEGIN
 SELECT version,huella INTO v,h FROM modelo_database WHERE id=1;
 IF v NOT IN (4,5) OR h IS DISTINCT FROM pg_temp.huella_hospital() THEN RAISE EXCEPTION 'MODELO_INCOMPATIBLE_REQUIERE_MIGRACION'; END IF;
END $$;
ALTER TABLE consulta ADD COLUMN IF NOT EXISTS snapshot_actual JSONB;
UPDATE modelo_database SET version=5, huella=pg_temp.huella_hospital() WHERE id=1;
COMMIT;
