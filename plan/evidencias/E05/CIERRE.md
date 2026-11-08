# Cierre técnico de E05

- Objetivo: instalación reproducible de la entrega mínima y verificación en cuatro motores.
- Candidato de código ejecutado: `f56455b`. Integración de E05-P1-04: `35011a8d48aab0c416a44d2522adcf7da7241839`.
- Fechas de verificación: 07–08/11/2026, America/Guatemala. Ejecutores: Davidix888 (antecedente Windows) y JDaniC (candidato final macOS ARM64).
- Integración del candidato confirmada el 08/11/2026. Decisión técnica: PASS. El tablero de E05 refleja el cierre al integrar esta acta.

## Tareas integradas

| Tarea | Resultado |
|---|---|
| E05-P1-01 | Órdenes y muestras, [PR #76](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/76), [evidencia](E05-P1-01.md). |
| E05-P1-03 | Cobros, [PR #79](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/79), [evidencia](E05-P1-03.md). |
| E05-P2-01 | Resultados versionados, [PR #78](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/78), [evidencia](E05-P2-01.md). |
| E05-P2-03 | Circuito analítico HTTP, [PR #82](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/82), [evidencia](E05-P2-03.md). |
| E05-P1-04 | Instalación y recorridos finales, [PR #86](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/86), [evidencia](E05-P1-04.md). |

E04 ya está cerrada mediante el [PR #75](https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/75) y su [acta](../E04/CIERRE.md). E05-P1-04 fue aprobada por CodeRabbit sobre `ee397e1`, con controles obligatorios en éxito y cero hilos abiertos.

## Demostración integrada

Se instalaron dependencias con `npm ci` y se prepararon bases aisladas de PostgreSQL,
MySQL y MongoDB en Docker, con Firebase Auth y Firestore emulados. En Chrome,
los recorridos clínicos sumaron 101 hitos y los de pacientes 32. Recepción,
análisis y validación usaron identidades sintéticas separadas. La evidencia
del candidato detalla comandos, límites y resultados por institución.

| Criterio de salida | Evidencia | Estado |
|---|---|---|
| Instalación limpia en otro equipo | macOS ARM64, Chrome, tres motores reales aislados y Firestore emulado. Ejecución Windows anterior se conserva con su propio SHA. | PASS |
| Cuatro logins, pacientes y expediente | Alta por interfaz, búsqueda, historial paginado y lectura tras reiniciar. | PASS |
| Atención y archivo | Consulta, diagnóstico, tratamiento y receta, recarga, archivo, rechazo de atención nueva y lectura histórica en los cuatro motores. | PASS |
| Circuito analítico | Dos exámenes con componentes distintos, orden, muestras, captura, validación y consulta tras recarga. | PASS |
| Rechazo, aislamiento y recuperación | 404 entre instituciones, 403 al analista, receta inválida sin parcialidad, migración 013 y reaplicación SQL/Mongo sin pérdida. | PASS |
| Compilaciones y auditorías | Backend 372+46, frontend 152, Firestore offline 82 y clínica emulada 20. Seguridad y requisitos PASS. | PASS |

## Entrega y auditorías del acta

Las migraciones y precondiciones están en la [guía de migraciones](../../../Database/migrations/README.md).
Firestore se verificó en emulador. Los fallos de la suite UI histórica se conservan
clasificados en la [evidencia de tarea](E05-P1-04.md).

| Auditoría | Comprobación del cierre documental | Resultado |
|---|---|---|
| Seguridad | Se revisaron tablero, cronograma, plan, seguimiento, evidencia y acta. El cambio se limita a Markdown. No se incorporan credenciales ni datos clínicos. | PASS |
| Requisitos | Criterios de E05-P1-04 → candidato ejecutado y pruebas → SHA de integración y aprobación → tablero y acta. La comparación Git preserva los archivos verificados y la cola queda sin tareas vigentes disponibles. | PASS |
