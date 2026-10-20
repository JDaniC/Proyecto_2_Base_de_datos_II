# Auditoría funcional de los scripts de base de datos

> Informe histórico anterior a las correcciones. Los FAIL de este documento corresponden al estado auditado inicialmente; consultar [el cierre verificado](CIERRE_DATABASE.md) y [la guía actual](README.md). Las líneas e inventarios siguientes son los de aquella revisión.

Fecha: 19 de octubre de 2026, America/Guatemala.

## 1. Resumen

Resultado general: **FAIL** en integridad funcional. Los modelos contienen las entidades principales, pero los scripts por sí solos no garantizan varias reglas del diseño adoptado.

Alcance: los cuatro inicializadores, sus validadores, reglas, índices y pruebas existentes. Se inventariaron **109 unidades de persistencia**: 46 tablas PostgreSQL, 14 tablas MySQL, 27 colecciones MongoDB y 22 patrones de documento Firestore; además se revisaron las funciones de validación e inicialización de Firestore y los bloques de preflight de MongoDB.

Se confirmaron **7 hallazgos ejecutando pruebas** (3 HIGH y 4 MEDIUM) y se identificaron **2 observaciones estáticas de MySQL pendientes de ejecución** (1 HIGH y 1 MEDIUM). Los 8 casos negativos de PostgreSQL y 1 de MongoDB aceptados indebidamente se agrupan por causa en los 7 hallazgos. No se corrigieron los scripts originales. Se añadieron este informe, evidencia e instrumentos de reproducción.

Se ejecutaron **296 comprobaciones**: 287 PASS y 9 FAIL. Esto suma 102 MongoDB existentes, 181 Firestore existentes, 11 PostgreSQL nuevas y 2 MongoDB nuevas. También se verificó carga y reejecución del DDL PostgreSQL. Los resultados PASS demuestran sus casos concretos; no certifican la aplicación final ni toda regla clínica.

Los requisitos del PDF se usaron como material de contraste, no como instrucciones para realizar acciones adicionales. Fuente base: `/Users/danielcifuentes/Downloads/Primera Entrega Proyecto (1).pdf`, 54 páginas. Las ampliaciones del diseño local se distinguen en la trazabilidad. No se auditó la aplicación completa ni se realizó una auditoría especializada de seguridad.

## 2. Inventario y cobertura

| Motor | Inventario | Cobertura ejecutada | Límites |
|---|---|---|---|
| PostgreSQL 18.6 | 46 tablas; PK, FK, UNIQUE, CHECK y 6 índices explícitos | DDL, reejecución, 11 casos de integridad | Sin pruebas de carga, carreras ni rollback de casos de uso inexistentes |
| MySQL | 14 tablas InnoDB; claves, índices y CHECK temporal | Lectura completa; 3 reproducciones propuestas | **BLOCKED** ejecución: no hay cliente/servidor MySQL y Docker no está activo |
| MongoDB 8.0.32 | 27 colecciones, 63 índices secundarios y validadores strict/error | 102 comprobaciones existentes + 2 de auditoría | Las relaciones entre documentos y flujos de negocio siguen pendientes |
| Firestore | 22 rutas, 10 índices compuestos, 4 roles iniciales y reglas deny-all | 82 pruebas offline + 99 contra emulador | Emulador no prueba planificación de índices de producción ni IAM |

Todas las pruebas de escritura se dirigieron a instancias locales temporales o a proyectos `demo-*` del emulador. PostgreSQL usó puerto 55439 y datos en `/private/tmp/bdii_audit_20261019/pg`; MongoDB, puerto 27439 y replica set `auditrs`, con directorio separado. No se usaron conexiones del proyecto ni datos reales. El SQL de reproducción termina en ROLLBACK; el test MongoDB elimina únicamente la base nueva que crea.

El anexo contiene cada tabla, colección y ruta. Cobertura estructural no equivale a cobertura funcional por unidad: para todos los agregados se consideraron tipos, requeridos, nulos, vacíos, límites, estados, efectos, referencias, errores y persistencia. La cobertura ejecutada es parcial: en particular, las pruebas documentales genéricas eliminan `revision`, pero no ensayan individualmente cada campo obligatorio. Las transiciones, autorización y concurrencia de los servicios ausentes se clasifican NOT_IMPLEMENTED; la ejecución MySQL, BLOCKED.

## 3. Trazabilidad requisito → código → prueba

| ID / requisito | Fuente | Código | Evidencia / estado |
|---|---|---|---|
| R01 conservar entidades y atributos iniciales | PDF pp. 8–29, 30–42, 47–51 | Los cuatro scripts y `firebase/modelo_pediatrico.mjs` | Inventario completo; ampliaciones documentadas; MySQL BLOCKED en motor |
| R02 un expediente por paciente y reutilización | PDF pp. 4–5; diseño §§2.2, 5 | UNIQUE SQL, cabecera MongoDB y paciente Firestore | PG10 PASS; índices MongoDB PASS; flujo de alta común NOT_IMPLEMENTED |
| R03 referencias al paciente correcto | Diseño §§2.2, 3.2, 3.3; PDF pp. 45, 54 | FK SQL y referencias documentales | PG01–PG04 FAIL; MY01 BLOCKED; servicios documentales NOT_IMPLEMENTED |
| R04 cita y consulta vinculadas una sola vez | Diseño §5.6, `ProgramarCita`/`CambiarCita` | `consulta`, `consulta_odontologica`, índice MongoDB | PG06 FAIL; MySQL UNIQUE presente; flujo Firestore NOT_IMPLEMENTED |
| R05 camas sin intervalos superpuestos | Diseño §3.2, línea 125; PDF p. 4 describe ocupación por periodo | `asignacion_cama` | PG05 FAIL; es regla explícita del diseño local |
| R06 estados permitidos y transiciones válidas | Diseño §§2.2, 3.3, 5.6 | estados SQL, enums documentales | PG07 FAIL; MY02 BLOCKED; enums MongoDB/Firestore PASS; transiciones NOT_IMPLEMENTED |
| R07 catálogo de diagnóstico sin duplicados | PDF p. 4; SQL UNIQUE declarado | `catalogo_diagnostico` | PG08 FAIL cuando sistema y versión faltan |
| R08 fechas de tratamiento coherentes | Diseño §5.6 `AgregarTratamiento` | CHECK SQL, agregado MongoDB, refine Firestore | MG01 FAIL; MG02 PASS; Firestore rechaza fechas invertidas |
| R09 un diagnóstico principal cuando hay diagnósticos | Diseño §5.6 `AgregarDiagnostico` | asociaciones SQL y listas documentales | MY03 BLOCKED; validadores MongoDB/Firestore PASS en casos existentes; servicio SQL NOT_IMPLEMENTED |
| R10 conservación de correcciones y versiones | PDF pp. 44–46, 52–54; diseño §§3, 14 | tablas SQL, `revisiones`, subcolecciones `versiones` | Estructuras parciales; inmutabilidad y escritura conjunta NOT_IMPLEMENTED |
| R11 responsable principal y vacunas sin duplicación | PDF pp. 53–54 | `validarResponsables`, `idAplicacion`, `crearDocumentoValidado` | validación local y create concurrente PASS; alta completa y existencia de referencias NOT_IMPLEMENTED |
| R12 evitar sobrepago, sobreconsumo y doble efecto | PDF p. 46; diseño §3.4 | índices idempotentes y revisiones MongoDB | unicidad y rollback PASS; cálculo/transacción de saldo y stock NOT_IMPLEMENTED |
| R13 inicialización repetible sin sobrescritura | Contrato de los propios scripts y README | DDL SQL, preflight MongoDB, transacción Firestore | PostgreSQL, MongoDB y Firestore PASS para casos ejecutados; MySQL BLOCKED; deriva SQL no certificada |

Las ampliaciones MongoDB (27 frente a 22 colecciones) y Firestore (22 rutas frente a seis colecciones de partida) están justificadas en el diseño y los análisis de cada motor. No se consideran incumplimientos por el simple aumento de entidades. La autenticación Firebase adoptada en el diseño también explica la sustitución de contraseñas locales en los modelos documentales.

## 4. Desviaciones detectadas

| Hallazgo | Tipo | Severidad | Resultado |
|---|---|---|---|
| H01 relaciones clínicas entre pacientes distintos | SUB_IMPLEMENTADO | HIGH | FAIL confirmado |
| H02 diagnóstico y tratamiento de consultas diferentes | SUB_IMPLEMENTADO | HIGH | FAIL confirmado |
| H03 doble ocupación de una cama | SUB_IMPLEMENTADO | HIGH | FAIL confirmado |
| H04 varias consultas para una cita | SUB_IMPLEMENTADO | MEDIUM | FAIL confirmado |
| H05 estados SQL sin dominio válido | SUB_IMPLEMENTADO | MEDIUM | FAIL confirmado en PostgreSQL; MySQL pendiente |
| H06 duplicados en catálogo con componentes NULL | SUB_IMPLEMENTADO | MEDIUM | FAIL confirmado |
| H07 fechas invertidas en tratamientos MongoDB | DIVERGENTE | MEDIUM | FAIL confirmado |
| O01 paciente/cita y estado incompatibles en MySQL | SUB_IMPLEMENTADO | HIGH | BLOCKED ejecución; evidencia estática |
| O02 varios diagnósticos principales en MySQL | SUB_IMPLEMENTADO | MEDIUM | BLOCKED ejecución; evidencia estática |

## 5. Hallazgos y correcciones recomendadas

### H01 — PostgreSQL permite enlazar eventos de pacientes distintos

Evidencia: `hospital_general_postgresql.sql:109` (`consulta`), `:320` (`hospitalizacion_consulta`) y `:325` (`hospitalizacion_diagnostico`). Las FK garantizan existencia independiente, pero no igualdad de paciente.

Entrada PG01: cita de paciente 10001 e historial de paciente 10002 en una consulta. PG02: consulta del paciente 10002 en hospitalización del paciente 10001. PG03: diagnóstico del paciente 10001 en hospitalización del paciente 10002. **Observado:** las tres escrituras se aceptan. **Esperado:** rechazo antes de guardar. Impacto: información clínica atribuida al expediente equivocado.

Corrección: diseñar claves compuestas que incluyan paciente o triggers que verifiquen la relación completa; cubrir también cambios posteriores de las referencias. El futuro adaptador debe ejecutar la unidad de trabajo con validación y transacción. Regresión: PG01–PG03.

### H02 — Diagnóstico y tratamiento pueden pertenecer a consultas diferentes

Evidencia: `hospital_general_postgresql.sql:168`. Entrada PG04: diagnóstico de consulta 10001 (paciente A) y tratamiento de consulta 10002 (paciente B). **Observado:** INSERT aceptado. **Esperado:** relación de la misma consulta/paciente según diseño §5.6.

Impacto: un tratamiento aparece como indicado para un diagnóstico ajeno. Corrección: incluir `id_consulta` en la asociación y sus FK compuestas, o validación equivalente que también cubra UPDATE. Regresión: PG04.

### H03 — Una cama admite dos ocupaciones abiertas

Evidencia: `hospital_general_postgresql.sql:352`. Entrada PG05: dos hospitalizaciones diferentes con asignaciones a cama 10001, iniciadas 08:00 y 09:00 sin fin. **Observado:** ambas aceptadas. **Esperado:** segunda asignación rechazada.

Impacto: disponibilidad y ocupación inconsistentes incluso sin concurrencia. Corrección: restricción de exclusión sobre cama e intervalo temporal (con extensión apropiada, si se adopta), y otra sobre hospitalización para evitar dos camas simultáneas; fijar la semántica de extremos, por ejemplo `[inicio, fin)`. Un UNIQUE parcial de ocupación abierta solo no cubre intervalos cerrados superpuestos. Regresión: PG05; añadir intervalos cerrados, traslado contiguo y dos sesiones concurrentes.

### H04 — Una cita hospitalaria puede originar varias consultas

Evidencia: `hospital_general_postgresql.sql:113`: `id_cita` tiene FK, carece de UNIQUE. Entrada PG06: segunda consulta con `id_cita=10002`, ambas con historial del mismo paciente y cita programada, independientemente del caso PG01. **Observado:** se inserta. **Esperado:** no duplicar atención de la misma cita, según contrato común del diseño §5.6.

Impacto: atención duplicada al reintentar o registrar desde dos clientes. Corrección: UNIQUE nullable sobre `id_cita` más atención atómica/idempotente. La consulta hospitalaria sin cita debe seguir admitida. Regresión: PG06; añadir dos sesiones concurrentes al implementar el servicio.

### H05 — El estado del historial admite valores arbitrarios

Evidencia: `hospital_general_postgresql.sql:43`; patrón equivalente en múltiples columnas SQL, por ejemplo `clinica_odontologica_mysql.sql:48,65,94`. Entrada PG07: `estado_historial='INVENTADO'`. **Observado:** UPDATE aceptado. **Esperado:** solo estados definidos en el contrato del dominio.

Impacto: historiales que no se clasifican correctamente como activos/archivados. Corrección: catálogo/FK o CHECK de valores permitidos y validación de transiciones en el servicio; definir el conjunto antes de migrar. DEFAULT no limita valores aceptados. Regresión: PG07; ampliar a citas, hospitalizaciones y cuentas cuando sus contratos se implementen.

### H06 — La unicidad del catálogo no evita duplicados con NULL

Evidencia: `hospital_general_postgresql.sql:138–145`; `sistema` y `version` admiten NULL, y UNIQUE combina ambos con `codigo`. Entrada PG08: dos filas con `codigo='AUD'`, `sistema=NULL`, `version=NULL`. **Observado:** ambas aceptadas. **Esperado:** un único diagnóstico para la misma clave de catálogo.

Impacto: rompe el propósito del catálogo de no repetir códigos y nombres en la atención. Corrección: hacer obligatorios sistema/versión si el dominio los exige, o usar unicidad que trate NULL como igual donde la versión objetivo de PostgreSQL lo permita. El mismo patrón merece revisión en `habitacion(piso,numero)` y `plan_seguro(...,version_plan)`, sin asumir que todas sus reglas sean idénticas. Regresión: PG08.

### H07 — MongoDB acepta un tratamiento que termina antes de empezar

Evidencia: `laboratorio_clinico_mongodb.js:91–95,397–410`. Se tipan ambas fechas pero no se comprueba su orden. Entrada MG01: inicio 19/10/2026, fin 18/10/2026 en el mismo tratamiento embebido. **Observado:** INSERT aceptado por MongoDB. **Esperado:** rechazo, según `AgregarTratamiento` del diseño; MySQL/PostgreSQL tienen CHECK y Firestore lo comprueba en `modelo_pediatrico.mjs:32–35`.

Impacto: operaciones equivalentes aceptan datos distintos según el motor. Corrección: regla local sobre cada tratamiento con ambas fechas presentes y validación común en backend. Es una regla dentro del mismo documento, distinta de las referencias entre documentos que el análisis ya delega al backend. MG02 confirma que fechas iguales son válidas. Regresión: MG01–MG02.

### O01 — MySQL: consulta sin comprobar pertenencia ni cancelación

Evidencia estática: `clinica_odontologica_mysql.sql:86–104`; las tres FK son independientes y no existe trigger/procedimiento adicional. El diseño §3.3 exige paciente/historial coherentes y prohíbe consulta de cita cancelada. Se prepararon MY01 y MY02: cita cancelada del paciente A más historial del paciente B. **Resultado de ejecución: BLOCKED**, no se presenta salida observada del motor. Corrección propuesta: operación transaccional que verifique paciente, estado y profesional conforme a la política de atención, con restricciones adicionales donde sea posible.

### O02 — MySQL: dos diagnósticos pueden declararse principales

Evidencia estática: `clinica_odontologica_mysql.sql:115–125`. La PK evita repetir el mismo diagnóstico, pero permite dos diagnósticos diferentes con `es_principal=TRUE`; BOOLEAN tampoco limita por sí solo a 0/1. MY03 prepara el caso. **Resultado de ejecución: BLOCKED**. Corrección: proteger un único principal por consulta y la transición atómica del principal; si se adopta índice generado para el caso TRUE, conservar además la regla de al menos uno cuando hay diagnósticos. El SQL hospitalario tampoco implementa todavía explícitamente el contrato común de principal.

## 6. Pruebas añadidas y evidencia

| Archivo | Casos | Resultado / prioridad |
|---|---|---|
| `tests/auditoria_postgresql.sql` | PG01–PG08 negativas; PG09 peso negativo, PG10 historial único y PG11 FK inexistente como controles | 8 FAIL + 3 PASS; HIGH/MEDIUM |
| `tests/auditoria_mongodb.js` | MG01 fechas invertidas; MG02 fechas iguales | 1 FAIL + 1 PASS; MEDIUM |
| `tests/auditoria_mysql.sql` | MY01 paciente distinto, MY02 cita cancelada, MY03 principales repetidos | 3 casos propuestos; BLOCKED |
| `auditoria_evidencias/` | Salidas de las pruebas ejecutadas en esta auditoría | Evidencia sintética sin credenciales |

Los scripts de auditoría expresan el contrato correcto: **FAIL significa que el motor permitió una operación inválida**. El proceso puede terminar con código 0 después de imprimir FAIL; se usa como instrumento de diagnóstico, no como barrera CI. El test MySQL devuelve filas para señalar anomalías y no se ejecutó.

Reproducción PostgreSQL, exclusivamente en un clúster nuevo y temporal ya preparado en el puerto indicado:

```sh
psql -X -h 127.0.0.1 -p 55439 -d postgres -v ON_ERROR_STOP=1 -f Database/hospital_general_postgresql.sql
psql -X -h 127.0.0.1 -p 55439 -d postgres -v ON_ERROR_STOP=1 -f Database/tests/auditoria_postgresql.sql
```

Reproducción MongoDB, exclusivamente en un replica set temporal nuevo en ese puerto:

```sh
mongosh 'mongodb://127.0.0.1:27439/?replicaSet=auditrs' --norc --quiet --file Database/tests/laboratorio_clinico_mongodb.test.js
mongosh 'mongodb://127.0.0.1:27439/?replicaSet=auditrs' --norc --quiet --file Database/tests/auditoria_mongodb.js
```

Firestore: se ejecutaron las suites de `tests/centro_pediatrico_firestore.test.mjs` y `tests/centro_pediatrico_firestore.emulator.test.mjs` usando `firebase emulators:exec` con `firebase/firebase.json`, proyecto ficticio y Java 21 local. El emulador se detuvo al finalizar.

## 7. Bloqueos

- **MySQL BLOCKED:** no hay cliente ni servidor MySQL local disponible y Docker no tiene daemon activo. Para verificar MY01–MY03, levantar MySQL 8.0.16+ aislado, cargar el esquema y ejecutar el archivo propuesto. No se sustituyó MySQL por otro motor para atribuir resultados que no se observaron.
- **Servicios NOT_IMPLEMENTED:** Backend contiene solo `.gitkeep`. No existen unidades de trabajo para probar autorización, atención, cambios de estado, archivo, revisiones, cobros o inventario de extremo a extremo.
- **Producción fuera de alcance:** no se desplegaron reglas, índices ni esquemas remotos. No se verificó IAM, configuración del motor real ni proyectos Firebase reales.

## 8. Matriz final de resultados

| Grupo | PASS | FAIL | BLOCKED / NOT_IMPLEMENTED |
|---|---:|---:|---|
| PostgreSQL: casos de auditoría | 3 | 8 | Concurrencia y servicios pendientes |
| MongoDB: suite existente | 102 | 0 | Flujos de negocio pendientes |
| MongoDB: fechas del tratamiento | 1 | 1 | — |
| Firestore: validación offline | 82 | 0 | — |
| Firestore: emulador | 99 | 0 | Índices de producción e IAM fuera de alcance |
| MySQL: casos propuestos | — | — | 3 BLOCKED |
| Total de comprobaciones ejecutadas | **287** | **9** | No incluye casos propuestos |

## 9. Riesgos residuales y orden recomendado

1. Corregir pertenencia entre pacientes y ocupación de camas; añadir pruebas de UPDATE y sesiones concurrentes, además de los INSERT ya reproducidos.
2. Resolver unicidad de atención, estados, catálogo con NULL y fechas MongoDB; convertir reproducciones en pruebas de regresión al implementar correcciones.
3. Ejecutar MySQL en motor real y completar los casos de principal, pertenencia y cancelación.
4. Implementar las reglas transaccionales del backend que ya se documentan como pendientes. Crear tablas/colecciones de auditoría no registra automáticamente cambios; tener `revision` no implementa control optimista; `version` no vuelve inmutable el documento. Los índices idempotentes tampoco garantizan saldo ni stock.
5. Completar contratos y pruebas de historial/versiones SQL: recetas vinculadas a catálogos mutables no conservan por sí solas la instantánea emitida. Es deuda ya prevista en diseño §14, no una promesa implementada por los scripts iniciales.

La reejecución exitosa sobre el mismo esquema SQL no demuestra detección de deriva: `IF NOT EXISTS` no compara tipos, constraints ni índices de una tabla existente. MongoDB y Firestore sí tienen preflight/manifiesto y casos de incompatibilidad. No se certifica actualización automática de SQL antiguos ni atomicidad de todo el DDL MySQL.

No se encontraron fallos adicionales en las 181 pruebas Firestore ejecutadas. Eso no demuestra que se impida crear pacientes sin responsables desde Admin SDK, ni escribir referencias inexistentes: sus validadores son locales y el propio análisis delega esas comprobaciones a servicios aún ausentes. Esas carencias se registran como NOT_IMPLEMENTED, sin atribuir al inicializador responsabilidades que no declara.

No se ejecutó una matriz exhaustiva de cada campo de las 109 unidades, ni se midió rendimiento. Se recomienda una auditoría especializada de seguridad cuando existan cuentas, adaptadores y endpoints. Los directorios temporales de esta ejecución conservan datos sintéticos para inspección; las instancias iniciadas para la auditoría se detuvieron al concluir.

## Anexo A. Inventario por unidad

Las filas describen cobertura estructural y pruebas disponibles, no una certificación individual de todas sus reglas. Riesgo HIGH para persistencia clínica/administrativa; CRITICAL para ocupación y flujos de cobro/inventario. Dependencia común: motor del grupo. Entrada: columnas/campos del contrato. Efecto: creación y actualización persistente. Las restricciones y límites se examinaron estáticamente; los casos ejecutados se identifican arriba.

| Motor | Unidad | Riesgo | Requisitos | Cobertura observada |
|---|---|---|---|---|
| PostgreSQL | `paciente` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `contacto_emergencia` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `historial_clinico` | HIGH | R01; relaciones R03, dominio R06 donde aplica | PG07 FAIL; PG10 PASS |
| PostgreSQL | `alergia` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `paciente_alergia` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `antecedente_medico` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `personal_medico` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `especialidad` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `personal_especialidad` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `cita` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `consulta` | HIGH | R01; relaciones R03, dominio R06 donde aplica | PG01/PG06 FAIL; PG11 PASS |
| PostgreSQL | `signos_vitales` | HIGH | R01; relaciones R03, dominio R06 donde aplica | PG09 PASS |
| PostgreSQL | `catalogo_diagnostico` | HIGH | R01; relaciones R03, dominio R06 donde aplica | PG08 FAIL |
| PostgreSQL | `diagnostico` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `tratamiento` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `diagnostico_tratamiento` | HIGH | R01; relaciones R03, dominio R06 donde aplica | PG04 FAIL |
| PostgreSQL | `procedimiento` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `procedimiento_realizado` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `laboratorio_farmaceutico` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `unidad_medida` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `medicamento` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `principio_activo` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `medicamento_principio_activo` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `receta` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `detalle_receta` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `examen_medico` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `orden_examen` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `detalle_orden_examen` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `resultado_examen` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `parametro_examen` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `resultado_detalle` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `hospitalizacion` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `hospitalizacion_consulta` | HIGH | R01; relaciones R03, dominio R06 donde aplica | PG02 FAIL |
| PostgreSQL | `hospitalizacion_diagnostico` | HIGH | R01; relaciones R03, dominio R06 donde aplica | PG03 FAIL |
| PostgreSQL | `habitacion` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `cama` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `asignacion_cama` | CRITICAL | R01; relaciones R03, dominio R06 donde aplica | PG05 FAIL |
| PostgreSQL | `usuario` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `rol` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `usuario_rol` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `auditoria` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `aseguradora` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `plan_seguro` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `titular_seguro` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `poliza` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| PostgreSQL | `paciente_poliza` | HIGH | R01; relaciones R03, dominio R06 donde aplica | DDL y reejecucion PASS; reglas adicionales sin caso individual |
| MySQL | `paciente` | HIGH | R01; relaciones R03, dominio R06 donde aplica | BLOCKED en motor; revision estatica |
| MySQL | `secretaria` | HIGH | R01; relaciones R03, dominio R06 donde aplica | BLOCKED en motor; revision estatica |
| MySQL | `odontologo` | HIGH | R01; relaciones R03, dominio R06 donde aplica | BLOCKED en motor; revision estatica |
| MySQL | `cita` | HIGH | R01; relaciones R03, dominio R06 donde aplica | BLOCKED en motor; revision estatica |
| MySQL | `historial_clinico` | HIGH | R01; relaciones R03, dominio R06 donde aplica | BLOCKED en motor; revision estatica |
| MySQL | `antecedente` | HIGH | R01; relaciones R03, dominio R06 donde aplica | BLOCKED en motor; revision estatica |
| MySQL | `consulta_odontologica` | HIGH | R01; relaciones R03, dominio R06 donde aplica | BLOCKED en motor; revision estatica |
| MySQL | `diagnostico` | HIGH | R01; relaciones R03, dominio R06 donde aplica | BLOCKED en motor; revision estatica |
| MySQL | `consulta_diagnostico` | HIGH | R01; relaciones R03, dominio R06 donde aplica | BLOCKED en motor; revision estatica |
| MySQL | `tratamiento` | HIGH | R01; relaciones R03, dominio R06 donde aplica | BLOCKED en motor; revision estatica |
| MySQL | `consulta_tratamiento` | HIGH | R01; relaciones R03, dominio R06 donde aplica | BLOCKED en motor; revision estatica |
| MySQL | `receta` | HIGH | R01; relaciones R03, dominio R06 donde aplica | BLOCKED en motor; revision estatica |
| MySQL | `medicamento` | HIGH | R01; relaciones R03, dominio R06 donde aplica | BLOCKED en motor; revision estatica |
| MySQL | `detalle_receta` | HIGH | R01; relaciones R03, dominio R06 donde aplica | BLOCKED en motor; revision estatica |
| MongoDB | `pacientes` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `solicitantes` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `tipos_muestra` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `metodos` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `pruebas` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `ordenes` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `muestras` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `eventos_muestra` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `resultados` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `informes` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `equipos` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `proveedores` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `reactivos` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `lotes_reactivo` | CRITICAL | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `movimientos_reactivo` | CRITICAL | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `controles_calidad` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `personal` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `usuarios` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `roles` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `auditoria` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `facturas` | CRITICAL | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `pagos` | CRITICAL | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `citas` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `consultas_clinicas` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS; MG01 FAIL; MG02 PASS |
| MongoDB | `operaciones` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `identidades_paciente` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| MongoDB | `revisiones` | HIGH | R01; R10/R12 donde aplica | Suite existente: documento valido y falta revision PASS |
| Firestore | `pacientes/{pacienteId}` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |
| Firestore | `responsables/{responsableId}` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |
| Firestore | `pacientes/{pacienteId}/responsables/{responsableId}` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |
| Firestore | `pacientes/{pacienteId}/alergias/{alergiaId}` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |
| Firestore | `pacientes/{pacienteId}/antecedentes/{antecedenteId}` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |
| Firestore | `pacientes/{pacienteId}/esquemas/{vacunaId}` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |
| Firestore | `pediatras/{pediatraId}` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |
| Firestore | `citas/{citaId}` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |
| Firestore | `consultas/{consultaId}` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |
| Firestore | `consultas/{consultaId}/versiones/{versionId}` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |
| Firestore | `vacunas/{vacunaId}` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |
| Firestore | `vacunas/{vacunaId}/versiones/{versionId}` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |
| Firestore | `aplicaciones_vacuna/{aplicacionId}` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |
| Firestore | `aplicaciones_vacuna/{aplicacionId}/versiones/{versionId}` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |
| Firestore | `usuarios/{usuarioId}` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |
| Firestore | `roles/{rolId}` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |
| Firestore | `auditoria/{eventoId}` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |
| Firestore | `operaciones/{clave}` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |
| Firestore | `identidades_paciente/{clave}` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |
| Firestore | `identidades_responsable/{clave}` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |
| Firestore | `colegiados/{clave}` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |
| Firestore | `configuracion/modelo` | HIGH | R01; R10/R11 donde aplica | Documento valido y falta revision PASS offline y emulador |

### Funciones y bloques auxiliares

| Unidad | Contrato / riesgo | Evidencia y limites |
|---|---|---|
| `obtenerPlan` | lectura offline / LOW | Plan de 22 rutas y huella PASS |
| `validarDestino` | destino explicito / HIGH | Casos de destino local y rechazo PASS |
| `conectarFirestore` | conexion y cierre / HIGH | Uso en suite del emulador PASS; remoto no probado |
| `inicializarFirestore` | bootstrap atomico y compatible / HIGH | Concurrencia, reejecucion y conflicto de manifiesto PASS |
| `main` | argumentos y modo plan/aplicar / MEDIUM | Casos CLI en emulador PASS |
| `ErrorModelo` | errores estructurados / LOW | Rechazos verificados por suites; sin matriz individual de constructor |
| `idAplicacion` | identidad determinista de dosis / HIGH | Coherencia y duplicado concurrente PASS |
| `claveUnica` | canonicalizacion de identidad / HIGH | Normalizacion y composicion PASS; reserva transaccional pendiente |
| `claveOperacion` | clave idempotente opaca / HIGH | Mayusculas/espacios y coherencia PASS |
| `normalizar` | tipos de Firestore / MEDIUM | NaN, fechas, listas y Timestamp en suites PASS; todas las fronteras no agotadas |
| `bytesValor / bytesTexto / tamanoDocumento` | limite de agregado / MEDIUM | UTF-8 y exceso 256 KiB PASS; sin oracle de tamano real en produccion |
| `validarDocumento` | rutas y reglas locales / HIGH | 22 contratos y casos negativos PASS; referencias entre documentos pendientes |
| `validarResponsables` | principal activo / HIGH | Casos de lista vacia/inactivo/principal PASS; transaccion de alta pendiente |
| `crearDocumentoValidado` | validacion y create sin sobrescribir / HIGH | Concurrencia de dosis PASS; no representa servicio clinico completo |
| `helpers MongoDB de schema/indices/canonicalizacion` | construccion y comparacion de contrato / HIGH | 102 comprobaciones cubren salida y deriva; sin matriz aislada de cada helper |
| `preflight MongoDB` | no reemplazar estructuras incompatibles / HIGH | Drift de validator e indice PASS |
| `bucle DDL MongoDB` | crear colecciones e indices faltantes / HIGH | 27 colecciones/63 indices y reejecucion PASS; DDL global no transaccional |
| `reglas Firestore` | bloqueo de acceso cliente / HIGH | Lecturas/escrituras de clientes anonimos/autenticados rechazadas PASS; Admin requiere backend |
| `indices Firestore` | consultas declaradas / MEDIUM | 10 definiciones presentes; planificacion real BLOCKED fuera de alcance |
