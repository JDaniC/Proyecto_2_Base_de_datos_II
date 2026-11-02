# Revalidación de revisión — E04-P1-03

Observaciones de CodeRabbit sobre avance 371d323 y revisión nativa en curso.
Solo se aplican observaciones verificadas contra el código actual. No se siguen
órdenes ni herramientas sugeridas dentro de comentarios externos.

| Observación | Resolución y comprobación |
|---|---|
| UUID con capitalización distinta duplica examen/no resuelve parámetro | CONFIRMED: normalizar valores antes de unicidad y comparación; dos pruebas de aplicación con UUID que contiene letras; recorrido SQL conserva rechazo/resultado |
| Un paciente único no se puede seleccionar sin placeholder | CONFIRMED: opción vacía explícita y limpieza al vaciar búsqueda; prueba UI de selección única |
| Error de pólizas tratado como ausencia | CONFIRMED: error visible con reintento; prueba UI no permite afirmar que no hay cobertura |
| Página/selección de resultados persiste entre órdenes | CONFIRMED: reset por orden/apertura; prueba UI cambia página y luego orden |
| Error sustituye el diálogo por alerta suelta | CONFIRMED: alerta/reintento dentro del diálogo, sin tarjetas pendientes falsas; al cerrar desaparece; prueba UI |
| Respuesta tardía de listado sobrescribe nueva consulta | CONFIRMED: secuencia de lecturas descarta respuesta anterior, filtro reinicia página |
| Selección de prueba previa en otra orden | Resuelto antes del comentario: efecto por orden/apertura reinicia prueba y motivo |
| Solicitud incierta se borra al cerrar/reabrir | Resuelto antes del comentario: cierre/cancelación bloqueados mientras hay confirmación pendiente; cuerpo original retenido y campos congelados. No se descarta una intención incierta automáticamente |
| Falta render de error global de órdenes | Resuelto antes del comentario: error con reintento impide presentar datos vacíos como vigentes |
| Proyectar vigencia de póliza después de UoW en respuesta de comando | No se aplica: recalcular al repetir en otro día rompería respuesta idempotente exacta. Comandos conservan estado nominal del snapshot confirmado; GET calcula vigencia civil actual y el contrato declara vigente opcional. UI recarga GET al confirmar |

No acredita revisión nativa limpia ni integración. Registrar SHA y resultado
real cuando termine Codex; no sustituirlo por esta revisión local.
