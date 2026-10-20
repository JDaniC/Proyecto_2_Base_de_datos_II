-- Solo en MySQL temporal NUEVO, iniciado por tests/verificar_local.py.
-- El runner debe autorizar esta sesion con @bdii_pruebas_autorizadas=1.
USE clinica_odontologica;
DELIMITER $$
DROP PROCEDURE IF EXISTS _verificar_entorno$$
CREATE PROCEDURE _verificar_entorno()
BEGIN
 IF COALESCE(@bdii_pruebas_autorizadas,0)<>1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='SOLO_INSTANCIA_TEMPORAL_DE_PRUEBAS'; END IF;
END$$
CALL _verificar_entorno()$$
DROP PROCEDURE IF EXISTS _caso$$
CREATE PROCEDURE _caso(IN nombre VARCHAR(150),IN sentencia TEXT,IN rechazo_esperado BOOLEAN)
BEGIN
 DECLARE rechazado BOOLEAN DEFAULT FALSE;
 SAVEPOINT caso;
 SET @bdii_sentencia=sentencia;
 BEGIN
  DECLARE CONTINUE HANDLER FOR 1062,1452,3819,1644 SET rechazado=TRUE;
  PREPARE bdii_caso FROM @bdii_sentencia;
  EXECUTE bdii_caso;
  DEALLOCATE PREPARE bdii_caso;
 END;
 ROLLBACK TO SAVEPOINT caso;
 RELEASE SAVEPOINT caso;
 INSERT INTO resultados_prueba VALUES(nombre,IF(rechazado=rechazo_esperado,'PASS','FAIL'));
END$$
DROP PROCEDURE IF EXISTS _cerrar_pruebas$$
CREATE PROCEDURE _cerrar_pruebas()
BEGIN
 IF EXISTS(SELECT 1 FROM resultados_prueba WHERE estado<>'PASS') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='REGRESION_DATABASE_MYSQL'; END IF;
END$$
DELIMITER ;
START TRANSACTION;
CREATE TEMPORARY TABLE resultados_prueba(caso VARCHAR(150),estado VARCHAR(10));
INSERT INTO paciente(id_paciente,nombres,apellidos) VALUES(10001,'SinteticoA','Prueba'),(10002,'SinteticoB','Prueba'),(10003,'SinteticoC','Prueba');
INSERT INTO historial_clinico(id_historial,id_paciente) VALUES(10001,10001),(10002,10002);
INSERT INTO secretaria(id_secretaria,nombres,apellidos) VALUES(10001,'Sintetica','Prueba');
INSERT INTO odontologo(id_odontologo,nombres,apellidos,colegiado) VALUES(10001,'Sintetico','Prueba','AUD-01'),(10002,'Sintetico','Prueba','AUD-02');
INSERT INTO cita(id_cita,id_paciente,id_odontologo,id_secretaria,fecha_hora,motivo,estado) VALUES
 (10001,10001,10001,10001,'2026-10-19 10:00','SINTETICO','PROGRAMADA'),
 (10002,10001,10001,10001,'2026-10-19 11:00','SINTETICO','CANCELADA'),
 (10003,10001,10001,10001,'2026-10-19 12:00','SINTETICO','PROGRAMADA');
INSERT INTO consulta_odontologica(id_consulta,id_historial,id_cita,id_odontologo,motivo) VALUES(10001,10001,10003,10001,'SINTETICO');
INSERT INTO diagnostico(id_diagnostico,codigo,nombre) VALUES(10001,'AUD-01','SINTETICO'),(10002,'AUD-02','SINTETICO');
INSERT INTO consulta_diagnostico(id_consulta,id_diagnostico,es_principal) VALUES(10001,10001,TRUE);
CALL _caso('MY01 paciente de cita incompatible',"INSERT INTO consulta_odontologica(id_historial,id_cita,id_odontologo,motivo) VALUES(10002,10001,10001,'SINTETICO')",TRUE);
CALL _caso('MY02 cita cancelada',"INSERT INTO consulta_odontologica(id_historial,id_cita,id_odontologo,motivo) VALUES(10001,10002,10001,'SINTETICO')",TRUE);
CALL _caso('MY03 dos principales',"INSERT INTO consulta_diagnostico(id_consulta,id_diagnostico,es_principal) VALUES(10001,10002,TRUE)",TRUE);
CALL _caso('MY04 profesional incompatible',"INSERT INTO consulta_odontologica(id_historial,id_cita,id_odontologo,motivo) VALUES(10001,10001,10002,'SINTETICO')",TRUE);
CALL _caso('MY05 consulta valida',"INSERT INTO consulta_odontologica(id_historial,id_cita,id_odontologo,motivo) VALUES(10001,10001,10001,'SINTETICO')",FALSE);
CALL _caso('MY06 no cancelar cita atendida',"UPDATE cita SET estado='CANCELADA' WHERE id_cita=10003",TRUE);
CALL _caso('MY07 no mover historial',"UPDATE historial_clinico SET id_paciente=10003 WHERE id_historial=10001",TRUE);
CALL _caso('MY08 no mover consulta',"UPDATE consulta_odontologica SET id_historial=10002 WHERE id_consulta=10001",TRUE);
CALL _caso('MY09 principal booleano',"INSERT INTO consulta_diagnostico(id_consulta,id_diagnostico,es_principal) VALUES(10001,10002,2)",TRUE);
CALL _caso('MY10 historial unico',"INSERT INTO historial_clinico(id_paciente) VALUES(10001)",TRUE);
CALL _caso('MY11 consulta unica por cita',"INSERT INTO consulta_odontologica(id_historial,id_cita,id_odontologo,motivo) VALUES(10001,10003,10001,'SINTETICO')",TRUE);
CALL _caso('MY12 estado valido',"UPDATE historial_clinico SET estado='INVENTADO' WHERE id_historial=10001",TRUE);
INSERT INTO tratamiento(id_tratamiento,nombre) VALUES(10001,'SINTETICO');
CALL _caso('MY13 fechas invertidas',"INSERT INTO consulta_tratamiento(id_consulta,id_tratamiento,fecha_inicio,fecha_fin) VALUES(10001,10001,'2026-10-19','2026-10-18')",TRUE);
CALL _caso('MY14 fechas iguales',"INSERT INTO consulta_tratamiento(id_consulta,id_tratamiento,fecha_inicio,fecha_fin) VALUES(10001,10001,'2026-10-19','2026-10-19')",FALSE);
UPDATE consulta_diagnostico SET es_principal=FALSE WHERE id_consulta=10001;
CALL _caso('MY15 finalizacion exige principal',"UPDATE consulta_odontologica SET estado='FINALIZADA' WHERE id_consulta=10001",TRUE);
UPDATE consulta_diagnostico SET es_principal=TRUE WHERE id_consulta=10001;
UPDATE consulta_odontologica SET estado='FINALIZADA' WHERE id_consulta=10001;
CALL _caso('MY16 no eliminar principal finalizado',"DELETE FROM consulta_diagnostico WHERE id_consulta=10001",TRUE);
CALL _caso('MY17 FK de paciente',"INSERT INTO historial_clinico(id_paciente) VALUES(99999)",TRUE);
INSERT INTO consulta_odontologica(id_consulta,id_historial,id_cita,id_odontologo,motivo) VALUES(10002,10001,10001,10001,'SINTETICO');
INSERT INTO usuario(id_usuario,nombre_usuario,auth_uid) VALUES(10001,'AUD','AUD-SINTETICO');
SET @bdii_instantanea='{"prescriptor_nombre_historico":"SINTETICO","colegiado_historico":"AUD","medicamentos":[{"medicamento_id":"SINTETICO","nombre":"SINTETICO","presentacion":"SINTETICO","concentracion":"SINTETICO","dosis":"SINTETICO","frecuencia":"SINTETICO","duracion":"SINTETICO","via":"SINTETICO","indicaciones":"SINTETICO"}]}';
INSERT INTO receta(id_receta,id_consulta,estado,contenido_historico) VALUES(10001,10001,'EMITIDA',@bdii_instantanea);
INSERT INTO auditoria(id_auditoria,id_usuario,accion,tabla_afectada) VALUES(10001,10001,'SINTETICO','receta');
CALL _caso('MY18 instantanea invalida',"INSERT INTO receta(id_consulta,estado,contenido_historico) VALUES(10002,'EMITIDA',JSON_OBJECT('medicamentos',JSON_ARRAY(JSON_OBJECT())))",TRUE);
CALL _caso('MY19 no corregir sin revision',"UPDATE receta SET contenido_historico=JSON_SET(contenido_historico,'$.colegiado_historico','OTRO') WHERE id_receta=10001",TRUE);
CALL _caso('MY20 no borrar receta emitida',"DELETE FROM receta WHERE id_receta=10001",TRUE);
CALL _caso('MY21 auditoria append only',"UPDATE auditoria SET accion='OTRA' WHERE id_auditoria=10001",TRUE);
CALL _caso('MY22 archivo exige evidencia',"UPDATE historial_clinico SET estado='ARCHIVADO' WHERE id_historial=10001",TRUE);
CALL _caso('MY23 no reabrir consulta finalizada',"UPDATE consulta_odontologica SET estado='ABIERTA' WHERE id_consulta=10001",TRUE);
INSERT INTO revisiones(id_revision,tipo_recurso,recurso_id,version,id_usuario,motivo,contenido_anterior) SELECT UUID(),'receta',id_publico,revision,10001,'SINTETICO',contenido_historico FROM receta WHERE id_receta=10001;
CALL _caso('MY24 corregir con revision',"UPDATE receta SET revision=revision+1,contenido_historico=JSON_SET(contenido_historico,'$.colegiado_historico','OTRO') WHERE id_receta=10001",FALSE);
CALL _caso('MY25 revisiones append only',"DELETE FROM revisiones WHERE tipo_recurso='receta'",TRUE);
CALL _caso('MY26 estados canonicos',"UPDATE historial_clinico SET estado='activo' WHERE id_historial=10001",TRUE);
CALL _caso('MY27 no espacios en estado',"UPDATE historial_clinico SET estado='ACTIVO ' WHERE id_historial=10001",TRUE);
SELECT * FROM resultados_prueba ORDER BY caso;
CALL _cerrar_pruebas();
ROLLBACK;
DROP PROCEDURE _caso;
DROP PROCEDURE _verificar_entorno;
DROP PROCEDURE _cerrar_pruebas;
