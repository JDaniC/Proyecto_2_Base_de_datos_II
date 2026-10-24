# Pruebas, evidencia y aceptación

## 1. Niveles de prueba

| Nivel | Qué demuestra | Límite |
|---|---|---|
| Dominio con dobles | Validación, políticas y estados sin framework/motor | No demuestra almacenamiento real |
| Contrato parametrizado | Mismas entradas, proyecciones y errores por adaptador | No demuestra UI completa |
| Integración por motor | Transacción, índices, referencias, rollback y permisos del entorno | No acredita una configuración remota distinta |
| API con identidad | Sesión, autorización, mapeo y routing institucional | No demuestra uso de formularios |
| UI→API→BD | Acciones y persistencia después de recargar | No cubre todos los límites del dominio |
| Instalación/restauración | Reproducibilidad y recuperación de datos de ensayo | Emulador no acredita backup administrado de nube |

Una suite con mocks es útil para UI, pero no acredita el producto cliente-servidor. Los conteos previos son antecedentes; registrar nuevas ejecuciones por commit. No sumar niveles como si cada prueba fuera un requisito distinto.

## 2. Matriz mínima de aceptación

| Caso | Ejecución requerida | Evidencia decisiva |
|---|---|---|
| CA01 | Cuatro cuentas, manipulación institución/motor, peticiones simultáneas institucionales | Solo bundle permitido; lectura ajena 404 y ninguna mezcla |
| CA02 | Token vencido/revocado, cuenta inactiva, quitar permiso con token vigente | 401/403 y efecto en siguiente petición |
| CA03 | Alta normal/sin documento, misma clave, identidad repetida y altas concurrentes | Un paciente/historial; sin reservas huérfanas en cuatro motores |
| CA04 | Núcleo idéntico en cuatro bundles con políticas/fixtures compatibles | Mismo DTO, estados y errores; mismos casos de uso |
| CA05 | Atención completa; fallo antes de receta y antes de auditoría | Todo confirmado o revertido; reintento sin duplicación |
| CA06 | Agenda hospital/dental/pediatría, cita ajena/cancelada/atendida y atención doble | Una cita→consulta; fechas previas trazables |
| CA07 | Filtros, fechas iguales, páginas, cursor inválido, roles | Sin omisiones/duplicados sobre conjunto estable |
| CA08 | Archivo en cuatro, proceso previo, corrección, nueva atención y carrera | Historia conservada; nuevas atenciones rechazadas; reactivación solo pediatría |
| CA09 | Menor sin principal, varios principales, responsable compartido y bajas concurrentes | Nunca sin principal; autorización independiente |
| CA10 | Control único, fechas/IMC, receta corregida y catálogo cambiado | Historia intacta; sin talla no inventar IMC |
| CA11 | Dosis concurrente, versión de esquema, corrección/anulación | Una aplicación lógica y pendientes según versión asignada |
| CA12 | Rechazo/retoma/rectificación de muestra; corrección/repetición de resultado | Muestra nueva/versión/serie según operación |
| CA13 | Muestra ajena, resultado sin validar, archivo fallido y corrección posterior | Informe conserva hash/versiones; no EMITIDO parcial |
| CA14 | Pago parcial, reenvío, saldo concurrente, reversión y moneda | Sin sobrepago/duplicados ni coma flotante |
| CA15 | Entradas/consumos/ajustes/bajas, concurrencia y vencimiento | Stock derivado no negativo, unidad compatible |
| CA16 | Versionar/desactivar catálogos; calidad y búsquedas | Valores históricos y filtros autorizados |
| CA17 | Ingreso/traslado/egreso, cama competida y relación ajena | Una ocupación por período; rollback de traslado |
| CA18 | Secretaría/analista fuerzan lectura, cambio, receta o validación | Campos restringidos ausentes y comandos denegados |
| CA19 | Modelos/índices, instalación, migración y restauración | Modelo íntegro y sistema reproducible en otro equipo |
| CA20 | Comparativo, modelos y observaciones docentes | Conclusiones con fuente/cambio/prueba; fuente ausente no es PASS |

CA06 no reabre agenda UI de laboratorio; soporte técnico Mongo de citas se prueba por contrato si se usa y se informa su alcance. CA08 no publica reactivación fuera de pediatría. Diferencias de política no equivalen a diferencias de persistencia: el perfil común usa entradas válidas y preparación institucional explícita en cuatro motores.

## 3. Casos mínimos por comando

Éxito mínimo/completo; campo ausente/nulo/tipo erróneo; límites y fechas; permiso/cuenta/profesional; recurso ajeno; estado inválido; versión antigua; idempotencia con entrada igual/distinta; falla de dependencia y rollback cuando corresponde. Para consultas: vacío, filtros, orden/cursor, permiso de campos y fallo de índice. Elegir casos por riesgo, sin tests que solo repitan implementación.

Las carreras usan conexiones/sesiones independientes y barrera que haga competir operaciones, con resultados verificados en base. Dos llamadas secuenciales no acreditan concurrencia. Comprobar ausencia de operación/auditoría de éxito tras rollback. Distinguir logs técnicos de rechazos de la auditoría clínica transaccional.

## 4. Herramientas existentes y futuras

Disponibles hoy; consultar sus guías y opciones antes de ejecutar:

```sh
python3 Database/tests/verificar_local.py --help
python3 Database/docker/verificar.py
npm --prefix Database run test:firestore
python3 Database/auditoria/2026-10-24/reproducir_postgresql.py
npm --prefix Frontend run build
npm --prefix Frontend run test
```

Verificadores Database crean entornos aislados según sus guías. La suite histórica completa de frontend requiere reconciliación en E06-P2-02; no se presume verde. El reproductor PG falla mientras A-F01 siga abierto.

Comandos **a implementar** en Backend durante E01/E06: `build`, `test:unit`, `test:contract`, `test:integration`, `test:security`, `test:e2e`, `lint:architecture`, ejecutables mediante `npm --prefix Backend run <script>`. Hoy no existen. La suite parametrizada recibe un bundle de prueba en configuración; el request productivo nunca selecciona motor.

## 5. Evidencia portable

Cada tarea crea `plan/evidencias/EXX/EXX-PX-NN.md` al ejecutarse: requisito/escenario, commit, fecha, versión de motores, preparación sintética, comando/pasos, esperado, observado y resultado. Enlazar resumen de log saneado o artefacto reproducible. Logs crudos pueden quedar en `.test-results/` ignorada; el compañero debe acceder a evidencia versionada sin secretos/datos reales. No usar únicamente rutas de `/tmp` o Downloads.

Resultados: PASS, FAIL, BLOCKED, NOT_IMPLEMENTED, NOT_APPLICABLE con justificación. No confundirlos con estados de tarea del tablero.

## 6. Salida final

EF01–EF11 cubiertos, núcleo común en cuatro motores, procesos institucionales completos; sin FAIL crítico/alto ni prueba requerida BLOCKED; modelos/migraciones, instalación en otro equipo, restauración, comparativo y guías; retroalimentación tratada con evidencia. Excepción menor aceptada exige impacto/responsable visible; no permite omitir un requisito académico ni integridad.
