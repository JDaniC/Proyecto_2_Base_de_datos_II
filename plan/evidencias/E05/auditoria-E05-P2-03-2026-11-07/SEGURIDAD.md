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
| Dependencias Frontend | PASS: hallazgo crítico en Vitest/Tinypool corregido con Vitest 4.1.12 y Vite 6.4.5; auditoría 0 vulnerabilidades |
| Dependencias Backend | ACEPTADO: 14 avisos moderados transitivos heredados (eslint y cadena Firestore/rimraf/glob), sin ruta controlada por el circuito Mongo/HTTP entregado; 0 high/critical |

## Hallazgos corregidos

1. **S01 — CONFIRMED/HIGH:** analista/validador intentaban leer orden y custodia con permisos administrativos. Corrección: endpoint y proyección analítica mínima con triple control (guard, cuenta vigente, adaptador). Prueba MongoDB real verifica ausencia de `precio` y `eventos`.
2. **S02 — CONFIRMED/CRITICAL (tooling):** dependencias de prueba frontend afectadas por RCE/path traversal. Corrección: actualización y adaptación de tipos de mocks. `npm audit --json`: 0.
3. **S03 — CONFIRMED/LOW:** registro de error crudo en captura podía incluir detalles clínicos. Corrección: eliminado; la UI conserva mensaje saneado.

