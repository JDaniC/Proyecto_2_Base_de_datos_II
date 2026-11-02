-- E04-P1-03. Extensión aditiva, sin alterar inicializadores ni M01–M09.
-- Administrador, escritores detenidos. Reejecutable; conserva datos y estado de reconciliación.
BEGIN;
SET LOCAL search_path TO hospital_general, public;
SELECT pg_advisory_xact_lock(hashtext('bdii_hospital_servicios_v1'));
CREATE SCHEMA IF NOT EXISTS hospital_servicios;
CREATE TABLE IF NOT EXISTS hospital_servicios.modelo (
 id smallint PRIMARY KEY CHECK(id=1), version integer NOT NULL CHECK(version=1),
 estado text NOT NULL CHECK(estado IN('LISTO','RECONCILIAR'))
);
CREATE TABLE IF NOT EXISTS hospital_servicios.catalogo_examen (
 id_examen bigint PRIMARY KEY REFERENCES examen_medico(id_examen), activo boolean NOT NULL,
 metodo text NOT NULL, tipo_muestra text NOT NULL, tiempo_horas integer NOT NULL CHECK(tiempo_horas>=0)
);
CREATE TABLE IF NOT EXISTS hospital_servicios.examen_parametro (
 id_examen bigint NOT NULL REFERENCES examen_medico(id_examen),
 id_parametro bigint NOT NULL REFERENCES parametro_examen(id_parametro),
 id_unidad bigint REFERENCES unidad_medida(id_unidad), referencia text NOT NULL,
 activo boolean NOT NULL DEFAULT true, PRIMARY KEY(id_examen,id_parametro)
);
CREATE TABLE IF NOT EXISTS hospital_servicios.catalogo_procedimiento (
 id_procedimiento bigint PRIMARY KEY REFERENCES procedimiento(id_procedimiento), activo boolean NOT NULL
);
CREATE TABLE IF NOT EXISTS hospital_servicios.recursos (
 id uuid PRIMARY KEY, tipo text NOT NULL CHECK(tipo IN('orden','resultado','poliza','procedimiento')),
 paciente_id uuid NOT NULL REFERENCES paciente(id_publico), consulta_id uuid REFERENCES consulta(id_publico),
 orden_id uuid REFERENCES orden_examen(id_publico), revision bigint NOT NULL CHECK(revision>0),
 contenido jsonb NOT NULL CHECK(jsonb_typeof(contenido)='object' AND octet_length(contenido::text)<=262144),
 fecha_hora timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_hospital_servicios_paciente ON hospital_servicios.recursos(tipo,paciente_id,fecha_hora DESC,id DESC);
CREATE INDEX IF NOT EXISTS ix_hospital_servicios_orden ON hospital_servicios.recursos(tipo,orden_id,fecha_hora DESC,id DESC);
INSERT INTO hospital_servicios.modelo(id,version,estado)
 SELECT 1,1,CASE WHEN EXISTS(SELECT 1 FROM orden_examen) OR EXISTS(SELECT 1 FROM poliza)
 OR EXISTS(SELECT 1 FROM procedimiento_realizado) THEN 'RECONCILIAR' ELSE 'LISTO' END
 ON CONFLICT(id) DO NOTHING;
-- Catálogos sintéticos de entrega. No modifica las referencias preexistentes con el mismo nombre/código.
INSERT INTO examen_medico(id_publico,nombre,descripcion,tipo) VALUES
 ('08000000-0000-4000-8000-000000000001','Hemograma académico','Catálogo sintético de demostración','HEMATOLOGIA'),
 ('08000000-0000-4000-8000-000000000002','Glucosa académica','Catálogo sintético de demostración','QUIMICA') ON CONFLICT(nombre) DO NOTHING;
INSERT INTO parametro_examen(id_publico,nombre,descripcion) VALUES
 ('08000000-0000-4000-8000-000000000011','Hemoglobina académica','Parámetro sintético'),
 ('08000000-0000-4000-8000-000000000012','Glucosa académica','Parámetro sintético') ON CONFLICT(nombre) DO NOTHING;
INSERT INTO unidad_medida(id_publico,codigo,nombre,dimension) VALUES
 ('08000000-0000-4000-8000-000000000021','g/dL','Gramos por decilitro','CONCENTRACION'),
 ('08000000-0000-4000-8000-000000000022','mg/dL','Miligramos por decilitro','CONCENTRACION') ON CONFLICT(codigo) DO NOTHING;
INSERT INTO hospital_servicios.catalogo_examen
 SELECT id_examen,true,'Método de demostración','SANGRE',24 FROM examen_medico
 WHERE nombre IN('Hemograma académico','Glucosa académica') ON CONFLICT(id_examen) DO NOTHING;
INSERT INTO hospital_servicios.examen_parametro
 SELECT e.id_examen,p.id_parametro,u.id_unidad,'Referencia de catálogo sintético',true
 FROM examen_medico e JOIN parametro_examen p ON p.nombre=CASE e.nombre WHEN 'Hemograma académico' THEN 'Hemoglobina académica' ELSE 'Glucosa académica' END
 JOIN unidad_medida u ON u.codigo=CASE e.nombre WHEN 'Hemograma académico' THEN 'g/dL' ELSE 'mg/dL' END
 WHERE e.nombre IN('Hemograma académico','Glucosa académica') ON CONFLICT(id_examen,id_parametro) DO NOTHING;
INSERT INTO procedimiento(id_publico,nombre,descripcion) VALUES
 ('08000000-0000-4000-8000-000000000031','Curación académica','Procedimiento sintético de demostración'),
 ('08000000-0000-4000-8000-000000000032','Procedimiento inactivo académico','Referencia no seleccionable de ensayo') ON CONFLICT(nombre) DO NOTHING;
INSERT INTO hospital_servicios.catalogo_procedimiento SELECT id_procedimiento,true FROM procedimiento WHERE nombre='Curación académica' ON CONFLICT(id_procedimiento) DO NOTHING;
INSERT INTO hospital_servicios.catalogo_procedimiento SELECT id_procedimiento,false FROM procedimiento WHERE nombre='Procedimiento inactivo académico' ON CONFLICT(id_procedimiento) DO NOTHING;
INSERT INTO aseguradora(id_publico,nombre,estado) VALUES
 ('08000000-0000-4000-8000-000000000041','Aseguradora académica','ACTIVA') ON CONFLICT(nombre) DO NOTHING;
INSERT INTO plan_seguro(id_publico,id_aseguradora,nombre_plan,version_plan,porcentaje_cobertura,monto_maximo_cobertura,moneda,estado)
 SELECT '08000000-0000-4000-8000-000000000042',id_aseguradora,'Plan hospitalario académico','1',80,100000,'GTQ','ACTIVO'
 FROM aseguradora WHERE nombre='Aseguradora académica' ON CONFLICT(id_aseguradora,nombre_plan,version_plan) DO NOTHING;
INSERT INTO especialidad(nombre,descripcion) VALUES('Medicina General','Referencia de catálogo') ON CONFLICT(nombre) DO NOTHING;
GRANT USAGE ON SCHEMA hospital_servicios TO hospital_app;
GRANT SELECT ON ALL TABLES IN SCHEMA hospital_servicios TO hospital_app;
GRANT INSERT,UPDATE ON hospital_servicios.recursos TO hospital_app;
INSERT INTO medicamento(id_publico,nombre,presentacion,descripcion) VALUES ('08000000-0000-4000-8000-000000000051','Medicamento académico','Presentación académica','Referencia sintética; dosificación siempre explícita del profesional') ON CONFLICT DO NOTHING;
COMMIT;
