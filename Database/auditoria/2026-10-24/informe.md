# Auditoría de scripts de las cuatro bases de datos

- Fecha: 24 de octubre de 2026, America/Guatemala.
- Alcance: cuatro inicializadores, modelo Firestore, índices, validadores, restricciones, triggers y perfiles de permisos asociados.
- Tipo: funcional, con revisión de los controles de acceso de persistencia.
- Entorno: procesos nuevos y datos sintéticos; no se usaron bases compartidas ni proyectos Firebase reales.
- Cambios: se añaden este informe, inventarios y reproducción, y se corrigen dos frases del resumen odontológico. Los cinco archivos principales auditados conservan su contenido.

Fuentes: el PDF de la primera entrega aportado por el usuario, [diseño adoptado](../../../Agente/DISENO_PROYECTO.md), [requisitos funcionales](../../../Agente/REQUERIMIENTOS_FUNCIONALES.md), [requisitos no funcionales](../../../Agente/REQUERIMIENTOS_NO_FUNCIONALES.md) y documentación técnica de `Database`. Los resúmenes recientes son auxiliares y no sustituyen los scripts ni las decisiones posteriores de diseño.

## 1. Resumen ejecutivo

**Los modelos conservan la información de la primera entrega y las mejoras M01-M09 están justificadas en el diseño. No puede declararse cumplimiento completo: hay un fallo funcional confirmado en PostgreSQL y verificaciones bloqueadas en MySQL y Firestore.**

Se inventariaron 256 unidades y se trazaron **109 requisitos: 69 funcionales y 40 no funcionales**. La matriz incluye los requisitos de aplicación para dejar visible qué corresponde a esta fase y qué depende del backend. No se atribuye al inicializador una función de aplicación solo por disponer de una tabla.

Se ejecutaron **234 casos/comprobaciones: 232 PASS y 2 FAIL**. Los dos FAIL comparten una causa raíz. Además se verificaron carga, reejecución, rechazo de deriva y una carrera de ocupación de cama. No se cuentan como ejecutadas las 27 regresiones MySQL ni las 99 pruebas del emulador Firestore.

Hallazgos funcionales/documentales: **0 CRITICAL, 1 HIGH, 0 MEDIUM, 1 LOW**. Seguridad: **0 vulnerabilidades confirmadas** en el alcance ejecutado; autenticación real, IAM y permisos de otros motores no quedan certificados.

| Motor | Modelo observado | Resultado de esta revisión |
|---|---|---|
| PostgreSQL | 50 tablas: 46 originales + 4 técnicas | Modelo e integridad básica comprobados; **FAIL** en finalización/corrección de consultas después del archivo del historial. |
| MySQL | 22 tablas: 14 originales + 8 de acceso/soporte | Estructura revisada estáticamente; ejecución **BLOCKED**. Una política de cita obligatoria debe reflejarse en la documentación. |
| MongoDB | 27 colecciones: 22 originales + 2 clínicas + 3 técnicas | **PASS** en 109 comprobaciones de estructura, validación, unicidad, reejecución y rollback. Casos de negocio entre documentos pendientes del backend. |
| Firestore | 22 patrones: 15 raíz + 7 subcolecciones | **PASS** en 82 pruebas offline. Persistencia, bootstrap concurrente y denegación real a clientes: **BLOCKED** por falta de emulador completo. |

## 2. Inventario y cobertura

El [inventario completo](inventario.csv) identifica archivo y línea, unidad, riesgo, categorías a considerar, prueba y límite de cobertura. Incluye tablas/colecciones/rutas, submodelos, funciones, triggers, índices y controles de acceso. El [resultado estructurado](resultado.json) registra las huellas SHA-256 y los resultados.

Las categorías 1-13 se evaluaron por su aplicabilidad: tipos, validación, negocio, estados, persistencia, salida, errores, límites, normalización, dependencias, concurrencia, búsquedas y fechas/moneda. La columna del inventario enumera las categorías que se deben considerar para ese tipo de unidad; las demás son `NOT_APPLICABLE` a esa unidad de persistencia. Una categoría presente no implica cobertura completa de todos sus casos límite.

| Grupo de unidades | Contrato y efectos | Cobertura observada y límite |
|---|---|---|
| Tablas PostgreSQL | PK/FK, UQ, tipos, checks, UUID/revisión y propiedad clínica | Las 50 se crean; 33 regresiones y concurrencia verifican invariantes seleccionadas. No se probaron exhaustivamente todas las columnas ni todas las transiciones. |
| Funciones/triggers PostgreSQL | Entrada NEW/OLD, estado previo, rechazo, bloqueo y rollback | Cobertura de relaciones, principal, citas, receta y archivo. Se añadió la excepción de consultas existentes tras el archivo y falló. El guard de detalle de receta se revisó estáticamente, sin caso dinámico nuevo específico. |
| Tablas/rutinas MySQL | InnoDB, claves, validación de cita y diagnóstico principal, receta histórica y append-only | Código revisado; las pruebas disponibles no se reejecutaron. No se convierte una revisión estática en PASS dinámico. |
| Colecciones/helpers MongoDB | Esquemas strict/error, tipos, agregados acotados, IDs internos e índices | Fixtures de las 27 colecciones; 102 comprobaciones + 7 regresiones. Las referencias a otras colecciones y los estados anteriores se delegan expresamente al backend. |
| Modelo/helpers Firestore | Rutas e IDs, documento estricto, crecimiento único, receta, dosis, tamaño y normalización | 82 pruebas offline. El `create()` del helper no sustituye permisos, transacciones clínicas ni comprobaciones entre documentos. |
| Inicialización Firestore | Plan sin conexión y bootstrap transaccional de configuración/roles | El plan se comprueba offline; las pruebas reales de bootstrap y cliente quedaron bloqueadas. |
| Índices | Unicidad o acceso por paciente/fecha/estado | Índices SQL/Mongo revisados; Mongo verifica 63 secundarios. En Firestore hay 10 definiciones compuestas; no se afirma publicación ni estado READY. |
| Perfiles de acceso | Cuenta de aplicación separada; sin DDL ni mutación de evidencias | Perfil PostgreSQL ejecutado con un usuario sintético: inserción clínica permitida; DDL, cambios de auditoría/operaciones, borrado de revisiones y acceso al manifiesto rechazados. Los demás perfiles se revisaron por lectura. |

### Mejoras admitidas, sin tratarlas como incumplimientos

| Mejora | Correspondencia encontrada | Evaluación |
|---|---|---|
| M01: UUID, revisión, idempotencia y reservas | Campos y estructuras técnicas en los cuatro modelos | Soporte de persistencia coherente; las transacciones y respuestas de cada caso de uso siguen pendientes. |
| M02: Firebase UID y roles | Usuarios vinculados a identidad externa; sin contraseña local; roles/auditoría añadidos a MySQL y Firestore | Cambio justificado. La eliminación de `contrasena_hash` no es pérdida accidental de un atributo. |
| M03: núcleo clínico del laboratorio | `citas`, `consultas_clinicas`, médico solicitante, diagnósticos, tratamientos y receta | Ampliación documentada; no se atribuye al analista una facultad clínica. |
| M04: responsables compartidos | Fuente común y vínculo por menor; alergias/antecedentes en subcolecciones | Reorganización justificada; conserva relación, contacto y autorizaciones. |
| M05: receta histórica y revisiones | Instantáneas, receta única y estructuras para versiones anteriores | Soporte válido. Correcciones de consultas archivadas en PG: fallo A-F01. |
| M06: archivo con causa y actor | Metadatos de baja en los cuatro modelos | Soporte válido; el control PG de ACTIVO es demasiado amplio en UPDATE. |
| M07: cita única y principal | Unicidad y estados; principal inmediato/diferido en PG y cierre controlado en MySQL | Mejora válida. No se exige idéntico mecanismo interno a todos los motores. |
| M08: versiones, pagos y reactivos | Series/versiones, reversiones, `revision_cobro`, `revision_stock` y cantidades exactas | Estructuras presentes. Cálculos, sobrepago y stock concurrente son responsabilidad del backend pendiente. |
| M09: vacunación versionada | Versiones de esquema, asignación al paciente, aplicación determinista y revisiones | Modelo presente y validación offline comprobada; existencia de referencias y transacción clínica no certificadas. |

Fuente de estas decisiones: [diseño, sección 14.1](../../../Agente/DISENO_PROYECTO.md:588). El PDF aportado sirve como levantamiento inicial; no se interpreta como una orden de deshacer mejoras posteriores.

## 3. Matriz de trazabilidad requisito → código → prueba

La [matriz completa de 109 requisitos](trazabilidad.csv) incluye fuente y línea, origen, implementación, prueba, estado de trazabilidad y resultado del requisito completo. `PARCIAL` significa que hay soporte de persistencia, pero no está demostrado el caso de uso íntegro.

| Requisito / criterio | Código | Evidencia | Resultado dentro de Database |
|---|---|---|---|
| Conservar entidades y atributos con cambios documentados | SQL 50/22, Mongo 27, Firestore 22 rutas | Comparación con el PDF y decisiones M01-M09 | PASS estático; las reorganizaciones están explicadas. |
| RF-H07 / CA17: impedir solapamientos de cama | PostgreSQL `asignacion_cama` y exclusiones | PG05, PG19-20, PG25-26 y dos sesiones concurrentes | PASS. |
| RF-016: relaciones clínicas SQL | `validar_relaciones_clinicas`, `impedir_reasignacion`; procedimiento MySQL | PG01-04 y PG13-17; MY01-04 y MY07-08 disponibles | PASS PG; MySQL BLOCKED para ejecución. |
| M07: principal de diagnóstico | Índice y trigger diferido PG; columna generada y triggers MySQL | PG21-22; MY03, MY15-16 disponibles | PASS PG; MySQL BLOCKED. |
| M05: receta emitida conserva historial | Validación de instantánea, guard y `revisiones` | PG27-29, PG33; MG05-07; validadores Firestore | PASS en los escenarios ejecutados; no equivale a probar todas las vías de corrección. |
| RF-008/RF-013 + sección 5.7: terminar/corregir procesos existentes tras archivo | `validar_relaciones_clinicas`, aplicado también a UPDATE | AUD-PG-02 y AUD-PG-03 | FAIL, causa A-F01. |
| RF-L01-05/L07/L09/L14: forma del laboratorio | Validadores y 63 índices secundarios | 102 comprobaciones + 7 regresiones | PASS de forma/integridad local; casos de uso completos NOT_IMPLEMENTED. |
| RF-P06/P08/P09/P10: crecimiento, receta y dosis | Modelo Firestore y claves deterministas | Pruebas offline de crecimiento, prescriptor, duplicados, rutas y dosis | PASS de validación; persistencia y transacción de negocio no demostradas. |
| RNF-013/RNF-015: privilegios y evidencias protegidas | `docker/postgres/app-user.sql` | AUD-PG-05 a AUD-PG-10 | PASS del perfil PG probado; no certifica permisos clínicos por rol ni IAM. |
| RNF-020/RNF-021: replica set e InnoDB | Preflight Mongo y ENGINE de las tablas MySQL | Replica set temporal; lectura de DDL MySQL | PASS para estas decisiones concretas. |
| RF-017/RF-019: equivalencia e idempotencia de operaciones | Estructuras técnicas; no hay adaptadores/backend ejecutable | Sin suite compartida CA03-CA08 del backend | NOT_IMPLEMENTED como comportamiento completo; no se cuenta como defecto nuevo del esquema. |

## 4. Desviaciones detectadas

| ID | Severidad | Tipo | Estado | Descripción |
|---|---|---|---|---|
| A-F01 | HIGH | DIVERGENTE | FAIL, confirmado dinámicamente | PostgreSQL impide finalizar o corregir con revisión una consulta existente si el historial fue archivado. |
| A-D01 | LOW | DOC_DESACTUALIZADA | Corregido en el resumen; política clínica pendiente de explicitar | El resumen previo decía que la consulta podía no tener cita, pero el DDL y su procedimiento siempre la exigen. |

Las operaciones pendientes del backend aparecen como `NOT_IMPLEMENTED` en trazabilidad, sin presentarlas como fallos del inicializador cuando el diseño ya asigna esa responsabilidad a la aplicación.

## 5. Hallazgos confirmados

### A-F01 - El archivo del historial bloquea procesos que ya existían

- Componente: [hospital_general_postgresql.sql:680](../../hospital_general_postgresql.sql:680), condición de estado en la línea 686 y [trigger de INSERT/UPDATE:750](../../hospital_general_postgresql.sql:750).
- Requisito: [diseño:380](../../../Agente/DISENO_PROYECTO.md:380) permite terminar procesos ya iniciados y registrar correcciones históricas con permiso y trazabilidad. RF-008 y RF-013 conservan el historial y sus revisiones.
- Precondición: consulta válida creada con historial ACTIVO; después se archiva correctamente con causa, motivo, fecha y actor.
- Entrada: `UPDATE consulta SET estado='FINALIZADA' WHERE id_consulta=91001`. Segundo caso: consulta finalizada antes del archivo, revisión insertada con contenido anterior, actor y motivo, seguida de una corrección que avanza `revision`.
- Esperado: permitir ambos casos existentes, conservando las reglas de propiedad y la autorización de la aplicación. Una consulta nueva sobre ese historial debe seguir rechazada.
- Observado: ambos casos devuelven `ERROR: HISTORIAL_INACTIVO`, SQLSTATE 23514, salida de psql 3. La misma finalización con historial ACTIVO sí funciona. Crear nueva consulta tras archivar se rechaza correctamente.
- Causa: `validar_relaciones_clinicas()` comprueba ACTIVO para INSERT y UPDATE sin distinguir nueva atención de mantenimiento de una atención previa.
- Impacto: el backend no puede completar estos flujos sin reactivar artificialmente el historial o cambiar la base; la ampliación de archivo impone una restricción más fuerte que el diseño.
- Corrección recomendada: exigir ACTIVO al crear la consulta; permitir mantenimiento de registros existentes según estado/permisos y revisiones, conservando los controles de pertenencia y los enlaces inmutables. No quitar globalmente las restricciones ni reactivar expedientes como solución alternativa.
- Regresión: `AUD-PG-01` a `AUD-PG-04` de [la reproducción](reproducir_postgresql.py). Dos casos deben pasar después de corregir la misma causa raíz.
- Severidad: HIGH funcional. Confianza: alta. No se demuestra un acceso no autorizado ni se clasifica como vulnerabilidad de seguridad.

### A-D01 - La opcionalidad de la cita odontológica no coincide con el SQL

- Evidencia: [consulta_odontologica.id_cita:212](../../clinica_odontologica_mysql.sql:212) es NOT NULL y [validar_consulta_clinica:378](../../clinica_odontologica_mysql.sql:378) exige encontrar una cita. El resumen previo, línea 37, afirmaba que podía no tener cita. RF-C04 usa «cuando aplique» y el contrato común permite cita opcional según política institucional.
- Comprobación histórica: la obligatoriedad ya existía en el commit inicial `d0b8974`; no fue introducida por las mejoras del commit `3e268eb`.
- Resultado: discrepancia documental confirmada por lectura del código. Se corrigieron las dos frases del [resumen previo](../../clinica_odontologica_mysql.md:37) para reflejar que el script exige cita; no se cambió el SQL. No se afirma una regresión funcional MySQL ni una ejecución que no se realizó.
- Corrección recomendada: explicitar que odontología exige cita y alinear el resumen/contrato si esa es la política elegida. Si se decide permitir atención sin cita, harán falta cambios coordinados en nulabilidad, procedimiento, comparaciones de actualización y pruebas; no basta con quitar NOT NULL.
- Severidad: LOW documental. La aceptación de consultas sin cita como nueva política queda pendiente de definición, no de un cambio automático en esta auditoría.

### Controles de seguridad revisados

`CRITICAL 0 | HIGH 0 | MEDIUM 0 | LOW 0` vulnerabilidades confirmadas en las pruebas realizadas.

| Área | Resultado y límite |
|---|---|
| Privilegios PostgreSQL | PASS: cuenta de aplicación sin DDL ni escritura de evidencias protegidas; no puede leer el manifiesto. |
| Auditoría, revisiones y operaciones SQL | Guards y grants revisados; protección PG probada. MySQL no reejecutado. |
| Acceso Firestore | Deny-all presente en el archivo de reglas; prueba real de cliente BLOCKED. Admin SDK requiere autorización/IAM propios, como ya documenta el proyecto. |
| Usuarios/identidad | Vínculos y roles presentes; verificación de tokens, revocación, permisos por recurso y provisión siguen NOT_IMPLEMENTED en el backend. |
| MongoDB | Validadores e índices activos en el entorno temporal. El perfil autenticado del bootstrap Docker se revisó estáticamente; no se certifica su despliegue. |
| Inyección, archivos y red | Los inicializadores no son endpoints ni aceptan consultas clínicas arbitrarias de clientes. No hay un camino de explotación confirmado. URI/hash de informe no demuestran seguridad de un servicio de archivos todavía ausente. |
| Secretos y dependencias | No se imprimieron ni utilizaron secretos del proyecto. No se realizó un escaneo completo del historial Git ni SCA/CVEs; no se certifican esas áreas. |

## 6. Pruebas ejecutadas y añadidas

| Grupo | Cantidad | Resultado | Evidencia |
|---|---|---|---|
| Regresiones PostgreSQL existentes | 33 | 33 PASS | [salida](../../../.test-results/auditoria-2026-10-24/postgres/postgres_regresiones.txt) |
| MongoDB, suite principal | 102 | 102 PASS | [salida](../../../.test-results/auditoria-2026-10-24/mongo/mongo_suite.txt) |
| MongoDB, regresiones | 7 | 7 PASS | [salida](../../../.test-results/auditoria-2026-10-24/mongo/mongo_regresiones.txt) |
| Firestore sin conexión | 82 | 82 PASS | [salida](../../../.test-results/auditoria-2026-10-24/firestore/firestore_validadores.txt) |
| Casos nuevos de archivo y privilegios PostgreSQL | 10 | 8 PASS, 2 FAIL | [resultado](../../../.test-results/auditoria-2026-10-24/adicionales-postgres/resultado.json) |
| Carga/reejecución/deriva/carrera PostgreSQL | Grupos auxiliares | PASS | [resultado del verificador](../../../.test-results/auditoria-2026-10-24/postgres/resultado.json) |
| Regresiones MySQL existentes | 27 previstas | BLOCKED, no ejecutadas | Falta servidor nativo; Docker no operativo. |
| Firestore en emulador | 99 previstas | BLOCKED, no ejecutadas | No se obtuvo el emulador completo. |

La reproducción nueva crea su clúster, base, usuario y datos sintéticos; los elimina al terminar y no acepta URL externa. Sale con código 1 mientras A-F01 permanezca reproducible. No modifica las suites anteriores ni debilita el contrato esperado.

Reproducir desde la raíz del repositorio, con las dependencias disponibles:

```sh
python3 Database/tests/verificar_local.py --motores postgres --evidencias .test-results/auditoria-2026-10-24/postgres
python3 Database/tests/verificar_local.py --motores mongo --evidencias .test-results/auditoria-2026-10-24/mongo
npm --prefix Database run test:firestore
python3 Database/auditoria/2026-10-24/reproducir_postgresql.py
```

Se usaron PostgreSQL 18.6, MongoDB 8.0.32 y Node 24.22.0. PostgreSQL requirió permisos del entorno para memoria compartida; la ejecución autorizada terminó y eliminó su clúster temporal.

## 7. Bloqueos

| Bloqueo | Evidencia y límite | Cómo completar la comprobación |
|---|---|---|
| MySQL no disponible | No hay `mysqld`/`mysql` en las ubicaciones locales revisadas; el daemon Docker no está activo y la aplicación instalada no tiene ejecutable utilizable. | Usar MySQL 8.4+ en un proceso nuevo con `verificar_local.py --motores mysql --mysql-bin ...`, o reparar Docker y ejecutar el verificador aislado. |
| Emulador Firestore ausente | El Java de sistema no existe; se localizó Java 25 de DataGrip. El CLI no completó la descarga de `cloud-firestore-emulator-v1.22.0.jar`; un intento alcanzó el timeout de 180 s. | Obtener el emulador oficial completo, verificar su hash con el CLI y reejecutar con Java 21+ y proyecto `demo-*` local. No reutilizar un JAR parcial. |
| Retroalimentación docente | No disponible en las fuentes revisadas. | Incorporarla antes de certificar RF-D06/RNF-040; no afecta a la reproducción técnica de A-F01. |

Un `FAIL` del verificador provocado por dependencia o timeout se interpreta aquí como **BLOCKED de entorno**, no como defecto del script.

## 8. Matriz final

| Aspecto | Resultado |
|---|---|
| Conservación del levantamiento y mejoras M01-M09 | PASS estático, con diferencias justificadas y soporte comprobado donde hubo motor. |
| Restricciones PostgreSQL cubiertas por la suite existente | PASS. |
| Finalizar/corregir consultas preexistentes tras archivar historial en PG | FAIL, A-F01. |
| Coherencia documental de cita odontológica | A-D01 corregido en el resumen; falta explicitar la política en los requisitos, sin afirmar regresión SQL. |
| Validación e integridad local MongoDB | PASS en 109 comprobaciones. |
| Validación Firestore offline | PASS en 82 pruebas. |
| MySQL real y permisos asociados | BLOCKED. |
| Bootstrap/persistencia/reglas de Firestore en emulador | BLOCKED. |
| API, autorización clínica, transacciones de negocio y equivalencia integral | NOT_IMPLEMENTED en el backend; fuera de lo que certifican estos inicializadores. |
| Backup/restore, despliegue remoto e IAM real | NOT_IMPLEMENTED o no verificados en esta fase. |

## 9. Riesgos residuales y orden recomendado

1. Corregir A-F01 manteniendo el bloqueo a nuevas atenciones en historiales archivados y volver a ejecutar sus cuatro casos de control.
2. Alinear la documentación con la política de cita odontológica existente antes de modificar su esquema.
3. Completar las pruebas reales de MySQL y Firestore; no reutilizar como evidencia actual las cifras históricas de 350 casos.
4. Implementar el backend con las unidades de trabajo ya especificadas. Los inicializadores no garantizan por sí solos permisos clínicos, referencias documentales, conservación de todos los documentos emitidos, saldo/stock concurrentes, filtros ni cronología paginada.
5. Antes de modificar una base que ya tenga datos, preparar una migración. Los SQL v2 auditados son inicializadores y su rechazo de esquemas antiguos es una protección deliberada.

No se afirma cobertura exhaustiva de cada combinación de entradas, todos los privilegios de infraestructura, todas las versiones de motor ni los criterios CA01-CA20 completos. Esta auditoría acredita los escenarios registrados y deja visibles las verificaciones pendientes.
