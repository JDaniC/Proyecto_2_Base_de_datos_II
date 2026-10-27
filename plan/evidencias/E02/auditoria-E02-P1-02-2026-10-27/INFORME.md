# Informe de Auditoría Funcional: Persistencia de Pacientes en PostgreSQL y MySQL (E02-P1-02)

Fecha: 27/10/2026
Alcance: `Backend/src/adaptadores/salida/postgresql/pacientes/`, `Backend/src/adaptadores/salida/mysql/pacientes/`, `Backend/src/adaptadores/salida/sql/`, `Database/`
Responsable: JDaniC

## 1. Resumen Ejecutivo
Se auditó la implementación de los adaptadores de salida para la persistencia del agregado Paciente en los motores relacionales PostgreSQL (`hospital_general`) y MySQL (`clinica_odontologica`).
Se verificó la trazabilidad completa desde los modelos relacionales y contratos del proyecto (`plan/03_CONTRATOS_Y_FLUJOS.md`, `plan/01_ALCANCE_Y_DECISIONES.md`, esquemas DDL v3/v2) hasta los adaptadores y pruebas de integración sobre contenedores Docker reales.

Estado global: **PASS** (100% de requisitos cubiertos con pruebas automatizadas verificables).

## 2. Requisitos y Criterios de Aceptación Verificados
1. **Hospital General (PostgreSQL):**
   - Alta atómica de paciente: `paciente`, `contacto_emergencia`, `historial_clinico` (`numero_historial` = `codigoLegible`) y reserva en `identidades_paciente`.
   - Normalización y preservación de nombres: división segura de nombres largos sin truncamiento de palabras, y preservación íntegra de componentes de nombre existentes en actualizaciones que no modifican el nombre.
   - Consulta por ID (`porId`) y por versión histórica (`porVersion`) desde `revisiones`.
   - Titularidad de identidad (`titularIdentidad`): cubre tanto identidades reservadas en `identidades_paciente` como CUIs preexistentes en `paciente.cui`.
   - Búsqueda (`buscar`): por CUI exacto, por clave SHA-256 de identidad y por prefijo de nombre insensible a diacríticos mediante `translate(LOWER(...), ...)`.
   - Desduplicación determinista de contactos de emergencia (`DISTINCT ON (id_paciente)`) para evitar duplicación de filas en páginas y cursores.
   - Paginación determinista por cursor opaco autenticado con HMAC y preservando microsegundos con `TO_CHAR(..., '...US"Z"')` y `$param::timestamp`.
   - Escape de caracteres comodín (`%`, `_`) mediante `escaparLikeSql` y `ESCAPE '\\'`.
   - Control de concurrencia optimista (`revision`): rechaza modificaciones concurrentes o desactualizadas con `VERSION_DESACTUALIZADA`.
   - Archivo clínico: valida `versionAnterior` del paciente bajo bloqueo pesimista, avanza la versión compartida del paciente de forma atómica y actualiza `historial_clinico.estado_historial = 'ARCHIVADO'` con auditoría.

2. **Clínica Odontológica (MySQL):**
   - Persistencia completa de demografía: almacena y recupera `sexo`, `direccion` y la marca temporal real de registro (`fecha_registro DATETIME(6)`) en la tabla `paciente` (DDL v3 con migración explícita 002).
   - Preservación del instante de registro: almacena la fecha/hora UTC con microsegundos (no medianoche), empleándola de forma consistente en lecturas y paginación determinista.
   - Regla de identificación opcional (overlay dental): permite alta sin documento de identificación sin insertar claves vacías ni nulas en `identidades_paciente`.
   - Alta con pasaporte: reserva clave SHA-256 en `identidades_paciente`.
   - Prevención de duplicados: rechaza conflicto de pasaporte duplicado con `PACIENTE_DUPLICADO`.
   - Búsqueda por prefijo con collation `utf8mb4_0900_ai_ci` y escape de comodines mediante `ESCAPE '\\\\'`.
   - Control de concurrencia optimista y avance atómico de versión de paciente en archivo dental.
   - Archivo dental: actualiza `historial_clinico.estado = 'ARCHIVADO'` y `paciente.estado = 'INACTIVO'`, validando y avanzando `revision`.

3. **Garantías Transaccionales y de Unidad de Trabajo (UoW SQL):**
   - Transacción atómica por comando con aislamiento serializable/snapshot según motor.
   - Idempotencia durable: repetición idéntica devuelve la respuesta original conservando `correlacionOriginal`.
   - Detección de clave reutilizada con carga útil distinta arrojando `CLAVE_REUTILIZADA`.
   - Eventos de auditoría persistidos en tabla `auditoria` y consultables mediante `crearConsultaHistorialSql`.

## 3. Resoluciones de Hallazgos de Revisión Automatizada (Codex)
1. **Huella de esquema tras eliminación de rutinas temporales de migración:**
   - En las migraciones de MySQL (`002_agregar_demografia_paciente_mysql.sql` y `002_revertir_...`), se eliminan los procedimientos `_migrar_v2_a_v3` y `_revertir_...` ANTES de invocar `_huella_modelo(@bdii_huella)`, asegurando que la huella guardada concuerde con el esquema limpio del inicializador v3.
2. **Desduplicación de contactos de emergencia en PostgreSQL:**
   - Se aplicó subconsulta `DISTINCT ON (id_paciente)` sobre `contacto_emergencia` e `identidades_paciente` en `SELECT_PACIENTE_BASE`, impidiendo que pacientes con múltiples contactos o identidades generen filas duplicadas o páginas infladas.
3. **Persistencia del instante de registro dental en MySQL:**
   - Se añadió `fecha_registro DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` a `paciente` en MySQL (DDL v3 y migración 002), formateando en ISO UTC con microsegundos en mapper y ordenando/paginando sobre `p.fecha_registro`.
4. **Validación y avance atómico de versión compartida en archivo:**
   - Tanto en PostgreSQL como en MySQL, el comando de archivo valida `versionAnterior` bajo `SELECT ... FOR UPDATE` sobre la tabla `paciente` y avanza `paciente.revision = revision + 1` concurrentemente con la actualización del historial clínico.
5. **Preservación de componentes de nombre en actualizaciones no relacionadas:**
   - `dividirNombre` realiza una división no destructiva respetando palabras y, en actualizaciones `MODIFICAR`/`ACTUALIZAR`, compara el nombre combinado existente; si no ha cambiado, preserva exactamente los valores almacenados en `primer_nombre` y `segundo_nombre`.
6. **Inclusión de CUIs preexistentes en comprobaciones de titularidad:**
   - `titularIdentidad` consulta tanto `identidades_paciente.clave` como `paciente.cui` (normalizado numéricamente). Asimismo, se incorporó backfill de CUIs en el inicializador de `hospital_general` y la migración `002_backfill_identidades_hospital_postgresql.sql`.
7. **Preservación de fecha de nacimiento desconocida (NULL) en mappers y actualizadores:**
   - Mappers de PostgreSQL y MySQL no asignan fecha de presentación por defecto (`1900-01-01`) cuando `fecha_nacimiento` es NULL en la base de datos; la exponen como opcional/indefinida y los actualizadores persisten `NULL`, preservando datos clínicos legados.
8. **Preservación de contactos de emergencia adicionales en actualizaciones:**
   - Al actualizar un paciente en PostgreSQL, no se eliminan todos los contactos de emergencia (`DELETE WHERE id_paciente`). Se actualiza o inserta únicamente el contacto seleccionado si hubo cambios en él, conservando intactos todos los demás registros de contacto.
9. **Persistencia explícita del instante de registro hospitalario:**
   - El adaptador PostgreSQL persiste explícitamente `pac.fechaRegistro` en el INSERT de `paciente` (columna `fecha_registro`), garantizando coincidencia exacta entre el instante registrado en el comando y las posteriores lecturas.
10. **Búsqueda en límites de palabra y normalización exhaustiva de diacríticos:**
    - Se adaptaron los predicados de búsqueda en PostgreSQL y MySQL para coincidir por prefijo en límites de palabra (`LIKE prefix || '%' OR LIKE '% ' || prefix || '%'`), permitiendo buscar por segundos nombres o apellidos (p. ej. `Adol`) mientras se rechazan coincidencias infijas (p. ej. `dolfo`).
    - En PostgreSQL, se implementó normalización exhaustiva de caracteres latinos (`translate(LOWER(...), ...)`) que incluye diacríticos completos (`ç`, `à`, etc.), alineándola con `normalizarNombreBusqueda`.

## 4. Matriz de Resultados
| Caso / Suite | Tipo | Motor | Estado |
|---|---|---|---|
| PostgreSQL: persistencia, búsqueda, concurrencia, archivo, microsegundos, CUI legacy, multi-contacto | Integración | PostgreSQL 18.6 | PASS |
| MySQL: persistencia, demografía, fecha_registro, sin doc, concurrencia, archivo | Integración | MySQL 8.4.6 | PASS |
| PostgreSQL: mapper, UoW, repetición idempotente | Integración | PostgreSQL 18.6 | PASS |
| MySQL: mapper, UoW, repetición idempotente | Integración | MySQL 8.4.6 | PASS |
| Suite unitaria y runtime (228 tests) | Unitario / Runtime | En memoria / HTTP | PASS |
| Linter y verificación de arquitectura hexagonal | Estático | TypeScript / AST | PASS |
