# Laboratorio v1 — contrato de implementación E05-P1-01

Estado: diseño de capacidad; endpoints y persistencia aún NOT_IMPLEMENTED. Dominio y puertos en PR76 no habilitan el bundle. Institución exclusiva LABORATORIO_CLINICO desde token verificado y cuenta vigente, sin selector/body de autoridad. E05-P2-01 conserva resultados; informes, stock/calidad y cobro son tareas distintas.

## Capacidades y permisos

Órdenes y lectura de referencias administrativas: ordenes.administrar. Eventos/toma/retoma/rectificación y lectura de muestras: muestras.administrar. Ambos se asignan según matriz fija a SECRETARIA y ADMIN_INSTITUCIONAL. El mantenimiento administrativo de solicitantes/tipos/proveedores exige ordenes.administrar y rol ADMIN_INSTITUCIONAL; publicación/versionado/desactivación técnica de pruebas/métodos exige resultados.validar y rol VALIDADOR_LABORATORIO. Son decisiones locales de capacidad E05 (plan/03 §7); se aplicarán tanto en caso como guard, no por menú. Ningún permiso administrativo concede analizar, validar resultados, emitir informes o prescribir. Cuenta/roles/profesional se revalidan dentro de cada escritura.

## Operaciones previstas

Todas bajo /laboratorio, DTO cerrado; desconocidos/autoridad cliente →400. POST exige Idempotency-Key UUID; actualización de agregado exige versionEsperada positiva. IDs de recurso/evento, actor e instante los fija aplicación antes de callback repetible. Error de versión409; referencia inactiva/incompatible409; sin capacidad403; legado sin snapshot verificable503 RECONCILIAR.

| Ruta y método | Entrada de negocio | Lecturas/plan atómico |
|---|---|---|
| POST /ordenes | pacienteId, versionPaciente, solicitanteId, prioridad, indicaciones, moneda GTQ, items[{pruebaId,centavos}] | Paciente activo, solicitante y prueba/método/tipos vigentes; snapshot exacto de prueba/precio; tocar revisión paciente + orden + operación/auditoría |
| GET /ordenes y /ordenes/{id} | filtros autorizados/página o UUID | Listado en motor, sin cargar todo para paginar |
| POST /muestras | ordenId, versionOrden, itemIds, tipoMuestraId, codigo, recipiente | Orden anterior habilitada, ítems propios y tipos compatibles; muestra TOMADA + evento, tocar revisión orden y reservar código único |
| POST /muestras/{id}/eventos | versionEsperada, versionOrden, tipo RECEPCION/ACEPTACION/RECHAZO/TRASLADO/PROCESAMIENTO, detalle | Revisar estado/orden/cronología; revisión previa + muestra/evento + operación/auditoría |
| POST /muestras/{id}/rectificaciones | versionEsperada, versionOrden, campo tipoMuestraId/recipiente, nuevo, motivo | Referencia compatible y valor anterior verificable; antes/después inmutables; no reabrir rechazo |
| POST /muestras/{id}/retomas | versionEsperada, versionOrden, codigo, tipoMuestraId, recipiente, motivo | Origen rechazado sin sucesora; nueva muestra y evento + enlace origen/sucesora; ambas revisiones en misma UoW |
| GET /muestras y /muestras/{id} | filtros autorizados/página o UUID | Historia íntegra y vínculo original; datos de orden/paciente del servidor |

Catálogos: mantenimiento por capacidad con DTO individual cerrado por tipo (sin endpoint genérico de escritura arbitraria). Publicar versión nueva de prueba/método conserva ID de versión anterior e índice codigo/version; desactivar impide nueva selección, nunca borra ni cambia snapshot emitido. DTO exactos y OpenAPI se completarán antes de exponer esas rutas.

## Estados y representación

Físico orden: CREADA/EN_PROCESO/COMPLETADA/CANCELADA; ítem SOLICITADO/EN_PROCESO/COMPLETADO/CANCELADO. UI STAT se mapea EMERGENCIA. MUESTRA_PENDIENTE/EN_ANALISIS/PARA_VALIDAR son proyecciones derivadas cuando exista evidencia de muestras/resultados, no valores nuevos escritos al enum físico. PENDIENTE_TOMA representa solicitud, no muestra física con fecha/actor ficticios. Muestra TOMADA→RECIBIDA→ACEPTADA→PROCESADA; RECIBIDA/ACEPTADA→RECHAZADA. Rectificar no cambia estado. Retomar crea identidad distinta enlazada y conserva origen rechazado. Traslado conserva estado y exige destino/detalle; no se permite sobre terminada.

## Migración y pruebas exigidas

M03 tiene documentos cerrados: ampliar mediante migración explícita, nunca solo inicializador. Pendiente número de migración libre y esquema final de extensiones: snapshots de ítems, vínculo retoma, recipiente y eventos con referencia a origen, revisión/procedencia. Preservar datos M01–M09 y restauración; legado sin versión/snapshot verificable RECONCILIAR, no inventar versiones ni inferir nombres históricos desde catálogo actual.

Búsquedas por paciente/orden/estado y rango [desde,hasta), orden (fecha,id), límite1–100 predeterminado20; cursor autenticado ligado a cuenta/permisos/ámbito/recurso/filtros. Índices explícitos en migración. Pruebas físicas: nueva/existente/fallo/recuperación/reejecución sin pérdida; código duplicado, archivo/nueva orden, auditoría fallida y rollback multidocumento, reintentos idempotentes. Pruebas unitarias no acreditan esas garantías.

Casos de aplicación implementados en PR76: CrearOrdenLaboratorio y GestionarMuestraLaboratorio; pruebas físicas registradas en plan/evidencias/E05/migracion-011.json. Rutas HTTP y mantenimiento de catálogos siguen pendientes. Versiones de orden y muestra se exigen por separado; IDs/actor/instante se fijan fuera del callback.

Proyección común: creación de orden y comandos de custodia añaden ORDEN_LAB con recursoId de orden y título administrativo, sin copiar contenido clínico al resumen. Índice de historial usa instante UTC normalizado a9 decimales del contrato v1. Primera muestra cambia CREADA→EN_PROCESO; completar resultados/orden corresponde a E05-P2-01, sin anticipar validación.
