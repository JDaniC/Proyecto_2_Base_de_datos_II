import type { RepositorioCuenta } from '../../../aplicacion/puertos/repositorio-cuenta.js';
import type { CuentaAutorizada } from '../../../aplicacion/puertos/contexto-autenticado.js';
import type { ClienteMongodb } from '../mongodb/tipos-mongodb.js';
import { COLECCIONES_MONGODB } from '../mongodb/tipos-mongodb.js';
import { crearRepositorioCuentaMongodb } from '../mongodb/repositorio-cuenta-mongodb.js';
import type { DocumentoUsuarioMongo } from '../mongodb/mapear-cuenta-mongodb.js';
import type { Version } from '../../../dominio/compartido/version.js';

export function crearRepositorioCuentaInstitucionalMongodb(cliente: ClienteMongodb): RepositorioCuenta {
  return Object.freeze({
    async porUid(uid: string): Promise<CuentaAutorizada | null> {
      const session = cliente.iniciarSesion();
      try {
        let resultado: CuentaAutorizada | null = null;
        await session.withTransaction(async () => {
          resultado = null;
          resultado = await crearRepositorioCuentaMongodb(cliente.db, session).porUid(uid);
        });
        return resultado;
      } finally {
        await session.endSession();
      }
    },
    async activarPendiente(uid: string, versionEsperada: Version): Promise<boolean> {
      if (!Number.isSafeInteger(Number(versionEsperada) + 1)) return false;
      const session = cliente.iniciarSesion();
      try {
        let activada = false;
        await session.withTransaction(async () => {
          activada = false;
          const usuarios = cliente.db.collection<DocumentoUsuarioMongo>(COLECCIONES_MONGODB.USUARIOS);
          const usuario = await usuarios.findOne({
            auth_uid: uid,
            institucion_id: 'LABORATORIO_CLINICO',
          }, { session });
          if (!usuario) return;
          if (usuario.estado === 'ACTIVO') { activada = true; return; }
          if (usuario.estado !== 'PENDIENTE' || Number(usuario.revision) !== versionEsperada) return;
          const cambio = await usuarios.updateOne(
            { _id: usuario._id, estado: 'PENDIENTE', revision: usuario.revision },
            { $set: { estado: 'ACTIVO', activo: true }, $inc: { revision: 1 } },
            { session },
          );
          activada = cambio.modifiedCount === 1;
        });
        return activada;
      } finally {
        await session.endSession();
      }
    },
  });
}
