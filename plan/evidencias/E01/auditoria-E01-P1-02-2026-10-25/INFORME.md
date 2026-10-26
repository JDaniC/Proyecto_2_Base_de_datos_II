# Auditoría funcional · E01-P1-02

Fecha: 25/10/2026 (America/Guatemala)
Estado: **PASS en los criterios de E01-P1-02; requisitos de persistencia completa permanecen parciales hasta las tareas de adaptadores**
Auditoría realizada sobre el árbol antes del commit de implementación.

## Resumen ejecutivo

Se revisaron manualmente 35 unidades ejecutables de producción y 30 contratos de puerto/tipo, siguiendo el inventario TypeScript de la skill. Se trazaron los requisitos RF-015/019/020 y RNF-018/023/026/030/031, además del trabajo concreto de E01-P1-02. Resultado en esta tarea: **0 fallos abiertos, 0 divergencias de contrato y 0 unidades nuevas de producción sin requisito**. Los criterios propios de esta tarea pasan; la matriz amplia queda en 3 PASS y 10 PARCIAL, porque varios requisitos necesitan persistencia, integración o casos de uso HTTP aún no asignados a este ID.

Se añadieron pruebas unitarias para clases válidas/inválidas, límites, transiciones institucionales y vectores de RFC 8785; también una prueba HTTP local confirma que claves JSON duplicadas (incluidos nombres con escape) se rechazan antes del controlador. `npm test` pasó 51 pruebas nuevas/runtime y 32 de contrato (83 en total). `npm run lint`, `npm run build` y la regla AST de dependencias pasaron.

## Fuentes y alcance

- `plan/entregas/E01_fundacion_backend/01_P1.md#e01-p1-02` — valores, políticas, puertos, casos de éxito/fallo y criterios.
- `plan/05_TRAZABILIDAD.md` — RF-015, RF-019, RF-020, RNF-018, RNF-023, RNF-026, RNF-030 y RNF-031.
- `plan/02_ARQUITECTURA_HEXAGONAL.md` §3–4 — puertos, contexto verificado, UoW y callbacks repetibles.
- `plan/03_CONTRATOS_Y_FLUJOS.md` §1, §5 y §7 — UUID, versiones, fechas, dinero, errores, JCS, clave idempotente, reintentos y reglas institucionales.
- `Backend/docs/openapi.yaml`, `Backend/docs/puertos-v1.ts` y RFC 8785 — contrato común congelado y vectores JCS.
- `Backend/package.json`, configuración TypeScript, tests de runtime/contrato y `scripts/verificar-arquitectura.mjs` — comportamiento y límites actuales del backend.

Se inventariaron manualmente las funciones TypeScript porque el helper de inventario de la skill es para Python. No se conectó ninguna base, servicio remoto ni credencial real. La prueba HTTP usó `127.0.0.1` con puerto efímero y datos sintéticos.

## Inventario y cobertura

El inventario completo está en [`inventario-typescript.csv`](inventario-typescript.csv); la matriz requisito→código→test está en [`trazabilidad.csv`](trazabilidad.csv). Las 35 unidades incluyen validadores de valores, normalizadores, canonizador/parser JCS, políticas, construcción del contexto, preparación de comandos y la integración de parser HTTP. Los 30 contratos de puerto/tipo incluyen lectura transaccional tipada, revisiones, auditoría, idempotencia y plan de escritura.

| Grupo | Unidades | Riesgo dominante | Resultado observado |
|---|---:|---|---|
| Valores compartidos y errores | 11 | MEDIUM | PASS; entrada inválida rechazada antes de usarse |
| JCS y parser JSON | 12 | HIGH | PASS; orden Unicode, datos inválidos y claves repetidas cubiertos |
| Contexto y preparación de comando | 2 | HIGH | PASS; contexto se congela, SHA-256 se solicita por puerto e IDs se fijan antes de UoW |
| Políticas clínicas | 8 | HIGH | PASS; permisos, rol/profesional, cita, responsables, archivo y reactivación |
| Frontera HTTP | 1 unidad de composición modificada | HIGH | PASS; clave JSON duplicada responde 400 común antes del controlador |
| Puertos comunes | 30 declaraciones | HIGH | PASS en compilación; no hay implementaciones/adaptadores en este ID |

## Matriz de trazabilidad requisito → código → test

| Requisito | Fuente | Código | Prueba | Estado |
|---|---|---|---|---|
| RF-015: valida tipos, formato, rangos, unicidad, pertenencia y estado | `plan/05_TRAZABILIDAD.md`; E01-P1-02 | UUID, Version, FechaCivil, InstanteUTC, Dinero, normalizadores y políticas de dominio | `valores-compartidos.test.ts`; `politicas-institucionales.test.ts` | PARCIAL: unicidad/propiedad dependen de repositorios y UoW aún no implementados |
| RF-019: la misma clave no duplica registros/movimientos | `plan/03_CONTRATOS_Y_FLUJOS.md` §7; E01-P1-02 | `serializarJCS`, `parsearJSONSinClavesDuplicadas`, `HashIntencion`, `ComandoEstable`, `prepararComandoEstable`, `RepositorioOperaciones` | `json-canonico.test.ts`; `preparar-comando-estable.test.ts`; `http.test.ts` | PARCIAL: intención preparada; replay durable requiere adaptador/UoW |
| RF-020: errores identificables en operaciones de negocio | `plan/05_TRAZABILIDAD.md`; OpenAPI v1 | `ErrorDominio`, catálogo de códigos, límites sin valores sensibles | pruebas unitarias de rechazo; respuesta HTTP común para JSON malformado/duplicado | PARCIAL: falta mapear errores de casos de uso que todavía no están implementados |
| RNF-018: plan define escrituras/datos/revisiones/auditoría juntos por comando | `plan/05_TRAZABILIDAD.md`; arquitectura §4 | `PlanConfirmacion`, `PlanDeEscrituras`, `UnidadDeTrabajo`, `LectorTransaccional` | build/lint de contratos de tipos | PARCIAL de extremo a extremo: no existe adaptador ni commit/rollback ejecutable en E01-P1-02 |
| RNF-023: evita duplicados, actualizaciones perdidas y carreras | `plan/05_TRAZABILIDAD.md`; contratos §7 | `Version`, `ComandoEstable`, `prepararComandoEstable`, `HashIntencion`, UoW | `valores-compartidos.test.ts`; `preparar-comando-estable.test.ts` | PARCIAL: contratos estables; carrera durable depende de P2-01/P2-02 |
| RNF-026: cálculos monetarios enteros sin coma flotante | `plan/05_TRAZABILIDAD.md`; OpenAPI `Dinero` | `Dinero`, `dinero`, `sumarDinero` | `valores-compartidos.test.ts` | PARCIAL: valor/operación cubiertos; redondeo de líneas sucede en futuros mappers |
| RNF-030: fecha civil intacta, evento UTC y presentación local | `plan/05_TRAZABILIDAD.md`; contratos §7 | `FechaCivil`, `InstanteUTC`, `fechaCivil`, `instanteUtc` | `valores-compartidos.test.ts` | PARCIAL: tipos/formatos cubiertos; almacenamiento/presentación no existen aquí |
| RNF-031: UUID público estable sin exponer claves nativas | `plan/05_TRAZABILIDAD.md`; OpenAPI `UUID` | tipo/validador UUID y firmas de repositorios por UUID | `valores-compartidos.test.ts`; compilación | PARCIAL: formato/firma cubiertos; estabilidad física se prueba en adaptadores |
| Políticas por institución: cita dental, responsable principal/autorización pediátrica, médico laboratorio, archivo/reactivación | ficha E01-P1-02; contratos §7 | `politicas-institucionales.ts` | `politicas-institucionales.test.ts` | PASS |
| Dependencias dominio/aplicación sin framework, SDK, motor ni entorno | arquitectura §1; RNF-035 | tipos/funciones puros y regla AST | `npm run lint` → `architecture:check` | PASS |

## Desviaciones detectadas

| ID | Unidad | Requisito | Tipo | Evidencia | Corrección/resultado |
|---|---|---|---|---|---|
| F-01 | `crear-aplicacion-http.ts` | Propiedades JSON duplicadas deben rechazarse antes de hash | SUB_IMPLEMENTADO al iniciar la revisión | `express.json` aceptaba `{"texto":"a","texto":"b"}` y eliminaba una propiedad al parsear | Se integró `parsearJSONSinClavesDuplicadas` en `verify`; el test HTTP local con clave repetida escapada devuelve 400 `SOLICITUD_INVALIDA`. Cerrado. |
| F-03 | `validarReactivacionHistorial` | Solo un historial archivado puede reactivarse | SUB_IMPLEMENTADO al revisar transiciones | La política validaba permiso/institución/causa, pero no recibía el estado actual | Se añadió el estado como precondición y un caso ARCHIVADO→aceptado / ACTIVO→rechazado. Cerrado. |
| F-02 | `UnidadDeTrabajo` y `RepositorioOperaciones` | RNF-018/RF-019 requieren atomicidad/replay observables | NOT_IMPLEMENTED fuera del alcance ejecutable de este ID | Hay contratos tipados, pero ningún adaptador ni implementación de UoW en el repo | Se clasifica PARCIAL y queda asignado a E01-P2-01/P2-02; no se cuenta como PASS de persistencia. |

No quedan desviaciones abiertas para los criterios de E01-P1-02. F-02 es un límite de fase declarado, no una implementación acreditada.

## Pruebas ejecutadas y resultado

| Comando/caso | Entorno | Resultado |
|---|---|---|
| `npm test` | Node local; HTTP localhost y contratos sintéticos | PASS: 51/51 runtime+unitarias y 32/32 contrato; 83/83 |
| `npm run lint` | ESLint + checker AST | PASS |
| `npm run build` | TypeScript producción | PASS |
| `python3 scripts/validar_contrato.py` | Python del host | BLOCKED: no se encuentra el módulo `yaml`/PyYAML |
| mismo validador con Python runtime del workspace | Python bundled | BLOCKED: PyYAML tampoco está instalado |
| `git diff --check` | árbol local | PASS |

El verificador de contrato Python no se reporta como PASS. Los tests Node ya existentes cubren la lectura del OpenAPI en el arranque y la consistencia de los 32 fixtures de aceptación; el bloqueo del validador offline externo queda registrado para continuidad.

## Auditoría de seguridad acotada

Se inspeccionaron el contexto autenticado y las políticas de permisos/prescripción con la skill `security-auditor`. No se encontraron vulnerabilidades CONFIRMED ni PROBABLE en la superficie ejecutada. La fábrica compara UID e institución verificados con la cuenta local, exige cuenta ACTIVA, valida rol/permiso contra catálogos y devuelve contexto con arrays/capas anidadas congeladas. Las políticas nunca leen autoridad del body.

Firebase token verification/revocation, lectura real de cuenta, guards HTTP y consultas por propiedad no existen todavía: pertenecen a E01-P1-03 y posteriores. Por eso el contexto recibe un `IdentidadVerificada` ya producido por el adaptador; no se presenta como autenticación funcional completa. Su uso no se puede validar sin el adaptador pendiente; queda **BLOCKED/futuro**, no un hallazgo confirmado de esta tarea. No se realizaron pruebas contra motores ni cuentas reales.

## Matriz final

| Categoría | Resultado | Evidencia |
|---|---|---|
| Criterios propios de E01-P1-02 | PASS | pruebas de límites, políticas, JCS, puertos compilables, HTTP y regla de arquitectura |
| Parser JSON duplicado | PASS | prueba HTTP real local + cinco casos de parser puro |
| Atomicidad/replay en motor | NOT_IMPLEMENTED | puertos definidos; implementación pertenece a P2-01/P2-02 |
| Autenticación Firebase y cuenta real | NOT_IMPLEMENTED | tarea E01-P1-03; fuera del alcance de P1-02 |
| Verificador Python offline de OpenAPI | BLOCKED | falta PyYAML en ambos interpretes consultados |
| Integración/estabilidad real entre motores | BLOCKED/NOT_APPLICABLE en esta tarea | no hay drivers ni entorno integrado, y P1-02 solo entrega contratos puros |

## Riesgos residuales

- El algoritmo de normalización queda versionado como `1`; equivalencia física de collation/índice debe comprobarse en los cuatro adaptadores.
- La seguridad del contexto requiere que E01-P1-03 lo construya solo después de verificar firma, emisor, audiencia, expiración y revocación y consultar cuenta/roles actuales.
- Los contratos de UoW no demuestran rollback, concurrencia, reintentos ni replay durable hasta las pruebas reales de PostgreSQL/MySQL/MongoDB/Firestore.
- SHA-256 se inyecta por puerto; implementación y vectors en adaptador de identidad/hash quedan pendientes. La prueba de comando verifica canonicalización y formato de digest, no el hash criptográfico real.
- El validador Python de OpenAPI requiere PyYAML para su ejecución offline; queda pendiente habilitarlo en el entorno documentado.

## Seguridad

Resumen: **0 CRITICAL · 0 HIGH · 0 MEDIUM · 0 LOW confirmados/probables · 1 bloqueo de cobertura futura**.

| ID | Severidad | Estado | Categoría | Componente | Resumen | Evidencia |
|---|---|---|---|---|---|---|
| SEC-01 | INFO | BLOCKED | Autenticación/autorización | contexto | No puede verificarse la cadena Firebase→cuenta local en este ID; ese adaptador todavía no existe | contrato de `IdentidadVerificada`; E01-P1-03 pendiente |

No se observó token, secreto, dato clínico ni acceso remoto durante la auditoría.
