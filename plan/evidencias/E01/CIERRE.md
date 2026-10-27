# Cierre de entrega interna E01 — Fundación hexagonal e identidad

- **Fase y objetivo:** E01 — API arranca, autentica cuatro cuentas institucionales y ejecuta rollback/UoW por motor.
- **Base integrada verificada:** `origin/develop` `465cb89`.
- **Fecha y participantes:** 26/10/2026, America/Guatemala · JDaniC.
- **Estado:** CERRADA.
- **PR de cierre:** [#39 — Cerrar fase E01](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/39), integrado en `develop`.
- **Revisión automática:** `contrato-pr` success; `revision-codex` success.
- **Auditoría funcional:** [informe, trazabilidad e inventarios](auditoria-cierre-2026-10-26/INFORME.md).

## Tareas y revisión

| Tarea | Estado | Integración | Evidencia |
|---|---|---|---|
| E01-P1-01 — Esqueleto backend y composición | HECHA | PR #22 (`6545dbe`), PR #23 (`755a2b3`) | [evidencia](E01-P1-01.md) |
| E01-P1-02 — Modelos de dominio y tipos de error | HECHA | PR #25 (`84967e0`), PR #26 (`497f317`) | [evidencia](E01-P1-02.md) |
| E01-P1-03 — Autenticación, autorización y enrutamiento | HECHA | PR #32 (`81946b1`), PR #35 (`753576c`), PR #36 (`dd116a7`) | [evidencia](E01-P1-03.md) |
| E01-P2-01 — Conexiones y UoW SQL (PostgreSQL / MySQL) | HECHA | PR #28 (`f7cb9f9`), PR #29 (`7155d6b`) | [evidencia](E01-P2-01.md) |
| E01-P2-02 — Unidades de trabajo NoSQL (MongoDB / Firestore) | HECHA | PR #30 (`377c249`), PR #31 (`7f70256`) | [evidencia](E01-P2-02.md) |
| E01-P2-03 — Transporte HTTP y sesión en Frontend | HECHA | PR #37 (`85397a4`), PR #38 (`465cb89`) | [evidencia](E01-P2-03.md) |

Se verificó en GitHub que los PR de las seis tareas están integrados (`MERGED`) hacia `develop` y que sus commits son ancestros de `465cb89`.

## Demostración integrada y distinción de entornos

En conformidad con AGENTS.md §Persistencia y verificación, se distinguen explícitamente las suites unitarias/simuladas de las pruebas de integración en motores reales ejecutadas sobre la base `465cb89`:

### 1. Pruebas de integración en motores reales (PostgreSQL, MySQL, MongoDB y emulador Firestore/Auth)

Se ejecutaron las suites de integración que interactúan con motores reales en localhost:

- **SQL (`npm --prefix Backend run test:integration:sql` — 2/2 PASS):**
  - **PostgreSQL:** Conexión a `127.0.0.1:15432` (`bdii-databases-postgres-1`). Valida mapper, atomicidad transaccional, confirmación con SAVEPOINT, reversión integral ante excepciones y recuperación del pool.
  - **MySQL:** Conexión a `127.0.0.1:13306` (`bdii-databases-mysql-1`). Valida InnoDB, atomicidad, descarte de conexiones ambiguas, rollback determinista y pool recuperado.
- **NoSQL (`npm --prefix Backend run test:integration:nosql` — 3/3 PASS):**
  - **MongoDB:** Conexión a replica set en contenedor aislado. Ejecuta transacción multi-documento con `ClientSession`, verifica inserción atómica de operación/auditoría y comprueba reversión completa ante fallo de negocio.
  - **Firestore (Emulador local `demo-bdii-pediatria`):** Valida `runTransaction`, lecturas obligatorias antes de escrituras, límite de tamaño (<256 KB) y rollback atómico sin mutaciones huérfanas.
  - **Firebase Auth Emulator:** Valida claims canónicos institucionales, verificación de revocación de token e invalidación de sesión en servidor.

### 2. Pruebas unitarias, runtime y contractuales (en memoria / mocks / jsdom)

- **Backend (`npm --prefix Backend test` — 165/165 PASS):**
  - 133 pruebas unitarias y de runtime (`Backend/tests/runtime/` y `Backend/tests/unitarios/`) que validan la composición de 4 bundles inmutables, parsing y validación de DTOs, filtro canónico de errores HTTP, resolución de sesión y valores compartidos de dominio.
  - 32 pruebas contractuales OpenAPI (`Backend/tests/contratos/`) que validan las 22 rutas, 26 operaciones y arnés CA01–CA20 en modo offline.
- **Frontend (`npm --prefix Frontend test src/test/http/ src/test/product-scope src/services` — 66/66 PASS):**
  - 28 pruebas de cliente HTTP y autenticación (`Frontend/src/test/http/`) con `fetch` mockeado, validando inyección de cabeceras (`Authorization: Bearer`, `X-Correlation-ID`, `Idempotency-Key`), sanitización de autoridad en cliente (DEC07), y manejo de errores 401/403/503.
  - 38 pruebas de alcance de producto y regresiones de formularios en jsdom.
- **Auditoría de bundle (`npm --prefix Frontend run build` — PASS):**
  - Compilación limpia sin dependencias de SDKs de base de datos ni credenciales filtradas.

### 3. Alcance y límites de la fase E01

- La fase E01 acredita la fundación hexagonal (UoW, transacciones por motor, transporte HTTP y autenticación institucional).
- **Límite explícito:** E01 no afirma persistencia completa de historias clínicas ni pacientes de extremo a extremo (UI→API→Motor). Las pantallas clínicas del frontend continúan protegidas por `requireApiAdapter` devolviendo `503 PERSISTENCIA_NO_DISPONIBLE` para prohibir el fallback silencioso a simuladores. Los repositorios reales de pacientes se implementan en la fase E02.

## Resultados

| Criterio de salida E01 | Evidencia | Estado | Observación |
|---|---|---|---|
| Seis tareas terminadas e integradas | PR #22, #25, #28, #30, #32, #37; `origin/develop` `465cb89` | PASS | Confirmado en GitHub y por ancestría Git |
| UoW y rollback atómico en motores reales | `test:integration:sql` (2/2) y `test:integration:nosql` (3/3) PASS | PASS | Verificado en PostgreSQL, MySQL, MongoDB replica set y Firestore emulator |
| Autenticación institucional vía Bearer | Pruebas de runtime y emulador Firebase Auth PASS | PASS | Derivación estricta desde token verificado + cuenta local; rechazo de 401/403 |
| Servidor y contrato OpenAPI | 165 pruebas Backend PASS | PASS | Prefijo `/api/v1` y composición en 4 bundles inmutables |
| Transporte HTTP en Frontend | 66 pruebas Frontend PASS; bundle build limpio | PASS | Cabeceras de correlación e idempotencia; 503 sin fallback a mocks |
| Cero secretos en Git ni logs | Auditoría de variables y código | PASS | Secretos sintéticos en entornos de prueba efímeros |
| Revisión automática de Codex | PR #39 | PASS | Codex revisó sin hallazgos el commit de cierre |

## Entrega al siguiente responsable

- Fundación hexagonal con 4 unidades de trabajo operativas y verificadas contra motores reales.
- Transporte HTTP en frontend listo para la inyección progresiva de repositorios en `ServiceContext`.
- Siguiente tarea disponible: **E02-P1-01** (Casos comunes de pacientes e identidad en Backend).

## Decisión

Criterios de salida de E01 cumplidos y verificados con distinción entre pruebas de integración en motores reales y pruebas unitarias/simuladas. Se formaliza el cierre de la fase E01.
