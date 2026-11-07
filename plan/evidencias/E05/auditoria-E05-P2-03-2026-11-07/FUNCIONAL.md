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
| Rutas DEC20 no entregables en API | PASS: navegación oculta y acceso directo bloqueado |
| MongoDB nueva/existente y modelo | PASS: migración 1/1 y modelo 102/102 |

## Regresiones conocidas ajenas

- Suite Backend: 372/372 runtime/unitarias PASS; contratos 45/46 por huella Firestore `migración010`, divergencia preexistente y fuera del diff E05-P2-03.
- Suite Frontend histórica: numerosas pruebas L01–L13 esperan perfiles demo/textos retirados por DEC20. La selección afectada por esta tarea y transporte HTTP queda PASS (33/33 + 28/28); no se declara verde la suite histórica completa.

La integración MongoDB usa proyecto efímero, secretos temporales y destrucción de volúmenes al finalizar. El recorrido queda acreditado por la cadena ejecutable cliente HTTP → frontera HTTP → caso/puerto → MongoDB; E05-P1-04 repetirá el recorrido visible desde una instalación limpia en otro equipo.

