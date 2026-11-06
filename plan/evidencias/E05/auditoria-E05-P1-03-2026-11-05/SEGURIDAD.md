# Auditoría de seguridad — E05-P1-03

CRITICAL 0 | HIGH 0 | MEDIUM 0 | LOW 0 | INFO 2 | candidatos aplicables pendientes 0.

Fecha: 05/11/2026 America/Guatemala. Alcance: superficie nueva de cobros y su integración con identidad, bundle y UoW del backend. Autorización: Daniel, ejecución de tarea y petición expresa de ambas auditorías antes de PR. Skill security-auditor; taxonomía OWASP de su referencia, sin afirmar certificación ASVS. Entorno autorizado: localhost/dobles explícitos y MongoDB efímero. No se contactó producción ni se extrajeron secretos.

## 1. Resumen ejecutivo

Resultado: PASS del alcance de esta entrega después de correcciones y regresiones. No se confirmó acceso indebido, inyección, doble cobro, saldo negativo, escritura parcial ni filtración en esta superficie. Dos avisos heredados de paquetes están documentados como información de cadena de suministro; no se encontró un camino desde entradas de cobros a los patrones vulnerables. No significa cero vulnerabilidades en todo el repositorio o sus dependencias.

## 2. Inventario, activos y fronteras

42 unidades nuevas inventariadas en inventario.json; siete operaciones bajo `/api/v1/laboratorio/facturas`: POST/GET base, GET detalle, GET/POST pagos, POST reversiones, POST anulación. Todas protegidas por `cobros.administrar` y capacidad LABORATORIO. Superficie compartida revisada: GuardiaAutenticacion, GuardiaAutorizacion, EstablecerSesion, VerificadorIdentidadFirebase, contextoVigente, RespuestaInterceptor, parser JSON, UoW MongoDB y CursorCatalogoLaboratorio. No hay upload/download, ruta/URL externa, shell, plantillas ni archivos controlados por el solicitante en este módulo.

Activos: identidad/claims, cuenta/roles actuales, receptor de factura, líneas históricas, saldo, pagos, claves idempotentes, revisiones y auditoría, secreto de cursor. No se aceptan desde el cliente institución, actor, rol, total ni saldo.

Flujo sensible:

`Cliente → Bearer verificado por Firebase con revocación → cuenta local activa → guard de capacidad/permiso → bundle elegido desde identidad → DTO cerrado → caso con revalidación transaccional → plan → session/UoW MongoDB → datos+revisión+operación+auditoría → respuesta saneada`.

Lectura: cuenta vigente → snapshot de factura/suma confirmada o página acotada → cursor AES-GCM ligado a ámbito → sobre data/meta. Un cajero autorizado puede consultar facturas de otro cajero de su misma institución: el límite es institucional/capacidad, no propiedad individual de la factura.

## 3. Matriz de confianza de candidatos

| ID | Severidad | Estado | Categoría | Componente | Resultado / evidencia |
|---|---|---|---|---|---|
| SEC01 | INFO | FALSE_POSITIVE | BOLA/BFLA | Controller/guards/casos | Otras tres instituciones403 incluso con permiso; sin Bearer401; cuenta/permiso retirados403; actor cliente400. HTTP y casos reales CA14 |
| SEC02 | INFO | FALSE_POSITIVE | Inyección/mass assignment | queryEscalar, objetoCerrado, uuidPublico | `$ne`, `$where`, objeto/array en query y JSON de operador como ID dan400. No entrada llega a operadores MongoDB arbitrarios; campos de consulta definidos en código |
| SEC03 | INFO | FALSE_POSITIVE | Criptografía/ámbito | CursorCatalogoLaboratorio + listar | AES-256-GCM, IV aleatorio, AAD de cuenta/revisión/permisos/institución/recurso/filtros. Cursor alterado/otra cuenta/otro filtro400; sin clave no emite cursor |
| SEC04 | INFO | FALSE_POSITIVE | Carrera/abuso de negocio | Pago/UoW | Dos sesiones por último saldo, un éxito; saldo0, sin doble pago. Replay de las cuatro mutaciones conserva operación; fallo auditoría revierte todo |
| SEC05 | INFO | FALSE_POSITIVE | Exposición/errores | FiltroErroresHttp, mappers/snapshot | Fallos internos no exponen stack/SDK; mapper legado falla cerrado503. F02 era defecto de clasificación de error, corregido; no se confirmó filtración |
| SEC06 | INFO | NOT_APPLICABLE | Suministro heredado | glob vía dependencias de Firebase | Advisory de versión afectada en lock, sin patrón/signal ni recorrido de filesystem controlados por cobros. Véase SCA abajo |
| SEC07 | INFO | NOT_APPLICABLE | Suministro heredado | minimatch vía glob | Advisory en lock, sin patrón de glob controlado por cliente en módulo/SDK runtime inspeccionado. Véase SCA abajo |
| SEC08 | INFO | NOT_APPLICABLE | Archivos/SSRF/shell/deserialización | Superficie de cobros | No uploads/descargas, URLs externas, ejecución de procesos ni lectura de archivos en flujo HTTP. Runner administrativo de prueba usa proyecto generado y secretos sintéticos temporales |

Los INFO2 del resumen son SEC06/SEC07; FALSE_POSITIVE/NOT_APPLICABLE no se cuentan como vulnerabilidades confirmadas del producto. No hay candidatos CONFIRMED/PROBABLE/NEEDS_VALIDATION aplicables pendientes dentro del alcance de cobros.

## 4. Autenticación, autorización y aislamiento

Firma/audiencia/emisor/expiración se delegan al SDK Firebase; `verifyIdToken(token,true)` exige revocación. UID e institución provienen del token, no del body/selector. EstablecerSesion resuelve bundle por institución y compara cuenta activa de esa base. Las pruebas de identidad usan SDK doble con errores de revocación/expiración; no simulan una validación criptográfica real en producción.

Matriz A/B: A es administrador de laboratorio; B administrador de cada otra institución con el mismo permiso. A→factura de laboratorio permitido (motor real); B→listado/detalle/pagos y las cuatro mutaciones de laboratorio403. UUID no localizado en el bundle de A404. Sin token401. Dentro de laboratorio, A y otro cajero B con el mismo rol pueden leer una factura institucional; se comprobó ese acceso legítimo y que B no puede reutilizar el cursor de A. Cuenta suspendida no puede leer ni recuperar un replay ya confirmado. No se introdujo login alterno, hash local ni confianza en rol del cliente.

## 5. Revisión estática y SCA

Sin cambios a Backend/package.json o package-lock.json frente a develop; dependencias directas fijadas. Búsqueda dirigida en archivos nuevos no encontró `eval`, procesos, `fetch`, tokens/contraseñas hardcodeados ni logs de cuerpos/datos clínicos. El servidor tiene logger desactivado y filtro de errores común. Los secretos de pruebas son generados aleatoriamente, archivos privados fuera del repo y borrados por el runner.

`npm audit --omit=dev --json` terminó con10 entradas moderate propagadas en el lockfile, que corresponden a dos advisories raíz; no son diez vulnerabilidades independientes del módulo. Captura saneada: sca.json. Los avisos se contrastaron con las fuentes primarias de GitHub:

- [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4): glob con AbortSignal puede continuar el recorrido después de cancelar; requiere ejecutar ese recorrido/patrón. La ruta de cobros no ejecuta glob ni acepta patrones/rutas.
- [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249): amplificación de patrones minimatch con optimización avanzada; requiere patrón controlado por atacante. No existe ese sink en los archivos nuevos ni en los runtimes google-gax/gaxios inspeccionados; glob aparece en herramientas de desarrollo de google-gax instalado.

Se inspeccionó tanto el árbol lógico de `npm ls --omit=dev`/lock como los manifests y archivos runtime instalados; sus versiones transitivas locales no son idénticas al árbol lógico. El veredicto no depende de asumir que todas las dependencias instaladas están libres de avisos. Estos avisos y la reproducibilidad de dependencias quedan registrados como riesgo heredado para mantenimiento global; no se hicieron upgrades/overrides amplios dentro de cobros ni se ocultó el resultado del scanner.

Configuración heredada: CORS refleja origen sin cookies/credentials; los comandos exigen Bearer explícito, por lo que no se confirmó CSRF basado en credenciales automáticas. No se cambió proxy/TLS/despliegue ni se declara verificado ese entorno. Límites del módulo: body256KiB,1–100 líneas/elementos de página, enteros seguros, timeout de consulta3s y reintentos UoW acotados. No se hizo carga agresiva.

## 6. Pruebas y regresiones

- HTTP: 401, tres instituciones ajenas403 en lecturas y mutaciones, cuenta/permiso retirados, query/DTO extra o estructurado400, body excesivo413, error interno saneado500, sobre/cursor correcto.
- Unidad: cero/negativo/fracción/overflow, documentos corruptos y moneda ajena, helper de lectura con driver y abort fallando; cierre de session y código503/SIN_PERMISO preservados.
- MongoDB real CA14: archivo y cobro previo, concurrencia, replay de cada mutación, clave con otra entrada, reversión mezclando facturas404 sin afectar la segunda, cursores alterados/de otro cajero y preflight ante deriva de validador; rollback integral de datos/revisiones/operación al fallar auditoría.
- Regresión común: identidad, JSON canónico, UoW/revocación/roles, cursores y permisos institucionales; cifras exactas en resultado.json.

## 7. Bloqueos

Ninguno para la validación segura del módulo. Firma real del proveedor, TLS/cloud, MFA/recuperación y carga de producción no forman parte de esta entrega ni se acreditan con mocks. No se modificó el proveedor de autenticación ni el despliegue.

## 8. Matriz final

| Área | Resultado |
|---|---|
| Acceso a objetos/funciones por institución y permiso | PASS |
| Entrada/inyección/mass assignment | PASS |
| Integridad monetaria/concurrencia/idempotencia/rollback | PASS |
| Límites de entrada y paginación; cursor autenticado | PASS |
| Errores sin datos técnicos; auditoría atómica | PASS |
| Revisión SCA/contexto de dependencia heredada | PASS del análisis contextual; scanner con avisos, no limpio |
| Nuevas dependencias, archivos privados, SSRF, shell | NOT_APPLICABLE |

## 9. Riesgos residuales

Avisos transitivos del lockfile y diferencia del árbol instalado/lógico quedan expresos; no se certifica seguridad global ni se descartan otros sinks en módulos ajenos. Autenticación se verificó por código y dobles de SDK; firma real externa no probada. No hay hallazgos aplicables abiertos en el alcance nuevo. La política nueva antes de PR se aplica a futuros PR y al avance del PR79 ya abierto; no se afirma que estas auditorías ocurrieran antes de crearlo.

## Revalidación incremental tras revisión de 7cbb5ae

Se revisó el cambio de guardar revisión previa de orden en la misma UoW: no amplía permisos, no introduce llamadas externas y conserva atomicidad; prueba física exige snapshot/versionado único tras replay. La reserva anterior a código usa creación exclusiva de una ref por ID, sin PR previo a auditorías y sin sobreescritura para reclamarla. Borrado con lease protege una transferencia posterior; se verificaron dos competidores y SHA ajeno en Git temporal. test_reserva_documental.py invoca Git con lista de argumentos constantes y carpeta temporal propia, no interpola entrada de usuario ni credenciales. El contrato de creación de refs fue contrastado con [documentación primaria GitHub](https://docs.github.com/en/rest/git/refs#create-a-reference); no se ejecutaron mutaciones de prueba en el remoto.

Resultado de revalidación del incremento: PASS del alcance, sin nuevos candidatos aplicables. No hay cambios de dependencias; el registro SCA heredado y sus límites siguen vigentes.

Revalidación documental tras216c909: prioridad por adquisición exclusiva nueva, desempate de PR solo para heredados, y excepción temporal de PR79 explícita. Sin cambio de superficie/ejecución/dependencias backend; se mantiene PASS del alcance y el registro de riesgos heredados.
