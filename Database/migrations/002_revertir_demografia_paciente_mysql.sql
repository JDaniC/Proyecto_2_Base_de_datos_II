-- Reversión de migración 002 (v3 -> v2): retirar sexo, direccion y fecha_registro de paciente en MySQL.

USE clinica_odontologica;
SET @bdii_bloqueo = GET_LOCK('bdii_clinica_inicializador_v2', 30);

-- Validar huella antes de crear procedimientos temporales de migración
DROP PROCEDURE IF EXISTS _migrar_v2_a_v3;
DROP PROCEDURE IF EXISTS _revertir_v3_a_v2;
CALL _huella_modelo(@bdii_huella_actual);

DELIMITER $$
CREATE PROCEDURE _revertir_v3_a_v2()
BEGIN
  DECLARE version_actual INT;
  DECLARE huella_guardada CHAR(64);
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'modelo_database') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ESQUEMA_SIN_MANIFIESTO_NO_MIGRABLE';
  END IF;
  SELECT version, huella INTO version_actual, huella_guardada FROM modelo_database WHERE id = 1;
  IF version_actual IS NULL OR version_actual <> 3 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VERSION_MODELO_DESCONOCIDA';
  END IF;
  IF huella_guardada IS NULL OR huella_guardada <> @bdii_huella_actual THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'MODELO_INCOMPATIBLE_REQUIERE_MIGRACION';
  END IF;

  -- Asegurar usuario administrativo para respaldos de auditoría si la tabla usuario está vacía.
  -- Se omite id_usuario para que la secuencia auto_increment asigne el identificador e incremente su valor.
  IF NOT EXISTS (SELECT 1 FROM usuario) THEN
    INSERT INTO usuario (id_publico, revision, auth_uid, proveedor_identidad, institucion_id, nombre_usuario, estado)
    VALUES (UUID(), 1, 'bdii_migracion_sistema', 'FIREBASE', 'CLINICA_ODONTOLOGICA', 'sistema_migracion', 'ACTIVO')
    ON DUPLICATE KEY UPDATE id_usuario = id_usuario;
  END IF;

  -- Preservar valores demográficos en la tabla revisiones para recuperación sin pérdida
  INSERT INTO revisiones (
    id_revision, tipo_recurso, recurso_id, version, id_usuario,
    fecha_hora, motivo, contenido_anterior
  )
  SELECT
    UUID(),
    'paciente_demografia_v3',
    p.id_publico,
    p.revision,
    (SELECT id_usuario FROM usuario ORDER BY id_usuario ASC LIMIT 1),
    NOW(),
    'RESPALDO_MIGRACION_002_REVERSION_V3_A_V2',
    JSON_OBJECT(
      'sexo', p.sexo,
      'direccion', p.direccion,
      'fecha_registro', DATE_FORMAT(p.fecha_registro, '%Y-%m-%d %H:%i:%s.%f'),
      'clave_identidad_activa', p.clave_identidad_activa
    )
  FROM paciente p
  WHERE (p.fecha_registro IS NOT NULL OR p.sexo IS NOT NULL OR p.direccion IS NOT NULL OR p.clave_identidad_activa IS NOT NULL
         OR EXISTS (SELECT 1 FROM identidades_paciente ip WHERE ip.id_paciente = p.id_paciente))
    AND NOT EXISTS (
      SELECT 1 FROM revisiones r
      WHERE r.tipo_recurso = 'paciente_demografia_v3'
        AND r.recurso_id = p.id_publico
        AND r.version = p.revision
    );

  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paciente' AND COLUMN_NAME = 'clave_identidad_activa'
  ) THEN
    ALTER TABLE paciente DROP COLUMN clave_identidad_activa;
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
