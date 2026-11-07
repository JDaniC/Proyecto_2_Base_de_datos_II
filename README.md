# Proyecto final — Bases de Datos II

Aplicación académica de historiales clínicos para cuatro instituciones. El repositorio contiene un cliente React, un backend hexagonal y cuatro motores. Pacientes, expediente, atención y archivo están integrados en modo API. El cierre técnico pendiente se concentra en resultados de laboratorio y la verificación del candidato.

El [plan de entrega final](plan/00_PLAN_MAESTRO.md) conserva el trabajo integrado y concentra el cierre técnico en E05, con tres tareas pendientes, dependencias y criterios de prueba. Empezar por la cola compartida, índices [P1](plan/COLA_P1.md) y [P2](plan/COLA_P2.md). Los agentes deben leer la [guía raíz](AGENTS.md).

| Institución | Motor | Modelo |
|---|---|---|
| Hospital General | PostgreSQL | Expedientes, consultas, exámenes, hospitalizaciones y seguros. |
| Clínica Odontológica | MySQL | Pacientes, agenda, diagnósticos, tratamientos y recetas. |
| Laboratorio Clínico | MongoDB | Órdenes, muestras, resultados, informes, inventario y cobros. |
| Centro Médico Pediátrico | Firebase / Cloud Firestore | Responsables, crecimiento, consultas y vacunas. |

El backend selecciona el adaptador de persistencia a partir del token verificado y la cuenta institucional. Los puertos comunes separan las reglas clínicas de los adaptadores de cada motor.

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
- `Backend/`: servidor hexagonal, casos de uso, adaptadores y pruebas.
- `Frontend/`: interfaz React en modo API y simuladores de desarrollo.
- `plan/`: fases, tareas por integrante, arquitectura, contratos y seguimiento.
- `Agente/`: contexto y diseño del proyecto.

Los SQL inicializan bases nuevas y rechazan modelos incompatibles; no reemplazan una migración de datos existentes. La documentación técnica vigente está en [Database](Database/README.md), el [diccionario SQL](Database/DICCIONARIO_SQL.md) y las guías de [MongoDB](Database/ANALISIS_MONGODB.md) y [Firestore](Database/ANALISIS_FIREBASE.md).

## Integración y documentación vigente

Ramas permanentes: `main` y `develop` (predeterminada de trabajo). Consultar [flujo GitHub](docs/FLUJO_GITHUB.md), [estado para agentes](plan/ESTADO_ACTUAL.md) y [tablero](plan/06_TABLERO.md). La [guía única de interfaz](Frontend/README.md) resume uso, alcance y diseño implementado. Se retiraron las especificaciones de construcción y los informes narrativos duplicados; la evidencia UI histórica se conserva en plan/evidencias/UI/.

## Empezar un chat nuevo en Antigravity

Abrir esta raíz como proyecto. Las reglas persistentes llevan al [estado actual](plan/ESTADO_ACTUAL.md), [cola compartida](plan/11_CONTINUIDAD_Y_COLA_COMPARTIDA.md) y tablero. Pedir «Revisa el estado de E05 y sus dependencias» para inspeccionar o «Continúa con la siguiente tarea disponible» para ejecutar la cola. El agente conserva seguimiento para el siguiente chat.
