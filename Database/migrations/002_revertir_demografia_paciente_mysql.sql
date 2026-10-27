-- Reversión de migración 002 (v3 -> v2): retirar sexo, direccion y fecha_registro de paciente en MySQL.

USE clinica_odontologica;
SET @bdii_bloqueo = GET_LOCK('bdii_clinica_inicializador_v2', 30);

DELIMITER $$
DROP PROCEDURE IF EXISTS _revertir_v3_a_v2$$
CREATE PROCEDURE _revertir_v3_a_v2()
BEGIN
  DECLARE version_actual INT;
  SELECT version INTO version_actual FROM modelo_database WHERE id = 1;
  IF version_actual IS NULL OR version_actual <> 3 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VERSION_MODELO_DESCONOCIDA';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paciente' AND COLUMN_NAME = 'sexo'
  ) THEN
    ALTER TABLE paciente DROP COLUMN sexo;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paciente' AND COLUMN_NAME = 'direccion'
  ) THEN
    ALTER TABLE paciente DROP COLUMN direccion;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paciente' AND COLUMN_NAME = 'fecha_registro'
  ) THEN
    ALTER TABLE paciente DROP COLUMN fecha_registro;
  END IF;
END$$
DELIMITER ;

CALL _revertir_v3_a_v2();
DROP PROCEDURE IF EXISTS _revertir_v3_a_v2;

-- Calcular la huella DESPUÉS de eliminar el procedimiento temporal
CALL _huella_modelo(@bdii_huella);
UPDATE modelo_database SET version = 2, huella = @bdii_huella WHERE id = 1;

DO RELEASE_LOCK('bdii_clinica_inicializador_v2');
