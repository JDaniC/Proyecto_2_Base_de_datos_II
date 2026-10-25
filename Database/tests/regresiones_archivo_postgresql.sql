-- Casos de regresion de archivo de historiales y propiedad inmutable en PostgreSQL (E00-P1-02 / A-F01).
-- SOLO para un cluster temporal NUEVO con nombre bdii_test_*.
\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN IF current_database() !~ '^bdii_test_' THEN RAISE EXCEPTION 'SOLO_BASE_TEMPORAL_BDII_TEST'; END IF; END $$;
SET LOCAL search_path TO hospital_general, public;

CREATE FUNCTION pg_temp.rechaza(sentencia text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sentencia;
  RAISE SQLSTATE 'Z0001';
EXCEPTION WHEN SQLSTATE 'Z0001' THEN RETURN false;
WHEN integrity_constraint_violation THEN
  RETURN true;
END;
$$;

CREATE TEMP TABLE resultados_archivo (caso text, estado text);

INSERT INTO paciente(id_paciente, primer_nombre, primer_apellido) VALUES
  (30001, 'SinteticoArchivoA', 'Prueba'),
  (30002, 'SinteticoArchivoB', 'Prueba');
INSERT INTO historial_clinico(id_historial, id_paciente, numero_historial) VALUES
  (30001, 30001, 'ARC-30001'),
  (30002, 30002, 'ARC-30002');
INSERT INTO personal_medico(id_personal, primer_nombre, primer_apellido) VALUES
  (30001, 'MedicoArchivoA', 'Prueba'),
  (30002, 'MedicoArchivoB', 'Prueba');
INSERT INTO usuario(id_usuario, nombre_usuario, auth_uid) VALUES
  (30001, 'USR-ARC-30001', 'UID-ARC-30001');

-- 30001: consulta ABIERTA iniciada antes del archivo; 30002: consulta FINALIZADA antes del archivo.
INSERT INTO consulta(id_consulta, id_historial, id_personal_atendio, motivo_consulta, estado) VALUES
  (30001, 30001, 30001, 'ABIERTA ANTES DE ARCHIVAR', 'ABIERTA'),
  (30002, 30001, 30001, 'FINALIZADA ANTES DE ARCHIVAR', 'FINALIZADA');

-- Archivar el historial 30001 con causa, motivo, fecha y actor validos.
UPDATE historial_clinico
SET estado_historial = 'ARCHIVADO',
    causa_baja = 'TRASLADO',
    motivo_baja = 'PRUEBA SINTETICA DE ARCHIVO',
    fecha_baja = CURRENT_TIMESTAMP,
    actor_baja = (SELECT id_publico FROM usuario WHERE id_usuario = 30001)
WHERE id_historial = 30001;

INSERT INTO resultados_archivo SELECT 'PG-ARC-01 finalizar consulta abierta iniciada antes del archivo',
  CASE WHEN pg_temp.rechaza($q$UPDATE consulta SET estado='FINALIZADA', notas_medicas='CIERRE POST ARCHIVO' WHERE id_consulta=30001$q$) THEN 'FAIL' ELSE 'PASS' END;

INSERT INTO resultados_archivo SELECT 'PG-ARC-02 corregir consulta finalizada con revision tras archivo',
  CASE WHEN pg_temp.rechaza($q$
    INSERT INTO revisiones(id_revision,tipo_recurso,recurso_id,version,id_usuario,motivo,contenido_anterior)
    SELECT gen_random_uuid(),'consulta',id_publico,revision,30001,'CORRECCION AUTORIZADA',to_jsonb(c)
    FROM consulta c WHERE id_consulta=30002;
    UPDATE consulta SET revision=revision+1, observaciones='CORRECCION AUTORIZADA' WHERE id_consulta=30002;
  $q$) THEN 'FAIL' ELSE 'PASS' END;

INSERT INTO resultados_archivo SELECT 'PG-ARC-03 rechazar nueva consulta en historial archivado',
  CASE WHEN pg_temp.rechaza($q$INSERT INTO consulta(id_historial,id_personal_atendio,motivo_consulta) VALUES(30001,30001,'NUEVA TRAS ARCHIVO')$q$) THEN 'PASS' ELSE 'FAIL' END;

INSERT INTO resultados_archivo SELECT 'PG-ARC-04 rechazar mutacion de consulta abierta sin finalizar tras archivo',
  CASE WHEN pg_temp.rechaza($q$UPDATE consulta SET observaciones='SIGUE ABIERTA' WHERE id_consulta=30001$q$) THEN 'PASS' ELSE 'FAIL' END;

INSERT INTO resultados_archivo SELECT 'PG-ARC-05 rechazar correccion de consulta finalizada sin revision',
  CASE WHEN pg_temp.rechaza($q$UPDATE consulta SET revision=revision+1, observaciones='SIN REVISION' WHERE id_consulta=30002$q$) THEN 'PASS' ELSE 'FAIL' END;

INSERT INTO resultados_archivo SELECT 'PG-ARC-06 rechazar reapertura de consulta finalizada',
  CASE WHEN pg_temp.rechaza($q$
    INSERT INTO revisiones(id_revision,tipo_recurso,recurso_id,version,id_usuario,motivo,contenido_anterior)
    SELECT gen_random_uuid(),'consulta',id_publico,revision,30001,'INTENTO REABRIR',to_jsonb(c)
    FROM consulta c WHERE id_consulta=30002;
    UPDATE consulta SET estado='ABIERTA', revision=revision+1 WHERE id_consulta=30002;
  $q$) THEN 'PASS' ELSE 'FAIL' END;

INSERT INTO resultados_archivo SELECT 'PG-ARC-07 rechazar cambio de profesional o id_publico en consulta',
  CASE WHEN pg_temp.rechaza($q$UPDATE consulta SET estado='FINALIZADA', id_personal_atendio=30002 WHERE id_consulta=30001$q$)
        AND pg_temp.rechaza($q$UPDATE consulta SET estado='FINALIZADA', id_publico=gen_random_uuid() WHERE id_consulta=30001$q$)
       THEN 'PASS' ELSE 'FAIL' END;

INSERT INTO resultados_archivo SELECT 'PG-ARC-08 rechazar reasignacion de historial al finalizar consulta',
  CASE WHEN pg_temp.rechaza($q$UPDATE consulta SET estado='FINALIZADA', id_historial=30002 WHERE id_consulta=30001$q$) THEN 'PASS' ELSE 'FAIL' END;

SELECT * FROM resultados_archivo ORDER BY caso;
SELECT estado, count(*) FROM resultados_archivo GROUP BY estado ORDER BY estado;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM resultados_archivo WHERE estado<>'PASS') THEN RAISE EXCEPTION 'REGRESION_ARCHIVO_DATABASE'; END IF; END $$;
ROLLBACK;
