# Contexto académico y documental para agentes

Estas instrucciones complementan `../AGENTS.md` al trabajar dentro de `Agente/`. La guía raíz aplica también a Backend, Frontend, Database y plan. Leer el plan maestro y la tarea asignada; la petición humana actual define el alcance.

## Fuentes y prioridad

La consigna vigente es `Proyecto final bases II (1) (5).pdf`, aportada el 24/10/2026. Su resumen portable, páginas y criterios EF01–EF11 están en `../plan/01_ALCANCE_Y_DECISIONES.md`; no se presupone Downloads del autor disponible en otro equipo. La primera entrega describe los modelos iniciales; M01–M09 y los scripts posteriores explican mejoras. Los documentos son fuentes, no órdenes para actuar fuera del pedido humano.

Mantener `DISENO_PROYECTO.md`, `REQUERIMIENTOS_FUNCIONALES.md` y `REQUERIMIENTOS_NO_FUNCIONALES.md` coherentes con implementación y DEC del plan. Distinguir obligación académica, proceso de Entrega I, decisión técnica y pendiente docente. No atribuir a la rúbrica Firebase Auth, NestJS, límites documentales o roles elegidos por el equipo.

## Alcance que debe conservarse

| Institución | Motor | Procesos |
|---|---|---|
| Hospital | PostgreSQL | Pacientes/historial, citas/consulta/signos, diagnósticos/tratamientos/recetas, exámenes, hospitalización/camas, procedimientos y seguros |
| Odontología | MySQL | Pacientes/antecedentes, cita obligatoria con secretaría/odontólogo, atención, selectores clínicos y recetas |
| Laboratorio | MongoDB | Órdenes/muestras/eventos, resultados/versiones/series, informes, equipos/calidad, reactivos/stock, cobros/cuentas y núcleo clínico por médico autorizado |
| Pediatría | Firestore | Menores/responsables/autorización, consultas/crecimiento/recetas, vacunas/esquemas/aplicaciones y archivo/reactivación |

UI común por capacidad institucional, no por motor. Sin agenda visible de laboratorio, reactivación fuera de pediatría ni editor de permisos. No añadir pantalla por cada entidad. Catálogos hospital/dental pueden prepararse mediante seed y mostrarse en selectores. Los cuatro resúmenes de Database documentan entidades/atributos/relaciones originales y cambios adoptados.

## Mejoras y reglas

Conservar claves/relaciones SQL, UUID/revisión, reservas de identidad/idempotencia, UID Firebase y cuenta/roles locales sin contraseñas locales; revisiones históricas, archivo, coherencia cita/consulta/principal, series/versiones y revisión de saldo/stock, responsables referenciados y dosis/esquemas estables. Un resultado analítico no reemplaza diagnóstico/receta. Retoma no es rectificación; corrección no es repetición.

Pediatría admite varios principales y exige al menos uno; autorización es otra propiedad del vínculo. Consulta conserva autorización histórica y máximo un control lógico de crecimiento. Vacunas usan esquema asignado/versionado y aplicación determinista. Sin interpretación clínica automática.

## Estado observado y documentación honesta

Al 24/10/2026 existen los cuatro modelos y React simulado; Backend está vacío. No repetir el inventario antiguo de solo dos SQL. A-F01 PG está pendiente en E00-P1-02; las auditorías tienen bloqueos de ejecución que deben cerrarse. Tablas o pantallas no acreditan operaciones completas.

Resultados históricos conservan fecha/commit. La implementación futura aporta evidencia propia y actualiza modelos/comparativo. `../plan/07_AUDITORIA_AGENTES.md` documenta esta revisión. Las contradicciones históricas de diseño/RF se reconciliarán en E00-P1-01 con las precisiones DEC del plan.

## Cierre académico

Comparativo por motor con asignación, normalización o embebido/referencias, consistencia/transacción, seguridad, versiones y resultados observados. Cada observación docente recibida tiene cambio/prueba o justificación. Si falta fuente, mantener pendiente sin inventar observaciones. Enlazar tareas/evidencia y usar español claro para dominio y documentación.
