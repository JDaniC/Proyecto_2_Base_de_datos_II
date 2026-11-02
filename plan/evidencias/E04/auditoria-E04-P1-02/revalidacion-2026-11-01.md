# Revalidación de PR #68

01/11/2026, America/Guatemala. Los nueve comentarios de Codex sobre `268cbf3`
se atienden en la misma rama/PR; no se presume revisión limpia del nuevo SHA.

| Hallazgo | Corrección | Prueba actual |
|---|---|---|
| paciente.estado inexistente | JOIN historial_clinico.estado_historial con bloqueo | Ingreso real y rechazo tras archivo |
| Autocommit y pérdida de bloqueo | Hospital transaccional sobre UoW SQL existente | Referencia inválida y fallo tras cierre no dejan escrituras |
| Acceso administrativo a datos clínicos | historial.leer para GET; historial.leer + consultas.registrar para comandos | Rechazo desde caso de uso y guards HTTP |
| Clave ignorada / duplicación | Clave UUID estable, hash JCS, operación durable y serialización de reintentos simultáneos | Replay secuencial/concurrente, intención distinta 409, cliente conserva clave |
| Autor literal sin ID | Autor vigente resuelto por UUID y persistido con snapshot | Nota SQL conserva UUID/nombre/colegiado reales |
| Prueba SQL omitida | Bundle incluye hospital; assert obligatorio | Seis suites SQL pasan ejecutando CA17 |
| Historial sin hospitalizaciones | Eventos HOSPITALIZACION en la misma UoW | Conteo de cuatro eventos y recorrido HTTP/UI |
| Egreso sin validación | DTO cerrado, enum, texto clínico, instante UTC, revisión | Unitarias inválidas y egreso SQL/UI válido |
| Habitación fuera de servicio | Estado de habitación incluido en disponibilidad y bloqueo de asignación | Mantenimiento rechaza traslado sin cambios |

Se corrigieron además lectura UTC de TIMESTAMP, proveedor HTTP de React sin
conectar, ingreso sin búsqueda real, consulta previa ficticia y omisión de
versiones por UI. Los tests obsoletos que contaban 22 rutas ahora cuentan 30
porque se añadieron ocho rutas hospitalarias (nueve operaciones), conservando
sus comprobaciones de salud/rutas simuladas fuera del contrato.

Frontend completo: base `268cbf3` 131 FAIL/123 PASS; copia modificada 131 FAIL/124
PASS. Comparación exacta de los 131 nombres: sin fallos agregados ni eliminados.
No se confunde esa suite histórica con las 77 comprobaciones HTTP PASS.

## Segunda revisión nativa sobre ca07571

Codex identificó cuatro observaciones adicionales, atendidas en la misma rama:

- Motivo del traslado conservado por UUID de asignación en el snapshot del
  agregado existente y proyectado como motivoCambio al recargar; no añade tablas.
- Procedimiento en estancia finalizada rechazado antes de modificar historia.
- Listado con consulta única de resúmenes, páginas de 25 por defecto (máximo 100),
  orden estable fecha/UUID y controles anterior/siguiente; detalle por ID bajo
  demanda. El mapa de camas carga la estancia seleccionada, sin recorrer listados.
- Ocupación/camaActual calculadas por intervalos efectivos, incluidos traslados
  futuros; los formularios usan precisión de milisegundos sin anticipar su hora.

Regresiones añadidas en SQL: motivo tras reconstrucción, rechazo postegreso sin
cambios, origen todavía ocupado/destino libre antes de traslado futuro, páginas
distintas sin colecciones clínicas y rechazo de página inválida. El navegador
comprueba además listado resumido y navegación a detalle.
