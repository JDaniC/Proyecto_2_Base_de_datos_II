-- SOLO para un cluster temporal NUEVO. Ejecutar primero el esquema del hospital.
-- No apunta a conexiones existentes ni debe ejecutarse en una base compartida.
-- FAIL significa que el esquema acepta una entrada que viola la regla indicada.
\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN IF current_database() !~ '^bdii_test_' THEN RAISE EXCEPTION 'SOLO_BASE_TEMPORAL_BDII_TEST'; END IF; END $$;
SET LOCAL search_path TO hospital_general, public;
CREATE FUNCTION pg_temp.rechaza(sentencia text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sentencia;
  RAISE SQLSTATE 'Z0001'; -- Revertir tambien entradas que se aceptaron indebidamente.
EXCEPTION WHEN SQLSTATE 'Z0001' THEN RETURN false;
WHEN integrity_constraint_violation THEN
  RETURN true;
END;
$$;
CREATE TEMP TABLE resultados_auditoria (caso text, estado text);
INSERT INTO paciente(id_paciente, primer_nombre, primer_apellido) VALUES
 (10001,'SinteticoA','Prueba'),(10002,'SinteticoB','Prueba'),(10003,'SinteticoC','Prueba');
INSERT INTO historial_clinico(id_historial,id_paciente,numero_historial) VALUES
 (10001,10001,'AUD-A'),(10002,10002,'AUD-B');
INSERT INTO personal_medico(id_personal,primer_nombre,primer_apellido) VALUES (10001,'Sintetico','Prueba');
INSERT INTO cita(id_cita,id_paciente,id_personal_programado,fecha_hora_inicio,motivo_solicitud,estado_cita)
 VALUES (10001,10001,10001,'2026-10-19 10:00','SINTETICO','PROGRAMADA');
INSERT INTO cita(id_cita,id_paciente,id_personal_programado,fecha_hora_inicio,motivo_solicitud,estado_cita)
 VALUES (10002,10001,10001,'2026-10-19 11:00','SINTETICO','PROGRAMADA');
INSERT INTO consulta(id_consulta,id_historial,id_personal_atendio,motivo_consulta)
 VALUES (10001,10001,10001,'SINTETICO'),(10002,10002,10001,'SINTETICO');
INSERT INTO consulta(id_consulta,id_historial,id_personal_atendio,id_cita,motivo_consulta)
 VALUES (10003,10001,10001,10002,'SINTETICO');
INSERT INTO cita(id_cita,id_paciente,id_personal_programado,fecha_hora_inicio,motivo_solicitud,estado_cita) VALUES (10004,10001,10001,'2026-10-19 12:00','SINTETICO','CANCELADA');
INSERT INTO catalogo_diagnostico(id_catalogo_diagnostico,codigo,nombre) VALUES (10001,'AUD','SINTETICO');
INSERT INTO diagnostico(id_diagnostico,id_consulta,id_catalogo_diagnostico,es_principal) VALUES (10001,10001,10001,true);
INSERT INTO tratamiento(id_tratamiento,id_consulta,descripcion) VALUES (10001,10002,'SINTETICO');
INSERT INTO hospitalizacion(id_hospitalizacion,id_paciente,id_personal_responsable_ingreso,fecha_ingreso,motivo_ingreso)
 VALUES (10001,10001,10001,'2026-10-19 08:00','SINTETICO'),(10002,10002,10001,'2026-10-19 08:00','SINTETICO');
INSERT INTO habitacion(id_habitacion,numero) VALUES (10001,'AUD');
INSERT INTO cama(id_cama,id_habitacion,numero_cama) VALUES (10001,10001,'AUD');
INSERT INTO asignacion_cama(id_hospitalizacion,id_cama,fecha_hora_inicio) VALUES (10001,10001,'2026-10-19 08:00');

INSERT INTO resultados_auditoria SELECT 'PG01 consulta con cita de otro paciente',
 CASE WHEN pg_temp.rechaza($q$INSERT INTO consulta(id_historial,id_personal_atendio,id_cita,motivo_consulta) VALUES(10002,10001,10001,'SINTETICO')$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG02 hospitalizacion_consulta de otro paciente',
 CASE WHEN pg_temp.rechaza($q$INSERT INTO hospitalizacion_consulta(id_consulta,id_hospitalizacion) VALUES(10002,10001)$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG03 hospitalizacion_diagnostico de otro paciente',
 CASE WHEN pg_temp.rechaza($q$INSERT INTO hospitalizacion_diagnostico(id_hospitalizacion,id_diagnostico) VALUES(10002,10001)$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG04 tratamiento y diagnostico de consultas distintas',
 CASE WHEN pg_temp.rechaza($q$INSERT INTO diagnostico_tratamiento(id_diagnostico,id_tratamiento) VALUES(10001,10001)$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG05 dos ocupaciones abiertas de la misma cama',
 CASE WHEN pg_temp.rechaza($q$INSERT INTO asignacion_cama(id_hospitalizacion,id_cama,fecha_hora_inicio) VALUES(10002,10001,'2026-10-19 09:00')$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG06 segunda consulta para la misma cita',
 CASE WHEN pg_temp.rechaza($q$INSERT INTO consulta(id_historial,id_personal_atendio,id_cita,motivo_consulta) VALUES(10001,10001,10002,'SINTETICO')$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG07 estado de historial fuera del catalogo',
 CASE WHEN pg_temp.rechaza($q$UPDATE historial_clinico SET estado_historial='INVENTADO' WHERE id_historial=10001$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG08 codigo de diagnostico duplicado con sistema/version NULL',
 CASE WHEN pg_temp.rechaza($q$INSERT INTO catalogo_diagnostico(codigo,nombre) VALUES('AUD','SINTETICO DUPLICADO')$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG09 peso negativo rechazado (control)',
 CASE WHEN pg_temp.rechaza($q$INSERT INTO signos_vitales(id_consulta,peso_kg) VALUES(10001,-1)$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG10 historial duplicado rechazado (control)',
 CASE WHEN pg_temp.rechaza($q$INSERT INTO historial_clinico(id_paciente,numero_historial) VALUES(10001,'AUD-DUP')$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG11 consulta con historial inexistente rechazada (control)',
 CASE WHEN pg_temp.rechaza($q$INSERT INTO consulta(id_historial,id_personal_atendio,motivo_consulta) VALUES(99999,10001,'SINTETICO')$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG12 consulta de cita cancelada', CASE WHEN pg_temp.rechaza($q$INSERT INTO consulta(id_historial,id_personal_atendio,id_cita,motivo_consulta) VALUES(10001,10001,10004,'SINTETICO')$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG13 no reasignar historial', CASE WHEN pg_temp.rechaza($q$UPDATE historial_clinico SET id_paciente=10003 WHERE id_historial=10001$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG14 no reasignar diagnostico', CASE WHEN pg_temp.rechaza($q$UPDATE diagnostico SET id_consulta=10002 WHERE id_diagnostico=10001$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG15 no reasignar tratamiento', CASE WHEN pg_temp.rechaza($q$UPDATE tratamiento SET id_consulta=10001 WHERE id_tratamiento=10001$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG16 no reasignar hospitalizacion', CASE WHEN pg_temp.rechaza($q$UPDATE hospitalizacion SET id_paciente=10002 WHERE id_hospitalizacion=10001$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG17 no reasignar consulta', CASE WHEN pg_temp.rechaza($q$UPDATE consulta SET id_historial=10002 WHERE id_consulta=10001$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG18 no cancelar cita atendida', CASE WHEN pg_temp.rechaza($q$UPDATE cita SET estado_cita='CANCELADA' WHERE id_cita=10002$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG19 no invertir intervalo cama', CASE WHEN pg_temp.rechaza($q$INSERT INTO asignacion_cama(id_hospitalizacion,id_cama,fecha_hora_inicio,fecha_hora_fin) VALUES(10002,10001,'2026-10-19 09:00','2026-10-19 08:00')$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG20 no intervalo vacio', CASE WHEN pg_temp.rechaza($q$INSERT INTO asignacion_cama(id_hospitalizacion,id_cama,fecha_hora_inicio,fecha_hora_fin) VALUES(10002,10001,'2026-10-19 09:00','2026-10-19 09:00')$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG21 un principal maximo', CASE WHEN pg_temp.rechaza($q$INSERT INTO diagnostico(id_consulta,id_catalogo_diagnostico,es_principal) VALUES(10001,10001,true)$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG22 principal requerido al confirmar', CASE WHEN pg_temp.rechaza($q$UPDATE diagnostico SET es_principal=false WHERE id_diagnostico=10001; SET CONSTRAINTS tr_principal_diferido IMMEDIATE$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG23 vinculo hospital consulta del mismo paciente', CASE WHEN pg_temp.rechaza($q$INSERT INTO hospitalizacion_consulta(id_consulta,id_hospitalizacion) VALUES(10001,10001)$q$) THEN 'FAIL' ELSE 'PASS' END;
INSERT INTO resultados_auditoria SELECT 'PG24 consulta sin cita valida', CASE WHEN pg_temp.rechaza($q$INSERT INTO consulta(id_historial,id_personal_atendio,motivo_consulta) VALUES(10001,10001,'SINTETICO')$q$) THEN 'FAIL' ELSE 'PASS' END;
INSERT INTO cama(id_cama,id_habitacion,numero_cama) VALUES(10002,10001,'AUD2');
INSERT INTO hospitalizacion(id_hospitalizacion,id_paciente,id_personal_responsable_ingreso,fecha_ingreso,motivo_ingreso) VALUES(10003,10001,10001,'2026-10-19 08:00','SINTETICO');
INSERT INTO asignacion_cama(id_hospitalizacion,id_cama,fecha_hora_inicio,fecha_hora_fin) VALUES(10003,10002,'2026-10-19 08:00','2026-10-19 09:00');
INSERT INTO resultados_auditoria SELECT 'PG25 traslado contiguo permitido', CASE WHEN pg_temp.rechaza($q$INSERT INTO asignacion_cama(id_hospitalizacion,id_cama,fecha_hora_inicio,fecha_hora_fin) VALUES(10002,10002,'2026-10-19 09:00','2026-10-19 10:00')$q$) THEN 'FAIL' ELSE 'PASS' END;
INSERT INTO resultados_auditoria SELECT 'PG26 misma hospitalizacion en dos camas', CASE WHEN pg_temp.rechaza($q$INSERT INTO asignacion_cama(id_hospitalizacion,id_cama,fecha_hora_inicio) VALUES(10001,10002,'2026-10-19 09:00')$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO usuario(id_usuario,nombre_usuario,auth_uid) VALUES(10001,'AUD','AUD-SINTETICO');
INSERT INTO receta(id_receta,id_consulta,id_personal_prescriptor,estado,contenido_historico) VALUES(10001,10001,10001,'EMITIDA','{"prescriptor_nombre_historico":"SINTETICO","colegiado_historico":"AUD","medicamentos":[{"medicamento_id":"SINTETICO","nombre":"SINTETICO","presentacion":"SINTETICO","concentracion":"SINTETICO","dosis":"SINTETICO","frecuencia":"SINTETICO","duracion":"SINTETICO","via":"SINTETICO","indicaciones":"SINTETICO"}]}'::jsonb);
INSERT INTO auditoria(id_auditoria,id_usuario,accion,tabla_afectada) VALUES(10001,10001,'SINTETICO','receta');
INSERT INTO resultados_auditoria SELECT 'PG27 receta emitida incompleta',CASE WHEN pg_temp.rechaza($q$INSERT INTO receta(id_consulta,id_personal_prescriptor,estado,contenido_historico) VALUES(10002,10001,'EMITIDA','{"medicamentos":[{}]}'::jsonb)$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG28 no cambiar receta emitida sin revision',CASE WHEN pg_temp.rechaza($q$UPDATE receta SET contenido_historico=jsonb_set(contenido_historico,'{colegiado_historico}', '"OTRO"') WHERE id_receta=10001$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG29 no borrar receta emitida',CASE WHEN pg_temp.rechaza($q$DELETE FROM receta WHERE id_receta=10001$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG30 auditoria append only',CASE WHEN pg_temp.rechaza($q$UPDATE auditoria SET accion='OTRA' WHERE id_auditoria=10001$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG31 archivo exige evidencia',CASE WHEN pg_temp.rechaza($q$UPDATE historial_clinico SET estado_historial='ARCHIVADO' WHERE id_historial=10001$q$) THEN 'PASS' ELSE 'FAIL' END;
INSERT INTO resultados_auditoria SELECT 'PG32 archivo documentado permitido',CASE WHEN pg_temp.rechaza($q$UPDATE historial_clinico SET estado_historial='ARCHIVADO',causa_baja='TRASLADO',motivo_baja='SINTETICO',fecha_baja=CURRENT_TIMESTAMP,actor_baja=(SELECT id_publico FROM usuario WHERE id_usuario=10001) WHERE id_historial=10001$q$) THEN 'FAIL' ELSE 'PASS' END;
INSERT INTO resultados_auditoria SELECT 'PG33 correccion receta conserva anterior',CASE WHEN pg_temp.rechaza($q$INSERT INTO revisiones(id_revision,tipo_recurso,recurso_id,version,id_usuario,motivo,contenido_anterior) SELECT gen_random_uuid(),'receta',id_publico,revision,10001,'SINTETICO',contenido_historico FROM receta WHERE id_receta=10001; UPDATE receta SET revision=revision+1,contenido_historico=jsonb_set(contenido_historico,'{colegiado_historico}','"OTRO"') WHERE id_receta=10001$q$) THEN 'FAIL' ELSE 'PASS' END;
SELECT * FROM resultados_auditoria ORDER BY caso;
SELECT estado,count(*) FROM resultados_auditoria GROUP BY estado ORDER BY estado;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM resultados_auditoria WHERE estado<>'PASS') THEN RAISE EXCEPTION 'REGRESION_DATABASE'; END IF; END $$;
ROLLBACK;
