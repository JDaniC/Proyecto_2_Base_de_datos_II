# Requerimientos funcionales

## 1. Propósito y alcance

Este documento consolida las funciones que debe ofrecer el sistema de historiales clínicos para las cuatro instituciones del proyecto. Se basa en la consigna final, el levantamiento de la primera entrega y el diseño adoptado en [`DISENO_PROYECTO.md`](DISENO_PROYECTO.md).

### Cómo interpretar los requerimientos

- **Académico obligatorio:** exigencia de la consigna final.
- **Base de Entrega I:** función o información levantada en la primera entrega y que sirve de base para la aplicación.
- **Diseño adoptado:** regla o ampliación concreta elegida por el equipo para hacer implementable y verificable el proyecto; no debe presentarse como una exigencia textual de la consigna.
- **Pendiente de confirmar:** requiere revisar la retroalimentación docente, que todavía no está disponible.

Los requerimientos describen el comportamiento esperado; no afirman que las funciones estén implementadas. Los criterios de aceptación CA01–CA20 de `DISENO_PROYECTO.md` detallan escenarios para verificarlos.

## 2. Requerimientos funcionales comunes

| ID | Requerimiento | Origen / condición |
|---|---|---|
| RF-001 | El sistema permitirá iniciar y cerrar sesión de usuarios autorizados. | Diseño adoptado; el proveedor elegido es Firebase Authentication. |
| RF-002 | El backend verificará la identidad y el estado de la cuenta antes de permitir operaciones. | Diseño adoptado. |
| RF-003 | Cada usuario operará dentro de una institución; el servidor determinará el motor correspondiente a partir de su identidad y vínculo institucional. | Académico obligatorio: enrutar al motor de la institución autenticada. |
| RF-004 | El sistema comprobará permisos por rol y por recurso en el servidor para lecturas, búsquedas, cambios y exportaciones. | Diseño adoptado para cumplir el aislamiento y la clasificación de datos. |
| RF-005 | El sistema permitirá registrar pacientes y abrir su historial clínico con los datos requeridos por la institución. | Académico obligatorio y base de Entrega I. |
| RF-006 | El sistema permitirá buscar, consultar y actualizar pacientes sin crear otro expediente cuando corresponda reutilizar el existente. | Base de Entrega I; reglas de duplicidad del diseño adoptado. |
| RF-007 | El sistema permitirá consultar el historial y sus eventos en orden cronológico, con filtros y paginación. | Base de Entrega I y diseño adoptado. |
| RF-008 | El sistema permitirá archivar/desactivar y reactivar un historial con motivo y trazabilidad, preservando sus registros anteriores. | Académico obligatorio: mantener historiales sin borrar la historia clínica. |
| RF-009 | El sistema permitirá programar, consultar, reprogramar y cancelar citas según el rol y las reglas de la institución. | Diseño adoptado a partir de los procesos institucionales. |
| RF-010 | El sistema permitirá registrar una consulta vinculada al paciente y al profesional responsable; podrá vincularse también a una cita cuando aplique. | Académico obligatorio y diseño adoptado. |
| RF-011 | El sistema permitirá agregar diagnósticos y tratamientos a una consulta, manteniendo la relación con el paciente y el profesional. | Académico obligatorio. |
| RF-012 | El sistema permitirá emitir recetas y registrar medicamentos con los atributos definidos para cada institución. | Académico obligatorio y base de Entrega I. |
| RF-013 | El sistema conservará el contenido histórico de consultas y recetas; sus correcciones se registrarán como revisiones con actor, fecha y motivo. | Diseño adoptado para conservar historial clínico. |
| RF-014 | El sistema registrará quién efectuó operaciones clínicas o administrativas relevantes y qué recurso fue afectado. | Diseño adoptado. |
| RF-015 | Antes de guardar, el sistema comprobará campos obligatorios, formatos, rangos, unicidad, pertenencia y estados permitidos. | Diseño adoptado. |
| RF-016 | El sistema rechazará relaciones entre recursos que no pertenezcan al mismo paciente, institución o flujo, según corresponda. | Diseño adoptado. |
| RF-017 | Las operaciones compartidas tendrán comportamiento y contrato equivalentes en los cuatro motores, aunque cada adaptador use su propio modelo de persistencia. | Académico obligatorio. |
| RF-018 | El sistema presentará una interfaz coherente sin exponer al usuario qué motor de base de datos está utilizando. | Académico obligatorio. |
| RF-019 | Las solicitudes repetidas con una misma clave de idempotencia no duplicarán registros, pagos ni movimientos. | Diseño adoptado. |
| RF-020 | El sistema devolverá errores identificables para datos inválidos, duplicados, falta de permisos, conflictos de versión y transiciones de estado no permitidas. | Diseño adoptado. |

## 3. Requerimientos por institución

### 3.1 Hospital General — PostgreSQL

| ID | Requerimiento | Origen / condición |
|---|---|---|
| RF-H01 | Mantener pacientes, contactos de emergencia, historiales, alergias y antecedentes médicos. | Base de Entrega I. |
| RF-H02 | Administrar personal médico, especialidades y su relación con consultas y procedimientos. | Base de Entrega I. |
| RF-H03 | Gestionar citas, consultas y signos vitales. | Base de Entrega I. |
| RF-H04 | Registrar diagnósticos, tratamientos, procedimientos realizados, medicamentos y recetas con sus detalles. | Base de Entrega I y requisito académico de consulta/diagnóstico/tratamiento/medicamentos. |
| RF-H05 | Crear órdenes de examen y consultar pruebas, parámetros y resultados asociados. | Base de Entrega I. |
| RF-H06 | Registrar hospitalizaciones, habitaciones, camas y asignaciones, incluyendo ingreso y egreso. | Base de Entrega I. |
| RF-H07 | Comprobar que una cama no tenga asignaciones incompatibles durante el mismo periodo. | Diseño adoptado. |
| RF-H08 | Administrar aseguradoras, planes, titulares, pólizas y afiliaciones de pacientes. | Base de Entrega I. |
| RF-H09 | Administrar usuarios, roles y auditoría de la institución. | Diseño adoptado para acceso controlado. |

### 3.2 Clínica Odontológica — MySQL

| ID | Requerimiento | Origen / condición |
|---|---|---|
| RF-C01 | Mantener pacientes e historial clínico odontológico. | Base de Entrega I. |
| RF-C02 | Administrar secretarías y odontólogos, incluyendo el dato profesional requerido por el modelo. | Base de Entrega I. |
| RF-C03 | Gestionar citas vinculadas con paciente, odontólogo y secretaria que las administra. | Base de Entrega I. |
| RF-C04 | Registrar antecedentes y consultas odontológicas vinculadas al historial y, cuando aplique, a una cita. | Base de Entrega I. |
| RF-C05 | Registrar diagnósticos y tratamientos odontológicos usando los catálogos definidos. | Base de Entrega I. |
| RF-C06 | Emitir recetas odontológicas y registrar sus medicamentos. | Base de Entrega I y requisito académico. |
| RF-C07 | Al atender una cita, comprobar que paciente, historial y odontólogo estén relacionados correctamente; una cita cancelada no generará una consulta. | Diseño adoptado. |
| RF-C08 | Administrar usuarios, roles y auditoría sin permitir que secretaría modifique información clínica restringida. | Diseño adoptado. |

### 3.3 Laboratorio Clínico — MongoDB

| ID | Requerimiento | Origen / condición |
|---|---|---|
| RF-L01 | Mantener pacientes, solicitantes y catálogos de tipos de muestra, métodos, pruebas y parámetros. | Base de Entrega I. |
| RF-L02 | Crear órdenes con paciente, solicitante, pruebas, prioridad, indicaciones y precios acordados. | Base de Entrega I y diseño adoptado. |
| RF-L03 | Registrar muestras con código identificador y trazar toma, recepción, aceptación, rechazo, traslado y procesamiento. | Base de Entrega I y diseño adoptado. |
| RF-L04 | Registrar el motivo de rechazo o rectificación de muestra y conservar los eventos anteriores. | Diseño adoptado. |
| RF-L05 | Capturar resultados y componentes variables conforme a la versión de la prueba, con unidades, referencias, equipo y analista. | Base de Entrega I y diseño adoptado. |
| RF-L06 | Separar análisis y validación de resultados mediante permisos; validar únicamente resultados cuyas muestras, orden y paciente correspondan. | Diseño adoptado. |
| RF-L07 | Corregir resultados validados mediante una nueva versión y registrar una repetición como una nueva serie de resultado. | Diseño adoptado. |
| RF-L08 | Emitir informes solo con resultados validados de una misma orden y paciente, conservando las versiones exactas incluidas. | Diseño adoptado. |
| RF-L09 | Administrar equipos, proveedores, reactivos, lotes, movimientos de inventario y controles de calidad. | Base de Entrega I y diseño adoptado. |
| RF-L10 | Calcular existencias con movimientos confirmados y evitar consumos de lotes vencidos/inactivos o que dejen saldo negativo. | Diseño adoptado. |
| RF-L11 | Emitir facturas y registrar pagos, saldos y reversiones; impedir pagos duplicados o superiores al saldo dentro del alcance académico. | Diseño adoptado. |
| RF-L12 | Buscar órdenes, muestras, resultados, informes, facturas, pagos y movimientos por los criterios definidos para cada recurso. | Diseño adoptado. |
| RF-L13 | Administrar usuarios y roles de laboratorio; una función clínica se permitirá solo a un profesional médico autorizado y vinculado a un solicitante individual. | Ampliación adoptada para satisfacer el núcleo común; no es función de la primera entrega. |
| RF-L14 | Ofrecer el núcleo común de citas, consultas, diagnósticos, tratamientos y recetas mediante `citas` y `consultas_clinicas`. | Ampliación adoptada por el equipo a partir de la consigna final. |

### 3.4 Centro Médico Pediátrico — Cloud Firestore

| ID | Requerimiento | Origen / condición |
|---|---|---|
| RF-P01 | Mantener pacientes menores, alergias y antecedentes pediátricos. | Base de Entrega I. |
| RF-P02 | Mantener responsables del menor y el vínculo de cada uno, incluyendo parentesco, principalidad, vigencia y autorización de atención. | Base de Entrega I, con reglas detalladas adoptadas por el equipo. |
| RF-P03 | Al registrar un menor, exigir al menos un responsable principal; admitir varios principales y no inferir que ser principal implica autorización. | Diseño adoptado. |
| RF-P04 | Antes de iniciar una consulta, comprobar y registrar el responsable vigente que autoriza la atención. | Diseño adoptado. |
| RF-P05 | Administrar pediatras, citas y consultas pediátricas. | Base de Entrega I. |
| RF-P06 | Registrar como máximo un control de crecimiento por consulta, con las mediciones definidas; permitir comparar controles por fecha. | Base de Entrega I y regla adoptada. |
| RF-P07 | Calcular edad e IMC a partir de datos disponibles, sin guardar interpretaciones clínicas automáticas. | Diseño adoptado. |
| RF-P08 | Registrar diagnósticos, tratamientos y recetas con los datos históricos emitidos. | Base de Entrega I y requisito académico. |
| RF-P09 | Administrar vacunas, versiones de esquemas y dosis recomendadas por edad. | Base de Entrega I y diseño adoptado. |
| RF-P10 | Registrar aplicaciones con paciente, vacuna/dosis, fecha, lote, sitio y pediatra responsable, impidiendo duplicar la misma aplicación lógica. | Base de Entrega I y diseño adoptado. |
| RF-P11 | Consultar vacunas futuras, pendientes y aplicadas de acuerdo con el esquema asignado al paciente. | Diseño adoptado. |
| RF-P12 | Mostrar cronológicamente consultas, controles y vacunas y permitir archivar/reactivar el historial sin eliminar eventos. | Base de Entrega I y requisito académico. |

## 4. Requerimientos de información y entregables documentales

| ID | Requerimiento | Origen / condición |
|---|---|---|
| RF-D01 | Conservar los datos y relaciones definidos en los modelos de Entrega I, aplicando las correcciones documentadas. | Base de Entrega I; retroalimentación docente pendiente. |
| RF-D02 | Clasificar la información como pública, confidencial o restringida y aplicar esa clasificación al mostrarla y autorizarla. | Base de Entrega I. |
| RF-D03 | Justificar la asignación de los cuatro motores según volumen, estructura y necesidad de transacciones. | Académico obligatorio. La selección concreta es decisión del equipo. |
| RF-D04 | Documentar qué datos se embeben y cuáles se referencian en MongoDB y Firestore, junto con sus motivos. | Académico obligatorio. |
| RF-D05 | Entregar una comparación por motor sobre modelo, consistencia, seguridad y justificación de asignación. | Académico obligatorio; contrastar el diseño con resultados observados al finalizar. |
| RF-D06 | Incorporar y evidenciar la resolución de la retroalimentación de Entrega I. | Académico obligatorio; pendiente hasta recibir las observaciones docentes. |

## 5. Reglas generales de trazabilidad

- Los requisitos académicos obligatorios se originan principalmente en `Proyecto final bases II (1) (4).pdf`; los datos y procesos de partida se encuentran en `Primera Entrega Proyecto (1).pdf`.
- El documento [`DISENO_PROYECTO.md`](DISENO_PROYECTO.md) detalla modelos, reglas, estados, contratos API y criterios CA01–CA20 que complementan estos requisitos.
- Las reglas específicas marcadas como diseño adoptado pueden ajustarse, pero cualquier cambio debe actualizar este inventario, el diseño y sus criterios de aceptación.
- La retroalimentación de Entrega I no se considera resuelta hasta incluir las observaciones recibidas y evidencia verificable de los cambios.
