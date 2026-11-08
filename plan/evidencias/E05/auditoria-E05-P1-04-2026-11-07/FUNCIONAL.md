# Auditoría funcional — E05-P1-04

## Veredicto

**PASS: 11/11 requisitos trazados y cero hallazgos aplicables abiertos.**

## Resultado reproducible

El comando `$env:PLAYWRIGHT_CHANNEL='msedge'; node Backend/scripts/run-historial-integration.mjs --clinica-ui` creó un proyecto aislado, instaló el candidato y terminó con código 0. Observó:

- Hospital/PostgreSQL: agenda, consulta/receta atómicas, servicios, internamiento, archivo, reinicio y lectura histórica.
- Odontología/MySQL: agenda por secretaría, consulta obligatoriamente vinculada a cita, receta, archivo y lectura histórica.
- Laboratorio/MongoDB: orden, dos muestras, dos exámenes con componentes numérico/textual, funciones separadas, 403, validación y lectura tras recarga.
- Pediatría/Firestore Emulator: agenda, consulta, vacunas, crecimiento, responsables/autorización, archivo y reactivación.
- Migraciones: PostgreSQL 008 nueva/legada, recuperación SQL, Firestore 006/009/010/013 y MongoDB 011/012; reaplicación final sin borrar eventos ni órdenes.

## Suites

| Comprobación | Resultado |
|---|---|
| Backend lint y arquitectura | PASS |
| Backend runtime/unidad | 372/372 PASS |
| Backend contratos | 46/46 PASS |
| Frontend build | PASS |
| Firestore modelo offline | 82/82 PASS |
| Integración Firestore clínica | 20/20 PASS |
| Candidato cuatro motores | PASS, código 0 |
| Suite UI histórica completa | 174 PASS, 134 FAIL; fuera del criterio de persistencia vigente |

Los 134 fallos históricos reproducen principalmente búsquedas del panel retirado “Perfiles de prueba para evaluación” y pruebas de `RouteContent` sin el `ServiceProvider` ahora obligatorio. La ficha E05-P1-04 exige clasificarlos y separarlos: no son fallos del recorrido API ejecutado, que usa autenticación emulada, tres cuentas de laboratorio, todos los motores y recarga real. No se convierten en PASS ni se usan como evidencia de persistencia.

## Hallazgos y correcciones

- F01: runner Firestore no portable en Windows → corregido y probado.
- F02: manifiesto pediátrico desactualizado → migración 013 nueva/existente/rollback/deriva PASS.
- F03: reaplicación Mongo fallaba sobre esquema 011/012 válido → reconocimiento estricto de estados publicados y reaplicación real PASS.
- F04: prueba offline esperaba 12 índices frente a 13 vigentes → expectativa alineada y 82/82 PASS.

No se modificaron flujos de producto ajenos al defecto de instalación.


## Revalidación macOS de la retoma

Candidato `787c8de`. Los 101 hitos se repitieron sobre su código.
La búsqueda de pacientes por interfaz y el rechazo de nuevas atenciones
archivadas pasaron en los cuatro motores. En laboratorio pasó la clínica
común con un médico individual y, por separado, el circuito con dos exámenes,
analista y validador. El runner comparó la huella y el conteo de los datos
Mongo antes y después de reaplicar el inicializador. La migración 013 pasó
como no-op en LF, recuperó huellas CRLF conocidas, rechazó rutas incompatibles
y preservó los documentos ante rollback. El candidato revalidado y los
comandos están en [la evidencia](../E05-P1-04.md). No quedan fallos aplicables
en los requisitos R01–R11.
