/* E02-P2-01. Ejecutar con administración, escritores detenidos y replica set.
 * Aditiva/reanudable: no elimina campos ni documentos ni cambia datos clínicos.
 * Backfill de claves de búsqueda v1 y reservas canónicas; preflight antes de collMod.
 * Si falla después de collMod, reejecutar; la transacción revierte el backfill completo.
 */
let etapaMigracionPacientes = 'preflight';
(async () => {
  const destino = db.getSiblingDB(process.env.MONGO_LAB_DB || 'laboratorio_clinico');
  const crypto = require('node:crypto');
  const texto = (n) => ({bsonType: 'string', minLength: 1, maxLength: n, pattern: '\\S'});
  const propiedades = {
    claves_nombre: {bsonType: 'array', minItems: 1, maxItems: 160, items: texto(350)},
    numero_busqueda: texto(80),
  };
  const info = destino.getCollectionInfos({name: 'pacientes'})[0];
  if (!info || info.options.validationLevel !== 'strict' || info.options.validationAction !== 'error' || !info.options.validator?.$and?.[0]?.$jsonSchema?.properties) throw new Error('MODELO_PACIENTES_INCOMPATIBLE');
  const validador = EJSON.parse(EJSON.stringify(info.options.validator));
  const props = validador.$and[0].$jsonSchema.properties;
  const sorted = (value) => Array.isArray(value) ? value.map(sorted) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])])) : value;
  const canonical = (value) => JSON.stringify(sorted(value));
  for (const [name, schema] of Object.entries(propiedades)) {
    if (props[name] && canonical(props[name]) !== canonical(schema)) throw new Error('EXTENSION_PACIENTES_INCOMPATIBLE');
    props[name] = schema;
  }
  if (destino.pacientes.countDocuments({$nor: [validador]}) !== 0) throw new Error('DOCUMENTOS_NO_COMPATIBLES');
  const identidad = (tipo, numero) => {
    const valor = {tipo_documento: tipo.trim().toUpperCase(), numero_documento: numero.normalize('NFC').trim().replace(/[\s-]+/gu, '').toUpperCase()};
    if (!valor.tipo_documento || valor.tipo_documento.length > 40 || !valor.numero_documento || valor.numero_documento.length > 80) throw new Error('IDENTIDAD_LEGADA_INCOMPATIBLE');
    return valor;
  };
  const clave = (id) => JSON.stringify([id.tipo_documento, id.numero_documento]);
  const normalizar = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').trim().replace(/\s+/gu, ' ').toLowerCase();
  const pacientes = destino.pacientes.find().toArray();
  const titulares = new Map();
  for (const p of pacientes) {
    const palabras = normalizar([p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido].filter(Boolean).join(' ')).split(' ');
    if (!palabras[0] || palabras.length > 160 || palabras.join(' ').length > 350) throw new Error('NOMBRE_LEGADO_INCOMPATIBLE');
    if (!p.tipo_documento) continue;
    const k = clave(identidad(p.tipo_documento, p.numero_documento));
    if (titulares.has(k) && titulares.get(k) !== p._id) throw new Error('IDENTIDAD_LEGADA_DUPLICADA');
    titulares.set(k, p._id);
  }
  const reservas = destino.identidades_paciente.find().toArray();
  const idsReserva = new Map();
  for (const r of reservas) {
    const k = clave(identidad(r.tipo_documento, r.numero_documento));
    if (titulares.get(k) !== r.paciente_id || idsReserva.has(k)) throw new Error('RESERVA_LEGADA_INCOMPATIBLE');
    idsReserva.set(k, r._id);
  }
  for (const [name, key] of [
    ['ix_paciente_prefijos', {claves_nombre: 1, fecha_registro: 1, _id: 1}],
    ['ix_paciente_numero_busqueda', {numero_busqueda: 1, fecha_registro: 1, _id: 1}],
  ]) {
    const ix = destino.pacientes.getIndexes().find((i) => i.name === name);
    if (ix && JSON.stringify(ix.key) !== JSON.stringify(key)) throw new Error('INDICE_PACIENTES_INCOMPATIBLE');
  }
  etapaMigracionPacientes = 'collMod';
  const resultadoCollMod = await destino.runCommand({collMod: 'pacientes', validator: validador, validationLevel: 'strict', validationAction: 'error'});
  if (resultadoCollMod.ok !== 1) throw new Error('COLLMOD_RECHAZADO');
  etapaMigracionPacientes = 'session';
  const session = db.getMongo().startSession();
  try {
    session.startTransaction({readConcern: {level: 'snapshot'}, writeConcern: {w: 'majority'}});
    try {
      const base = session.getDatabase(destino.getName());
      etapaMigracionPacientes = 'backfill';
      for (const p of pacientes) {
        const nombre = normalizar([p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido].filter(Boolean).join(' '));
        const palabras = nombre.split(' ');
        const set = {claves_nombre: [...new Set(palabras.map((_, i) => palabras.slice(i).join(' ')))]};
        if (p.tipo_documento) {
          const id = identidad(p.tipo_documento, p.numero_documento);
          const k = clave(id);
          if (!id.numero_documento || id.numero_documento.length > 80) throw new Error('IDENTIDAD_LEGADA_INCOMPATIBLE');
          set.numero_busqueda = id.numero_documento;
          const anteriorId = idsReserva.get(k);
          if (anteriorId) base.identidades_paciente.updateOne({_id: anteriorId}, {$set: id});
          else base.identidades_paciente.insertOne({_id: crypto.createHash('sha256').update(k).digest('hex'), revision: 1, ...id, paciente_id: p._id, fecha_registro: p.fecha_registro});
        }
        const result = base.pacientes.updateOne({_id: p._id, revision: p.revision}, {$set: set});
        if (result.matchedCount !== 1) throw new Error('PACIENTE_CAMBIO_DURANTE_MIGRACION');
      }
      etapaMigracionPacientes = 'commit';
      await session.commitTransaction();
    } catch (error) {
      try { await session.abortTransaction(); } catch (_) { /* Conservar el error original. */ }
      throw error;
    }
  } finally { await session.endSession(); }
  etapaMigracionPacientes = 'indices';
  destino.pacientes.createIndex({claves_nombre: 1, fecha_registro: 1, _id: 1}, {name: 'ix_paciente_prefijos'});
  destino.pacientes.createIndex({numero_busqueda: 1, fecha_registro: 1, _id: 1}, {name: 'ix_paciente_numero_busqueda'});
  print('PASS: migración MongoDB de búsqueda/reservas; datos clínicos e índices previos conservados.');
})().catch((error) => {
  const code = error.codeName || (/^[A-Z_]+$/.test(error.message) ? error.message : 'ERROR_MIGRACION');
  print(`FAIL: migración MongoDB no aplicada completamente (${etapaMigracionPacientes}/${code}/${error.name}); conservar datos y reanudar.`);
  quit(1);
});
