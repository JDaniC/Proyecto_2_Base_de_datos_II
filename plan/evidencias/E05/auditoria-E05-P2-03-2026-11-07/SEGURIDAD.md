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
| Dependencias Backend | ACEPTADO: 14 avisos moderados transitivos heredados (eslint y cadena Firestore/rimraf/glob), sin ruta controlada por el circuito Mongo/HTTP entregado; 0 high/critical |

## Hallazgos corregidos

1. **S01 — CONFIRMED/HIGH:** analista/validador intentaban leer orden y custodia con permisos administrativos. Corrección: endpoint y proyección analítica mínima con triple control (guard, cuenta vigente, adaptador). Prueba MongoDB real verifica ausencia de `precio` y `eventos`.
2. **S02 — CONFIRMED/CRITICAL (tooling):** dependencias de prueba frontend afectadas por RCE/path traversal. Corrección: actualización y adaptación de tipos de mocks. `npm audit --json`: 0.
3. **S03 — CONFIRMED/LOW:** registro de error crudo en captura podía incluir detalles clínicos. Corrección: eliminado; la UI conserva mensaje saneado.
4. **S04 — CONFIRMED/MEDIUM:** la bandeja generaba muestras pendientes, pero la primera toma no reemplazaba la fila virtual por el ID persistido. Corrección: reconciliación por el ID seleccionado y prueba real hasta aceptación/resultado.

Reauditoría tras cambios de revisión: 31/31 pruebas frontend focalizadas, build frontend, lint/arquitectura y build de pruebas backend PASS. El `BOOTSTRAP_MONGO_ERROR` posterior al recorrido corresponde a compatibilidad de reinstalación y se traslada explícitamente a E05-P1-04; no afecta los controles de autorización, atomicidad o exposición de datos del circuito entregado.

