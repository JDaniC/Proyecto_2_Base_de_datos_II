# Auditoría funcional del cierre E02 — 28/10/2026

## 1. Resumen

Alcance: puerta de cierre de fase E02, no una nueva auditoría de cada callback ya cubierto por las auditorías individuales. Fuentes: `plan/entregas/E02_pacientes_historial/01_P1.md` y `02_P2.md` (criterios de cierre), `plan/03_CONTRATOS_Y_FLUJOS.md`, los seis informes `plan/evidencias/E02/E02-P*.md`, OpenAPI y evidencia del recorrido integrado.

Resultado: **6/6 requisitos de salida PASS en la demostración, 0 FAIL, 0 BLOCKED**. Las seis tareas están HECHA e integradas según tablero y GitHub. El PR documental de cierre está EN_REVISION hasta recibir la revisión automática real y completar su integración.

La prueba integrada fue ejecutada dos veces en esta sesión; el recorrido final se guardó en [recorrido.json](recorrido.json). Ambiente: PostgreSQL/MySQL/MongoDB en un proyecto Docker efímero, Firebase Auth/Firestore Emulator con proyecto `demo-*`, navegador Chromium y datos/cuentas sintéticos. La suite ejecutó 32 comprobaciones. La limpieza se limitó al proyecto aleatorio creado por el propio guion.

## 2. Inventario de capacidades de fase

| ID | Unidad de flujo | Riesgo | Implementación integrada | Prueba existente/nueva | Resultado |
|---|---|---|---|---|---|
| E02-P1-01 | Casos de uso de registrar, consultar, buscar y actualizar paciente; identidad e idempotencia | CRITICAL/HIGH | `Backend/src/aplicacion/casos-uso/pacientes/`; PR #40 | 228 unitarias/runtime/contractuales, lint/arquitectura; evidencia P1-01 | PASS |
| E02-P1-02 | Repositorios de pacientes PostgreSQL/MySQL, transacciones, migraciones y consultas | HIGH | Adaptadores SQL y migraciones; PR #41 | 4 suites SQL; CA03/persistencia tras reinicio; evidencia P1-02 | PASS |
| E02-P2-01 | Repositorio MongoDB, identidad, índices y UoW | HIGH | Adaptador Mongo; PR #42 y cierre #43 | 17 resultados integración MongoDB; evidencia P2-01 | PASS |
| E02-P2-02 | Persistencia Firestore de menores/responsables y transacción | HIGH | Adaptador Firestore; PR #44 | 8 integraciones Firestore; evidencia P2-02 | PASS |
| E02-P2-03 | Expediente, proyección, cursor y mezcla ordenada por motor | HIGH | Casos de uso/adaptadores de historial y migración 004; PR #45 y cierre #46 | 24 comprobaciones CA07; evidencia P2-03 | PASS |
| E02-P1-03 | Formularios, mappers, cliente HTTP, ficha/perfil y cronología React | HIGH | `Frontend/src/features/patients`, `Frontend/src/services/http/patients`; PR #47 y cierre #48 | Suite frontend y 32 recorridos con navegador/motores; evidencia P1-03 | PASS |

Este inventario agrupa las capacidades a nivel de puerta de fase (detalle estructurado en [inventario.csv](inventario.csv) y matriz en [trazabilidad.csv](trazabilidad.csv)). Los inventarios por función/callback, análisis de clases de equivalencia y matrices exhaustivas de cada unidad están en los seis informes de evidencia enlazados en `CIERRE.md`; no se sustituyen por este resumen.

## 3. Matriz requisito → código → prueba

| Requisito verificable | Fuente | Unidad/código | Test y observación | Estado |
|---|---|---|---|---|
| Registrar, consultar y editar perfil común; validar identidad/revisión e impedir escritura parcial | E02-P1-01, RF-005/006/015/016/019, CA03 | Casos de uso de pacientes, DTO y unidad de trabajo; `Backend/src/aplicacion/casos-uso/pacientes/` | Alta/lectura, PATCH parcial, documento ausente/duplicado, conflicto de versión y suite unitaria/runtime | PASS |
| Persistir alta/cambios y búsqueda de pacientes en PostgreSQL y MySQL, con rollback/recuperación e historial preservado | E02-P1-02, RF-H01/C01, RF-005/006, RNF-025, CA03 | `Backend/src/adaptadores/salida/postgresql/pacientes/`, `mysql/pacientes/`, migraciones explícitas | Integración Docker por motor; alta y búsqueda tras reinicio; migración repetida sin pérdida | PASS |
| Persistir pacientes e identidades atómicamente en MongoDB y no dejar registros huérfanos | E02-P2-01, RF-L01/005/006, CA03, M01/M03 | `Backend/src/adaptadores/salida/mongodb/pacientes/` y migración Mongo | 17 resultados integración MongoDB; carrera, rollback, identidad/búsqueda y reinicio | PASS |
| Persistir menor y responsable en Firestore; preservar referencia compartida y autorización independiente por vínculo | E02-P2-02, RF-P01–P04, CA03/09, M04, DEC09/10 | `Backend/src/adaptadores/salida/firestore/pacientes/` y responsables | Emulador: responsable compartido/hermanos, alta, colisión, autorización y rollback; recorrido UI | PASS |
| Leer expediente paginado/ordenado con filtros y cursor dentro de su ámbito en los cuatro adaptadores | E02-P2-03, RF-007/017, RNF-009/032, CA07, DEC17 | Casos de uso `historiales/`, fuentes SQL/Mongo/Firestore, `cursor-historial.ts` | 24 comprobaciones CA07; 4 motores en recorrido, cursores/filtros y eventos con empate | PASS |
| Conectar UI a HTTP sin fallback; recargar, buscar desde sesión autorizada y conservar edición ante error/versionado | E02-P1-03, RF-005–007/018, RNF-034, CA03/07 | Frontend features/services HTTP de pacientes y perfil | Navegador: alta/recarga, sesión separada, PATCH 409, respuesta perdida y acceso de secretaría 403 | PASS |
| Impedir exposición de datos clínicos a secretaría y limitar recursos a la institución autenticada | Plan/03, contrato HTTP, E02-P1-03 | Guardas de rol/consulta en API; selección de perfil en UI | UI no solicita expediente clínico; API deniega historial y paciente ajeno responde no encontrado | PASS |
| Recuperar migración y preservar datos existentes al reiniciar o reejecutar | AGENTS.md §Persistencia; E02-P1-02/P2-03, DEC16/17 | Migraciones SQL 004; preparadores Mongo/Firestore | Fallo inyectado: rollback PostgreSQL y reanudación MySQL; migración reiterada mantiene conteo/hash de eventos | PASS |

## 4. Desviaciones y correcciones

No se observaron nuevas desviaciones funcionales en la puerta de cierre. Las desviaciones encontradas en la implementación se registran y resolvieron en sus informes: P1-01 auditoría y pruebas; P1-02 trazabilidad; P2-01/P2-02/P2-03; P1-03 AF01–AF10 y revisiones iterativas de Codex. No se reutiliza un veredicto de una revisión anterior como revisión del PR #49.

`npm ci` de Frontend informó 3 vulnerabilidades en el árbol instalado (1 moderada, 2 críticas). No se ejecutó `npm audit fix` ni se cambió el lockfile: el análisis de seguridad de dependencias no pertenece a este cierre y requiere tratamiento propio. Es riesgo residual registrado, no un FAIL funcional de los criterios E02.

## 5. Pruebas y resultado reproducible

Comando: `npm run test:integration:pacientes:ui` desde `Backend` (la repetición final usó `PATIENTS_UI_RESULTS=../plan/evidencias/E02/auditoria-cierre-2026-10-28/recorrido.json`). Playwright/Chromium se descargaron para respetar la versión fijada en el lockfile. Resultado estructurado: `PASS=32`, `FAIL=0`, `BLOCKED=0`.

Casos principales: alta/recarga; PATCH con versión; rechazo de versión obsoleta; duplicado y recuperación; sesión autorizada; filtros/cursor de cronología; reintento tras respuesta perdida; adulto compartido entre hermanos; secretaría sin lectura clínica; ID entre instituciones; reinicio del backend en cada institución. Los eventos de cronología fueron fixtures sintéticos de lectura.

Comprobaciones adicionales del checkout durante este cierre: `Backend npm test` PASS; `Backend npm run lint` PASS; `Frontend npm run build` PASS; pruebas focales `PatientsHttp.test.tsx` y `ServiceFactoryAndUI.test.tsx` PASS (37/37). Las suites históricas de integración SQL/MongoDB/Firestore y CA07 siguen trazadas con sus conteos y commits en las evidencias individuales; el recorrido integrado es la verificación actual de fase.

Resultados negativos observados y su clasificación: la suite completa de Frontend reportó 5 fallos en `L13_LaboratoryBillingPayments.test.tsx`, funcionalidad del laboratorio fuera de E02. La ejecución focal conjunta de U04/U05 con las pruebas HTTP reportó 37 PASS y 10 fallos en los dos archivos U04/U05, que cargan una expectativa de sesión/navegación del flujo simulado anterior. `plan/evidencias/E02/E02-P1-03.md` ya documenta que esos casos históricos fueron sustituidos por `PatientsHttp` y el recorrido de navegador, y asigna su reconciliación general a E06. Se clasifican como cobertura histórica obsoleta (NOT_APPLICABLE para la aceptación actual E02), con sustitutos actuales ejecutados; no se presentan como PASS ni se corrigen dentro de esta puerta documental. La comprobación nueva de 32 casos HTTP/navegador en cuatro motores sí pasó.

## 6. Bloqueos y límites

- No hay bloqueo funcional para cerrar E02 tras integrar el PR de cierre.
- Firestore y Firebase Auth se verificaron en emuladores locales; no se afirma validación cloud/IAM.
- Las consultas/eventos de cronología del navegador son fixtures del índice; no prueban escritores clínicos, que corresponden a E03–E05.
- No se demuestra instalación integral en un segundo equipo ni despliegue productivo.
- El metadato Firebase emitió advertencia ETIMEDOUT/ENOTFOUND en la primera ejecución, pero los emuladores locales levantaron y ambas ejecuciones completas terminaron PASS. No se usaron servicios productivos.

## 7. Matriz final

| Grupo | PASS | FAIL | BLOCKED | NOT_IMPLEMENTED | NOT_APPLICABLE |
|---|---:|---:|---:|---:|---:|
| Requisitos de salida E02 | 6 | 0 | 0 | 0 | 0 |
| Criterios funcionales observados en el recorrido | 32 | 0 | 0 | 0 | 0 |
| Pruebas HTTP actuales de pacientes/composición | 37 | 0 | 0 | 0 | 0 |
| Pruebas históricas U04/U05 (sustituidas; reconciliación E06) | 0 | 0 | 0 | 0 | 10 |
| Suite completa Frontend, fuera de la puerta E02 | — | 5 | — | — | — |
| Backend tests / lint y Frontend build | PASS | 0 | 0 | 0 | 0 |
| Revisión nativa del PR #49 en SHA final | Pendiente | — | — | — | — |

La fila de revisión automática se mantiene EN_REVISION hasta comprobar la respuesta real del bot y `contrato-pr` para el SHA final. El cierre solo se declara integrado después de esa verificación.

## 8. Riesgos residuales

Escritura clínica completa queda en E03–E05; nube Firebase/IAM e instalación en otro equipo no se acreditan en E02. Los eventos sintéticos no deben interpretarse como expedientes creados por escritores clínicos. La reconciliación de U04/U05 y los cinco fallos de L13 quedan visibles para E06/E05 respectivamente; `npm ci` de Frontend también informó 3 vulnerabilidades del árbol instalado (1 moderada, 2 críticas), sin cambios automáticos de dependencias en esta tarea.
