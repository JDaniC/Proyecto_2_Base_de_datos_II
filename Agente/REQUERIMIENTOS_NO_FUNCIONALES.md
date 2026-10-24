# Requerimientos no funcionales

## 1. Propósito y alcance

Este documento establece atributos de calidad, restricciones técnicas y condiciones de operación esperadas para el sistema de historiales clínicos. Consolida la consigna, la clasificación de datos de Entrega I y las decisiones documentadas en [`DISENO_PROYECTO.md`](DISENO_PROYECTO.md).

### Interpretación

- **Académico obligatorio:** condición impuesta por la consigna final.
- **Base de Entrega I:** consideración de privacidad o calidad identificada en el primer trabajo.
- **Diseño adoptado:** objetivo técnico elegido para implementar y demostrar el proyecto; no necesariamente aparece literalmente en la consigna.
- Los requisitos son objetivos pendientes de implementación o verificación cuando no exista evidencia expresamente registrada. No constituyen certificación legal, clínica ni de cumplimiento normativo.

## 2. Requerimientos no funcionales

### Arquitectura y portabilidad

| ID | Requerimiento | Origen / condición |
|---|---|---|
| RNF-001 | La aplicación se organizará usando arquitectura hexagonal; cambiar un adaptador de persistencia no obligará a reescribir los casos de uso. | Académico obligatorio. |
| RNF-002 | La solución tendrá cuatro instituciones con motores diferentes, sin reutilizar el mismo motor para dos instituciones. | Académico obligatorio. |
| RNF-003 | La asignación de motores se justificará por volumen, estructura y necesidad de transacciones. | Académico obligatorio; la asignación concreta actual es decisión del equipo. |
| RNF-004 | Las tecnologías de interfaz, lenguaje, framework y ORM serán decisiones del equipo, siempre que permitan cumplir arquitectura, motores y operaciones requeridos. | La consigna deja esas tecnologías a elección; no establece React, JavaScript ni un ORM específico. |
| RNF-005 | El frontend no seleccionará motores ni tendrá acceso directo a sus credenciales; se comunicará con el backend mediante un contrato común. | Diseño adoptado. |
| RNF-006 | Las diferencias entre motores se aislarán en adaptadores y no modificarán la semántica común de los casos de uso. | Académico obligatorio y diseño adoptado. |
| RNF-007 | La aplicación se implementará como monolito modular; no se requiere separar el sistema en microservicios para satisfacer el diseño actual. | Diseño adoptado. |

### Seguridad, privacidad y autorización

| ID | Requerimiento | Origen / condición |
|---|---|---|
| RNF-008 | Toda operación de datos clínicos verificará identidad, estado de cuenta, institución y permiso en el servidor. | Diseño adoptado para asegurar aislamiento institucional y por rol. |
| RNF-009 | Las consultas y respuestas solo incluirán los campos autorizados para el rol y propósito del usuario. | Base de Entrega I y diseño adoptado. |
| RNF-010 | El sistema mantendrá la clasificación de datos públicos, confidenciales y restringidos y aplicará controles acordes a ella. | Base de Entrega I. |
| RNF-011 | Los datos clínicos y personales no se incluirán en mensajes de error, trazas o logs generales. Los logs técnicos expondrán un identificador de correlación. | Diseño adoptado. |
| RNF-012 | Los secretos y credenciales se obtendrán de configuración protegida del entorno; nunca se versionarán valores reales ni se incluirán en el frontend. | Diseño adoptado; el repositorio debe ignorar `.env` y sus variantes privadas. |
| RNF-013 | Las cuentas de base de datos tendrán privilegios mínimos; las cuentas de migración y operación se mantendrán separadas de la cuenta de aplicación cuando corresponda. | Diseño adoptado. |
| RNF-014 | Las reglas de autorización se aplicarán también a búsquedas, lecturas y exportaciones; ocultar botones en la interfaz no reemplaza la autorización. | Diseño adoptado. |
| RNF-015 | La auditoría de cambios relevantes será protegida contra modificación/borrado por usuarios de aplicación y tendrá actor, institución, acción, recurso, fecha UTC y motivo cuando aplique. | Diseño adoptado. |
| RNF-016 | Para cambios dentro de una misma base, el dato y su evento de auditoría se confirmarán o revertirán juntos. | Diseño adoptado. No implica transacción entre sistemas externos. |
| RNF-017 | En desarrollo, pruebas y demostraciones se utilizarán datos sintéticos; el diseño no implica certificación de cumplimiento normativo o clínico. | Diseño adoptado. |

### Consistencia, integridad y conservación

| ID | Requerimiento | Origen / condición |
|---|---|---|
| RNF-018 | Las escrituras relacionadas que formen una operación de negocio deberán ser atómicas dentro de las capacidades transaccionales del motor asignado. | Diseño adoptado; desarrollar pruebas por adaptador. |
| RNF-019 | No se diseñarán transacciones distribuidas entre motores: cada usuario y operación pertenecerá a una institución y a una base institucional. | Diseño adoptado. |
| RNF-020 | MongoDB deberá desplegarse en un replica set o clúster compatible con las transacciones requeridas; una instancia standalone no satisface el diseño. | Restricción del diseño adoptado. |
| RNF-021 | En MySQL se utilizarán tablas InnoDB para los flujos transaccionales. | Diseño adoptado. |
| RNF-022 | Los callbacks transaccionales de Firestore serán seguros ante reintentos y no producirán efectos externos, como enviar notificaciones. | Diseño adoptado. |
| RNF-023 | El sistema evitará duplicados por reintentos, actualizaciones perdidas y conflictos de concurrencia mediante unicidad, versiones o claves de idempotencia según el flujo. | Diseño adoptado. |
| RNF-024 | El historial clínico no se borrará al archivar un expediente. Cambios posteriores a una consulta, receta, resultado validado o documento emitido conservarán revisión o versión previa. | Académico obligatorio para archivo; conservación/versionado restante es diseño adoptado. |
| RNF-025 | El sistema comprobará pertenencia e integridad de referencias entre paciente, historial, consulta, cita, resultado, muestra y demás recursos relacionados. | Diseño adoptado. |
| RNF-026 | Los cálculos monetarios usarán unidades menores enteras por moneda y reglas de redondeo documentadas, sin aritmética de coma flotante. | Diseño adoptado para laboratorio. |
| RNF-027 | Los saldos de inventario y pagos reflejarán movimientos confirmados y no podrán quedar negativos por operaciones concurrentes aceptadas. | Diseño adoptado para laboratorio. |

### Interfaz, API e interoperabilidad

| ID | Requerimiento | Origen / condición |
|---|---|---|
| RNF-028 | La interfaz mantendrá una presentación coherente entre instituciones y no mostrará al usuario detalles internos de los motores. | Académico obligatorio. |
| RNF-029 | La aplicación se comunicará mediante API REST/JSON versionada bajo `/api/v1`, según el contrato adoptado. | Diseño adoptado. |
| RNF-030 | Las fechas de eventos se intercambiarán en ISO 8601 con zona y se almacenarán en UTC; la interfaz presentará horas en America/Guatemala. | Diseño adoptado. |
| RNF-031 | Los recursos expuestos utilizarán identificadores públicos estables, independientes de claves nativas de cada motor. | Diseño adoptado. |
| RNF-032 | Las listas tendrán paginación estable, límite máximo definido y rangos temporales documentados; las búsquedas verificarán autorización. | Diseño adoptado. |
| RNF-033 | Los errores tendrán códigos y respuestas coherentes entre adaptadores sin revelar tablas, colecciones, credenciales o datos clínicos innecesarios. | Diseño adoptado. |
| RNF-034 | La interfaz ofrecerá estados comprensibles de carga, error, sin resultados y permiso denegado, con reintento seguro donde aplique. | Diseño adoptado. |

### Mantenibilidad, configuración y operación

| ID | Requerimiento | Origen / condición |
|---|---|---|
| RNF-035 | El dominio y los casos de uso serán independientes de NestJS, React y los clientes de base de datos. | Diseño adoptado en cumplimiento de la arquitectura hexagonal. |
| RNF-036 | El esquema y las decisiones de embebido/referencia de MongoDB y Firestore estarán documentados con justificación. | Académico obligatorio. |
| RNF-037 | Las migraciones, índices y reglas de persistencia se podrán ejecutar/revisar de forma reproducible en entornos aislados. | Diseño adoptado. |
| RNF-038 | Los respaldos y las credenciales de recuperación tendrán acceso separado; la capacidad de restauración se comprobará en un entorno aislado antes de considerarla verificada. | Diseño adoptado. |
| RNF-039 | La comparación final distinguirá garantías medidas, supuestos y aspectos no verificados en cada motor. | Diseño adoptado para sustentar el entregable académico. |
| RNF-040 | Las observaciones docentes de Entrega I tendrán trazabilidad a una corrección o justificación. | Académico obligatorio; pendiente de recibir la retroalimentación. |

## 3. Decisiones técnicas y límites de obligatoriedad

La consigna fija principalmente la arquitectura hexagonal como base, los cuatro motores distintos, el uso del motor correspondiente a cada institución, la equivalencia funcional, la interfaz coherente y la documentación comparativa. La tecnología de aplicación queda a elección del equipo.

El diseño actual adopta NestJS/TypeScript para el backend, React/Vite para el frontend, PostgreSQL para Hospital General, MySQL para Clínica Odontológica, MongoDB para Laboratorio Clínico y Cloud Firestore para el Centro Médico Pediátrico. También adopta Firebase Authentication. Estas elecciones son decisiones del equipo, no una lista de tecnologías obligatorias impuesta por los documentos académicos. Se puede seleccionar otro ORM o tecnologías compatibles, siempre que no se incumplan las obligaciones académicas ni se debilite la arquitectura y se actualice la justificación del proyecto.

## 4. Verificación y estado

- Cada requisito debe relacionarse con uno o más criterios CA de la sección 9 de `DISENO_PROYECTO.md` o con una evidencia de documentación/implementación.
- Un requisito solo se marcará como cumplido cuando exista evidencia reproducible; que aparezca en el diseño no demuestra que esté implementado.
- La suite común deberá verificarse en los cuatro adaptadores usando entornos de prueba aislados y datos sintéticos.
- Las transacciones, permisos, auditoría, idempotencia y comportamiento concurrente se verificarán para cada motor según las garantías reales de su configuración.
- La incorporación de retroalimentación docente está pendiente hasta que se reciba y documente.

## 5. Fuentes del proyecto

1. `Proyecto final bases II (1) (4).pdf`: obligaciones de la aplicación final, motores, arquitectura y comparación.
2. `Primera Entrega Proyecto (1).pdf`: modelos de datos, entidades, atributos, clasificación y procesos de partida.
3. [`DISENO_PROYECTO.md`](DISENO_PROYECTO.md): consolidación del alcance, decisiones adoptadas, reglas institucionales, arquitectura y criterios de aceptación.
4. Esquemas y análisis de persistencia dentro de `Database/`: evidencia del modelado existente; no constituyen por sí solos evidencia de que la aplicación completa esté terminada.
