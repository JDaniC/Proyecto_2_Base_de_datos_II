# Catálogo y trazabilidad — E05-P2-03

Fecha: 07/11/2026, America/Guatemala. Alcance: circuito laboratorio en modo API, adaptador HTTP, proyección analítica mínima, rutas/pantallas DEC20 y pruebas. Los paquetes invocables `functional-requirements-auditor` y `security-auditor` no estaban expuestos por el runtime; se aplicó su protocolo de inventario, trazabilidad, hallazgos, corrección y revalidación sin sustituirlo por una suite verde.

| ID | Fuente | Requisito verificable | Código | Prueba / resultado |
|---|---|---|---|---|
| R01 | E05-P2-03.1 | Bandeja, alta/detalle de orden, muestras y resultados usan HTTP sin fallback a mocks | `httpLaboratoryRepository.ts`, `serviceFactory.ts`, `ServiceContext.tsx` | `LaboratoryHttp.test.ts`, 5/5 PASS |
| R02 | E05-P2-03.1; DEC07 | Actor, rol e institución no se aceptan del cuerpo del cliente | `httpClient.ts`, `httpLaboratoryRepository.ts` | prueba de captura/validación PASS |
| R03 | E05-P2-03.1 | Analista/validador no reciben orden administrativa completa | `trabajo-analitico`, `listarTrabajoAnalitico` | MongoDB real: proyección exacta, sin precio/eventos; PASS |
| R04 | E05-P2-03.2 | La orden muestra resultados validados con componentes, unidad, referencia, muestra y versión | `OrderDetailPage.tsx` | build PASS; mapeo de estructuras distintas en modelo MongoDB 102/102 PASS |
| R05 | E05-P2-03.3 | Carga, vacío confirmado y fallo de servicio son estados distintos | `WorklistPage.tsx`, `SamplesManagementPage.tsx`, `NewOrderPage.tsx` | vacío vs 503 en `LaboratoryHttp.test.ts` PASS |
| R06 | E05-P2-03.3; DEC20 | Rutas no entregables se ocultan y bloquean en modo API | `productScope.ts`, `RouteContent.tsx`, `Sidebar.tsx` | prueba DEC20 PASS |
| R07 | CA12/18 | Captura y validación conservan roles separados y revisión optimista | adaptador HTTP + backend integrado | Backend focalizado 10/10; MongoDB real PASS |
| R08 | Excepciones | Escrituras usan clave estable y no recrean en respuesta incierta | `stableCommandKeys`, comandos del adaptador | aserciones de Idempotency-Key PASS |
| R09 | Consigna p.1 | Componentes variables numéricos/textuales conservan unidad/referencia | `mapParametro`, `componentes` | modelo MongoDB acepta dos estructuras; 102/102 PASS |
| R10 | Puerta 05/11 | Seguridad y requisitos sin hallazgos aplicables abiertos antes del PR | esta carpeta | SEGURIDAD y FUNCIONAL: PASS |

