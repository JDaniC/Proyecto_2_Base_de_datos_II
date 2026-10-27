# Informe de Auditoría Funcional: Persistencia de Pacientes en PostgreSQL y MySQL (E02-P1-02)

Fecha: 27/10/2026
Alcance: `Backend/src/adaptadores/salida/postgresql/pacientes/`, `Backend/src/adaptadores/salida/mysql/pacientes/`, `Backend/src/adaptadores/salida/sql/`
Responsable: JDaniC

## 1. Resumen Ejecutivo
Se auditó la implementación de los adaptadores de salida para la persistencia del agregado Paciente en los motores relacionales PostgreSQL (`hospital_general`) y MySQL (`clinica_odontologica`).
Se verificó la trazabilidad completa desde los modelos relacionales y contratos del proyecto (`plan/03_CONTRATOS_Y_FLUJOS.md`, `plan/01_ALCANCE_Y_DECISIONES.md`, esquemas DDL v3/v2) hasta los adaptadores y pruebas de integración sobre contenedores Docker reales.

Estado global: **PASS** (100% de requisitos cubiertos con pruebas automatizadas verificables).

## 2. Requisitos y Criterios de Aceptación Verificados
1. **Hospital General (PostgreSQL):**
   - Alta atómica de paciente: `paciente`, `contacto_emergencia`, `historial_clinico` (`numero_historial` = `codigoLegible`) y reserva en `identidades_paciente`.
   - Normalización de nombres: división segura de `nombres` y `apellidos` en `primer_nombre`, `segundo_nombre`, `primer_apellido`, `segundo_apellido` evitando errores de truncamiento por límite `VARCHAR(80)`.
   - Consulta por ID (`porId`) y por versión histórica (`porVersion`) desde `revisiones`.
   - Búsqueda (`buscar`): por CUI exacto, por clave SHA-256 de identidad y por prefijo de nombre insensible a diacríticos mediante `translate(LOWER(...), ...)`.
   - Paginación determinista por cursor opaco autenticado con HMAC y preservando microsegundos con `TO_CHAR(..., '...US"Z"')` y `$param::timestamp`.
   - Escape de caracteres comodín (`%`, `_`) mediante `escaparLikeSql` y `ESCAPE '\\'`.
   - Control de concurrencia optimista (`revision`): rechaza modificaciones concurrentes o desactualizadas con `VERSION_DESACTUALIZADA`.
   - Archivo clínico: actualiza `historial_clinico.estado_historial = 'ARCHIVADO'` con `causa_baja`, `motivo_baja`, `fecha_baja`, `actor_baja` y registro de auditoría.

2. **Clínica Odontológica (MySQL):**
   - Persistencia completa de demografía: almacena y recupera `sexo` y `direccion` en la tabla `paciente` (DDL v3 con migración explícita 002).
   - Regla de identificación opcional (overlay dental): permite alta sin documento de identificación sin insertar claves vacías ni nulas en `identidades_paciente`.
   - Alta con pasaporte: reserva clave SHA-256 en `identidades_paciente`.
   - Prevención de duplicados: rechaza conflicto de pasaporte duplicado con `PACIENTE_DUPLICADO`.
   - Búsqueda por prefijo con collation `utf8mb4_0900_ai_ci` y escape de comodines mediante `ESCAPE '\\\\'`.
   - Control de concurrencia optimista con `SELECT ... FOR UPDATE` y validación de `revision`.
   - Archivo dental: actualiza `historial_clinico.estado = 'ARCHIVADO'` y `paciente.estado = 'INACTIVO'`.

3. **Garantías Transaccionales y de Unidad de Trabajo (UoW SQL):**
   - Transacción atómica por comando con aislamiento serializable/snapshot según motor.
   - Idempotencia durable: repetición idéntica devuelve la respuesta original conservando `correlacionOriginal`.
   - Detección de clave reutilizada con carga útil distinta arrojando `CLAVE_REUTILIZADA`.
   - Eventos de auditoría persistidos en tabla `auditoria` y consultables mediante `crearConsultaHistorialSql`.

## 3. Resoluciones de Hallazgos de Revisión Automatizada (Codex)
1. **Demografía en MySQL (`sexo` y `direccion`):**
   - Se actualizó el esquema DDL a v3 (`Database/clinica_odontologica_mysql.sql`) agregando columnas `sexo` y `direccion`.
   - Se crearon las migraciones explícitas `002_agregar_demografia_paciente_mysql.sql` y `002_revertir_demografia_paciente_mysql.sql`.
   - Se mapearon y persistieron en `aplicarCambiosPacientesMysql`, `mapearFilaPacienteMysql` y `RepositorioPacientesMysql`.
2. **Precisión de microsegundos en cursores de PostgreSQL:**
   - Se reemplazó el formato `MS` (milisegundos) por `US` (microsegundos) en `TO_CHAR(..., 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`.
   - Se compara contra `$param::timestamp` directamente desde el texto ISO preservado en el cursor, evitando la pérdida de precisión de objetos `Date`.
3. **Autenticación y alcance estricto de cursores:**
   - Se dotó al cursor de firma criptográfica HMAC-SHA256 con payload vinculado a `recurso: 'pacientes'`, `institucion`, `q`, `orden` y `estado`.
   - Cursores alterados o reutilizados en otro contexto son rechazados inmediatamente con `400 SOLICITUD_INVALIDA`.
4. **Aislamiento de fixtures de prueba:**
   - Se aisló el rol de PostgreSQL en `pacientes-sql.test.ts` (`'SECRETARIA'`) para evitar colisiones con el rol `'MEDICO'` de `sql-uow.test.ts`.
   - Se añadió `--test-concurrency=1` al runner de integración para ejecución determinista y serializada.
5. **Escape de comodines SQL en búsquedas:**
   - Se implementó `escaparLikeSql(texto)` escapando `\`, `%` y `_`, aplicando cláusula `ESCAPE` en PostgreSQL y MySQL.

## 4. Matriz de Resultados
| Caso / Suite | Tipo | Motor | Estado |
|---|---|---|---|
| PostgreSQL: persistencia, búsqueda, concurrencia, archivo, microsegundos | Integración | PostgreSQL 18.6 | PASS |
| MySQL: persistencia, demografía, sin doc, concurrencia, archivo | Integración | MySQL 8.4.6 | PASS |
| PostgreSQL: mapper, UoW, repetición idempotente | Integración | PostgreSQL 18.6 | PASS |
| MySQL: mapper, UoW, repetición idempotente | Integración | MySQL 8.4.6 | PASS |
| Suite unitaria y runtime (228 tests) | Unitario / Runtime | En memoria / HTTP | PASS |
| Linter y verificación de arquitectura hexagonal | Estático | TypeScript / AST | PASS |
