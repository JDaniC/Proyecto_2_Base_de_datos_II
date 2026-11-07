# Integración y revisión vigente

CodeRabbit revisa los PR. El responsable verifica el alcance y la evidencia. La revisión del compañero es opcional.

1. Para una tarea nueva, adquirir la reserva exclusiva según [plan/11](11_CONTINUIDAD_Y_COLA_COMPARTIDA.md).
2. Obtener PASS en las auditorías de seguridad y requisitos antes de abrir cualquier PR.
3. Verificar `contrato-pr`, el check nativo `CodeRabbit` y una revisión `APPROVED` de CodeRabbit sobre el commit actual. Resolver los hilos aplicables.
4. Confirmar la integración en `develop`, verificar el resultado y registrar el cierre en el tablero.

El check nativo de la app 347564 acredita que su ejecución terminó. La revisión de la cuenta `coderabbitai[bot]` acredita el veredicto. `revision-coderabbit` combina ambos requisitos y retira la solicitud de auto-merge si la aprobación falta, es anterior, se descarta o hay cambios solicitados. GitHub exige además conversaciones resueltas y `contrato-pr`. [Significado del check nativo](https://docs.coderabbit.ai/pr-reviews/status-check)

La configuración vive en [`.coderabbit.yaml`](../.coderabbit.yaml). `develop` recibe revisiones como rama predeterminada. `main` se incluye de forma explícita. La señal de una revisión nueva o descartada se ejecuta con permisos vacíos. El flujo que puede escribir estados y solicitar la fusión ejecuta el script de la rama predeterminada.

## Puesta en marcha

1. Abrir una ventana de cambio para pausar las demás fusiones. Registrar la configuración de auto-merge, suspender temporalmente nuevas solicitudes y retirar las que estén en espera en otros PR. Verificar que estén desactivadas.
2. Integrar el cambio de automatización tras la revisión real de CodeRabbit. Reejecutar el evaluador en `develop` y comprobar el estado nuevo de cada PR elegible en el SHA actual. Verificar que los PR sin aprobación tienen auto-merge desactivado.
3. Exigir `revision-coderabbit` con origen GitHub Actions en el ruleset de `develop` y `main`. Conservar los checks nativos y los hilos obligatorios. Después de comprobar la regla, restaurar la configuración normal de auto-merge. [Reglas de GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
