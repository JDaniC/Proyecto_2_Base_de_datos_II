# Auditoría funcional del cierre E03 — 31/10/2026

## 1. Resumen

Alcance: puerta de cierre conjunto de la fase E03 (núcleo clínico común, cuatro adaptadores de persistencia, archivo/reactivación, corrección histórica versionada e integración React por HTTP). Fuentes: `plan/00_PLAN_MAESTRO.md` §3, `plan/01_ALCANCE_Y_DECISIONES.md` (DEC02–DEC08, DEC16–DEC18), `plan/03_CONTRATOS_Y_FLUJOS.md`, `plan/entregas/E03_nucleo_clinico/01_P1.md` y `02_P2.md`, los seis informes individuales `plan/evidencias/E03/E03-P*.md` y la demostración conjunta ejecutada en esta sesión.

Resultado: **6/6 requisitos de salida PASS en la demostración conjunta, 0 FAIL confirmados de producto, 0 BLOCKED**. Las seis tareas individuales (`E03-P1-01`, `E03-P1-02`, `E03-P1-03`, `E03-P2-01`, `E03-P2-02` y `E03-P2-03`) están `HECHA` y sus commits de integración son ancestros verificados de `origin/develop` (`e6e8310`). El PR documental de cierre #65 se integró en `develop` (`f516156`) tras revisión automática de Codex sin hallazgos sobre `66e5f46`.

En esta sesión se ejecutó la demostración conjunta UI→API→BD (`node Backend/scripts/run-historial-integration.mjs --clinica-ui`), guardando la salida estructurada y saneada en [recorrido.json](recorrido.json) (**49 PASS, 0 FAIL**), además de las tres suites físicas de integración por motor (`test:integration:sql` **6/6 PASS**, `test:integration:clinica:mongodb` **11/11 clínicas + 102 modelo PASS** y `test:integration:clinica:firestore` **14/14 PASS**), y las suites de `Backend` (`npm test` **311/311 PASS**, `npm run lint` **PASS**) y `Frontend` (`npm run build` **PASS**, 114/114 pruebas vigentes **PASS**).

## 2. Inventario de capacidades de fase

| ID | Unidad de flujo | Riesgo | Implementación integrada | Prueba existente/ejecutada | Resultado |
|---|---|---|---|---|---|
| E03-P1-01 | Dominio y casos comunes de consulta, diagnóstico, tratamiento, receta histórica y agenda; comando compuesto y HTTP | CRITICAL | `Backend/src/dominio/clinica/`, `Backend/src/aplicacion/casos-uso/{consultas,citas}/`, `entrada/http/`; PR #51 (`896972b`) | 311 pruebas Backend (runtime/unitarias/contractuales), lint/build; evidencia P1-01 | PASS |
| E03-P1-02 | Persistencia clínica y agenda en PostgreSQL y MySQL; migraciones explícitas 005 | HIGH | `Backend/src/adaptadores/salida/{postgresql,mysql}/clinica/`, `Database/migrations/005_clinica_sql_*.sql`; PR #54 (`21fe445`) | `npm --prefix Backend run test:integration:sql` (6/6 PASS); recorrido UI; evidencia P1-02 | PASS |
| E03-P2-01 | Persistencia clínica de laboratorio en MongoDB; migración explícita 005 | HIGH | `Backend/src/adaptadores/salida/mongodb/clinica/`, `Database/migrations/005_clinica_mongodb.mjs`; PR #55 (`5ad9561`) | `npm --prefix Backend run test:integration:clinica:mongodb` (11/11 clínicas + 102 modelo PASS); recorrido UI; evidencia P2-01 | PASS |
| E03-P2-02 | Atención pediátrica transaccional, autorización histórica y citas en Firestore; migración 006 | HIGH | `Backend/src/adaptadores/salida/firestore/clinica/`, `Database/migrations/006_clinica_firestore.mjs`; PR #57 (`6dcdde0`) | `npm --prefix Backend run test:integration:clinica:firestore` (14/14 PASS); recorrido UI; evidencia P2-02 | PASS |
| E03-P1-03 | Archivo por baja, reactivación pediátrica, finalización previa y corrección histórica versionada; migraciones SQL 007 | CRITICAL | `Backend/src/aplicacion/casos-uso/{historiales,consultas}/`, `adaptadores/salida/*/clinica/`, `Database/migrations/007_correcciones_*.sql`; PR #61 (`d2fda3c`) | Suites de integración SQL (6/6), MongoDB (11/11), Firestore (14/14) y recorrido UI (49/49); evidencia P1-03 | PASS |
| E03-P2-03 | Asistente clínico React, detalle, versiones, archivo y reactivación por HTTP sin autoridad de cliente | HIGH | `Frontend/src/services/http/`, `Frontend/src/features/{consultations,patients}/`, `Frontend/scripts/clinica-e2e.mjs`; PR #63 (`eb2a83e`) | 114 pruebas frontend vigentes PASS y 49 comprobaciones E2E navegador+4 motores PASS; evidencia P2-03 | PASS |

El inventario estructurado de unidades de puerta de fase está en [inventario.csv](inventario.csv) y la matriz de trazabilidad en [trazabilidad.csv](trazabilidad.csv). Los inventarios detallados por función/callback están en las auditorías individuales de las tareas E03.

## 3. Matriz requisito → código → prueba

| Requisito verificable | Fuente | Unidad/código | Test y observación | Estado |
|---|---|---|---|---|
| Registrar atención clínica común completa (consulta, signos, diagnóstico principal, tratamiento y receta histórica) en una sola UoW por institución | E03-P1-01/P1-02/P2-01/P2-02, RF-009–013, CA04/05/06/09 | `Backend/src/aplicacion/casos-uso/consultas/`, adaptadores SQL/MongoDB/Firestore, `Frontend/src/features/consultations/` | Recorrido UI (49/49 PASS) con cita obligatoria en odontología, sin agenda en laboratorio y con responsable autorizante en pediatría; suites SQL/Mongo/Firestore | PASS |
| Revertir íntegramente ante fallo antes de receta o auditoría sin dejar fragmentos, y conservar intención única al reintentar tras pérdida de respuesta | Plan maestro §3, `plan/03` §5, CA05 | `preparar-comando-estable.ts`, UoW SQL/MongoDB/Firestore, repositorios clínicos | En recorrido UI: receta inválida real devuelve HTTP 400 sin consulta/receta ni avance de versión, y pérdida de respuesta post-commit reintenta con mismo body/clave; en suites SQL/Mongo/Firestore: fallo inyectado de receta y de auditoría revierte toda la transacción | PASS |
| Archivar expediente con causa/motivo/versión conservando historia, impedir nuevas atenciones y permitir reactivación pública solo en pediatría | DEC02, DEC05, E03-P1-03, RF-008/014, CA08 | `cambiar-estado-historial.ts`, controladores y adaptadores de pacientes/historial/clínica, `ArchivePatientModal.tsx` | Recorrido UI archiva en las 4 instituciones, verifica conservación tras reiniciar el backend y reactiva en `CENTRO_MEDICO_PEDIATRICO`; suites SQL/Mongo/Firestore verifican rechazo de nueva atención en archivado y carrera archivo vs. atención | PASS |
| Corregir consulta finalizada y receta con motivo y versión esperada, preservando snapshots históricos inmutables y lectura exacta por versión | DEC18, E03-P1-03, RF-013, CA10, M05/M07 | `corregir-consulta.ts`, migraciones SQL 007 (`snapshot_actual`), revisiones Mongo/Firestore, `ConsultationDetailPage.tsx` | Recorrido UI corrige antes y después del archivo, consulta `GET /consultas/{id}?version=1` desde el selector de versión; suites SQL/Mongo/Firestore verifican retiro/cambio de receta e inmutabilidad física de versiones previas | PASS |
| Conectar UI clínica a HTTP sin autoridad de cliente ni fallback a mocks, conservando formulario ante errores 400/403/409/503 | DEC07, E03-P2-03, RF-018, RNF-034 | `Frontend/src/services/http/`, `ConsultationWizard.tsx`, `ConsultationDetailPage.tsx` | Recorrido UI verifica errores 400/403/409/503 en transporte sin cerrar formulario ni simular éxito; 114 pruebas frontend verifican sanitización de DTO, bloqueo ante respuesta incierta y desmontaje por cambio de sesión | PASS |
| Preservar datos existentes tras reinicio del servidor y tras fallo/reejecución de migraciones SQL/NoSQL | AGENTS.md §Persistencia, DEC16–18 | `Database/migrations/004–007`, `run-historial-integration.mjs` | El runner inyecta fallo en PG (rollback DDL) y MySQL (recuperación aditiva), aplica 004 y 007, reinicia backend a mitad del recorrido y reejecuta migraciones al final comprobando hash/conteo intactos | PASS |

## 4. Desviaciones y observaciones de ejecución

- **Cero desviaciones funcionales en el código integrado de E03:** todas las desviaciones detectadas durante las tareas individuales y las rondas de revisión de Codex (títulos UTF-16, cancelación con profesional inactivo, permisos MySQL en tablas nuevas, bloqueo de citas solapadas, orden de registro dental, precisión de fechas, conservación de observaciones vacías, comparación canónica JCS de recetas y deshabilitación de filtros/profesionales simulados en agenda API) fueron corregidas y verificadas antes de integrar cada PR.
- **Observación de contención en el emulador Firestore (`clinica-firestore.test.ts:112`):** en una primera ejecución encadenada de `test:integration:clinica:firestore`, el subcaso `dos atenciones compiten por revisión de paciente: una sola confirma` agotó los reintentos de transacción de ambas peticiones simultáneas en el emulador (`actual: 0, expected: 1`, 6,4 s), mientras que el test de reservas simultáneas (`línea 144`) ya contempla `confirmadas <= 1` con código `PERSISTENCIA_NO_DISPONIBLE` cuando el emulador aborta ambas por contención. Al reejecutar `npm --prefix Backend run test:integration:clinica:firestore` de forma aislada, las **14/14 pruebas pasaron** (incluyendo ese subcaso en 2,2 s). No es un defecto de integridad del producto (nunca hubo doble confirmación ni corrupción, sino aborto seguro de ambas bajo contención del emulador), y se documenta con transparencia como riesgo de sensibilidad del test ante carga del emulador.

## 5. Pruebas ejecutadas en este cierre

1. `npm --prefix Backend test`: **PASS** (279 runtime/unitarias + 32 contractuales = **311 PASS, 0 FAIL**).
2. `npm --prefix Backend run lint`: **PASS** (verificación de arquitectura hexagonal y ESLint).
3. `npm --prefix Frontend run build`: **PASS** (`tsc --noEmit && vite build`).
4. `npm --prefix Frontend test -- src/test/http/ src/test/product-scope/ src/services/errors.test.ts src/services/dates.test.ts`: **PASS** (**114/114 PASS** en 11 archivos).
5. `CLINICA_UI_EVIDENCE=.../recorrido.json node Backend/scripts/run-historial-integration.mjs --clinica-ui`: **PASS** (**49/49 comprobaciones PASS** en navegador Chromium contra PostgreSQL, MySQL y MongoDB reales en contenedores efímeros + Firebase Auth/Firestore emulados, con rollback DDL PG, recuperación MySQL, reinicio de backend y reejecución de migraciones sin alterar eventos).
6. `npm --prefix Backend run test:integration:sql`: **PASS** (**6/6 PASS** en PostgreSQL y MySQL aislados).
7. `npm --prefix Backend run test:integration:clinica:mongodb`: **PASS** (**11/11 pruebas clínicas PASS** + **102/102 comprobaciones del modelo físico PASS** en replica set MongoDB aislado).
8. `npm --prefix Backend run test:integration:clinica:firestore`: **PASS** (**14/14 PASS** en reejecución aislada sobre Firestore/Auth Emulator; 1ª ejecución encadenada tuvo 12 PASS y aborto simultáneo por contención de emulador en 1 subcaso).

Las pruebas históricas de la suite simulada antigua del Frontend que conciernen a módulos E04–E06 mantienen la clasificación documentada en `DEC12` y en `plan/evidencias/E03/E03-P2-03.md` (reconciliación global en `E06-P2-02`); no se reportan como verdes ni se ocultan.

## 6. Bloqueos y límites

- No existen bloqueos para cerrar la fase E03.
- Las pruebas de Pediatría y Firebase Auth utilizan los emuladores oficiales locales (`demo-*`); no acreditan despliegue cloud ni reglas IAM en producción.
- En la interfaz de Agenda (`/agenda`), la fase E03 conectó la lectura para vincular citas existentes a la atención clínica; la creación/reprogramación/cancelación desde la UI y los módulos especializados por institución (agenda dental completa, hospitalización/camas, exámenes/seguros, crecimiento/vacunas y laboratorio analítico/cobros/inventario) pertenecen a las fases **E04** y **E05**.

## 7. Matriz final

| Grupo | PASS | FAIL | BLOCKED | NOT_IMPLEMENTED | NOT_APPLICABLE |
|---|---:|---:|---:|---:|---:|
| Requisitos de salida E03 | 6 | 0 | 0 | 0 | 0 |
| Demostración conjunta UI→API→BD (`--clinica-ui`) | 49 | 0 | 0 | 0 | 0 |
| Backend unitarias / runtime / contratos (`npm test`) | 311 | 0 | 0 | 0 | 0 |
| Integración clínica SQL (`test:integration:sql`) | 6 | 0 | 0 | 0 | 0 |
| Integración clínica MongoDB + modelo (`test:integration:clinica:mongodb`) | 113 | 0 | 0 | 0 | 0 |
| Integración clínica Firestore (`test:integration:clinica:firestore`) | 14 | 0 | 0 | 0 | 0 |
| Pruebas Frontend vigentes HTTP / alcance / servicios | 114 | 0 | 0 | 0 | 0 |
| Backend `lint` y Frontend `build` | PASS | 0 | 0 | 0 | 0 |
| Revisión nativa del PR #65 en SHA final (`66e5f46`) | PASS | 0 | 0 | 0 | 0 |

La revisión automática de Codex sobre `66e5f46` concluyó sin hallazgos (`has_any_findings: false`) y con `contrato-pr`/`revision-codex` en `SUCCESS`, integrándose el PR #65 en `develop` (`f516156`).

## 8. Riesgos residuales

- Los módulos institucionales específicos (E04 y E05) continúan protegidos sin fallback a mocks hasta que se implementen sus respectivas tareas.
- En contención extrema sobre el mismo documento en Firestore Emulator, dos transacciones simultáneas pueden agotar sus reintentos y devolver `503 PERSISTENCIA_NO_DISPONIBLE` sin confirmar ninguna; la integridad se mantiene intacta, aunque el subcaso `clinica-firestore.test.ts:112` exige actualmente que una confirme en el primer intento.
- La reconciliación de pruebas históricas de simuladores UI permanece asignada a `E06-P2-02`.
