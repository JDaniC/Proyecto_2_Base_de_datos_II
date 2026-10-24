# Laboratorio Clínico - MongoDB

Fuente: **Primera Entrega Proyecto (2).pdf**, páginas 23-39. Script: [laboratorio_clinico_mongodb.js](laboratorio_clinico_mongodb.js). Base por defecto: `laboratorio_clinico`.

El documento define **22 colecciones y 10 tipos de subdocumento**. El script actual agrega dos colecciones clínicas y tres técnicas: **27 colecciones en total**. En este motor, las colecciones cumplen la función de agrupación que tienen las tablas SQL; los subdocumentos permanecen dentro de otro documento.

## 1. Entidades, colecciones y atributos

`_id` identifica cada documento principal. Los identificadores internos, como `item_id`, identifican elementos del documento al que pertenecen. Las referencias se guardan mediante IDs; no son llaves foráneas nativas.

| Entidad / colección | Atributos del documento |
|---|---|
| `pacientes` | `_id`, `codigo_paciente`, `tipo_documento`, `numero_documento`, `primer_nombre`, `segundo_nombre`, `primer_apellido`, `segundo_apellido`, `fecha_nacimiento`, `sexo_referencia`, `direccion`, `contactos`, `fecha_registro`, `activo` |
| `solicitantes` | `_id`, `nombre_completo`, `entidad_colegiacion`, `numero_colegiado`, `institucion`, `telefono`, `correo`, `activo` |
| `tipos_muestra` | `_id`, `codigo`, `nombre`, `descripcion`, `recipiente_requerido`, `condiciones_conservacion`, `activo` |
| `metodos` | `_id`, `codigo`, `version`, `nombre`, `descripcion`, `activo` |
| `pruebas` | `_id`, `codigo`, `version`, `nombre`, `area`, `metodo_id`, `tipo_muestra_ids`, `preparacion`, `tiempo_estimado_horas`, `parametros`, `activo` |
| `ordenes` | `_id`, `numero_orden`, `paciente_id`, `solicitante_id`, `fecha_orden`, `registrado_por_id`, `prioridad`, `estado`, `moneda`, `indicaciones`, `items` |
| `muestras` | `_id`, `codigo_barras`, `orden_id`, `item_ids`, `tipo_muestra_id`, `fecha_toma`, `tomada_por_id`, `fecha_recepcion`, `recibida_por_id`, `estado`, `condicion_recepcion`, `motivo_rechazo` |
| `eventos_muestra` | `_id`, `muestra_id`, `fecha_hora`, `tipo_evento`, `usuario_id`, `ubicacion`, `detalle`, `rectificacion` |
| `resultados` | `_id`, `serie_resultado_id`, `version`, `orden_id`, `item_id`, `procedencia_muestras`, `equipo_id`, `analista_id`, `fecha_analisis`, `estado`, `validador_id`, `fecha_validacion`, `componentes`, `observaciones` |
| `informes` | `_id`, `serie_informe_id`, `version`, `orden_id`, `resultado_ids`, `fecha_emision`, `emitido_por_id`, `estado`, `cabecera`, `archivo_uri`, `archivo_sha256`, `observaciones` |
| `equipos` | `_id`, `codigo`, `nombre`, `marca`, `modelo`, `numero_serie`, `ubicacion`, `estado`, `fecha_alta` |
| `proveedores` | `_id`, `nombre`, `tipo_identificacion`, `numero_identificacion`, `telefono`, `correo`, `direccion`, `activo` |
| `reactivos` | `_id`, `codigo`, `nombre`, `fabricante`, `referencia_fabricante`, `descripcion`, `unidad_stock`, `condiciones_almacenamiento`, `activo` |
| `lotes_reactivo` | `_id`, `reactivo_id`, `numero_lote`, `fecha_vencimiento`, `estado_operativo` |
| `movimientos_reactivo` | `_id`, `lote_id`, `proveedor_id`, `fecha_hora`, `tipo`, `cantidad`, `usuario_id`, `resultado_id`, `control_calidad_id`, `clave_idempotencia`, `observaciones` |
| `controles_calidad` | `_id`, `prueba_id`, `equipo_id`, `lote_material_control`, `fecha_hora`, `operador_id`, `estado`, `mediciones`, `observaciones` |
| `personal` | `_id`, `primer_nombre`, `segundo_nombre`, `primer_apellido`, `segundo_apellido`, `cargo`, `entidad_colegiacion`, `numero_colegiado`, `telefono`, `correo`, `activo` |
| `usuarios` | `_id`, `personal_id`, `nombre_usuario`, `contrasena_hash`, `rol_ids`, `activo`, `ultimo_acceso` |
| `roles` | `_id`, `nombre`, `descripcion`, `permisos` |
| `auditoria` | `_id`, `usuario_id`, `fecha_hora`, `accion`, `coleccion`, `documento_id`, `ruta_objeto`, `detalle` |
| `facturas` | `_id`, `numero_factura`, `orden_id`, `fecha_emision`, `moneda`, `estado`, `emitido_por_id`, `receptor`, `lineas`, `observaciones` |
| `pagos` | `_id`, `factura_id`, `fecha_hora`, `importe`, `metodo`, `referencia_externa`, `clave_idempotencia`, `estado`, `registrado_por_id`, `observaciones` |

### Subdocumentos del modelo original

`[]` indica un arreglo. Los siguientes diez tipos **no son colecciones adicionales**.

| Ubicación del dato | Atributos |
|---|---|
| `pacientes.contactos[]` | `contacto_id`, `tipo`, `valor`, `es_principal` |
| `pruebas.parametros[]` | `parametro_id`, `codigo`, `nombre`, `tipo_valor`, `unidad_sugerida`, `obligatorio`, `opciones_permitidas`, `observaciones_referencia` |
| `ordenes.items[]` | `item_id`, `prueba_id`, `prioridad`, `estado`, `precio_acordado`, `indicaciones` |
| `eventos_muestra.rectificacion` | `campo`, `valor_anterior`, `valor_nuevo`, `motivo` |
| `resultados.procedencia_muestras[]` | `muestra_id`, `codigo_barras_historico`, `tipo_muestra_id`, `tipo_muestra_nombre_historico`, `fecha_toma`, `fecha_recepcion`, `fecha_aceptacion` |
| `resultados.componentes[]` | `parametro_id`, `valor_numerico`, `valor_texto`, `unidad_aplicada`, `referencia_inferior`, `referencia_superior`, `referencia_texto`, `indicador_anormal`, `observaciones` |
| `informes.cabecera` | `nombre_paciente`, `tipo_documento`, `numero_documento`, `fecha_nacimiento`, `sexo_referencia`, `nombre_solicitante` |
| `controles_calidad.mediciones[]` | `parametro_id`, `valor`, `unidad_aplicada`, `objetivo_aplicado`, `limite_inferior`, `limite_superior`, `evaluacion`, `observaciones` |
| `facturas.receptor` | `nombre`, `tipo_identificacion`, `numero_identificacion`, `direccion` |
| `facturas.lineas[]` | `linea_id`, `item_id`, `descripcion_historica`, `cantidad`, `precio_unitario`, `descuento_importe`, `impuesto_importe` |

## 2. Relaciones

| Entidades relacionadas | Relación y referencia |
|---|---|
| Paciente - orden | 1:N por `ordenes.paciente_id`. Los contactos se embeben en el paciente. |
| Solicitante - orden | 1:N por `ordenes.solicitante_id`; identifica al médico o institución que solicitó las pruebas. |
| Método - prueba | 1:N por `pruebas.metodo_id`; el ID apunta a la versión del método utilizada. |
| Prueba - tipo de muestra | N:M mediante `pruebas.tipo_muestra_ids[]`. Los parámetros pertenecen a la versión de la prueba y se embeben en `parametros[]`. |
| Orden - prueba | N:M mediante `ordenes.items[]`; cada ítem referencia una prueba y conserva precio, prioridad y estado. |
| Orden - muestra | 1:N por `muestras.orden_id`; `item_ids[]` identifica los ítems cubiertos por la muestra. |
| Tipo de muestra - muestra | 1:N por `muestras.tipo_muestra_id`. |
| Muestra - evento | 1:N por `eventos_muestra.muestra_id`; las rectificaciones forman parte del evento. |
| Orden / ítem - resultado | Un ítem puede tener varias series y versiones; `orden_id` e `item_id` identifican su procedencia. El script también guarda `prueba_id`. |
| Muestra - resultado | Un resultado puede utilizar varias muestras y una muestra intervenir en varios resultados; `procedencia_muestras[]` conserva sus IDs y datos históricos. |
| Resultado - parámetro | Los componentes embebidos referencian los parámetros de la prueba mediante `parametro_id`; conservan valor, unidad y referencia aplicados. |
| Equipo / personal - resultados y controles | Cada registro identifica equipo y analista, validador u operador, según corresponda; también guarda las fechas de responsabilidad. |
| Orden - informe | 1:N por `informes.orden_id`; un informe conserva en `resultado_ids[]` las versiones exactas utilizadas y una cabecera histórica. |
| Reactivo - lote - movimiento | Reactivo 1:N lotes por `reactivo_id`; lote 1:N movimientos por `lote_id`. |
| Proveedor / resultado / control de calidad - movimiento | Referencias `proveedor_id`, `resultado_id` y `control_calidad_id` cuando proceda; permiten rastrear abastecimiento y consumo. |
| Prueba - control de calidad | 1:N por `controles_calidad.prueba_id`; sus mediciones se embeben en `mediciones[]`. |
| Personal - usuario - rol | El usuario referencia al personal con `personal_id`; `rol_ids[]` permite asignar varios roles reutilizables. |
| Usuario - auditoría | 1:N por `auditoria.usuario_id`; la auditoría identifica colección, documento y ruta afectados. |
| Orden - factura | Cada factura referencia una orden mediante `orden_id`; receptor y líneas se conservan embebidos como datos de emisión. |
| Factura - pago | 1:N por `pagos.factura_id`; los pagos se guardan separados de las líneas facturadas. |

La aplicación debe comprobar existencia, pertenencia y versión de las referencias antes de guardar. El ítem de un resultado debe pertenecer a su orden; la prueba, parámetros y muestras deben corresponder a ese mismo proceso.

## 3. Operaciones establecidas en el documento

Resumen de las páginas 38-39; son operaciones requeridas para la aplicación.

| Operación | Datos involucrados y condición principal |
|---|---|
| Registrar, buscar y consultar pacientes; actualizar contactos | `pacientes`; evitar duplicados. |
| Administrar solicitantes, tipos de muestra, métodos y pruebas | `solicitantes`, `tipos_muestra`, `metodos`, `pruebas`; desactivar lo que ya no se utiliza y conservar las versiones históricas. |
| Crear órdenes con las pruebas solicitadas | `ordenes.items[]`; paciente, solicitante, prioridad, indicaciones y precios acordados. |
| Registrar muestras y retomas | `muestras`; asignar identificador o código de barras y relacionar con la orden. Una retoma crea otra muestra. |
| Registrar seguimiento y rectificaciones de las muestras | `eventos_muestra`; toma, recepción, aceptación, rechazo, traslado y procesamiento; correcciones con actor, motivo y valores anterior/nuevo. |
| Guardar y validar resultados | `resultados`; valores, unidades, referencias, equipo y responsables. Verificar que muestra y prueba pertenecen a la orden. |
| Corregir resultados conservando el historial | Nueva versión de la misma serie para una corrección; una repetición completa inicia otra serie. Conservar el resultado previo. |
| Generar informes | `informes`; utilizar resultados validados y conservar exactamente los IDs y versiones incluidos al emitir. |
| Registrar facturas y pagos; consultar saldo | `facturas`, `pagos`; preservar servicios y precios emitidos y calcular total pagado y pendiente. |
| Controlar equipos, proveedores, reactivos, lotes y movimientos | Registrar entradas, consumos, ajustes y bajas; obtener existencias de los movimientos. |
| Registrar controles de calidad | `controles_calidad`; mediciones, objetivos, límites, equipo y operador. |
| Administrar usuarios y roles; desactivar cuentas y auditar acciones | `usuarios`, `roles`, `auditoria`; registrar cambios y operaciones importantes. |
| Buscar información operativa e histórica | Órdenes por paciente o fecha, muestras pendientes, resultados validados, informes, facturas, pagos y movimientos de reactivo. |

Las operaciones concurrentes deben evitar pagos duplicados y consumos superiores a la existencia disponible. Los resultados validados y las facturas emitidas conservan su historial de cambios.

## 4. Correspondencia con el script actual

Todos los documentos añaden `revision`. El PDF incluye `usuarios.contrasena_hash`, pero el script lo elimina y utiliza `auth_uid` y el proveedor Firebase. El atributo `activo` del usuario se conserva y se complementa con `estado`.

| Colección original | Atributos adicionales del script |
|---|---|
| `pacientes` | `nombre_busqueda`, `historial` |
| `solicitantes` | `tipo` |
| `ordenes` | `motivo_cancelacion` |
| `resultados` | `prueba_id`, `resultado_anterior_id`, `motivo_correccion` |
| `informes` | `informe_anterior_id`, `motivo_correccion`, `motivo_anulacion` |
| `lotes_reactivo` | `revision_stock` |
| `movimientos_reactivo` | `unidad_stock`, `estado` |
| `usuarios` | `solicitante_medico_id`, `auth_uid`, `proveedor_identidad`, `institucion_id`, `estado` |
| `auditoria` | `auth_uid`, `institucion_id`, `correlacion`, `motivo`, `version_afectada` |
| `facturas` | `revision_cobro`, `motivo_anulacion` |
| `pagos` | `moneda`, `reversion` |

| Colección adicional | Atributos, además de `_id` y `revision` |
|---|---|
| `citas` | `paciente_id`, `solicitante_medico_id`, `gestionada_por_id`, `fecha_hora`, `motivo`, `estado`, `fecha_creacion`, `motivo_cancelacion` |
| `consultas_clinicas` | `paciente_id`, `historial_id`, `cita_id`, `solicitante_medico_id`, `registrado_por_id`, `fecha_hora`, `motivo`, `sintomas`, `observaciones`, `estado`, `diagnosticos`, `tratamientos`, `receta` |
| `operaciones` | `institucion_id`, `usuario_id`, `caso_uso`, `clave`, `hash_entrada`, `recurso_tipo`, `recurso_id`, `fecha_hora`, `codigo_respuesta`, `estado`, `respuesta` |
| `identidades_paciente` | `tipo_documento`, `numero_documento`, `paciente_id`, `fecha_registro` |
| `revisiones` | `tipo_recurso`, `recurso_id`, `version`, `actor_id`, `fecha_hora`, `motivo`, `contenido_anterior` |

### Subdocumentos adicionales del script

Los diez tipos originales conservan sus atributos. Los siguientes corresponden a ampliaciones del perfil/historial, consultas clínicas, pagos y soporte técnico.

| Ubicación del dato | Atributos |
|---|---|
| `pacientes.historial` | `id_historial`, `numero_historial`, `fecha_apertura`, `estado`, `baja` |
| `pacientes.historial.baja` | `causa`, `motivo`, `fecha`, `actor_id` |
| `pagos.reversion` | `fecha_hora`, `usuario_id`, `motivo` |
| `consultas_clinicas.diagnosticos[]` | `diagnostico_id`, `codigo`, `nombre`, `descripcion`, `es_principal`, `observaciones` |
| `consultas_clinicas.tratamientos[]` | `tratamiento_id`, `nombre`, `descripcion`, `fecha_inicio`, `fecha_fin`, `indicaciones`, `observaciones`, `diagnostico_ids` |
| `consultas_clinicas.receta` | `receta_id`, `version`, `estado`, `fecha_emision`, `prescriptor_id`, `prescriptor_nombre_historico`, `colegiado_historico`, `medicamentos`, `indicaciones_generales` |
| `consultas_clinicas.receta.medicamentos[]` | `medicamento_id`, `nombre`, `presentacion`, `concentracion`, `dosis`, `frecuencia`, `duracion`, `via`, `indicaciones` |
| `operaciones.respuesta` | `data`, `meta` |
| `operaciones.respuesta.meta` | `correlacion` |

`citas` relaciona paciente y médico solicitante individual; `consultas_clinicas` relaciona paciente, historial, médico y cita opcional. Sus diagnósticos, tratamientos y receta se embeben. Estas dos colecciones amplían el núcleo clínico común y no forman parte de las 22 originales. `identidades_paciente` reserva la identidad del paciente; `operaciones` guarda el resultado de un caso de uso por actor y clave; `revisiones` conserva versiones anteriores del recurso.

El script aporta validadores e índices. La comprobación entre documentos, autorización, transiciones, conservación de datos emitidos y transacciones sobre cobros o stock corresponden al backend. Para el detalle completo de tipos y reglas: [análisis de MongoDB](ANALISIS_MONGODB.md).
