# Integración de código y revisores

## 1. Alcance acordado

Solo lógica de GitHub: tarea → rama → PR → revisión → merge. No requiere instalar servidores MCP ni construir infraestructura adicional. La consolidación está en https://github.com/JDaniC/Proyecto_2_Base_de_datos_II/pull/2; no requiere aprobación humana. Las pruebas funcionales del proyecto conservan sus criterios, pero no se ejecutan como parte del workflow mínimo de integración.

## 2. Protocolo para ambos integrantes

1. Leer el ID y dependencias en el tablero; reservar tarea EN_CURSO. Cualquiera de los dos puede tomar P1/P2; registrar al ejecutor actual.
2. Desde develop actualizado crear `codex/e00-p1-01-descripcion` (usar el ID de la tarea elegida). La rama se crea al comenzar la tarea, no automáticamente al terminarla. Un bot revisor no crea tareas ni implementaciones por sí solo.
3. Implementar con evidencia de éxito, fallo y excepción; mantener archivos comunes bajo el responsable acordado.
4. Abrir PR a develop con título `[E00-P1-01] descripción`, alcance y evidencia; pasar a EN_REVISION.
5. Esperar `contrato-pr`, la revisión nativa de Codex y la revisión automática de Codex. Verificar que Codex revisó el commit actual; si hace falta comentar `@codex review`.
6. Resolver observaciones con código o evidencia, actualizar rama ante conflictos y repetir pruebas afectadas. El verde del contrato solo acredita el formato/ID/destino, no corrección funcional.
7. El responsable puede integrar tras la revisión automática y sus comprobaciones; squash merge o auto-merge por PR espera requisitos de GitHub. Codex no decide por sí solo el cierre humano. Después verificar integración y actualizar HECHA con evidencia real.
8. Por fase, cerrar su demostración; para entrega final usar PR develop → main `[ENTREGA-E07] Entrega final`.

## 3. Protecciones y límites

develop y main requieren PR, cero aprobaciones humanas obligatorias, conversaciones resueltas y contrato-pr verde con rama actualizada; se impiden force push y eliminación. No se exige CODEOWNERS ni aprobación del compañero.

La revisión de Codex se configura en la cuenta, no con una API key del repositorio. El usuario confirmó haber activado la configuración. La prueba de funcionamiento es una respuesta del bot en el PR; activar el ajuste no prueba retrospectivamente una revisión. El flujo actual no implementa un check adicional que obligue técnicamente a que Codex haya terminado: el responsable verifica ese paso. No interpretar ausencia de hallazgos como autorización para fusionar.

Para importar el plan local usar `[PLAN] descripción`; el validador limita esa excepción a plan/ y AGENTS. Conservar la guía completa local al reconciliarla con las Code Review Rules del PR inicial. La consolidación inicial incorpora el plan; verificar que su PR esté fusionado antes de iniciar tareas.

## 4. Revisores recomendados

- **Codex: revisor automático elegido.** Ya está elegido y su configuración fue activada por el usuario. Evita dedicar parte del plazo a varias instalaciones. Codex revisa el diff y sigue AGENTS; el responsable verifica criterios y ejecución; el compañero puede apoyar opcionalmente.
- **CodeRabbit: alternativa si prefieren un servicio dedicado a revisiones.** Ofrece revisiones y conversación sobre PR; revisar condiciones del plan/open source antes de instalar. No se instala ni se contrata como parte de este trabajo.
- **GitHub Copilot code review: alternativa si ya tienen acceso mediante su plan.** Está integrado en GitHub y propone correcciones. Su acceso y consumo dependen del plan. No hace falta sumar los tres bots en cada PR.

Fuentes consultadas el 24/10/2026:
- https://developers.openai.com/codex/integrations/github
- https://www.coderabbit.ai/pricing
- https://docs.github.com/en/copilot/concepts/agents/code-review

## 5. Modelo de Codex en GitHub

La documentación oficial de novedades identifica GPT-5.6 Sol para revisión de código en Codex Cloud de clientes elegibles y explica que el servicio selecciona el modelo automáticamente. Esto documenta la oferta del servicio, no demuestra el modelo de una ejecución particular de esta cuenta. El workflow de este repositorio no configura un modelo y la selección del modelo de la app local no fija el del bot. No usar `review_model` local como supuesto control de las revisiones alojadas.

Fuente: https://learn.chatgpt.com/docs/whats-new (sección “Use GPT-5.6 Sol for hosted Codex work”).

## Cola compartida

Seguir [continuidad y reservas](11_CONTINUIDAD_Y_COLA_COMPARTIDA.md). El prefijo P1/P2 del ID no limita autor, cuenta GitHub ni agente. El validador comprueba ID y rama, sin asignación personal.
