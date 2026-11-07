# Integración y revisión vigente

CodeRabbit revisa los PR. El responsable verifica el alcance y la evidencia. La revisión del compañero es opcional.

1. Para una tarea nueva, adquirir la reserva exclusiva según [plan/11](11_CONTINUIDAD_Y_COLA_COMPARTIDA.md).
2. Obtener PASS en las auditorías de seguridad y requisitos antes de abrir cualquier PR.
3. Verificar `contrato-pr`, el check nativo `CodeRabbit` y una revisión `APPROVED` de CodeRabbit sobre el commit actual. Resolver los hilos aplicables.
4. Confirmar la integración en `develop`, verificar el resultado y registrar el cierre en el tablero.

El check nativo de la app 347564 acredita que su ejecución terminó. La revisión de la cuenta `coderabbitai[bot]` acredita el veredicto. `revision-coderabbit` combina ambos requisitos y retira la solicitud de auto-merge si la aprobación falta, es anterior, se descarta o hay cambios solicitados. GitHub exige además conversaciones resueltas y `contrato-pr`. [Significado del check nativo](https://docs.coderabbit.ai/pr-reviews/status-check)

La configuración vive en [`.coderabbit.yaml`](../.coderabbit.yaml). `develop` recibe revisiones como rama predeterminada. `main` se incluye de forma explícita. La señal de una revisión nueva o descartada se ejecuta con permisos vacíos. El flujo que puede escribir estados y solicitar la fusión ejecuta el script de la rama predeterminada. La descripción y la cobertura de docstrings generan avisos. Los requisitos de título, alcance y auditorías siguen el contrato y el protocolo del repositorio.

## Puesta en marcha

1. Abrir una ventana de cambio y pausar las demás fusiones. Desactivar el workflow anterior de auto-merge. Cancelar o esperar sus ejecuciones pendientes y en curso y confirmar que todas terminaron. Establecer la variable de repositorio `CODERABBIT_ROLLOUT_PAUSED=true` y retirar las solicitudes en espera. Guardar el valor previo de auto-merge de GitHub y desactivarlo temporalmente.
2. Integrar únicamente el PR de automatización tras la aprobación real de CodeRabbit y las protecciones existentes. Habilitar el workflow actualizado en `develop` y reevaluar todos los PR elegibles. Con la variable activa, tanto los eventos automáticos como la ejecución manual publican estados y retiran solicitudes existentes. Una aprobación comprobada se publica como pendiente durante la pausa para mantener cerrado el control de fusión.
3. Comprobar estados del SHA actual y la ausencia de solicitudes de auto-merge. Exigir `revision-coderabbit` con origen GitHub Actions en el ruleset de `develop` y `main`. Conservar los checks nativos y los hilos obligatorios. Confirmar la regla antes de restaurar el auto-merge de GitHub y retirar la variable de pausa. Ejecutar `gh workflow run auto-merge.yml --ref develop` para reevaluar los PR abiertos con la configuración normal.
