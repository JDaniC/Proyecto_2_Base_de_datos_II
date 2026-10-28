/*
 * Laboratorio Clinico - MongoDB 8.0+ / mongosh 2.x.
 * 22 colecciones de Entrega I + 2 clinicas comunes + 3 tecnicas.
 * Ejecutar desde la raiz: mongosh '<conexion>' --file Database/laboratorio_clinico_mongodb.js
 * MONGO_LAB_DB selecciona la base; por defecto: laboratorio_clinico.
 * No inserta pacientes/usuarios, no borra datos y no modifica validadores existentes.
 * Una estructura incompatible requiere una migracion explicita, no un collMod automatico.
 * Las FK, permisos, transiciones e inmutabilidad entre versiones requieren el backend.
 * Ver ANALISIS_MONGODB.md para atributos, tipos, limites y reglas transaccionales.
 */
(() => {
  'use strict';

  const nombreBase = process.env.MONGO_LAB_DB || 'laboratorio_clinico';
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(nombreBase) || ['admin', 'local', 'config'].includes(nombreBase)) {
    throw new Error('MONGO_LAB_DB debe nombrar una base de aplicacion, usando minusculas, numeros y guion bajo.');
  }
  const destino = db.getSiblingDB(nombreBase);
  if (Number(destino.version().split('.')[0]) < 8) {
    throw new Error('Este esquema requiere MongoDB 8.0 o superior.');
  }
  const topologia = destino.adminCommand({ hello: 1 });
  if (!topologia.setName && topologia.msg !== 'isdbgrid') {
    throw new Error('Se requiere replica set o cluster transaccional; no se inicializa sobre standalone.');
  }

  // Se omiten opcionales desconocidos; null no equivale a campo ausente.
  const texto = (max = 200) => ({ bsonType: 'string', minLength: 1, maxLength: max, pattern: '\\S' });
  const nota = texto(4000);
  const id = { bsonType: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' };
  const fecha = { bsonType: 'date' };
  const booleano = { bsonType: 'bool' };
  const entero = (min = 0) => ({ bsonType: ['int', 'long'], minimum: min });
  const dinero = { bsonType: 'long', minimum: 0 }; // Unidades monetarias menores; nunca Double.
  const importePositivo = { bsonType: 'long', minimum: 1 };
  const cantidad = { bsonType: 'decimal', minimum: 0, exclusiveMinimum: true };
  const numero = { bsonType: ['decimal', 'double', 'int', 'long'] };
  const moneda = { bsonType: 'string', pattern: '^[A-Z]{3}$' };
  const hash = { bsonType: 'string', pattern: '^[a-f0-9]{64}$' };
  const estados = (...valores) => ({ bsonType: 'string', enum: valores });
  const lista = (items, min = 0, uniqueItems = false) => ({
    bsonType: 'array', minItems: min, maxItems: 100, items, ...(uniqueItems ? { uniqueItems: true } : {}),
  });
  const objeto = (properties, required = [], extra = {}) => ({
    bsonType: 'object', additionalProperties: false, properties, ...(required.length ? { required } : {}), ...extra,
  });
  const raiz = (properties, required, extra = {}, tipoId = id) => objeto(
    { _id: tipoId, revision: entero(1), ...properties }, ['_id', 'revision', ...required], extra,
  );
  const ix = (name, key, opciones = {}) => ({ name, key, ...opciones });
  const unico = (name, key, opciones = {}) => ix(name, key, { unique: true, ...opciones });
  const parcialTexto = (campo) => ({ partialFilterExpression: { [campo]: { $type: 'string' } } });
  const condicion = (campo, valor, required, properties = {}) => ({
    anyOf: [
      { properties: { [campo]: { not: { enum: [valor] } } } },
      { required, properties: { [campo]: { enum: [valor] }, ...properties } },
    ],
  });
  // JSON Schema uniqueItems compara objetos completos; esta expresion compara su ID interno.
  const idsUnicos = (campo, clave) => ({ $expr: { $cond: [
    { $isArray: `$${campo}` },
    { $eq: [{ $size: `$${campo}` }, { $size: { $setUnion: [`$${campo}.${clave}`, []] } }] },
    false,
  ] } });
  const contacto = objeto({ contacto_id: id, tipo: estados('TELEFONO', 'CORREO'), valor: texto(254), es_principal: booleano },
    ['contacto_id', 'tipo', 'valor', 'es_principal']);
  const parametro = objeto({
    parametro_id: id, codigo: texto(40), nombre: texto(), tipo_valor: estados('NUMERICO', 'TEXTO', 'CATEGORICO'),
    unidad_sugerida: texto(60), obligatorio: booleano, opciones_permitidas: lista(texto()), observaciones_referencia: nota,
  }, ['parametro_id', 'codigo', 'nombre', 'tipo_valor', 'obligatorio']);
  const itemOrden = objeto({
    item_id: id, prueba_id: id, prioridad: estados('RUTINA', 'URGENTE', 'EMERGENCIA'),
    estado: estados('SOLICITADO', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO'), precio_acordado: dinero, indicaciones: nota,
  }, ['item_id', 'prueba_id', 'prioridad', 'estado', 'precio_acordado']);
  const procedencia = objeto({
    muestra_id: id, codigo_barras_historico: texto(80), tipo_muestra_id: id, tipo_muestra_nombre_historico: texto(),
    fecha_toma: fecha, fecha_recepcion: fecha, fecha_aceptacion: fecha,
  }, ['muestra_id', 'codigo_barras_historico', 'tipo_muestra_id', 'tipo_muestra_nombre_historico',
    'fecha_toma', 'fecha_recepcion', 'fecha_aceptacion']);
  const componente = objeto({
    parametro_id: id, valor_numerico: numero, valor_texto: texto(2000), unidad_aplicada: texto(60),
    referencia_inferior: numero, referencia_superior: numero, referencia_texto: nota,
    indicador_anormal: estados('NORMAL', 'BAJO', 'ALTO', 'CRITICO', 'NO_APLICA'), observaciones: nota,
  }, ['parametro_id'], { oneOf: [
    { required: ['valor_numerico'], not: { required: ['valor_texto'] } },
    { required: ['valor_texto'], not: { required: ['valor_numerico'] } },
  ] });
  const diagnostico = objeto({
    diagnostico_id: id, codigo: texto(60), nombre: texto(), descripcion: nota, es_principal: booleano, observaciones: nota,
  }, ['diagnostico_id', 'codigo', 'nombre', 'es_principal']);
  const tratamiento = objeto({
    tratamiento_id: id, nombre: texto(), descripcion: nota, fecha_inicio: fecha, fecha_fin: fecha,
    indicaciones: nota, observaciones: nota, diagnostico_ids: lista(id, 0, true),
  }, ['tratamiento_id', 'nombre']);
  const medicamento = objeto({
    medicamento_id: id, nombre: texto(), presentacion: texto(), concentracion: texto(), dosis: texto(),
    frecuencia: texto(), duracion: texto(), via: texto(100), indicaciones: nota,
  }, ['medicamento_id', 'nombre', 'presentacion', 'concentracion', 'dosis', 'frecuencia', 'duracion', 'via', 'indicaciones']);
  const receta = objeto({
    receta_id: id, version: entero(1), estado: estados('EMITIDA', 'ANULADA'), fecha_emision: fecha,
    prescriptor_id: id, prescriptor_nombre_historico: texto(), colegiado_historico: texto(60),
    medicamentos: lista(medicamento, 1), indicaciones_generales: nota,
  }, ['receta_id', 'version', 'estado', 'fecha_emision', 'prescriptor_id',
    'prescriptor_nombre_historico', 'colegiado_historico', 'medicamentos']);
  const baja = objeto({
    causa: estados('TRASLADO', 'FALLECIMIENTO', 'OTRA_ADMINISTRATIVA'), motivo: nota, fecha: fecha, actor_id: id,
  }, ['causa', 'motivo', 'fecha', 'actor_id']);
  const cabeceraHistorial = objeto({
    id_historial: id, numero_historial: texto(60), fecha_apertura: fecha,
    estado: estados('ACTIVO', 'ARCHIVADO'), baja,
  }, ['id_historial', 'numero_historial', 'fecha_apertura', 'estado'], {
    allOf: [condicion('estado', 'ARCHIVADO', ['baja'])],
  });

  const definiciones = [
    {
      nombre: 'pacientes',
      esquema: raiz({
        codigo_paciente: texto(60), tipo_documento: texto(40), numero_documento: texto(80),
        primer_nombre: texto(80), segundo_nombre: texto(80), primer_apellido: texto(80), segundo_apellido: texto(80),
        nombre_busqueda: texto(350),
        claves_nombre: { bsonType: 'array', minItems: 1, maxItems: 160, items: texto(350) },
        numero_busqueda: texto(80), fecha_nacimiento: fecha, sexo_referencia: texto(40), direccion: nota,
        contactos: lista(contacto), fecha_registro: fecha, activo: booleano, historial: cabeceraHistorial,
      }, ['codigo_paciente', 'primer_nombre', 'primer_apellido', 'nombre_busqueda', 'contactos',
        'fecha_registro', 'activo', 'historial'], { anyOf: [
        { required: ['tipo_documento', 'numero_documento'] },
        { not: { anyOf: [{ required: ['tipo_documento'] }, { required: ['numero_documento'] }] } },
      ] }),
      reglas: [idsUnicos('contactos', 'contacto_id'), { $expr: {
        $eq: ['$activo', { $eq: ['$historial.estado', 'ACTIVO'] }],
      } }],
      indices: [
        unico('uq_paciente_codigo', { codigo_paciente: 1 }),
        unico('uq_paciente_documento', { tipo_documento: 1, numero_documento: 1 }, parcialTexto('numero_documento')),
        unico('uq_paciente_historial', { 'historial.id_historial': 1 }),
        unico('uq_paciente_numero_historial', { 'historial.numero_historial': 1 }),
        ix('ix_paciente_nombre', { nombre_busqueda: 1, _id: 1 }), ix('ix_paciente_activo_nombre', { activo: 1, nombre_busqueda: 1, _id: 1 }),
        ix('ix_paciente_prefijos', { claves_nombre: 1, fecha_registro: 1, _id: 1 }),
        ix('ix_paciente_numero_busqueda', { numero_busqueda: 1, fecha_registro: 1, _id: 1 }),
      ],
    },
    {
      nombre: 'solicitantes',
      esquema: raiz({
        nombre_completo: texto(), tipo: estados('MEDICO', 'INSTITUCION'), entidad_colegiacion: texto(),
        numero_colegiado: texto(60), institucion: texto(), telefono: texto(40), correo: texto(254), activo: booleano,
      }, ['nombre_completo', 'tipo', 'activo'], {
        allOf: [condicion('tipo', 'MEDICO', ['entidad_colegiacion', 'numero_colegiado'])],
      }),
      indices: [unico('uq_solicitante_colegiado', { entidad_colegiacion: 1, numero_colegiado: 1 },
        { partialFilterExpression: { tipo: 'MEDICO' } }), ix('ix_solicitante_nombre', { nombre_completo: 1 })],
    },
    {
      nombre: 'tipos_muestra',
      esquema: raiz({ codigo: texto(40), nombre: texto(), descripcion: nota, recipiente_requerido: texto(),
        condiciones_conservacion: nota, activo: booleano }, ['codigo', 'nombre', 'recipiente_requerido', 'activo']),
      indices: [unico('uq_tipo_muestra_codigo', { codigo: 1 })],
    },
    {
      nombre: 'metodos',
      esquema: raiz({ codigo: texto(40), version: entero(1), nombre: texto(), descripcion: nota, activo: booleano },
        ['codigo', 'version', 'nombre', 'activo']),
      indices: [unico('uq_metodo_codigo_version', { codigo: 1, version: 1 })],
    },
    {
      nombre: 'pruebas',
      esquema: raiz({
        codigo: texto(40), version: entero(1), nombre: texto(), area: texto(100), metodo_id: id,
        tipo_muestra_ids: lista(id, 1, true), preparacion: nota, tiempo_estimado_horas: { ...numero, minimum: 0 },
        parametros: lista(parametro, 1), activo: booleano,
      }, ['codigo', 'version', 'nombre', 'area', 'metodo_id', 'tipo_muestra_ids', 'parametros', 'activo']),
      reglas: [idsUnicos('parametros', 'parametro_id'), idsUnicos('parametros', 'codigo')],
      indices: [unico('uq_prueba_codigo_version', { codigo: 1, version: 1 }), ix('ix_prueba_area_activo', { area: 1, activo: 1, nombre: 1 })],
    },
    {
      nombre: 'ordenes',
      esquema: raiz({
        numero_orden: texto(60), paciente_id: id, solicitante_id: id, fecha_orden: fecha, registrado_por_id: id,
        prioridad: estados('RUTINA', 'URGENTE', 'EMERGENCIA'), estado: estados('CREADA', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA'),
        moneda, indicaciones: nota, items: lista(itemOrden, 1), motivo_cancelacion: nota,
      }, ['numero_orden', 'paciente_id', 'solicitante_id', 'fecha_orden', 'registrado_por_id',
        'prioridad', 'estado', 'moneda', 'items'], { allOf: [condicion('estado', 'CANCELADA', ['motivo_cancelacion'])] }),
      reglas: [idsUnicos('items', 'item_id')],
      indices: [unico('uq_orden_numero', { numero_orden: 1 }),
        ix('ix_orden_paciente_fecha', { paciente_id: 1, fecha_orden: 1, _id: 1 }),
        ix('ix_orden_fecha', { fecha_orden: 1, _id: 1 }), ix('ix_orden_estado_fecha', { estado: 1, fecha_orden: 1, _id: 1 })],
    },
    {
      nombre: 'muestras',
      esquema: raiz({
        codigo_barras: texto(80), orden_id: id, item_ids: lista(id, 1, true), tipo_muestra_id: id,
        fecha_toma: fecha, tomada_por_id: id, fecha_recepcion: fecha, recibida_por_id: id,
        estado: estados('TOMADA', 'RECIBIDA', 'ACEPTADA', 'PROCESADA', 'RECHAZADA'), condicion_recepcion: nota, motivo_rechazo: nota,
      }, ['codigo_barras', 'orden_id', 'item_ids', 'tipo_muestra_id', 'fecha_toma', 'tomada_por_id', 'estado'], {
        allOf: [condicion('estado', 'RECHAZADA', ['motivo_rechazo']), {
          anyOf: [
            { properties: { estado: { enum: ['TOMADA'] } } },
            { required: ['fecha_recepcion', 'recibida_por_id', 'condicion_recepcion'] },
          ],
        }],
      }),
      reglas: [{ $expr: { $gte: [{ $ifNull: ['$fecha_recepcion', '$fecha_toma'] }, '$fecha_toma'] } }],
      indices: [unico('uq_muestra_barras', { codigo_barras: 1 }), ix('ix_muestra_orden', { orden_id: 1, _id: 1 }),
        ix('ix_muestra_estado_fecha', { estado: 1, fecha_toma: 1, _id: 1 })],
    },
    {
      nombre: 'eventos_muestra',
      esquema: raiz({
        muestra_id: id, fecha_hora: fecha, tipo_evento: estados('TOMA', 'RECEPCION', 'ACEPTACION', 'RECHAZO', 'TRASLADO', 'PROCESAMIENTO', 'RECTIFICACION'),
        usuario_id: id, ubicacion: texto(), detalle: nota,
        rectificacion: objeto({ campo: texto(), valor_anterior: {}, valor_nuevo: {}, motivo: nota },
          ['campo', 'valor_anterior', 'valor_nuevo', 'motivo']),
      }, ['muestra_id', 'fecha_hora', 'tipo_evento', 'usuario_id'], {
        allOf: [condicion('tipo_evento', 'RECTIFICACION', ['rectificacion'])],
      }),
      indices: [ix('ix_evento_muestra_fecha', { muestra_id: 1, fecha_hora: 1, _id: 1 })],
    },
    {
      nombre: 'resultados',
      esquema: raiz({
        serie_resultado_id: id, version: entero(1), orden_id: id, item_id: id, prueba_id: id,
        procedencia_muestras: lista(procedencia, 1), equipo_id: id, analista_id: id, fecha_analisis: fecha,
        estado: estados('BORRADOR', 'VALIDADO'), validador_id: id, fecha_validacion: fecha,
        componentes: lista(componente, 1), observaciones: nota, resultado_anterior_id: id, motivo_correccion: nota,
      }, ['serie_resultado_id', 'version', 'orden_id', 'item_id', 'prueba_id', 'procedencia_muestras',
        'analista_id', 'fecha_analisis', 'estado', 'componentes'], {
        allOf: [condicion('estado', 'VALIDADO', ['validador_id', 'fecha_validacion']), {
          anyOf: [
            { properties: { version: { enum: [1] } } },
            { required: ['resultado_anterior_id', 'motivo_correccion'] },
          ],
        }],
      }),
      reglas: [idsUnicos('componentes', 'parametro_id'), idsUnicos('procedencia_muestras', 'muestra_id'),
        { $expr: { $gte: [{ $ifNull: ['$fecha_validacion', '$fecha_analisis'] }, '$fecha_analisis'] } }],
      indices: [unico('uq_resultado_serie_version', { serie_resultado_id: 1, version: 1 }),
        ix('ix_resultado_orden_item', { orden_id: 1, item_id: 1, fecha_analisis: 1, _id: 1 }),
        ix('ix_resultado_estado_fecha', { estado: 1, fecha_analisis: 1, _id: 1 })],
    },
    {
      nombre: 'informes',
      esquema: raiz({
        serie_informe_id: id, version: entero(1), orden_id: id, resultado_ids: lista(id, 0, true),
        fecha_emision: fecha, emitido_por_id: id, estado: estados('BORRADOR', 'EMITIDO', 'ANULADO'),
        cabecera: objeto({ nombre_paciente: texto(), tipo_documento: texto(40), numero_documento: texto(80),
          fecha_nacimiento: fecha, sexo_referencia: texto(40), nombre_solicitante: texto() }, ['nombre_paciente', 'nombre_solicitante']),
        archivo_uri: texto(2000), archivo_sha256: hash, observaciones: nota,
        informe_anterior_id: id, motivo_correccion: nota, motivo_anulacion: nota,
      }, ['serie_informe_id', 'version', 'orden_id', 'resultado_ids', 'estado'], {
        allOf: [
          condicion('estado', 'EMITIDO', ['fecha_emision', 'emitido_por_id', 'cabecera', 'archivo_uri', 'archivo_sha256'],
            { resultado_ids: { minItems: 1 } }),
          condicion('estado', 'ANULADO', ['fecha_emision', 'emitido_por_id', 'cabecera', 'archivo_uri', 'archivo_sha256', 'motivo_anulacion'],
            { resultado_ids: { minItems: 1 } }),
          { anyOf: [{ properties: { version: { enum: [1] } } }, { required: ['informe_anterior_id', 'motivo_correccion'] }] },
        ],
      }),
      indices: [unico('uq_informe_serie_version', { serie_informe_id: 1, version: 1 }),
        ix('ix_informe_orden_fecha', { orden_id: 1, fecha_emision: 1, _id: 1 }),
        ix('ix_informe_estado_fecha', { estado: 1, fecha_emision: 1, _id: 1 })],
    },
    {
      nombre: 'equipos',
      esquema: raiz({ codigo: texto(60), nombre: texto(), marca: texto(), modelo: texto(), numero_serie: texto(),
        ubicacion: texto(), estado: estados('OPERATIVO', 'MANTENIMIENTO', 'INACTIVO'), fecha_alta: fecha },
      ['codigo', 'nombre', 'estado', 'fecha_alta']),
      indices: [unico('uq_equipo_codigo', { codigo: 1 }),
        unico('uq_equipo_serie', { numero_serie: 1 }, parcialTexto('numero_serie'))],
    },
    {
      nombre: 'proveedores',
      esquema: raiz({ nombre: texto(), tipo_identificacion: texto(40), numero_identificacion: texto(80),
        telefono: texto(40), correo: texto(254), direccion: nota, activo: booleano },
      ['nombre', 'tipo_identificacion', 'numero_identificacion', 'activo']),
      indices: [unico('uq_proveedor_identificacion', { tipo_identificacion: 1, numero_identificacion: 1 })],
    },
    {
      nombre: 'reactivos',
      esquema: raiz({ codigo: texto(60), nombre: texto(), fabricante: texto(), referencia_fabricante: texto(),
        descripcion: nota, unidad_stock: texto(60), condiciones_almacenamiento: nota, activo: booleano },
      ['codigo', 'nombre', 'unidad_stock', 'activo']),
      indices: [unico('uq_reactivo_codigo', { codigo: 1 })],
    },
    {
      nombre: 'lotes_reactivo',
      esquema: raiz({ reactivo_id: id, numero_lote: texto(80), fecha_vencimiento: fecha,
        estado_operativo: estados('ACTIVO', 'BLOQUEADO', 'AGOTADO', 'BAJA'), revision_stock: entero() },
      ['reactivo_id', 'numero_lote', 'fecha_vencimiento', 'estado_operativo', 'revision_stock']),
      indices: [unico('uq_lote_reactivo_numero', { reactivo_id: 1, numero_lote: 1 }),
        ix('ix_lote_estado_vencimiento', { estado_operativo: 1, fecha_vencimiento: 1, _id: 1 })],
    },
    {
      nombre: 'movimientos_reactivo',
      esquema: raiz({
        lote_id: id, proveedor_id: id, fecha_hora: fecha,
        tipo: estados('ENTRADA', 'CONSUMO', 'AJUSTE_ENTRADA', 'AJUSTE_SALIDA', 'BAJA'), cantidad,
        unidad_stock: texto(60), estado: estados('CONFIRMADO'), usuario_id: id, resultado_id: id, control_calidad_id: id,
        clave_idempotencia: texto(), observaciones: nota,
      }, ['lote_id', 'fecha_hora', 'tipo', 'cantidad', 'unidad_stock', 'estado', 'usuario_id', 'clave_idempotencia']),
      indices: [unico('uq_movimiento_actor_clave', { usuario_id: 1, clave_idempotencia: 1 }),
        ix('ix_movimiento_lote_fecha', { lote_id: 1, fecha_hora: 1, _id: 1 }),
        ix('ix_movimiento_tipo_fecha', { tipo: 1, fecha_hora: 1, _id: 1 })],
    },
    {
      nombre: 'controles_calidad',
      esquema: raiz({
        prueba_id: id, equipo_id: id, lote_material_control: texto(80), fecha_hora: fecha, operador_id: id,
        estado: estados('PENDIENTE', 'ACEPTADO', 'RECHAZADO'), observaciones: nota,
        mediciones: lista(objeto({ parametro_id: id, valor: numero, unidad_aplicada: texto(60), objetivo_aplicado: numero,
          limite_inferior: numero, limite_superior: numero, evaluacion: estados('DENTRO', 'FUERA', 'PENDIENTE'), observaciones: nota },
        ['parametro_id', 'valor', 'unidad_aplicada', 'objetivo_aplicado', 'limite_inferior', 'limite_superior', 'evaluacion']), 1),
      }, ['prueba_id', 'equipo_id', 'fecha_hora', 'operador_id', 'estado', 'mediciones']),
      reglas: [idsUnicos('mediciones', 'parametro_id')],
      indices: [ix('ix_control_prueba_fecha', { prueba_id: 1, fecha_hora: 1, _id: 1 }),
        ix('ix_control_equipo_fecha', { equipo_id: 1, fecha_hora: 1, _id: 1 })],
    },
    {
      nombre: 'personal',
      esquema: raiz({ primer_nombre: texto(80), segundo_nombre: texto(80), primer_apellido: texto(80), segundo_apellido: texto(80),
        cargo: texto(100), entidad_colegiacion: texto(), numero_colegiado: texto(60), telefono: texto(40), correo: texto(254), activo: booleano },
      ['primer_nombre', 'primer_apellido', 'cargo', 'activo'], { anyOf: [
        { required: ['entidad_colegiacion', 'numero_colegiado'] },
        { not: { anyOf: [{ required: ['entidad_colegiacion'] }, { required: ['numero_colegiado'] }] } },
      ] }),
      indices: [unico('uq_personal_colegiado', { entidad_colegiacion: 1, numero_colegiado: 1 }, parcialTexto('numero_colegiado'))],
    },
    {
      nombre: 'usuarios',
      esquema: raiz({
        personal_id: id, solicitante_medico_id: id, nombre_usuario: texto(100), auth_uid: texto(128),
        proveedor_identidad: estados('FIREBASE'), institucion_id: estados('LABORATORIO_CLINICO'),
        rol_ids: lista(id, 0, true), estado: estados('PENDIENTE', 'ACTIVO', 'INACTIVO'), activo: booleano, ultimo_acceso: fecha,
      }, ['nombre_usuario', 'auth_uid', 'proveedor_identidad', 'institucion_id', 'rol_ids', 'estado', 'activo']),
      reglas: [{ $expr: { $eq: ['$activo', { $eq: ['$estado', 'ACTIVO'] }] } }],
      indices: [unico('uq_usuario_auth_uid', { auth_uid: 1 }), unico('uq_usuario_nombre', { nombre_usuario: 1 }),
        unico('uq_usuario_personal', { personal_id: 1 }, parcialTexto('personal_id')),
        unico('uq_usuario_medico', { solicitante_medico_id: 1 }, parcialTexto('solicitante_medico_id'))],
    },
    {
      nombre: 'roles',
      esquema: raiz({ nombre: texto(100), descripcion: nota, permisos: lista(texto(100), 0, true) }, ['nombre', 'permisos']),
      indices: [unico('uq_rol_nombre', { nombre: 1 })],
    },
    {
      nombre: 'auditoria',
      esquema: raiz({
        usuario_id: id, auth_uid: texto(128), institucion_id: estados('LABORATORIO_CLINICO'), fecha_hora: fecha,
        accion: texto(100), coleccion: texto(100), documento_id: texto(240), ruta_objeto: texto(300),
        correlacion: id, motivo: nota, version_afectada: entero(1), detalle: { bsonType: 'object' },
      }, ['usuario_id', 'auth_uid', 'institucion_id', 'fecha_hora', 'accion', 'coleccion', 'documento_id', 'correlacion']),
      indices: [ix('ix_auditoria_recurso_fecha', { coleccion: 1, documento_id: 1, fecha_hora: 1, _id: 1 }),
        ix('ix_auditoria_actor_fecha', { usuario_id: 1, fecha_hora: 1, _id: 1 }), ix('ix_auditoria_correlacion', { correlacion: 1 })],
    },
    {
      nombre: 'facturas',
      esquema: raiz({
        numero_factura: texto(60), orden_id: id, fecha_emision: fecha, moneda,
        estado: estados('BORRADOR', 'EMITIDA', 'ANULADA'), emitido_por_id: id, revision_cobro: entero(),
        receptor: objeto({ nombre: texto(), tipo_identificacion: texto(40), numero_identificacion: texto(80), direccion: nota },
          ['nombre', 'tipo_identificacion', 'numero_identificacion']),
        lineas: lista(objeto({ linea_id: id, item_id: id, descripcion_historica: texto(500), cantidad: entero(1),
          precio_unitario: dinero, descuento_importe: dinero, impuesto_importe: dinero },
        ['linea_id', 'item_id', 'descripcion_historica', 'cantidad', 'precio_unitario', 'descuento_importe', 'impuesto_importe']), 1),
        observaciones: nota, motivo_anulacion: nota,
      }, ['numero_factura', 'orden_id', 'moneda', 'estado', 'revision_cobro', 'receptor', 'lineas'], {
        allOf: [condicion('estado', 'EMITIDA', ['fecha_emision', 'emitido_por_id']),
          condicion('estado', 'ANULADA', ['fecha_emision', 'emitido_por_id', 'motivo_anulacion'])],
      }),
      reglas: [idsUnicos('lineas', 'linea_id')],
      indices: [unico('uq_factura_numero', { numero_factura: 1 }), ix('ix_factura_orden', { orden_id: 1, _id: 1 }),
        ix('ix_factura_estado_fecha', { estado: 1, fecha_emision: 1, _id: 1 })],
    },
    {
      nombre: 'pagos',
      esquema: raiz({
        factura_id: id, fecha_hora: fecha, importe: importePositivo, moneda,
        metodo: estados('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'OTRO'), referencia_externa: texto(),
        clave_idempotencia: texto(), estado: estados('CONFIRMADO', 'ANULADO'), registrado_por_id: id, observaciones: nota,
        reversion: objeto({ fecha_hora: fecha, usuario_id: id, motivo: nota }, ['fecha_hora', 'usuario_id', 'motivo']),
      }, ['factura_id', 'fecha_hora', 'importe', 'moneda', 'metodo', 'clave_idempotencia', 'estado', 'registrado_por_id'], {
        allOf: [condicion('estado', 'ANULADO', ['reversion'])],
      }),
      indices: [unico('uq_pago_actor_clave', { registrado_por_id: 1, clave_idempotencia: 1 }),
        ix('ix_pago_factura_estado_fecha', { factura_id: 1, estado: 1, fecha_hora: 1, _id: 1 })],
    },
    // Ampliacion clinica comun adoptada en DISENO_PROYECTO.md, seccion 5.5.
    {
      nombre: 'citas',
      esquema: raiz({
        paciente_id: id, solicitante_medico_id: id, gestionada_por_id: id, fecha_hora: fecha,
        motivo: nota, estado: estados('PROGRAMADA', 'ATENDIDA', 'CANCELADA'), fecha_creacion: fecha, motivo_cancelacion: nota,
      }, ['paciente_id', 'solicitante_medico_id', 'gestionada_por_id', 'fecha_hora', 'motivo', 'estado', 'fecha_creacion'], {
        allOf: [condicion('estado', 'CANCELADA', ['motivo_cancelacion'])],
      }),
      indices: [ix('ix_cita_medico_fecha', { solicitante_medico_id: 1, fecha_hora: 1, _id: 1 }),
        ix('ix_cita_paciente_fecha', { paciente_id: 1, fecha_hora: 1, _id: 1 }),
        ix('ix_cita_estado_fecha', { estado: 1, fecha_hora: 1, _id: 1 })],
    },
    {
      nombre: 'consultas_clinicas',
      esquema: raiz({
        paciente_id: id, historial_id: id, cita_id: id, solicitante_medico_id: id, registrado_por_id: id,
        fecha_hora: fecha, motivo: nota, sintomas: nota, observaciones: nota,
        estado: estados('ABIERTA', 'FINALIZADA'), diagnosticos: lista(diagnostico), tratamientos: lista(tratamiento), receta,
      }, ['paciente_id', 'historial_id', 'solicitante_medico_id', 'registrado_por_id', 'fecha_hora',
        'motivo', 'estado', 'diagnosticos', 'tratamientos']),
      reglas: [idsUnicos('diagnosticos', 'diagnostico_id'), idsUnicos('tratamientos', 'tratamiento_id'),
        { $expr: { $cond: [{ $eq: [{ $type: '$receta' }, 'missing'] }, true, { $and: [
          { $eq: ['$receta.prescriptor_id', '$solicitante_medico_id'] },
          idsUnicos('receta.medicamentos', 'medicamento_id').$expr,
        ] }] } },
        { $expr: { $allElementsTrue: [{ $map: { input: { $ifNull: ['$tratamientos', []] }, as: 't', in: { $or: [
          { $eq: [{ $type: '$$t.fecha_inicio' }, 'missing'] }, { $eq: [{ $type: '$$t.fecha_fin' }, 'missing'] },
          { $gte: ['$$t.fecha_fin', '$$t.fecha_inicio'] },
        ] } } }] } },
        { $expr: { $cond: [{ $isArray: '$diagnosticos' }, { $or: [
          { $eq: [{ $size: '$diagnosticos' }, 0] },
          { $eq: [{ $size: { $filter: { input: '$diagnosticos', as: 'd', cond: { $eq: ['$$d.es_principal', true] } } } }, 1] },
        ] }, false] } }],
      indices: [unico('uq_consulta_cita', { cita_id: 1 }, parcialTexto('cita_id')),
        unico('uq_consulta_receta', { 'receta.receta_id': 1 }, parcialTexto('receta.receta_id')),
        ix('ix_consulta_paciente_fecha', { paciente_id: 1, fecha_hora: 1, _id: 1 }),
        ix('ix_consulta_historial_fecha', { historial_id: 1, fecha_hora: 1, _id: 1 })],
    },
    // Colecciones tecnicas protegidas; la respuesta de un comando permite replay exacto.
    // El backend debe excluir tokens, contrasenas y credenciales de cualquier respuesta.
    {
      nombre: 'operaciones',
      esquema: raiz({
        institucion_id: estados('LABORATORIO_CLINICO'), usuario_id: id, caso_uso: texto(100), clave: texto(),
        hash_entrada: hash, recurso_tipo: texto(100), recurso_id: texto(240), fecha_hora: fecha,
        codigo_respuesta: { ...entero(200), maximum: 299 }, estado: estados('CONFIRMADA'),
        respuesta: objeto({ data: { bsonType: 'object' }, meta: objeto({ correlacion: id }, ['correlacion']) }, ['data', 'meta']),
      }, ['institucion_id', 'usuario_id', 'caso_uso', 'clave', 'hash_entrada', 'recurso_tipo',
        'recurso_id', 'fecha_hora', 'codigo_respuesta', 'estado', 'respuesta'], {}, texto(240)),
      indices: [unico('uq_operacion_ambito_clave', { institucion_id: 1, usuario_id: 1, caso_uso: 1, clave: 1 })],
    },
    {
      nombre: 'identidades_paciente',
      esquema: raiz({ tipo_documento: texto(40), numero_documento: texto(80), paciente_id: id, fecha_registro: fecha },
        ['tipo_documento', 'numero_documento', 'paciente_id', 'fecha_registro'], {}, texto(240)),
      indices: [unico('uq_identidad_documento', { tipo_documento: 1, numero_documento: 1 }),
        ix('ix_identidad_paciente', { paciente_id: 1 })],
    },
    {
      nombre: 'revisiones',
      esquema: raiz({
        tipo_recurso: texto(100), recurso_id: id, version: entero(1), actor_id: id, fecha_hora: fecha, motivo: nota,
        contenido_anterior: { bsonType: 'object' },
      }, ['tipo_recurso', 'recurso_id', 'version', 'actor_id', 'fecha_hora', 'motivo', 'contenido_anterior']),
      indices: [unico('uq_revision_recurso_version', { tipo_recurso: 1, recurso_id: 1, version: 1 }),
        ix('ix_revision_recurso_fecha', { tipo_recurso: 1, recurso_id: 1, fecha_hora: 1, _id: 1 })],
    },
  ];

  const canonico = (valor) => {
    if (Array.isArray(valor)) return valor.map(canonico);
    if (valor && typeof valor === 'object') return Object.fromEntries(
      Object.keys(valor).sort().map((clave) => [clave, canonico(valor[clave])]),
    );
    return valor;
  };
  const equivalente = (a, b) => JSON.stringify(canonico(a)) === JSON.stringify(canonico(b));
  const mismasClavesIndice = (a, b) => JSON.stringify(Object.entries(a)) === JSON.stringify(Object.entries(b));
  const opcionesIndice = (indice) => ({
    unique: Boolean(indice.unique), sparse: Boolean(indice.sparse), hidden: Boolean(indice.hidden),
    partialFilterExpression: indice.partialFilterExpression || null,
    expireAfterSeconds: indice.expireAfterSeconds ?? null, collation: indice.collation || null,
  });

  for (const definicion of definiciones) {
    definicion.validador = { $and: [
      { $jsonSchema: definicion.esquema },
      { $expr: { $lte: [{ $bsonSize: '$$ROOT' }, 256 * 1024] } },
      ...(definicion.reglas || []),
    ] };
  }

  // Preflight de TODAS las colecciones antes de crear la primera.
  // No cambia silenciosamente una base antigua ni elimina indices incompatibles.
  const existentes = new Map(destino.getCollectionInfos().map((info) => [info.name, info]));
  for (const definicion of definiciones) {
    const info = existentes.get(definicion.nombre);
    if (!info) continue;
    if (info.type !== 'collection' || info.options.capped || info.options.timeseries || info.options.collation
        || !equivalente(info.options.validator, definicion.validador)
        || info.options.validationLevel !== 'strict' || info.options.validationAction !== 'error') {
      throw new Error(`Estructura incompatible en ${definicion.nombre}; preparar migracion explicita antes de continuar.`);
    }
    const indicesExistentes = destino.getCollection(definicion.nombre).getIndexes();
    for (const esperado of definicion.indices) {
      for (const actual of indicesExistentes) {
        if (actual.name === esperado.name || mismasClavesIndice(actual.key, esperado.key)) {
          if (actual.name !== esperado.name || !mismasClavesIndice(actual.key, esperado.key)
              || !equivalente(opcionesIndice(actual), opcionesIndice(esperado))) {
            throw new Error(`Indice incompatible en ${definicion.nombre}/${esperado.name}; no se reemplaza automaticamente.`);
          }
        }
      }
    }
  }

  let creadas = 0;
  let totalIndices = 0;
  for (const definicion of definiciones) {
    if (!existentes.has(definicion.nombre)) {
      destino.createCollection(definicion.nombre, {
        validator: definicion.validador, validationLevel: 'strict', validationAction: 'error',
      });
      creadas += 1;
    }
    for (const indice of definicion.indices) {
      const { key, ...opciones } = indice;
      destino.getCollection(definicion.nombre).createIndex(key, opciones);
      totalIndices += 1;
    }
  }
  print(`MongoDB: ${nombreBase}; ${definiciones.length} colecciones, ${creadas} nuevas, ${totalIndices} indices secundarios verificados.`);
  print('No se cargaron datos ni cuentas. Las reglas entre documentos requieren el backend transaccional.');
})();
