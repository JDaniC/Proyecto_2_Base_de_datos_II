import type { RepositorioCuenta } from '../../../aplicacion/puertos/repositorio-cuenta.js';
import type { CuentaAutorizada } from '../../../aplicacion/puertos/contexto-autenticado.js';
import type { ClienteMongodb } from '../mongodb/tipos-mongodb.js';
import { COLECCIONES_MONGODB } from '../mongodb/tipos-mongodb.js';
import { crearRepositorioCuentaMongodb } from '../mongodb/repositorio-cuenta-mongodb.js';
import type { DocumentoUsuarioMongo } from '../mongodb/mapear-cuenta-mongodb.js';
import type { Version } from '../../../dominio/compartido/version.js';
import type { AuditoriaActivacionCuenta } from '../../../aplicacion/puertos/repositorio-cuenta.js';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import type { DocumentoAuditoriaMongo } from '../mongodb/tipos-mongodb.js';

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
    async activarPendiente(uid: string, versionEsperada: Version, auditoria: AuditoriaActivacionCuenta): Promise<boolean> {
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
          const actor = await crearRepositorioCuentaMongodb(cliente.db, session).porUid(auditoria.actorUid);
          validarActorProvision(actor, auditoria);
          if (String(usuario._id) !== auditoria.evento.recursoId) {
            throw new ErrorDominio('SIN_PERMISO', 'El recurso no corresponde a la cuenta pendiente.');
          }
          const cambio = await usuarios.updateOne(
            { _id: usuario._id, estado: 'PENDIENTE', revision: usuario.revision },
            { $set: { estado: 'ACTIVO', activo: true }, $inc: { revision: 1 } },
            { session },
          );
          activada = cambio.modifiedCount === 1;
          if (activada) {
            await cliente.db.collection<DocumentoAuditoriaMongo>(COLECCIONES_MONGODB.AUDITORIA).insertOne({
              _id: auditoria.evento.id,
              revision: 1,
              usuario_id: auditoria.evento.actorId,
              auth_uid: auditoria.actorUid,
              institucion_id: 'LABORATORIO_CLINICO',
              fecha_hora: new Date(auditoria.evento.fechaHora),
              accion: auditoria.evento.caso,
              coleccion: 'usuarios',
              documento_id: auditoria.evento.recursoId,
              correlacion: auditoria.evento.correlacion,
            }, { session });
          }
        });
        return activada;
      } finally {
        await session.endSession();
      }
    },
  });
}

function validarActorProvision(
  actor: CuentaAutorizada | null,
  auditoria: AuditoriaActivacionCuenta,
): asserts actor is CuentaAutorizada {
  if (!actor || actor.id !== auditoria.evento.actorId || actor.uid !== auditoria.actorUid ||
      actor.institucion !== 'LABORATORIO_CLINICO' || actor.estado !== 'ACTIVA' ||
      !actor.roles.includes('ADMIN_INSTITUCIONAL') || !actor.permisos.includes('usuarios.administrar') ||
      auditoria.evento.caso !== 'CUENTA_PROVISIONADA') {
    throw new ErrorDominio('SIN_PERMISO', 'La cuenta administrativa no está vigente para esta operación.');
  }
}
