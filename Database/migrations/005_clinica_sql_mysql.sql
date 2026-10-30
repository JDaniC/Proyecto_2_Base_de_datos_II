-- Migración explícita 005 (v3 -> v4): extensión clínica SQL de la Clínica Odontológica (E03-P1-02).
-- Aditiva: conserva filas, historiales, citas, recetas y auditoría; no elimina columnas.
-- Añade agenda con fin/duración/consultorio/cancelación, signos vitales 1:1,
-- instantánea histórica del profesional y metadatos históricos por componente.
USE clinica_odontologica;
SET @bdii_bloqueo = GET_LOCK('bdii_clinica_inicializador_v2', 30);

DROP PROCEDURE IF EXISTS _validar_bloqueo_clinica;
DELIMITER $$
CREATE PROCEDURE _validar_bloqueo_clinica()
BEGIN
  IF @bdii_bloqueo IS NULL OR @bdii_bloqueo <> 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='BLOQUEO_MIGRACION_NO_DISPONIBLE';
  END IF;
END$$
DELIMITER ;
CALL _validar_bloqueo_clinica();
DROP PROCEDURE _validar_bloqueo_clinica;
CALL _huella_modelo(@bdii_huella_actual);

DROP PROCEDURE IF EXISTS _migrar_v3_a_v4;
DELIMITER $$
CREATE PROCEDURE _migrar_v3_a_v4()
BEGIN
  DECLARE version_actual INT;
  DECLARE huella_guardada CHAR(64);


  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='modelo_database') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='ESQUEMA_SIN_MANIFIESTO_NO_MIGRABLE';
  END IF;
  SELECT version, huella INTO version_actual, huella_guardada FROM modelo_database WHERE id=1;
  IF version_actual IS NULL OR version_actual NOT IN (3,4) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='VERSION_MODELO_DESCONOCIDA';
  END IF;

  IF huella_guardada IS NULL OR huella_guardada <> @bdii_huella_actual THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='MODELO_INCOMPATIBLE_REQUIERE_MIGRACION';
  END IF;

  IF NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='consulta_odontologica' AND COLUMN_NAME='campos_signos') THEN
    ALTER TABLE consulta_odontologica ADD COLUMN campos_signos JSON;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='consulta_odontologica' AND CONSTRAINT_NAME='chk_consulta_campos_signos') THEN
    ALTER TABLE consulta_odontologica ADD CONSTRAINT chk_consulta_campos_signos CHECK (campos_signos IS NULL OR JSON_SCHEMA_VALID('{"type":"array","items":{"type":"string","enum":["peso_kg","talla_cm","temperatura_c","presion_sistolica","presion_diastolica","frecuencia_cardiaca_lpm","frecuencia_respiratoria_rpm","saturacion_oxigeno_pct"]},"uniqueItems":true,"maxItems":8}', campos_signos));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='odontologo' AND COLUMN_NAME='entidad_colegiacion') THEN
    ALTER TABLE odontologo ADD COLUMN entidad_colegiacion VARCHAR(150) AFTER colegiado;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cita' AND COLUMN_NAME='hora_fin') THEN
    ALTER TABLE cita ADD COLUMN hora_fin TIME AFTER fecha_hora;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cita' AND COLUMN_NAME='duracion_minutos') THEN
    ALTER TABLE cita ADD COLUMN duracion_minutos SMALLINT AFTER hora_fin;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cita' AND COLUMN_NAME='consultorio') THEN
    ALTER TABLE cita ADD COLUMN consultorio VARCHAR(100) AFTER duracion_minutos;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cita' AND COLUMN_NAME='motivo_cancelacion') THEN
    ALTER TABLE cita ADD COLUMN motivo_cancelacion TEXT AFTER motivo;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cita'
      AND COLUMN_NAME='id_secretaria' AND IS_NULLABLE='NO'
  ) THEN
    ALTER TABLE cita MODIFY id_secretaria BIGINT UNSIGNED NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='cita' AND CONSTRAINT_NAME='chk_cita_duracion') THEN
    ALTER TABLE cita ADD CONSTRAINT chk_cita_duracion CHECK (duracion_minutos IS NULL OR duracion_minutos BETWEEN 5 AND 480);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='consulta_odontologica' AND COLUMN_NAME='sintomas') THEN
    ALTER TABLE consulta_odontologica ADD COLUMN sintomas TEXT AFTER motivo;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='consulta_odontologica' AND COLUMN_NAME='profesional_historico') THEN
    ALTER TABLE consulta_odontologica ADD COLUMN profesional_historico JSON AFTER observaciones;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='consulta_diagnostico' AND COLUMN_NAME='nombre_historico') THEN
    ALTER TABLE consulta_diagnostico ADD COLUMN nombre_historico VARCHAR(200) AFTER es_principal;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='consulta_diagnostico' AND COLUMN_NAME='fecha_registro') THEN
    ALTER TABLE consulta_diagnostico ADD COLUMN fecha_registro DATETIME(3) AFTER observaciones;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='consulta_diagnostico' AND COLUMN_NAME='autor_historico') THEN
    ALTER TABLE consulta_diagnostico ADD COLUMN autor_historico JSON AFTER fecha_registro;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='consulta_tratamiento' AND COLUMN_NAME='nombre_historico') THEN
    ALTER TABLE consulta_tratamiento ADD COLUMN nombre_historico VARCHAR(200) AFTER observaciones;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='consulta_tratamiento' AND COLUMN_NAME='fecha_registro') THEN
    ALTER TABLE consulta_tratamiento ADD COLUMN fecha_registro DATETIME(3) AFTER nombre_historico;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='consulta_tratamiento' AND COLUMN_NAME='autor_historico') THEN
    ALTER TABLE consulta_tratamiento ADD COLUMN autor_historico JSON AFTER fecha_registro;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='signos_vitales_consulta') THEN
    CREATE TABLE signos_vitales_consulta (
      id_publico CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()) UNIQUE,
      revision BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK (revision > 0),
      id_signos_vitales BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      id_consulta BIGINT UNSIGNED NOT NULL,
      fecha_hora_medicion DATETIME NOT NULL,
      peso_kg DECIMAL(7,3),
      talla_cm DECIMAL(6,2),
      temperatura_c DECIMAL(4,1),
      presion_sistolica SMALLINT,
      presion_diastolica SMALLINT,
      frecuencia_cardiaca_lpm SMALLINT,
      frecuencia_respiratoria_rpm SMALLINT,
      saturacion_oxigeno_pct DECIMAL(5,2),
      PRIMARY KEY (id_signos_vitales),
      CONSTRAINT uq_signos_consulta UNIQUE (id_consulta),
      CONSTRAINT fk_signos_consulta FOREIGN KEY (id_consulta)
        REFERENCES consulta_odontologica (id_consulta),
      CONSTRAINT chk_signos_peso CHECK (peso_kg IS NULL OR peso_kg >= 0),
      CONSTRAINT chk_signos_talla CHECK (talla_cm IS NULL OR talla_cm >= 0),
      CONSTRAINT chk_signos_saturacion CHECK (saturacion_oxigeno_pct IS NULL OR saturacion_oxigeno_pct BETWEEN 0 AND 100),
      CONSTRAINT chk_signos_rangos CHECK (
        (temperatura_c IS NULL OR temperatura_c BETWEEN 20 AND 50) AND
        (presion_sistolica IS NULL OR presion_sistolica BETWEEN 10 AND 300) AND
        (presion_diastolica IS NULL OR presion_diastolica BETWEEN 10 AND 200) AND
        (frecuencia_cardiaca_lpm IS NULL OR frecuencia_cardiaca_lpm BETWEEN 10 AND 300) AND
        (frecuencia_respiratoria_rpm IS NULL OR frecuencia_respiratoria_rpm BETWEEN 1 AND 150))
    ) ENGINE=InnoDB;
  END IF;
ALTER TABLE cita MODIFY fecha_creacion DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
IF NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='consulta_diagnostico' AND COLUMN_NAME='orden_registro') THEN ALTER TABLE consulta_diagnostico ADD COLUMN orden_registro INT UNSIGNED; END IF;
IF NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='consulta_tratamiento' AND COLUMN_NAME='orden_registro') THEN ALTER TABLE consulta_tratamiento ADD COLUMN orden_registro INT UNSIGNED; END IF;
  ALTER TABLE consulta_diagnostico MODIFY fecha_registro DATETIME(3);
  ALTER TABLE consulta_tratamiento MODIFY fecha_registro DATETIME(3);
ALTER TABLE medicamento MODIFY nombre_generico VARCHAR(200) NOT NULL;
ALTER TABLE medicamento MODIFY presentacion VARCHAR(200);
ALTER TABLE medicamento MODIFY concentracion VARCHAR(200);
ALTER TABLE detalle_receta MODIFY dosis VARCHAR(200) NOT NULL;
ALTER TABLE detalle_receta MODIFY frecuencia VARCHAR(200) NOT NULL;
ALTER TABLE detalle_receta MODIFY duracion VARCHAR(200);
ALTER TABLE consulta_odontologica MODIFY fecha_hora DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
END$$
DELIMITER ;

CALL _migrar_v3_a_v4();
DROP PROCEDURE IF EXISTS _migrar_v3_a_v4;

-- Huella calculada después de retirar el procedimiento temporal para coincidir con el inicializador v4.
CALL _huella_modelo(@bdii_huella);
UPDATE modelo_database SET version=4, huella=@bdii_huella WHERE id=1;

DO RELEASE_LOCK('bdii_clinica_inicializador_v2');

-- La cuenta existente no recibe permisos del inicializador de Docker.
SET @bdii_grant = IF(EXISTS(SELECT 1 FROM mysql.user WHERE User='clinica_app' AND Host='%'),
 'GRANT SELECT, INSERT, UPDATE, DELETE ON clinica_odontologica.signos_vitales_consulta TO \'clinica_app\'@\'%\'', 'DO 0');
PREPARE bdii_grant FROM @bdii_grant;
EXECUTE bdii_grant;
DEALLOCATE PREPARE bdii_grant;
