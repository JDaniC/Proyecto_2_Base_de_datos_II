# Cierre de tarea

- ID y título:
- Ejecutor actual / revisión automática de Codex:
- Estado solicitado: EN_REVISION / BLOQUEADA.
- Fecha, rama y commit:
- Dependencias verificadas:

## Cambios y alcance

Archivos, comportamiento antes/después y requisitos. Registrar cambio de contrato/esquema y migración. En documentación, explicar decisiones y revisión realizada.

## Evidencia

| Caso / requisito | Preparación y comando o pasos | Esperado | Observado | Estado | Evidencia portable |
|---|---|---|---|---|---|
| Completar al ejecutar | | | | | |

Incluir éxito, rechazos y excepciones de la tarea. Indicar versión/configuración y datos sintéticos; nunca secretos ni payloads reales.

## Integridad y recuperación

Qué se verificó después de rollback/reintento; qué se conserva al reiniciar; cómo revertir sin borrar datos. En tareas documentales, explicar que no aplica.

## Pendientes y bloqueos

Causa, evidencia, dependencia, responsable y trabajo independiente. No convertir pruebas bloqueadas en PASS.

## Revisión automática e integración

PR, SHA revisado por Codex, enlace y resultado real; correcciones y nueva revisión cuando aplique. Registrar PASS/FAIL/BLOCKED sin inventar aprobación. La revisión del compañero es opcional. HECHA exige criterios y pruebas cumplidos, integración real y verificación posterior por el ejecutor; un PR abierto sigue EN_REVISION.

## Continuidad

Enlazar `plan/seguimiento/ID.md`: último commit, próxima acción, pruebas pendientes y estado de reserva. Si no se pudo terminar, dejar explícito qué falta y cómo reproducir el bloqueo.
