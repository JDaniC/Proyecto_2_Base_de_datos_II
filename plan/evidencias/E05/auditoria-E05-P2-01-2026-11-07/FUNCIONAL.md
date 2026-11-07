# Auditoría funcional — E05-P2-01

Fecha: 07/11/2026 America/Guatemala. Autorización: petición humana de Daniel (`JDaniC`) de cerrar e integrar `E05-P2-01` (PR #78) con ambas auditorías obligatorias antes de iniciar `E05-P2-03`. Alcance: módulo backend de resultados analíticos de laboratorio, siete operaciones HTTP (`/api/v1/laboratorio/resultados*`), conexión con la UoW MongoDB y migración explícita `012_resultados_laboratorio_mongodb.mjs`. Entorno: localhost, dobles explícitos y contenedor MongoDB 8.0 replica set (`rs0`) efímero aislado.

## 1. Resumen ejecutivo

Resultado final: **PASS** del alcance auditado, tras verificar y corregir las desviaciones de revisión e índices (incluyendo el fallback de `collation` en `listIndexes` tanto en `verificarLaboratorioMongodb` como en el preflight de la migración 012). Se inventariaron 40 unidades auditables (23 clasificadas `CRITICAL`) y se trazaron 14 requisitos (`R01`–`R14`) hacia código y pruebas reproducibles. Cero requisitos `CRITICAL`/`HIGH` pendientes o bloqueados en este alcance.

## 2. Inventario y cobertura

Inventario detallado de archivo y línea en [`inventario.json`](inventario.json). Leyenda de pruebas: `U` = unitarias (`laboratorio-resultados.test.ts`, `laboratorio-http.test.ts`, `unidad-de-trabajo-mongodb.test.ts`, `laboratorio-composicion.test.ts`); `R` = runtime (`http.test.ts`, `openapi.test.ts`, `startup.test.ts`); `C` = contratos (`laboratorio-migracion-012.test.mjs`, `openapi-v1.test.mjs`); `I` = integración física MongoDB (`laboratorio-migracion-mongodb.test.ts`).

| ID | Unidad y fuente | Riesgo | Requisitos | Entradas / efectos | Tests | Estado |
|---|---|---|---|---|---|---|
| U01–U04 | `resultado.ts`: `textoOpcional`, `numeroFinito`, `validarValor`, `normalizarComponente` | CRITICAL | R01, R13 | Validación estricta por parámetro congelado (`NUMERICO`, `TEXTO`, `CATEGORICO`), unidad y rangos | U + I | PASS |
| U05–U07 | `resultado.ts`: `itemDeOrden`, `normalizarProcedencia`, `verificarProcedenciaResultado` | CRITICAL | R01, R02, R09 | Verifica ítem no cancelado, muestras `ACEPTADA`/`PROCESADA` de la orden/ítem y snapshot de procedencia | U + I | PASS |
| U08 | `resultado.ts`: `completarOrdenPorResultado` | CRITICAL | R06 | Marca ítem `COMPLETADO` y deriva orden `COMPLETADA`/`EN_PROCESO` respetando cancelados | U + I | PASS |
| U09–U15 | `resultado.ts`: `componentesDe`, `crearBase`, `crearBorradorResultado`, `guardarBorradorResultado`, `validarResultado`, `crearCorreccionResultado`, `crearRepeticionResultado` | CRITICAL | R01–R05 | Invariantes de borrador, revisión optimista, inmutabilidad de validado, serie/versión en corrección y nueva serie en repetición | U + I | PASS |
| U16–U19 | `gestionar-resultado.ts`: `componentes`, `muestras`, `autorizar`, `GestionarResultadoLaboratorio.ejecutar` | CRITICAL | R01–R06, R08–R11 | DTO cerrado, separación de rol/permiso (`ANALISTA_LABORATORIO` vs `VALIDADOR_LABORATORIO`), plan atómico UoW con reserva de orden | U + I | PASS |
| U20–U22 | `consultar-recursos.ts` (`detalle`), `consultar-listados.ts` (`ejecutar`) | HIGH | R07, R11 | Revalidación de cuenta local activa, permisos analíticos y filtros/paginación cerrados | U + I | PASS |
| U23–U29 | `laboratorio.controller.ts`: `capturarResultado`, `editarResultado`, `validarResultado`, `corregirResultado`, `repetirResultado`, `listarResultados`, `resultadoDetalle` | HIGH | R01–R08, R11 | Frontera HTTP, `@RequiereAcceso`, `Idempotency-Key` UUID y parámetros escalares | U + R + C | PASS |
| U30–U33 | `documento-resultado.ts` (`documentoResultadoLaboratorio`, `validarTamanoDocumentoResultado`, `mapearResultadoLaboratorio`), `leer-resultado.ts` (`crearLectorResultadoMongodb`) | CRITICAL | R01, R04, R05, R07, R13 | Serialización BSON ≤ 256 KiB, reconstrucción histórica sin consultar catálogo vigente y lectura transaccional por ID/serie | U + I | PASS |
| U34–U36 | `aplicar-cambios.ts` (`aplicarCambiosLaboratorio`), `consultar-recursos.ts` (`resultadoPorId`), `listar-recursos.ts` (`listarResultados`) | CRITICAL | R02–R10 | Escritura condicionada por `revision` y `estado: 'BORRADOR'`, actualización/reserva de orden y lecturas snapshot con cursor cifrado | U + I | PASS |
| U37–U40 | `verificar-preparacion.ts` (`verificarLaboratorioMongodb`), `012_resultados_laboratorio_mongodb.mjs` (`destinoDesde`, `indiceCompatible`, `migrarResultadosLaboratorioMongodb`) | CRITICAL | R12, R13 | Migración 012 con preflight de validador/documentos/índices, cotejamiento efectivo y recuperación | C + I | PASS |

## 3. Matriz requisito → código → test

| Requisito | Fuente | Unidades | Test | Traza / resultado |
|---|---|---|---|---|
| R01 | RF-L05; CA12 | U01–U06, U09–U11, U19, U30 | `unitarios/laboratorio-resultados.test.ts`; `integracion/laboratorio-migracion-mongodb.test.ts` | CUBIERTO / PASS |
| R02 | RF-L05/L06; CA12/13 | U06, U13, U18, U19, U34 | `unitarios/laboratorio-resultados.test.ts`; `integracion/laboratorio-migracion-mongodb.test.ts` | CUBIERTO / PASS |
| R03 | RF-L06; CA12 | U12, U13, U19, U34 | `unitarios/laboratorio-resultados.test.ts`; `integracion/laboratorio-migracion-mongodb.test.ts` | CUBIERTO / PASS |
| R04 | RF-L07; CA16 | U14, U19, U30–U34 | `unitarios/laboratorio-resultados.test.ts`; `integracion/laboratorio-migracion-mongodb.test.ts` | CUBIERTO / PASS |
| R05 | RF-L07; CA16 | U15, U19, U30–U34 | `unitarios/laboratorio-resultados.test.ts`; `integracion/laboratorio-migracion-mongodb.test.ts` | CUBIERTO / PASS |
| R06 | RF-L06; tarea §4 | U08, U19, U34 | `unitarios/laboratorio-resultados.test.ts`; `integracion/laboratorio-migracion-mongodb.test.ts` | CUBIERTO / PASS |
| R07 | RF-L12/L13; tarea §4 | U20–U22, U28, U29, U32, U35, U36 | `unitarios/laboratorio-resultados.test.ts`; `integracion/laboratorio-migracion-mongodb.test.ts`; `contratos/openapi-v1.test.mjs` | CUBIERTO / PASS |
| R08 | RNF-023/027 | U19, `unidad-de-trabajo-mongodb.ts` | `unitarios/unidad-de-trabajo-mongodb.test.ts`; `integracion/laboratorio-migracion-mongodb.test.ts` | CUBIERTO / PASS |
| R09 | RNF-027; CA12 | U07, U19, U34, `unidad-de-trabajo-mongodb.ts` | `unitarios/unidad-de-trabajo-mongodb.test.ts`; `integracion/laboratorio-migracion-mongodb.test.ts` (carreras corrección y muestra/resultado) | CUBIERTO / PASS |
| R10 | RNF-027; AGENTS | U19, U34, `unidad-de-trabajo-mongodb.ts` | `unitarios/unidad-de-trabajo-mongodb.test.ts`; `integracion/laboratorio-migracion-mongodb.test.ts` | CUBIERTO / PASS |
| R11 | AGENTS; plan/03 §7 | U18–U29 | `unitarios/laboratorio-resultados.test.ts`; `unitarios/laboratorio-http.test.ts`; `integracion/laboratorio-migracion-mongodb.test.ts` | CUBIERTO / PASS |
| R12 | AGENTS persistencia | U37–U40 | `contratos/laboratorio-migracion-012.test.mjs`; `integracion/laboratorio-migracion-mongodb.test.ts` | CUBIERTO / PASS |
| R13 | plan/02; AGENTS | U01–U36 | `npm run lint` (`architecture:check`); `unitarios/laboratorio-resultados.test.ts` | CUBIERTO / PASS |
| R14 | Instrucción 05/11 y 07/11 | Documentación y evidencia E05-P2-01 | `REQUISITOS.md`, `FUNCIONAL.md`, `SEGURIDAD.md`, `inventario.json`, `resultado.json` | CUBIERTO / PASS |

## 4. Desviaciones detectadas y corregidas durante el ciclo del PR #78

| ID | Tipo / severidad | Evidencia antes | Corrección / regresión | Estado final |
|---|---|---|---|---|
| F01 | DOC_DESACTUALIZADA / LOW | `openapi.yaml` no distinguía explícitamente `versionEsperada` (`revision` optimista del documento) frente a `version` clínica en resultados | Se documentó en `openapi.yaml` que `versionEsperada` coincide con `revision` y que las lecturas exponen ambos campos | PASS corregido |
| F02 | SUB_IMPLEMENTADO / HIGH | Capturar/editar/validar un resultado sin reservar la revisión de la orden permitía carreras entre un rechazo concurrente de muestra y la captura/validación del resultado | Toda mutación de resultado reserva o actualiza `ordenes.revision` en la misma UoW; prueba física concurrente `Promise.allSettled` entre captura y rechazo | PASS corregido |
| F03 | SUB_IMPLEMENTADO / MEDIUM | `verificarLaboratorioMongodb` y el preflight de `012` trataban un índice existente sin `collation` en `listIndexes()` como si heredara el `collation` de la colección, cuando MongoDB omite `collation` en `listIndexes()` para índices `{locale: 'simple'}` | `actual.collation` ausente se evalúa como `{locale: 'simple'}` mientras que `esperado.collation` ausente usa `collationColeccion`; pruebas contractuales y en MongoDB real con colección `es` e índice `simple` | PASS corregido |

## 5. Matriz final

| Grupo | Resultado | Evidencia |
|---|---|---|
| R01–R14 | PASS | Matriz anterior, `371/371` runtime/unitarias, `46/46` contratos y `1/1` + `102/102` MongoDB aislado |
| F01–F03 | PASS tras corrección | Regresiones en `laboratorio-migracion-012.test.mjs` y `laboratorio-migracion-mongodb.test.ts` |
| Bloqueadas / no implementadas dentro de alcance | 0 | Inventario y trazas |
| Riesgos residuales | Documentados | La conexión HTTP de la interfaz React pertenece a `E05-P2-03` y la demostración en 4 motores a `E05-P1-04` |
