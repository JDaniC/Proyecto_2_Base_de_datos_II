# Auditoría funcional — E05-P2-03

## Veredicto

**PASS: 10/10 requisitos trazados, cero hallazgos aplicables abiertos.**

## Escenarios observados

| Escenario | Resultado |
|---|---|
| Bandeja vacía confirmada por API | PASS: devuelve lista vacía |
| Caída 503 | PASS: se propaga y se muestra como error, no como vacío |
| Recepción crea orden con paciente/solicitante/versiones | PASS: DTO cerrado y clave estable |
| Muestra cambia de estado/traslado/retoma/rectificación | PASS: adaptador usa versiones separadas de orden/muestra |
| Analista lista trabajo sin `ordenes.administrar` | PASS: fallback solo ante 403 hacia proyección autorizada |
| Captura con componentes variables | PASS: cuerpo conserva numérico/texto, unidad y referencia |
| Validador confirma con revisión optimista | PASS: actor derivado por servidor |
| Resultado validado se consulta desde orden | PASS: pestaña muestra versión, muestra y componentes |
| Recorrido visible UI→HTTP→MongoDB | PASS: orden, toma, recepción, aceptación, captura numérica/textual, validación y lectura tras recarga |
| Rutas DEC20 no entregables en API | PASS: navegación oculta y acceso directo bloqueado |
| MongoDB nueva/existente y modelo | PASS: migración 1/1 y modelo 102/102 |

## Regresiones conocidas ajenas

- Suite Backend: 372/372 runtime/unitarias PASS; contratos 45/46 por huella Firestore `migración010`, divergencia preexistente y fuera del diff E05-P2-03.
- Suite Frontend histórica: numerosas pruebas L01–L13 esperan perfiles demo/textos retirados por DEC20. La selección afectada por esta tarea y transporte HTTP queda PASS (33/33 + 28/28); no se declara verde la suite histórica completa.

La integración MongoDB usa proyecto efímero, secretos temporales y destrucción de volúmenes al finalizar. Comando reproducible en Windows: `$env:CLINICA_UI_SOLO_LABORATORIO='1'; node Backend/scripts/run-historial-integration.mjs --clinica-ui`. El proceso emitió tres hitos PASS del laboratorio y `Script exited successfully (code 0)` para el recorrido de navegador. La fase posterior del mismo orquestador detectó `BOOTSTRAP_MONGO_ERROR` al reejecutar `mongo-init` sobre la orden real ya creada; este control de reinstalación no forma parte del circuito E05-P2-03 y queda como hallazgo abierto de E05-P1-04, sin presentarlo como PASS global de instalación.

Revalidación posterior a las correcciones de revisión: Frontend 34/34 focalizadas y build PASS; incluye revisión visible en validación, procedencia múltiple y reintento estable. Backend lint/arquitectura y `build:test` PASS; MongoDB aislado 1/1 migración y 102/102 modelo PASS.



## Revalidación de la retoma del PR #82

| Requisito y unidad | Evidencia actual | Resultado |
|---|---|---|
| R03, bandeja analítica paginada y detalle. Controlador → caso de uso → puerto → MongoDB → repositorio React | Dos páginas reales con cursor, órdenes únicas, orden completada visible, detalle por UUID, cursor rechazado fuera de su ámbito. Prueba HTTP confirma que React solicita la página siguiente. | PASS |
| R04/R05, degradación de etiquetas en lectura. `trabajoParaResultado` y `mapResultado` | La lectura validada se conserva ante 503 de proyección. Ante 403 se devuelve el error. La interfaz identifica las etiquetas de prueba/parámetro ausentes. | PASS |
| R07/R08, escritura confirmada y recarga. `mapConTrabajo` | POST de validación exitoso seguido por GET de enriquecimiento 503 devuelve el resultado validado y su revisión. Se verifica una sola escritura. | PASS |
| R01/R07/R09, dos exámenes y funciones separadas. `clinica-e2e.mjs` y `clinica-ui-integration.mjs` | Chrome en proyecto efímero: recepción creó una orden con examen numérico y textual y aceptó dos muestras. Analista capturó ambos, recibió 403 al validar. El validador confirmó y leyó ambos tras recarga. | PASS |
| R02/R06, autoridad y rutas DEC20. Guard/DTO, cliente HTTP, alcance de producto | Backend 372/372 y contratos 46/46 PASS. Frontend 129/129 HTTP y build PASS. | PASS |

Hallazgos reproducidos durante la retoma: el documento HTTP canónico incluía 91 rutas pero dos pruebas aún esperaban 90. Se alineó el inventario de pruebas con la ruta analítica documentada. La prueba de navegador anterior combinaba funciones y mostraba un único examen con varios parámetros. El nuevo recorrido usa dos exámenes, tres cuentas y verifica un rechazo 403 del analista al intentar validar.

Comandos: `npm run build:test`, `npm run lint`, `node --test dist-test/tests/runtime/*.test.js dist-test/tests/unitarios/*.test.js`, `node --test tests/contratos/*.test.mjs`, `node scripts/run-clinica-mongodb-integration.mjs --laboratorio011` desde Backend. `npm test -- --run src/test/http` y `npm run build` desde Frontend.

Navegador: `CLINICA_UI_SOLO_LABORATORIO=1 PLAYWRIGHT_CHANNEL=chrome node scripts/run-historial-integration.mjs --clinica-ui`. Candidato `4701932`. El proceso de navegador terminó con código 0 y emitió tres hitos PASS. El orquestador salió 1 en la fase posterior de reinstalación con `BOOTSTRAP_MONGO_ERROR` sobre la orden ya persistida. Ese control de instalación queda pendiente en E05-P1-04.
