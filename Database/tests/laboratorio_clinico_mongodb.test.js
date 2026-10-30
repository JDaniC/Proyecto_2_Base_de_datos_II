/* Ejecutar desde la raiz con mongosh conectado a un replica set de pruebas.
 * Crea y elimina SOLO bases nuevas laboratorio_clinico_test_*.
 * Rechaza cualquier base de pruebas que ya tenga colecciones.
 * No valida todavia los casos de uso del backend, que no existe.
 */
(async () => {
  'use strict';
  const assert = require('node:assert/strict');
  const { randomUUID } = require('node:crypto');
  const nombre = process.env.MONGO_LAB_DB || `laboratorio_clinico_test_${Date.now()}_${process.pid}`;
  if (!/^laboratorio_clinico_test_[a-z0-9_]{1,30}$/.test(nombre)) {
    throw new Error('Las pruebas solo aceptan nombres laboratorio_clinico_test_* de hasta 54 caracteres.');
  }
  const destino = db.getSiblingDB(nombre);
  const nombreDeriva = `${nombre}_drift`;
  const deriva = db.getSiblingDB(nombreDeriva);
  assert.equal(destino.getCollectionInfos().length, 0, 'La base de pruebas debe ser nueva y vacia.');
  assert.equal(deriva.getCollectionInfos().length, 0, 'La base auxiliar debe ser nueva y vacia.');
  const variableAnterior = process.env.MONGO_LAB_DB;
  const script = 'Database/laboratorio_clinico_mongodb.js';
  let comprobaciones = 0;
  const verificar = async (nombreCaso, accion) => {
    await accion();
    comprobaciones += 1;
    print(`PASS ${nombreCaso}`);
  };
  const errorEsperado = async (accion, codigo) => {
    let fallo;
    try { await accion(); } catch (error) { fallo = error; }
    assert.ok(fallo, 'Se esperaba rechazo de la operacion.');
    assert.equal(fallo.code, codigo, 'La operacion debe fallar con el codigo esperado.');
  };
  const copiar = (documento) => EJSON.parse(EJSON.stringify(documento, { relaxed: false }), { relaxed: false });
  const fecha = new Date('2026-10-19T12:00:00Z');
  const uid = randomUUID;
  const nombres = ['pacientes', 'solicitantes', 'tipos_muestra', 'metodos', 'pruebas', 'ordenes', 'muestras',
    'eventos_muestra', 'resultados', 'informes', 'equipos', 'proveedores', 'reactivos', 'lotes_reactivo',
    'movimientos_reactivo', 'controles_calidad', 'personal', 'usuarios', 'roles', 'auditoria', 'facturas',
    'pagos', 'citas', 'consultas_clinicas', 'operaciones', 'identidades_paciente', 'revisiones'];
  const ids = Object.fromEntries(nombres.map((n) => [n, uid()]));
  const historial = uid();
  const item = uid();
  const parametro = uid();
  const principal = uid();
  let resultadoValidado;
  const documento = (coleccion, datos) => ({ _id: ids[coleccion], revision: NumberInt(1), ...datos });
  const muestrasValidas = {
    pacientes: documento('pacientes', {
      codigo_paciente: 'SINTETICO-001', tipo_documento: 'PRUEBA', numero_documento: 'DOCUMENTO-001',
      primer_nombre: 'PacienteSintetico', primer_apellido: 'Prueba', nombre_busqueda: 'pacientesintetico prueba',
      fecha_nacimiento: new Date('2000-01-01T00:00:00Z'), contactos: [], fecha_registro: fecha, activo: true,
      historial: { id_historial: historial, numero_historial: 'H-SINTETICO-001', fecha_apertura: fecha, estado: 'ACTIVO' },
    }),
    solicitantes: documento('solicitantes', { nombre_completo: 'ProfesionalSintetico', tipo: 'MEDICO',
      entidad_colegiacion: 'ENTIDAD-SINTETICA', numero_colegiado: 'COLEGIADO-PRUEBA', activo: true }),
    tipos_muestra: documento('tipos_muestra', { codigo: 'M-SINTETICA', nombre: 'MuestraSintetica', recipiente_requerido: 'RECIPIENTE-PRUEBA', activo: true }),
    metodos: documento('metodos', { codigo: 'METODO-SINTETICO', version: NumberInt(1), nombre: 'MetodoSintetico', activo: true }),
    pruebas: documento('pruebas', { codigo: 'PRUEBA-SINTETICA', version: NumberInt(1), nombre: 'PruebaSintetica',
      area: 'AREA-PRUEBA', metodo_id: ids.metodos, tipo_muestra_ids: [ids.tipos_muestra], activo: true,
      parametros: [{ parametro_id: parametro, codigo: 'PARAMETRO-PRUEBA', nombre: 'ParametroSintetico', tipo_valor: 'NUMERICO', obligatorio: true }] }),
    ordenes: documento('ordenes', { numero_orden: 'ORDEN-SINTETICA', paciente_id: ids.pacientes,
      solicitante_id: ids.solicitantes, fecha_orden: fecha, registrado_por_id: ids.usuarios, prioridad: 'RUTINA', estado: 'CREADA', moneda: 'GTQ',
      items: [{ item_id: item, prueba_id: ids.pruebas, prioridad: 'RUTINA', estado: 'SOLICITADO', precio_acordado: NumberLong('1000') }] }),
    muestras: documento('muestras', { codigo_barras: 'BARRAS-SINTETICAS', orden_id: ids.ordenes, item_ids: [item],
      tipo_muestra_id: ids.tipos_muestra, fecha_toma: fecha, tomada_por_id: ids.personal, estado: 'TOMADA' }),
    eventos_muestra: documento('eventos_muestra', { muestra_id: ids.muestras, fecha_hora: fecha, tipo_evento: 'TOMA', usuario_id: ids.usuarios }),
    resultados: documento('resultados', { serie_resultado_id: uid(), version: NumberInt(1), orden_id: ids.ordenes,
      item_id: item, prueba_id: ids.pruebas, analista_id: ids.personal, fecha_analisis: fecha, estado: 'BORRADOR',
      procedencia_muestras: [{ muestra_id: ids.muestras, codigo_barras_historico: 'BARRAS-SINTETICAS',
        tipo_muestra_id: ids.tipos_muestra, tipo_muestra_nombre_historico: 'MuestraSintetica',
        fecha_toma: fecha, fecha_recepcion: fecha, fecha_aceptacion: fecha }],
      componentes: [{ parametro_id: parametro, valor_numerico: NumberDecimal('1.25') }] }),
    informes: documento('informes', { serie_informe_id: uid(), version: NumberInt(1), orden_id: ids.ordenes, resultado_ids: [], estado: 'BORRADOR' }),
    equipos: documento('equipos', { codigo: 'EQUIPO-SINTETICO', nombre: 'EquipoSintetico', estado: 'OPERATIVO', fecha_alta: fecha }),
    proveedores: documento('proveedores', { nombre: 'ProveedorSintetico', tipo_identificacion: 'PRUEBA', numero_identificacion: 'PROVEEDOR-001', activo: true }),
    reactivos: documento('reactivos', { codigo: 'REACTIVO-SINTETICO', nombre: 'ReactivoSintetico', unidad_stock: 'UNIDAD-PRUEBA', activo: true }),
    lotes_reactivo: documento('lotes_reactivo', { reactivo_id: ids.reactivos, numero_lote: 'LOTE-SINTETICO',
      fecha_vencimiento: new Date('2027-01-01T00:00:00Z'), estado_operativo: 'ACTIVO', revision_stock: NumberInt(0) }),
    movimientos_reactivo: documento('movimientos_reactivo', { lote_id: ids.lotes_reactivo, fecha_hora: fecha, tipo: 'ENTRADA',
      cantidad: NumberDecimal('10.5'), unidad_stock: 'UNIDAD-PRUEBA', estado: 'CONFIRMADO', usuario_id: ids.usuarios, clave_idempotencia: 'MOVIMIENTO-SINTETICO' }),
    controles_calidad: documento('controles_calidad', { prueba_id: ids.pruebas, equipo_id: ids.equipos, fecha_hora: fecha,
      operador_id: ids.personal, estado: 'PENDIENTE', mediciones: [{ parametro_id: parametro, valor: NumberDecimal('1'),
        unidad_aplicada: 'UNIDAD-PRUEBA', objetivo_aplicado: NumberDecimal('1'), limite_inferior: NumberDecimal('0'),
        limite_superior: NumberDecimal('2'), evaluacion: 'DENTRO' }] }),
    personal: documento('personal', { primer_nombre: 'PersonalSintetico', primer_apellido: 'Prueba', cargo: 'CARGO-PRUEBA', activo: true }),
    usuarios: documento('usuarios', { personal_id: ids.personal, solicitante_medico_id: ids.solicitantes, nombre_usuario: 'usuario-sintetico',
      auth_uid: 'UID-FIREBASE-SINTETICO', proveedor_identidad: 'FIREBASE', institucion_id: 'LABORATORIO_CLINICO',
      rol_ids: [ids.roles], estado: 'ACTIVO', activo: true }),
    roles: documento('roles', { nombre: 'ROL-SINTETICO', permisos: ['historial.leer'] }),
    auditoria: documento('auditoria', { usuario_id: ids.usuarios, auth_uid: 'UID-FIREBASE-SINTETICO',
      institucion_id: 'LABORATORIO_CLINICO', fecha_hora: fecha, accion: 'PRUEBA', coleccion: 'pacientes', documento_id: ids.pacientes, correlacion: uid() }),
    facturas: documento('facturas', { numero_factura: 'FACTURA-SINTETICA', orden_id: ids.ordenes, moneda: 'GTQ', estado: 'BORRADOR', revision_cobro: NumberInt(0),
      receptor: { nombre: 'ReceptorSintetico', tipo_identificacion: 'PRUEBA', numero_identificacion: 'RECEPTOR-001' },
      lineas: [{ linea_id: uid(), item_id: item, descripcion_historica: 'ServicioSintetico', cantidad: NumberInt(1),
        precio_unitario: NumberLong('1000'), descuento_importe: NumberLong('0'), impuesto_importe: NumberLong('0') }] }),
    pagos: documento('pagos', { factura_id: ids.facturas, fecha_hora: fecha, importe: NumberLong('500'), moneda: 'GTQ',
      metodo: 'EFECTIVO', clave_idempotencia: 'PAGO-SINTETICO', estado: 'CONFIRMADO', registrado_por_id: ids.usuarios }),
    citas: documento('citas', { paciente_id: ids.pacientes, solicitante_medico_id: ids.solicitantes, gestionada_por_id: ids.usuarios,
      fecha_hora: fecha, motivo: 'MOTIVO-SINTETICO', estado: 'PROGRAMADA', fecha_creacion: fecha }),
    consultas_clinicas: documento('consultas_clinicas', { paciente_id: ids.pacientes, historial_id: historial, cita_id: ids.citas,
      solicitante_medico_id: ids.solicitantes, registrado_por_id: ids.usuarios, fecha_hora: fecha, motivo: 'MOTIVO-SINTETICO', estado: 'ABIERTA',
      diagnosticos: [{ diagnostico_id: principal, codigo: 'CODIGO-SINTETICO', nombre: 'DiagnosticoSintetico', es_principal: true }], tratamientos: [],
      receta: { receta_id: uid(), version: NumberInt(1), estado: 'EMITIDA', fecha_emision: fecha,
        prescriptor_id: ids.solicitantes, prescriptor_nombre_historico: 'ProfesionalSintetico', colegiado_historico: 'COLEGIADO-PRUEBA',
        medicamentos: [{ medicamento_id: uid(), nombre: 'ProductoSintetico', presentacion: 'PRUEBA', concentracion: 'PRUEBA',
          dosis: 'PRUEBA', frecuencia: 'PRUEBA', duracion: 'PRUEBA', via: 'PRUEBA', indicaciones: 'DATOS-SINTETICOS' }] } }),
    operaciones: documento('operaciones', { institucion_id: 'LABORATORIO_CLINICO', usuario_id: ids.usuarios, caso_uso: 'PRUEBA', clave: 'CLAVE-SINTETICA',
      hash_entrada: 'a'.repeat(64), recurso_tipo: 'pacientes', recurso_id: ids.pacientes, fecha_hora: fecha, codigo_respuesta: NumberInt(201), estado: 'CONFIRMADA',
      respuesta: { data: { paciente_id: ids.pacientes, historial_id: historial }, meta: { correlacion: uid() } } }),
    identidades_paciente: documento('identidades_paciente', { tipo_documento: 'PRUEBA', numero_documento: 'DOCUMENTO-001', paciente_id: ids.pacientes, fecha_registro: fecha }),
    revisiones: documento('revisiones', { tipo_recurso: 'consultas_clinicas', recurso_id: ids.consultas_clinicas, version: NumberInt(1), actor_id: ids.usuarios,
      fecha_hora: fecha, motivo: 'CORRECCION-SINTETICA', contenido_anterior: { motivo: 'MOTIVO-SINTETICO' } }),
  };

  try {
    process.env.MONGO_LAB_DB = nombre;
    await load(script);
    await verificar('27 colecciones con validacion estricta e indices', async () => {
      assert.equal(JSON.stringify(destino.getCollectionInfos().map((i) => i.name).sort()), JSON.stringify([...nombres].sort()));
      for (const info of destino.getCollectionInfos()) {
        assert.equal(info.options.validationLevel, 'strict');
        assert.equal(info.options.validationAction, 'error');
        assert.ok(info.options.validator.$and);
      }
      let indices = 0;
      for (const n of nombres) indices += destino.getCollection(n).getIndexes().length - 1;
      assert.equal(indices, 65);
    });
    for (const nombreColeccion of nombres) {
      await verificar(`documento valido en ${nombreColeccion}`, async () => {
        await destino.getCollection(nombreColeccion).insertOne(copiar(muestrasValidas[nombreColeccion]));
      });
      await verificar(`rechazo de campo requerido ausente en ${nombreColeccion}`, async () => {
        const invalido = copiar(muestrasValidas[nombreColeccion]);
        invalido._id = uid();
        delete invalido.revision;
        await errorEsperado(() => destino.getCollection(nombreColeccion).insertOne(invalido), 121);
      });
    }
    await verificar('segunda ejecucion conserva documentos y definiciones', async () => {
      await load(script);
      for (const n of nombres) assert.equal(destino.getCollection(n).countDocuments({}), 1);
    });
    const invalido = async (coleccion, transformar) => {
      const valor = copiar(muestrasValidas[coleccion]);
      valor._id = uid();
      transformar(valor);
      await errorEsperado(() => destino.getCollection(coleccion).insertOne(valor), 121);
    };
    const duplicado = async (coleccion) => {
      const valor = copiar(muestrasValidas[coleccion]); valor._id = uid();
      await errorEsperado(() => destino.getCollection(coleccion).insertOne(valor), 11000);
    };
    for (const n of ['pacientes', 'metodos', 'pruebas', 'muestras', 'resultados', 'informes', 'usuarios', 'facturas', 'pagos', 'operaciones', 'identidades_paciente', 'consultas_clinicas', 'revisiones']) {
      await verificar(`unicidad de negocio en ${n}`, () => duplicado(n));
    }
    const casosInvalidos = [
      ['UUID invalido', 'ordenes', (v) => { v.paciente_id = 'no-es-uuid'; }],
      ['identificacion incompleta', 'pacientes', (v) => { delete v.tipo_documento; }],
      ['historial archivado sin baja', 'pacientes', (v) => { v.activo = false; v.historial.estado = 'ARCHIVADO'; }],
      ['estado y activo incoherentes', 'usuarios', (v) => { v.activo = false; }],
      ['contrasena local prohibida', 'usuarios', (v) => { v.contrasena_hash = 'VALOR-SINTETICO'; }],
      ['pago cero', 'pagos', (v) => { v.importe = NumberLong('0'); }],
      ['dinero Double prohibido', 'pagos', (v) => { v.importe = 1.5; }],
      ['moneda invalida', 'pagos', (v) => { v.moneda = 'gtq'; }],
      ['cantidad negativa', 'movimientos_reactivo', (v) => { v.cantidad = NumberDecimal('-1'); }],
      ['estado fuera del catalogo', 'ordenes', (v) => { v.estado = 'OTRO'; }],
      ['items con identificador repetido y distinto contenido', 'ordenes', (v) => { v.items.push({ ...v.items[0], prioridad: 'URGENTE' }); }],
      ['mas de 100 contactos', 'pacientes', (v) => { v.contactos = Array.from({ length: 101 }, () => ({ contacto_id: uid(), tipo: 'TELEFONO', valor: 'SINTETICO', es_principal: false })); }],
      ['muestra rechazada sin motivo', 'muestras', (v) => { v.estado = 'RECHAZADA'; }],
      ['rectificacion sin valores previos', 'eventos_muestra', (v) => { v.tipo_evento = 'RECTIFICACION'; }],
      ['resultado validado sin actor y fecha', 'resultados', (v) => { v.estado = 'VALIDADO'; }],
      ['resultado con valor numerico y textual simultaneos', 'resultados', (v) => { v.componentes[0].valor_texto = 'SINTETICO'; }],
      ['version corregida sin enlace al original', 'resultados', (v) => { v.version = NumberInt(2); }],
      ['informe emitido sin archivo/versiones', 'informes', (v) => { v.estado = 'EMITIDO'; }],
      ['factura emitida sin actor y fecha', 'facturas', (v) => { v.estado = 'EMITIDA'; }],
      ['anulacion de pago sin reversion', 'pagos', (v) => { v.estado = 'ANULADO'; }],
      ['diagnosticos sin principal', 'consultas_clinicas', (v) => { v.diagnosticos[0].es_principal = false; }],
      ['campo ajeno en receta', 'consultas_clinicas', (v) => { v.receta.clave_secreta = 'SINTETICO'; }],
      ['limite BSON de 256 KiB', 'revisiones', (v) => { v.contenido_anterior = { prueba: 'x'.repeat(256 * 1024) }; }],
    ];
    for (const [titulo, coleccion, transformar] of casosInvalidos) {
      await verificar(titulo, () => invalido(coleccion, transformar));
    }
    await verificar('resultado validado con actor y fecha aceptado', async () => {
      const valor = copiar(muestrasValidas.resultados); valor._id = uid(); valor.serie_resultado_id = uid();
      valor.estado = 'VALIDADO'; valor.validador_id = ids.usuarios; valor.fecha_validacion = fecha;
      await destino.resultados.insertOne(valor);
      resultadoValidado = valor._id;
    });
    await verificar('resultado textual de otra estructura aceptado', async () => {
      const valor = copiar(muestrasValidas.resultados); valor._id = uid(); valor.serie_resultado_id = uid();
      delete valor.componentes[0].valor_numerico; valor.componentes[0].valor_texto = 'VALOR-SINTETICO';
      await destino.resultados.insertOne(valor);
    });
    await verificar('informe emitido con metadatos completos aceptado', async () => {
      const valor = copiar(muestrasValidas.informes); valor._id = uid(); valor.serie_informe_id = uid();
      valor.estado = 'EMITIDO'; valor.resultado_ids = [resultadoValidado]; valor.fecha_emision = fecha;
      valor.emitido_por_id = ids.usuarios; valor.cabecera = { nombre_paciente: 'PacienteSintetico', nombre_solicitante: 'ProfesionalSintetico' };
      valor.archivo_uri = 'sintetico://informe'; valor.archivo_sha256 = 'b'.repeat(64);
      await destino.informes.insertOne(valor);
    });
    await verificar('historial archivado con causa aceptado', async () => {
      const valor = copiar(muestrasValidas.pacientes); valor._id = uid(); valor.codigo_paciente = 'ARCHIVO-SINTETICO';
      valor.numero_documento = 'ARCHIVO-SINTETICO'; valor.historial.id_historial = uid(); valor.historial.numero_historial = 'ARCHIVO-SINTETICO';
      valor.activo = false; valor.historial.estado = 'ARCHIVADO';
      valor.historial.baja = { causa: 'TRASLADO', motivo: 'MOTIVO-SINTETICO', fecha, actor_id: ids.usuarios };
      await destino.pacientes.insertOne(valor);
    });
    await verificar('inmutabilidad historica requiere backend y no se atribuye al validador', async () => {
      // El esquema valida documentos; no compara contra la imagen anterior ni otras colecciones.
      // Esta prueba documenta el limite, no demuestra una emision clinica autorizada.
      const resultado = await destino.metodos.updateOne({ _id: ids.metodos }, { $set: { nombre: 'NombreSinteticoActualizado' } });
      assert.equal(resultado.modifiedCount, 1);
    });
    await verificar('identificaciones ausentes no compiten en indice parcial', async () => {
      for (let i = 0; i < 2; i += 1) {
        const valor = copiar(muestrasValidas.pacientes);
        valor._id = uid(); valor.codigo_paciente = `SIN-DOCUMENTO-${i}`;
        valor.historial.id_historial = uid(); valor.historial.numero_historial = `SIN-DOCUMENTO-${i}`;
        delete valor.tipo_documento; delete valor.numero_documento;
        await destino.pacientes.insertOne(valor);
      }
    });
    await verificar('consulta sin cita opcional no compite con otras sin cita', async () => {
      for (let i = 0; i < 2; i += 1) {
        const valor = copiar(muestrasValidas.consultas_clinicas);
        valor._id = uid(); delete valor.cita_id; delete valor.receta;
        await destino.consultas_clinicas.insertOne(valor);
      }
    });
    await verificar('rollback multi-documento ante error de validacion', async () => {
      const antes = destino.pagos.countDocuments({});
      const sesion = db.getMongo().startSession();
      try {
        await errorEsperado(() => sesion.withTransaction(async () => {
          const transaccion = sesion.getDatabase(nombre);
          const pago = copiar(muestrasValidas.pagos); pago._id = uid(); pago.clave_idempotencia = 'ROLLBACK-SINTETICO';
          await transaccion.pagos.insertOne(pago);
          const movimiento = copiar(muestrasValidas.movimientos_reactivo); movimiento._id = uid(); movimiento.cantidad = NumberDecimal('-1');
          await transaccion.movimientos_reactivo.insertOne(movimiento);
        }), 121);
      } finally { await sesion.endSession(); }
      assert.equal(destino.pagos.countDocuments({}), antes);
      assert.equal(destino.pagos.countDocuments({ clave_idempotencia: 'ROLLBACK-SINTETICO' }), 0);
    });
    await verificar('preflight rechaza esquema ajeno antes de crear otras colecciones', async () => {
      deriva.createCollection('pacientes');
      deriva.pacientes.insertOne({ _id: 'LEGACY-SINTETICO' });
      process.env.MONGO_LAB_DB = nombreDeriva;
      let fallo;
      try { await load(script); } catch (error) { fallo = error; }
      assert.ok(fallo && String(fallo.message).includes('Estructura incompatible'));
      assert.equal(deriva.getCollectionInfos().length, 1);
      assert.equal(deriva.pacientes.countDocuments({}), 1);
      process.env.MONGO_LAB_DB = nombre;
    });
    await verificar('preflight no reemplaza un indice incompatible', async () => {
      destino.operaciones.dropIndex('uq_operacion_ambito_clave');
      destino.operaciones.createIndex({ institucion_id: 1, usuario_id: 1, caso_uso: 1, clave: 1 }, { name: 'uq_operacion_ambito_clave' });
      let fallo;
      try { await load(script); } catch (error) { fallo = error; }
      assert.ok(fallo && String(fallo.message).includes('Indice incompatible'));
      const indice = destino.operaciones.getIndexes().find((i) => i.name === 'uq_operacion_ambito_clave');
      assert.ok(!indice.unique, 'El script no debe alterar el indice ajeno.');
    });
    print(`RESULTADO: ${comprobaciones} comprobaciones PASS. Datos sinteticos; sin backend ni base compartida.`);
  } finally {
    // Ambas bases se comprobaron vacias antes de comenzar y llevan nombre reservado de prueba.
    destino.dropDatabase();
    deriva.dropDatabase();
    if (variableAnterior === undefined) delete process.env.MONGO_LAB_DB;
    else process.env.MONGO_LAB_DB = variableAnterior;
  }
})();
