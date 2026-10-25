# Contratos comunes, flujos y excepciones

## 1. Convenciones que se congelan en E00

API `/api/v1`; `{data, meta:{correlacion, siguiente_cursor?}}`. Error `{error:{codigo,mensaje,campos?},meta:{correlacion}}`. UUID públicos, `version` en lectura y `version_esperada` en actualización. Cabecera `Idempotency-Key` en creaciones/movimientos y comandos compuestos. No exponer PK, BSON, motor, SQL ni credenciales. Códigos de presentación se conservan aparte del UUID. Fechas de evento UTC ISO8601; fecha civil `YYYY-MM-DD`; visualización America/Guatemala. Dinero en unidades menores enteras y moneda; definir redondeo de cada línea antes de sumar.

Contrato común v1 especificado en E00-P1-03: [OpenAPI](../Backend/docs/openapi.yaml), [puertos puros](../Backend/docs/puertos-v1.ts), [mapa de los 117 métodos UI](../Backend/docs/mapa-ui-v1.json) y [fixtures](../Backend/docs/fixtures/contrato-v1.json). Son contratos, no endpoints implementados. E01-P1-01 configura el runtime y cada tarea amplía su extensión antes de implementarla. Debe incluir campo/tipo/obligatoriedad/límite, permiso, capacidad institucional, respuesta, idempotencia, versión y todos los errores de la operación. Un método residual de `contracts.ts` no obliga a crear un endpoint. Publicar únicamente operaciones de alcance.

## 2. Inventario de rutas comunes y extensiones previstas

| Familia | Rutas previstas bajo `/api/v1` | Política / tarea |
|---|---|---|
| Sesión | `POST /sesion`, `GET /sesion`, `POST /sesion/cierre` | Reciben token, nunca el motor ni credenciales de BD; E01-P1-03 |
| Paciente | `POST /pacientes`, `GET /pacientes`, `GET/PATCH /pacientes/{id}` | Alta/historial atómicos, búsqueda no vacía, actualización con versión; E02 |
| Historial | `GET /pacientes/{id}/historial`, `GET /pacientes/{id}/expediente`, `POST /pacientes/{id}/archivo`, `POST /pacientes/{id}/reactivacion` | Reactivación solo pediatría; E02-P2-03/E03-P1-03 |
| Agenda | `GET/POST /citas`, `GET/PATCH /citas/{id}` | Hospital, odontología y pediatría; atender mediante consulta atómica; E03/E04 |
| Consulta | `POST /consultas`, `GET /consultas/{id}`, `POST /consultas/completas`, `POST /consultas/{id}/finalizacion` | Profesional derivado de cuenta; E03 |
| Atención | `POST /consultas/{id}/diagnosticos`, `/tratamientos`, `/receta`, `/correcciones`; `GET /consultas/{id}/revisiones` | Historia de recetas, un principal cuando hay diagnósticos; E03 |
| Hospital | `/hospitalizaciones`, `/{id}/egreso`, `/{id}/asignaciones-cama`, `/camas`; `/ordenes-examen`, `/{id}/resultados`; `/pacientes/{id}/polizas`, `/procedimientos` | Métodos de lectura/alta/cambio con permisos y versión definidos en E04-P1; no CRUD libre de camas |
| Laboratorio | `/laboratorio/referencias`, `/pruebas`, `/ordenes`, `/muestras`, `/{id}/eventos`, `/resultados`, `/{id}/validacion`, `/{id}/correcciones`, `/{id}/repeticiones` | Recursos dentro de `/laboratorio`; E05-P1-01/P2-01 |
| Informe | `/laboratorio/informes`, `/{id}/emision`, `/{id}/archivo`, `/{id}/versiones` | Archivo autorizado e inmutable; E05-P1-02 |
| Economía y calidad | `/laboratorio/facturas`, `/pagos`, `/{id}/reversion`; `/lotes`, `/movimientos`, `/equipos`, `/controles-calidad` | Rutas abreviadas siempre bajo `/laboratorio`; E05-P1-03/P2-02 |
| Pediatría | `/pacientes/{id}/responsables`, `/alergias`, `/antecedentes`, `/crecimiento`, `/esquemas`; `/vacunas`, `/{id}/versiones`; `/aplicaciones-vacuna`, `/{id}/correcciones`, `/{id}/anulacion` | Crecimiento es consulta de mediciones; registrar/corregir desde consulta. E04-P2 |
| Cuentas/auditoría | `/usuarios`, `/{id}/estado`, `/auditoria`, `/{id}` | UI cuentas solo laboratorio; auditoría visible laboratorio/pediatría. Roles fijos, sin edición de matriz; E05-P2-03 |

Las rutas comunes congeladas son exclusivamente las 26 operaciones del OpenAPI. Las familias especializadas de esta tabla son propuestas, no endpoints especificados; su tarea E04/E05 fija URI completa y métodos antes de conectarlas al cliente HTTP. La §7 y el mapa v1 fijan precedencia y responsables. Los endpoints de catálogo solo lectura hospital/dental alimentan formularios; los catálogos documentales sí tienen mantenimiento documentado. No aceptar un evento de auditoría arbitrario enviado por React: lo genera el caso de uso del servidor.

## 3. Flujo común de éxito

1. Usuario inicia sesión; API valida token/cuenta, recupera institución y permisos actuales.
2. UI envía datos funcionales, clave de reintento y versión cuando aplica. Servidor valida DTO y capacidad institucional.
3. Resolver todas las referencias en el ámbito del usuario. Preparar unidad de trabajo del motor asignado; evaluar reglas comunes y política institucional.
4. Confirmar datos + reserva/idempotencia + revisión/auditoría. Mapear a DTO común.
5. UI refresca recurso/versiones desde API y muestra estado persistido. Recargar navegador verifica conservación.

Alta pediátrica incluye responsable principal; consulta pediátrica requiere vínculo vigente que autoriza. Consulta dental incluye cita PROGRAMADA de ese paciente y odontólogo. En laboratorio el núcleo clínico requiere solicitante médico individual autorizado; un analista no es automáticamente prescriptor.

## 4. Tabla de rechazo y respuesta

| Situación | Respuesta | Efecto / acción cliente |
|---|---|---|
| Entrada/cursor/fechas inválidos, campo obligatorio ausente | 400 `SOLICITUD_INVALIDA` | Cero escritura y clave no consumida; resaltar campo |
| Token ausente, vencido o revocado | 401 `NO_AUTENTICADO` | No conectar datos clínicos; renovar identidad o volver al acceso |
| Cuenta pendiente/inactiva, permiso o capacidad ausente | 403 `CUENTA_NO_HABILITADA` / `SIN_PERMISO` | Sin datos restringidos; no reintentar como si fuera caída de red |
| ID inexistente/ajeno | 404 `RECURSO_NO_ENCONTRADO` | No revelar que existe en otra institución |
| Identidad existente | 409 `PACIENTE_DUPLICADO` | Conservar alta original; buscar/reutilizar con permiso |
| Misma clave, diferente entrada | 409 `CLAVE_REUTILIZADA` | No mutar nada; corregir flujo, nueva clave solo para nueva intención |
| Versión esperada distinta | 409 `VERSION_DESACTUALIZADA` | Recargar, mostrar cambios, solicitar nueva intención; no sobrescribir |
| Cita/cama/dosis/saldo/estado/referencia incompatibles | 409 `ESTADO_INVALIDO` o `REFERENCIA_INCOMPATIBLE` | Revertir comando; usar códigos específicos acordados para duplicidad de receta/dosis/cama |
| Receta ordinaria ya emitida | 409 `RECETA_EXISTENTE` | Entrar a corrección versionada, no segunda emisión |
| Documento >256 KiB o arreglo >100 elementos | 413 `LIMITE_AGREGADO` | Sin truncamiento ni escritura parcial; límites de diseño |
| Motor/archivo/identidad inaccesible tras intentos permitidos | 503 `PERSISTENCIA_NO_DISPONIBLE` o error de dependencia acordado | Conservar clave; ofrecer reintento seguro; registrar correlación sin payload clínico |
| Defecto inesperado | 500 `ERROR_INTERNO` (extensión del plan) | Rollback, mensaje neutral y correlación; evidencia técnica protegida |

E00 debe fijar códigos especializados sin filtrar mensajes nativos. No traducir todo fallo de constraints a «paciente duplicado»: usar mapa de restricciones/operaciones y verificar el agregado afectado.

## 5. Flujos de fallo y excepciones transversales

- Validación falla antes de transacción: no guardar paciente, reserva, operación ni auditoría clínica de cambio. Un log técnico de rechazo no incluye datos clínicos.
- Falla receta o auditoría dentro de consulta completa: rollback de todo el agregado. La siguiente petición con misma clave puede completar una sola vez.
- Doble clic/pérdida de respuesta: repetir clave y hash devuelve resultado original; misma clave con datos distintos es conflicto. Comparar resultado durable tras commit incierto.
- Dos usuarios editan: solo una versión esperada gana; la otra no produce revisión ni evento exitoso. Stock/saldo/cama/dosis deben probarse con sesiones independientes.
- Archivo concurrente con nueva atención: coordinar ambos comandos sobre la revisión/bloqueo del historial/paciente; no basta leer ACTIVO fuera de transacción. Atención ya iniciada puede terminar; nueva atención posterior no se admite.
- Callback NoSQL repetido: IDs del comando estables, sin llamadas a Auth, correo, generación de archivos ni otros efectos externos. Revalidar saldo/referencias en cada intento.
- Falta un motor: operaciones de esa institución fallan explícitamente; no redirigir al motor de otra ni recurrir a mocks. Las demás pueden seguir si el arranque y readiness fueron diseñados para degradación parcial documentada.

## 6. Consulta histórica y paginación

Filtros autorizados, rango `[desde,hasta)`, límite 1–100 (20 por defecto), orden `(fecha_hora,id_publico)` y cursor opaco vinculado a filtros/orden/institución. Cada adaptador de historial combina fuentes institucionales mediante mezcla ordenada y cursores por fuente; puede usar una proyección transaccional documentada si se justifica con migración. No cargar todos los eventos para paginar en memoria. No se promete snapshot entre páginas con escrituras concurrentes; probar ausencia de duplicados/omisiones sobre conjunto estable y comportamiento de recarga.

Los eventos especializados no se pierden en la proyección común: hospital agrega ingresos/exámenes; laboratorio agrega órdenes/resultados/informes; pediatría agrega vacunas/crecimiento. El permiso determina qué detalle se devuelve, no el motor.


## 7. Congelación del contrato común v1 — E00-P1-03

Fecha: 25/10/2026. Decisión técnica de proyecto, no requisito adicional atribuido al docente. La fuente de DTO/método/URI es `Backend/docs/openapi.yaml` (OpenAPI 3.1.0, versión de producto 1.0.0). El mapa de presentación es `Backend/docs/mapa-ui-v1.json`; el inventario anterior se conserva con correcciones explícitas en Frontend/docs. Ante discrepancia con propuestas de rutas de §2 o tablas anteriores, prevalece este contrato. No acreditar implementación con ejemplos o firmas.

### Autoridad, sesión y proyecciones

- `POST /sesion` establece perfil desde Bearer sin body; `GET /sesion` lo actualiza; `POST /sesion/cierre` revoca refresh tokens del UID verificado y después el cliente ejecuta signOut. Una falla Auth produce 503 IDENTIDAD_NO_DISPONIBLE, sin anunciar cierre global exitoso. No hay rutas `/auth/me`, `/auth/logout`, login alternativo, contraseña local, token en query ni selector de institución.
- Cada petición verifica firma/emisor/audiencia/vencimiento/revocación y recupera cuenta/roles/profesional vigentes. Institución del token y cuenta deben coincidir. Un claim desconocido no crea una conexión. La falta de revocación no se admite como optimización.
- Los DTO de entrada son cerrados (`additionalProperties: false`), incluidos objetos anidados. Actor, rol, profesional emisor, motor e institución enviados por cliente se rechazan con 400. `profesional_id` de una cita es una referencia seleccionada, nunca el actor: verificar que está activo en la institución. No aceptar nombres como autoridad.
- La ficha de paciente es administrativa. Solo `historial.leer` abre historial/expediente/consulta; secretaría no recibe notas, diagnósticos, receta ni snapshots clínicos. Responsables se proyectan solo en pediatría conforme al permiso. Cuenta administrativa no concede prescripción.
- Campos JSON usan snake_case; mappers React conservan camelCase y el alias CENTRO_PEDIATRICO exclusivamente en presentación. Respuesta canónica usa CENTRO_MEDICO_PEDIATRICO; IDs públicos UUID, sin PK/ObjectId/Timestamp/SQL/motor en cuerpo ni error. Dinero GTQ en enteros de centavos, máximo entero seguro 9007199254740991; redondear línea en el mapper antes de sumar.

### Versiones e intención de comando

- Todas las mutaciones clínicas, incluidos PATCH, archivo, cancelación y corrección, exigen Idempotency-Key UUID. Sesión es una operación de identidad, fuera de la UoW clínica. En cambios de recursos existe `version_esperada` obligatoria en body; no hay alternativa If-Match en v1. Las lecturas devuelven `version` ≥1.
- Alta de cita y apertura/consulta completa exigen `version_paciente`; si hay cita, `version_cita`; si hay autorización pediátrica, `version_vinculo`. El cambio transaccional avanza la revisión del paciente/historial para serializar archivo contra nueva atención; la validación no puede limitarse a una lectura previa fuera de la transacción. La respuesta de un comando debe reflejar la versión de su recurso; refrescar perfil antes del siguiente comando sobre paciente.
- Clave efectiva: institución canónica del bundle + cuenta del actor + caso de uso + Idempotency-Key. Hash de intención SHA-256 hexadecimal minúsculo de la serialización JCS (RFC 8785) en UTF-8 del DTO validado, incluyendo UUID y versiones, sin token/correlación. Rechazar propiedades duplicadas en JSON, NaN e Infinity; números dentro del rango seguro del contrato. JCS ordena claves por UTF-16, conserva orden de arrays y no normaliza Unicode; no interpretar de nuevo fechas civiles ni normalizar silenciosamente texto clínico. La reserva es durable mientras se conserve la operación; no purgarla durante el flujo de entrega. E01 implementa JCS y prueba vectores compartidos antes de implementar adaptadores; no sustituirlo por JSON.stringify sin canonización.
- Fijar UUID, reloj e IDs de todos los eventos antes del callback repetible. Dentro: leer operación previa y contexto vigente, validar hash y permisos, cargar referencias/versiones; devolver resultado durable si ya se confirmó. Repetición devuelve código HTTP, cuerpo y correlación originales; no crea nuevo evento exitoso. Mismo hash con permiso retirado no permite leer resultado clínico.
- Mismo key con entrada distinta: 409 CLAVE_REUTILIZADA. Versión anterior: 409 VERSION_DESACTUALIZADA. Payload inválido no consume clave. Un fallo de regla o excepción revierte datos, reservas, revisión, operación y auditoría; registro técnico saneado aparte. Commit incierto: consultar resultado durable con la misma clave; si no se puede reconciliar, 503, nunca inventar éxito ni otra clave.
- `version_esperada` antigua no se cambia automáticamente al reintentar. Tras conflicto, recargar y pedir una nueva intención con clave nueva. Tras 503/red perdida, conservar exactamente el DTO y clave. Un retry transitorio interno repite el comando completo como máximo tres veces dentro de plazo acotado; no reintentar entrada/permiso/versión/regla.

### Clínica y políticas institucionales

- `POST /consultas/completas` confirma consulta FINALIZADA + diagnósticos/tratamientos/receta opcional + estado de cita + revisión/auditoría/operación, todos atómicos. No invoca endpoints hijos. Con diagnósticos no vacíos, exactamente un principal (también validado por esquema). Si incluye receta, requiere recetas.emitir además de los permisos clínicos declarados.
- `POST /consultas` abre una consulta ABIERTA con las mismas reglas de pertenencia, cita y autorización. Las altas posteriores de diagnósticos/tratamientos/receta y la finalización exigen profesional activo autorizado y versión de consulta. Solo modifican ABIERTA; FINALIZADA se corrige con motivo. Solo una receta ordinaria: 409 RECETA_EXISTENTE. Finalizar puede completar un proceso iniciado antes del archivo; no abre una atención nueva.
- Corrección de FINALIZADA: `POST /consultas/{id}/correcciones` recibe snapshot clínico completo en `contenido`, motivo y versión. Guarda anterior y nuevas versiones de receta sin borrado histórico. Paciente, cita, autor/profesional e institución son inmutables. Incluir, modificar o retirar receta exige recetas.emitir. El servidor revalida permisos sobre cada componente que cambie y autorización de acceso histórico; archivar no impide correcciones autorizadas.
- Diagnóstico/receta desde expediente siempre elige una consulta ABIERTA explícita: las firmas UI sin consulta se ampliarán en E03. No se publica `/pacientes/{id}/diagnosticos` ni `/pacientes/{id}/recetas` independiente. No adivinar la consulta más reciente.
- Odontología: cita requerida y elegible, paciente y profesional coincidentes. Ausencia → 400; referencia ajena → 404; cita propia incompatible → 409 REFERENCIA_INCOMPATIBLE. Identificación puede omitirse; nunca reservar clave vacía.
- Pediatría: alta requiere ≥1 principal. Puede ser responsable nuevo (sin UUID cliente) o existente referenciado con versión; se crea/revalida/vincula atómicamente. Atención exige vínculo vigente con autoriza_atencion y snapshot de autorización, distinto de ser principal. Cambios del vínculo avanzan revisión del paciente. Reactivación solo aquí, con motivo y permiso historial.archivar; si archivo por fallecimiento, exige correccion_fallecimiento=true y motivo justificativo (409 ESTADO_INVALIDO si no).
- Laboratorio: sin agenda pública. Clínica común solo MEDICO_LABORATORIO con solicitante médico individual vinculado activo; analista/validador no prescribe. La agenda aquí y la reactivación fuera de pediatría responden 403 SIN_PERMISO.
- Fecha civil: YYYY-MM-DD real, sin conversión. Citas usan hora civil HH:mm en America/Guatemala y duración 5–480 minutos; fin posterior a inicio en el mismo día, solapamiento semiabierto [inicio,fin). Si cruza medianoche, 400. Agenda usa rango [fecha_desde,fecha_hasta), con hasta posterior a desde. Evento UTC termina en Z; nunca inferirlo de una fecha civil. Límites de signos vitales son restricciones de captura, no diagnóstico automático.

### Páginas, errores y límites

- Pacientes requiere q con al menos un carácter distinto de espacio (máximo 120); búsqueda por ID usa GET individual. Orden de pacientes es (fecha_registro, UUID); eventos usan (fecha_hora, UUID); citas (fecha, hora_inicio, UUID); revisiones (fecha_hora, UUID). ASC por defecto, DESC explícito; invertir comparación/mezcla de todas las fuentes, nunca solo una página.
- Cursor opaco base64url, máximo 2048 caracteres; adaptador lo autentica y vincula a cuenta/permisos, institución, recurso, filtros normalizados, orden y última tupla por fuente. No exponer identificadores nativos. Un cursor de otra consulta/ámbito, alterado o con orden distinto → 400 SOLICITUD_INVALIDA. El esquema acredita sintaxis, no autenticidad del cursor; E02 prueba vínculo y firma. Límites 1–100, predeterminado 20. Rangos de eventos [desde,hasta) UTC; desde < hasta cuando ambos se suministran.
- GET expediente devuelve paciente e historial con una página de eventos; siguiente_cursor está en meta del sobre. Los detalles especializados se consultan por recursos autorizados; extender proyección antes de conectar pestañas E04/E05. No volcar arrays ilimitados ni cargar todos los eventos para paginar.
- Catálogo cerrado de errores en OpenAPI; los códigos 422 de borradores UI quedan sustituidos: entrada 400, autenticación 401, cuenta/permiso/capacidad 403, ajeno/inexistente 404, concurrencia/estado 409, tamaño 413, defecto 500, dependencia 503. 409 incluye PACIENTE_DUPLICADO, CLAVE_REUTILIZADA, VERSION_DESACTUALIZADA, ESTADO_INVALIDO, REFERENCIA_INCOMPATIBLE, RECETA_EXISTENTE, CITA_SOLAPADA, CAMA_NO_DISPONIBLE, STOCK_INSUFICIENTE, SALDO_INSUFICIENTE y DOSIS_DUPLICADA. No filtrar constraint, proveedor, dato de paciente ajeno ni stack.
- 256 KiB = 262144 bytes UTF-8 del cuerpo y del agregado/documento que se vaya a persistir; máximo 100 elementos por colección embebida. Los errores de tamaño los detecta el borde antes de parsear cuando sea posible y el planificador antes de escribir el agregado; JSON Schema cubre arrays/longitudes, el middleware debe medir bytes. Respuestas se paginan para cumplir límites, nunca truncar en silencio.

### Permisos fijos de recepción y extensiones

Se resuelve la brecha DEC13: `ordenes.administrar` permite registrar/consultar órdenes y sus referencias administrativas; `muestras.administrar` permite recibir, trasladar, rechazar, retomar y rectificar muestras con trazabilidad. En laboratorio se asignan a SECRETARIA y ADMIN_INSTITUCIONAL; no otorgan resultados.analizar, resultados.validar, informes.emitir ni consultas.registrar. Catálogo de pruebas/referencias y calidad se especifican por capacidad en E05 antes de publicar DTO/guard; no inferir permisos por acceso al menú.

Puertos comunes compilables: VerificadorIdentidad, RepositorioCuenta, Paciente, Cita, Consulta, Identidades, Responsables, Profesional, ConsultaHistorial, Operaciones, Reloj/GeneradorIds y UnidadDeTrabajo. Los lectores están ligados a una transacción y bundle; el planificador devuelve cambios tipados de agregados, reservas, snapshots y auditoría, sin escritores ni commits internos. La operación idempotente se agrega por la UoW al mismo commit. Ampliar tipos por capacidad institucional; ningún puerto acepta motor ni nombre de tabla/ruta documental.

Responsables de extensiones: E03-P2-01 (catálogo profesional); E04-P1-01 (odontología), E04-P1-02/P1-03 (hospital), E04-P2-01/P2-02/P2-03 (pediatría); E05-P1-01/P2-01 (órdenes, catálogos, muestras/resultados), E05-P1-02 (informes/archivo), E05-P1-03 (calidad/inventario), E05-P2-02 (facturas/pagos), E05-P2-03 (cuentas/auditoría). Cada entrada del mapa UI tiene su puerta: DTO cerrado, método/URI, permiso y capacidad, versión/idempotencia, invariantes/UoW, errores, límites, ejemplos positivos/negativos y revisión antes de implementación. No sustituirlos por endpoints genéricos ni alegar cobertura de una ruta propuesta.

E01-P2-03 conecta infraestructura cliente HTTP común. Los adaptadores especializados esperan su contrato; deben fallar explícitamente mientras esté pendiente. No hay fallback a mocks. La provisión de cuentas y archivos de informes son procesos recuperables fuera del callback clínico, según arquitectura §5/§6.

Fuente primaria de canonización de reintentos: [RFC 8785, JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785), consultada el 25/10/2026.


### Precisiones tras revisión de Codex de bc8f27a

- El PATCH demográfico distingue omisión (conservar), valor (reemplazar) y null (retirar campos opcionales: identificacion, telefono, correo, direccion, grupo_sanguineo, contacto_emergencia). Los campos obligatorios nunca admiten null. Cliente traduce un correo/documento/contacto borrado explícitamente a null y no a cadena vacía; una propiedad no editada se omite. El planificador calcula snapshot nuevo sin el campo retirado y preserva revisión previa; retirar/cambiar identificación libera/reserva la clave única en el mismo commit. Alta sigue omitiendo opcionales vacíos y respuestas omiten los retirados.
- Paciente ARCHIVADO contiene baja tipada con causa, motivo, fecha y actor. El plan de confirmación persiste también EventoEstadoPaciente; la reactivación conserva bajaAnterior con su causa/motivo y la justificación de corrección de fallecimiento en ese historial. Paciente ACTIVO no mantiene una baja vigente. El lector de paciente recupera baja actual e historial paginado de estados para validar y reconstruir sin pérdida.
- VinculoResponsable en aplicación conserva parentesco además de versiones, principal, autorización y estado; el adaptador no infiere ni inventa esa relación.
- RepositorioCita.listar recibe FiltrosCitas completo (rango, profesional, estado, q) más paginación; filtrar en persistencia antes de seleccionar la página. Todos los filtros se vinculan al cursor.


### Conservación de agenda y filtros de revisiones (segunda revisión de 2bc43e0)

Cita CANCELADA exige motivo_cancelacion tanto en lectura/plan de escritura como en la respuesta HTTP. El motivo de asistencia permanece independiente. Cancelar/reprogramar guarda RevisionCita (motivo de cambio, actor, fecha, snapshot anterior y actual) en el mismo commit; las revisiones se leen paginadas en `GET /citas/{id}/revisiones`. El adaptador React compone este endpoint con el detalle para mostrar historialReprogramaciones; nunca devuelve un array ilimitado. CitaRevisiones conserva la misma capacidad de agenda y permisos que su detalle.

RepositorioConsulta.revisiones y RepositorioCita.revisiones reciben RangoInstantes opcional además de FiltrosPagina. Persistencia filtra [desde,hasta) antes de seleccionar página y vincula rango/orden al cursor. El plan tipa revisiones de citas y de pacientes para conservar el estado anterior de cambios demográficos; el snapshot de consulta incluye datos históricos del profesional y autorización pediátrica (identificación, nombre y fecha), sin reconstruir historia desde datos actuales que puedan cambiar.


### Metadatos de receta y responsable identificado (tercera revisión de b97b576)

Se separa RecetaEntrada (medicamentos/observaciones) de RecetaEmitida persistida y expuesta (id, código, versión, estado, fecha_emision y prescriptor histórico). Metadatos solo del servidor: fecha de emisión puede ser posterior a fecha_hora de consulta y nunca se sustituye por ella. Una corrección preserva fecha original y agrega fecha de cambio en la revisión. Prescriptor y autorización se capturan históricamente para no reconstruirlos desde perfiles actuales.

M04 exige identificación del responsable; NuevoResponsable requiere documento y nombres/apellidos explícitos, y Responsable en puerto/lectura conserva esos datos. El campo UI nombre se compone para presentación; la captura de alta se amplía en E02/E04, sin inventar apellidos ni documento. Principal no requiere autoriza_atencion, pero sí identificación válida del responsable nuevo. Referencias existentes usan UUID/version y se revalidan. La política pediátrica de receta exige concentración no vacía y vía ≤100 caracteres, declaradas en overlays de consulta completa, emisión y corrección; ninguna condición por driver en dominio.

Recarga de responsables (cuarta revisión de 085d2e1): RepositorioResponsables.porPaciente(pacienteId, pagina) enumera vínculos y resuelve snapshots globales del mismo ámbito. BundleInstitucional expone este lector además del LectorTransaccional; paciente/expediente no dependen de IDs de responsables conocidos por el cliente. La ficha proyecta la página autorizada dentro de límites; las extensiones E04 definen la navegación de vínculos adicionales.
