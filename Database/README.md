# Database — modelos e inicializadores

Modelos, inicializadores y validadores de las cuatro instituciones. PostgreSQL, MySQL y MongoDB tienen montaje local con Docker; Firestore se configura por separado. Las pruebas usan procesos nuevos y datos sintéticos.

## Motores y contenido

| Institución | Motor mínimo | Modelo final |
|---|---|---|
| Hospital | PostgreSQL 15+ y extensión `btree_gist` | 46 tablas de partida + identidades, operaciones, revisiones y manifiesto: **50 tablas**. |
| Odontología | MySQL 8.4+, InnoDB, utf8mb4 | 14 tablas de partida + usuarios, roles, asignaciones de rol, auditoría, identidades, operaciones, revisiones y manifiesto: **22 tablas**. |
| Laboratorio | MongoDB 8.0+, mongosh 2.x y replica set | **27 colecciones**, 63 índices secundarios y validación strict/error. |
| Pediatría | Firestore, Node 24.12+; Java 21+ para emular | **22 rutas**, diez índices compuestos, cuatro roles de configuración; acceso directo de clientes denegado. |

Versiones usadas al verificar: PostgreSQL 18.6, MySQL 8.4.6, MongoDB 8.0.32, mongosh 2.11.1, Node 24.22.0, Firebase CLI 15.33.0 y emulador Firestore 1.22.0. Las versiones mínimas SQL se fijan por las características utilizadas; no se ejecutó una matriz de todas las versiones intermedias.

El [diccionario SQL](DICCIONARIO_SQL.md) se generó desde las tablas realmente inicializadas, e incluye el resumen de relaciones y los defaults por columna.

## Inicialización

Desde la raíz del repositorio, en bases nuevas de desarrollo:

```sh
psql -X -v ON_ERROR_STOP=1 -d nombre_base -f Database/hospital_general_postgresql.sql
mysql -u usuario -p < Database/clinica_odontologica_mysql.sql
mongosh 'mongodb://127.0.0.1:27017/?replicaSet=rs0' --norc --file Database/laboratorio_clinico_mongodb.js
npm --prefix Database ci
node Database/centro_pediatrico_firestore.mjs --plan
```

Firestore: iniciar el emulador con `Database/firebase/firebase.json` y aplicar con `FIRESTORE_EMULATOR_HOST=127.0.0.1:8188 node Database/centro_pediatrico_firestore.mjs --aplicar --project demo-bdii-pediatria`. Las guías [MongoDB](ANALISIS_MONGODB.md) y [Firestore](ANALISIS_FIREBASE.md) detallan sus modelos y ejecución.

Los SQL son **inicializadores v2 para bases nuevas**, no migraciones de una instalación con datos. Conservan claves internas y agregan UUID públicos y revisiones a las tablas originales. El manifiesto almacena versión y huella de columnas, restricciones, índices, triggers y rutinas; una estructura anterior sin manifiesto o una deriva obliga a una migración explícita. No borrar bases para superar ese rechazo. El SQL PostgreSQL es transaccional; MySQL puede dejar DDL parcial si la conexión falla, por lo que requiere revisar/recuperar la inicialización antes de continuar. El preflight MySQL crea/recrea sus dos rutinas auxiliares de inspección, pero no modifica tablas clínicas al rechazar una estructura anterior.

En conexiones de aplicación usar UTC para eventos y `America/Guatemala` al mostrarlos. Las fechas civiles no llevan zona horaria. La cuenta de inicialización necesita DDL y permisos sobre la extensión en PostgreSQL; la cuenta futura del backend será distinta y sin DDL. No usar `--force` de MySQL ni ignorar errores de PostgreSQL.

## Garantías incorporadas

- Cita, historial, hospitalización, diagnóstico y tratamiento no pueden cruzarse entre pacientes/consultas incompatibles. Las referencias de propiedad clínica no se reasignan para corregir datos.
- Una consulta por cita; una receta lógica por consulta; estados permitidos y textos obligatorios no vacíos. MySQL distingue mayúsculas y espacios en estados.
- PostgreSQL excluye intervalos de cama que se superponen, tanto por cama como por hospitalización. Usa intervalos `[inicio, fin)` y permite traslados contiguos; rechaza intervalos vacíos.
- PostgreSQL exige un diagnóstico principal cuando hay diagnósticos al confirmar la transacción, y como máximo uno inmediatamente. MySQL permite preparar diagnósticos mientras la consulta está ABIERTA, impide dos principales y exige uno al finalizar; una consulta FINALIZADA no se reabre ni modifica su conjunto de diagnósticos por operaciones ordinarias. El backend debe confirmar su unidad de trabajo con el conjunto válido.
- Usuarios SQL vinculados a Firebase UID y rol institucional, sin contraseñas locales; una cuenta administrativa puede no tener vínculo clínico. No se crean cuentas ni pacientes de demostración al inicializar.
- Archivo de historial con causa, motivo, fecha y actor; reservas de identidad, operaciones idempotentes y revisiones disponibles para la unidad de trabajo del backend.
- Receta con instantánea histórica y datos completos de medicamentos al emitir. Una receta emitida no se borra; corregirla exige guardar la instantánea anterior en `revisiones`, con actor/motivo, y avanzar `revision`. Los detalles tabulares se editan durante BORRADOR; después la instantánea versionada es la fuente histórica. Auditoría, operaciones confirmadas y revisiones SQL son append-only.
- MongoDB comprueba las fechas de cada tratamiento dentro del documento, el prescriptor de la receta y que sus medicamentos no repitan ID. Sus índices y preflight no sustituyen las comprobaciones entre documentos.

## Verificación reproducible

Instalar las dependencias Node con `npm --prefix Database ci`. Tener en PATH los binarios de PostgreSQL, MySQL, MongoDB, mongosh, Node, Firebase CLI y Java 21. Después:

```sh
python3 Database/tests/verificar_local.py
```

Si los motores no están en PATH:

```sh
python3 Database/tests/verificar_local.py --postgres-bin /ruta/postgresql/bin --mysql-bin /ruta/mysql/bin
```

El verificador **no acepta una URL de una base existente**: crea directorios temporales, puertos libres, un clúster PostgreSQL nuevo, una instancia MySQL nueva, un replica set MongoDB nuevo y proyectos `demo-*` en el emulador. Detiene sus procesos y elimina sus directorios al terminar. `initdb` se ejecuta como usuario normal, no como root. Es posible seleccionar un grupo con `--motores postgres mysql`, `--motores mongo` o `--motores firestore`; Java y Firebase CLI solo son necesarios para este último. En macOS restringido pueden requerirse permisos locales para iniciar los servidores.

Las suites cubren integridad, validación, unicidad, rollback y concurrencia. Se conservan como pruebas de regresión en `tests/`; no se incluyen informes históricos ni capturas de ejecuciones. El verificador genera resultados en `.test-results/database/`, carpeta ignorada por Git.

La configuración Docker se comprueba por separado con `python3 Database/docker/verificar.py`, sin requerir motores instalados nativamente. Ver [la guía Docker](docker/README.md).

## Límite entre esta fase y la aplicación

Esta fase entrega almacenamiento, validadores, inicializadores y pruebas de integridad. El backend sigue siendo responsable de autorización clínica, normalización común de identidades, invocación de validadores Firestore, validación de referencias documentales, transacciones de paciente/responsables/auditoría, comparación de revisiones e idempotencia, saldo/stock concurrentes y conservación de versiones MongoDB/Firestore. Son casos de uso de la siguiente implementación, no garantías que un inicializador pueda sustituir.

PostgreSQL, MySQL y MongoDB ya tienen [montaje local Docker](docker/README.md), con volúmenes, salud/arranque, replica set y cuentas técnicas separadas. Firebase queda fuera de Compose por decisión del proyecto. La recuperación de respaldos y la configuración de despliegues remotos se abordarán por separado. No hay todavía despliegue de reglas/índices ni configuración IAM en un proyecto Firebase real. No se recibió retroalimentación docente; su aceptación académica continúa pendiente de esa fuente.
