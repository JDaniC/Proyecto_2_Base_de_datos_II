# Auditoría funcional · E01-P1-01

Fecha: 25/10/2026 (America/Guatemala)
Estado: **PASS en el alcance de E01-P1-01**
Auditoría previa al commit de implementación.

## Resumen

Se trazaron los requisitos E01-P1-01 y RNF-001/004/007/029/035/EF02 contra el código y sus pruebas. Resultado final: 0 fallos funcionales abiertos, 0 divergencias de contrato, 0 unidades de producción sin traza dentro del alcance. Hubo un fallo inicial del arnés de pruebas HTTP: la ruta de excepción 401 no estaba registrada por faltar `@Get`; se corrigió y la repetición completa terminó con 26/26 pruebas nuevas y 32/32 pruebas de contrato existentes.

## Fuentes y alcance

- `plan/entregas/E01_fundacion_backend/01_P1.md#e01-p1-01` — trabajo, flujos de éxito/fallo y criterios de aceptación.
- `plan/05_TRAZABILIDAD.md` — RNF-001 (hexagonal), RNF-004 (tecnología), RNF-007 (monolito modular), RNF-029 (REST/JSON bajo `/api/v1`) y RNF-035 (dominio/casos de uso independientes).
- `plan/01_ALCANCE_Y_DECISIONES.md` — EF02, aplicación funcional cliente-servidor y arquitectura hexagonal.
- `plan/02_ARQUITECTURA_HEXAGONAL.md` — dirección de dependencias, factories/tokens, composición institucional y estado de persistencia.
- `plan/03_CONTRATOS_Y_FLUJOS.md` y `Backend/docs/openapi.yaml` — sobre común, errores, correlación, límite de 262144 bytes y contrato v1 congelado.
- `plan/11_CONTINUIDAD_Y_COLA_COMPARTIDA.md` — reserva, seguimiento y flujo PR.

Se auditó la superficie nueva ejecutable: dominio, aplicación, configuración, composición, middleware HTTP, pipe, interceptor, filtro de errores, controlador de salud, arranque y scripts de arquitectura/build. El controlador `pruebas-http` solo existe bajo `tests/fixtures`; no se incluye en el build de producción. Se ejecutó el inventario Python recomendado sobre `Backend/scripts`: encontró 4 unidades del validador contractual existente (`decimal_values`, `is_integer`, `require`, `validate_artifacts`), fuera del código nuevo; el validador se ejecutó y pasó.

## Matriz de trazabilidad

La matriz completa está en [`trazabilidad.csv`](trazabilidad.csv); el inventario de unidades está en [`inventario-typescript.csv`](inventario-typescript.csv).

| Requisito verificable | Evidencia de código | Evidencia de prueba | Estado |
|---|---|---|---|
| El servidor Nest/TypeScript usa dependencias fijadas, compila y tiene lint/test | `Backend/package.json`, `package-lock.json`, `tsconfig*.json`, `src/main.ts` | `npm ci`, `npm run build`, `npm run lint`, `npm test` | PASS |
| Configuración faltante/inválida impide abrir el servidor sin mostrar valores | `src/configuracion/entorno.ts`, `src/main.ts` | `configuracion.test.ts`, dos casos de proceso real en `startup.test.ts` | PASS |
| DTO rechaza omitidos, null, vacío, tipo incorrecto, campo extra y longitud excedida | `validacion.pipe.ts`, `errores-validacion.ts` | casos HTTP válidos e inválidos; límite exacto 20/21; se limita salida a 100 errores | PASS |
| Respuesta/envuelto y error común conservan correlación; 4xx/5xx no filtran detalle | `correlacion.middleware.ts`, `respuesta.interceptor.ts`, `filtro-errores.ts`, `errores-parser.middleware.ts` | éxito, correlación válida/inválida, 400/401/403/404/409/413/503/500, cuerpo JSON malformado y >256 KiB | PASS |
| API usa el prefijo y expone salud/documentación sin agregar endpoints ficticios | `crear-aplicacion-http.ts`, `health.controller.ts`, contrato `docs/openapi.yaml` | startup real; health/readiness; Swagger JSON/YAML/UI; verifica 22 rutas y excluye controladores de prueba | PASS |
| La composición construye caso de uso ordinario con token/factory y bundles inmutables | `app.module.ts`, `tokens.ts`, `crear-bundles-institucionales.ts`, `ConsultarBundlesConfigurados` | resolución DI, cuatro instituciones, `Object.isFrozen`, sin base | PASS |
| Dominio/aplicación no dependen de HTTP, Nest, SDK, UI, drivers, configuración ni proceso | `scripts/verificar-arquitectura.mjs` | `npm run architecture:check`, incluido en `npm run lint` | PASS |
| No hay endpoints de producto atribuidos a implementación | `openapi.yaml` no se modificó; health/doc fuera del contrato clínico; test controller solo en tests | OpenAPI permanece en 22 rutas; validador offline 26 operaciones/99 esquemas/230 fixtures | PASS |

## Pruebas finales reproducibles

- `npm ci` — PASS con Node 24.22.0 y `.npmrc` `ignore-scripts=true`.
- `npm run build` — PASS con TypeScript 6.0.3/NestJS 12.2.0.
- `npm run lint` — PASS; ESLint y regla AST.
- `npm test` — PASS: 26 pruebas de runtime más 32 pruebas existentes; 58/58 total.
- `npm audit` — PASS: 0 vulnerabilidades conocidas.
- `/tmp/e00-p1-03-venv/bin/python Backend/scripts/validar_contrato.py` — PASS, modo offline sin API ni motores; 22 rutas, 26 operaciones, 99 esquemas, 230 fixtures y 117 métodos UI.
- `git diff --check` — PASS.

Todos los tests que abren sockets usan `127.0.0.1` y puertos efímeros. Los tests de proceso aíslan las variables a valores sintéticos. No se usaron Firebase, servicios remotos, datos clínicos ni bases de datos.

## Desviaciones y correcciones

**F-01 — ruta 401 del arnés sin registrar.** Severidad: baja; estado: corregido. La primera ejecución de la matriz de excepciones devolvió 404 al pedir el caso 401 porque faltaba el decorador `@Get('http-error/:status')` en `tests/fixtures/http-prueba.module.ts`. Se agregó el decorador y se repitieron build, lint, suite runtime y suite de contrato: 26/26 + 32/32 PASS. No era una ruta de producción ni un defecto del filtro.

## Requisitos aún no implementados por el alcance

Las 22 rutas del contrato describen operaciones de producto y continúan marcadas `NOT_IMPLEMENTED`. Autenticación Firebase, autorización efectiva, consultas clínicas, persistencia, transacciones y los cuatro drivers pertenecen a tareas E01 posteriores/E02–E06; no se acreditan por el armazón ni por pruebas HTTP de test. Readiness devuelve 503 hasta conectar persistencia. Esto es el comportamiento documentado, no un fallo de esta tarea.

## Estado de cierre de auditoría

| Estado | Conteo |
|---|---:|
| PASS | 8 requisitos de alcance |
| FAIL abierto | 0 |
| BLOCKED | 0 |
| NOT_IMPLEMENTED fuera del alcance de esta tarea | Operaciones de producto, Auth y persistencia; conservar para sus IDs correspondientes |

La revisión `revision-codex` del PR y el SHA de implementación están pendientes porque el PR #22 sigue en borrador y el commit de implementación todavía no se creó.
