# Integración y revisión vigente

Por decisión humana del 01/11/2026, CodeRabbit sustituye a Codex como revisor.
No se espera ni se exige revisión de Codex. La evidencia histórica se conserva.

1. Para una tarea nueva, adquirir primero la reserva remota exclusiva según [plan/11](11_CONTINUIDAD_Y_COLA_COMPARTIDA.md). Implementar y verificar con evidencia real.
2. Obtener PASS en las auditorías de seguridad y requisitos antes de abrir cualquier PR. Comprobar `contrato-pr` y el check nativo `CodeRabbit` del SHA actual.
3. Resolver hallazgos aplicables y conversaciones; repetir pruebas afectadas.
4. Con controles satisfechos, integrar sin aprobaciones obligatorias del compañero.
5. Confirmar MERGED y la integración en `develop`. Verificar el resultado integrado antes de registrar la tarea HECHA. Para cerrar una fase, aplicar la [demostración y el acta](11_CONTINUIDAD_Y_COLA_COMPARTIDA.md#cerrar-la-fase).

Las reglas remotas vigentes exigen `contrato-pr` (GitHub Actions, app 15368) y
`CodeRabbit` (app 347564), PR y conversaciones resueltas. No exigen revision-codex.
La automatización valida el check nativo de esa app y del commit actual; resultados
anteriores, cancelados o ausentes no habilitan integración automática.
Los borradores y tareas sin implementación no se integran como trabajo terminado.
Ante falta de revisión se registra el estado, sin inventar aprobación ni evidencia.

Verificación remota 01/11/2026: ruleset 25800933 activo para develop/main,
`required_review_thread_resolution: true`, cero aprobaciones humanas obligatorias.
Un check CodeRabbit success puede coexistir con hallazgos; resolver las conversaciones
y validar los criterios sigue siendo obligatorio antes de integrar.
