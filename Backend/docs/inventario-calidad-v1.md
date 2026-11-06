# Inventario y calidad v1 — E05-P2-02

Scope: backend de laboratorio; UI se conecta en E05-P2-03. Institución exclusivamente desde token verificado y cuenta actual; UUID/fecha/actor del servidor. Mantener referencias M01–M09 e inicializadores.

## Capacidades y DTO

Equipos, reactivos y lotes: mantenimiento con `inventario.administrar`; movimientos y saldo con el mismo permiso. Proveedores se reutilizan del módulo de referencias E05-P1-01. Equipos pueden leerse además con resultados.analizar/resultados.validar para selectores de calidad. Calidad: registrar exige ANALISTA_LABORATORIO y resultados.analizar vigentes; consultar permite inventario.administrar o resultados.analizar/validar. Administración de inventario no concede acceso a resultados clínicos ni su validación.

Rutas bajo `/api/v1/laboratorio`:

- `GET/POST inventario/equipos`, `GET/PUT inventario/equipos/{id}`: código, nombre, marca/modelo/numeroSerie/ubicacion opcionales, estado OPERATIVO/MANTENIMIENTO/INACTIVO. PUT exige versionEsperada y motivo, preserva fechaAlta e historia; sin borrado. Omitido conserva opcional, null lo retira.
- `GET/POST inventario/reactivos`, `GET/PUT inventario/reactivos/{id}`: código, nombre, unidad, activo; fabricante/referenciaFabricante/descripcion/condicionesAlmacenamiento opcionales. Unidad inmutable; PUT versionEsperada/motivo y revisión anterior.
- `GET/POST inventario/lotes`, `GET inventario/lotes/{id}`, `POST inventario/lotes/{id}/estado`: alta con reactivoId, numero, fechaVencimiento YYYY-MM-DD, cantidadInicial, unidad, proveedorId, motivo; crea lote y ENTRADA en una UoW. Estado ACTIVO/BLOQUEADO/AGOTADO/BAJA con versión y motivo; no editar vencimiento/unidad después de alta.
- `GET/POST inventario/lotes/{id}/movimientos`: ENTRADA, CONSUMO, AJUSTE_ENTRADA, AJUSTE_SALIDA, BAJA; cantidad/unidad/motivo/versionEsperada. ENTRADA exige proveedor activo; proveedor se rechaza en otros tipos. BAJA retira exactamente el saldo restante y deja BAJA; agotamiento por consumo/ajuste deja AGOTADO. Reactivar AGOTADO solo al recibir entrada; BLOQUEADO no admite movimientos salvo baja; BAJA terminal.
- `GET/POST calidad/controles`, `GET calidad/controles/{id}`: pruebaId, equipoId, loteMaterialControl, mediciones (parametroId, valor, unidad, objetivo, inferior, superior), observaciones opcionales. Control se evalúa y congela en un comando: límites inclusivos; todos DENTRO→ACEPTADO, alguno FUERA→RECHAZADO. Se aceptan parámetros NUMERICOS de la prueba activa, sin duplicados y con sus numéricos obligatorios completos. Equipo OPERATIVO. No hay edición ni estado manual de controles emitidos: un control posterior registra sus límites nuevos y conserva los anteriores. Prueba/equipo/operador se leen dentro de UoW y se congelan; el cliente no proporciona snapshots ni evaluación.

Todo POST/PUT exige Idempotency-Key UUID estable. Cuerpos cerrados, versión positiva para modificar y motivo no vacío. Fechas de eventos UTC, importe/cantidad y datos de autoridad no se infieren desde UI. Entradas/salidas de stock no reciben resultadoId mientras la integración de resultados sigue en otro PR.

## Cantidades, fecha y atomicidad

Cantidades y mediciones se expresan como cadenas decimales, sin coma, exponentes, espacios ni conversión a Double. Hasta12 dígitos enteros y6 decimales; canonicalización elimina ceros fraccionarios sobrantes. Cantidades de movimiento estrictamente positivas; mediciones/objetivos/límites admiten signo. Dominio opera BigInt escalado; BSON usa Decimal128. No sumar unidades distintas. Saldo derivado de movimientos CONFIRMADOS: entradas+ajustesEntrada−consumos−ajustesSalida−bajas; nunca saldo manual. Lectura agrega por unidad y separa entradas/salidas, rechazando datos incompatibles/rangos inseguros.

Vencimiento es fecha civil, válido inclusive durante ese día institucional de America/Guatemala. Un calendario de sistema convierte el instante estable de comando a esa fecha antes de los callbacks; el cliente no escoge hoy. No consumir ni ajustar salida de lote vencido/inactivo o reactivo inactivo. Baja explícita con motivo permite retirar material vencido sin tratarlo como consumo. Entradas a lote vencido rechazadas; no se cambian fechas para reactivarlo. Persistencia usa BSON Date a00:00Z como representación de etiqueta civil y recupera exactamente YYYY-MM-DD, sin conversión local.

Toda modificación de lote incrementa revision_stock con movimiento/operación/revisión/auditoría atómicos, incluso cambios de estado que compiten con consumos. Se revalida stock/fecha/estado dentro de cada intento. Dos comandos sobre igual revisión generan un éxito y conflicto409; un comando nuevo recarga revisión. IDs/tiempo/clave fuera del callback. Calidad reserva revisión de equipo para serializar mantenimiento con nuevo control, con snapshot anterior guardado; no confirma control si otro comando cambió el equipo. Prueba versionada insert-only; actor actual revalidado.

## Persistencia

Migración013 reservada para snapshot histórico tipado de controles_calidad; se conserva origen M03 y todos sus índices/reglas. Nuevas instalaciones y volúmenes existentes la aplican explícitamente. MIGRANDO bloquea runtime; recuperación reanuda metadatos conocidos; legado sin snapshots queda RECONCILIAR, sin rellenar desde catálogos actuales ni borrar documentos. Lotes/movimientos/equipos/reactivos conservan esquema M03; lectores rechazan datos no representables o sin procedencia suficiente. Preflight exacto antes de habilitar capacidad.

## Lecturas y errores

Páginas1–100 (20 default), cursor AES-GCM ligado a cuenta/revisión/permisos/institución/recurso/filtros/orden. Orden estable UUID ASC/DESC, filtros antes de limit: estado/código de catálogos, reactivo/estado/vencimiento de lotes, tipo/fecha de movimientos, prueba/equipo/estado/fecha de calidad. Fechas de eventos [desde,hasta). Sobre data/meta.siguiente_cursor, sin arrays longitudinales embebidos.

400 entrada,401 identidad,403 cuenta/permiso/capacidad,404 referencia ajena/inexistente,409 revisión/estado/stock insuficiente/unicidad,413 tamaño,500 error interno saneado,503 dependencia/esquema/legado incompatible. Errores no exponen SDK/queries/secretos. 256KiB por agregado/documento y100 elementos embebidos. Pruebas y ambas auditorías del alcance deben pasar antes de abrir PR.
