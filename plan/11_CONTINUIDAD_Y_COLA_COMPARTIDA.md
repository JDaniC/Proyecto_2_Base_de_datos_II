# Cola compartida y continuidad entre chats

Política vigente desde el 24/10/2026. Daniel (JDaniC) y David (Davidix888) pueden ejecutar cualquier tarea; no necesitan autorización del otro por tratarse de un ID del lote P1 o P2. El trabajo sigue dependencias técnicas, no disponibilidad de una persona concreta.

## 1. Fuentes de verdad y carga inicial

Antigravity debe abrir la raíz del repositorio, donde están AGENTS.md y .agents/rules/00-continuidad.md. La regla `always_on` y AGENTS dirigen cada chat al contexto guardado en archivos. Estos archivos deben estar versionados y actualizados en ambos equipos. No se depende de la memoria del chat anterior ni de rutas Downloads de Daniel.

Leer en este orden:

1. `AGENTS.md`: restricciones, alcance y arquitectura.
2. `plan/ESTADO_ACTUAL.md`: corte verificado, límites conocidos y próxima entrada. Es una orientación; confirmar con Git y código.
3. Este protocolo, `plan/00_PLAN_MAESTRO.md`, `plan/01_ALCANCE_Y_DECISIONES.md` y `plan/06_TABLERO.md`.
4. Estado Git, ramas/PR abiertos y archivos reales; comparar local/remoto sin descartar cambios.
5. Seguimiento `plan/seguimiento/ID.md` si existe, archivo de tarea y fuentes indicadas. Leer contratos/arquitectura antes de backend/integración.

La primera respuesta de ejecución indica: estado observado, ID, ejecutor actual, dependencia satisfecha o pendiente y resultado que se verificará. Si el usuario solo pide explicación/planificación, responder o actualizar documentación sin empezar backend. Si pide una tarea concreta, ejecutar esa tarea; si pide «la siguiente», elegir entre ambos lotes.

## 2. Elegir la siguiente tarea

Los índices `COLA_P1.md`/`COLA_P2.md` y `entregas/*/01_P1.md`/`02_P2.md` son agrupaciones históricas. No cambiar IDs ni copiar la tarea al otro lote cuando cambie el ejecutor.

Ejecutar `python3 scripts/github/cola.py` (o `--json`) para calcular disponibilidad con el tablero local. El helper es de lectura: no reserva, no comprueba GitHub y no cambia estados. Una tarea está disponible cuando está PENDIENTE, sin ejecutor, todas sus dependencias están HECHA y la fase anterior tiene sus seis tareas y cierre HECHA. E00 no requiere fase previa. Si falla la lectura/consistencia del tablero, corregir la fuente antes de elegir; no asumir que todo está libre.

Antes de modificar código comprobar además que las dependencias están integradas realmente en develop, que no existe PR abierto para el mismo ID y que no hay reserva de archivos comunes. Primero retomar la tarea propia activa cuando corresponda; en otro caso priorizar la primera libre de la fase más temprana y, dentro de ella, la que desbloquea trabajo. No tomar una tarea bloqueada sin resolver su causa.

Ejemplo: si Daniel termina una tarea P1 y E00-P2-02 está libre con dependencias cumplidas, puede tomar E00-P2-02. Conserva ese ID; el ejecutor actual pasa a JDaniC. La fecha objetivo y criterios siguen siendo los mismos.

## 3. Reserva visible y concurrencia

Una tarea tiene un ejecutor activo, una rama y un PR. Una modificación del tablero que solo está en el equipo local no es una reserva compartida.

1. Consultar `git status`, actualizar referencias remotas sin sobrescribir cambios y revisar PR abiertos a develop. Si el checkout contiene trabajo ajeno, conservarlo; usar otro checkout/worktree apropiado, nunca reset/clean.
2. Crear rama temporal `codex/e00-p2-02-descripcion` desde develop actualizado. No usar ramas permanentes por persona o área.
3. En el tablero de esa rama registrar ejecutor GitHub real, estado EN_CURSO y evidencia `reservada; rama; fecha`. Crear seguimiento desde la plantilla con la siguiente acción y archivos comunes que ocupará. No atribuir la identidad a partir de P1/P2: obtenerla de la cuenta activa o de la instrucción humana.
4. Guardar ese avance y publicar la rama; abrir PR borrador con título `[E00-P2-02] descripción`. Antes de implementar, volver a listar PR para detectar duplicados. El número/enlace del PR se registra en seguimiento y tablero.
5. Si dos personas reservaron casi a la vez, prevalece el PR abierto con menor número. El segundo no continúa en paralelo: conserva sus cambios, libera su reserva y toma otra tarea. Esta es una regla de coordinación, no un candado distribuido automático.

Las reservas de PR abiertos se consultan además del tablero de develop, que solo recoge lo integrado. No crear otro tablero de estados: el seguimiento describe avance y el PR hace visible la reserva. Un PR borrador no está terminado; convertirlo a listo para revisión cuando cumpla los criterios.

Si GitHub no está accesible, se puede inspeccionar y preparar trabajo independiente, pero no declarar reserva compartida ni iniciar una segunda implementación de una tarea que podría estar ocupada. Registrar ese límite. No fabricar exclusividad con un timeout.

## 4. Retomar o transferir una tarea

- **PENDIENTE y libre:** cualquiera la reserva sin permiso adicional.
- **Mismo ejecutor, chat nuevo:** leer seguimiento, diff y último commit; continuar la rama/PR existentes. No crear un ID o implementación duplicados.
- **Otro ejecutor con reserva liberada, traspaso documentado o petición humana de retoma:** revisar PR, commits y seguimiento, registrar de→a con fecha y motivo, cambiar ejecutor y continuar la misma rama/PR si se tiene acceso. Si la rama no es accesible, crear sustitución solo dejando enlace y cerrando la anterior cuando los cambios estén preservados.
- **Otro ejecutor activo sin traspaso:** no pisar cambios ni asumir abandono por ausencia de mensajes. Elegir otra tarea libre; si no existe, comunicar el conflicto concreto para coordinarlo.
- **BLOQUEADA:** el nuevo ejecutor puede resolver la causa; no cambiar a EN_CURSO solo por cambiar de persona.

Para liberar una tarea empezada, subir los commits propios y el seguimiento, dejarla BLOQUEADA con causa `liberada para retoma; avance en rama/PR` y ejecutor `—`; mantener el PR borrador. Se conserva evidencia y no se devuelve a PENDIENTE una tarea con avance que otro pudiera duplicar. La retoma documentada cambia a EN_CURSO cuando la causa esté resuelta. Si no hubo ningún avance y se cierra el PR vacío, puede volver a PENDIENTE.

## 5. Ejecutar hasta cerrar el flujo

1. Leer el trabajo concreto, dependencias, rutas y criterios del ID; resolver supuestos usando fuentes y decisiones del plan. No ampliar el alcance sin necesidad.
2. Implementar con los límites hexagonales y preservar la UI vigente. Reservar archivos comunes en el seguimiento; no están asignados de forma exclusiva a Daniel o David.
3. Ejecutar pruebas proporcionales de éxito, rechazo y excepción, y compilación cuando corresponda. Usar datos sintéticos y motores aislados. Registrar resultados nuevos y distinguir mocks, emuladores y motores.
4. Completar cierre de tarea y seguimiento, publicar commits y pasar a EN_REVISION; convertir el PR a listo. Comprobar contrato-pr y el resultado real de Codex para el SHA actual. Si el disparador automático no cubre ese evento, solicitar `@codex review` una vez y verificar respuesta; no repetir comentarios en bucle.
5. Ante hallazgos, reproducir/corregir y repetir pruebas/revisión afectadas. Cero aprobaciones humanas obligatorias. La puerta revision-codex exige que Codex termine sobre el SHA actual sin hallazgos; contrato-pr por separado no acredita la revisión.
6. Con criterios satisfechos, revisión automática real y merge autorizado por la petición de ejecución, fusionar el PR sin bypass de las protecciones vigentes. «Ejecuta la tarea hasta terminar el flujo» incluye rama, PR e integración de esa tarea; una solicitud de plan/revisión no autoriza fusionar código. Si solo se autorizó preparar PR, detenerse allí.
7. Confirmar en GitHub que el PR está MERGED y que develop contiene el cambio; actualizar referencias y verificar el flujo integrado. Solo entonces registrar HECHA y evidencia de integración. Para registrar el cierre puede publicarse un PR documental `[PLAN] Cerrar ID`, conservando trazabilidad al PR de implementación, sin fingir que el cierre ya se integró. Eliminar la rama de tarea una vez integrado todo su trabajo propio y sin descartar cambios locales.

El cierre de fase también exige su demostración y evidencia; las seis tareas HECHA no reemplazan el criterio integrado. Una sesión cierra una tarea autorizada; no arranca las 48 por defecto.

## 6. Salida cuando falta algo

Si faltan herramientas, credenciales, acceso, revisión del bot, dependencias o pruebas, avanzar solo lo independiente. No solicitar secretos en chat ni utilizar credenciales reales para pruebas. Dejar estado EN_REVISION si espera revisión/integración; BLOQUEADA si no puede ejecutarse por una causa externa, con evidencia y siguiente paso concreto.

Antes de terminar cualquier chat de ejecución, actualizar `plan/seguimiento/ID.md` con último commit/rama/PR, cambios propios pendientes de commit, pruebas realizadas, errores exactos saneados y la próxima acción reproducible. Si no se pudo publicar, indicar `LOCAL_NO_PUBLICADO` y qué archivos/commits no están en remoto. No prometer que el compañero puede continuar trabajo que no recibió.

## 7. Uso en Antigravity y comprobación

En un chat nuevo se puede escribir:

- «Lee el contexto del proyecto y continúa con la siguiente tarea disponible hasta cerrar su flujo».
- «Retoma E00-P2-02 desde su último seguimiento».
- «Solo revisa el estado; no implementes todavía».

Verificar la carga una vez abriendo un chat nuevo en la raíz y pidiendo: «Sin editar archivos, dime el estado actual, las tareas disponibles y el protocolo de reserva». Debe mencionar backend pendiente, ambos lotes abiertos a cualquiera, dependencias, reservas y revisión automática. Si no lo hace, comprobar en Customizations → Rules que la regla de workspace esté activa y abrir la raíz correcta. No se modifican reglas globales ni permisos personales de Antigravity.

Las reglas aportan instrucciones persistentes; no arrancan trabajo por abrir la aplicación, no recuperan chats anteriores y no garantizan ejecución infalible. La memoria portable está en Git y seguimiento. Cada equipo necesita obtener los commits más recientes.

Configuración verificada documentalmente el 24/10/2026:
https://www.antigravity.google/docs/rules/
