import { readFileSync } from 'node:fs';
import { MongoClient, type ClientSession, type Db } from 'mongodb';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import type { ConfiguracionMongodb } from '../../../configuracion/conexiones-mongodb.js';
import type { ClienteMongodb } from './tipos-mongodb.js';

export async function crearClienteMongodb(config: ConfiguracionMongodb): Promise<ClienteMongodb> {
  let password = '';
  try {
    password = readFileSync(config.archivoContrasena, 'utf8').trim();
  } catch (_error) {
    throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible leer la contraseña de MongoDB.');
  }

  const hostYPuerto = `${config.host}:${config.puerto}`;
  const directParam = config.conexionDirecta ? '&directConnection=true' : '';
  const uri = `mongodb://${encodeURIComponent(config.usuario)}:${encodeURIComponent(password)}@${hostYPuerto}/${config.baseDatos}?replicaSet=${encodeURIComponent(config.replicaSet)}&authSource=${config.baseDatos}&serverSelectionTimeoutMS=${config.timeoutMs}${directParam}`;

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: config.timeoutMs,
    connectTimeoutMS: config.timeoutMs,
  });

  const db: Db = client.db(config.baseDatos);

  const verificarReplicaSet = async (): Promise<void> => {
    try {
      const topologia = await client.db('admin').command({ hello: 1 });
      if (!topologia.setName && topologia.msg !== 'isdbgrid') {
        throw new ErrorDominio(
          'PERSISTENCIA_NO_DISPONIBLE',
          'Se requiere replica set o cluster transaccional en MongoDB; no se inicializa sobre standalone.',
        );
      }
    } catch (error) {
      if (error instanceof ErrorDominio) throw error;
      throw new ErrorDominio(
        'PERSISTENCIA_NO_DISPONIBLE',
        'No fue posible verificar la topología de réplica set de MongoDB.',
      );
    }
  };

  const iniciarSesion = (): ClientSession => client.startSession();

  const cerrar = async (): Promise<void> => {
    await client.close();
  };

  return Object.freeze({
    client,
    db,
    verificarReplicaSet,
    iniciarSesion,
    cerrar,
  });
}
