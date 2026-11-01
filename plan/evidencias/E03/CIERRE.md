# Cierre de entrega interna E03 — Núcleo clínico común, archivo y corrección histórica

- **Fase y objetivo:** E03 — atención clínica común completa (consulta, signos, diagnósticos, tratamientos y receta histórica), archivo de expediente y correcciones versionadas conectados de extremo a extremo (UI → API → cuatro motores institucionales).
- **Base integrada verificada:** `origin/develop` `e6e8310` antes de este PR documental.
- **Fecha y participante:** 31/10/2026, America/Guatemala · JDaniC (con `E03-P1-01` implementada por Davidix888).
- **Estado:** EN_REVISION; PR documental [#65 — Cerrar fase E03 con demostración integrada](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/65).
- **Auditoría funcional:** [informe](auditoria-cierre-2026-10-31/INFORME.md), [inventario](auditoria-cierre-2026-10-31/inventario.csv) y [trazabilidad](auditoria-cierre-2026-10-31/trazabilidad.csv).

## Tareas y revisión

| Tarea | Estado | Integración | Evidencia |
|---|---|---|---|
| E03-P1-01 — Atención clínica común y comando compuesto | HECHA | PR #51 (`896972b`); cierre #53 | [evidencia](E03-P1-01.md) |
| E03-P1-02 — Atención clínica en ambos adaptadores SQL | HECHA | PR #54 (`21fe445`); cierre #60 (`8010403`) | [evidencia](E03-P1-02.md) |
| E03-P1-03 — Archivo, finalización y corrección histórica | HECHA | PR #61 (`d2fda3c`); cierre #62 (`6305684`) | [evidencia](E03-P1-03.md) |
| E03-P2-01 — Núcleo clínico de laboratorio en MongoDB | HECHA | PR #55 (`5ad9561`); cierre #56 (`5b4d641`) | [evidencia](E03-P2-01.md) |
| E03-P2-02 — Atención pediátrica transaccional en Firestore | HECHA | PR #57 (`6dcdde0`); cierre #58 (`801f787`) | [evidencia](E03-P2-02.md) |
| E03-P2-03 — Integrar atención, archivo y prueba común desde la UI | HECHA | PR #63 (`eb2a83e`); cierre #64 (`e6e8310`) | [evidencia](E03-P2-03.md) |

Se verificó mediante `git merge-base --is-ancestor` que los seis commits de implementación están integrados en `origin/develop` (`e6e8310`) y que el cierre de la fase anterior (`E02`) está `HECHA` (PR #49, `c1a932a`).

## Demostración integrada

Se ejecutó en esta sesión `CLINICA_UI_EVIDENCE=.../recorrido.json node Backend/scripts/run-historial-integration.mjs --clinica-ui` sobre la base integrada `e6e8310`. El recorrido levanta un entorno aislado (`bdii-ca07-*`) con PostgreSQL, MySQL y MongoDB replica set reales en contenedores Docker efímeros, emuladores locales de Firebase Auth y Firestore (`demo-bdii-ca07-*`), servidor Backend y cliente Frontend con navegador Chromium real, usando únicamente cuentas y datos sintéticos.

Resultado del recorrido UI→API→BD: **49 PASS, 0 FAIL, 0 BLOCKED** ([recorrido.json](auditoria-cierre-2026-10-31/recorrido.json)). En cada una de las cuatro instituciones (`HOSPITAL_GENERAL`, `CLINICA_ODONTOLOGICA`, `LABORATORIO_CLINICO` y `CENTRO_MEDICO_PEDIATRICO`) se verificó:
1. Conservación del formulario sin éxito simulado ante respuestas HTTP 400, 403, 409 y 503 controladas en transporte.
2. Rechazo real en el servidor de una receta inválida (HTTP 400) sin crear consulta/receta ni avanzar la versión del paciente.
3. Registro atómico de consulta completa (con cita previa obligatoria en odontología, desde expediente en laboratorio y con responsable autorizante en pediatría), pérdida de respuesta después del commit y reintento idempotente con el mismo cuerpo y `Idempotency-Key`.
4. Lectura del detalle clínico y de la receta histórica tras recargar la página.
5. Corrección de consulta finalizada creando una nueva versión y lectura exacta del snapshot original (`version=1`).
6. Archivo del expediente conservando eventos y consultas previas.
7. Persistencia intacta de la historia y la receta después de reiniciar el servidor Backend.
8. Corrección histórica autorizada sobre un expediente ya archivado.
9. En `CENTRO_MEDICO_PEDIATRICO`, reactivación del expediente por HTTP.

Además, el guion inyectó interrupciones para comprobar rollback de DDL en PostgreSQL y recuperación en MySQL antes de aplicar las migraciones `004` y `007`, y al finalizar reejecutó las migraciones confirmando que el conteo y hash de eventos permanecieron idénticos.

Complementariamente se ejecutaron en esta sesión las tres suites físicas de integración por motor:
- `npm --prefix Backend run test:integration:sql`: **6/6 PASS** (PostgreSQL y MySQL aislados: atención compuesta, fallo de auditoría post-escritura con rollback íntegro, archivo, corrección y versiones).
- `npm --prefix Backend run test:integration:clinica:mongodb`: **11/11 pruebas clínicas PASS** + **102/102 comprobaciones del modelo físico PASS** (fallo de receta y de auditoría con rollback multi-documento, límites 100 elementos/256 KiB, carrera archivo vs. atención y migración 005).
- `npm --prefix Backend run test:integration:clinica:firestore`: **14/14 PASS** en ejecución aislada sobre Firestore/Auth Emulator (fallos antes de receta y antes de auditoría con rollback transaccional, autorización histórica, citas sin solapamiento, archivo/reactivación con fallecimiento y migración 006).

## Resultados

| Criterio de salida E03 | Evidencia | Estado | Observación |
|---|---|---|---|
| Las seis tareas de fase están terminadas e integradas | PR #51, #54, #55, #57, #61 y #63 en `origin/develop` (`e6e8310`) | PASS | Todas las tareas de E03 están `HECHA` en el tablero |
| Consulta + diagnóstico + tratamiento + receta persisten atómicamente en los cuatro motores | Recorrido UI (`49/49 PASS`) y suites SQL (`6/6`), MongoDB (`11/11`) y Firestore (`14/14`) | PASS | PostgreSQL, MySQL y MongoDB reales aislados; Firestore/Auth emulados |
| Fallo antes de receta o auditoría revierte la transacción completa; reintento conserva una sola intención | Recorrido UI (receta inválida real HTTP 400 + pérdida de respuesta post-commit) y suites físicas por motor | PASS | Cero fragmentos huérfanos ni avance de revisión ante fallo |
| Archivo conserva historia, impide nuevas atenciones, permite correcciones autorizadas y reactivación solo en pediatría | Recorrido UI (archivo, reinicio, corrección post-archivo y reactivación pediátrica) y suites CA08/CA10 | PASS | Incluye regresión A-F01 en PostgreSQL |
| Corrección de consulta/receta conserva versiones históricas inmutables y lectura por versión | Recorrido UI (`GET /consultas/{id}?version=1`) y suites por motor (DEC18 `snapshot_actual` en SQL) | PASS | Catálogo o cambios posteriores no alteran snapshots emitidos |
| Reinicio del servidor y fallo/reejecución de migraciones preservan los datos | Runner `--clinica-ui` y suites de migración `004–007` | PASS | Sin tocar volúmenes de desarrollo ni bases compartidas |
| Revisión automática de cierre | PR #65 | EN_REVISION | Pendiente de veredicto nativo de Codex sobre el SHA final antes de integrar |

Comprobaciones adicionales del checkout en esta sesión: `npm --prefix Backend test` **PASS** (311/311: 279 runtime/unitarias + 32 contractuales); `npm --prefix Backend run lint` **PASS**; `npm --prefix Frontend run build` **PASS**; `npm --prefix Frontend test -- src/test/http/ src/test/product-scope/ src/services/errors.test.ts src/services/dates.test.ts` **PASS** (114/114). Las pruebas históricas del flujo simulado anterior de módulos E04–E06 mantienen la clasificación de `DEC12` (reconciliación en `E06-P2-02`) y no se presentan como pruebas verdes de E03.

## Entrega al siguiente responsable

- **Contratos y esquemas:** núcleo clínico operativo en los cuatro motores con las migraciones explícitas `004` (proyección de historial), `005` (clínica SQL y MongoDB), `006` (clínica Firestore) y `007` (`snapshot_actual` para correcciones SQL v5 según `DEC18`). Toda instalación nueva o existente debe aplicar las migraciones explícitas antes de habilitar el bundle clínico.
- **Límites actuales:** la vista de Agenda en modo API habilita la lectura para vincular citas existentes a las consultas, manteniendo deshabilitados los filtros simulados y las acciones de creación/reprogramación/cancelación en UI, que junto con hospitalización/camas, exámenes/seguros y crecimiento/vacunas corresponden a la fase **E04**. Los flujos de órdenes, muestras, resultados analíticos, informes, inventario/calidad y facturación de laboratorio corresponden a **E05**.
- **Entornos:** Firestore y Firebase Auth están validados contra emuladores locales (`demo-*`), no contra producción cloud.
- **Siguiente puerta:** al integrarse este PR con revisión limpia de Codex y actualizar el cierre de E03 a `HECHA`, `python3 scripts/github/cola.py` habilitará las tareas iniciales de **E04** (`E04-P1-01`, `E04-P1-02`, `E04-P2-01`).

## Decisión

La demostración conjunta y los criterios de salida de la fase E03 cumplen en los cuatro motores, distinguiendo pruebas en contenedores reales, emuladores locales y suites unitarias/transporte controlado. Se somete el PR #65 a revisión automática de Codex y check `contrato-pr` antes de su integración en `develop`.
