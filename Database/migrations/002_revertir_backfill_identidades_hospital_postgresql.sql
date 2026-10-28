-- Reversión de migración 002 (hospital): respalda punteros activos en revisiones, retira columnas y recalcula la huella del manifiesto.

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

-- Preservar punteros activos en la tabla revisiones para recuperación sin pérdida
INSERT INTO revisiones (
  id_revision, tipo_recurso, recurso_id, version, id_usuario,
  fecha_hora, motivo, contenido_anterior
)
SELECT
  gen_random_uuid(),
  'paciente_punteros_v3',
  p.id_publico,
  p.revision,
  COALESCE((SELECT id_usuario FROM usuario ORDER BY id_usuario ASC LIMIT 1), 1),
  CURRENT_TIMESTAMP,
  'RESPALDO_MIGRACION_002_REVERSION_HOSPITAL',
  jsonb_build_object(
    'clave_identidad_activa', p.clave_identidad_activa,
    'id_contacto_emergencia_activo', p.id_contacto_emergencia_activo
  )
FROM paciente p
WHERE (p.clave_identidad_activa IS NOT NULL OR p.id_contacto_emergencia_activo IS NOT NULL
       OR EXISTS (SELECT 1 FROM identidades_paciente ip WHERE ip.id_paciente = p.id_paciente)
       OR EXISTS (SELECT 1 FROM contacto_emergencia ce WHERE ce.id_paciente = p.id_paciente))
  AND NOT EXISTS (
    SELECT 1 FROM revisiones r
    WHERE r.tipo_recurso = 'paciente_punteros_v3'
      AND r.recurso_id = p.id_publico
      AND r.version = p.revision
  );

ALTER TABLE paciente DROP COLUMN IF EXISTS clave_identidad_activa;
ALTER TABLE paciente DROP COLUMN IF EXISTS id_contacto_emergencia_activo;

UPDATE modelo_database
SET huella = pg_temp.huella_hospital()
WHERE id = 1;

COMMIT;
