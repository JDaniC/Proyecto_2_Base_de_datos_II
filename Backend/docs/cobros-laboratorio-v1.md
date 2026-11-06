# Cobros de laboratorio v1 — E05-P1-03

Institución exclusiva: LABORATORIO_CLINICO. Toda ruta exige token verificado, cuenta local ACTIVA y permiso actual `cobros.administrar`. No se aceptan actor, rol, institución, saldo, total ni líneas proporcionados por el cliente. La UI de cobros se conecta en E05-P2-03.

## Contrato HTTP

Base `/api/v1/laboratorio/facturas`:

| Método/ruta | Entrada cerrada | Resultado |
|---|---|---|
| POST base | ordenId, versionOrden, numero, receptor | 201 factura emitida |
| GET base | ordenId/pacienteId/estado/desde/hasta/limite/orden/cursor | Página de facturas |
| GET /{id} | Sin query | Factura, total, pagado y saldo |
| GET /{id}/pagos | estado/desde/hasta/limite/orden/cursor | Página de pagos confirmados y revertidos |
| POST /{id}/pagos | versionEsperada, importe, moneda, metodo | 201 factura y pago |
| POST /{id}/reversiones | versionEsperada, pagoId, motivo | 200 factura y pago revertido |
| POST /{id}/anulacion | versionEsperada, motivo | 200 factura anulada |

Cada POST requiere `Idempotency-Key` UUID. Reenvío conserva código HTTP/respuesta/correlación originales; reutilización con otra entrada devuelve 409 CLAVE_REUTILIZADA. UUID inexistente/ajeno devuelve 404; entrada inválida 400; cuenta/permiso/institución 403; versión antigua, estado, duplicados o saldo insuficiente 409; tamaño 413; dependencia o datos legados incompatibles 503. Errores no exponen SDK, consultas ni datos ajenos.

Receptor: nombre, tipoIdentificacion, numeroIdentificacion y direccion opcional. `numero` es la referencia de factura local (máximo 60 caracteres, única); este módulo académico no implementa facturación fiscal electrónica. Dinero entero en centavos GTQ; importe de pago positivo y moneda explícita obligatoria. Métodos: EFECTIVO/TARJETA/TRANSFERENCIA/OTRO. Motivo no vacío hasta 4000 caracteres.

Páginas de 1–100 (20 por defecto), orden UUID ASC predeterminado o DESC. Filtros aplicados antes de limit; rango UTC [desde,hasta) con precisión hasta nanosegundos; persistencia conserva milisegundos BSON. Cursor AES-GCM ligado a cuenta/revisión/permisos, institución, recurso, factura, filtros normalizados y orden. Una página de pagos no se usa para calcular el saldo: el servidor agrega todos los pagos CONFIRMADOS en snapshot consistente.

## Invariantes y cálculo

Emisión directa EMITIDA desde una orden previa no CANCELADA, con revisión esperada. Una factura por orden, incluso después de anularla; no se reemite ni se borra la historia. Se serializa la emisión sobre revisión de orden antes del insert; el preflight conserva el índice único de número. No se usa el catálogo actual para reconstruir precios/nombres: cada ítem no CANCELADO de la orden aporta una línea, cantidad 1, precio acordado y nombre histórico. Descuento e impuesto son cero en esta versión. Fórmula por línea: cantidad × precio − descuento + impuesto; todos los operandos en unidades menores, sin división ni redondeo decimal. Cada resultado y suma deben ser enteros seguros. Factura y BSON no exceden 256 KiB.

Pagado = suma decimal exacta de importes BSON long de pagos CONFIRMADOS, convertida a entero seguro. Para EMITIDA, saldo = total − pagado; nunca negativo. ANULADA conserva total histórico y muestra saldo exigible cero; pagos confirmados en una anulada se rechazan como inconsistencia. Pago aumenta revision_cobro de factura y guarda pago/operación/auditoría en la misma transacción. Dos pagos por la misma revisión producen un éxito y 409 en el otro; el cliente recarga la revisión antes de un comando nuevo. Reintento por timeout conserva clave y DTO.

Reversión pasa CONFIRMADO→ANULADO, conserva importe/fecha/actor/método originales y agrega fecha/actor/motivo de reversión. No hay segunda reversión ni devolución parcial. Anulación EMITIDA→ANULADA exige cero pagos confirmados; la revisión aumenta sin modificar receptor/líneas/moneda originales. Cada modificación de cobro guarda snapshot previo de factura. El archivo del historial no bloquea cobros de órdenes anteriores.

## Persistencia y recuperación

Se reutilizan sin cambios los validadores e índices M03 de facturas/pagos: no hay cambio de inicializador ni migración nueva. Preparar las migraciones explícitas 004/011 previas. Preflight compara huella de ambos validadores y claves/opciones de sus índices contra la captura del modelo; no modifica la base. Deriva falla 503 antes de escribir. El lector rechaza BORRADOR, moneda distinta, importes fuera del rango seguro y documentos incompatibles: conciliar con procedencia verificable, sin inventar snapshots ni borrar legado.

Lecturas antes de escrituras en una session snapshot; factura/pago/revisión/operación/auditoría confirman juntos. El callback no genera IDs, no llama servicios externos y no confirma parcialmente. Datos sintéticos de pruebas en un replica set efímero; cuentas administrativas solo preparan fixtures y fallos de prueba, escritura funcional con cuenta de aplicación.

Reproducir: `npm run build`, `npm run lint`, `npm test` dentro de Backend y `node Backend/scripts/run-clinica-mongodb-integration.mjs --cobros` desde raíz. La integración incluye fallo inyectado en auditoría y restauración de su validador dentro de la misma base efímera, sin modificar bases compartidas.
