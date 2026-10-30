-- Actualización explícita v4 -> v5. DDL MySQL requiere respaldo previo.
USE clinica_odontologica;
SET @bdii_lock=GET_LOCK('bdii_clinica_inicializador_v2',30);
CALL _huella_modelo(@bdii_actual);
DROP PROCEDURE IF EXISTS _migrar_correcciones;
DELIMITER $$
CREATE PROCEDURE _migrar_correcciones()
BEGIN
 DECLARE v integer; DECLARE h CHAR(64);
 IF @bdii_lock IS NULL OR @bdii_lock <> 1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='BLOQUEO_NO_DISPONIBLE'; END IF;
 SELECT version,huella INTO v,h FROM modelo_database WHERE id=1;
 IF v IS NULL OR v NOT IN (4,5) OR h <> @bdii_actual THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='MODELO_INCOMPATIBLE_REQUIERE_MIGRACION'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='consulta_odontologica' AND COLUMN_NAME='snapshot_actual') THEN
  ALTER TABLE consulta_odontologica ADD COLUMN snapshot_actual JSON;
 END IF;
 ALTER TABLE historial_clinico MODIFY fecha_baja DATETIME(3);
END$$
DELIMITER ;
CALL _migrar_correcciones();
DROP PROCEDURE _migrar_correcciones;
CALL _huella_modelo(@bdii_actual);
UPDATE modelo_database SET version=5,huella=@bdii_actual WHERE id=1;
DO RELEASE_LOCK('bdii_clinica_inicializador_v2');
