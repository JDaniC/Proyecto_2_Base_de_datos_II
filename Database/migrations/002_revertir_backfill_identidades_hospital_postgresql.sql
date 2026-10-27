-- Reversión de migración 002 (hospital): no destructiva, conserva las identidades pobladas.

BEGIN;
SET LOCAL search_path TO hospital_general, public;
-- No elimina identidades para preservar el historial clínico.
COMMIT;
