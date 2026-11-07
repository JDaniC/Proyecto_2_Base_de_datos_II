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

