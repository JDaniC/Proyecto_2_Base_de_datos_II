# Auditoría de seguridad — E05-P2-03

## Veredicto

**PASS en el alcance entregado.** Cero hallazgos confirmados o probables pendientes. No es una certificación global del repositorio.

## Superficie e inventario

- Frontera: `/api/v1/laboratorio/ordenes*`, `muestras*`, `resultados*`, `catalogos*` y nueva lectura `trabajo-analitico`.
- Aplicación/persistencia: `ConsultarListadosLaboratorio`, puerto `ListadosLaboratorio` y adaptador MongoDB.
- Cliente: repositorio HTTP de laboratorio, catálogos, composición, guards, navegación y pantallas clínicas.
- Dependencias: `npm audit` de Backend y Frontend; código y pruebas sobre datos sintéticos y MongoDB efímero.

## Revisión dirigida

| Control | Resultado |
|---|---|
| Identidad, institución y permisos derivados del token/cuenta vigente | PASS: guard HTTP, caso de uso y adaptador revalidan; el cliente omite autoridad |
| Mínimo privilegio | PASS: roles analíticos usan una proyección que omite solicitante, indicaciones, precios, actores y eventos de custodia |
| Inyección/consulta | PASS: DTO/query cerrados, UUID canónico y consultas Mongo sin operadores recibidos del cliente |
| XSS y datos en logs | PASS: React escapa contenido; no hay `innerHTML`/`eval`; se retiró el `console.log` de errores analíticos |
| Idempotencia/concurrencia | PASS: claves estables, revisión esperada y backend transaccional ya integrado |
| Secretos/datos reales | PASS: no hay secretos o datos clínicos reales en cambios/evidencias |
| Flujo visible y separación de funciones | PASS: cuenta analítica deriva autoridad del token; el recorrido no intenta usarla como médico de clínica común |
| Dependencias Frontend | PASS: hallazgo crítico en Vitest/Tinypool corregido con Vitest 4.1.12 y Vite 6.4.5; auditoría 0 vulnerabilidades |
| Dependencias Backend | ACEPTADO: 19 avisos moderados directos/transitivos en versiones heredadas (eslint y cadena Firestore/rimraf/glob), sin ruta controlada por el circuito Mongo/HTTP entregado; 0 high/critical |

## Hallazgos corregidos

1. **S01 — CONFIRMED/HIGH:** analista/validador intentaban leer orden y custodia con permisos administrativos. Corrección: endpoint y proyección analítica mínima con triple control (guard, cuenta vigente, adaptador). Prueba MongoDB real verifica ausencia de `precio` y `eventos`.
2. **S02 — CONFIRMED/CRITICAL (tooling):** dependencias de prueba frontend afectadas por RCE/path traversal. Corrección: actualización y adaptación de tipos de mocks. `npm audit --json`: 0.
3. **S03 — CONFIRMED/LOW:** registro de error crudo en captura podía incluir detalles clínicos. Corrección: eliminado; la UI conserva mensaje saneado.
4. **S04 — CONFIRMED/MEDIUM:** la bandeja generaba muestras pendientes, pero la primera toma no reemplazaba la fila virtual por el ID persistido. Corrección: reconciliación por el ID seleccionado y prueba real hasta aceptación/resultado.
5. **S05 — CONFIRMED/HIGH:** la validación volvía a consultar el resultado y podía certificar una revisión distinta de la que el validador había inspeccionado. Corrección: la UI conserva y envía la `revision` mostrada; el adaptador rechaza validaciones sin ella y no relee el resultado. Prueba HTTP confirma ausencia de GET previo.
6. **S06 — CONFIRMED/MEDIUM:** una corrección proyectaba solo la primera muestra de procedencia. Corrección: se preserva `muestraIds` completo desde la lectura hasta el comando de corrección, manteniendo el primer ID solo como compatibilidad visual. Prueba con dos muestras PASS.
7. **S07 — CONFIRMED/LOW:** tras perder la respuesta de un evento de custodia, una relectura podía producir versiones y clave distintas. Corrección: mientras el resultado sea incierto se conserva el cuerpo y la clave exactos; se descartan al confirmar éxito o error no reintentable. Prueba de respuesta perdida verifica dos POST idénticos y una sola lectura inicial.

Reauditoría tras cambios de revisión: 34/34 pruebas frontend focalizadas, build frontend, lint/arquitectura y build de pruebas backend PASS. El `BOOTSTRAP_MONGO_ERROR` posterior al recorrido corresponde a compatibilidad de reinstalación y se traslada explícitamente a E05-P1-04; no afecta los controles de autorización, atomicidad o exposición de datos del circuito entregado.



## Revalidación de la retoma del PR #82

Candidato de código `4701932`. Inventario afectado: entrada HTTP `trabajo-analitico`, normalización en `ConsultarListadosLaboratorio`, puerto `ListadosLaboratorio`, lectura snapshot en MongoDB, mapeo de resultados de React y flujo de tres cuentas sintéticas en navegador.

| Candidato | Control y prueba | Resultado |
|---|---|---|
| S08. Lectura global de muestras sin límite | La bandeja limita cada lectura de órdenes a `limite+1` tras aplicar elegibilidad. MongoDB real confirma dos páginas sin duplicar órdenes y conserva la orden completada. La consulta de detalle queda acotada por UUID. | CONFIRMED en `3651b8e`, corregido |
| S09. Manipulación o reutilización del cursor | Cursor autenticado por institución, ID y revisión de cuenta, permisos y filtro. La prueba MongoDB rechaza el cursor de bandeja en otra consulta. El caso de uso valida límite de 1–100 y tipos antes de la consulta. | PASS |
| S10. Exposición de orden administrativa a analista | Guard de HTTP, cuenta vigente y consulta MongoDB verifican permisos. La regresión de MongoDB comprueba rechazo de cuenta sin permisos y proyección sin precio ni eventos. La ruta auxiliar de UI no lee campos administrativos para completar resultados. | PASS |
| S11. Acción privilegiada y datos de prueba | El actor se deriva de sesión y cuenta vigente. Los DTO de captura/validación no envían autoridad. Los ensayos usan cuentas sintéticas con emuladores de autenticación en loopback y MongoDB de proyecto efímero. | PASS en pruebas HTTP, MongoDB y navegador con rechazo 403 al analista |
| S12. Dependencias y secretos | `npm audit --json` dio 0 avisos frontend y 19 moderados en backend, 0 altos/críticos. Los paquetes backend conservan las mismas versiones resueltas de `29dd2ca`; los avisos se concentran en herramientas y la cadena Firestore, fuera de la corrección analítica. Las evidencias guardan solo comandos y conteos. | PASS del alcance |

Ejecución actual: 372 pruebas backend y 46 contratos PASS. Frontend: 129 pruebas HTTP PASS, compilación PASS. MongoDB aislado: 1 integración con regresión de paginación y 102 comprobaciones de modelo PASS.
