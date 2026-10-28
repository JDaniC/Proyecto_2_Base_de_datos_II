-- Extensión v1 independiente de M02; DDL aditivo reejecutable tras interrupción.
-- Administrador, escritores detenidos. No modifica ni borra tablas clínicas.
CREATE DATABASE IF NOT EXISTS clinica_historial CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
CREATE TABLE IF NOT EXISTS clinica_historial.modelo (
 id SMALLINT PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL CHECK(version=1),
 estado VARCHAR(20) NOT NULL CHECK(estado IN ('LISTO','RECONCILIAR'))
);
CREATE TABLE IF NOT EXISTS clinica_historial.eventos (
 id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 paciente_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 tipo VARCHAR(30) NOT NULL CHECK(tipo IN ('CONSULTA','DIAGNOSTICO','TRATAMIENTO','RECETA','ARCHIVO')),
 fecha_hora VARCHAR(30) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 contenido JSON NOT NULL CHECK(JSON_TYPE(contenido)='OBJECT' AND OCTET_LENGTH(CAST(contenido AS CHAR))<=8192),
 CONSTRAINT fk_historial_paciente FOREIGN KEY(paciente_id) REFERENCES clinica_odontologica.paciente(id_publico),
 INDEX ix_historial_paciente_tipo_fecha(paciente_id,tipo,fecha_hora,id)
);
INSERT INTO clinica_historial.modelo(id,version,estado)
 SELECT 1,1,CASE WHEN EXISTS(SELECT 1 FROM clinica_odontologica.consulta_odontologica)
 OR EXISTS(SELECT 1 FROM clinica_odontologica.historial_clinico WHERE estado='ARCHIVADO') THEN 'RECONCILIAR' ELSE 'LISTO' END
 ON DUPLICATE KEY UPDATE id=id;
GRANT SELECT ON clinica_historial.modelo TO 'clinica_app'@'%';
GRANT SELECT,INSERT ON clinica_historial.eventos TO 'clinica_app'@'%';
