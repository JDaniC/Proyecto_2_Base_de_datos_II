# Instrucciones para agentes — Proyecto de Bases de Datos II

## Propósito y fuentes

Este repositorio corresponde al proyecto final del curso Bases de Datos II de la Universidad Rafael Landívar. El objetivo es construir una aplicación cliente-servidor para administrar historiales clínicos de cuatro instituciones, comparar motores de bases de datos y conservar reglas de negocio equivalentes mediante una arquitectura hexagonal.

Usa como fuentes del alcance y del modelo:

- `Primera Entrega Proyecto (1).pdf`: levantamiento de información, entidades, atributos, clasificación de datos y operaciones esperadas para las cuatro instituciones.
- `Proyecto final bases II (1) (4).pdf`: instrucciones y resultados esperados de la entrega final.
- `README.md` y los archivos SQL dentro de `Database/`: estado actual del repositorio.

Los PDF están en la carpeta de descargas del autor; sus rutas pueden no estar disponibles en otros equipos. Si no se encuentran, trabaja con este resumen y con las fuentes existentes en el repositorio. Distingue los requisitos académicos escritos en los documentos de cualquier solicitud concreta del usuario. Ante contradicciones, señala la diferencia y prioriza la instrucción explícita más reciente del usuario; para el alcance académico, toma el documento de proyecto final como requisito de la entrega y la primera entrega como modelo de partida sujeto a correcciones.

## Asignación de instituciones y motores

La entrega final exige cuatro motores distintos, sin reutilizar uno entre instituciones. La primera entrega propone esta asignación, que cubre esa restricción:

| Institución | Motor propuesto | Necesidad principal |
|---|---|---|
| Hospital General | PostgreSQL | Expediente amplio, integridad relacional y transacciones estrictas en consultas, diagnósticos, tratamientos, exámenes y hospitalizaciones. |
| Clínica Odontológica | MySQL | Agenda y atención odontológica estructuradas, con flujo directo para secretaría y odontólogos. |
| Laboratorio Clínico | MongoDB | Órdenes, muestras y resultados con parámetros variables según el examen, además de seguimiento y versiones. |
| Centro Médico Pediátrico | Firebase / Cloud Firestore | Consultas frecuentes centradas en el paciente, seguimiento de crecimiento y vacunación. |

La justificación por volumen, estructura de datos y consistencia debe aparecer en el documento comparativo final. Si se cambia la asignación, se requiere justificarla y mantener los cuatro motores distintos.

## Alcance funcional común

La aplicación debe permitir, según la institución y los datos que le correspondan:

- Registrar pacientes nuevos sin duplicar pacientes ni historiales; buscar pacientes existentes y reutilizar su expediente.
- Consultar de manera ordenada el historial clínico y sus eventos.
- Administrar citas (crear, reprogramar, cancelar y asignar al profesional correspondiente).
- Registrar consultas, diagnósticos, tratamientos, recetas y medicamentos.
- Registrar los procesos propios de cada institución: hospitalizaciones, cama y seguro en el hospital; agenda odontológica en la clínica; órdenes, muestras, resultados, informes, reactivos y cobros en el laboratorio; responsables, crecimiento y vacunas en pediatría.
- Archivar o desactivar historiales y cuentas cuando corresponda, preservando la historia clínica.
- Autenticar al usuario y enrutar sus operaciones al motor de la institución asociada, sin duplicar la lógica de negocio por motor.
- Hacer que las consultas y operaciones equivalentes se comporten de forma consistente en los cuatro motores, respetando las capacidades transaccionales particulares de cada uno.

La Entrega II también requiere una aplicación funcional cliente-servidor, visualización coherente sin cambios de interfaz por motor, modelos corregidos tras retroalimentación y un documento comparativo breve sobre modelado, consistencia, seguridad y asignación.

## Modelos descritos en la primera entrega

### Hospital General — PostgreSQL

El modelo relacional define 46 entidades: Paciente, Contacto_Emergencia, Historial_Clinico, Alergia, Paciente_Alergia, Antecedente_Medico, Personal_Medico, Especialidad, Personal_Especialidad, Cita, Consulta, Signos_Vitales, Catalogo_Diagnostico, Diagnostico, Tratamiento, Diagnostico_Tratamiento, Procedimiento, Procedimiento_Realizado, Laboratorio_Farmaceutico, Unidad_Medida, Medicamento, Principio_Activo, Medicamento_Principio_Activo, Receta, Detalle_Receta, Examen_Medico, Orden_Examen, Detalle_Orden_Examen, Resultado_Examen, Parametro_Examen, Resultado_Detalle, Hospitalizacion, Hospitalizacion_Consulta, Hospitalizacion_Diagnostico, Habitacion, Cama, Asignacion_Cama, Usuario, Rol, Usuario_Rol, Auditoria, Aseguradora, Plan_Seguro, Titular_Seguro y Paciente_Poliza.

Las relaciones deben preservar la trazabilidad paciente → historial → citas/consultas → diagnósticos, tratamientos, recetas, exámenes y hospitalizaciones. El modelo de referencia incluye claves, restricciones de unicidad y validaciones de fechas y cantidades.

### Clínica Odontológica — MySQL

El modelo relacional define 14 entidades: Paciente, Secretaria, Odontologo, Cita, Historial_Clinico, Antecedente, Consulta_Odontologica, Diagnostico, Consulta_Diagnostico, Tratamiento, Consulta_Tratamiento, Receta, Medicamento y Detalle_Receta. Cada paciente tiene un expediente; una cita atendida se vincula con una consulta; diagnósticos y tratamientos se relacionan con consultas mediante entidades asociativas; una receta conserva dosis, frecuencia, duración, vía e indicaciones.

### Laboratorio Clínico — MongoDB

La primera entrega describe 22 colecciones principales: pacientes, solicitantes, tipos_muestra, metodos, pruebas, ordenes, muestras, eventos_muestra, resultados, informes, equipos, proveedores, reactivos, lotes_reactivo, movimientos_reactivo, controles_calidad, personal, usuarios, roles, auditoria, facturas y pagos. Describe subdocumentos para contactos, parámetros, ítems de orden, rectificaciones, procedencia de muestras, componentes de resultado, cabeceras de informe, mediciones de control, receptores y líneas de factura.

Justifica explícitamente qué datos se embeben y cuáles se referencian. Las órdenes pueden contener sus ítems; resultados, informes y movimientos deben conservar referencias e historial. No reemplaces una muestra repetida ni un resultado validado: registra una nueva muestra o versión, mantén la diferencia entre corrección y nuevo análisis y deja evidencia del responsable y motivo. Los informes deben conservar las versiones exactas de resultados que incluyeron. Valida referencias y evita doble pago o consumo de reactivo concurrente.

### Centro Médico Pediátrico — Firebase / Cloud Firestore

La primera entrega propone seis colecciones: pacientes, pediatras, citas, consultas, vacunas y aplicaciones_vacuna. El documento de paciente contiene responsables, alergias y antecedentes; la consulta contiene control de crecimiento, diagnósticos, tratamientos y receta/medicamentos; el catálogo de vacunas contiene dosis. Las aplicaciones de vacunas mantienen referencias al paciente, vacuna, dosis y pediatra.

Cada menor debe tener al menos un responsable principal y debe quedar claro quién autoriza la atención. Conserva consultas y mediciones históricas; no sustituyas entradas anteriores. Evita duplicar la misma dosis para un paciente salvo una corrección controlada. Justifica los datos embebidos frente a los referenciados y considera el crecimiento potencial de historiales al decidir dónde guardar listas.

## Datos, privacidad y seguridad

- Trata los datos identificables y de contacto como confidenciales y los datos clínicos (alergias, antecedentes, síntomas, diagnósticos, tratamientos, recetas, resultados y vacunas aplicadas) como restringidos.
- Aplica mínimo privilegio por institución, rol y función; valida autorización en el servidor y registra las operaciones clínicas o administrativas relevantes.
- No expongas información clínica en logs, mensajes de error, ejemplos, capturas ni datos de demostración. Usa datos sintéticos.
- No almacenes contraseñas en texto plano: utiliza hashes de contraseña apropiados. No guardes secretos o credenciales dentro del repositorio.
- Conserva trazabilidad de correcciones y versiones; archivar un historial no debe borrar eventos clínicos previos.
- Las reglas de autorización deben proteger también lecturas y búsquedas, no solo escrituras.

## Arquitectura y guía de implementación

- Mantén el dominio y los casos de uso independientes de PostgreSQL, MySQL, MongoDB y Firebase. Encapsula cada motor detrás de puertos/repositorios y adaptadores específicos; la selección de adaptador debe depender de la institución del usuario autenticado.
- Centraliza las reglas de negocio para que registrar una consulta, agregar diagnósticos o emitir una receta tenga semántica equivalente en los cuatro motores. Documenta y aplica las diferencias de transacción y consistencia en cada adaptador.
- Conserva contratos y nombres coherentes entre casos de uso, API e interfaz. La interfaz no debe filtrar qué motor está activo.
- Añade validaciones para claves/relaciones, pertenencia al paciente correcto, unicidad, estados permitidos y fechas válidas. Para operaciones concurrentes, evita duplicados, actualizaciones perdidas, doble cobro y saldos o inventarios incorrectos.
- No inventes requisitos ni presentes modelos planeados como funcionalidad terminada. Expón supuestos y diferencias con los documentos antes de cambiar el modelo.
- Mantén la documentación y los nombres de dominio en español, salvo que el código existente establezca una convención diferente.

## Estado observado del repositorio

Al revisar el repositorio para crear estas instrucciones, se encontraron:

- `Database/hospital_general_postgresql.sql`: esquema PostgreSQL dentro del esquema `hospital_general`, basado en las 46 entidades del hospital.
- `Database/clinica_odontologica_mysql.sql`: esquema MySQL `clinica_odontologica`, basado en las 14 entidades de la clínica.
- `README.md`: identifica el repositorio como el espacio de trabajo de la entrega final.
- La carpeta `Database/` contiene los dos esquemas SQL; `Agente/` y `plan/` no contenían otros archivos al momento de esta revisión. No se encontró aplicación cliente-servidor ni código de adaptadores, ni esquemas/implementaciones del laboratorio y centro pediátrico.

Este inventario es una observación del momento de creación, no una garantía de estado futuro. Inspecciona el repositorio antes de cada cambio. Mantén los scripts SQL reproducibles y evita cambios destructivos de datos o esquemas existentes sin instrucciones explícitas.
