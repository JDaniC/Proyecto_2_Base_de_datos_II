# Servicios hospitalarios v1 — E04-P1-03

Solo Hospital General. La sesión verificada y la cuenta local actual determinan
institución, permisos y profesional. La UI no envía autor, rol ni institución.
Exámenes/procedimientos requieren historial.leer + consultas.registrar y médico
activo; pólizas requieren pacientes.administrar. Lectura de coberturas y catálogos:
pacientes.administrar o historial.leer. No hay mantenimiento de referencias por UI.

## Persistencia y correspondencia

| Proceso | Modelo original hospital_general | Extensión aditiva |
|---|---|---|
| Orden | orden_examen → consulta, personal; detalle_orden_examen → examen_medico | Snapshot de prioridad, paciente, código y configuración del examen |
| Resultado | resultado_examen → detalle_orden; resultado_detalle → parametro_examen y unidad_medida | Autor verificado, interpretación, alertas, método y referencia congelados; corrigeId/motivo |
| Procedimiento | procedimiento_realizado → procedimiento, consulta, personal; hospitalizacion_consulta cuando existe | Proyección con origen consulta/estancia. Lectura incluye procedimientos de estancia E04-P1-02 sin duplicarlos |
| Cobertura | aseguradora → plan_seguro → poliza → titular_seguro; paciente_poliza | Copago entero en centavos GTQ, estado y motivo por afiliación; snapshots administrativos |
| Antecedentes/alergias | antecedente_medico; paciente_alergia → alergia | Ampliación sin eliminación de registros previos. Observación legada preservada |
| Contacto/signos | paciente/contacto_emergencia; consulta → signos_vitales | Se reutiliza edición administrativa y atención común E02/E03 |
| Referencias | personal_medico → personal_especialidad → especialidad; medicamento/unidad; exámenes y procedimientos | Catálogos consultables; receta exige dosis e indicaciones escritas por profesional |

`hospital_servicios.recursos` no reemplaza las relaciones normalizadas: cada comando
escribe ambas representaciones en la misma transacción. Conserva presentación y
atributos UI sin agregar columnas al inicializador académico. Fechas de vigencia
son civiles; eventos son UTC; dinero se guarda en centavos por moneda. No se
inventan deducibles, severidades, dosis ni especialidades ausentes del modelo.

Cada comando tiene clave idempotente estable, hash de intención, versión esperada,
revisión anterior y auditoría. Bloqueo del paciente coordina archivo y procesos;
la clave PostgreSQL se serializa antes de decidir repetición. Fallos de detalles,
revisión, auditoría u operación revierten todas las escrituras. Corrección de
resultado crea otra emisión y mantiene accesible la original. Una orden con
resultados no se cancela. Archivo impide procesos nuevos, permite terminar órdenes
anteriores con autorización. Una afiliación suspendida no cambia la póliza de los
otros pacientes del mismo titular.

## Preparación y recuperación

1. Respaldar el volumen y detener escritores. Usar administrador, nunca hospital_app.
2. Aplicar migraciones previas 004/007 y luego
   `Database/migrations/008_servicios_hospital_postgresql.sql` con psql y
   ON_ERROR_STOP=1. No basta reconstruir el contenedor ni cambiar inicializadores.
3. Verificar `hospital_servicios.modelo`: versión 1 y LISTO. La migración es una
   transacción y puede reejecutarse; ON CONFLICT conserva catálogo/datos existentes.
4. Si ya había órdenes, pólizas o procedimientos nativos sin la extensión, queda
   RECONCILIAR y la API responde 503. No activar manualmente: respaldar, conciliar
   paciente/consulta/autor/versiones y preparar snapshots verificables. No se
   infieren parámetros, historia de correcciones ni titulares ambiguos. Esta v1
   bloquea ese legado especializado en vez de presentar listas incompletas.
5. Una interrupción revierte DDL y seeds; reejecutar el archivo íntegro. La app solo
   lee configuración/manifest y escribe recursos; no puede desbloquear el estado.

Los seeds son referencias sintéticas académicas, no datos clínicos ni consejos de
prescripción. Cambiar un catálogo requiere administración controlada con escritores
detenidos; las órdenes conservan su snapshot y pueden terminarse aunque cambie la
configuración. Las listas son paginadas (máximo 100), con hayMas explícito; los
agregados y transporte están limitados a 256 KiB. Antecedentes hospitalarios v1 son
solo ampliación: quitar o alterar una fila previa se rechaza. Legado con severidad
no interpretable o más de 100 registros requiere reconciliación/lectura histórica.

## Contrato y reproducción

OpenAPI y fixtures `hospital-servicios-v1.json` definen cuerpos cerrados y respuestas.
HTTP modo entrega no usa mocks. La ficha HTTP muestra General, Exámenes,
Procedimientos y Seguros únicamente en hospital, según permisos. Resultados ofrecen
selector de emisión, motivo de corrección y versiones de concurrencia. Tras una
respuesta incierta los formularios conservan la intención para reintentar.

- `npm --prefix Backend test`
- `npm --prefix Backend run lint`
- `npm --prefix Backend run test:integration:sql` (PG/MySQL aislados)
- `node Backend/scripts/run-historial-integration.mjs --clinica-ui` (cuatro motores,
  Auth/Firestore emulados y navegador; instalación/rollback/reaplicación 008)
- `npm --prefix Frontend test -- src/test/http`
- `npm --prefix Frontend run build`
- Python con `Backend/docs/requirements-contrato.txt`:
  `python Backend/scripts/validar-contrato-hospital.py` (contrato offline, sin motor).
