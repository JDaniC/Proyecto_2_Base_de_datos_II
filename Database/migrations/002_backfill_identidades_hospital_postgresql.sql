-- Migración explícita 002 (hospital): poblar identidades normalizadas y contacto de emergencia activo (E02-P1-02).
-- Idempotente y no destructiva: preserva todas las filas previas y restaura respaldos existentes en revisiones únicamente al recrear columnas.
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
  columnas_existian boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'hospital_general' AND table_name = 'paciente' AND column_name = 'clave_identidad_activa'
  ) INTO columnas_existian;

  IF NOT columnas_existian THEN
    ALTER TABLE paciente ADD COLUMN clave_identidad_activa CHAR(64) DEFAULT NULL;
    ALTER TABLE paciente ADD COLUMN id_contacto_emergencia_activo BIGINT DEFAULT NULL;

    -- 1. Restaurar valores respaldados en revisiones si existen (ciclo de reversión previo)
    UPDATE paciente p
    SET
      clave_identidad_activa = CASE
        WHEN (r.contenido_anterior ? 'clave_identidad_activa') THEN (r.contenido_anterior->>'clave_identidad_activa')
        ELSE p.clave_identidad_activa
      END,
      id_contacto_emergencia_activo = CASE
        WHEN (r.contenido_anterior ? 'id_contacto_emergencia_activo') THEN (r.contenido_anterior->>'id_contacto_emergencia_activo')::bigint
        ELSE p.id_contacto_emergencia_activo
      END
    FROM (
      SELECT
        recurso_id,
        contenido_anterior,
        ROW_NUMBER() OVER (
          PARTITION BY recurso_id
          ORDER BY fecha_hora DESC, version DESC
        ) AS rn
      FROM revisiones
      WHERE tipo_recurso = 'paciente_punteros_v3'
    ) r
    WHERE r.rn = 1 AND r.recurso_id = p.id_publico;

    -- 2. Inicializar clave_identidad_activa para pacientes existentes durante la primera migración
    -- seleccionando la reserva de identidad más reciente (CUI, pasaporte u otro) si no provienen de un respaldo previo
    UPDATE paciente p
    SET clave_identidad_activa = ip.clave
    FROM (
      SELECT id_paciente, clave,
             ROW_NUMBER() OVER (PARTITION BY id_paciente ORDER BY fecha_registro DESC, clave ASC) AS rn
      FROM identidades_paciente
    ) ip
    WHERE ip.id_paciente = p.id_paciente AND ip.rn = 1
      AND p.clave_identidad_activa IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM revisiones r
        WHERE r.tipo_recurso = 'paciente_punteros_v3' AND r.recurso_id = p.id_publico
      );

    -- 3. Inicializar id_contacto_emergencia_activo para pacientes existentes durante la primera migración
    -- si no provienen de un respaldo previo
    UPDATE paciente p
    SET id_contacto_emergencia_activo = ce.id_contacto
    FROM (
      SELECT DISTINCT ON (id_paciente) id_paciente, id_contacto
      FROM contacto_emergencia
      ORDER BY id_paciente, id_contacto ASC
    ) ce
    WHERE ce.id_paciente = p.id_paciente
      AND p.id_contacto_emergencia_activo IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM revisiones r
        WHERE r.tipo_recurso = 'paciente_punteros_v3' AND r.recurso_id = p.id_publico
      );
  END IF;
END $$;

-- 4. Asegurar que pacientes con CUI preexistente cuenten con fila en identidades_paciente
INSERT INTO identidades_paciente (clave, tipo_documento, numero_documento, id_paciente)
SELECT
  encode(sha256(('CUI:' || regexp_replace(p.cui, '[^0-9]', '', 'g'))::bytea), 'hex'),
  'CUI',
  regexp_replace(p.cui, '[^0-9]', '', 'g'),
  p.id_paciente
FROM paciente p
WHERE p.cui IS NOT NULL AND LENGTH(TRIM(regexp_replace(p.cui, '[^0-9]', '', 'g'))) = 13
ON CONFLICT (clave) DO NOTHING;

-- 5. Actualizar el manifiesto para mantener compatibilidad exacta con el inicializador canónico v3
UPDATE modelo_database
SET huella = pg_temp.huella_hospital()
WHERE id = 1;

COMMIT;
