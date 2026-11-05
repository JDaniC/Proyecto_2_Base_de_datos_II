# Laboratorio v1 — contrato de implementación E05-P1-01

Estado: capacidades E05-P1-01 conectadas a HTTP y documentadas en OpenAPI por PR76, con pruebas físicas MongoDB y de transporte. Institución exclusiva LABORATORIO_CLINICO desde token verificado y cuenta vigente, sin selector/body de autoridad. E05-P2-01 conserva resultados; informes, stock/calidad y cobro son tareas distintas.

## Capacidades y permisos

Órdenes y lectura de referencias administrativas: ordenes.administrar. Eventos/toma/retoma/rectificación y lectura de muestras: muestras.administrar. Ambos se asignan según matriz fija a SECRETARIA y ADMIN_INSTITUCIONAL. El mantenimiento administrativo de solicitantes/tipos/proveedores exige ordenes.administrar y rol ADMIN_INSTITUCIONAL; publicación/versionado/desactivación técnica de pruebas/métodos exige resultados.validar y rol VALIDADOR_LABORATORIO. Son decisiones locales de capacidad E05 (plan/03 §7); se aplicarán tanto en caso como guard, no por menú. Ningún permiso administrativo concede analizar, validar resultados, emitir informes o prescribir. Cuenta/roles/profesional se revalidan dentro de cada escritura.

## Operaciones publicadas

Todas bajo `/laboratorio`, DTO cerrado; desconocidos/autoridad cliente →400. POST/PATCH exige Idempotency-Key UUID; actualización de agregado exige versionEsperada positiva. IDs de recurso/evento, actor e instante los fija aplicación antes de callback repetible. Error de versión409; referencia inactiva/incompatible409; sin capacidad403; legado sin snapshot verificable503 RECONCILIAR. El contrato canónico contiene 79 rutas totales y 14 nuevas rutas de laboratorio.

| Ruta y método | Entrada de negocio | Lecturas/plan atómico |
|---|---|---|
| POST /ordenes | pacienteId, versionPaciente, solicitanteId, prioridad, indicaciones, moneda GTQ, items[{pruebaId,centavos}] | Paciente activo, solicitante y prueba/método/tipos vigentes; snapshot exacto de prueba/precio; tocar revisión paciente + orden + operación/auditoría |
| GET /ordenes y /ordenes/{id} | filtros autorizados/página o UUID | Listado en motor, sin cargar todo para paginar |
| POST /muestras | ordenId, versionOrden, itemIds, tipoMuestraId, codigo, recipiente | Orden anterior habilitada, ítems propios y tipos compatibles; muestra TOMADA + evento, tocar revisión orden y reservar código único |
| POST /muestras/{id}/eventos | versionEsperada, versionOrden, tipo RECEPCION/ACEPTACION/RECHAZO/TRASLADO/PROCESAMIENTO, detalle | Revisar estado/orden/cronología; revisión previa + muestra/evento + operación/auditoría |
| POST /muestras/{id}/rectificaciones | versionEsperada, versionOrden, campo tipoMuestraId/recipiente, nuevo, motivo | Referencia compatible y valor anterior verificable; antes/después inmutables; no reabrir rechazo |
| POST /muestras/{id}/retomas | versionEsperada, versionOrden, codigo, tipoMuestraId, recipiente, motivo | Origen rechazado sin sucesora; nueva muestra y evento + enlace origen/sucesora; ambas revisiones en misma UoW |
| GET /muestras y /muestras/{id} | filtros autorizados/página o UUID | Historia íntegra y vínculo original; datos de orden/paciente del servidor |

Catálogos: lectura en `GET /laboratorio/catalogos/{tipo}` y mantenimiento administrativo tipado en `POST/PATCH /laboratorio/referencias/{tipo}[/{id}]`, sin escritura arbitraria de colecciones. Publicación y estado de pruebas/métodos usan rutas separadas. Cada versión nueva recibe su propio ID y reconoce a su predecesora por el mismo código y `version - 1`; el índice `codigo/version` impide duplicados. Desactivar impide nueva selección, nunca borra ni cambia snapshots emitidos.

## Estados y representación

Físico orden: CREADA/EN_PROCESO/COMPLETADA/CANCELADA; ítem SOLICITADO/EN_PROCESO/COMPLETADO/CANCELADO. UI STAT se mapea EMERGENCIA. MUESTRA_PENDIENTE/EN_ANALISIS/PARA_VALIDAR son proyecciones derivadas cuando exista evidencia de muestras/resultados, no valores nuevos escritos al enum físico. PENDIENTE_TOMA representa solicitud, no muestra física con fecha/actor ficticios. Muestra TOMADA→RECIBIDA→ACEPTADA→PROCESADA; RECIBIDA/ACEPTADA→RECHAZADA. Rectificar no cambia estado. Retomar crea identidad distinta enlazada y conserva origen rechazado. Traslado conserva estado y exige destino/detalle; no se permite sobre terminada.

## Migración y pruebas exigidas

M03 tiene documentos cerrados: la migración explícita 011 añade snapshots de ítems, vínculo de retoma, recipiente, eventos con referencia a origen y revisión/procedencia; nunca se modifica solo el inicializador. Preserva M01–M09 y restauración. Legado sin versión/snapshot verificable queda RECONCILIAR: no se inventan versiones ni nombres históricos desde el catálogo actual.

Búsquedas por paciente/orden/estado y rango [desde,hasta), orden (fecha,id), límite1–100 predeterminado20; cursor autenticado ligado a cuenta/permisos/ámbito/recurso/filtros. Índices explícitos en migración. Pruebas físicas: nueva/existente/fallo/recuperación/reejecución sin pérdida; código duplicado, archivo/nueva orden, auditoría fallida y rollback multidocumento, reintentos idempotentes. Pruebas unitarias no acreditan esas garantías.

PR76 integra CrearOrdenLaboratorio y GestionarMuestraLaboratorio, sus rutas HTTP, el mantenimiento de catálogos y la migración 011. Las pruebas físicas están registradas en plan/evidencias/E05/migracion-011.json. Versiones de orden y muestra se exigen por separado; IDs/actor/instante se fijan fuera del callback.

Proyección común: creación de orden y comandos de custodia añaden ORDEN_LAB con recursoId de orden y título administrativo, sin copiar contenido clínico al resumen. Índice de historial usa instante UTC normalizado a9 decimales del contrato v1. Primera muestra cambia CREADA→EN_PROCESO; completar resultados/orden corresponde a E05-P2-01, sin anticipar validación.

PublicarPruebaLaboratorio y su endpoint están implementados: DTO cerrado codigo/version/anteriorId/nombre/area/metodoId/tiposMuestraIds/parametros; parámetros cerrados id/codigo/nombre/tipo/obligatorio/unidad?/opciones?. Versión1 sin predecesora; siguientes requieren UUID anterior exacto con mismo código y versión+1. Conserva identidad id/código de parámetros previos; exige método/tipos activos. Insert-only, unicidad codigo/version e idempotencia; sin mutación de versiones publicadas.

CambiarEstadoPruebaLaboratorio y su endpoint están implementados: UUID de versión en ruta; DTO cerrado versionEsperada/activo/motivo. Requiere rol VALIDADOR_LABORATORIO y resultados.validar actuales; solo modifica activo y revisión de control, no número ni contenido de versión. Conserva revisión anterior y auditoría; revisión obsoleta409. La revisión de control es distinta de la versión analítica.

PublicarMetodoLaboratorio y su endpoint están implementados: DTO cerrado codigo/version/anteriorId?/nombre/descripcion?. Rol VALIDADOR_LABORATORIO y resultados.validar actuales; versión1 sin predecesora y siguientes con mismo código/versión anterior+1. Insert-only y unicidad codigo/version; pruebas y órdenes conservan UUID del método anterior, sin promoción automática.

CambiarEstadoMetodoLaboratorio implementado sin endpoint: mismo DTO y permiso que estado de prueba, pero sobre revisión de control de método. No cambia versión analítica ni contenido; un método inactivo bloquea la selección de pruebas que lo referencian en órdenes nuevas. Ambos casos comparten validación y plan en CambiarEstadoVersionLaboratorio, con capacidades fijas prueba/método.

GuardarReferenciaLaboratorio y sus endpoints están implementados para capacidades fijas solicitante/tipoMuestra/proveedor. Sobre cerrado datos/motivo/versionEsperada?; alta sin versión, actualización con UUID de ruta y versión obligatoria. Datos cerrados según dominio/laboratorio/referencias.ts; ADMIN_INSTITUCIONAL+ordenes.administrar vigente. Un solicitante `MEDICO` exige `entidadColegiacion` y `numeroColegiado`; esos campos no son obligatorios para `INSTITUCION`. En actualización solo los campos que el tipo de referencia permite omitir se conservan al omitirlos; `null` retira explícitamente los campos anulables. Preserva revisión previa y auditoría, no borra identidades ni convierte solicitante médico en institución.

Listados Mongo están conectados al caso y controlador: filtros antes de sort/limit (fecha,id), límite+1 y cursores AES-GCM existentes. Ámbito incluye institución/cuenta/revisión/permisos/recurso/filtros/orden. Muestras filtra por orden/estado/rango y paciente. Datos Mongo en milisegundos: límites de rango con fracción superior se redondean hacia arriba para conservar [desde,hasta). Sin promesa de snapshot entre páginas con escrituras concurrentes.

ConsultarListadosLaboratorio está publicado por HTTP: valida consulta cerrada y cuenta actual, roles/permisos desde base; no reutiliza autoridad anterior del contexto. Adapter lee página y eventos en una transacción snapshot de solo lectura, commit antes de generar cursor. Cada página es coherente; no se promete snapshot compartido entre páginas. Hook de interleaving solo por dependencia de ensayo, no expuesto por puerto/controlador.

ConsultarRecursosLaboratorio está publicado por HTTP: detalle de orden/muestra y cinco catálogos con cuenta revalidada. Referencias administrativas solicitan ordenes.administrar; métodos/pruebas/tipos admiten lectura por ordenes/muestras/resultados.analizar/resultados.validar según capacidad, sin conceder escritura. Catálogos filtran activo y prefijo literal de nombre/código, ordenan UUID y limitan en motor. Cursor UUID AES-GCM específico vinculado a cuenta/permisos/filtros/catálogo. Pruebas y métodos exponen revisión de control separada de versión analítica.
