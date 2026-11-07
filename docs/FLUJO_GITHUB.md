# Trabajo por tareas y revisión con CodeRabbit

## 1. Responsables y ramas

Integrantes: **JDaniC** y **Davidix888**. Cualquiera puede tomar IDs P1/P2; son lotes históricos. CodeRabbit revisa automáticamente el PR; la revisión del compañero es opcional. develop es la rama de integración (en minúsculas); main recibe entregas revisadas. No usar Frontend/Backend como ramas permanentes para nuevas tareas.

Consultar la cola vigente en el tablero y cotejarla con PR y reservas remotas. Si una reformulación solo existe localmente, integrarla por separado cuando esté autorizada, antes de usarla como cola compartida. Revisar los archivos que se van a publicar para separar cambios ajenos.

## 2. Una tarea por rama

Desde un checkout limpio:

```sh
git fetch origin
git switch -c codex/e00-p1-01-contratos origin/develop
```

Leer las dependencias y criterios. Publicar rama y seguimiento de la reserva, y adquirir la referencia exclusiva por creación atómica antes de implementar. Guardar evidencia de éxito, fallo y excepción. Abrir PR a `develop` tras ambas auditorías PASS, con un título como `[E05-P2-03] Conectar el circuito analítico`. Registrar EN_REVISION y el enlace del PR en el tablero.

Si hay cambios locales pendientes, usar otro worktree; no usar reset/clean ni borrar volúmenes. Si una dependencia está bloqueada, registrar BLOQUEADA y avanzar solo tareas independientes.

## 3. Revisar con CodeRabbit

CodeRabbit es el revisor automático vigente. Comprobar el check nativo `CodeRabbit` correspondiente al SHA actual del PR. Si no aparece, solicitar `@coderabbitai full review` una vez y verificar que se crea el check correspondiente. No asumir aprobado por silencio ni repetir solicitudes en bucle.

El responsable valida las pruebas y los hallazgos aplicables; debe corregirlos y resolver sus conversaciones antes de integrar. Una conclusión exitosa del check no equivale por sí sola a ausencia de hallazgos. La revisión del compañero es opcional.

## 4. Comprobaciones e integración

El workflow de CI ejecuta las pruebas de herramientas de coordinación y valida `contrato-pr`: identificador, rama, destino y excepciones documentales. Este flujo no instala MCP ni levanta bases de datos. Las pruebas funcionales y compilaciones de cada tarea se adjuntan como evidencia y las verifica el responsable; no se certifican automáticamente con este check.

Protecciones previstas: PR obligatorio, cero aprobaciones humanas obligatorias, conversaciones resueltas, contrato-pr verde con rama actualizada, sin force push ni borrado de ramas protegidas. La puerta `CodeRabbit` exige el check nativo exitoso del SHA actual. El ruleset activo exige además conversaciones resueltas y contrato-pr verde; el responsable verifica los hallazgos aplicables.

Si CI falla, corregir o documentar un bloqueo real; no desactivar la comprobación. Si CodeRabbit encuentra un error, corregir y volver a revisar. Desacuerdos se resuelven con evidencia en el PR. No marcar HECHA automáticamente al fusionar: verificar criterios y cierre real en el tablero.

Tras completar la revisión automática y comprobar su resultado, usar Squash and merge o habilitar auto-merge para ese PR. Auto-merge espera las reglas de GitHub; no genera código ni resuelve hallazgos por sí mismo. Si está autorizado presentar el candidato en `main`, abrir el PR desde `develop` con título `[ENTREGA-E05] descripción` y evidencia del cierre técnico.

## 5. Excepciones limitadas

`[CONFIG-GITHUB] descripción` solo admite .github/, scripts/github/, plan/, .agents/rules/, docs/FLUJO_GITHUB.md, README.md y AGENTS.md; no código de aplicación. `[PLAN] descripción` solo admite plan/ y guías AGENTS. Ambas conservan el check y la revisión automática. El validador comprueba estructura e IDs, no reemplaza la auditoría funcional ni verifica por sí solo todas las dependencias del tablero.

## 6. Activación y diagnóstico

La configuración versionada entra en develop al aprobar y fusionar el PR inicial. Las reglas remotas y acceso del compañero deben verificarse en Settings. Las aprobaciones humanas son opcionales. Si faltan checks, comprobar que el workflow existe en la rama del PR y que Actions puede ejecutarse. No fusionar mediante bypass para sortear un fallo.

## Consolidación inicial

El PR `[INTEGRACION-INICIAL] Consolidar frontend y documentación` desde Frontend admite importar el trabajo existente antes de comenzar las tareas. Esta excepción conserva el check; no exige aprobación humana. Al fusionar, eliminar Frontend y las ramas antiguas; quedan main y develop como ramas permanentes. Las ramas nuevas de tareas serán temporales.

## Continuidad entre agentes y personas

Leer [cola compartida y traspaso](../plan/11_CONTINUIDAD_Y_COLA_COMPARTIDA.md). La reserva se adquiere mediante la referencia exclusiva. Antes de retomar, revisar rama, commits, seguimiento y referencia activa. El cambio de persona no cambia ID ni crea una tarea paralela. Antigravity lee AGENTS.md y la regla .agents/rules/00-continuidad.md al abrir la raíz del proyecto.

## Mantenimiento solicitado

`[MANTENIMIENTO] descripción` admite limpieza de Frontend/, plan/, configuración de GitHub y guía UI sustituida. No permite modificar Backend/ ni Database/ con esa excepción. Este trabajo responde a una solicitud humana de mantenimiento y no marca como HECHA ninguna tarea del producto. Mantiene contrato-pr y las protecciones vigentes.

## Fusión automática y diagnóstico

La rama predeterminada es develop; main se conserva para las entregas. Los workflows de eventos y comentarios se cargan desde la rama predeterminada. El anterior pull_request_target no se ejecutaba porque solo existía en develop mientras la predeterminada era main.

El flujo actual responde a la finalización de «Validación del proyecto», a checks, comentarios del PR y ejecución manual. Solo ejecuta el script de la rama predeterminada, nunca código del PR con permisos de escritura. Comprueba el check nativo `CodeRabbit` de la app 347564 sobre el SHA actual, completado con conclusión `success`. Un check ausente, anterior o incompleto mantiene la espera; no aceptar silencio como aprobación.

Con el check CodeRabbit exitoso del SHA actual se habilita auto-merge squash; GitHub espera además contrato-pr, conversaciones resueltas y las demás reglas del repositorio. El responsable verifica los hallazgos aplicables antes de resolverlos. GitHub puede eliminar la rama fusionada. Si queda una rama rezagada, comprobar punta, PR integrados, reservas y worktrees según el cierre de fase de plan/11 antes de retirarla. Borradores y forks no se integran con este flujo. No exige aprobación de David. Si la rama queda desactualizada, actualizarla, repetir checks y obtener revisión del nuevo SHA.

Para reevaluar un PR existente: `gh workflow run auto-merge.yml --ref develop -f pr=7` (cambiar el número). Si falta el check CodeRabbit del SHA actual, solicitar `@coderabbitai full review` una vez y esperar el check correspondiente. No repetir comentarios en bucle ni usar --admin. La ejecución manual evalúa, no fabrica un resultado del bot.

Fuentes: https://github.blog/changelog/2025-11-07-actions-pull_request_target-and-environment-branch-protections-changes/ y https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow
