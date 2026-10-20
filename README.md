# Proyecto final — Bases de Datos II

Aplicación académica de historiales clínicos para cuatro instituciones. El repositorio contiene los modelos de persistencia, sus inicializadores, las pruebas y el montaje local de bases de datos. Backend y frontend están pendientes de implementación.

| Institución | Motor | Modelo |
|---|---|---|
| Hospital General | PostgreSQL | Expedientes, consultas, exámenes, hospitalizaciones y seguros. |
| Clínica Odontológica | MySQL | Pacientes, agenda, diagnósticos, tratamientos y recetas. |
| Laboratorio Clínico | MongoDB | Órdenes, muestras, resultados, informes, inventario y cobros. |
| Centro Médico Pediátrico | Firebase / Cloud Firestore | Responsables, crecimiento, consultas y vacunas. |

La aplicación prevista utilizará arquitectura hexagonal y seleccionará el adaptador de persistencia según la institución autenticada. Los modelos no sustituyen las reglas de autorización y las transacciones que deberá implementar el backend.

## Bases locales con Docker

Requiere Docker con Compose y Python 3. Desde la raíz:

```sh
python3 Database/docker/preparar.py
docker compose up -d --build --wait postgres mysql mongodb
docker compose run --rm mongo-init
```

| Base | Dirección local | Usuario de aplicación |
|---|---|---|
| PostgreSQL | `127.0.0.1:15432` | `hospital_app` |
| MySQL | `127.0.0.1:13306` | `clinica_app` |
| MongoDB | `127.0.0.1:27018` | `laboratorio_app` |

Las credenciales se generan en `.docker/secrets/`, fuera de Git. `.env.example` contiene únicamente configuración de puertos y la ruta de los secretos. Los datos persisten en volúmenes; `docker compose down` conserva esos volúmenes. Firebase queda fuera de Compose.

Consultar la [guía Docker](Database/docker/README.md) para conexiones, permisos, reinicio y persistencia.

## Firestore

```sh
npm --prefix Database ci
node Database/centro_pediatrico_firestore.mjs --plan
```

El plan no se conecta a la nube. La [guía Firestore](Database/ANALISIS_FIREBASE.md) explica inicialización, emulador, reglas e índices. Las credenciales de proyectos reales se configuran fuera del repositorio.

## Pruebas

```sh
# Docker: instancias nuevas, permisos, transacciones y persistencia.
python3 Database/docker/verificar.py

# Validadores Firestore sin conexión.
npm --prefix Database run test:firestore
```

Para comprobar los cuatro motores con herramientas nativas: `python3 Database/tests/verificar_local.py`. Los requisitos están en la [guía de Database](Database/README.md). Los verificadores usan entornos aislados y guardan sus resultados en `.test-results/`, ignorada por Git.

## Organización

- `compose.yaml`: servicios PostgreSQL, MySQL, MongoDB y tarea auxiliar de inicialización MongoDB.
- `Database/`: scripts, modelos, diccionario SQL, pruebas y documentación de persistencia.
- `Database/docker/`: Dockerfiles, preparación de credenciales y configuración de arranque.
- `Backend/` y `Frontend/`: espacios para la siguiente fase de implementación.
- `Agente/`: contexto y diseño del proyecto.

Los SQL inicializan bases nuevas y rechazan modelos incompatibles; no reemplazan una migración de datos existentes. La documentación técnica vigente está en [Database](Database/README.md), el [diccionario SQL](Database/DICCIONARIO_SQL.md) y las guías de [MongoDB](Database/ANALISIS_MONGODB.md) y [Firestore](Database/ANALISIS_FIREBASE.md).
