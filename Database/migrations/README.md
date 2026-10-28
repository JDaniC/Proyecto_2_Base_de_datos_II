# Migraciones SQL explícitas (`Database/migrations`)

Los inicializadores de motor (`Database/hospital_general_postgresql.sql` y `Database/clinica_odontologica_mysql.sql`) no migran automáticamente volúmenes previamente inicializados ni sobrescriben deriva de esquema (`RNF-037`). Cuando cambia una función, trigger o estructura después de la inicialización, se aplica una migración explícita con usuario administrativo.

## `001_corregir_archivo_historiales_postgresql.sql` (`v2` $\rightarrow$ `v3`, `E00-P1-02`)

### Propósito

Corregir el hallazgo `A-F01` en `hospital_general.validar_relaciones_clinicas()` sin relajar pertenencia, relaciones inmutables, estados ni el rechazo de nuevas consultas sobre historiales archivados (`RF-008`, `RF-013`, `RNF-024`, `RNF-037`, `CA08`):

- `INSERT` en `consulta`: sigue exigiendo `historial_clinico.estado_historial = 'ACTIVO'` (`HISTORIAL_INACTIVO`).
- `UPDATE` en `consulta`:
  - Impide reasignar `id_historial`, `id_cita`, `id_personal_atendio` o `id_publico` (`RELACION_CLINICA_INMUTABLE`).
  - Si la consulta estaba `FINALIZADA`, exige mantener `estado = 'FINALIZADA'`, incrementar `revision = OLD.revision + 1` y haber registrado la versión previa en `revisiones` con `tipo_recurso = 'consulta'`, `recurso_id = OLD.id_publico`, `version = OLD.revision` y `contenido_anterior = to_jsonb(OLD)` (`CORRECCION_CONSULTA_REQUIERE_REVISION`).
  - Si el historial está `ARCHIVADO` y la consulta estaba `ABIERTA`, únicamente permite finalizar la atención iniciada antes del archivo (`NEW.estado = 'FINALIZADA'`); cualquier otra mutación que mantenga `ABIERTA` es rechazada con `HISTORIAL_INACTIVO`.
- Actualiza `hospital_general.modelo_database` (`id = 1`) a `version = 3` y recalcula `huella = pg_temp.huella_hospital()`, dejando el manifiesto idéntico al de una instalación limpia `v3`.

### Precondiciones

1. Esquema `hospital_general` previamente inicializado con `hospital_general.modelo_database` en `version = 2` (o `version = 3` para reejecución idempotente).
2. Sin deriva de esquema: `modelo_database.huella` debe coincidir exactamente con `pg_temp.huella_hospital()` antes de aplicar el cambio. Si existe deriva (`ALTER TABLE`, función alterada fuera de manifiesto o triggers deshabilitados), la migración aborta con `MODELO_INCOMPATIBLE_REQUIERE_MIGRACION`. Si la versión en `modelo_database` no es `2` ni `3`, aborta con `VERSION_MODELO_DESCONOCIDA`.
3. Ejecutar con la cuenta administrativa (`postgres_admin` en Docker o superusuario del clúster temporal), nunca con `hospital_app` (que carece de DDL y de permisos sobre `modelo_database`).

### Respaldo previo recomendado

Antes de aplicar en un volumen persistente de desarrollo (`Database/docker`):

```sh
docker compose --env-file Database/docker/.env -f Database/docker/docker-compose.yml exec -T postgres \
  pg_dump -U postgres_admin -d hospital_general --format=custom \
  > .test-results/respaldo_hospital_general_pre_001.dump
```

### Aplicación

En contenedor Docker local:

```sh
docker compose --env-file Database/docker/.env -f Database/docker/docker-compose.yml exec -T postgres \
  psql -X -v ON_ERROR_STOP=1 -U postgres_admin -d hospital_general \
  < Database/migrations/001_corregir_archivo_historiales_postgresql.sql
```

En clúster PostgreSQL nativo:

```sh
psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PGPORT" -d "$PGDATABASE" \
  -f Database/migrations/001_corregir_archivo_historiales_postgresql.sql
```

### Reversión de código sin borrar datos (`v3` $\rightarrow$ `v2`)

Toda la migración se ejecuta en una única transacción (`BEGIN; ... COMMIT;`). Si cualquier verificación falla durante la ejecución, PostgreSQL revierte la transacción completa sin mutar objetos ni datos.

Si se requiere revertir la función y el manifiesto de `v3` a `v2` después de haber confirmado la migración, sin eliminar tablas, volúmenes ni registros clínicos, de auditoría o de revisiones:

```sh
psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PGPORT" -d "$PGDATABASE" \
  -f Database/migrations/001_revertir_archivo_historiales_postgresql.sql
```

Si se requiere restaurar una copia aislada desde el respaldo lógico:

```sh
pg_restore --clean --if-exists -U postgres_admin -d hospital_general \
  .test-results/respaldo_hospital_general_pre_001.dump
```

## `002_agregar_demografia_paciente_mysql.sql` (`v2` $\rightarrow$ `v3`, `E02-P1-02`)

### Propósito

Incorporar la persistencia de datos demográficos completos (`sexo`, `direccion`) y la marca temporal de alta con microsegundos (`fecha_registro DATETIME(6)`) en la tabla `paciente` de `clinica_odontologica`:

- No destructiva: preserva todas las filas previas, historiales, citas y auditoría.
- Al migrar a `v3`, restaura automáticamente datos demográficos y marcas temporales respaldadas en la tabla `revisiones` si la base proviene de una reversión previa.
- Recalcula la huella limpia mediante `_huella_modelo(@bdii_huella)` tras eliminar los procedimientos temporales de migración, igualando exactamente el manifiesto de una instalación limpia `v3`.

### Reversión y preservación sin pérdida (`002_revertir_demografia_paciente_mysql.sql`)

- Antes de retirar las columnas `sexo`, `direccion` y `fecha_registro`, la reversión respalda de forma atómica en la tabla `revisiones` (`tipo_recurso = 'paciente_demografia_v3'`) los valores demográficos y marcas temporales de todos los pacientes afectados.
- Elimina los procedimientos temporales antes de llamar a `_huella_modelo`, dejando el manifiesto (`version = 2`) y la huella idénticos al inicializador canónico `v2`.
- Al volver a aplicar la migración `002`, los datos respaldados se restauran sin pérdida de información clínica ni temporal.

## `002_backfill_identidades_hospital_postgresql.sql` (`E02-P1-02`)

### Propósito

Incorporar la persistencia de la clave de identidad activa (`clave_identidad_activa CHAR(64)`) y el identificador de contacto de emergencia activo (`id_contacto_emergencia_activo BIGINT`) en la tabla `paciente` de `hospital_general`:

- No destructiva e idempotente: preserva todas las filas previas de pacientes, citas, historiales y auditoría.
- Realiza el backfill automático de identidades en `identidades_paciente` para pacientes existentes que cuenten con `cui` válido de 13 dígitos y vincula `clave_identidad_activa`.
- Vincula `id_contacto_emergencia_activo` con el primer contacto de emergencia registrado para pacientes existentes.
- Recalcula la huella limpia mediante `pg_temp.huella_hospital()` y actualiza el manifiesto en `modelo_database`, garantizando compatibilidad exacta con el inicializador canónico `Database/hospital_general_postgresql.sql`.
