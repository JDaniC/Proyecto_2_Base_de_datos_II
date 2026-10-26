import type { CuentaAutorizada } from '../../../aplicacion/puertos/contexto-autenticado.js';
import type { RepositorioCuenta } from '../../../aplicacion/puertos/repositorio-cuenta.js';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import type { ClienteFirestore } from '../firestore/tipos-firestore.js';
import { crearRepositorioCuentaFirestore } from '../firestore/repositorio-cuenta-firestore.js';
import type { DocumentoUsuarioFirestore } from '../firestore/mapear-cuenta-firestore.js';
import type { Version } from '../../../dominio/compartido/version.js';
import type { AuditoriaActivacionCuenta } from '../../../aplicacion/puertos/repositorio-cuenta.js';
import { validarDocumento } from '../firestore/validador-firestore.js';

export function crearRepositorioCuentaInstitucionalFirestore(cliente: ClienteFirestore): RepositorioCuenta {
  return Object.freeze({
    porUid(uid: string): Promise<CuentaAutorizada | null> {
      return cliente.firestore.runTransaction((transaccion) =>
        crearRepositorioCuentaFirestore(transaccion, cliente.firestore).porUid(uid));
    },
    activarPendiente(uid: string, versionEsperada: Version, auditoria: AuditoriaActivacionCuenta): Promise<boolean> {
      return cliente.firestore.runTransaction(async (transaccion) => {
        const consulta = cliente.firestore.collection('usuarios').where('auth_uid', '==', uid);
        const snapshot = await transaccion.get(consulta);
        if (snapshot.empty) return false;
        if (snapshot.docs.length !== 1 || snapshot.docs[0] === undefined) {
          throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'La cuenta Firebase tiene un vínculo local ambiguo.');
        }
        const documento = snapshot.docs[0];
        const cuenta = documento.data() as DocumentoUsuarioFirestore;
        if (cuenta.institucion_id !== 'CENTRO_MEDICO_PEDIATRICO' || cuenta.proveedor_identidad !== 'FIREBASE') {
          return false;
        }
        if (cuenta.estado === 'ACTIVO') return true;
        const revision = numeroRevision(cuenta.revision);
        if (cuenta.estado !== 'PENDIENTE' || revision !== versionEsperada || !Number.isSafeInteger(revision + 1)) {
          return false;
        }
        const actor = await crearRepositorioCuentaFirestore(transaccion, cliente.firestore).porUid(auditoria.actorUid);
        validarActorProvision(actor, auditoria);
        if (documento.id !== auditoria.evento.recursoId) {
          throw new ErrorDominio('SIN_PERMISO', 'El recurso no corresponde a la cuenta pendiente.');
        }
        transaccion.update(documento.ref, { estado: 'ACTIVO', revision: revision + 1 });
        const rutaAuditoria = `auditoria/${auditoria.evento.id}`;
        const datosAuditoria = validarDocumento(rutaAuditoria, {
          revision: 1,
          usuario_id: auditoria.evento.actorId,
          auth_uid: auditoria.actorUid,
          institucion_id: 'CENTRO_MEDICO_PEDIATRICO',
          fecha_hora: new Date(auditoria.evento.fechaHora),
          accion: auditoria.evento.caso,
          tipo_recurso: 'usuarios',
          recurso_id: auditoria.evento.recursoId,
          correlacion: auditoria.evento.correlacion,
        });
        transaccion.create(cliente.firestore.doc(rutaAuditoria), datosAuditoria as Record<string, unknown>);
        return true;
      });
    },
  });
}

function validarActorProvision(
  actor: CuentaAutorizada | null,
  auditoria: AuditoriaActivacionCuenta,
): asserts actor is CuentaAutorizada {
  if (!actor || actor.id !== auditoria.evento.actorId || actor.uid !== auditoria.actorUid ||
      actor.institucion !== 'CENTRO_MEDICO_PEDIATRICO' || actor.estado !== 'ACTIVA' ||
      !actor.roles.includes('ADMIN_INSTITUCIONAL') || !actor.permisos.includes('usuarios.administrar') ||
      auditoria.evento.caso !== 'CUENTA_PROVISIONADA') {
    throw new ErrorDominio('SIN_PERMISO', 'La cuenta administrativa no está vigente para esta operación.');
  }
}

function numeroRevision(valor: unknown): number {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && /^\d+$/.test(valor)) return Number(valor);
  return Number.NaN;
}
