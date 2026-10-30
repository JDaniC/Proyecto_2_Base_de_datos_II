-- Base relacional de la Clínica Odontológica (MySQL 8.4+). Inicializador v4.
-- Para bases nuevas; los esquemas anteriores requieren una migracion explicita.
-- Basada en las 14 entidades y atributos del modelo relacional del proyecto.

CREATE DATABASE IF NOT EXISTS clinica_odontologica
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE clinica_odontologica;
-- MySQL DDL no es transaccional. Ejecutar sin --force, en una base nueva.
-- El bloqueo de sesion serializa inicializadores; se libera al cerrar si hay error.
SET @bdii_bloqueo = GET_LOCK('bdii_clinica_inicializador_v2',30);
DELIMITER $$
DROP PROCEDURE IF EXISTS _huella_modelo$$
CREATE PROCEDURE _huella_modelo(OUT huella CHAR(64)) SQL SECURITY INVOKER READS SQL DATA
BEGIN
  DECLARE limite_anterior BIGINT UNSIGNED;
  SET limite_anterior=@@session.group_concat_max_len;
  SET SESSION group_concat_max_len=4194304;
  SELECT SHA2(COALESCE(GROUP_CONCAT(objeto ORDER BY objeto SEPARATOR '\n'),''),256) INTO huella FROM (
    SELECT CONCAT_WS(':','C',TABLE_NAME,ORDINAL_POSITION,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COALESCE(COLUMN_DEFAULT,'<NULL>'),EXTRA,COALESCE(GENERATION_EXPRESSION,''),COALESCE(COLLATION_NAME,'')) AS objeto
      FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
    UNION ALL SELECT CONCAT_WS(':','I',TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX,COALESCE(COLUMN_NAME,EXPRESSION),NON_UNIQUE,INDEX_TYPE,IS_VISIBLE,COALESCE(SUB_PART,0))
      FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE()
    UNION ALL SELECT CONCAT_WS(':','K',TABLE_NAME,CONSTRAINT_NAME,COLUMN_NAME,ORDINAL_POSITION,COALESCE(REFERENCED_TABLE_NAME,''),COALESCE(REFERENCED_COLUMN_NAME,''))
      FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE()
    UNION ALL SELECT CONCAT_WS(':','D',TABLE_NAME,CONSTRAINT_NAME,CONSTRAINT_TYPE,ENFORCED) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()
    UNION ALL SELECT CONCAT_WS(':','H',CONSTRAINT_NAME,CHECK_CLAUSE) FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()
    UNION ALL SELECT CONCAT_WS(':','R',TABLE_NAME,CONSTRAINT_NAME,UPDATE_RULE,DELETE_RULE) FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE()
    UNION ALL SELECT CONCAT_WS(':','T',TRIGGER_NAME,EVENT_MANIPULATION,EVENT_OBJECT_TABLE,ACTION_TIMING,ACTION_STATEMENT) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()
    UNION ALL SELECT CONCAT_WS(':','P',ROUTINE_NAME,ROUTINE_DEFINITION,SECURITY_TYPE) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=DATABASE() AND ROUTINE_NAME NOT IN('_huella_modelo','_preparar_modelo','_migrar_v2_a_v3','_revertir_v3_a_v2')
    UNION ALL SELECT CONCAT_WS(':','E',TABLE_NAME,ENGINE,TABLE_COLLATION) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE'
  ) estructura;
  SET SESSION group_concat_max_len=limite_anterior;
END$$
DROP PROCEDURE IF EXISTS _preparar_modelo$$
CREATE PROCEDURE _preparar_modelo() SQL SECURITY INVOKER
BEGIN
  DECLARE version_actual INT;
  DECLARE huella_actual CHAR(64);
  DECLARE huella_guardada CHAR(64);
  IF COALESCE(@bdii_bloqueo,0)<>1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='INICIALIZADOR_OCUPADO'; END IF;
  IF EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='modelo_database') THEN
    SELECT version,huella INTO version_actual,huella_guardada FROM modelo_database WHERE id=1;
    CALL _huella_modelo(huella_actual);
    IF version_actual IS NULL OR version_actual<>4 OR huella_guardada<>huella_actual THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='MODELO_INCOMPATIBLE_REQUIERE_MIGRACION';
    END IF;
  ELSEIF EXISTS(SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='ESQUEMA_ANTERIOR_SIN_MANIFIESTO_REQUIERE_MIGRACION';
  END IF;
END$$
CALL _preparar_modelo()$$
DELIMITER ;


CREATE TABLE IF NOT EXISTS paciente (
    id_publico CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()) UNIQUE,
    revision BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK (revision > 0),
    id_paciente BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombres VARCHAR(160) NOT NULL,
    apellidos VARCHAR(160) NOT NULL,
    fecha_nacimiento DATE,
    sexo VARCHAR(30),
    telefono VARCHAR(30),
    correo VARCHAR(254),
    direccion TEXT,
    estado VARCHAR(30) COLLATE utf8mb4_0900_bin NOT NULL DEFAULT 'ACTIVO',
    fecha_registro DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    clave_identidad_activa CHAR(64) DEFAULT NULL,
    PRIMARY KEY (id_paciente),
    CONSTRAINT chk_paciente_estado CHECK (estado IN ('ACTIVO','INACTIVO')),
    CONSTRAINT chk_paciente_textos CHECK (LENGTH(TRIM(nombres))>0 AND LENGTH(TRIM(apellidos))>0 AND LENGTH(TRIM(estado))>0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS secretaria (
    id_publico CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()) UNIQUE,
    revision BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK (revision > 0),
    id_secretaria BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombres VARCHAR(160) NOT NULL,
    apellidos VARCHAR(160) NOT NULL,
    telefono VARCHAR(30),
    correo VARCHAR(254),
    PRIMARY KEY (id_secretaria),
    CONSTRAINT chk_secretaria_textos CHECK (LENGTH(TRIM(nombres))>0 AND LENGTH(TRIM(apellidos))>0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS odontologo (
    id_publico CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()) UNIQUE,
    revision BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK (revision > 0),
    id_odontologo BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombres VARCHAR(160) NOT NULL,
    apellidos VARCHAR(160) NOT NULL,
    colegiado VARCHAR(50) NOT NULL,
    entidad_colegiacion VARCHAR(150),
    telefono VARCHAR(30),
    correo VARCHAR(254),
    PRIMARY KEY (id_odontologo),
    CONSTRAINT uq_odontologo_colegiado UNIQUE (colegiado),
    CONSTRAINT chk_odontologo_textos CHECK (LENGTH(TRIM(nombres))>0 AND LENGTH(TRIM(apellidos))>0 AND LENGTH(TRIM(colegiado))>0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usuario (
    id_usuario BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_publico CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()) UNIQUE,
    revision BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK(revision>0),
    auth_uid VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL UNIQUE,
    proveedor_identidad VARCHAR(20) COLLATE utf8mb4_0900_bin NOT NULL DEFAULT 'FIREBASE' CHECK(proveedor_identidad='FIREBASE'),
    institucion_id VARCHAR(40) COLLATE utf8mb4_0900_bin NOT NULL DEFAULT 'CLINICA_ODONTOLOGICA' CHECK(institucion_id='CLINICA_ODONTOLOGICA'),
    nombre_usuario VARCHAR(80) NOT NULL UNIQUE,
    id_odontologo BIGINT UNSIGNED UNIQUE,
    id_secretaria BIGINT UNSIGNED UNIQUE,
    estado VARCHAR(30) COLLATE utf8mb4_0900_bin NOT NULL DEFAULT 'PENDIENTE' CHECK(estado IN('PENDIENTE','ACTIVO','INACTIVO')),
    ultimo_acceso DATETIME,
    CHECK(id_odontologo IS NULL OR id_secretaria IS NULL),
    FOREIGN KEY(id_odontologo) REFERENCES odontologo(id_odontologo),
    FOREIGN KEY(id_secretaria) REFERENCES secretaria(id_secretaria),
    CONSTRAINT chk_usuario_textos CHECK (LENGTH(TRIM(auth_uid))>0 AND LENGTH(TRIM(proveedor_identidad))>0 AND LENGTH(TRIM(institucion_id))>0 AND LENGTH(TRIM(nombre_usuario))>0 AND LENGTH(TRIM(estado))>0)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS rol (
    id_rol BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_publico CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()) UNIQUE,
    revision BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK(revision>0),
    nombre VARCHAR(80) NOT NULL UNIQUE,
    descripcion TEXT,
    permisos JSON NOT NULL DEFAULT (JSON_ARRAY()) CHECK(JSON_TYPE(permisos)='ARRAY'),
    CONSTRAINT chk_rol_textos CHECK (LENGTH(TRIM(nombre))>0)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS usuario_rol (
    id_usuario BIGINT UNSIGNED NOT NULL,
    id_rol BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY(id_usuario,id_rol),
    FOREIGN KEY(id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY(id_rol) REFERENCES rol(id_rol)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS auditoria (
    id_auditoria BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_publico CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()) UNIQUE,
    id_usuario BIGINT UNSIGNED NOT NULL,
    accion VARCHAR(100) NOT NULL,
    tabla_afectada VARCHAR(100) NOT NULL,
    registro_afectado VARCHAR(120),
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    detalle JSON,
    FOREIGN KEY(id_usuario) REFERENCES usuario(id_usuario),
    INDEX ix_auditoria_actor_fecha(id_usuario,fecha_hora),
    CONSTRAINT chk_auditoria_textos CHECK (LENGTH(TRIM(accion))>0 AND LENGTH(TRIM(tabla_afectada))>0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cita (
    id_publico CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()) UNIQUE,
    revision BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK (revision > 0),
    id_cita BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_paciente BIGINT UNSIGNED NOT NULL,
    id_odontologo BIGINT UNSIGNED NOT NULL,
    id_secretaria BIGINT UNSIGNED,
    fecha_hora DATETIME NOT NULL,
    hora_fin TIME,
    duracion_minutos SMALLINT,
    consultorio VARCHAR(100),
    motivo TEXT NOT NULL,
    motivo_cancelacion TEXT,
    estado VARCHAR(30) COLLATE utf8mb4_0900_bin NOT NULL DEFAULT 'PROGRAMADA',
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_cita),
    CONSTRAINT fk_cita_paciente FOREIGN KEY (id_paciente)
      REFERENCES paciente (id_paciente),
    CONSTRAINT fk_cita_odontologo FOREIGN KEY (id_odontologo)
      REFERENCES odontologo (id_odontologo),
    CONSTRAINT fk_cita_secretaria FOREIGN KEY (id_secretaria)
      REFERENCES secretaria (id_secretaria),
    INDEX ix_cita_paciente_fecha (id_paciente, fecha_hora),
    INDEX ix_cita_odontologo_fecha (id_odontologo, fecha_hora),
    CONSTRAINT chk_cita_estado CHECK (estado IN ('PROGRAMADA','ATENDIDA','CANCELADA')),
    CONSTRAINT chk_cita_duracion CHECK (duracion_minutos IS NULL OR duracion_minutos BETWEEN 5 AND 480),
    CONSTRAINT chk_cita_textos CHECK (LENGTH(TRIM(motivo))>0 AND LENGTH(TRIM(estado))>0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS historial_clinico (
    causa_baja VARCHAR(30),
    motivo_baja TEXT,
    fecha_baja DATETIME,
    actor_baja CHAR(36) CHARACTER SET ascii COLLATE ascii_bin,
    id_publico CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()) UNIQUE,
    revision BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK (revision > 0),
    id_historial BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_paciente BIGINT UNSIGNED NOT NULL,
    fecha_apertura DATE NOT NULL DEFAULT (CURRENT_DATE),
    estado VARCHAR(30) COLLATE utf8mb4_0900_bin NOT NULL DEFAULT 'ACTIVO',
    motivo_cierre TEXT,
    observaciones TEXT,
    PRIMARY KEY (id_historial),
    CONSTRAINT uq_historial_paciente UNIQUE (id_paciente),
    CONSTRAINT fk_historial_paciente FOREIGN KEY (id_paciente)
      REFERENCES paciente (id_paciente),
    CONSTRAINT chk_historial_clinico_estado CHECK (estado IN ('ACTIVO','ARCHIVADO')),
    CONSTRAINT fk_historial_actor_baja FOREIGN KEY(actor_baja) REFERENCES usuario(id_publico),
    CONSTRAINT chk_historial_archivo CHECK (estado<>'ARCHIVADO' OR (causa_baja IS NOT NULL AND causa_baja IN('TRASLADO','FALLECIMIENTO','OTRA_ADMINISTRATIVA') AND motivo_baja IS NOT NULL AND LENGTH(TRIM(motivo_baja))>0 AND fecha_baja IS NOT NULL AND actor_baja IS NOT NULL)),
    CONSTRAINT chk_historial_clinico_textos CHECK (LENGTH(TRIM(estado))>0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS antecedente (
    id_publico CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()) UNIQUE,
    revision BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK (revision > 0),
    id_antecedente BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_historial BIGINT UNSIGNED NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    fecha_registro DATE NOT NULL DEFAULT (CURRENT_DATE),
    PRIMARY KEY (id_antecedente),
    CONSTRAINT fk_antecedente_historial FOREIGN KEY (id_historial)
      REFERENCES historial_clinico (id_historial),
    INDEX ix_antecedente_historial_fecha (id_historial, fecha_registro),
    CONSTRAINT chk_antecedente_textos CHECK (LENGTH(TRIM(tipo))>0 AND LENGTH(TRIM(descripcion))>0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS consulta_odontologica (
    id_publico CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()) UNIQUE,
    revision BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK (revision > 0),
    id_consulta BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_historial BIGINT UNSIGNED NOT NULL,
    id_cita BIGINT UNSIGNED NOT NULL,
    id_odontologo BIGINT UNSIGNED NOT NULL,
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motivo TEXT NOT NULL,
    sintomas TEXT,
    observaciones TEXT,
    profesional_historico JSON,
    campos_signos JSON CONSTRAINT chk_consulta_campos_signos CHECK (campos_signos IS NULL OR JSON_SCHEMA_VALID('{"type":"array","items":{"type":"string","enum":["peso_kg","talla_cm","temperatura_c","presion_sistolica","presion_diastolica","frecuencia_cardiaca_lpm","frecuencia_respiratoria_rpm","saturacion_oxigeno_pct"]},"uniqueItems":true,"maxItems":8}', campos_signos)),
    estado VARCHAR(30) COLLATE utf8mb4_0900_bin NOT NULL DEFAULT 'ABIERTA',
    PRIMARY KEY (id_consulta),
    CONSTRAINT uq_consulta_cita UNIQUE (id_cita),
    CONSTRAINT fk_consulta_historial FOREIGN KEY (id_historial)
      REFERENCES historial_clinico (id_historial),
    CONSTRAINT fk_consulta_cita FOREIGN KEY (id_cita)
      REFERENCES cita (id_cita),
    CONSTRAINT fk_consulta_odontologo FOREIGN KEY (id_odontologo)
      REFERENCES odontologo (id_odontologo),
    INDEX ix_consulta_historial_fecha (id_historial, fecha_hora),
    CONSTRAINT chk_consulta_odontologica_estado CHECK (estado IN ('ABIERTA','FINALIZADA')),
    CONSTRAINT chk_consulta_odontologica_textos CHECK (LENGTH(TRIM(motivo))>0 AND LENGTH(TRIM(estado))>0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS signos_vitales_consulta (
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

CREATE TABLE IF NOT EXISTS diagnostico (
    id_publico CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()) UNIQUE,
    revision BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK (revision > 0),
    id_diagnostico BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(180) NOT NULL,
    descripcion TEXT,
    PRIMARY KEY (id_diagnostico),
    CONSTRAINT uq_diagnostico_codigo UNIQUE (codigo),
    CONSTRAINT chk_diagnostico_textos CHECK (LENGTH(TRIM(codigo))>0 AND LENGTH(TRIM(nombre))>0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS consulta_diagnostico (
    id_publico CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()) UNIQUE,
    revision BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK (revision > 0),
    id_consulta BIGINT UNSIGNED NOT NULL,
    id_diagnostico BIGINT UNSIGNED NOT NULL,
    es_principal BOOLEAN NOT NULL DEFAULT FALSE,
    principal_consulta BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN es_principal=1 THEN id_consulta ELSE NULL END) STORED,
    CONSTRAINT uq_consulta_principal UNIQUE (principal_consulta),
    CONSTRAINT chk_principal_booleano CHECK (es_principal IN (0,1)),
    nombre_historico VARCHAR(200),
    observaciones TEXT,
    fecha_registro DATETIME(3),
    autor_historico JSON,
    PRIMARY KEY (id_consulta, id_diagnostico),
    CONSTRAINT fk_consulta_diagnostico_consulta FOREIGN KEY (id_consulta)
      REFERENCES consulta_odontologica (id_consulta),
    CONSTRAINT fk_consulta_diagnostico_diagnostico FOREIGN KEY (id_diagnostico)
      REFERENCES diagnostico (id_diagnostico)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tratamiento (
    id_publico CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()) UNIQUE,
    revision BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK (revision > 0),
    id_tratamiento BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(180) NOT NULL,
    descripcion TEXT,
    PRIMARY KEY (id_tratamiento),
    CONSTRAINT uq_tratamiento_nombre UNIQUE (nombre),
    CONSTRAINT chk_tratamiento_textos CHECK (LENGTH(TRIM(nombre))>0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS consulta_tratamiento (
    id_publico CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()) UNIQUE,
    revision BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK (revision > 0),
    id_consulta BIGINT UNSIGNED NOT NULL,
    id_tratamiento BIGINT UNSIGNED NOT NULL,
    fecha_inicio DATE,
    fecha_fin DATE,
    observaciones TEXT,
    nombre_historico VARCHAR(200),
    fecha_registro DATETIME(3),
    autor_historico JSON,
    PRIMARY KEY (id_consulta, id_tratamiento),
    CONSTRAINT fk_consulta_tratamiento_consulta FOREIGN KEY (id_consulta)
      REFERENCES consulta_odontologica (id_consulta),
    CONSTRAINT fk_consulta_tratamiento_tratamiento FOREIGN KEY (id_tratamiento)
      REFERENCES tratamiento (id_tratamiento),
    CONSTRAINT chk_consulta_tratamiento_fechas
      CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS receta (
    estado VARCHAR(20) COLLATE utf8mb4_0900_bin NOT NULL DEFAULT 'BORRADOR' CHECK(estado IN('BORRADOR','EMITIDA','ANULADA')),
    contenido_historico JSON,
    motivo_anulacion TEXT,
    id_publico CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()) UNIQUE,
    revision BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK (revision > 0),
    id_receta BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_consulta BIGINT UNSIGNED NOT NULL,
    fecha_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_receta),
    CONSTRAINT uq_receta_consulta UNIQUE (id_consulta),
    CONSTRAINT fk_receta_consulta FOREIGN KEY (id_consulta)
      REFERENCES consulta_odontologica (id_consulta),
    CONSTRAINT chk_receta_instantanea CHECK(estado='BORRADOR' OR COALESCE((JSON_TYPE(contenido_historico)='OBJECT' AND JSON_TYPE(JSON_EXTRACT(contenido_historico,'$.medicamentos'))='ARRAY' AND JSON_LENGTH(JSON_EXTRACT(contenido_historico,'$.medicamentos'))>0),FALSE)),
    CONSTRAINT chk_receta_anulacion CHECK(estado<>'ANULADA' OR (motivo_anulacion IS NOT NULL AND LENGTH(TRIM(motivo_anulacion))>0)),
    CONSTRAINT chk_receta_textos CHECK (LENGTH(TRIM(estado))>0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS medicamento (
    id_publico CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()) UNIQUE,
    revision BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK (revision > 0),
    id_medicamento BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre_generico VARCHAR(180) NOT NULL,
    presentacion VARCHAR(150),
    concentracion VARCHAR(100),
    PRIMARY KEY (id_medicamento),
    INDEX ix_medicamento_nombre (nombre_generico),
    CONSTRAINT chk_medicamento_textos CHECK (LENGTH(TRIM(nombre_generico))>0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS detalle_receta (
    id_publico CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (UUID()) UNIQUE,
    revision BIGINT UNSIGNED NOT NULL DEFAULT 1 CHECK (revision > 0),
    id_receta BIGINT UNSIGNED NOT NULL,
    id_medicamento BIGINT UNSIGNED NOT NULL,
    dosis VARCHAR(120) NOT NULL,
    frecuencia VARCHAR(120) NOT NULL,
    duracion VARCHAR(120),
    via_administracion VARCHAR(100),
    indicaciones TEXT,
    PRIMARY KEY (id_receta, id_medicamento),
    CONSTRAINT fk_detalle_receta_receta FOREIGN KEY (id_receta)
      REFERENCES receta (id_receta),
    CONSTRAINT fk_detalle_receta_medicamento FOREIGN KEY (id_medicamento)
      REFERENCES medicamento (id_medicamento),
    CONSTRAINT chk_detalle_receta_textos CHECK (LENGTH(TRIM(dosis))>0 AND LENGTH(TRIM(frecuencia))>0)
) ENGINE=InnoDB;


-- Reservas e historia son parte del contrato de persistencia; el backend las escribe
-- junto con el recurso y la auditoria, dentro de la misma transaccion.
CREATE TABLE IF NOT EXISTS identidades_paciente (
 clave CHAR(64) PRIMARY KEY,
 tipo_documento VARCHAR(40) COLLATE utf8mb4_0900_bin NOT NULL,
 numero_documento VARCHAR(80) COLLATE utf8mb4_0900_bin NOT NULL,
 id_paciente BIGINT UNSIGNED NOT NULL,
 FOREIGN KEY(id_paciente) REFERENCES paciente(id_paciente),
 fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(tipo_documento,numero_documento),
    CONSTRAINT chk_identidades_paciente_textos CHECK (LENGTH(TRIM(tipo_documento))>0 AND LENGTH(TRIM(numero_documento))>0)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS operaciones (
 id_operacion CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 id_usuario BIGINT UNSIGNED NOT NULL,
 FOREIGN KEY(id_usuario) REFERENCES usuario(id_usuario),
 caso_uso VARCHAR(100) COLLATE utf8mb4_0900_bin NOT NULL,
 clave VARCHAR(200) COLLATE utf8mb4_0900_bin NOT NULL,
 hash_entrada CHAR(64) NOT NULL,
 codigo_respuesta INTEGER NOT NULL CHECK(codigo_respuesta BETWEEN 200 AND 299),
 respuesta JSON NOT NULL,
 fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(id_usuario,caso_uso,clave),
    CONSTRAINT chk_operaciones_textos CHECK (LENGTH(TRIM(caso_uso))>0 AND LENGTH(TRIM(clave))>0)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS revisiones (
 id_revision CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 tipo_recurso VARCHAR(100) NOT NULL,
 recurso_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 version BIGINT NOT NULL CHECK(version>0),
 id_usuario BIGINT UNSIGNED NOT NULL,
 FOREIGN KEY(id_usuario) REFERENCES usuario(id_usuario),
 fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 motivo TEXT NOT NULL CHECK(LENGTH(TRIM(motivo))>0),
 contenido_anterior JSON NOT NULL,
 UNIQUE(tipo_recurso,recurso_id,version),
    CONSTRAINT chk_revisiones_textos CHECK (LENGTH(TRIM(tipo_recurso))>0 AND LENGTH(TRIM(motivo))>0)
) ENGINE=InnoDB;

DELIMITER $$
DROP PROCEDURE IF EXISTS validar_consulta_clinica$$
CREATE PROCEDURE validar_consulta_clinica(IN historial_id BIGINT UNSIGNED, IN cita_id BIGINT UNSIGNED, IN odontologo_id BIGINT UNSIGNED)
SQL SECURITY INVOKER
BEGIN
  DECLARE paciente_historial BIGINT UNSIGNED DEFAULT NULL;
  DECLARE paciente_cita BIGINT UNSIGNED DEFAULT NULL;
  DECLARE profesional BIGINT UNSIGNED DEFAULT NULL;
  DECLARE estado_cita VARCHAR(30) DEFAULT NULL;
  DECLARE estado_historial VARCHAR(30) DEFAULT NULL;
  SELECT id_paciente,estado INTO paciente_historial,estado_historial FROM historial_clinico WHERE id_historial=historial_id FOR SHARE;
  SELECT id_paciente,id_odontologo,estado INTO paciente_cita,profesional,estado_cita FROM cita WHERE id_cita=cita_id FOR UPDATE;
  IF paciente_historial IS NULL OR paciente_cita IS NULL OR paciente_historial<>paciente_cita
     OR profesional<>odontologo_id OR estado_cita='CANCELADA' OR estado_historial<>'ACTIVO' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='CITA_HISTORIAL_PROFESIONAL_INCOMPATIBLE';
  END IF;
END$$
DROP TRIGGER IF EXISTS tr_consulta_insertar$$
CREATE TRIGGER tr_consulta_insertar BEFORE INSERT ON consulta_odontologica FOR EACH ROW
BEGIN
  CALL validar_consulta_clinica(NEW.id_historial,NEW.id_cita,NEW.id_odontologo);
END$$
DROP TRIGGER IF EXISTS tr_consulta_actualizar$$
CREATE TRIGGER tr_consulta_actualizar BEFORE UPDATE ON consulta_odontologica FOR EACH ROW
BEGIN
  IF NEW.id_historial<>OLD.id_historial OR NEW.id_cita<>OLD.id_cita OR NEW.id_odontologo<>OLD.id_odontologo THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='RELACION_CLINICA_INMUTABLE';
  END IF;
  IF OLD.estado='FINALIZADA' AND NEW.estado<>'FINALIZADA' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='CONSULTA_FINALIZADA'; END IF;
  IF NEW.estado='FINALIZADA' AND EXISTS(SELECT 1 FROM consulta_diagnostico WHERE id_consulta=NEW.id_consulta)
     AND (SELECT COUNT(*) FROM consulta_diagnostico WHERE id_consulta=NEW.id_consulta AND es_principal=1)<>1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DIAGNOSTICO_PRINCIPAL_REQUERIDO';
  END IF;
END$$
DROP TRIGGER IF EXISTS tr_consulta_atender$$
CREATE TRIGGER tr_consulta_atender AFTER INSERT ON consulta_odontologica FOR EACH ROW
BEGIN
  UPDATE cita SET estado='ATENDIDA' WHERE id_cita=NEW.id_cita;
END$$
DROP TRIGGER IF EXISTS tr_historial_propietario$$
CREATE TRIGGER tr_historial_propietario BEFORE UPDATE ON historial_clinico FOR EACH ROW
BEGIN
  IF NEW.id_paciente<>OLD.id_paciente THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='RELACION_CLINICA_INMUTABLE';
  END IF;
END$$
DROP TRIGGER IF EXISTS tr_cita_protegida$$
CREATE TRIGGER tr_cita_protegida BEFORE UPDATE ON cita FOR EACH ROW
BEGIN
  IF EXISTS(SELECT 1 FROM consulta_odontologica WHERE id_cita=OLD.id_cita) AND
     (NEW.id_paciente<>OLD.id_paciente OR NEW.id_odontologo<>OLD.id_odontologo OR NEW.estado<>'ATENDIDA') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='CITA_Y_CONSULTA_INCOMPATIBLES';
  END IF;
END$$
-- Serializar cambios de diagnosticos en la misma consulta (incluye clientes concurrentes).
DROP TRIGGER IF EXISTS tr_diagnostico_insertar$$
CREATE TRIGGER tr_diagnostico_insertar BEFORE INSERT ON consulta_diagnostico FOR EACH ROW
BEGIN
  DECLARE consulta_estado VARCHAR(30);
  SELECT estado INTO consulta_estado FROM consulta_odontologica WHERE id_consulta=NEW.id_consulta FOR UPDATE;
  IF consulta_estado='FINALIZADA' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='CONSULTA_FINALIZADA'; END IF;
END$$
DROP TRIGGER IF EXISTS tr_diagnostico_actualizar$$
CREATE TRIGGER tr_diagnostico_actualizar BEFORE UPDATE ON consulta_diagnostico FOR EACH ROW
BEGIN
  DECLARE consulta_estado VARCHAR(30);
  SELECT estado INTO consulta_estado FROM consulta_odontologica WHERE id_consulta=OLD.id_consulta FOR UPDATE;
  IF NEW.id_consulta<>OLD.id_consulta OR consulta_estado='FINALIZADA' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='RELACION_CLINICA_INMUTABLE';
  END IF;
END$$
DROP TRIGGER IF EXISTS tr_diagnostico_borrar$$
CREATE TRIGGER tr_diagnostico_borrar BEFORE DELETE ON consulta_diagnostico FOR EACH ROW
BEGIN
  DECLARE consulta_estado VARCHAR(30);
  SELECT estado INTO consulta_estado FROM consulta_odontologica WHERE id_consulta=OLD.id_consulta FOR UPDATE;
  IF consulta_estado='FINALIZADA' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='CONSULTA_FINALIZADA'; END IF;
END$$
DELIMITER ;

DELIMITER $$
DROP FUNCTION IF EXISTS instantanea_receta_valida$$
CREATE FUNCTION instantanea_receta_valida(datos JSON) RETURNS BOOLEAN DETERMINISTIC NO SQL SQL SECURITY INVOKER
BEGIN
 DECLARE i INT DEFAULT 0;
 DECLARE j INT;
 DECLARE campo VARCHAR(100);
 DECLARE medicamento JSON;
 DECLARE campos JSON;
 IF COALESCE(JSON_TYPE(datos),'NULL')<>'OBJECT' OR COALESCE(JSON_TYPE(JSON_EXTRACT(datos,'$.medicamentos')),'NULL')<>'ARRAY' THEN RETURN FALSE; END IF;
 IF JSON_LENGTH(JSON_EXTRACT(datos,'$.medicamentos')) NOT BETWEEN 1 AND 100 THEN RETURN FALSE; END IF;
 IF COALESCE(JSON_TYPE(JSON_EXTRACT(datos,'$.prescriptor_nombre_historico')),'NULL')<>'STRING'
   OR LENGTH(TRIM(JSON_UNQUOTE(JSON_EXTRACT(datos,'$.prescriptor_nombre_historico'))))=0
   OR COALESCE(JSON_TYPE(JSON_EXTRACT(datos,'$.colegiado_historico')),'NULL')<>'STRING'
   OR LENGTH(TRIM(JSON_UNQUOTE(JSON_EXTRACT(datos,'$.colegiado_historico'))))=0 THEN RETURN FALSE; END IF;
 SET campos=JSON_ARRAY('medicamento_id','nombre','presentacion','concentracion','dosis','frecuencia','duracion','via','indicaciones');
 WHILE i<JSON_LENGTH(JSON_EXTRACT(datos,'$.medicamentos')) DO
  SET medicamento=JSON_EXTRACT(datos,CONCAT('$.medicamentos[',i,']'));
  SET j=0;
  WHILE j<JSON_LENGTH(campos) DO
   SET campo=JSON_UNQUOTE(JSON_EXTRACT(campos,CONCAT('$[',j,']')));
   IF COALESCE(JSON_TYPE(JSON_EXTRACT(medicamento,CONCAT('$.',campo))),'NULL')<>'STRING'
      OR LENGTH(TRIM(JSON_UNQUOTE(JSON_EXTRACT(medicamento,CONCAT('$.',campo)))))=0 THEN RETURN FALSE; END IF;
   SET j=j+1;
  END WHILE;
  SET i=i+1;
 END WHILE;
 RETURN TRUE;
END$$
DROP TRIGGER IF EXISTS tr_receta_insertar$$
CREATE TRIGGER tr_receta_insertar BEFORE INSERT ON receta FOR EACH ROW
BEGIN
 IF NEW.estado<>'BORRADOR' AND NOT instantanea_receta_valida(NEW.contenido_historico) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='INSTANTANEA_RECETA_INVALIDA'; END IF;
END$$
DROP TRIGGER IF EXISTS tr_receta_actualizar$$
CREATE TRIGGER tr_receta_actualizar BEFORE UPDATE ON receta FOR EACH ROW
BEGIN
 IF NEW.estado<>'BORRADOR' AND NOT instantanea_receta_valida(NEW.contenido_historico) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='INSTANTANEA_RECETA_INVALIDA'; END IF;
 IF OLD.estado<>'BORRADOR' AND (NEW.estado='BORRADOR' OR NEW.id_consulta<>OLD.id_consulta OR NEW.id_publico<>OLD.id_publico OR NEW.revision<>OLD.revision+1
    OR NOT EXISTS(SELECT 1 FROM revisiones WHERE tipo_recurso='receta' AND recurso_id=OLD.id_publico AND version=OLD.revision AND contenido_anterior=OLD.contenido_historico)) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='CORRECCION_RECETA_REQUIERE_REVISION';
 END IF;
END$$
DROP TRIGGER IF EXISTS tr_receta_borrar$$
CREATE TRIGGER tr_receta_borrar BEFORE DELETE ON receta FOR EACH ROW
BEGIN
 IF OLD.estado<>'BORRADOR' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='RECETA_EMITIDA_NO_SE_ELIMINA'; END IF;
END$$
DELIMITER ;

DELIMITER $$
DROP TRIGGER IF EXISTS tr_auditoria_update$$
CREATE TRIGGER tr_auditoria_update BEFORE UPDATE ON auditoria FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='REGISTRO_APPEND_ONLY'; END$$
DELIMITER ;

DELIMITER $$
DROP TRIGGER IF EXISTS tr_auditoria_delete$$
CREATE TRIGGER tr_auditoria_delete BEFORE DELETE ON auditoria FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='REGISTRO_APPEND_ONLY'; END$$
DELIMITER ;

DELIMITER $$
DROP TRIGGER IF EXISTS tr_revisiones_update$$
CREATE TRIGGER tr_revisiones_update BEFORE UPDATE ON revisiones FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='REGISTRO_APPEND_ONLY'; END$$
DELIMITER ;

DELIMITER $$
DROP TRIGGER IF EXISTS tr_revisiones_delete$$
CREATE TRIGGER tr_revisiones_delete BEFORE DELETE ON revisiones FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='REGISTRO_APPEND_ONLY'; END$$
DELIMITER ;

DELIMITER $$
DROP TRIGGER IF EXISTS tr_operaciones_update$$
CREATE TRIGGER tr_operaciones_update BEFORE UPDATE ON operaciones FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='REGISTRO_APPEND_ONLY'; END$$
DELIMITER ;

DELIMITER $$
DROP TRIGGER IF EXISTS tr_operaciones_delete$$
CREATE TRIGGER tr_operaciones_delete BEFORE DELETE ON operaciones FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='REGISTRO_APPEND_ONLY'; END$$
DELIMITER ;

DELIMITER $$
DROP PROCEDURE IF EXISTS verificar_receta_borrador$$
CREATE PROCEDURE verificar_receta_borrador(IN receta_id BIGINT UNSIGNED) SQL SECURITY INVOKER
BEGIN
 DECLARE estado_actual VARCHAR(20);
 SELECT estado INTO estado_actual FROM receta WHERE id_receta=receta_id FOR UPDATE;
 IF estado_actual<>'BORRADOR' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='DETALLE_RECETA_EMITIDA_INMUTABLE'; END IF;
END$$
DELIMITER ;

DELIMITER $$
DROP TRIGGER IF EXISTS tr_detalle_insert$$
CREATE TRIGGER tr_detalle_insert BEFORE INSERT ON detalle_receta FOR EACH ROW
BEGIN CALL verificar_receta_borrador(NEW.id_receta);  END$$
DELIMITER ;

DELIMITER $$
DROP TRIGGER IF EXISTS tr_detalle_update$$
CREATE TRIGGER tr_detalle_update BEFORE UPDATE ON detalle_receta FOR EACH ROW
BEGIN CALL verificar_receta_borrador(NEW.id_receta); IF NEW.id_receta<>OLD.id_receta THEN CALL verificar_receta_borrador(OLD.id_receta); END IF; END$$
DELIMITER ;

DELIMITER $$
DROP TRIGGER IF EXISTS tr_detalle_delete$$
CREATE TRIGGER tr_detalle_delete BEFORE DELETE ON detalle_receta FOR EACH ROW
BEGIN CALL verificar_receta_borrador(OLD.id_receta);  END$$
DELIMITER ;

CREATE TABLE IF NOT EXISTS modelo_database (
 id SMALLINT PRIMARY KEY CHECK(id=1), version INT NOT NULL CHECK(version>0), huella CHAR(64) NOT NULL,
 fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CALL _huella_modelo(@bdii_huella);
INSERT INTO modelo_database(id,version,huella) VALUES(1,4,@bdii_huella) ON DUPLICATE KEY UPDATE id=id;
DO RELEASE_LOCK('bdii_clinica_inicializador_v2');
