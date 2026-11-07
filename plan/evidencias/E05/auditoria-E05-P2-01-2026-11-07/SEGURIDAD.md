# Auditoría de seguridad — E05-P2-01

CRITICAL 0 | HIGH 0 | MEDIUM 0 | LOW 0 | INFO 2 | candidatos aplicables pendientes 0.

Fecha: 07/11/2026 America/Guatemala. Alcance: superficie backend de resultados analíticos de laboratorio (`/api/v1/laboratorio/resultados*`), adaptadores MongoDB (`resultados`), UoW y migración `012_resultados_laboratorio_mongodb.mjs`. Autorización: Daniel (`JDaniC`), cierre del PR #78 con ambas auditorías obligatorias previas a integración. Skill `security-auditor`. Entorno autorizado: localhost, dobles explícitos y MongoDB 8.0 efímero en Docker. No se utilizaron secretos ni datos clínicos reales.

## 1. Resumen ejecutivo

Resultado: **PASS** del alcance de `E05-P2-01`. No se confirmaron vulnerabilidades de autorización (BOLA/BFLA), suplantación de analista/validador, sobrescritura de resultados validados, condiciones de carrera entre muestras y resultados, inyección NoSQL ni exposición de datos internos. Los dos avisos `INFO` corresponden a los mismos advisories transitivos heredados del lockfile (`glob`/`minimatch`) documentados en `sca.json`, sin camino desde entradas de resultados hacia dichos paquetes.

## 2. Activos, superficie y fronteras de confianza

- **Activos protegidos:** identidad/claims Firebase, cuenta institucional y roles/permisos locales (`ANALISTA_LABORATORIO`/`resultados.analizar`, `VALIDADOR_LABORATORIO`/`resultados.validar`), inmutabilidad de resultados `VALIDADO`, cadena de versiones/series (`serie_resultado_id`, `version`), estado derivado de órdenes, revisiones y eventos de auditoría.
- **Superficie HTTP (`/api/v1/laboratorio/resultados`):**
  - `POST /resultados` (`resultados.analizar`)
  - `PUT /resultados/:id/borrador` (`resultados.analizar`)
  - `POST /resultados/:id/validaciones` (`resultados.validar`)
  - `POST /resultados/:id/correcciones` (`resultados.analizar`)
  - `POST /resultados/:id/repeticiones` (`resultados.analizar`)
  - `GET /resultados` y `GET /resultados/:id` (`resultados.analizar` o `resultados.validar`)
- **Flujo de confianza:**
  `Cliente → Bearer verificado con revocación → cuenta local activa de LABORATORIO_CLINICO → GuardiaAutorizacion (capacidad + permiso) → DTO cerrado (objetoCerrado/consultaEscalar) → UoW MongoDB (snapshot + revalidación de cuenta/rol + reserva de orden + filtro por revision/estado) → auditoría + operación idempotente → respuesta saneada`.

## 3. Matriz de candidatos evaluados

| ID | Severidad | Estado | Categoría | Componente | Resultado / evidencia |
|---|---|---|---|---|---|
| SEC01 | INFO | FALSE_POSITIVE | BOLA / BFLA / Suplantación | `LaboratorioController`, `GestionarResultadoLaboratorio`, `aplicarCambiosLaboratorio` | Separación estricta en caso de uso y en adaptador MongoDB entre `ANALISTA_LABORATORIO` (`resultados.analizar`) y `VALIDADOR_LABORATORIO` (`resultados.validar`). Campos de autoridad (`analistaId`, `validadorId`, `institucion`) enviados en el body son rechazados por `objetoCerrado` con `400 SOLICITUD_INVALIDA`. |
| SEC02 | INFO | FALSE_POSITIVE | Inyección NoSQL / Mass Assignment | `consultaEscalar`, `objetoCerrado`, `uuidPublico`, `listarResultados` | Todos los parámetros de query exigen strings escalares; los IDs se validan con `uuidPublico` y los estados contra lista blanca (`BORRADOR`, `VALIDADO`). No se interpolan objetos ni operadores MongoDB desde la entrada. |
| SEC03 | INFO | FALSE_POSITIVE | Integridad / Sobrescritura de historia | `guardarBorradorResultado`, `validarResultado`, `aplicarCambiosLaboratorio` | `replaceOne` filtra por `{_id, revision: cambio.versionAnterior, estado: 'BORRADOR'}` y el esquema MongoDB más el dominio impiden modificar un documento `VALIDADO` o insertar dos versiones iguales en la misma serie (`uq_resultado_serie_version`). |
| SEC04 | INFO | FALSE_POSITIVE | Concurrencia / TOCTOU muestra-resultado | `GestionarResultadoLaboratorio`, `aplicarCambiosLaboratorio`, `UnidadDeTrabajoMongodb` | Toda mutación de resultado reserva o actualiza `ordenes.revision` en la misma transacción `snapshot`/`majority` y revalida la procedencia de las muestras; un rechazo concurrente de muestra o una corrección simultánea de la misma serie aborta uno de los dos con `VERSION_DESACTUALIZADA` (`409`). |
| SEC05 | INFO | FALSE_POSITIVE | Criptografía de cursores y aislamiento | `CursorHistorialCifrado`, `listarResultados` | El cursor se cifra con AES-256-GCM y autentica como AAD `['LABORATORIO_CLINICO', cuenta.id, cuenta.version, permisos, 'resultados', orden, filtros]`. Un cursor alterado o usado con otra cuenta/filtro falla cerrado con `400`. |
| SEC06 | INFO | FALSE_POSITIVE | Integridad de esquema / Preflight | `verificarLaboratorioMongodb`, `012_resultados_laboratorio_mongodb.mjs` | El verificador y la migración 012 comprueban huellas SHA-256 de validador, índices y cotejamiento efectivo (`actual.collation ?? {locale: 'simple'}` frente a `esperado.collation ?? collationColeccion`), fallando cerrado (`503` / `INDICE_RESULTADOS_INCOMPATIBLE`) ante deriva. |
| SEC07 | INFO | NOT_APPLICABLE | Suministro heredado (`glob`) | Lockfile transitivo (`sca.json`) | Advisory heredado en árbol de dependencias sin uso de patrones glob ni recorridos de archivos en el módulo de resultados. |
| SEC08 | INFO | NOT_APPLICABLE | Suministro heredado (`minimatch`) | Lockfile transitivo (`sca.json`) | Advisory heredado sin evaluación de patrones minimatch controlados por el usuario. |

## 4. Matriz final

| Área | Resultado |
|---|---|
| Autenticación, autorización por rol/permiso y aislamiento institucional | PASS |
| Validación de entrada, prevención de inyección NoSQL y mass assignment | PASS |
| Inmutabilidad de resultados validados, concurrencia, idempotencia y atomicidad UoW | PASS |
| Cursores autenticados, límites de tamaño (256 KiB / 100 elementos) y errores saneados | PASS |
| Integridad de migración 012 y verificación de índices/cotejamiento | PASS |
| Revisión SCA contextual de dependencias heredadas | PASS contextual (2 avisos heredados sin camino explotable) |
