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
- Al migrar, restaura automáticamente los punteros de identidad activa y contacto de emergencia activo respaldados en `revisiones` (`tipo_recurso = 'paciente_punteros_v3'`) si la base proviene de una reversión previa, preservando tanto documentos asociados como estados explícitamente ausentes.
- Para pacientes sin respaldo previo, realiza el backfill de identidades normalizadas y selecciona la identidad más reciente y el primer contacto de emergencia registrado.
- Recalcula la huella limpia mediante `pg_temp.huella_hospital()` y actualiza el manifiesto en `modelo_database`, garantizando compatibilidad exacta con el inicializador canónico `Database/hospital_general_postgresql.sql`.

### Reversión y preservación sin pérdida (`002_revertir_backfill_identidades_hospital_postgresql.sql`)

- Antes de retirar las columnas `clave_identidad_activa` e `id_contacto_emergencia_activo`, la reversión respalda de forma atómica en la tabla `revisiones` (`tipo_recurso = 'paciente_punteros_v3'`) los punteros activos de todos los pacientes afectados (incluyendo estados explícitamente ausentes).
- Recalcula la huella limpia en el manifiesto `modelo_database` y garantiza que una posterior re-aplicación de `002_backfill_identidades_hospital_postgresql.sql` recupere todos los punteros sin pérdida de datos clínicos ni desvinculación de reservas de identidad.

## `004_historial_*` — extensión de lectura v1 (E02-P2-03)

Aplicar también en bases nuevas: los inicializadores M01–M04 no crean esta extensión. Los espacios `hospital_historial`, `clinica_historial`, `historial_eventos` y su manifiesto propio `version: 1` conservan los modelos y huellas originales. Requiere administración, respaldo y escritores detenidos. SQL: ejecutar el archivo correspondiente; documental: importar `004_historial_documental.mjs` e invocar la preparación correspondiente con el cliente administrativo del destino verificado. Desplegar también los dos índices `historial_eventos` de `Database/firebase/firestore.historial.indexes.json`, combinados con los índices base en la configuración de despliegue. El runner de integración muestra la unión sin modificar el manifiesto M04. No conceder DDL ni modificación del manifiesto al servidor clínico.

La extensión es una proyección transaccional de lectura: cada fila/documento contiene paciente UUID, tipo, fecha UTC canónica de nueve decimales, UUID de evento y `contenido` con el contrato cerrado `EventoHistorial`. La aplicación solo lee e inserta eventos; SQL no concede UPDATE/DELETE. E03/E04/E05 deben insertar el evento en la misma conexión/session/transaction que datos y snapshot versionado. Un evento de componente conserva su UUID propio y versión exacta de consulta; no se deriva de auditoría ni de la versión actual al consultar.

La migración no inventa fechas/autores/versiones de registros clínicos legados. Si encuentra consultas, órdenes, vacunas, hospitalizaciones o historiales archivados previos, registra `RECONCILIAR`; la lectura devuelve 503 hasta que el operador reconstruya todos sus eventos desde procedencia verificable y snapshots exactos. El operador conserva respaldo y originales, contrasta inventario por paciente/tipo/recurso, fechas y vínculos de versión, y solo entonces cambia el manifiesto a LISTO. Si falta procedencia verificable, conservar RECONCILIAR. El alta demográfica sin clínica no requiere backfill de eventos. El contrato AF03 exige esta puerta para legado sin versión.

Recuperación: SQL PostgreSQL revierte la migración completa ante fallo; MySQL/documentales usan cambios aditivos reejecutables. Reaplicar no modifica eventos ni reinicia un manifiesto existente (incluido RECONCILIAR). Revertir el servidor conserva la extensión; no borrar filas/documentos ni volúmenes. Para reparar índices o completar una interrupción, reaplicar la preparación con administración. Esta migración no habilita escritores clínicos E03 ni recursos especializados E04/E05 por sí misma.

### 005 — clínica MongoDB (E03-P2-01)

`005_clinica_mongodb.mjs` exporta `migrarClinicaMongodb(dbAdmin)` para un operador
con escritores detenidos y respaldo verificado. Ejecutar primero 004 y reconciliar
su legado. Los manifiestos `esquemas/005_consultas_mongodb_v1.json` y `v2.json`
fijan validadores e índices conocidos. Rechaza deriva y documentos incompatibles
antes de modificar estructura; conserva índices adicionales, UUID y documentos.
El inicializador nuevo entrega v2, pero no migra un volumen existente.

Añade signos vitales cerrados con fecha de toma, profesional histórico, metadatos
de diagnóstico/tratamiento y código/entidad de prescriptor de receta. No rellena
historia desde perfiles actuales. Legado sin procedencia queda RECONCILIAR.
La revisión usa el índice único existente `(tipo_recurso,recurso_id,version)`.

Si falla después de collMod, reejecutar: reconoce v1 o v2 y completa el manifiesto
id 5 en historial_modelo. El rollback de código nunca elimina campos nuevos:
conservar el respaldo posterior y modo mantenimiento, restaurar solo una copia
para diagnóstico. `npm run test:integration:clinica:mongodb` desde Backend prueba
instalación nueva/existente, recuperación y atomicidad en réplica aislada.

Aplicar 004 y 005 también en instalaciones nuevas antes de habilitar clínica.
Mientras id 5 esté MIGRANDO/RECONCILIAR o ausente, lecturas/comandos clínicos
responden 503; pacientes conserva su disponibilidad independiente. La marca
MIGRANDO se escribe solo después de terminar el preflight y antes de collMod.

## 006 · Clínica pediátrica Firestore (E03-P2-02)

`006_clinica_firestore.mjs` exporta `prepararClinicaFirestore(db)`. El operador
entrega un cliente administrativo al destino explícito, después de detener
escritores y realizar respaldo externo verificable. Ejecutar también en una
instalación nueva, después del inicializador M04 v2 y migración 004. No se
llama automáticamente desde el servidor ni desde el inicializador.

La versión anterior aceptada es M04 v1 con huella
`d5f341030fb4740264245a67dc39f04298b0e263f2b6ef28086f38f529562a29`;
la objetivo es el plan M04 v2 de `obtenerPlan()`. Otra huella falla cerrada.
La migración conserva copia íntegra del manifiesto y de cada consulta en
`clinica_migracion_006_respaldo`, avanza cursor por UUID en
`clinica_configuracion/modelo` y puede reanudarse tras interrupción.
Nunca sobrescribe el respaldo previo. No elimina consultas, componentes,
auditoría, operaciones, revisiones ni cuentas.

El backfill copia exclusivamente mediciones ya presentes en
`control_crecimiento` a `signos_vitales`, sin inventar fecha de toma. Conserva
el control original. El nuevo snapshot clínico cerrado conserva los metadatos
comunes, fechas, autorización y profesional históricos; las escrituras nuevas
crean también `consultas/{id}/snapshots_v1/{version}` por clave exacta.
No se reconstruye clínica histórica desde perfiles actuales. Una consulta
legada sin snapshot verificable deja la puerta `RECONCILIAR`; no se cambia
manualmente a LISTO para eludir esa condición.

Publicar los índices del archivo `firebase/firestore.indexes.json`, incluido
cita+estado de consultas. El emulador no acredita despliegue de índices ni IAM
remoto. El adaptador verifica versión/huella del manifiesto y estado LISTO de
004/006 en cada lectura clínica transaccional. La agenda serializa reservas
por pediatra con `agenda_revisiones/{id}`; conserva duración desconocida del
legado y bloquea nuevas reservas sobre intervalos indeterminados.

Recuperación: reejecutar la misma función con escritores detenidos. Conservar
los respaldos y documentos ampliados; una versión anterior que no soporte el
nuevo esquema requiere mantenimiento y restauración en copia aislada, nunca
borrado de campos/volúmenes. Evidencia nueva/existente/interrupción:
`npm run test:integration:clinica:firestore` en Backend.

## E03-P1-02 · Clínica SQL (modelo v4)

Aplicar `005_clinica_sql_postgresql.sql` en hospital_general y
`005_clinica_sql_mysql.sql` en clinica_odontologica con la cuenta administradora,
tanto después de preparar instalaciones nuevas como al actualizar el modelo v3.
La proyección de lectura 004 conserva su propio manifiesto y debe estar preparada.
Los inicializadores v4 rechazan volúmenes v3: no sustituyen la migración.

Respaldar el volumen antes de actualizar y detener escrituras durante el cambio.
PostgreSQL realiza el cambio en una transacción. MySQL confirma DDL por separado:
si se interrumpe, conservar el volumen y restaurar el respaldo previo antes de
reintentar; no borrar datos para recuperar compatibilidad. El legado sin autor o
profesional histórico verificable requiere reconciliación y se rechaza como
persistencia no disponible; no se inventan identidades ni fechas históricas.

## E03-P1-03 · Archivo y corrección SQL (modelo v5)

Después de 005 aplicar 007_correcciones_postgresql.sql / 007_correcciones_mysql.sql
con cuenta administradora y respaldo previo; las instalaciones nuevas ya
incluyen snapshot_actual. La migración 007 conserva tablas/filas/relaciones y
actualiza el manifiesto. PostgreSQL es transaccional; MySQL exige restaurar el
respaldo previo si un DDL se interrumpe antes de finalizar el manifiesto.
Los inicializadores v5 rechazan volúmenes v4; no sustituyen esta migración.

La lectura clínica corregida es el agregado versionado de consulta; los
componentes SQL emitidos originalmente son historia inmutable. Leer la versión
vigente por los puertos clínicos o snapshot_actual, nunca mezclarla con los
componentes iniciales. Detalle y justificación: DEC18 y
Backend/docs/COMPATIBILIDAD_PERSISTENCIA_V1.md.
