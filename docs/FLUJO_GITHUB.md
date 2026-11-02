# Trabajo por tareas y revisión con CodeRabbit

## 1. Responsables y ramas

Integrantes: **JDaniC** y **Davidix888**. Cualquiera puede tomar IDs P1/P2; son lotes históricos. CodeRabbit revisa automáticamente el PR; la revisión del compañero es opcional. develop es la rama de integración (en minúsculas); main recibe entregas revisadas. No usar Frontend/Backend como ramas permanentes para nuevas tareas.

Antes de empezar, integrar el plan ya preparado mediante un PR documental `[PLAN] Integrar planificación`. No publicar cambios ajenos ni todo el directorio de trabajo por accidente. El validador rechaza tareas que todavía no estén en plan/06_TABLERO.md.

## 2. Una tarea por rama

Desde un checkout limpio:

```sh
git fetch origin
git switch -c codex/e00-p1-01-contratos origin/develop
```

Leer dependencias y criterios en el plan, actualizar estado a EN_CURSO y trabajar solo en la tarea. Guardar evidencia de éxito/fallo/excepción, ejecutar pruebas y actualizar a EN_REVISION. Publicar la rama y abrir PR a develop con título `[E00-P1-01] Contratos`. Cualquiera usa IDs P1 o P2 conservando el ID de la tarea. Los IDs son permanentes.

Si hay cambios locales pendientes, usar otro worktree; no usar reset/clean ni borrar volúmenes. Si una dependencia está bloqueada, registrar BLOQUEADA y avanzar solo tareas independientes.

## 3. Revisar con CodeRabbit

CodeRabbit es el revisor automático vigente. Comprobar el check nativo `CodeRabbit` correspondiente al SHA actual del PR. Si no aparece, solicitar `@coderabbitai full review` una vez y verificar que se crea el check correspondiente. No asumir aprobado por silencio ni repetir solicitudes en bucle.

El responsable valida las pruebas y los hallazgos aplicables; debe corregirlos y resolver sus conversaciones antes de integrar. Una conclusión exitosa del check no equivale por sí sola a ausencia de hallazgos. La revisión del compañero es opcional.

## 4. Comprobaciones e integración

CI ejecuta únicamente contrato-pr: valida identificador, rama, destino y las excepciones documentales. Este flujo no instala MCP ni levanta bases de datos. Las pruebas funcionales y compilaciones de cada tarea se adjuntan como evidencia y las verifica el responsable; no se certifican automáticamente con este check.

Protecciones previstas: PR obligatorio, cero aprobaciones humanas obligatorias, conversaciones resueltas, contrato-pr verde con rama actualizada, sin force push ni borrado de ramas protegidas. La puerta `CodeRabbit` exige el check nativo exitoso del SHA actual. El ruleset activo exige además conversaciones resueltas y contrato-pr verde; el responsable verifica los hallazgos aplicables.

Si CI falla, corregir o documentar un bloqueo real; no desactivar la comprobación. Si CodeRabbit encuentra un error, corregir y volver a revisar. Desacuerdos se resuelven con evidencia en el PR. No marcar HECHA automáticamente al fusionar: verificar criterios y cierre real en el tablero.

Tras completar la revisión automática y comprobar su resultado, usar Squash and merge o habilitar auto-merge para ese PR. Auto-merge espera las reglas de GitHub; no genera código ni resuelve hallazgos por sí mismo. Para una entrega abrir PR desde develop a main con título `[ENTREGA-E00] descripción` y evidencia de la fase.

## 5. Excepciones limitadas

`[CONFIG-GITHUB] descripción` solo admite .github/, scripts/github/, plan/, .agents/rules/, docs/FLUJO_GITHUB.md, README.md y AGENTS.md; no código de aplicación. `[PLAN] descripción` solo admite plan/ y guías AGENTS. Ambas conservan el check y la revisión automática. El validador comprueba estructura e IDs, no reemplaza la auditoría funcional ni verifica por sí solo todas las dependencias del tablero.

## 6. Activación y diagnóstico

La configuración versionada entra en develop al aprobar y fusionar el PR inicial. Las reglas remotas y acceso del compañero deben verificarse en Settings. Si David no puede aprobar, debe aceptar la invitación y tener escritura. Si faltan checks, comprobar que el workflow existe en la rama del PR y que Actions puede ejecutarse. No fusionar mediante bypass para sortear un fallo.

## Consolidación inicial

El PR `[INTEGRACION-INICIAL] Consolidar frontend y documentación` desde Frontend admite importar el trabajo existente antes de comenzar las tareas. Esta excepción conserva el check; no exige aprobación humana. Al fusionar, eliminar Frontend y las ramas antiguas; quedan main y develop como ramas permanentes. Las ramas nuevas de tareas serán temporales.

## Continuidad entre agentes y personas

Leer [cola compartida y traspaso](../plan/11_CONTINUIDAD_Y_COLA_COMPARTIDA.md). Reservar con PR borrador; antes de retomar revisar rama, commits y seguimiento. El cambio de persona no cambia ID ni crea una tarea paralela. Antigravity lee AGENTS.md y la regla .agents/rules/00-continuidad.md al abrir la raíz del proyecto.

## Mantenimiento solicitado

`[MANTENIMIENTO] descripción` admite limpieza de Frontend/, plan/, configuración de GitHub y guía UI sustituida. No permite modificar Backend/ ni Database/ con esa excepción. Este trabajo responde a una solicitud humana de mantenimiento y no marca como HECHA ninguna tarea del producto. Mantiene contrato-pr y las protecciones vigentes.

## Fusión automática y diagnóstico

La rama predeterminada es develop; main se conserva para las entregas. Los workflows de eventos y comentarios se cargan desde la rama predeterminada. El anterior pull_request_target no se ejecutaba porque solo existía en develop mientras la predeterminada era main.

El flujo actual responde a la finalización de «Validación del proyecto», a checks, comentarios del PR y ejecución manual. Solo ejecuta el script de la rama predeterminada, nunca código del PR con permisos de escritura. Comprueba el check nativo `CodeRabbit` de la app 347564 sobre el SHA actual, completado con conclusión `success`. Un check ausente, anterior o incompleto mantiene la espera; no aceptar silencio como aprobación.

Con el check CodeRabbit exitoso del SHA actual se habilita auto-merge squash; GitHub espera además contrato-pr, conversaciones resueltas y las demás reglas del repositorio. El responsable verifica los hallazgos aplicables antes de resolverlos. Las ramas fusionadas se eliminan automáticamente. Borradores y forks no se integran con este flujo. No exige aprobación de David. Si la rama queda desactualizada, actualizarla, repetir checks y obtener revisión del nuevo SHA.

Para reevaluar un PR existente: `gh workflow run auto-merge.yml --ref develop -f pr=7` (cambiar el número). Si falta el check CodeRabbit del SHA actual, solicitar `@coderabbitai full review` una vez y esperar el check correspondiente. No repetir comentarios en bucle ni usar --admin. La ejecución manual evalúa, no fabrica un resultado del bot.

Fuentes: https://github.blog/changelog/2025-11-07-actions-pull_request_target-and-environment-branch-protections-changes/ y https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow
