-- Extensión de lectura v1 independiente del manifiesto M01. Administrador, escritores detenidos.
-- Aditiva y transaccional. Una base legada clínica requiere reconciliación explícita.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('bdii_historial_v1'));
CREATE SCHEMA IF NOT EXISTS hospital_historial;
CREATE TABLE IF NOT EXISTS hospital_historial.modelo (
 id SMALLINT PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL CHECK(version=1),
 estado TEXT NOT NULL CHECK(estado IN ('LISTO','RECONCILIAR'))
);
CREATE TABLE IF NOT EXISTS hospital_historial.eventos (
 id UUID PRIMARY KEY, paciente_id UUID NOT NULL REFERENCES hospital_general.paciente(id_publico),
 tipo VARCHAR(30) NOT NULL CHECK(tipo IN ('CONSULTA','DIAGNOSTICO','TRATAMIENTO','RECETA','ARCHIVO','HOSPITALIZACION','EXAMEN')),
 fecha_hora VARCHAR(30) COLLATE "C" NOT NULL CHECK(fecha_hora ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{9}Z$'),
 contenido JSONB NOT NULL CHECK(jsonb_typeof(contenido)='object' AND octet_length(contenido::text)<=8192)
);
CREATE INDEX IF NOT EXISTS ix_historial_paciente_tipo_fecha ON hospital_historial.eventos(paciente_id,tipo,fecha_hora,id);
INSERT INTO hospital_historial.modelo(id,version,estado)
 SELECT 1,1,CASE WHEN EXISTS(SELECT 1 FROM hospital_general.consulta) OR EXISTS(SELECT 1 FROM hospital_general.hospitalizacion)
  OR EXISTS(SELECT 1 FROM hospital_general.historial_clinico WHERE estado_historial='ARCHIVADO') THEN 'RECONCILIAR' ELSE 'LISTO' END
 ON CONFLICT(id) DO NOTHING;
GRANT USAGE ON SCHEMA hospital_historial TO hospital_app;
GRANT SELECT ON hospital_historial.modelo TO hospital_app;
GRANT SELECT,INSERT ON hospital_historial.eventos TO hospital_app;
COMMIT;
