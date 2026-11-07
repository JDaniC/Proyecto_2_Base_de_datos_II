# Requisitos auditados de E05-P2-01

Fuentes: `Agente/REQUERIMIENTOS_FUNCIONALES.md` (RF-L05–L07/L12/L13); `Agente/REQUERIMIENTOS_NO_FUNCIONALES.md` (RNF-023/024/027); `Agente/DISENO_PROYECTO.md` (§3.4.2 y CA12/13/16); `plan/entregas/E05_laboratorio/02_P2.md` §01; `plan/02` y `plan/03`; M03 `resultados` y migración `012_resultados_laboratorio_mongodb.mjs`; contrato OpenAPI de las siete operaciones de resultados.

| ID | Fuente | Criterio verificable | Prioridad |
|---|---|---|---|
| R01 | RF-L05; tarea E05-P2-01 §1; CA12 | Capturar componentes según versión congelada de prueba (tipo numérico/texto/categórico, unidad, referencia, indicador, equipo y analista) y validar vínculo muestra/ítem/prueba/orden/paciente. | CRITICAL |
| R02 | RF-L05/L06; tarea §2; CA12/13 | Separar guardar `BORRADOR` (`ANALISTA_LABORATORIO` + `resultados.analizar`) y validar (`VALIDADOR_LABORATORIO` + `resultados.validar`) con actor/fecha sellados por servidor; admitir solo muestras en estado `ACEPTADA` o `PROCESADA`. | CRITICAL |
| R03 | RF-L06; tarea fallos; CA12 | Rechazar edición o sobrescritura de un resultado `VALIDADO` y exigir revisión optimista (`versionEsperada` = `revision`) en edición y validación. | CRITICAL |
| R04 | RF-L07; tarea §3; CA16 | Corrección de resultado validado crea nueva versión clínica (`version + 1`) en la misma serie (`serieId`) con `resultadoAnteriorId` y `motivoCorreccion`, sin modificar versiones anteriores. | CRITICAL |
| R05 | RF-L07; tarea §3; CA16 | Repetición de resultado validado crea nueva serie (`serieId` distinto, `version: 1`) vinculada mediante `resultadoRepetidoDeId` y conserva procedencia de las muestras usadas. | CRITICAL |
| R06 | RF-L06; tarea §4 | Actualizar el estado del ítem a `COMPLETADO` al validar y derivar el estado de la orden a `COMPLETADA` cuando todos los ítems no cancelados están completados, dentro de la misma UoW. | CRITICAL |
| R07 | RF-L12/L13; tarea §4 | Listar y consultar por ID resultados con versión/serie/revisión/procedencia/componentes variables, sin transformar resultados en diagnósticos clínicos. | HIGH |
| R08 | RNF-023/027; tarea excepciones | Idempotencia estable en las cinco mutaciones (`capturar`, `editar`, `validar`, `corregir`, `repetir`) y rechazo de clave reutilizada con entrada distinta. | CRITICAL |
| R09 | RNF-027; tarea excepciones; CA12 | Serializar mutaciones concurrentes de muestra/resultado sobre la revisión de la orden y versiones simultáneas de serie con índice único `uq_resultado_serie_version`, devolviendo `VERSION_DESACTUALIZADA`. | CRITICAL |
| R10 | RNF-027; AGENTS | Atomicidad UoW MongoDB: datos de resultado, actualización/reserva de orden, revisiones previas (`resultados`/`ordenes`), operación idempotente y auditoría en una sola transacción. | CRITICAL |
| R11 | AGENTS; plan/03 §7 | Identidad e institución derivadas del token verificado y cuenta local activa revalidada dentro de la UoW; rechazo de campos de autoridad enviados por cliente. | HIGH |
| R12 | AGENTS persistencia; M03 | Migración explícita `012_resultados_laboratorio_mongodb.mjs` con escritores detenidos, recuperación tras interrupción, preflight de validador/documentos/índices y cotejamiento efectivo (`simple` cuando `listIndexes` omite `collation` frente al heredado de la colección). | CRITICAL |
| R13 | plan/02; AGENTS arquitectura | Dominio y aplicación puros sin dependencias de Nest, MongoDB, HTTP ni entorno; mappers fallan cerrados (`503`) ante corrupción de historia y límite BSON de 256 KiB. | HIGH |
| R14 | Instrucción humana 05/11 y 07/11; plan/11 | Ejecutar `security-auditor` y `functional-requirements-auditor` con evidencia reproducible antes de continuar revisión/integración del PR #78 y registrar traspaso autorizado. | HIGH |
