-- Migración explícita 002 (hospital): poblar identidades normalizadas de pacientes existentes con CUI (E02-P1-02).
-- Idempotente y no destructiva: preserva todas las filas previas.
-- Ejecutar con usuario administrativo (postgres_admin) y ON_ERROR_STOP=1.

BEGIN;

SET LOCAL search_path TO hospital_general, public;
SELECT pg_advisory_xact_lock(hashtext('bdii_hospital_inicializador_v2'));

INSERT INTO identidades_paciente (clave, tipo_documento, numero_documento, id_paciente)
SELECT
  encode(sha256(('CUI:' || regexp_replace(p.cui, '[^0-9]', '', 'g'))::bytea), 'hex'),
  'CUI',
  regexp_replace(p.cui, '[^0-9]', '', 'g'),
  p.id_paciente
FROM paciente p
WHERE p.cui IS NOT NULL AND LENGTH(TRIM(regexp_replace(p.cui, '[^0-9]', '', 'g'))) = 13
ON CONFLICT (clave) DO NOTHING;

COMMIT;
