-- Base relacional de la Clínica Odontológica (MySQL 8.0+).
-- Basada en las 14 entidades y atributos del modelo relacional del proyecto.

CREATE DATABASE IF NOT EXISTS clinica_odontologica
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE clinica_odontologica;

CREATE TABLE IF NOT EXISTS paciente (
    id_paciente BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombres VARCHAR(160) NOT NULL,
    apellidos VARCHAR(160) NOT NULL,
    fecha_nacimiento DATE,
    telefono VARCHAR(30),
    correo VARCHAR(254),
    estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
    PRIMARY KEY (id_paciente)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS secretaria (
    id_secretaria BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombres VARCHAR(160) NOT NULL,
    apellidos VARCHAR(160) NOT NULL,
    telefono VARCHAR(30),
    correo VARCHAR(254),
    PRIMARY KEY (id_secretaria)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS odontologo (
    id_odontologo BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombres VARCHAR(160) NOT NULL,
    apellidos VARCHAR(160) NOT NULL,
    colegiado VARCHAR(50) NOT NULL,
    telefono VARCHAR(30),
    correo VARCHAR(254),
    PRIMARY KEY (id_odontologo),
    CONSTRAINT uq_odontologo_colegiado UNIQUE (colegiado)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cita (
    id_cita BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_paciente BIGINT UNSIGNED NOT NULL,
    id_odontologo BIGINT UNSIGNED NOT NULL,
    id_secretaria BIGINT UNSIGNED NOT NULL,
    fecha_hora DATETIME NOT NULL,
    motivo TEXT NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'PROGRAMADA',
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_cita),
    CONSTRAINT fk_cita_paciente FOREIGN KEY (id_paciente)
      REFERENCES paciente (id_paciente),
    CONSTRAINT fk_cita_odontologo FOREIGN KEY (id_odontologo)
      REFERENCES odontologo (id_odontologo),
    CONSTRAINT fk_cita_secretaria FOREIGN KEY (id_secretaria)
      REFERENCES secretaria (id_secretaria),
    INDEX ix_cita_paciente_fecha (id_paciente, fecha_hora),
    INDEX ix_cita_odontologo_fecha (id_odontologo, fecha_hora)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS historial_clinico (
    id_historial BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_paciente BIGINT UNSIGNED NOT NULL,
    fecha_apertura DATE NOT NULL DEFAULT (CURRENT_DATE),
    estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
    motivo_cierre TEXT,
    observaciones TEXT,
    PRIMARY KEY (id_historial),
    CONSTRAINT uq_historial_paciente UNIQUE (id_paciente),
    CONSTRAINT fk_historial_paciente FOREIGN KEY (id_paciente)
      REFERENCES paciente (id_paciente)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS antecedente (
    id_antecedente BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_historial BIGINT UNSIGNED NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    fecha_registro DATE NOT NULL DEFAULT (CURRENT_DATE),
    PRIMARY KEY (id_antecedente),
    CONSTRAINT fk_antecedente_historial FOREIGN KEY (id_historial)
      REFERENCES historial_clinico (id_historial),
    INDEX ix_antecedente_historial_fecha (id_historial, fecha_registro)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS consulta_odontologica (
    id_consulta BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_historial BIGINT UNSIGNED NOT NULL,
    id_cita BIGINT UNSIGNED NOT NULL,
    id_odontologo BIGINT UNSIGNED NOT NULL,
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motivo TEXT NOT NULL,
    observaciones TEXT,
    estado VARCHAR(30) NOT NULL DEFAULT 'FINALIZADA',
    PRIMARY KEY (id_consulta),
    CONSTRAINT uq_consulta_cita UNIQUE (id_cita),
    CONSTRAINT fk_consulta_historial FOREIGN KEY (id_historial)
      REFERENCES historial_clinico (id_historial),
    CONSTRAINT fk_consulta_cita FOREIGN KEY (id_cita)
      REFERENCES cita (id_cita),
    CONSTRAINT fk_consulta_odontologo FOREIGN KEY (id_odontologo)
      REFERENCES odontologo (id_odontologo),
    INDEX ix_consulta_historial_fecha (id_historial, fecha_hora)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS diagnostico (
    id_diagnostico BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(180) NOT NULL,
    descripcion TEXT,
    PRIMARY KEY (id_diagnostico),
    CONSTRAINT uq_diagnostico_codigo UNIQUE (codigo)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS consulta_diagnostico (
    id_consulta BIGINT UNSIGNED NOT NULL,
    id_diagnostico BIGINT UNSIGNED NOT NULL,
    es_principal BOOLEAN NOT NULL DEFAULT FALSE,
    observaciones TEXT,
    PRIMARY KEY (id_consulta, id_diagnostico),
    CONSTRAINT fk_consulta_diagnostico_consulta FOREIGN KEY (id_consulta)
      REFERENCES consulta_odontologica (id_consulta),
    CONSTRAINT fk_consulta_diagnostico_diagnostico FOREIGN KEY (id_diagnostico)
      REFERENCES diagnostico (id_diagnostico)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tratamiento (
    id_tratamiento BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(180) NOT NULL,
    descripcion TEXT,
    PRIMARY KEY (id_tratamiento),
    CONSTRAINT uq_tratamiento_nombre UNIQUE (nombre)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS consulta_tratamiento (
    id_consulta BIGINT UNSIGNED NOT NULL,
    id_tratamiento BIGINT UNSIGNED NOT NULL,
    fecha_inicio DATE,
    fecha_fin DATE,
    observaciones TEXT,
    PRIMARY KEY (id_consulta, id_tratamiento),
    CONSTRAINT fk_consulta_tratamiento_consulta FOREIGN KEY (id_consulta)
      REFERENCES consulta_odontologica (id_consulta),
    CONSTRAINT fk_consulta_tratamiento_tratamiento FOREIGN KEY (id_tratamiento)
      REFERENCES tratamiento (id_tratamiento),
    CONSTRAINT chk_consulta_tratamiento_fechas
      CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS receta (
    id_receta BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_consulta BIGINT UNSIGNED NOT NULL,
    fecha_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_receta),
    CONSTRAINT uq_receta_consulta UNIQUE (id_consulta),
    CONSTRAINT fk_receta_consulta FOREIGN KEY (id_consulta)
      REFERENCES consulta_odontologica (id_consulta)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS medicamento (
    id_medicamento BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre_generico VARCHAR(180) NOT NULL,
    presentacion VARCHAR(150),
    concentracion VARCHAR(100),
    PRIMARY KEY (id_medicamento),
    INDEX ix_medicamento_nombre (nombre_generico)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS detalle_receta (
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
      REFERENCES medicamento (id_medicamento)
) ENGINE=InnoDB;
