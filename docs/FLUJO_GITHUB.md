# Trabajo por tareas y revisión con Codex

## 1. Responsables y ramas

Integrantes: **JDaniC** y **Davidix888**. Cualquiera puede tomar IDs P1/P2; son lotes históricos. Codex revisa automáticamente el PR; la revisión del compañero es opcional. develop es la rama de integración (en minúsculas); main recibe entregas revisadas. No usar Frontend/Backend como ramas permanentes para nuevas tareas.

Antes de empezar, integrar el plan ya preparado mediante un PR documental `[PLAN] Integrar planificación`. No publicar cambios ajenos ni todo el directorio de trabajo por accidente. El validador rechaza tareas que todavía no estén en plan/06_TABLERO.md.

## 2. Una tarea por rama

Desde un checkout limpio:

```sh
git fetch origin
git switch -c codex/e00-p1-01-contratos origin/develop
```

Leer dependencias y criterios en el plan, actualizar estado a EN_CURSO y trabajar solo en la tarea. Guardar evidencia de éxito/fallo/excepción, ejecutar pruebas y actualizar a EN_REVISION. Publicar la rama y abrir PR a develop con título `[E00-P1-01] Contratos`. Cualquiera usa IDs P1 o P2 conservando el ID de la tarea. Los IDs son permanentes.

Si hay cambios locales pendientes, usar otro worktree; no usar reset/clean ni borrar volúmenes. Si una dependencia está bloqueada, registrar BLOQUEADA y avanzar solo tareas independientes.

## 3. Conectar Codex (sin API key)

En el navegador habitual abrir https://chatgpt.com/settings/code-review, iniciar sesión y conectar GitHub con acceso a JDaniC/Proyecto_2_Base_de_datos_II. Seleccionar el repositorio y activar Automatic review para All PRs. La disponibilidad depende de la cuenta y sus límites. No pegar tokens en GitHub ni en chats.

Para una revisión manual comentar `@codex review` en el PR. Después de cambios, comprobar que la revisión corresponde al commit actual y solicitar otra si hace falta. Si no aparece el repositorio, comprobar permisos de la conexión. Si no responde el bot, revisar conexión, configuración y disponibilidad de la cuenta; no asumir aprobado.

Documentación: https://developers.openai.com/codex/integrations/github

## 4. Comprobaciones e integración

CI ejecuta únicamente contrato-pr: valida identificador, rama, destino y las excepciones documentales. Este flujo no instala MCP ni levanta bases de datos. Las pruebas funcionales y compilaciones de cada tarea se adjuntan como evidencia y las verifica el compañero; no se certifican automáticamente con este check.

Protecciones previstas: PR obligatorio, cero aprobaciones humanas obligatorias, conversaciones resueltas, contrato-pr verde con rama actualizada, sin force push ni borrado de ramas protegidas. Codex no es por sí solo un estado obligatorio de CI: el responsable debe comprobar sus resultados; no hay un bloqueo automático que certifique que Codex terminó.

Si CI falla, corregir o documentar un bloqueo real; no desactivar la comprobación. Si Codex encuentra un error, corregir y volver a revisar. Desacuerdos se resuelven con evidencia en el PR. No marcar HECHA automáticamente al fusionar: verificar criterios y cierre humano en el tablero.

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
