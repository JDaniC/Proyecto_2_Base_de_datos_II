# Arnés inicial de aceptación

Estos tests usan el runner integrado de Node.js y no requieren instalar paquetes:

```sh
node --test Backend/tests/contratos/*.test.mjs
```

El incremento E00-P2-03 valida la configuración de destino aislado, el formato de resultados y la coherencia estructural de fixtures sintéticos. No inicia servidores ni conecta drivers, emuladores, Firebase Auth, API o bases de datos. Por ello no acredita persistencia, autorización ejecutada, transacciones, rollback, concurrencia ni que CA01–CA20 hayan pasado.

`contextos-aceptacion-v1.json` es semilla de configuración para futuros bundles de prueba. `bundles_prueba` vincula institución y motor únicamente en el harness; `escenarios.actor_uid` identifica la cuenta sintética que el harness deberá autenticar. Ninguno de esos campos autoriza a aceptar institución, actor o rol desde una petición HTTP.

Antes de preparar cualquier recurso, el adaptador futuro debe pasar su destino a `validarDestinoAislado` o `ejecutarEnDestinoAislado`. Se permite únicamente loopback y una base o proyecto demo únicos por ejecución. `crearRunId()` genera el sufijo hexadecimal aleatorio de 128 bits que debe conservarse durante esa ejecución. Las rutinas de preparación/limpieza serán provistas por cada entorno aislado; esta guardia no crea, migra ni destruye bases por sí misma.

Los resultados PASS y FAIL exigen esperado, observado y evidencia portable. BLOCKED, NOT_IMPLEMENTED y NOT_APPLICABLE requieren justificación. Un adaptador o caso que aún no exista se reporta NOT_IMPLEMENTED; un test sin aserciones no cuenta como aceptación.
