# Requisitos auditados — E05-P1-04

| ID | Fuente | Requisito | Evidencia | Resultado |
|---|---|---|---|---|
| R01 | EF01 | Cuatro motores distintos | PostgreSQL, MySQL y MongoDB 8.0 en contenedores; Firestore Emulator | PASS |
| R02 | EF02/EF04 | Acceso institucional y expediente persistente | recorridos de hospital, odontología, laboratorio y pediatría con recarga | PASS |
| R03 | EF06–EF10 | Atención, receta, archivo e historia | flujo UI→HTTP→motor, corrección histórica y rechazo por permisos | PASS |
| R04 | CA01/04/05 | Alta, consulta y componentes clínicos atómicos | recorridos integrados y backend 372/372 | PASS |
| R05 | CA07/08 | Archivo conserva historia y no simula éxito | lectura posterior, corrección autorizada y errores 400/403/409/503 | PASS |
| R06 | CA12 | Orden, dos muestras, dos exámenes y trazabilidad | MongoDB real, cuentas analista/validador separadas y recarga | PASS |
| R07 | CA18 | Mínimo privilegio | analista recibe 403 al validar; sesión elige el bundle | PASS |
| R08 | CA19 | Instalación limpia y recuperación | instalación desde cero, migraciones interrumpidas y reaplicación sin pérdida | PASS |
| R09 | Ficha E05-P1-04 | Firestore offline alineado | expectativa vigente de 13 índices; 82/82 PASS | PASS |
| R10 | Ficha E05-P1-04 | Clasificar interfaz histórica | 174 PASS/134 FAIL por perfiles demo y composición mock retirados; separado del recorrido API real PASS | PASS |
| R11 | Instrucción 05/11 | Auditorías previas al PR | `SEGURIDAD.md`, `FUNCIONAL.md`, inventario y resultado | PASS |

No quedan requisitos obligatorios `FAIL` o `BLOCKED` en el alcance de cierre. Firestore es emulado y se declara como tal; no se presenta como proyecto cloud real.

Los resultados de la retoma para R01–R11 se verificaron en macOS sobre `f56455b`. Los comandos, los recuentos por motor y el alcance de los errores reales o inyectados están en [la evidencia](../E05-P1-04.md).
