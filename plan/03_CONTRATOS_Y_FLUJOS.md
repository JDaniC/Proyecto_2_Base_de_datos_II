# Contratos comunes, flujos y excepciones

## 1. Convenciones que se congelan en E00

API `/api/v1`; `{data, meta:{correlacion, siguiente_cursor?}}`. Error `{error:{codigo,mensaje,campos?},meta:{correlacion}}`. UUID públicos, `version` en lectura y `version_esperada` en actualización. Cabecera `Idempotency-Key` en creaciones/movimientos y comandos compuestos. No exponer PK, BSON, motor, SQL ni credenciales. Códigos de presentación se conservan aparte del UUID. Fechas de evento UTC ISO8601; fecha civil `YYYY-MM-DD`; visualización America/Guatemala. Dinero en unidades menores enteras y moneda; definir redondeo de cada línea antes de sumar.

El OpenAPI se producirá en E00-P1-03/E01-P1-01 y se ampliará por tarea. Debe incluir campo/tipo/obligatoriedad/límite, permiso, capacidad institucional, respuesta, idempotencia, versión y todos los errores de la operación. Un método residual de `contracts.ts` no obliga a crear un endpoint. Publicar únicamente operaciones de alcance.

## 2. Inventario de rutas a especificar

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

En rutas especializadas abreviadas, E00/E04/E05 fijan URI completa y métodos antes del cliente HTTP. Los endpoints de catálogo solo lectura hospital/dental alimentan formularios; los catálogos documentales sí tienen mantenimiento documentado. No aceptar un evento de auditoría arbitrario enviado por React: lo genera el caso de uso del servidor.

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
