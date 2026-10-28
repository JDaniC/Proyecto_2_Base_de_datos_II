# Migraciones explícitas (`Database/migrations`)

## MongoDB: 003, búsqueda e identidades de pacientes (E02-P2-01)

`003_pacientes_busqueda_mongodb.js` agrega al validador estricto las claves derivadas opcionales `claves_nombre` y `numero_busqueda`, dos índices y el backfill de reservas canónicas. Conserva UUID, revisiones, código, nombres originales, fechas, contactos secundarios, cabecera y campos institucionales. El inicializador nuevo incluye la extensión; no migra volúmenes existentes. No hay manifiesto MongoDB independiente: la compatibilidad se comprueba con el validador/índices del inicializador y el preflight del bundle.

Detener escritores y obtener un respaldo administrativo antes de migrar una base existente. Usar la cuenta administrativa, nunca conceder `collMod` a la aplicación. En el montaje Docker local (credenciales en archivos; no imprimir valores):

```sh
docker compose cp Database/migrations/003_pacientes_busqueda_mongodb.js mongodb:/tmp/003-pacientes.js
docker compose exec -T mongodb mongosh --norc --quiet --eval 'const fs=require("node:fs"); db.getSiblingDB("admin").auth("mongo_admin",fs.readFileSync("/run/secrets/mongo_admin_password","utf8").trim()); load("/tmp/003-pacientes.js");'
```

El preflight rechaza identidades normalizadas duplicadas, reservas incompatibles e índices con clave incorrecta. Después de `collMod` aplica claves/reservas en una transacción: un fallo revierte todo ese backfill. Reejecutar permite recuperar la etapa aditiva y completar índices sin duplicar reservas. La prueba aislada provoca un fallo tardío, retira solo su índice de fallo y demuestra recuperación. Un error no autoriza borrar pacientes, colecciones ni volúmenes.

La reversión conserva la extensión y los datos; usar mantenimiento/una copia aislada si una versión antigua rechaza el validador ampliado. No eliminar campos para forzar la aceptación del inicializador anterior. Prueba reproducible nueva/existente: `npm --prefix Backend run test:integration:pacientes:mongodb`.

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
