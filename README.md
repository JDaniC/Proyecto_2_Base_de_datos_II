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

El repositorio contiene los esquemas SQL iniciales para las dos instituciones relacionales:

- `Database/hospital_general_postgresql.sql`: crea el esquema `hospital_general` en una base de datos PostgreSQL existente.
- `Database/clinica_odontologica_mysql.sql`: crea la base `clinica_odontologica` en MySQL.

Aún no se encuentran en este repositorio la aplicación cliente-servidor, los adaptadores de persistencia ni las implementaciones de MongoDB y Firebase. Los esquemas actuales son el punto de partida del modelo y pueden necesitar ajustes conforme a la retroalimentación de la primera entrega.

Las instrucciones de contexto para agentes están en [`Agente/AGENTS.md`](Agente/AGENTS.md).

## Cargar los esquemas SQL

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

> Ejecuta los scripts primero en una base de desarrollo o de pruebas. No contienen datos de pacientes; usa datos sintéticos para cualquier demostración.

## Organización del repositorio

```text
.
├── Agente/
│   └── AGENTS.md
├── Backend/
│   └── .gitkeep
├── Database/
│   ├── clinica_odontologica_mysql.sql
│   └── hospital_general_postgresql.sql
├── Frontend/
│   └── .gitkeep
├── README.md
└── plan/
```

## Próximos entregables

- Implementar la aplicación cliente-servidor y los casos de uso compartidos.
- Crear los adaptadores para PostgreSQL, MySQL, MongoDB y Firebase/Cloud Firestore.
- Modelar explícitamente qué datos se embeben y cuáles se referencian en los modelos documentales.
- Implementar autenticación, autorización por institución y rol, auditoría y manejo seguro de datos clínicos.
- Documentar la comparación de motores, sus estrategias de consistencia y la justificación de la asignación.
