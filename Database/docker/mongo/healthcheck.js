// Salud del motor; el bootstrap completo lo confirma mongo-init (exit 0).
(async () => {
  try {
    const fs = require('node:fs');
    const conexion = new Mongo('mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000');
    const admin = conexion.getDB('admin');
    await admin.auth('mongo_admin', fs.readFileSync('/run/secrets/mongo_admin_password', 'utf8').trim());
    const respuesta = await admin.runCommand({ ping: 1 });
    if (respuesta.ok !== 1) quit(1);
    // El entrypoint usa un standalone temporal para crear al administrador.
    // No declararlo saludable hasta que arranque el proceso final con replica set.
    try { await admin.runCommand({ replSetGetStatus: 1 }); }
    catch (error) { if (error.code !== 94) throw error; }
  } catch (_) { quit(1); }
})();
