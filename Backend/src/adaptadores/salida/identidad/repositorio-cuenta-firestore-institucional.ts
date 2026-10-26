import type { CuentaAutorizada } from '../../../aplicacion/puertos/contexto-autenticado.js';
import type { RepositorioCuenta } from '../../../aplicacion/puertos/repositorio-cuenta.js';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import type { ClienteFirestore } from '../firestore/tipos-firestore.js';
import { crearRepositorioCuentaFirestore } from '../firestore/repositorio-cuenta-firestore.js';
import type { DocumentoUsuarioFirestore } from '../firestore/mapear-cuenta-firestore.js';
import type { Version } from '../../../dominio/compartido/version.js';

export function crearRepositorioCuentaInstitucionalFirestore(cliente: ClienteFirestore): RepositorioCuenta {
  return Object.freeze({
    porUid(uid: string): Promise<CuentaAutorizada | null> {
      return cliente.firestore.runTransaction((transaccion) =>
        crearRepositorioCuentaFirestore(transaccion, cliente.firestore).porUid(uid));
    },
    activarPendiente(uid: string, versionEsperada: Version): Promise<boolean> {
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
        transaccion.update(documento.ref, { estado: 'ACTIVO', revision: revision + 1 });
        return true;
      });
    },
  });
}

function numeroRevision(valor: unknown): number {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && /^\d+$/.test(valor)) return Number(valor);
  return Number.NaN;
}
