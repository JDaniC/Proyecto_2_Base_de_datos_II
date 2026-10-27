-- Migración explícita 002 (v2 -> v3): agregar demografía completa (sexo, direccion) a paciente en MySQL (E02-P1-02).
-- No destructiva: preserva todas las filas previas, historiales, citas y auditoría.

USE clinica_odontologica;
SET @bdii_bloqueo = GET_LOCK('bdii_clinica_inicializador_v2', 30);

DELIMITER $$
DROP PROCEDURE IF EXISTS _migrar_v2_a_v3$$
CREATE PROCEDURE _migrar_v2_a_v3()
BEGIN
  DECLARE version_actual INT;
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'modelo_database') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ESQUEMA_SIN_MANIFIESTO_NO_MIGRABLE';
  END IF;
  SELECT version INTO version_actual FROM modelo_database WHERE id = 1;
  IF version_actual IS NULL OR version_actual <> 2 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VERSION_MODELO_DESCONOCIDA';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paciente' AND COLUMN_NAME = 'sexo'
  ) THEN
    ALTER TABLE paciente ADD COLUMN sexo VARCHAR(30) AFTER fecha_nacimiento;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paciente' AND COLUMN_NAME = 'direccion'
  ) THEN
    ALTER TABLE paciente ADD COLUMN direccion TEXT AFTER correo;
  END IF;

  CALL _huella_modelo(@bdii_huella);
  UPDATE modelo_database SET version = 3, huella = @bdii_huella WHERE id = 1;
END$$
DELIMITER ;

CALL _migrar_v2_a_v3();
DROP PROCEDURE IF EXISTS _migrar_v2_a_v3;
DO RELEASE_LOCK('bdii_clinica_inicializador_v2');
