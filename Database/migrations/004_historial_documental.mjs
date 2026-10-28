/** Extensión de lectura v1. Recibe clientes ADMIN del operador; no descubre destinos ni credenciales. */
export async function prepararHistorialMongodb(db) {
  const existentes = new Set((await db.listCollections({}, {nameOnly: true}).toArray()).map((c) => c.name));
  if (!existentes.has('historial_modelo')) await db.createCollection('historial_modelo');
  if (!existentes.has('historial_eventos')) await db.createCollection('historial_eventos', {validator: {$jsonSchema: {
    bsonType: 'object', additionalProperties: false, required: ['_id','paciente_id','tipo','fecha_hora','contenido'], properties: {
      _id: {bsonType: 'string'}, paciente_id: {bsonType: 'string'}, tipo: {enum: ['CONSULTA','DIAGNOSTICO','TRATAMIENTO','RECETA','ARCHIVO','ORDEN_LAB','RESULTADO_LAB','INFORME_LAB']},
      fecha_hora: {bsonType: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{9}Z$'}, contenido: {bsonType: 'object'},
    },
  }}, validationLevel: 'strict', validationAction: 'error'});
  await db.collection('historial_eventos').createIndex({paciente_id: 1, tipo: 1, fecha_hora: 1, _id: 1}, {name: 'ix_historial_paciente_tipo_fecha'});
  await db.collection('historial_modelo').createIndex({id: 1}, {unique: true, name: 'uq_historial_modelo'});
  const rol = await db.command({rolesInfo: 'laboratorio_aplicacion'});
  if (rol.roles.length) await db.command({grantPrivilegesToRole: 'laboratorio_aplicacion', privileges: [
    {resource: {db: db.databaseName, collection: 'historial_eventos'}, actions: ['find','insert']},
    {resource: {db: db.databaseName, collection: 'historial_modelo'}, actions: ['find']},
  ]});
  const legado = await db.collection('consultas_clinicas').findOne({}, {projection: {_id: 1}})
    || await db.collection('ordenes').findOne({}, {projection: {_id: 1}})
    || await db.collection('pacientes').findOne({'historial.estado': 'ARCHIVADO'}, {projection: {_id: 1}});
  await db.collection('historial_modelo').updateOne({id: 1}, {$setOnInsert: {version: 1, estado: legado ? 'RECONCILIAR' : 'LISTO'}}, {upsert: true});
}
export async function prepararHistorialFirestore(db) {
  const consultas = await db.collection('consultas').limit(1).get();
  const vacunas = await db.collection('aplicaciones_vacuna').limit(1).get();
  const archivados = await db.collection('pacientes').where('estado','==','ARCHIVADO').limit(1).get();
  const ref = db.doc('historial_configuracion/modelo');
  await db.runTransaction(async (t) => {
    const previo = await t.get(ref);
    if (!previo.exists) t.create(ref, {version: 1, estado: consultas.empty && vacunas.empty && archivados.empty ? 'LISTO' : 'RECONCILIAR'});
  });
}
