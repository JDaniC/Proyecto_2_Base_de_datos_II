// Solo lo utiliza verificar.py dentro de su proyecto Docker temporal.
(async () => {
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const { randomUUID } = require('node:crypto');
  const nueva = () => new Mongo('mongodb://mongodb:27017/?directConnection=true');
  const app = nueva();
  const laboratorio = app.getDB('laboratorio_clinico');
  await laboratorio.auth('laboratorio_app', fs.readFileSync('/run/secrets/mongo_app_password', 'utf8').trim());
  const permisoDenegado = async (accion) => assert.rejects(accion, (e) => e.code === 13);
  if (process.env.SOLO_PERSISTENCIA === '1') {
    assert.equal(await laboratorio.pacientes.countDocuments({ codigo_paciente: 'DOCKER-SINTETICO' }), 1);
    print('PASS persistencia MongoDB');
  } else {
    await permisoDenegado(() => nueva().getDB('laboratorio_clinico').pacientes.findOne());
    await permisoDenegado(() => laboratorio.runCommand({ create: 'no_permitida' }));
    await permisoDenegado(() => app.getDB('admin').system.users.findOne());
    await permisoDenegado(() => laboratorio.auditoria.updateOne({}, { $set: { accion: 'NO_PERMITIDA' } }));
    const fecha = new Date();
    const paciente = (codigo) => ({ _id: randomUUID(), revision: NumberInt(1), codigo_paciente: codigo,
      primer_nombre: 'SINTETICO', primer_apellido: 'DOCKER', nombre_busqueda: 'sintetico docker',
      contactos: [], fecha_registro: fecha, activo: true,
      historial: { id_historial: randomUUID(), numero_historial: randomUUID(), fecha_apertura: fecha, estado: 'ACTIVO' } });
    await laboratorio.pacientes.insertOne(paciente('DOCKER-SINTETICO'));
    const session = app.startSession();
    try {
      await assert.rejects(() => session.withTransaction(async () => {
        const destino = session.getDatabase('laboratorio_clinico');
        await destino.pacientes.insertOne(paciente('DOCKER-ROLLBACK'));
        const invalido = paciente('DOCKER-INVALIDO'); delete invalido.revision;
        await destino.pacientes.insertOne(invalido);
      }), (e) => e.code === 121);
    } finally { await session.endSession(); }
    assert.equal(await laboratorio.pacientes.countDocuments({ codigo_paciente: 'DOCKER-ROLLBACK' }), 0);
    assert.equal((await laboratorio.getCollectionInfos()).length, 27);
    print('PASS MongoDB: autenticacion, permisos, escritura y rollback transaccional');
  }
})();
