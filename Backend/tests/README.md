# Arnés de aceptación

Estos tests usan el runner integrado de Node.js y no requieren instalar paquetes:

```sh
node --test Backend/tests/contratos/*.test.mjs
```

El incremento E00-P2-03 valida la configuración de destino aislado, el formato de resultados y la coherencia estructural de fixtures sintéticos. No inicia servidores ni conecta drivers, emuladores, Firebase Auth, API o bases de datos. Por ello no acredita persistencia, autorización ejecutada, transacciones, rollback, concurrencia ni que CA01–CA20 hayan pasado.

`contextos-aceptacion-v1.json` aporta cuentas, profesionales, pacientes, citas, responsables, vínculos, catálogos, variantes y escenarios sintéticos. Incluye perfiles y estados iniciales para los cuatro bundles. `bundles_prueba` vincula institución y motor únicamente en el harness; los UID de `escenarios` identifican cuentas sintéticas que un adaptador futuro deberá autenticar. Ninguno de esos datos autoriza a aceptar institución, actor o rol desde una petición HTTP.

`matriz-aceptacion-v1.json` traza CA01–CA20 a fuentes y casos, y declara el nivel, prioridad, preparación, acción, resultado esperado, aplicabilidad y escenarios fixture. La suite expande casos por bundle y conserva exclusiones como `NOT_APPLICABLE`. Para ver el plan generado sin indicar ejecución funcional:

```sh
node Backend/tests/contratos/suite-aceptacion.mjs --resumen
```

Sin un executor de backend, cada caso aplicable sale como `NOT_IMPLEMENTED`; esto no significa que el criterio haya pasado. CA20 también permanece `NOT_IMPLEMENTED` hasta que existan el comparativo y las observaciones con evidencia. El executor futuro debe devolver un resultado explícito y evidencia portable para PASS/FAIL.

Antes de preparar cualquier recurso, el adaptador futuro debe pasar su destino a `validarDestinoAislado` o `ejecutarEnDestinoAislado`. Se permite únicamente una IP de loopback y una base o proyecto demo únicos por ejecución; nombres de host se rechazan. `crearRunId()` genera el sufijo hexadecimal aleatorio de 128 bits que debe conservarse durante esa ejecución. `ejecutarEnDestinoAislado` valida antes de invocar callbacks. La preparación puede registrar un handle que agrupe recursos parciales para que la limpieza también cubra un fallo durante el setup. Las rutinas de preparación/limpieza las provee cada entorno; la guardia no crea, migra ni destruye bases por sí misma y no es un sandbox de sistema operativo.

Los resultados PASS y FAIL exigen esperado, observado y evidencia portable. BLOCKED, NOT_IMPLEMENTED y NOT_APPLICABLE requieren justificación. Un adaptador o caso que aún no exista se reporta NOT_IMPLEMENTED; un test sin aserciones no cuenta como aceptación.
