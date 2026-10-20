# Cierre de la auditoría de Database

Fecha: 19 de octubre de 2026, America/Guatemala. Alcance: scripts y contrato de persistencia de las cuatro instituciones, preparados para inicialización nueva y posterior integración en Docker.

| Hallazgo inicial | Solución aplicada | Regresión |
|---|---|---|
| H01 cruce de pacientes | Triggers de pertenencia y de propiedad clínica; validación de INSERT y UPDATE | PG01–PG03, PG13–PG18 |
| H02 diagnóstico/tratamiento de consultas distintas | Comprobación de consulta de ambos recursos; propietarios inmutables | PG04, PG14–PG15 |
| H03 ocupación superpuesta | Dos exclusiones GiST sobre rango temporal: por cama y hospitalización | PG05, PG19–PG20, PG25–PG26 y dos sesiones reales |
| H04 múltiples consultas por cita | UNIQUE nullable en cita hospitalaria; la clínica conserva su UNIQUE | PG06, MY11 y dos sesiones MySQL |
| H05 estados SQL arbitrarios | CHECK de dominios; colación exacta en MySQL | PG07, MY12, MY26–MY27 |
| H06 catálogo duplicado con NULL | UNIQUE NULLS NOT DISTINCT; también aplicado a habitación y versión de plan | PG08 |
| H07 fechas invertidas MongoDB | Regla local sobre cada tratamiento, válida en INSERT/UPDATE y con fechas opcionales | MG01–MG04 |
| O01 MySQL: paciente/profesional/estado | Validación y bloqueo de cita, atención atómica y protección de la relación | MY01–MY02, MY04–MY08 |
| O02 MySQL: varios principales | Índice único generado, booleano válido y principal requerido al finalizar | MY03, MY09, MY15–MY16 |

También se completaron los campos/estructuras SQL adoptados en el diseño: UUID públicos, revisiones, UID Firebase y roles, archivo documentado, reservas de identidad, operación idempotente, revisiones históricas e instantánea de receta. Las recetas emitidas y la auditoría tienen barreras contra cambios sin historia; PG27–PG33 y MY18–MY25 verifican sus casos centrales. La normalización y la escritura conjunta de esas estructuras pertenecen al adaptador/backend futuro.

## Evidencia

**350 casos PASS**, más controles de inicialización, reejecución, deriva, esquema anterior y concurrencia. Se usaron procesos nuevos con datos sintéticos, sin tocar bases compartidas o proyectos de nube reales. La evidencia se guarda en `evidencias_cierre/`; `resultado.json` contiene los grupos completados. Los errores de las pruebas negativas de deriva/concurrencia son los rechazos esperados y están acompañados por PASS en el resultado general.

No se atribuye a los 350 casos una cobertura exhaustiva de todos los campos y combinaciones. Las pruebas de MongoDB/Firestore no certifican el backend, IAM ni la planificación de índices de producción. La suite PostgreSQL mínima declarada requiere 15+ y MySQL 8.4+; las versiones ejecutadas fueron PostgreSQL 18.6 y MySQL 8.4.6.

## Decisiones de compatibilidad

- Los SQL v2 inicializan bases nuevas. Rechazan las versiones anteriores y las derivas; no se ejecutó una migración de datos reales ni un borrado sobre una instalación existente.
- Se mantienen las 46/14 entidades clínicas originales, ampliadas a 50/22 tablas por las estructuras técnicas y administrativas. MongoDB conserva 27 colecciones y Firestore 22 patrones de documento.
- La preparación de diagnósticos en una consulta MySQL ABIERTA puede tener temporalmente cero principales; finalizar exige exactamente uno si hay diagnósticos. PostgreSQL admite ese estado únicamente dentro de una transacción y lo valida al confirmar. El contrato del servicio debe cerrar la unidad de trabajo con un principal válido.
- La receta SQL comienza en BORRADOR. Emitir exige contenido histórico completo; la corrección conserva la imagen anterior en `revisiones` y aumenta la revisión. No reconstruir una receta emitida desde los catálogos actuales.
- Las tablas de usuarios no crean identidades Firebase ni conceden permisos de motor. La creación de cuentas de servicio, privilegios mínimos y secretos corresponde a la configuración del despliegue y a la autenticación de la aplicación.

## Siguiente fase

La base de esquemas, inicializadores y regresiones está lista para construir Docker. Permanecen fuera de este cierre los casos de uso del backend y los controles de infraestructura enumerados en [la guía Database](README.md). No se implementó Docker en esta tarea.
