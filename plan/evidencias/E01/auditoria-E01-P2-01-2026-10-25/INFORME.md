# Informe de Auditoría — E01-P2-01 SQL

- **Fecha:** 25/10/2026, America/Guatemala
- **Alcance:** `Backend` SQL adapters PostgreSQL/MySQL, SQL UoW, runtime config/error mapping, integration harness and requirements of E01-P2-01.
- **Tipo:** funcional, con revisión dirigida de permisos, secretos y transacciones.
- **Autorización:** propietario del repositorio; ejecución solicitada por Daniel Cifuentes.
- **Entorno:** tests unitarios/runtime locales y PostgreSQL/MySQL Docker bajo proyecto, puertos, secretos y volúmenes temporales. No se usaron los servicios de desarrollo.

## 1. Resumen ejecutivo

- Unidades inventariadas: 14 grupos de unidades TypeScript; el inventariador Python encontró 15 unidades Python ajenas al adaptador y no detecta TypeScript.
- Requisitos extraídos: 8 criterios del ID y sus fuentes RNF/CA.
- Trazados requisito→código: 8.
- Hallazgos abiertos: 0 CRITICAL · 1 HIGH · 0 MEDIUM · 0 LOW (preflight pendiente antes de habilitar persistencia).
- Resultado global: **PARCIAL**.

**Veredicto:** la capa SQL implementa y demuestra transacción, rollback, idempotencia, permisos mínimos y reintento en ambos motores; el preflight de manifiesto aún no está conectado al arranque, que permanece sin persistencia habilitada.

## 2. Inventario y cobertura

| ID | Unidad | Tipo | Riesgo | Requisito(s) | Entradas | Efectos | Dependencias | Tests existentes | Estado |
|---|---|---|---|---|---|---|---|---|---|
| U01 | `parsearConfiguracionSql`, `leerMotor`, error de configuración | Parser/configuración | MEDIUM | RNF-012/013; tarea 1 | variables host/puerto/usuario/base/ruta | congela configuración | entorno | `conexiones-sql.test.ts` | PASS |
| U02 | `crearAdquiridorLimitado`; consultas directas de los pools | Cola/adquisición | HIGH | tarea 1, agotamiento de pool | límites y Promise de conexión | toda consulta espera con límite y libera conexión tardía | drivers PG/MySQL | `adquirir-con-limite.test.ts` (ambos wrappers) | PASS |
| U03 | pool y conexión PostgreSQL | Adaptador de persistencia | HIGH | RNF-016/018; tarea 1 | SQL parametrizado, secreto file | conexión dedicada, begin/commit/rollback/cierre | `pg` | integración PG | PASS |
| U04 | pool y conexión MySQL | Adaptador de persistencia | HIGH | RNF-016/018/021; tarea 1 | SQL parametrizado, secreto file | transacción InnoDB, cierre/timeouts | `mysql2` | integración MySQL | PASS |
| U05 | `crearUnidadDeTrabajoSql` / `ejecutarIntento` | Flujo transaccional | CRITICAL | RNF-016/018, CA05 parcial | contexto, comando, plan | revisiones antes de cambios; dato/revisión/auditoría/operación atómicos; reconciliación | pool, lectores/escritores tipados | rollback tardío; orden revisión/cambio; commit incierto/definitivo | PASS en frontera SQL |
| U06 | `crearLectorConOperaciones`, `resolverRepeticion`, deserialización/reconciliación | Idempotencia/recuperación | HIGH | tarea 2, reintento seguro | actor/caso/clave/hash | consulta durable; respuesta original o error controlado | constraint única y operación persistida | concurrencia same-key, hash distinto | PASS |
| U07 | `resolverUsuario`, `establecerUtc`, persistencia de revisión/auditoría/operación | Identidad y metadatos | HIGH | RNF-015/016/018 | identidad verificada/contexto/plan | actor local, sello UTC y registros en misma transacción | cuenta local, tablas SQL | FK, permiso, rollback y motivo sintético | PASS |
| U08 | traductor de deadlock/constraints/permisos/triggers | Traducción de errores | HIGH | tarea 4 | código SQL/SQLSTATE | error de dominio seguro o reintento acotado | códigos PG/MySQL | deadlock real, FK, check, permiso y trigger MySQL | PASS para códigos probados |
| U09 | mapper común de cuenta y repositorios PG/MySQL | Adaptador de identidad local | HIGH | tarea 3; RNF-013 | UID verificado, filas de usuario/roles/profesional | cuenta pública, permisos actuales, estado y versión | esquemas y SQL parametrizado | mapper real en ambos motores | PASS para modelos actuales |
| U10 | `responderErrorHttp` / filtro HTTP | Adaptador de entrada | MEDIUM | error seguro de persistencia | error de dominio | 503 genérico sin detalle interno | catálogo de errores | `runtime/http.test.ts` | PASS |
| U11 | `run-sql-uow-integration.mjs` | Harness de integración | HIGH | RNF-017/037 | Docker y puertos libres | crea y borra solo proyecto efímero | Docker/compose | ejecución real | PASS; cleanup comprobado |
| U12 | pruebas de configuración, adquisición, transacción y fixtures | Tests | HIGH | RNF-013/016/018/021/037 | datos sintéticos | solo test | Node, Docker, PG, MySQL | `npm test`, integración | PASS |
| U13 | UoW conectada al bundle/runtime y preflight de manifiesto | Composición/arranque | HIGH | tarea 4; CA19 | manifests/estado de DB | habilitaría persistencia | composición aún no integrada | readiness actual declara `NO_CONFIGURADA` | NOT_IMPLEMENTED aquí; permanece apagado |
| U14 | flujo clínico completo CA05 | Aplicación y agregado institucional | CRITICAL | CA05 | comando clínico y relaciones | consulta+diagnóstico+tratamiento+receta | casos de uso y cuatro adaptadores | no hay writer clínico en este ID | NOT_IMPLEMENTED en esta tarea |

**Cobertura:** 8/8 grupos implementados de esta tarea tienen traza; el preflight de runtime y CA05 completo quedan fuera de lo que está habilitado y no se acreditan como completados.

## 3. Matriz de trazabilidad requisito → código → test

| Requisito | Fuente | Unidad(es) que lo implementan | Test(s) | Estado |
|---|---|---|---|---|
| R01. Conectar PG/MySQL con usuario de aplicación, secreto por archivo, cierre y timeouts | `02_P2.md`, trabajo 1; RNF-012/013 | U01–U04 | configuración SQL; timeout de adquisición directa y transaccional; integración de ambos motores | CUBIERTO |
| R02. Datos, revisión, auditoría y operación confirman/revierten juntos; revisión precede cambios protegidos | RNF-016/018; `02_P2.md`, trabajo 2; triggers SQL | U05/U07 | rollback tardío sin residuos; el writer observa la revisión previa en ambos motores | CUBIERTO para infraestructura SQL; CA05 clínico PARCIAL |
| R03. Clave estable, respuesta durable, reintento concurrente y commit incierto sin nueva clave | `02_P2.md`, recuperación; `03_CONTRATOS_Y_FLUJOS.md` | U05/U06 | misma clave concurrente, hash distinto; acuse perdido recupera durable tras liberar la única conexión | CUBIERTO para idempotencia y reconciliación |
| R04. Mapper de cuenta/roles/profesional oculta PK internos y toma estado local | `02_P2.md`, trabajo 3; arquitectura §RepositorioCuenta | U09 | alta sintética y lookup por UID en PG/MySQL; asserts de ID público/rol/permiso/estado/profesional | CUBIERTO para modelo existente |
| R05. Privilegios mínimos y credenciales administrativas separadas | RNF-013; `Database/docker/README.md` §Usuarios y permisos | U01/U03/U04/U07 | con cuenta real de app se rechaza DDL, lectura de manifiesto y DELETE auditoría; UoW mapea permiso y no deja operación | CUBIERTO para PG/MySQL local |
| R06. Deadlock reintenta el comando entero con límite | `02_P2.md`, trabajo 4/excepciones; arquitectura UoW | U05/U08 | dos transacciones reales con lock inverso por motor; al menos una segunda ejecución, ambas terminan | CUBIERTO para deadlock/lock wait probados |
| R07. FK/check/permisos y señales trigger se traducen sin residuos | `02_P2.md`, flujos de fallo; catálogo dominio; triggers MySQL | U05/U08 | FK → `REFERENCIA_INCOMPATIBLE`; check revierte; permiso → `SIN_PERMISO`; trigger MySQL real → `ESTADO_INVALIDO` | CUBIERTO para casos probados |
| R08. Verificar manifiesto/esquema antes de habilitar operaciones | `02_P2.md`, trabajo 4; CA19/RNF-037 | U13 | inicializador valida al arrancar DB; el runtime no consulta manifest y persiste `NO_CONFIGURADA` | PARCIAL: la aplicación todavía no está conectada y aún no existe preflight de composición |

Fuentes transversales: `Agente/REQUERIMIENTOS_NO_FUNCIONALES.md` RNF-013/015/016/018/021/037; `Agente/DISENO_PROYECTO.md` CA05/CA19; `plan/02_ARQUITECTURA_HEXAGONAL.md`; `plan/03_CONTRATOS_Y_FLUJOS.md`.

## 4. Desviaciones detectadas (solo skill funcional)

| ID | Unidad | Requisito | Tipo de desviación | Evidencia | Impacto |
|---|---|---|---|---|---|
| F-01 | `guardarAuditoria` | RNF-015 pide motivo cuando aplique | SUB_IMPLEMENTADO, corregido antes del commit | En la primera pasada se guardaba solo correlación. Se añadió `EventoAuditoria.motivo` opcional y se persiste en `detalle`; el test SQL lee correlación y motivo sintético en ambos motores. | Sin la corrección se perdería motivo requerido. Hallazgo cerrado y cubierto por regresión. |
| F-02 | consultas directas de pool PG/MySQL | Agotamiento del pool debe responder dentro del tiempo límite | SUB_IMPLEMENTADO, corregido antes del commit | Las primeras consultas directas llamaban `pool.query/execute` fuera de la cola limitada. Ahora adquieren mediante el mismo limitador; tests de conexión tardía confirman timeout y liberación en ambos drivers. | Sin el cambio, lookup de cuenta podía esperar sin límite. Hallazgo cerrado y cubierto por regresión. |
| F-03 | `ejecutarIntento` / reconciliación | Liberar conexión antes de reconciliar commit incierto | SUB_IMPLEMENTADO, corregido tras revisión PR #28 | El pool de una conexión podía quedar retenido hasta `finally`; se libera una vez antes del lookup durable. Test de acuse perdido recupera resultado. | Podía responder 503 a una operación ya confirmada. Hallazgo Codex P2 cerrado. |
| F-04 | `traducirErrorSql` | Mapear errores `SIGNAL` MySQL como conflicto de dominio | SUB_IMPLEMENTADO, corregido tras revisión PR #28 | `ER_SIGNAL_EXCEPTION`/45000 ahora se traduce a `ESTADO_INVALIDO`; integración invoca trigger odontológico real y no deja consulta/operación. | El rechazo de negocio se informaba como 503. Hallazgo Codex P2 cerrado. |
| F-05 | `ejecutarIntento` al fallar COMMIT | Conservar errores SQL definitivos y reconciliar solo acuses ambiguos | SUB_IMPLEMENTADO, corregido tras revisión PR #28 | Una constraint `23514` de COMMIT llega al traductor; test de error de conexión separado conserva recuperación durable. | Antes un rechazo definitivo se informaba como 503. Hallazgo Codex P2 cerrado. |
| F-06 | orden revisión/cambio | Disponibilidad de revisión previa ante triggers históricos | DIVERGENTE, corregido tras revisión PR #28 | Se guardan revisiones antes de `aplicarCambios` en la misma transacción; integración observa la revisión desde el writer antes del update. | Correcciones históricas válidas podían rechazarse. Hallazgo Codex P2 cerrado. |
| F-07 | U13 runtime/preflight | Comprobar manifiesto antes de habilitar operación | NOT_IMPLEMENTED/PARCIAL, aún abierto | `/health/ready` sigue en `NO_CONFIGURADA`; las cuentas app no pueden leer `modelo_database` por RNF-013. No hay composición que verifique un estado de preflight. | No habilitar persistencia hasta que composición o verificador previo al arranque implemente comprobación segura de versión/huella. |

No se cambiaron inicializadores ni esquemas; por eso este cambio no requiere migración de volumen. Si una implementación posterior modifica esos inicializadores, se debe agregar migración explícita, reconciliación del manifiesto y pruebas de instalación nueva/existente.

## 5. Hallazgos confirmados

- **F-01 — Motivo de auditoría se descartaba (corregido).** `EventoAuditoria` no exponía motivo y `guardarAuditoria` guardaba solo correlación. Se agregó `motivo?: string`, se conserva en el JSON de detalle y la prueba real valida ambos valores. Regresión: `tests/integracion/sql-uow.test.ts`, test parametrizado por PG/MySQL. Severidad previa: MEDIUM. Estado actual: PASS.
- **F-02 — Consultas directas no compartían el límite de adquisición (corregido).** El lookup de cuenta usaba el pool del driver fuera de `crearAdquiridorLimitado`. Ahora toda consulta adquiere/libera con la cola y timeout acotados. Dos regresiones unitarias fuerzan conexión tardía y confirman timeout más liberación en PostgreSQL y MySQL. Severidad previa: HIGH por espera no acotada. Estado actual: PASS.
- **F-03 a F-06 — Revisión de Codex PR #28 (corregidos).** Se libera la conexión antes de reconciliar, se mantienen los errores definitivos de `COMMIT`, las señales MySQL se mapean a 409 y las revisiones se insertan antes de cambios protegidos. Regresiones unitarias y un trigger odontológico real verifican los casos. Estado actual: PASS local, pendiente nueva revisión automática.
- **F-07 — Preflight de manifiesto aún no conectado.** No es una operación expuesta hoy: los bundles mantienen `NO_CONFIGURADA`. La app no puede leer `modelo_database` porque las reglas de privilegios lo prohíben. La composición que habilite persistencia debe recibir un preflight de versión y huella por vía administrativa segregada, sin entregar credenciales de migración al pool runtime. Severidad: HIGH si se habilita persistencia sin ese gate; estado actual: NOT_IMPLEMENTED y no habilitado.

Revisión dirigida de seguridad: consultas del repositorio usan parámetros; el actor/ID interno proviene del lookup por UUID público + UID + institución + estado `ACTIVO`, bloqueado `FOR SHARE`; configuración fija usuario/base de app; secretos se leen desde archivo y no se exponen por errores HTTP. La integración confirma DDL y borrado de auditoría rechazados. No se auditó ni probó un despliegue remoto/TLS ni una sesión real de Firebase.

## 6. Pruebas añadidas / propuestas

| Archivo | Test ID | Objetivo | Resultado esperado | Prioridad |
|---|---|---|---|---|
| `Backend/tests/unitarios/conexiones-sql.test.ts` | SQL-CONFIG-01 | Fijar usuario/base de app, rechazar admin/override/puerto inválido y ocultar valores | PASS | HIGH |
| `Backend/tests/unitarios/adquirir-con-limite.test.ts` | SQL-POOL-01 | Timeout de conexiones tardías para limitador y consultas directas de ambos drivers | PASS | HIGH |
| `Backend/tests/unitarios/unidad-de-trabajo-sql.test.ts` | SQL-UOW-COMMIT-01 | Reconciliar ack perdido tras liberar conexión; preservar constraint definitivo; traducir señal MySQL | PASS | HIGH |
| `Backend/tests/integracion/sql-uow.test.ts` | SQL-UOW-PG / SQL-UOW-MYSQL | Mapper, rollback tardío, orden de revisión, escritura atómica, repetición/concurrencia, auditoría, permisos, FK, trigger y deadlock real | PASS en ambos motores; trigger real MySQL | CRITICAL |
| `Backend/tests/runtime/http.test.ts` | HTTP-PERSISTENCIA-503 | Fallo de persistencia produce 503 genérico sin mensaje interno | PASS | MEDIUM |
| composición por implementar | SQL-PREFLIGHT-01 | Instalar esquema limpio, esquema anterior y deriva; bloquear readiness ante manifiesto faltante/diferente | NOT_IMPLEMENTED en esta tarea | HIGH |

Ejecuciones finales tras las correcciones: `npm test` PASS (61 runtime/unit + 32 contrato); `npm run lint` PASS; `npm run build` PASS; `npm run test:integration:sql` PASS (PostgreSQL y MySQL, 2/2). El harness creó proyecto Docker aleatorio y borró volúmenes/secretos temporales al terminar.

## 7. Bloqueos

| Bloqueo | Dependencia exacta | Acción para desbloquear |
|---|---|---|
| Preflight de manifiesto en runtime | Composición/arranque que conecta las UoW, pendiente de la tarea E01-P1-03; `modelo_database` es deliberadamente invisible a usuarios de aplicación | Implementar gate administrativo segregado antes de ready/operaciones, probar huella y versión sin otorgar SELECT al usuario app; no habilitar persistencia antes |
| Flujo clínico CA05 end-to-end | Repositorios clínicos y casos de uso institucionales aún no implementados | Probar en las tareas clínicas cuando existan; esta UoW solo demuestra atomicidad con escritura sintética |

## 8. Matriz final de resultados

| ID | Unidad | Categoría | Resultado | Evidencia |
|---|---|---|---|---|
| T01 | Pools y adquisición | Conexión/timeout/secreto | PASS | tests unitarios + integración real |
| T02 | Unidad de trabajo | Atomicidad/rollback/orden de revisión | PASS | failure injection después de guardar dato/revisión; writer observa revisión previa en PG/MySQL |
| T03 | Unidad de trabajo | Idempotencia/concurrencia/commit incierto | PASS | misma clave concurrente; hash distinto; ack perdido con recuperación tras liberar conexión |
| T04 | Unidad de trabajo | Deadlock/reintento | PASS | deadlock inducido con conexiones reales, ambos motores |
| T05 | Cuenta local | UID/estado/rol/permisos/profesional | PASS | consulta real a cuenta sintética en PG/MySQL; PK interno no retorna |
| T06 | Cuenta de aplicación | Privilegios mínimos | PASS | DDL y DELETE de auditoría rechazados; operación/recurso preservado |
| T07 | Errores SQL | FK/check/permiso/SIGNAL | PASS | códigos esperados; trigger MySQL real da 409 y no deja residuos |
| T08 | Auditoría | Correlación/motivo/UTC atómicos | PASS | detalle JSON observado en ambos motores |
| T09 | Preflight manifest/runtime | Esquema previo a habilitar | NOT_IMPLEMENTED | persistencia sigue `NO_CONFIGURADA`; no hay gate de composición |
| T10 | CA05 | Flujo clínico completo | NOT_IMPLEMENTED | no existen los writers/casos de uso clínicos en esta tarea |
| T11 | Instalación limpia para el harness | RNF-037/CA19 parcial | PASS | Compose efímero inicia los esquemas de ambos motores |

## 9. Riesgos residuales

- La verificación de manifiesto debe preceder la habilitación en la tarea de composición; los pools de esta entrega no autorizan operaciones por sí solos.
- El test prueba infraestructura con `rol` sintético; no demuestra writers clínicos, reglas entre entidades ni el flujo CA05 completo.
- El commit incierto se probó con acuse perdido y pool de una conexión simulados; no se cortó una conexión de red real durante `COMMIT`.
- Pruebas de motores usan Docker local; no acreditan TLS, IAM ni configuración de despliegue remoto.
