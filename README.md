# Proyecto final — Bases de Datos II

Proyecto académico de la Universidad Rafael Landívar para diseñar e implementar una aplicación cliente-servidor de historiales clínicos. El sistema atenderá cuatro tipos de instituciones y permitirá comparar distintos motores de bases de datos aplicando reglas de negocio equivalentes.

La arquitectura hexagonal será la base para mantener los casos de uso independientes del motor. Al iniciar sesión, la institución del usuario determinará qué adaptador de persistencia utilizar.

## Instituciones y motores

La asignación propuesta en la primera entrega utiliza los cuatro motores requeridos, sin repetirlos:

| Institución | Motor | Enfoque |
|---|---|---|
| Hospital General | PostgreSQL | Expedientes, consultas, diagnósticos, exámenes y hospitalizaciones con integridad relacional y transaccional. |
| Clínica Odontológica | MySQL | Agenda, pacientes, consultas odontológicas, tratamientos y recetas. |
| Laboratorio Clínico | MongoDB | Órdenes, muestras y resultados con estructuras variables, seguimiento y versiones. |
| Centro Médico Pediátrico | Firebase / Cloud Firestore | Seguimiento del paciente, crecimiento, consultas y esquema de vacunación. |

La entrega final requiere justificar la asignación considerando el volumen, la estructura de los datos y las necesidades de consistencia de cada institución.

## Alcance previsto

La aplicación debe permitir registrar y buscar pacientes, administrar citas, consultar historiales y registrar consultas, diagnósticos, tratamientos y recetas. También debe cubrir las operaciones propias de cada institución: hospitalizaciones y seguros; atención odontológica; muestras, resultados, informes y cobros; y responsables, controles de crecimiento y vacunas.

El sistema debe enrutar las operaciones según la institución autenticada, mantener una interfaz coherente entre motores, proteger los datos clínicos y conservar la historia de los cambios relevantes. El documento comparativo de la entrega debe explicar el modelado, la consistencia y la seguridad en cada motor.

## Estado actual

El repositorio contiene los esquemas SQL iniciales y la estructura documental del laboratorio:

- `Database/hospital_general_postgresql.sql`: crea el esquema `hospital_general` en una base de datos PostgreSQL existente.
- `Database/clinica_odontologica_mysql.sql`: crea la base `clinica_odontologica` en MySQL.
- `Database/laboratorio_clinico_mongodb.js`: inicializa `laboratorio_clinico` con 27 colecciones, validadores estrictos y 63 índices secundarios.
- [`Database/ANALISIS_MONGODB.md`](Database/ANALISIS_MONGODB.md): análisis del modelo, decisiones de embebido/referencia, límites y guía de ejecución.
- `Database/tests/laboratorio_clinico_mongodb.test.js`: pruebas de estructura, unicidad, reejecución y rollback, con datos sintéticos y bases nuevas aisladas.

Aún no están implementados la aplicación cliente-servidor, los adaptadores de persistencia ni el modelo ejecutable de Firebase. El script MongoDB implementa la estructura de almacenamiento; las reglas entre documentos y la autorización siguen pendientes en el backend. Los esquemas pueden necesitar ajustes conforme a la retroalimentación de la primera entrega.

Las instrucciones de contexto están en [`Agente/AGENTS.md`](Agente/AGENTS.md). El alcance, módulos y arquitectura recomendada se detallan en [`Agente/DISENO_PROYECTO.md`](Agente/DISENO_PROYECTO.md).

## Cargar los esquemas de datos

Se necesita acceso a una instancia de cada motor y sus herramientas de línea de comandos. Los comandos siguientes ejecutan los scripts desde la raíz del repositorio.

### Hospital General — PostgreSQL

Conéctate a una base de datos PostgreSQL ya creada y ejecuta:

```bash
psql -d nombre_base -f Database/hospital_general_postgresql.sql
```

El script crea el esquema `hospital_general` y sus tablas dentro de la base indicada.

### Clínica Odontológica — MySQL

Ejecuta el script con un usuario que tenga permisos para crear bases de datos y tablas:

```bash
mysql -u usuario -p < Database/clinica_odontologica_mysql.sql
```

El script crea la base `clinica_odontologica`.

### Laboratorio Clínico — MongoDB

Requiere MongoDB 8.0+, mongosh 2.x y replica set o clúster con soporte transaccional. Desde la raíz del repositorio, conectado a un replica set de desarrollo (ajusta la conexión y su nombre):

```bash
mongosh 'mongodb://127.0.0.1:27017/?replicaSet=rs0' --norc --file Database/laboratorio_clinico_mongodb.js
```

Por defecto inicializa `laboratorio_clinico`; `MONGO_LAB_DB` permite elegir otra base. No inserta datos ni cuentas, no borra documentos y rechaza estructuras existentes incompatibles en vez de reemplazarlas. La guía del [análisis MongoDB](Database/ANALISIS_MONGODB.md) incluye cómo levantar una instancia local aislada y ejecutar las pruebas. Se verificaron **102 comprobaciones** en MongoDB 8.0.32 y mongosh 2.11.1 sobre un replica set temporal.

> Ejecuta los scripts primero en una base de desarrollo o de pruebas. No contienen datos de pacientes; usa datos sintéticos para cualquier demostración.

## Organización del repositorio

```text
.
├── Agente/
│   ├── AGENTS.md
│   └── DISENO_PROYECTO.md
├── Backend/
│   └── .gitkeep
├── Database/
│   ├── clinica_odontologica_mysql.sql
│   ├── hospital_general_postgresql.sql
│   ├── laboratorio_clinico_mongodb.js
│   ├── ANALISIS_MONGODB.md
│   └── tests/
│       └── laboratorio_clinico_mongodb.test.js
├── Frontend/
│   └── .gitkeep
├── README.md
└── plan/
```

## Próximos entregables

- Implementar la aplicación cliente-servidor y los casos de uso compartidos.
- Crear los adaptadores para PostgreSQL, MySQL, MongoDB y Firebase/Cloud Firestore.
- Implementar el modelo de Firestore y conectar los casos de uso a la estructura MongoDB; sus decisiones de embebido/referencia ya están especificadas.
- Implementar autenticación, autorización por institución y rol, auditoría y manejo seguro de datos clínicos.
- Documentar la comparación de motores, sus estrategias de consistencia y la justificación de la asignación.
