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
   - Paginación determinista por cursor opaco (`cursor-paginacion-sql.ts`).
   - Control de concurrencia optimista (`revision`): rechaza modificaciones concurrentes o desactualizadas con `VERSION_DESACTUALIZADA`.
   - Archivo clínico: actualiza `historial_clinico.estado_historial = 'ARCHIVADO'` con `causa_baja`, `motivo_baja`, `fecha_baja`, `actor_baja` y registro de auditoría.

2. **Clínica Odontológica (MySQL):**
   - Regla de identificación opcional (overlay dental): permite alta sin documento de identificación sin insertar claves vacías ni nulas en `identidades_paciente`.
   - Alta con pasaporte: reserva clave SHA-256 en `identidades_paciente`.
   - Prevención de duplicados: rechaza conflicto de pasaporte duplicado con `PACIENTE_DUPLICADO`.
   - Búsqueda por prefijo con collation `utf8mb4_0900_ai_ci`.
   - Control de concurrencia optimista con `SELECT ... FOR UPDATE` y validación de `revision`.
   - Archivo dental: actualiza `historial_clinico.estado = 'ARCHIVADO'` y `paciente.estado = 'INACTIVO'`.

3. **Garantías Transaccionales y de Unidad de Trabajo (UoW SQL):**
   - Transacción atómica por comando con aislamiento serializable/snapshot según motor.
   - Idempotencia durable: repetición idéntica devuelve la respuesta original conservando `correlacionOriginal`.
   - Detección de clave reutilizada con carga útil distinta arrojando `CLAVE_REUTILIZADA`.
   - Eventos de auditoría persistidos en tabla `auditoria` y consultables mediante `crearConsultaHistorialSql`.

## 3. Desviaciones Detectadas y Ajustes Realizados Durante la Auditoría
1. **Mapeo de BIGINT para `revision` en drivers de base de datos:**
   - *Hallazgo:* Drivers retornan `revision` como `string` numérico para columnas `BIGINT`, causando que `versionPositiva` arrojara `SOLICITUD_INVALIDA`.
   - *Ajuste:* Se incorporó helper `convertirNumero` en `mapear-paciente-postgresql.ts` y `mapear-paciente-mysql.ts`.
2. **Discriminación de tipo de cambio en `aplicar-cambios-*`:**
   - *Hallazgo:* `actualizar-paciente.ts` emite `tipo: 'ACTUALIZAR'` para modificaciones de paciente, mientras los adaptadores esperaban `'MODIFICAR'`.
   - *Ajuste:* Se actualizó la condición a `cambio.tipo === 'MODIFICAR' || cambio.tipo === 'ACTUALIZAR'`.
3. **Idempotencia de configuración de roles en pruebas de integración:**
   - *Hallazgo:* Colisión en índice único `rol_nombre_key` al ejecutar múltiples suites de prueba concurrentes contra la misma instancia.
   - *Ajuste:* Inserción con cláusula `ON CONFLICT (nombre) DO UPDATE` (PostgreSQL) y `ON DUPLICATE KEY UPDATE` (MySQL).

## 4. Matriz de Resultados
| Caso / Suite | Tipo | Motor | Estado |
|---|---|---|---|
| PostgreSQL: persistencia, búsqueda, concurrencia, archivo | Integración | PostgreSQL 18.6 | PASS |
| MySQL: persistencia, sin doc, concurrencia, archivo | Integración | MySQL 8.4.6 | PASS |
| PostgreSQL: mapper, UoW, repetición idempotente | Integración | PostgreSQL 18.6 | PASS |
| MySQL: mapper, UoW, repetición idempotente | Integración | MySQL 8.4.6 | PASS |
| Suite unitaria y runtime (228 tests) | Unitario / Runtime | En memoria / HTTP | PASS |
