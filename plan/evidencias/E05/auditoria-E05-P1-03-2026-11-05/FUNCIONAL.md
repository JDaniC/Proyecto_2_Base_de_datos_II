# Auditoría funcional — E05-P1-03

Fecha: 05/11/2026 America/Guatemala. Autorización: petición de ejecutar E05-P1-03 y auditorías obligatorias por Daniel. Alcance: módulo backend de cobros, siete operaciones HTTP y sus conexiones con la UoW común; no todo el producto. Entorno: localhost, dobles explícitos y MongoDB replica set efímero; sin producción ni base compartida.

## 1. Resumen ejecutivo

Resultado final: PASS del alcance auditado, tras corregir ocho desviaciones verificadas. 43 unidades inventariadas (42 propias y la proyección institucional compartida), incluidas 22 clasificadas CRITICAL; 16 requisitos trazados. Los helpers locales se incluyen. Adaptadores/composición/UoW compartidos se revisaron en las líneas de integración y con la regresión completa. Sin requisitos CRITICAL pendientes en esta entrega. No se infiere cumplimiento de E05 completo.

## 2. Inventario y cobertura

Inventario exacto de archivo/línea: inventario.json. D: dominio y fronteras de entrada; I: integración MongoDB CA14; H: HTTP real con dobles explícitos de persistencia; E: manejo de errores/snapshot y lectores; C: contrato/preflight. Una fila de inventario agrupa sus callbacks bajo la misma unidad: no se cuentan como servicios independientes.

| ID | Unidad y fuente | Riesgo | Requisitos | Entradas / efectos | Tests | Estado |
|---|---|---|---|---|---|---|
| U01 | Backend/src/dominio/laboratorio/cobros/factura.ts:14`receptorFactura` | CRITICAL | R01–R07 | Objetos tipados/entrada cerrada; cálculo/estado inmutable | D + I | PASS |
| U02 | Backend/src/dominio/laboratorio/cobros/factura.ts:19`totalFactura` | CRITICAL | R01–R07 | Objetos tipados/entrada cerrada; cálculo/estado inmutable | D + I | PASS |
| U03 | Backend/src/dominio/laboratorio/cobros/factura.ts:34`emitirFactura` | CRITICAL | R01–R07 | Objetos tipados/entrada cerrada; cálculo/estado inmutable | D + I | PASS |
| U04 | Backend/src/dominio/laboratorio/cobros/factura.ts:42`saldoFactura` | CRITICAL | R01–R07 | Objetos tipados/entrada cerrada; cálculo/estado inmutable | D + I | PASS |
| U05 | Backend/src/dominio/laboratorio/cobros/factura.ts:48`exigirRevisionFactura` | CRITICAL | R01–R07 | Objetos tipados/entrada cerrada; cálculo/estado inmutable | D + I | PASS |
| U06 | Backend/src/dominio/laboratorio/cobros/factura.ts:53`registrarPago` | CRITICAL | R01–R07 | Objetos tipados/entrada cerrada; cálculo/estado inmutable | D + I | PASS |
| U07 | Backend/src/dominio/laboratorio/cobros/factura.ts:62`revertirPago` | CRITICAL | R01–R07 | Objetos tipados/entrada cerrada; cálculo/estado inmutable | D + I | PASS |
| U08 | Backend/src/dominio/laboratorio/cobros/factura.ts:68`anularFactura` | CRITICAL | R01–R07 | Objetos tipados/entrada cerrada; cálculo/estado inmutable | D + I | PASS |
| U09 | Backend/src/adaptadores/salida/mongodb/cobros/consultas-cobros.ts:9`leerSnapshotCobros` | HIGH | R09/R12–R13 | Filtros tipados; lecturas snapshot y cursor | E + I | PASS |
| U10 | Backend/src/adaptadores/salida/mongodb/cobros/consultas-cobros.ts:15`crearConsultasCobros` | HIGH | R09/R12–R13 | Filtros tipados; lecturas snapshot y cursor | E + I | PASS |
| U11 | Backend/src/adaptadores/salida/mongodb/cobros/consultas-cobros.ts:16`snapshot` | HIGH | R09/R12–R13 | Filtros tipados; lecturas snapshot y cursor | E + I | PASS |
| U12 | Backend/src/adaptadores/salida/mongodb/cobros/consultas-cobros.ts:17`limiteFecha` | HIGH | R09/R12–R13 | Filtros tipados; lecturas snapshot y cursor | E + I | PASS |
| U13 | Backend/src/adaptadores/salida/mongodb/cobros/consultas-cobros.ts:20`detalle` | HIGH | R09/R12–R13 | Filtros tipados; lecturas snapshot y cursor | E + I | PASS |
| U14 | Backend/src/adaptadores/salida/mongodb/cobros/consultas-cobros.ts:22`listar` | HIGH | R09/R12–R13 | Filtros tipados; lecturas snapshot y cursor | E + I | PASS |
| U15 | Backend/src/adaptadores/salida/mongodb/cobros/persistencia-cobros.ts:10`fallo` | CRITICAL | R01–R08/R12–R13 | Documentos internos; mapping/lectura/escritura ligada a session | D + E + I | PASS |
| U16 | Backend/src/adaptadores/salida/mongodb/cobros/persistencia-cobros.ts:12`entero` | CRITICAL | R01–R08/R12–R13 | Documentos internos; mapping/lectura/escritura ligada a session | D + E + I | PASS |
| U17 | Backend/src/adaptadores/salida/mongodb/cobros/persistencia-cobros.ts:14`fecha` | CRITICAL | R01–R08/R12–R13 | Documentos internos; mapping/lectura/escritura ligada a session | D + E + I | PASS |
| U18 | Backend/src/adaptadores/salida/mongodb/cobros/persistencia-cobros.ts:16`documentoFactura` | CRITICAL | R01–R08/R12–R13 | Documentos internos; mapping/lectura/escritura ligada a session | D + E + I | PASS |
| U19 | Backend/src/adaptadores/salida/mongodb/cobros/persistencia-cobros.ts:22`mapearFactura` | CRITICAL | R01–R08/R12–R13 | Documentos internos; mapping/lectura/escritura ligada a session | D + E + I | PASS |
| U20 | Backend/src/adaptadores/salida/mongodb/cobros/persistencia-cobros.ts:30`documentoPago` | CRITICAL | R01–R08/R12–R13 | Documentos internos; mapping/lectura/escritura ligada a session | D + E + I | PASS |
| U21 | Backend/src/adaptadores/salida/mongodb/cobros/persistencia-cobros.ts:34`mapearPago` | CRITICAL | R01–R08/R12–R13 | Documentos internos; mapping/lectura/escritura ligada a session | D + E + I | PASS |
| U22 | Backend/src/adaptadores/salida/mongodb/cobros/persistencia-cobros.ts:42`crearLectorCobros` | CRITICAL | R01–R08/R12–R13 | Documentos internos; mapping/lectura/escritura ligada a session | D + E + I | PASS |
| U23 | Backend/src/adaptadores/salida/mongodb/cobros/persistencia-cobros.ts:45`facturaPorId` | CRITICAL | R01–R08/R12–R13 | Documentos internos; mapping/lectura/escritura ligada a session | D + E + I | PASS |
| U24 | Backend/src/adaptadores/salida/mongodb/cobros/persistencia-cobros.ts:47`facturaPorOrden` | CRITICAL | R01–R08/R12–R13 | Documentos internos; mapping/lectura/escritura ligada a session | D + E + I | PASS |
| U25 | Backend/src/adaptadores/salida/mongodb/cobros/persistencia-cobros.ts:49`pagoPorId` | CRITICAL | R01–R08/R12–R13 | Documentos internos; mapping/lectura/escritura ligada a session | D + E + I | PASS |
| U26 | Backend/src/adaptadores/salida/mongodb/cobros/persistencia-cobros.ts:51`totalPagado` | CRITICAL | R01–R08/R12–R13 | Documentos internos; mapping/lectura/escritura ligada a session | D + E + I | PASS |
| U27 | Backend/src/adaptadores/salida/mongodb/cobros/persistencia-cobros.ts:58`aplicarCambiosCobros` | CRITICAL | R01–R08/R12–R13 | Documentos internos; mapping/lectura/escritura ligada a session | D + E + I | PASS |
| U28 | Backend/src/adaptadores/salida/mongodb/cobros/verificar-cobros.ts:6`ordenar` | MEDIUM | R13 | Metadatos; solo lectura, rechazo ante deriva | C + I | PASS |
| U29 | Backend/src/adaptadores/salida/mongodb/cobros/verificar-cobros.ts:8`verificarCobros` | MEDIUM | R13 | Metadatos; solo lectura, rechazo ante deriva | C + I | PASS |
| U30 | Backend/src/aplicacion/casos-uso/laboratorio/gestionar-cobros.ts:16`ejecutar` | CRITICAL | R01–R08/R10–R12/R14 | DTO de comando; plan atómico con revisiones/auditoría | D + H + I | PASS |
| U31 | Backend/src/aplicacion/casos-uso/laboratorio/consultar-cobros.ts:12`contexto` | HIGH | R09/R11/R12 | Contexto/filtros; revalidación de cuenta y consulta | H + I | PASS |
| U32 | Backend/src/aplicacion/casos-uso/laboratorio/consultar-cobros.ts:21`detalle` | HIGH | R09/R11/R12 | Contexto/filtros; revalidación de cuenta y consulta | H + I | PASS |
| U33 | Backend/src/aplicacion/casos-uso/laboratorio/consultar-cobros.ts:25`listar` | HIGH | R09/R11/R12 | Contexto/filtros; revalidación de cuenta y consulta | H + I | PASS |
| U34 | Backend/src/adaptadores/entrada/http/laboratorio/cobros.controller.ts:12`queryEscalar` | HIGH | R09/R11/R12 | HTTP no confiable; delegación cerrada y sobre data/meta | H + C | PASS |
| U35 | Backend/src/adaptadores/entrada/http/laboratorio/cobros.controller.ts:22`listar` | HIGH | R09/R11/R12 | HTTP no confiable; delegación cerrada y sobre data/meta | H + C | PASS |
| U36 | Backend/src/adaptadores/entrada/http/laboratorio/cobros.controller.ts:25`detalle` | HIGH | R09/R11/R12 | HTTP no confiable; delegación cerrada y sobre data/meta | H + C | PASS |
| U37 | Backend/src/adaptadores/entrada/http/laboratorio/cobros.controller.ts:28`pagos` | HIGH | R09/R11/R12 | HTTP no confiable; delegación cerrada y sobre data/meta | H + C | PASS |
| U38 | Backend/src/adaptadores/entrada/http/laboratorio/cobros.controller.ts:31`emitir` | HIGH | R09/R11/R12 | HTTP no confiable; delegación cerrada y sobre data/meta | H + C | PASS |
| U39 | Backend/src/adaptadores/entrada/http/laboratorio/cobros.controller.ts:34`pagar` | HIGH | R09/R11/R12 | HTTP no confiable; delegación cerrada y sobre data/meta | H + C | PASS |
| U40 | Backend/src/adaptadores/entrada/http/laboratorio/cobros.controller.ts:37`revertir` | HIGH | R09/R11/R12 | HTTP no confiable; delegación cerrada y sobre data/meta | H + C | PASS |
| U41 | Backend/src/adaptadores/entrada/http/laboratorio/cobros.controller.ts:40`anular` | HIGH | R09/R11/R12 | HTTP no confiable; delegación cerrada y sobre data/meta | H + C | PASS |
| U42 | Backend/src/adaptadores/entrada/http/laboratorio/cobros.controller.ts:43`escribir` | HIGH | R09/R11/R12 | HTTP no confiable; delegación cerrada y sobre data/meta | H + C | PASS |
| U43 | Backend/src/composicion/crear-bundles-institucionales.ts:38 `crearBundlesInstitucionales` | HIGH | R09/R11/R14 | Repositorios confiables; conserva extensiones en bundle productivo | laboratorio-composicion + HTTP por composición + MongoDB/HTTP real | PASS |

## 3. Matriz requisito → código → test

| Requisito | Fuente | Unidades | Test | Traza / resultado |
|---|---|---|---|---|
| R01 | RF-L11; tarea E05-P1-03 §1 | emitirFactura; documentoFactura; GestionarCobrosLaboratorio.ejecutar | unitarios/laboratorio-cobros; integracion/cobros-laboratorio-circuito | CUBIERTO / PASS |
| R02 | RNF-026; tarea §1 | totalFactura; dinero; totalPagado | unitarios/laboratorio-cobros; unitarios/cobros-lectores; integración CA14 | CUBIERTO / PASS |
| R03 | RF-L11; CA14; tarea §2 | registrarPago; saldoFactura; gestionar-cobros | unitarios/laboratorio-cobros; integración CA14 | CUBIERTO / PASS |
| R04 | RNF-023/027; CA14 | prepararComandoEstable; UoW MongoDB | integración CA14 (replay de las cuatro operaciones); unitarios/UoW MongoDB | CUBIERTO / PASS |
| R05 | RNF-027; CA14; tarea excepciones | aplicarCambiosCobros; UoW MongoDB | integración CA14 (Promise.allSettled, dos sesiones) | CUBIERTO / PASS |
| R06 | RF-L11; tarea §3; diseño §3.4.2 | revertirPago; documentoPago; aplicarCambiosCobros | unitarios/laboratorio-cobros; integración CA14 | CUBIERTO / PASS |
| R07 | RF-L11; tarea §3; RNF-024 | anularFactura; aplicarCambiosCobros; guardarRevisiones | unitarios/laboratorio-cobros; integración CA14 | CUBIERTO / PASS |
| R08 | RNF-027; tarea criterio | UnidadDeTrabajoMongodb; aplicarCambiosCobros | integración CA14 (fallo auditoría y conteos previos/posteriores) | CUBIERTO / PASS |
| R09 | RF-L12; tarea §4; plan/03 §7 | ConsultarCobrosLaboratorio; crearConsultasCobros; controller | integración CA14 (ambas páginas, fechas, ámbito); runtime/cobros-http | CUBIERTO / PASS |
| R10 | plan/01 DEC; tarea §4 | GestionarCobrosLaboratorio | integración CA14 (archivar antes de carrera/pagos/reversión/anulación) | CUBIERTO / PASS |
| R11 | AGENTS; plan/03 §7 | guardias HTTP; contextoVigente; ConsultarCobrosLaboratorio.contexto | runtime/cobros-http; unitarios/identidad-y-provision; integración CA14 | CUBIERTO / PASS |
| R12 | plan/03 §7; tarea fallos | queryEscalar; gestionar-cobros; leerSnapshotCobros; mappers | runtime/cobros-http; unitarios/cobros-snapshot; unitarios/cobros-lectores | CUBIERTO / PASS |
| R13 | AGENTS persistencia; M03 | verificarCobros; preparacion; mappers | contratos/cobros-esquema; integración CA14 (collMod temporal y restauración); unitarios/cobros-lectores | CUBIERTO / PASS |
| R14 | plan/02; AGENTS arquitectura | puertos/cobros; casos; composición; adapter | npm run lint/architecture:check; integración rollback/carrera | CUBIERTO / PASS |
| R15 | Instrucción humana05/11 + plan/11 | PR nuevos: auditorías antes de abrir y reserva exclusiva antes de implementar; PR79 ya abierto: auditar antes de continuar y conservar reserva existente | AGENTS/plan11; test_reserva_documental.py (2 pruebas) y revisión de contrato REST de GitHub | CUBIERTO / PASS |
| R16 | plan/03 §2/§7 y tareas E05 | Mapa UI asigna las seis acciones de cobros a P1-03 y nueve de inventario/calidad a P2-02 sin alterar otros campos | contratos/cobros-esquema + comparación JSON antes/después | CUBIERTO / PASS |

## 4. Desviaciones detectadas

| ID | Tipo / severidad | Evidencia antes | Corrección / regresión | Estado final |
|---|---|---|---|---|
| F01 | DIVERGENTE / HIGH | Controller retornaba Pagina interna; interceptor generaba data.siguienteCursor, contrario a meta.siguiente_cursor documentado; ambas listas | Controller publica data como elementos y cursor opcional en meta; prueba HTTP de primera/final de ambas rutas | PASS corregido |
| F02 | DIVERGENTE / MEDIUM | abortTransaction fallando ocultaba error original y evitaba traducción503 | leerSnapshotCobros conserva error original; doble provoca fallo de lectura + aborto, comprueba código/saneamiento y cierre | PASS corregido |
| F03 | DOC_DESACTUALIZADA / LOW | plan/03 §7 intercambiaba responsabilidades de P1-03/P2-02 frente a archivos de tareas | Se alinean facturas/pagos→P1-03 y calidad/inventario→P2-02 | PASS corregido |
| F04 | SUB_IMPLEMENTADO / MEDIUM | La emisión reservaba revisión de orden sin guardar su snapshot previo; UoW solo guarda revisiones planificadas | Se añade revisión de orden al mismo plan; MongoDB confirma snapshot completo versión1 una sola vez incluso en replay | PASS corregido |
| F05 | DIVERGENTE / HIGH | Mover PR tras auditorías dejaba sin desempate exclusivo previo a implementación | Creación atómica de referencia compartida única antes de código, prioridades heredadas y borrado con lease; dos competidores Git aislados, solo uno adquiere | PASS corregido |
| F06 | SUB_IMPLEMENTADO / HIGH | crearBundlesInstitucionales descartaba cobros y puertos de lecturas de laboratorio; consultas productivas terminaban503 aunque adaptadores aislados pasaran | Se preservan los tres puertos; test de identidad de proyección, runtime HTTP usando esa proyección y HTTP con MongoDB real a factura/saldo/pagos/órdenes/catálogos | PASS corregido |
| F07 | DOC_DESACTUALIZADA / LOW | Mapa UI mantenía los responsables intercambiados después de corregir plan03 | Se actualizan solo15 campos responsable; test contractual de6 acciones de cobros y9 de inventario/calidad | PASS corregido |
| F08 | DIVERGENTE / HIGH | Un traspaso que solo cambiara metadatos y conservara SHA permitía al antiguo propietario borrar la reserva con su lease previo | Traspaso autorizado actualiza SHA/UUID por CAS con lease; nuevo ejecutor espera confirmación; adquisiciones siempre nuevas evitan ABA. Prueba Git aislada de traspaso, borrado viejo y readquisición | PASS corregido |

Factura se emite en un comando atómico directamente como EMITIDA; BORRADOR es estado del esquema, sin endpoint de borrador exigido por la tarea. No se permite editar líneas/receptor emitidos; anulación conserva documento y snapshot previo append-only. Es la concreción del trabajo de E05-P1-03, sin módulo fiscal ni cambio al diseño de resultados/informes.



## 5. Evidencia de correcciones y criterio

F01 se demuestra con peticiones GET a ambas rutas y aserciones del sobre exacto; sin cursor al terminar. F02 con error de dominio y driver más fallo de aborto; salida sigue siendo SIN_PERMISO o PERSISTENCIA_NO_DISPONIBLE y session se cierra. F03 por comparación con tarea detallada, ID estable y plan/03 corregido. La suite anterior al añadido de fronteras mostró un fallo del test de tamaño: el fixture de100 líneas Unicode seguía bajo256KiB; se reemplazó por un objeto explícitamente sobredimensionado para medir el límite real. No se relajó el límite ni se borraron datos.

## 6. Pruebas añadidas y matriz por categoría

Archivos: tests/unitarios/laboratorio-cobros.test.ts, cobros-lectores.test.ts, cobros-snapshot.test.ts; tests/runtime/cobros-http.test.ts; tests/contratos/cobros-esquema.test.mjs; tests/integracion/cobros-laboratorio-circuito.ts, llamado por la suite física011 con --cobros.

| Categorías de la matriz de la skill | Aplicación y prueba |
|---|---|
| 1–2 entrada/tipos | DTO cerrado; campos ausentes/null/tipo/extra; importes/moneda/receptor/número/motivo/versiones y UUID. D/H/I PASS |
| 3 negocio | Total, centavo final, sobrepago, rango seguro, descuento y overflow. D/I PASS |
| 4 estado | EMITIDA→pagos/reversión/anulación; ANULADA rechaza; pago CONFIRMADO→ANULADO sin segunda reversión; orden cancelada rechaza emisión. D/I PASS |
| 5 persistencia | Snapshots preservados, número único, una factura por orden, revisiones y rollback de datos/operación/auditoría. I/C PASS |
| 6 salida | BSON long↔centavos; fecha UTC; data/meta/cursor en ambas listas y código durable. D/H/I PASS |
| 7 errores | 400/401/403/404/409/413/500/503, driver saneado, aborto no oculta error. H/E/I PASS |
| 8 límites | Número60/61; receptor200/201,40/41,80/81,4000/4001; líneas0/1/100/101; importes0/1/MAX/overflow, página1/100/101 y body256KiB. D/H/I PASS |
| 9 normalización | UUID canónico y JCS de comando compartidos; sin conversión/trim implícito de números/moneda; filtros normalizados en ámbito. C/H/I PASS |
| 10 dependencia | MongoDB real y fallo de auditoría; lectura corrupta/driver/aborto y preflight con deriva. E/I PASS |
| 11 concurrencia | Dos sesiones por último saldo, reenvío de las cuatro mutaciones, fallo sin escrituras parciales. I PASS |
| 12 filtros/página | Facturas/pagos en páginas de1 sin duplicados; estado/paciente/rango, cursor alterado/otra cuenta/otro filtro, vacío e inválidos. H/I PASS |
| 13 fecha/moneda | GTQ explícito, rangos [desde,hasta), fracción nanosegundo sobre BSON milisegundos y reversión anterior al pago rechazada. D/I PASS |

Funciones puras no tienen categorías5/10/11 como efectos propios (NOT_APPLICABLE); se verifican a través del caso compuesto. Factories/formatters no aceptan identidad externa directamente; autorización se comprueba en controller/caso. No se requieren uploads, emails, locale de moneda ni conversión de divisas en el módulo.

## 7. Bloqueos

Ninguno para el alcance backend de E05-P1-03. UI E05-P2-03, resultados/informes/inventario y ejecución cloud real quedan fuera de esta entrega; no se acreditan con estos tests.

## 8. Matriz final

| Grupo | Resultado | Evidencia |
|---|---|---|
| R01–R16 | PASS | Matriz anterior, pruebas ejecutadas y resultado.json |
| F01–F08 | PASS tras corrección | Regresiones y comparación de fuentes |
| Bloqueadas/no implementadas dentro de alcance | 0 | Inventario y trazas |
| Suite común | PASS | Resultado saneado en resultado.json |

## 9. Riesgos residuales

HTTP de seguridad usa identidades sintéticas y dobles explícitos; persistencia y concurrencia se acreditan aparte con MongoDB real y usuario de aplicación. No es prueba de firma real Firebase ni despliegue en producción. Índices heredados se conservan; no se afirma rendimiento de carga. Auditoría de la política documental nueva: prevalece la petición humana sobre reserva en borrador anterior y se registra la excepción temporal del PR79 ya abierto, sin fingir auditorías anteriores a su creación.

## Revalidación incremental tras revisión de 7cbb5ae

La primera auditoría no había comprobado explícitamente el snapshot previo de orden al reservar factura: CodeRabbit detectó ese hueco (F04). Se corrigió el plan tipando la unión de snapshots de orden/factura y la integración exige contenido_anterior exacto, versión1 y un registro incluso tras replay. F05 resuelve el conflicto introducido por la nueva política humana: referencia remota exclusiva codex/reserva-ID creada con POST antes de implementación; el segundo no empieza aunque leyera la cola antes. Prueba Git temporal con dos creadores y borrado con SHA ajeno rechazado; contrato REST contrastado con documentación primaria de GitHub. No se publicó una reserva ficticia de esta tarea ni se probó contra GitHub real.

Revalidación:362 runtime/unitarias +42 contratos,2 pruebas de reserva documental, MongoDB CA14/migración0111/1 y modelo102PASS; lint/arquitectura/build PASS. La documentación de funciones nuevas mejora su contrato sin cambiar comportamiento. Ambas auditorías se mantienen PASS sobre el incremento; inventario/hashes actualizados, sin nuevos hallazgos pendientes.

Revalidación documental tras216c909: AGENTS alinea la prioridad de tareas nuevas con la primera creación atómica; el número de PR solo desempata PR heredados competidores. R15 explicita la excepción de PR79 ya abierto: auditorías antes de continuar, reserva por el PR existente. No se atribuye cumplimiento retroactivo. Las2 pruebas documentales/creación exclusiva verifican también esta consistencia; código backend y sus huellas permanecen iguales al incremento probado. Ambas auditorías siguen PASS del alcance.

## Revalidación de composición productiva tras revisión completa de a6670bc

La auditoría previa usaba bundles directos y no había probado la proyección empleada por crearDependenciasBackend. CodeRabbit detectó F06. Se reabrió R09/R14 y se añadieron cobertura de la proyección productiva, runtime HTTP con esa proyección y peticiones HTTP de factura/saldo/ambas páginas de facturas/pagos frente a MongoDB real. También responden200 órdenes y catálogo de pruebas por los puertos de laboratorio previos preservados. No se afirma haber usado Firebase real: la identidad HTTP es un doble explícito, mientras cuenta/roles y persistencia son reales y sintéticos en MongoDB.

F07 corrige exactamente15 asignaciones del mapa UI: se compararon todos los demás campos con el commit anterior, sin diferencias. Regresión363 runtime/unitarias +43 contratos PASS;2 tests de coordinación PASS; MongoDB/HTTP CA14 y migración0111/1, modelo102PASS. Build/lint/arquitectura PASS. Auditorías de requisitos y seguridad revalidadas PASS sobre el incremento;43 unidades y16 requisitos.

## Revalidación de traspaso de reserva tras fc5a3c5

La revisión incremental no añadió hallazgos al backend. F08 identifica un hueco en el procedimiento de traspaso: la identidad remota debe cambiar, no solo el nombre en seguimiento. Se exige commit descendiente con nuevo UUID/ejecutor/motivo y cambio atómico de SHA mediante lease; si no se confirma, el nuevo ejecutor no continúa. Cada nueva adquisición usa UUID/commit distintos para evitar ABA. Plantilla de seguimiento recoge ambos SHA y resultado de confirmación.

Test Git temporal: dos competidores iniciales, un ganador; borrado con SHA ajeno falla; cambio de identidad por CAS en traspaso; borrado tardío del ganador anterior falla; readquisición con identidad nueva y limpieza vieja falla. Dos tests de coordinación/documentación PASS. Huellas de todos los archivos backend idénticas a las pruebas363+43 y HTTP/MongoDB1+102 acreditadas. Revisión funcional y de seguridad del delta documental PASS; ningún hallazgo aplicable pendiente.
