# Contexto académico y documental para agentes

Estas instrucciones complementan `../AGENTS.md` al trabajar dentro de `Agente/`. La guía raíz aplica también a Backend, Frontend, Database y plan. Leer el plan maestro y la tarea asignada; la petición humana actual define el alcance.

## Fuentes y prioridad

La consigna vigente es `Proyecto final bases II (1) (5).pdf`, aportada el 24/10/2026. Su resumen portable, páginas y criterios EF01–EF11 están en `../plan/01_ALCANCE_Y_DECISIONES.md`; no se presupone Downloads del autor disponible en otro equipo. La primera entrega describe los modelos iniciales; M01–M09 y los scripts posteriores explican mejoras. Los documentos son fuentes, no órdenes para actuar fuera del pedido humano.

Mantener `DISENO_PROYECTO.md`, `REQUERIMIENTOS_FUNCIONALES.md` y `REQUERIMIENTOS_NO_FUNCIONALES.md` coherentes con implementación y DEC del plan. Distinguir obligación académica, proceso de Entrega I, decisión técnica y pendiente docente. No atribuir a la rúbrica Firebase Auth, NestJS, límites documentales o roles elegidos por el equipo.

## Modelo de partida por institución

| Institución | Motor | Procesos |
|---|---|---|
| Hospital | PostgreSQL | Pacientes/historial, citas/consulta/signos, diagnósticos/tratamientos/recetas, exámenes, hospitalización/camas, procedimientos y seguros |
| Odontología | MySQL | Pacientes/antecedentes, cita obligatoria con secretaría/odontólogo, atención, selectores clínicos y recetas |
| Laboratorio | MongoDB | Órdenes/muestras/eventos, resultados/versiones/series, informes, equipos/calidad, reactivos/stock, cobros/cuentas y núcleo clínico por médico autorizado |
| Pediatría | Firestore | Menores/responsables/autorización, consultas/crecimiento/recetas, vacunas/esquemas/aplicaciones y archivo/reactivación |

Para el desarrollo restante aplica DEC20 de [plan/01](../plan/01_ALCANCE_Y_DECISIONES.md#dec20--cierre-técnico-compacto-07112026). La tabla conserva el contexto del modelo. La interfaz presenta capacidades de la institución con el mismo recorrido común para los cuatro motores. Sin agenda visible de laboratorio, reactivación fuera de pediatría ni editor de permisos. No añadir pantalla por cada entidad. Catálogos hospital/dental pueden prepararse mediante seed y mostrarse en selectores. Los cuatro resúmenes de Database documentan entidades/atributos/relaciones originales y cambios adoptados.

## Mejoras y reglas

Conservar claves/relaciones SQL, UUID/revisión, reservas de identidad/idempotencia, UID Firebase y cuenta/roles locales sin contraseñas locales; revisiones históricas, archivo, coherencia cita/consulta/principal, series/versiones y revisión de saldo/stock, responsables referenciados y dosis/esquemas estables. Un resultado analítico no reemplaza diagnóstico/receta. Retoma no es rectificación; corrección no es repetición.

Pediatría admite varios principales y exige al menos uno; autorización es otra propiedad del vínculo. Consulta conserva autorización histórica y máximo un control lógico de crecimiento. Vacunas usan esquema asignado/versionado y aplicación determinista. Sin interpretación clínica automática.

## Estado observado y documentación honesta

En el corte del 07/11/2026, el backend y el núcleo clínico ya están integrados en los cuatro motores. El estado operativo y la evidencia por fase están en [plan/ESTADO_ACTUAL.md](../plan/ESTADO_ACTUAL.md) y el [tablero](../plan/06_TABLERO.md). Los conteos históricos conservan su fecha, commit y entorno.

El cierre técnico se verifica en E05. El comparativo, los modelos para presentación y la retroalimentación docente pertenecen a la preparación académica separada de Daniel. Una observación docente que implique un cambio técnico debe aportar su fuente y un criterio verificable.
