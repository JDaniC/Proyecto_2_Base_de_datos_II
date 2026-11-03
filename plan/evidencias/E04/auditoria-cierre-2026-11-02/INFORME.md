# Auditoría funcional de cierre E04

Fecha: 02/11/2026, America/Guatemala. Alcance autorizado: cerrar E04, con datos sintéticos y motores aislados. Tipo: funcional. Corte inicial: `f6b211a`; trabajo vacunas local aún no integrado.

## 1. Resumen ejecutivo

Resultado inicial: PARCIAL. Las cuatro tareas E04 anteriores están integradas según tablero; E04-P2-02 y E04-P2-03 y demostración conjunta requieren pruebas actuales e integración. Los resultados anteriores citados son históricos, no una ejecución de esta auditoría.

## 2. Inventario y cobertura

| Unidad | Entradas/efectos | Dependencias | Prueba existente |
|---|---|---|---|
| Agenda común | crear, reprogramar, cancelar, versión/idempotencia | UoW institucional, profesional y paciente | CalendarHttp.test.tsx; clinica-e2e.mjs |
| Hospitalización | ingreso, evolución, cama, egreso | PostgreSQL, permisos clínicos | HospitalHttp.test.tsx; HospitalLimitsUI.test.tsx |
| Servicios hospital | examen, parámetros, póliza, procedimiento | migración 008, PostgreSQL | servicios-hospitalarios-sql.ts; HospitalServicesHttp.test.ts |
| Pediatría | responsables, alergias, perinatales, crecimiento | Firestore, migración 009 | pediatria-*.test.ts; pediatria-e2e.mjs |
| Vacunas | esquema explícito, aplicación única, corrección/anulación | Firestore, UoW, esquema versionado | En construcción E04-P2-02; no acreditar aún |

## 3. Matriz requisito → código → test

| Requisito/fuente | Código | Prueba/evidencia | Estado inicial |
|---|---|---|---|
| CA06 agenda/dental, E04-P1-01 | http/appointments/httpAppointmentRepository.ts; AppointmentsCalendarPage.tsx | E04-P1-01.md, CalendarHttp.test.tsx | CUBIERTO histórico |
| Estancia/cama, E04-P1-02 | http/hospital/httpHospitalizationRepository.ts | E04-P1-02.md; HospitalHttp.test.tsx | CUBIERTO histórico |
| Exámenes/cobertura, E04-P1-03 | http/hospital/httpExamRepository.ts | E04-P1-03.md; hospital-servicios-e2e.mjs | CUBIERTO histórico |
| RF-P01–P08, CA09/10 | dominio/pediatria; casos-uso/pediatria; Firestore | E04-P2-01.md; pediatria-e2e.mjs | CUBIERTO histórico |
| RF-P09–P12, CA11, M09 | dominio/pediatria/vacunas.ts; casos de uso vacunas | E04-P2-02 pendiente | PARCIAL |
| RF-009/018/P05/P12; CA17; RNF-034 | serviceFactory.ts; agendas y fichas institucionales | clinica-e2e.mjs ampliado hospital/pediatría | PARCIAL, falta ejecución |

Rutas frontend relativas a `Frontend/src/services/` y backend relativas a `Backend/src/` salvo indicación.

## 4. Desviaciones detectadas

- DOC_DESACTUALIZADA: evidencia E04-P2-01 aún dice EN_REVISION mientras tablero registra HECHA y PR #71 integrado. Reconciliar al cerrar.
- NOT_IMPLEMENTED al corte inicial: factory de vacunas usa requireApiAdapter; agente frontend implementa conexión HTTP.
- SUB_IMPLEMENTADO de evidencia: harness previo solo demostraba agenda dental; agregado recorrido hospital/pediatría con persistencia, recarga, móvil y conflicto.

## 5. Hallazgos confirmados

La falta de conexión vacunas al corte inicial impide cerrar E04; está dentro de E04-P2-02 activa, no se declara fallo definitivo. Los checks contrato-pr SUCCESS y CodeRabbit SKIPPED del PR #73 borrador no acreditan revisión de implementación.

## 6. Pruebas añadidas / propuestas

`Frontend/scripts/clinica-e2e.mjs`: agenda hospital/pediatría crea y reintenta clave estable, comprueba ID único, visualización tras recarga y móvil/escritorio; cancelación y rechazo de versión anterior. `node --check` PASS. Falta ejecución integral.

Comando integral: desde Backend, `node scripts/run-historial-integration.mjs --clinica-ui`. Complementar `npm test`, `npm run lint`, `npm run build` backend y `npx vitest run src/test/http`, `npm run build` frontend tras estabilizar implementación.

## 7. Bloqueos

No se identifica bloqueo externo en inspección. Ejecución depende de completar vacunas; E04-P2-03 debe reservarse tras integración de su dependencia según protocolo.

## 8. Matriz final de resultados

| Categoría de matriz exhaustiva | Resultado actual | Evidencia / siguiente validación |
|---|---|---|
| 1–2 contrato/tipos/validación | BLOCKED | Ejecutar contrato OpenAPI y suites finales |
| 3–4 negocio/transiciones | BLOCKED | Ejecutar runtime y vacunas |
| 5 persistencia | BLOCKED | Cuatro motores aislados/emulados, no mocks |
| 6–7 salida/errores | BLOCKED | Suites HTTP y fallos controlados |
| 8 límites | BLOCKED | Edad/dosis/fecha y fronteras vacunas |
| 9 normalización | BLOCKED | Contratos estrictos y fecha civil |
| 10 integración | BLOCKED | Recorrido integral pendiente |
| 11 concurrencia/idempotencia | BLOCKED | Carrera determinista vacunas y agendas |
| 12 búsqueda/paginación | BLOCKED | Regresión lectura institucional |
| 13 fechas/dinero/localización | BLOCKED | Civil/bisiesto y dinero entero existentes + vacunas |

BLOCKED aquí identifica evidencia actual pendiente por dependencia de implementación, no indisponibilidad de entorno ni estado oficial del objetivo.

## 9. Riesgos residuales

No acreditar producción Firestore con emulador. No acreditar cuatro motores con suites unitarias. No cerrar por porcentaje o por PR abierto. Este informe inicial debe actualizarse con el SHA final, resultados actuales y revisión real antes de declarar PASS.

## Actualización de revisión estática vacunas

- Los comandos usan lectura transaccional antes de emitir planes de escritura; el adaptador aplica las escrituras después. No se observaron commits internos ni callbacks con efectos externos.
- Asignar esquema y administrar vacuna bloquean expediente archivado. Corregir/anular preservan historia y verifican profesional vigente, permitiendo rectificación después de archivo.
- Aplicación determinista conserva `version_esquema_id`; lectura de aplicaciones recupera esa versión exacta. Las revisiones contienen campos mutables anteriores, motivo, actor y fecha.
- Brechas notificadas para corrección antes de cierre: consulta de esquema usaba metadatos del catálogo vigente y fallback de dosis vigentes ante versión vacía; parámetro cliente `edad_meses` alteraba clasificación; días de retraso nunca calculados. Agente de implementación confirmó corrección en curso.
- Prueba actual `npx vitest run src/test/http/CalendarHttp.test.tsx`: 4 PASS (02/11, 15:22 Guatemala). jsdom, no acredita persistencia física.
- Primera prueba integral no inició por permiso local de actividad Docker buildx; relanzada con acceso apropiado a Docker, log temporal `/tmp/e04-integral-auditoria.log`. No se contabiliza como fallo funcional.

### RF-P09: mantenimiento de catálogo y versiones

Requisito crítico pendiente de cierre: no basta leer catálogo cargado por fixtures. Debe existir mantenimiento autorizado de vacuna, versiones inmutables y dosis_id estable, contrato HTTP y UI de mantenimiento conforme alcance RF-P09. Verificar alta/actualización con permisos actuales, negativa sin permiso, catálogo nuevo sin cambio de asignación previa y recuperación de versión histórica exacta. La implementación se amplía durante esta auditoría; la ejecución integral iniciada antes de esa ampliación acredita únicamente regresión del corte que compiló y exige nueva prueba del alcance añadido.

### Regresión integral actual completada

`node scripts/run-historial-integration.mjs --clinica-ui` terminó con código 0 el 02/11/2026. 81 comprobaciones UI PASS (hospital 28, dental 15, laboratorio 12, pediatría 26). Evidencia saneada: [regresion-integral-81.json](regresion-integral-81.json). Preparación SQL, migración 008 nueva, rollback/recuperación, legado RECONCILIAR y reejecución conservando datos también PASS. Las nuevas agendas hospital/pediatría pasan idempotencia, recarga, móvil/escritorio, cancelación y conflicto de versión. Esta regresión no cubre catálogo/aplicación vacunas agregado durante la ejecución; sigue pendiente la demostración de ese alcance.

### Matriz actual posterior a reparaciones (sin cierre de fase)

`npm run build:test` PASS y `node --test dist-test/tests/runtime/vacunas-http.test.js` 8/8 PASS. Transporte HTTP real, identidad y UoW sintéticas; no acredita persistencia de vacunas. Las ocho pruebas reúnen negativas de los dos revisores sin duplicar archivo.

| Requisito / categoría | Código / prueba | Resultado actual y límite |
|---|---|---|
| Institución autenticada, acciones ocultas en API, CA17 | vacunas-http.test.ts: cuenta hospital en lecturas/registro/corrección/anulación | PASS HTTP sintético |
| Cuenta actual y permisos | vacunas-http.test.ts: permiso insuficiente y catálogo usuarios.administrar | PASS HTTP sintético |
| Contratos cerrados, entradas, errores, categorías1/2/6/7/9 | vacunas-http.test.ts: claves ausentes/malformadas, dosis UUID, fecha imposible, body nulo, autoridad extra, motivo y versión | PASS HTTP sintético |
| Edad civil desde nacimiento, categorías8/13 | vacunas-http.test.ts: rechaza edad_meses cliente | PASS frontera; bordes de edad y demora requieren dominio/integración |
| Error recuperable, sin catálogo vacío falso, categoría10 | vacunas-http.test.ts: adaptador ausente retorna503 sin data | PASS HTTP sintético |
| RF-009/018, CA06, agendas hospital/pediatría | clinica-e2e.mjs; regresion-integral-81.json | PASS cuatro motores aislados/emulados; recarga móvil/escritorio |
| RF-P01–P08, CA09/10, responsables/crecimiento | pediatria-e2e.mjs; regresion-integral-81.json | PASS emulador actual |
| RF-P09 mantenimiento de vacuna/versiones | GestionarCatalogoVacunas; endpoint POST vacunas/versiones; nuevo UI | Implementado durante auditoría; evidencia E2E/integración nueva pendiente |
| RF-P10–P12, CA11, categorías3/4/5/11 | casos vacunas; versión asignada; UoW y documento determinista | Revisión estática corregida; runner final y E2E nuevos pendientes |
| Historia versus vigente; cancelación no escribe | hospital-servicios-e2e/pediatria-e2e | PASS regresión81; nuevas vacunas aún pendientes |
| Búsqueda/paginación categoría12 | recorrido cuatro instituciones | PASS regresión de lectores existentes; aplicaciones vacunas retornan colección completa por contrato actual |

No se declara HECHA E04-P2-03 ni CERRADA E04: requieren integrar E04-P2-02, ejecutar las nuevas pruebas de vacunas, comprobar revisión automática real y registrar commit integrado. La evidencia81 anterior sigue vigente como regresión, no se reutiliza para atribuir éxito a código escrito después.

### Revisión independiente: nueva administración después de anulación

La política confirmada para esta ejecución permite una nueva administración explícita posterior a ANULADA, sin disfrazarla de corrección. Revisión estática del código actual:

- El ID lógico permanece paciente/vacuna/dosis. Una aplicación vigente continúa rechazando otra clave con DOSIS_DUPLICADA.
- Después de anulación, el comando de registro crea la siguiente revisión del mismo documento y preserva el snapshot completo anterior: fecha, profesional, versión de esquema y contenido clínico. El motivo de revisión distingue nueva administración de rectificación.
- Dos solicitudes nuevas simultáneas leen el mismo documento. Firestore reintenta la perdedora y encuentra APLICADA; no puede producir dos aplicaciones vigentes. Clave repetida retorna resultado durable sin repetir escritura.
- Escritura, revisión, evento y auditoría permanecen dentro de la misma UoW. Registrar aún exige expediente ACTIVO y profesional actual; correcciones/anulación conservan autorización histórica con paciente archivado.
- La prueba de integración añadida exige una ganadora, un documento, versión4, tres revisiones anteriores, snapshot ANULADA íntegro y rechazo de otra administración vigente. Su ejecución final debe adjuntarse; lectura estática no sustituye PASS físico.

No se identificó una brecha nueva en este cambio durante la revisión independiente. El cierre continúa condicionado al resultado de integración y revisión automática del SHA final.

### Hallazgo de composición descubierto por E2E vacunas

El nuevo recorrido encontró503 aunque las pruebas de casos de uso y adaptador pasaban: `crearBundlesInstitucionales` omitía propagar `vacunasPediatricas` del repositorio al bundle final de la aplicación. La composición fue corregida por el implementador. Las pruebas directas con `crearBundlePacientesFirestore` no cubrían esta segunda etapa de ensamblaje; no acreditaban el servidor compuesto real.

Revisión independiente de la misma composición para el resto de E04: se propagan antecedentesPediatricos, responsablesPediatricos, clinica, hospital y serviciosHospital. `crearDependenciasBackend` prepara hospital/serviciosHospital para PostgreSQL, clínica para MySQL y MongoDB y bundle pediátrico Firestore. No se observó otra omisión E04. Es obligatorio repetir E2E vacunas por la ruta HTTP del servidor compuesto y conservar una regresión de propagación del puerto; no basta repetir las pruebas directas que ya pasaban antes del hallazgo.

### Comprobación de criterios E04-P2-03

`npx vitest run src/test/product-scope/ProductScope.test.tsx src/test/product-scope/ClinicalSessionGuard.test.tsx`:24/24PASS el 02/11/2026 a las15:36 Guatemala. Verifica restricciones `/hospital/camas` por institución, pestañas especializadas y guardas de sesión en jsdom. `AuthGuard` aplica `isRouteInInstitution` antes de mostrar rutas hospitalarias. API clínica ya dispone de negativa403 fuera de hospital y reactivación403 fuera de pediatría; vacunas HTTP añade sus negativas institucionales.

El recorrido81 acredita agendas hospital/dental/pediatría, estancia/camas, exámenes/cobertura, responsables/crecimiento, histórico frente vigente, cancelación sin escritura, recarga y vistas móvil/escritorio. No se atribuye navegación E2E exacta a URL hospital con cuenta pediátrica ni recuperación específica de servicio vacunas/camas a ese recorrido: estas condiciones se apoyan en guardas/pruebas focalizadas y necesitan distinguirse del fallo503 genérico controlado. La ampliación E2E vacunas sigue pendiente de resultado final.

## Corte consolidado antes de revisión e integración final

Resultados actuales confirmados por ejecutores coordinados, posteriores a las correcciones:

| Suite | Entorno y alcance | Resultado |
|---|---|---|
| Backend runtime/unitarias | Node; incluye8 negativas HTTP vacunas y regresión composición |321PASS |
| Backend contratos | Node; contrato estructural |32PASS |
| Vacunas Firestore | Emulador aislado; asignación, catálogo, versiones, carrera, rollback, archivo y administración tras anulación |10PASS |
| Frontend HTTP | Vitest/jsdom; adaptadores y UI HTTP |113PASS |
| UI pediátrica/vacunas focalizada | Navegador, backend real, Auth/Firestore emulados; incluye catálogo/asignación/corrección/anulación y nueva administración |32PASS |
| Alcance institucional y sesión | Vitest/jsdom ProductScope + ClinicalSessionGuard ejecutado por auditor |24PASS |
| Regresión integral previa | Chromium y cuatro motores aislados/emulados |81PASS; anterior a ampliación vacunas, no sustituye integral final |

Reparaciones verificadas estáticamente: metadatos/dosis exclusivos de la versión asignada; sin edad autoritativa enviada por cliente; retraso civil calculado; catálogo sin versión válida produce error recuperable; puerto vacunas propagado por composición real; administración posterior a anulación conserva documento lógico único y snapshot anterior completo.

La ampliación integral final en las cuatro instituciones está en ejecución sobre harness estabilizado; no se anticipa su resultado. La revisión automática del SHA actual está pendiente; un proceso local de revisión en curso no equivale a resultado favorable ni sustituye la revisión de GitHub. PR73 continúa pendiente de integración en este corte. E04-P2-03 y cierre de fase no están acreditados como integrados por este informe.

### Matriz de decisión del corte

| Aspecto | Clasificación |
|---|---|
| Implementación y pruebas funcionales focalizadas E04 | PASS en entornos indicados arriba |
| Nueva demostración completa de fase | Pendiente resultado integral final; no sustituir con81 histórico |
| Revisión automática final | Pendiente |
| Integración PR73 / dependencia P2-03 | Pendiente |
| Cierre formal E04 | No declarado; requiere evidencia integral y commits integrados |

Este bloque cierra la captura de evidencia focalizada del auditor. La decisión de fase se actualizará exclusivamente con resultados verificables del recorrido final, revisión e integración; no hay autorización implícita para cambiar los estados del tablero desde este bloque.

## Incidencia del recorrido conjunto final

La primera ejecución conjunta posterior a vacunas no produjo acta global PASS: terminó por un callback de Firestore de un cliente cerrado durante reinicios dentro del mismo proceso de prueba. Las comprobaciones completadas no se convierten en aprobación global. Se cambia el harness para reiniciar un proceso de backend independiente, esperar su salida y arrancar otro; se mantiene el mismo volumen aislado y las comprobaciones de persistencia. El resultado final sigue pendiente hasta proceso terminal y JSON completo. La corrida individual de pediatría32PASS/exit0 conserva su alcance propio.

### Incidencia del harness en la demostración final

El primer intento del recorrido integral ampliado no acreditó PASS final: al reiniciar el backend dentro del mismo proceso, el SDK Firestore quedaba terminado y provocaba fallo de cliente. El responsable del harness sustituyó ese reinicio por un proceso backend separado, con SIGTERM y espera de salida antes de arrancar otra instancia. Smoke focalizado: dos reinicios PASS y salida0. Se relanza la demostración integral completa; hasta su salida terminal no se presenta este intento fallido como éxito ni como defecto funcional de vacunas.

### Diagnóstico de apagado del backend

El proceso independiente también falló durante SIGTERM después de consultas reales: no era únicamente la convivencia con el navegador. Inspección del runtime instalado confirma que Nest ejecuta onModuleDestroy antes de dispose del servidor HTTP, y onApplicationShutdown después. La limpieza de recursos estaba en onModuleDestroy; se mueve al último hook para que el servidor termine solicitudes antes de cerrar pools/clientes. No se acepta exit1 ni se suprimen errores; la regresión debe probar una solicitud activa y cierre, además de la demostración conjunta posterior. Corrección y verificación todavía en curso.

### Resultado de regresión del cierre

Commit `7b39b84` mueve la limpieza a onApplicationShutdown. Prueba runtime reproduce con hook anterior dos fallos (recursos cerrados antes de terminar lectura) y con hook corregido dos PASS, para lectura exitosa y fallida. Suite backend final:323 runtime/unitarias+32 contratos PASS; lint/arquitectura PASS. Smoke real posterior:12 lecturas HTTP concurrentes por ciclo y dos SIGTERM/reinicios, exit0; evidencia `reinicios-smoke.json`. La nueva corrida integral se ejecuta después de este arreglo; no se acredita todavía resultado global.

### Consultas paralelas ante error

Otra causa reproducida era responder503 al primer rechazo de Promise.all mientras seguían lecturas hermanas. Dos regresiones con catálogo/aplicaciones fallidas y esquema pendiente fallan con implementación previa y pasan al esperar allSettled en ConsultarEsquemaVacunas, propagando después el mismo ErrorDominio. Cambio localizado publicado `6933005`; no parches del SDK ni supresión de excepciones. Las cuatro regresiones de cierre/lecturas y lint pasan. El recorrido conjunto en curso comprueba el flujo exitoso; la regresión específica demuestra el manejo de fallo nuevo.


## Veredicto funcional final del producto E04

**PASS funcional del producto en los entornos declarados.** El recorrido integral final terminó con código0 y87/87 comprobaciones PASS: hospital28, odontología15, laboratorio12 y pediatría32. El auditor leyó [integral-final.json](integral-final.json), comprobó las87 clasificaciones PASS y la suma de totales institucionales. Esta evidencia sustituye los intentos incompletos para el veredicto global, sin ocultar las incidencias y correcciones descritas arriba.

La demostración usa cliente/navegador y servidor reales, PostgreSQL/MySQL/MongoDB reales aislados y Firebase Auth/Firestore emulados. Incluye reinicio real del backend con solicitudes drenadas, persistencia intacta y salida limpia; preparación/migraciones nuevas, existentes y reejecución sin pérdida según resultado del runner. No acredita Firestore cloud ni módulos especializados de laboratorio E05.

### Trazabilidad final requisito → evidencia

| Criterio E04 | Evidencia actual | Resultado |
|---|---|---|
| Agenda dental, hospital y pediatría; cancelación/conflictos e idempotencia |87 integral: recorridos institucionales de agenda, recarga y móvil/escritorio |PASS |
| Hospital estancia, cama, evolución, traslado/liberación y egreso |28 comprobaciones hospitalarias dentro de87 |PASS |
| Exámenes, parámetros/versiones, procedimiento y cobertura/póliza |Recorrido hospitalario especializado dentro de87 |PASS |
| Responsables compartidos, principalidad/autorización independientes, antecedentes y crecimiento CA09/10 |32 pediátricas: contacto en dos menores, último principal409, historia/alergias/perinatales, IMC sin talla |PASS |
| RF-P09 catálogo y versiones inmutables |10 integración Firestore y UI HTTP focalizadas; integral publica nueva versión y conserva asignada |PASS en emulador |
| RF-P10–P12, CA11: asignación explícita, dosis única, corrección/anulación e historia |87 integral: asignación, aplicación, corrección versionada, catálogo nuevo sin alterar esquema, anulación/reinicio, nueva administración explícita con identidad lógica estable |PASS |
| Concurrencia/atomicidad/rollback y límites vacunas |10 integración Firestore aislada, además de runtime/dominio; revisión estática independiente del plan transaccional |PASS en emulador |
| Aislamiento institucional y acciones sin permiso también en API |8 pruebas vacunas HTTP y regresión clínica;24 pruebas scope/guardas |PASS con identidad/UoW sintéticas; alcance exacto distinguido del E2E |
| Fallo recuperable sin dato vacío falso y conflicto de versión |Negativas HTTP vacunas503, edad/body/version400; controles400/403/409/503 y conflicto agenda en87 |PASS en los escenarios probados |
| Archivo/reactivación e historia preservada |87 integral en cuatro instituciones; reactivación pediátrica, corrección histórica postarchivo; runner vacunas postarchivo |PASS |
| Cancelar no escribe, datos históricos/vigentes y recarga |Historia cancelada sin escritura, lectura original y esquema histórico en87 |PASS |
| Cierre/apagado con lecturas activas y lectura paralela fallida |Regresiones runtime y smoke real de reinicios; integral final exit0 |PASS |

Suite backend actual reportada por ejecutor:325 runtime/unitarias+32 contratos PASS; frontend HTTP113PASS; emulador vacunas10PASS; scope24PASS; focal pediátrica32PASS. La focal32 se incluye también en integral87: no sumar ambas como casos independientes de cobertura.

### Separación de producto y cierre administrativo

| Decisión | Estado de este corte |
|---|---|
| Verificación funcional del producto E04 |PASS |
| Revisión automática del SHA final |Pendiente de registrar resultado real |
| Integración PR73 |Pendiente de verificar |
| Reserva/PR/integración E04-P2-03 |Pendiente de completar tras dependencia |
| Seis tareas HECHA y cierre formal E04 |Pendiente; este informe no modifica tablero ni declara merge |

El borrador de cierre se entrega en archivo temporal para incorporar los commits y revisiones reales cuando existan. Los apartados previos son cortes cronológicos y no sustituyen este veredicto funcional final ni anticipan el cierre oficial.
