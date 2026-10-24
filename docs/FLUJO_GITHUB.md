# Trabajo por tareas y revisión con Codex

## 1. Responsables y ramas

P1: **JDaniC**. P2: **Davidix888**. El compañero aprueba el PR; Codex aporta revisión adicional. Develop es la rama de integración (respetar mayúscula); main recibe entregas revisadas. No usar Frontend/Backend como ramas permanentes para nuevas tareas.

Antes de empezar, integrar el plan ya preparado mediante un PR documental `[PLAN] Integrar planificación`. No publicar cambios ajenos ni todo el directorio de trabajo por accidente. El validador rechaza tareas que todavía no estén en plan/06_TABLERO.md.

## 2. Una tarea por rama

Desde un checkout limpio:

```sh
git fetch origin
git switch -c codex/e00-p1-01-contratos origin/Develop
```

Leer dependencias y criterios en el plan, actualizar estado a EN_CURSO y trabajar solo en la tarea. Guardar evidencia de éxito/fallo/excepción, ejecutar pruebas y actualizar a EN_REVISION. Publicar la rama y abrir PR a Develop con título `[E00-P1-01] Contratos`. David usa IDs P2 y Daniel P1. Los IDs son permanentes.

Si hay cambios locales pendientes, usar otro worktree; no usar reset/clean ni borrar volúmenes. Si una dependencia está bloqueada, registrar BLOQUEADA y avanzar solo tareas independientes.

## 3. Conectar Codex (sin API key)

En el navegador habitual abrir https://chatgpt.com/settings/code-review, iniciar sesión y conectar GitHub con acceso a JDaniC/Proyecto_2_Base_de_datos_II. Seleccionar el repositorio y activar Automatic review para All PRs. La disponibilidad depende de la cuenta y sus límites. No pegar tokens en GitHub ni en chats.

Para una revisión manual comentar `@codex review` en el PR. Después de cambios, comprobar que la revisión corresponde al commit actual y solicitar otra si hace falta. Si no aparece el repositorio, comprobar permisos de la conexión. Si no responde el bot, revisar conexión, configuración y disponibilidad de la cuenta; no asumir aprobado.

Documentación: https://developers.openai.com/codex/integrations/github

## 4. Comprobaciones e integración

CI ejecuta únicamente contrato-pr: valida identificador, rama, destino y las excepciones documentales. Este flujo no instala MCP ni levanta bases de datos. Las pruebas funcionales y compilaciones de cada tarea se adjuntan como evidencia y las verifica el compañero; no se certifican automáticamente con este check.

Protecciones previstas: PR obligatorio, una aprobación del compañero, descartar aprobaciones tras nuevos commits, conversaciones resueltas, contrato-pr verde con rama actualizada, sin force push ni borrado de ramas protegidas. Codex no es por sí solo un estado obligatorio de CI: el revisor humano debe revisar sus resultados; no hay un bloqueo automático que certifique que Codex terminó.

Si CI falla, corregir o documentar un bloqueo real; no desactivar la comprobación. Si Codex encuentra un error, corregir y volver a revisar. Desacuerdos se resuelven con evidencia en el PR. No marcar HECHA automáticamente al fusionar: verificar criterios y cierre humano en el tablero.

Tras la aprobación usar Squash and merge o habilitar auto-merge para ese PR. Auto-merge espera las reglas de GitHub; no genera código ni resuelve hallazgos por sí mismo. Para una entrega abrir PR desde Develop a main con título `[ENTREGA-E00] descripción` y evidencia de la fase.

## 5. Excepciones limitadas

`[CONFIG-GITHUB] descripción` solo admite .github/, scripts/github/, docs/FLUJO_GITHUB.md y AGENTS.md. `[PLAN] descripción` solo admite plan/ y guías AGENTS. Ambas conservan pruebas y revisión humana. El validador comprueba estructura e IDs, no reemplaza la auditoría funcional ni verifica por sí solo todas las dependencias del tablero.

## 6. Activación y diagnóstico

La configuración versionada entra en Develop al aprobar y fusionar el PR inicial. Las reglas remotas y acceso del compañero deben verificarse en Settings. Si David no puede aprobar, debe aceptar la invitación y tener escritura. Si faltan checks, comprobar que el workflow existe en la rama del PR y que Actions puede ejecutarse. No fusionar mediante bypass para sortear un fallo.
