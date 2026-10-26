import type { RepositorioCuenta } from '../../../aplicacion/puertos/nucleo.js';
import type { CuentaAutorizada } from '../../../aplicacion/puertos/contexto-autenticado.js';
import type { ClientSession, Db } from 'mongodb';
import {
  mapearCuentaMongodb,
  type DocumentoSolicitanteMongo,
  type DocumentoRolMongo,
  type DocumentoUsuarioMongo,
} from './mapear-cuenta-mongodb.js';
import { COLECCIONES_MONGODB } from './tipos-mongodb.js';

export function crearRepositorioCuentaMongodb(
  db: Db,
  session?: ClientSession,
): RepositorioCuenta<CuentaAutorizada> {
  const options = session ? { session } : {};

  return {
    async porUid(uidVerificado: string): Promise<CuentaAutorizada | null> {
      const usuario = await db
        .collection<DocumentoUsuarioMongo>(COLECCIONES_MONGODB.USUARIOS)
        .findOne({ auth_uid: uidVerificado }, options);

      if (!usuario) return null;

      const idsRoles = Array.isArray(usuario.rol_ids)
        ? usuario.rol_ids.filter((r): r is string => typeof r === 'string')
        : [];

      const roles = idsRoles.length > 0
        ? await db
            .collection<DocumentoRolMongo>(COLECCIONES_MONGODB.ROLES)
            .find({ _id: { $in: idsRoles } }, options)
            .toArray()
        : [];

      let solicitante: DocumentoSolicitanteMongo | null = null;
      if (typeof usuario.solicitante_medico_id === 'string') {
        solicitante = await db
          .collection<DocumentoSolicitanteMongo>(COLECCIONES_MONGODB.SOLICITANTES)
          .findOne({ _id: usuario.solicitante_medico_id }, options);
      }

      return mapearCuentaMongodb(usuario, roles, solicitante);
    },
  };
}
