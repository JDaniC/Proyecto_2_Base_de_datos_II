(async () => {
  try {
    const fs = require('node:fs');
    const conexion = new Mongo('mongodb://mongodb:27017/?directConnection=true&serverSelectionTimeoutMS=5000');
    const admin = conexion.getDB('admin');
    await admin.auth('mongo_admin', fs.readFileSync('/run/secrets/mongo_admin_password', 'utf8').trim());
    try {
      const config = await admin.runCommand({ replSetGetConfig: 1 });
      if (config.config._id !== 'rs0' || config.config.members.length !== 1 || config.config.members[0].host !== 'mongodb:27017') {
        throw new Error('REPLICA_SET_INCOMPATIBLE');
      }
    } catch (error) {
      if (error.code !== 94) throw error;
      await admin.runCommand({ replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host: 'mongodb:27017' }] } });
    }
    let listo = false;
    for (let i = 0; i < 120; i += 1) {
      if ((await admin.runCommand({ hello: 1 })).isWritablePrimary) { listo = true; break; }
      await sleep(500);
    }
    if (!listo) throw new Error('REPLICA_SET_SIN_PRIMARY');
    globalThis.db = admin;
    await load('/workspace/Database/laboratorio_clinico_mongodb.js');
    const laboratorio = conexion.getDB('laboratorio_clinico');
    const protegidas = new Set(['auditoria', 'operaciones', 'revisiones']);
    const colecciones = (await laboratorio.getCollectionInfos()).map((c) => c.name).sort();
    const privilegios = colecciones.map((collection) => ({ resource: { db: 'laboratorio_clinico', collection },
      actions: protegidas.has(collection) ? ['find', 'insert'] : ['find', 'insert', 'update', 'remove'] }));
    privilegios.push({ resource: { db: 'laboratorio_clinico', collection: '' }, actions: ['listCollections', 'listIndexes'] });
    const rol = await laboratorio.getRole('laboratorio_aplicacion', { showPrivileges: true });
    const canonico = (valores) => JSON.stringify(valores.map((p) => ({ resource: { db: p.resource.db, collection: p.resource.collection }, actions: [...p.actions].sort() }))
      .sort((a, b) => a.resource.collection.localeCompare(b.resource.collection)));
    if (!rol) await laboratorio.createRole({ role: 'laboratorio_aplicacion', privileges: privilegios, roles: [] });
    else if (rol.roles.length || canonico(rol.privileges) !== canonico(privilegios)) throw new Error('ROL_APLICACION_INCOMPATIBLE');
    const usuario = await laboratorio.getUser('laboratorio_app');
    if (!usuario) {
      await laboratorio.createUser({ user: 'laboratorio_app', pwd: fs.readFileSync('/run/secrets/mongo_app_password', 'utf8').trim(),
        roles: [{ role: 'laboratorio_aplicacion', db: 'laboratorio_clinico' }] });
    } else if (usuario.roles.length !== 1 || usuario.roles[0].role !== 'laboratorio_aplicacion' || usuario.roles[0].db !== 'laboratorio_clinico') {
      throw new Error('USUARIO_APLICACION_INCOMPATIBLE');
    }
    const aplicacion = new Mongo('mongodb://mongodb:27017/?directConnection=true');
    await aplicacion.getDB('laboratorio_clinico').auth('laboratorio_app', fs.readFileSync('/run/secrets/mongo_app_password', 'utf8').trim());
    if ((await aplicacion.getDB('laboratorio_clinico').getCollectionInfos()).length !== 27) throw new Error('MODELO_INCOMPLETO');
    print('PASS: replica set rs0, 27 colecciones y usuario de aplicacion preparados.');
  } catch (error) {
    print(`BOOTSTRAP_MONGO_ERROR: ${error.codeName || error.message || 'DESCONOCIDO'}`);
    quit(1);
  }
})();
