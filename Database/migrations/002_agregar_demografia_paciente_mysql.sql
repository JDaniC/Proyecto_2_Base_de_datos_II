-- Migración explícita 002 (v2 -> v3): agregar demografía completa (sexo, direccion, fecha_registro) a paciente en MySQL (E02-P1-02).
-- No destructiva: preserva todas las filas previas, historiales, citas y auditoría.

USE clinica_odontologica;
SET @bdii_bloqueo = GET_LOCK('bdii_clinica_inicializador_v2', 30);

-- Validar huella antes de crear procedimientos temporales de migración
DROP PROCEDURE IF EXISTS _migrar_v2_a_v3;
DROP PROCEDURE IF EXISTS _revertir_v3_a_v2;
CALL _huella_modelo(@bdii_huella_actual);

DELIMITER $$
CREATE PROCEDURE _migrar_v2_a_v3()
BEGIN
  DECLARE version_actual INT;
  DECLARE huella_guardada CHAR(64);
  DECLARE recreo_sexo BOOLEAN DEFAULT FALSE;
  DECLARE recreo_direccion BOOLEAN DEFAULT FALSE;
  DECLARE recreo_fecha_registro BOOLEAN DEFAULT FALSE;
  DECLARE recreo_clave_identidad BOOLEAN DEFAULT FALSE;
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'modelo_database') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ESQUEMA_SIN_MANIFIESTO_NO_MIGRABLE';
  END IF;
  SELECT version, huella INTO version_actual, huella_guardada FROM modelo_database WHERE id = 1;
  IF version_actual IS NULL OR version_actual NOT IN (2, 3) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VERSION_MODELO_DESCONOCIDA';
  END IF;
  IF huella_guardada IS NULL OR huella_guardada <> @bdii_huella_actual THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'MODELO_INCOMPATIBLE_REQUIERE_MIGRACION';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paciente' AND COLUMN_NAME = 'sexo'
  ) THEN
    ALTER TABLE paciente ADD COLUMN sexo VARCHAR(30) AFTER fecha_nacimiento;
    SET recreo_sexo = TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paciente' AND COLUMN_NAME = 'direccion'
  ) THEN
    ALTER TABLE paciente ADD COLUMN direccion TEXT AFTER correo;
    SET recreo_direccion = TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paciente' AND COLUMN_NAME = 'fecha_registro'
  ) THEN
    ALTER TABLE paciente ADD COLUMN fecha_registro DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) AFTER estado;
    SET recreo_fecha_registro = TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paciente' AND COLUMN_NAME = 'clave_identidad_activa'
  ) THEN
    ALTER TABLE paciente ADD COLUMN clave_identidad_activa CHAR(64) DEFAULT NULL AFTER fecha_registro;
    SET recreo_clave_identidad = TRUE;
  END IF;

  -- Restaurar valores demográficos respaldados en revisiones si existen,
  -- restringido estrictamente a las columnas recreadas en esta ejecución.
  IF (recreo_sexo OR recreo_direccion OR recreo_fecha_registro OR recreo_clave_identidad) AND EXISTS (
    SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'revisiones'
  ) THEN
    UPDATE paciente p
    JOIN (
      SELECT
        recurso_id,
        contenido_anterior,
        ROW_NUMBER() OVER (
          PARTITION BY recurso_id
          ORDER BY fecha_hora DESC, version DESC
        ) AS rn
      FROM revisiones
      WHERE tipo_recurso = 'paciente_demografia_v3'
    ) r ON r.rn = 1 AND r.recurso_id = p.id_publico
    SET
      p.sexo = CASE
        WHEN recreo_sexo THEN COALESCE(p.sexo, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(r.contenido_anterior, '$.sexo')), 'null'))
        ELSE p.sexo
      END,
      p.direccion = CASE
        WHEN recreo_direccion THEN COALESCE(p.direccion, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(r.contenido_anterior, '$.direccion')), 'null'))
        ELSE p.direccion
      END,
      p.fecha_registro = CASE
        WHEN recreo_fecha_registro THEN COALESCE(
          STR_TO_DATE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(r.contenido_anterior, '$.fecha_registro')), 'null'), '%Y-%m-%d %H:%i:%s.%f'),
          p.fecha_registro
        )
        ELSE p.fecha_registro
      END,
      p.clave_identidad_activa = CASE
        WHEN recreo_clave_identidad THEN COALESCE(
          p.clave_identidad_activa,
          NULLIF(JSON_UNQUOTE(JSON_EXTRACT(r.contenido_anterior, '$.clave_identidad_activa')), 'null')
        )
        ELSE p.clave_identidad_activa
      END;
  END IF;

  -- Inicializar clave_identidad_activa para pacientes existentes durante la primera migración
  -- seleccionando la identidad determinista más reciente si no provienen de un respaldo previo en revisiones,
  -- restringido EXCLUSIVAMENTE a cuando clave_identidad_activa fue recreada en esta ejecución.
  IF recreo_clave_identidad THEN
    UPDATE paciente p
    JOIN (
      SELECT id_paciente, clave,
             ROW_NUMBER() OVER (PARTITION BY id_paciente ORDER BY fecha_registro DESC, clave ASC) AS rn
      FROM identidades_paciente
    ) ip ON ip.id_paciente = p.id_paciente AND ip.rn = 1
    LEFT JOIN (
      SELECT DISTINCT recurso_id
      FROM revisiones
      WHERE tipo_recurso = 'paciente_demografia_v3'
    ) r ON r.recurso_id = p.id_publico
    SET p.clave_identidad_activa = ip.clave
    WHERE p.clave_identidad_activa IS NULL AND r.recurso_id IS NULL;
  END IF;
END$$
DELIMITER ;

CALL _migrar_v2_a_v3();
DROP PROCEDURE IF EXISTS _migrar_v2_a_v3;

-- Calcular la huella DESPUÉS de eliminar los procedimientos temporales de migración
-- para que coincida exactamente con la huella generada por el inicializador canónico v3.
CALL _huella_modelo(@bdii_huella);
UPDATE modelo_database SET version = 3, huella = @bdii_huella WHERE id = 1;

DO RELEASE_LOCK('bdii_clinica_inicializador_v2');
