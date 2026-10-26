# Inventario manual JavaScript — arnés E00

El inventariador de la skill cubre Python; las unidades JavaScript se enumeraron manualmente. La revisión se limitó al verificador de destinos, la creación de resultados y la planificación/ejecución de la matriz CA01–CA20.

## Funciones y métodos

| Archivo | Unidad | Línea | Riesgo | Requisito / efectos | Prueba relacionada |
|---|---|---:|---|---|---|
| `Backend/tests/contratos/entorno-aislado.mjs` | `destinoInseguro` | 7 | LOW | Normaliza rechazo de configuración antes de conectar | pruebas de destino inválido |
| | `validarDestinoAislado` | 17 | HIGH | Requiere flags de test, loopback literal, puerto válido, ID único; proyecto demo/emulador exactos para Firestore | 8 pruebas de configuración/aislamiento |
| | `crearRunId` | 56 | LOW | Genera ID aleatorio con `crypto.randomBytes` | prueba de ID único por ejecución |
| | `ejecutarEnDestinoAislado` | 65 | HIGH | Prepara, ejecuta y limpia; conserva error de ejecución y limpieza | 5 pruebas de éxito/fallo/limpieza |
| | `registrarParaLimpieza` | 84 | MEDIUM | Registra recursos parciales antes de que falle preparación | prueba de limpieza parcial |
| `Backend/tests/contratos/resultado.mjs` | `noVacio` | 14 | LOW | Valida textos requeridos | pruebas de estado y evidencia |
| | `crearResultado` | 17 | MEDIUM | Valida nivel/estado y requiere esperado, observado y evidencia para PASS/FAIL | 4 pruebas de formato |
| `Backend/tests/contratos/suite-aceptacion.mjs` | `congelarProfundo` | 18 | LOW | Inmoviliza fixture y matriz | prueba de fixture inmutable |
| | `exigir` | 29 | LOW | Falla cerrado ante definición inválida | pruebas de matriz y bundles |
| | `textoNoVacio` | 33 | LOW | Valida campos del plan | pruebas de matriz y bundles |
| | `validarBundlesDePrueba` | 37 | HIGH | Rechaza instituciones/motores duplicados o no canónicos | pruebas de bundles |
| | `validarMatrizAceptacion` | 61 | HIGH | Exige CA01–CA20, aplicabilidad, preparación, resultado y referencias a fixtures | pruebas de matriz |
| | `planificarSuiteAceptacion` | 113 | HIGH | Expande escenarios por motor y conserva las exclusiones | pruebas de aplicabilidad |
| | `nombreEscenario` | 150 | LOW | Da identificador reproducible a cada fila | reporte de 76 filas |
| | `ejecutarSuiteAceptacion` | 163 | CRITICAL | Solo emite PASS/FAIL con salida/evidencia; sin executor declara NOT_IMPLEMENTED | pruebas de estados y executor |
| `Backend/tests/contratos/contextos-aceptacion.test.mjs` | `porId` | 8 | LOW | Busca fixtures sintéticos por clave | 7 pruebas de contexto |
| | `clavesRecursivas` | 10 | LOW | Recorre claves para detectar campos de credenciales | prueba de fixtures sin credenciales |

## Pruebas Node inventariadas y ejecutadas

| Archivo | Unidades de prueba | Resultado |
|---|---:|---|
| `entorno-aislado.test.mjs` | 13 | PASS |
| `resultado.test.mjs` | 4 | PASS |
| `contextos-aceptacion.test.mjs` | 7 | PASS |
| `suite-aceptacion.test.mjs` | 8 | PASS |
| **Total** | **32** | **32 PASS, 0 FAIL, 0 omitidas** |
