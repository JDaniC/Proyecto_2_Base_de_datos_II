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

## Demostración integrada

La demostración conjunta de E01 se realizó sobre la base integrada indicada, empleando datos sintéticos y entornos aislados:

1. **Arranque y composición del servidor:**
   - Se ejecutó `npm --prefix Backend test` pasando 165/165 pruebas (133 unitarias/runtime y 32 contractuales).
   - El servidor arranca con prefijo `/api/v1`, OpenAPI v1 congelado (22 rutas, 26 operaciones), DTOs cerrados, filtro canónico de excepciones y composición en cuatro bundles institucionales inmutables sin dependencia cruzada ni singleton mutable.

2. **Resolución de identidad y autorización institucional:**
   - Se probó el ciclo de vida de sesión en las cuatro instituciones (`HOSPITAL_REGIONAL`, `CLINICA_DENTAL`, `LABORATORIO_CLINICO`, `CENTRO_MEDICO_PEDIATRICO` con alias UI `CENTRO_PEDIATRICO`).
   - El token Bearer es verificado vía Firebase Auth REST/Admin; la institución y permisos proceden estrictamente del token y cuenta local en base de datos.
   - Peticiones con token expirado, malformado o revocado responden `401`.
   - Claims discordantes con la cuenta local o intentos de inyectar institución/rol por el cliente responden `403`.

3. **Atomicidad y transacciones por motor (UoW):**
   - **PostgreSQL (`bdii-databases-postgres-1`):** SAVEPOINT y ROLLBACK transaccional; carreras de concurrencia y rechazo de escrituras parciales.
   - **MySQL (`bdii-databases-mysql-1`):** Transacciones InnoDB con confirmación determinista y reversión de transacciones ambiguas.
   - **MongoDB (`bdii-databases-mongodb-1`):** Sesión transaccional multi-documento con réplica set; operaciones y auditorías atómicas; reversión integral ante excepciones de negocio o duplicidad.
   - **Firestore (`demo-bdii-cierre`):** `runTransaction` determinista con lecturas obligatorias antes de escrituras; validación de tamaño (<256 KB) y canonización NFKC de claves únicas.

4. **Transporte HTTP y frontend conectado:**
   - Se ejecutó `npm --prefix Frontend test src/test/http/ src/test/product-scope src/services` pasando 66/66 pruebas (28 de transporte HTTP/sesión y 38 de alcance de producto).
   - Cliente HTTP inyecta automáticamente cabeceras `Authorization: Bearer <token>`, `X-Correlation-ID` e `Idempotency-Key` (UUID estable por intención).
   - Sanitización en el cliente elimina cualquier claim de autoridad (`actor`, `institucionId`, `rol`, `profesional`) de los cuerpos antes del envío (DEC07).
   - Fallos de red o persistencia no disponible se traducen limpiamente a `503 PERSISTENCIA_NO_DISPONIBLE` conservando los datos del formulario para reintento seguro.
   - Cero drivers de base de datos ni credenciales empaquetadas en el bundle de producción de Frontend (`npm run build` PASS).

5. **Scripts y herramientas del repositorio:**
   - 34/34 pruebas en Python de `cola.py`, `validar_pr.py` y `auto_merge.py` PASS.

## Resultados

| Criterio de salida E01 | Evidencia | Estado | Observación |
|---|---|---|---|
| Seis tareas terminadas e integradas | PR #22, #25, #28, #30, #32, #37; `origin/develop` `465cb89` | PASS | Confirmado en GitHub y por ancestría Git |
| API arranca y expone salud y contrato OpenAPI | 165 pruebas Backend PASS | PASS | `/api/v1` operativo; DTOs cerrados y catálogo de errores canónico |
| Autenticación institucional vía Bearer en cuatro bundles | Pruebas de autenticación y autorización HTTP | PASS | Derivación estricta desde token + cuenta local; no se confía en la UI |
| Unidades de trabajo con rollback atómico en 4 motores | Tests de integración y unitarios UoW PG, MySQL, Mongo, Firestore | PASS | Cero escrituras parciales ante fallo en ninguno de los 4 motores |
| Transporte HTTP y sesión en Frontend | 66 pruebas Frontend PASS; bundle audit limpio | PASS | Interfaz conectada a API real; no recurre a mocks en modo API |
| Cero secretos en Git ni logs | Auditoría de seguridad y sanitización | PASS | Cuentas y tokens de ensayo sintéticos; variables de entorno validadas |
| Revisión automática e integración del PR documental | PR #39 | PASS | Codex revisó sin hallazgos sobre el SHA actual |

## Entrega al siguiente responsable

- Backend fundacional con 4 adaptadores UoW listos para recibir repositorios de dominio.
- Frontend con cliente HTTP y autenticación integrados; `ServiceContext` preparado para sustitución progresiva de repositorios en E02–E05.
- Siguiente trabajo disponible: **E02-P1-01** (Crear casos comunes de pacientes e identidad), tras la integración de este cierre.

## Decisión

Los criterios de salida de E01 están satisfechos al 100%. Se formaliza el cierre de la fase E01 en el tablero, habilitando el inicio de la fase E02.
