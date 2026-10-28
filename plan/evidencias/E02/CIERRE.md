# Cierre de entrega interna E02 — Pacientes e historial persistente

- **Fase y objetivo:** E02 — alta, búsqueda, edición y expediente de pacientes conectados a persistencia en los cuatro motores institucionales.
- **Base integrada verificada:** `origin/develop` `4e50533e6d6c86a447d09fb384199dfa7581d772` antes de este PR documental.
- **Fecha y participante:** 28/10/2026, America/Guatemala · JDaniC.
- **Estado:** EN_REVISION en PR [#49](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/49); se actualizará a CERRADA solo después de revisar e integrar.
- **Revisión automática:** se registrará aquí el resultado real de Codex y los checks del SHA final antes de integrar.
- **Auditoría funcional:** [informe, matriz requisito→código→prueba y alcance](auditoria-cierre-2026-10-28/INFORME.md).

## Tareas y revisión

| Tarea | Estado | Integración | Evidencia |
|---|---|---|---|
| E02-P1-01 — Casos comunes de pacientes e identidad | HECHA | PR #40 (`29300de`) | [evidencia](E02-P1-01.md) |
| E02-P1-02 — Persistencia PostgreSQL y MySQL | HECHA | PR #41 (`aaff4d4`) | [evidencia](E02-P1-02.md) |
| E02-P1-03 — Integración React de pacientes y expediente | HECHA | PR #47 (`41082c9`); cierre individual #48 (`4e50533`) | [evidencia](E02-P1-03.md) |
| E02-P2-01 — Persistencia MongoDB | HECHA | PR #42 (`56752b2`); cierre individual #43 | [evidencia](E02-P2-01.md) |
| E02-P2-02 — Pacientes y responsables Firestore | HECHA | PR #44 (`1a1d1f3`) | [evidencia](E02-P2-02.md) |
| E02-P2-03 — Expediente e historial ordenado | HECHA | PR #45 (`4217236`); cierre individual #46 (`aace7cc`) | [evidencia](E02-P2-03.md) |

Los PR anteriores fueron contrastados con GitHub como integrados en `develop`; no había PR abiertos al reservar esta puerta. Los cambios de software que se demuestran aquí pertenecen a esos SHA ya integrados.

## Demostración integrada

Se ejecutó dos veces (una repetición guardó el resultado portable) `npm run test:integration:pacientes:ui` desde `Backend`, sobre la base integrada indicada. El recorrido usa Chromium real, PostgreSQL, MySQL y MongoDB en contenedores de un proyecto aleatorio `bdii-ca07-*`, además de emuladores locales de Firebase Auth y Firestore `demo-*`. Los datos y cuentas son sintéticos; los puertos y secretos de ensayo son temporales. El guion elimina únicamente su proyecto Docker y sus volúmenes al finalizar.

Resultado final: **32 PASS, 0 FAIL, 0 BLOCKED**. Incluye alta React y lectura después de recargar, PATCH parcial/versionado, conflicto real de versión, duplicado y recuperación por búsqueda donde aplica, lectura desde otra sesión autorizada, paginación/filtros de cronología, reintento con intención estable tras perder respuesta después del commit en Hospital y Pediatría, reutilización de responsable entre hermanos con autorización por vínculo, denegación clínica al perfil de secretaría, aislamiento de ID ajeno y persistencia después de reiniciar el backend en las cuatro instituciones.

La preparación inyectó una interrupción para verificar rollback PostgreSQL y recuperación MySQL. Al final reejecutó migraciones y confirmó que no cambiaron los eventos ya persistidos. El [resultado JSON saneado](auditoria-cierre-2026-10-28/recorrido.json) contiene los 32 casos; no guarda credenciales, tokens ni contenido clínico.

## Resultados

| Criterio de salida E02 | Evidencia | Estado | Observación |
|---|---|---|---|
| Las seis tareas de fase están terminadas e integradas | PR #40–#48 y tabla anterior; commits contrastados con `develop` | PASS | Ninguna tarea de E02 permanece PENDIENTE o EN_REVISION |
| Alta, búsqueda y edición persisten en los cuatro motores | Recorrido UI: alta/recarga, sesión nueva, PATCH y versión; evidencias individuales P1-02, P2-01, P2-02, P1-03 | PASS | PostgreSQL, MySQL y MongoDB reales aislados; Firestore/Auth emulados |
| Doble alta, intención y recuperación no generan una segunda ficha | Recorrido: conflicto/recuperación documental en SQL/Mongo y pérdida de respuesta tras commit en Hospital/Pediatría; pruebas de cada adaptador | PASS | El reintento conserva cuerpo y clave idempotente |
| Perfil de secretaría no expone historia clínica | Recorrido UI y denegación API | PASS | Sin llamada clínica desde el perfil administrativo; API rechaza acceso |
| Expediente/cronología se pagina y filtra en las cuatro instituciones | Recorrido con eventos sintéticos persistidos; suites CA07 por motor | PASS | Eventos preparados como fixtures de lectura, no como escritura clínica de E03–E05 |
| Reinicio, fallo de migración y repetición no pierden datos | Recorrido tras reinicio, rollback/reanudación SQL y migraciones repetidas | PASS | Sin usar bases compartidas ni volúmenes del usuario |
| Revisión automática de cierre | PR #49, revisión y checks del SHA final | EN_REVISION | Se actualizará con evidencia real antes del merge |

Comprobaciones del checkout durante este cierre: `Backend npm test` PASS; `Backend npm run lint` PASS; `Frontend npm run build` PASS; `Frontend npm test -- src/test/http/PatientsHttp.test.tsx src/test/http/ServiceFactoryAndUI.test.tsx` PASS (37/37). La suite Frontend completa reportó cinco fallos en `L13_LaboratoryBillingPayments.test.tsx`, fuera de E02. Una ejecución focal combinada de U04/U05 y las pruebas HTTP obtuvo 37 PASS y 10 fallos en U04/U05: son pruebas históricas del flujo simulado, ya identificadas como obsoletas en [la evidencia de E02-P1-03](E02-P1-03.md), sustituidas aquí por HTTP/E2E; su reconciliación global está asignada a E06. Estos resultados no se ocultan ni se cuentan como pruebas actuales PASS de E02.

## Entrega al siguiente responsable

- Base: cuatro repositorios de pacientes integrados y consultas de expediente paginadas; contratos y migraciones explícitas descritos en [E02-P2-03](E02-P2-03.md) y en `plan/03_CONTRATOS_Y_FLUJOS.md`.
- Autenticación del recorrido: identidades sintéticas mediante Firebase Auth Emulator y cuentas locales de cada motor; no son credenciales productivas.
- Los eventos de la demostración son fixtures del índice de lectura. No acreditan creación de consultas, recetas, órdenes, informes, vacunas ni snapshots clínicos por escritores reales; esos flujos siguen en E03–E05.
- La prueba acredita Firestore Emulator, no IAM ni despliegue Firebase cloud. No acredita instalación limpia integral en otro equipo.
- Siguiente puerta: E03, disponible solo después de integrar este cierre; recalcular con `python3 scripts/github/cola.py`.

## Decisión

La demostración integrada y los criterios de salida de E02 pasan. La fase permanece EN_REVISION hasta que el PR #49 reciba revisión automática limpia sobre su SHA final, pase `contrato-pr` y se integre sin bypass; entonces se registrará CERRADA con la verificación posterior de `develop`.
