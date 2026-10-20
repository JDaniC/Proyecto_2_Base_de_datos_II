# PostgreSQL, MySQL y MongoDB con Docker

Configuración local de las tres bases del proyecto. Firebase queda fuera de Compose y conserva su configuración independiente.

## Arranque

Con Docker Desktop iniciado, desde la raíz del repositorio:

```sh
python3 Database/docker/preparar.py
docker compose up -d --build --wait postgres mysql mongodb
docker compose run --rm mongo-init
docker compose ps
```

`preparar.py` crea siete archivos de credenciales/keyfile en `.docker/secrets/`, con permisos locales restringidos. No imprime los valores ni reemplaza archivos existentes. Esa carpeta está ignorada por Git; `.env.example` solo contiene puertos y la ruta de los secretos. No hace falta crear `.env` para usar los valores predeterminados. Si se cambia `DB_SECRETS_DIR`, preparar la misma ruta con `--secrets-dir`.

`mongo-init` es una tarea auxiliar que termina con código 0; no es una cuarta base. Configura `rs0`, espera al nodo primario, carga las 27 colecciones y crea el usuario/rol de aplicación. Al repetirla conserva datos y credenciales, verifica estructura y rechaza configuraciones incompatibles.

También se puede usar `docker compose up -d --build` para iniciar todo, incluida la tarea. En ese caso, `docker compose wait mongo-init` confirma que la inicialización MongoDB terminó; `docker compose ps -a` muestra su salida junto a la salud de los motores. Los healthchecks SQL comprueban conexión autenticada del usuario de aplicación; el de MongoDB comprueba el motor y `mongo-init` confirma la preparación del esquema.

## Conexiones

| Motor | Desde este equipo | Desde un futuro backend en la red Compose | Base | Usuario de aplicación |
|---|---|---|---|---|
| PostgreSQL 18.6 | `127.0.0.1:15432` | `postgres:5432` | `hospital_general`, esquema `hospital_general` | `hospital_app` |
| MySQL 8.4.6 | `127.0.0.1:13306` | `mysql:3306` | `clinica_odontologica` | `clinica_app` |
| MongoDB 8.0.32 | `127.0.0.1:27018` | `mongodb:27017` | `laboratorio_clinico` | `laboratorio_app` |

Las contraseñas de aplicación están en los archivos `postgres_app_password`, `mysql_app_password` y `mongo_app_password` de la carpeta local de secretos. Los otros archivos corresponden a administración y autenticación interna del replica set. No se crean pacientes ni cuentas clínicas ficticias al levantar los servicios.

MongoDB anuncia `mongodb:27017` dentro de Docker. Desde este equipo usar `authSource=laboratorio_clinico&replicaSet=rs0&directConnection=true`; desde otro contenedor usar el nombre `mongodb` y `replicaSet=rs0`, sin forzar conexión directa. El driver futuro debe recibir usuario/contraseña como opciones o montar los secretos, sin incluir credenciales en el código.

Los puertos se publican solo en `127.0.0.1`. Se pueden cambiar con `.env`, copiando `.env.example`. Los servicios usan UTC. La red del proyecto se llama `bdii-databases_databases`; un futuro servicio añadido al mismo Compose debe pertenecer a `databases` y esperar a SQL saludable y a `mongo-init` completado.

## Imágenes y persistencia

PostgreSQL y MySQL usan Dockerfiles pequeños basados en las imágenes oficiales y copian los scripts de configuración con permisos explícitos; esto evita depender de permisos de ejecución de la carpeta compartida de macOS. Los SQL principales se montan como archivos de solo lectura y se ejecutan al crear un volumen vacío. MongoDB utiliza la imagen oficial y copia el keyfile a un directorio temporal con el propietario/permisos exigidos por el motor.

Volúmenes del proyecto:

- `postgres_data`: montado en `/var/lib/postgresql`, conforme al formato de la imagen PostgreSQL 18.
- `mysql_data`: `/var/lib/mysql`.
- `mongo_data`: `/data/db`; `mongo_config`: `/data/configdb`.

Docker Compose antepone el nombre del proyecto a esos volúmenes. El replica set tiene un nodo: permite las transacciones locales del laboratorio; no ofrece alta disponibilidad entre servidores.

```sh
# Detener y retirar contenedores/red conservando datos.
docker compose down

# Volver a levantar los mismos volúmenes.
docker compose up -d --wait postgres mysql mongodb
docker compose run --rm mongo-init

# Revisar estado y mensajes.
docker compose ps -a
docker compose logs --tail=80 postgres mysql mongodb
```

Cambiar una contraseña en los archivos no rota automáticamente la cuenta persistida. Cambiar el SQL no actualiza un volumen ya inicializado: aplicar una migración explícita. Eliminar volúmenes elimina sus datos; el arranque habitual y `down` no los borran.

## Usuarios y permisos

Los administradores (`postgres_admin`, `root`, `mongo_admin`) se utilizan para inicializar/migrar. La aplicación tiene usuarios diferentes, sin DDL ni administración de usuarios del motor. No se conceden privilegios de aplicación sobre `modelo_database`. En SQL, auditoría/operaciones/revisiones permiten lectura e inserción, pero no actualización o borrado; en MongoDB el rol concede acciones por colección y excluye esas mutaciones. Los validadores MongoDB siguen activos; no se concede `bypassDocumentValidation`.

Estas cuentas técnicas no sustituyen la autorización clínica del futuro backend. Al añadir tablas/colecciones mediante migraciones, revisar también los privilegios de aplicación. TLS externo, despliegue remoto, backups programados y recuperación operativa no forman parte de este montaje local.

## Verificación reproducible

```sh
python3 Database/docker/verificar.py
```

El verificador usa otro proyecto aleatorio `bdii-db-test-*`, puertos libres, secretos nuevos y volúmenes nuevos. Comprueba arranque desde cero, 50 tablas PostgreSQL, 22 MySQL, permisos, autenticación, rollback MongoDB y persistencia de registros sintéticos al recrear los contenedores. Al terminar elimina únicamente su proyecto/volúmenes temporales; conserva el proyecto de trabajo. No requiere instalar motores nativos ni dependencias Node de Firebase. Los resultados se guardan en `.test-results/docker/resultado.json`, fuera de Git.

Fuentes de las decisiones de infraestructura: [imagen PostgreSQL y volúmenes 18+](https://hub.docker.com/_/postgres), [orden de arranque Compose](https://docs.docker.com/compose/how-tos/startup-order/), [replica set con keyfile](https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set-with-keyfile-access-control/).
