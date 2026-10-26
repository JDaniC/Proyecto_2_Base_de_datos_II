import type { RepositorioCuenta } from '../../../aplicacion/puertos/nucleo.js';
import type { CuentaAutorizada } from '../../../aplicacion/puertos/contexto-autenticado.js';
import type { Firestore, Transaction, DocumentReference, DocumentSnapshot } from 'firebase-admin/firestore';
import {
  mapearCuentaFirestore,
  type DocumentoUsuarioFirestore,
  type DocumentoRolFirestore,
  type DocumentoPediatraFirestore,
} from './mapear-cuenta-firestore.js';

export function crearRepositorioCuentaFirestore(
  ejecutor: Firestore | Transaction,
  firestore: Firestore,
): RepositorioCuenta<CuentaAutorizada> {
  const esTransaccion = 'get' in ejecutor && typeof (ejecutor as Transaction).get === 'function' &&
    'set' in ejecutor && 'create' in ejecutor;

  async function obtenerDoc(ref: DocumentReference): Promise<DocumentSnapshot> {
    if (esTransaccion) {
      return (ejecutor as Transaction).get(ref);
    }
    return ref.get();
  }

  return {
    async porUid(uidVerificado: string): Promise<CuentaAutorizada | null> {
      // En Firestore las queries en transacción usan transaction.get(query)
      const query = firestore.collection('usuarios').where('auth_uid', '==', uidVerificado).limit(1);
      const snapshot = esTransaccion
        ? await (ejecutor as Transaction).get(query)
        : await query.get();

      if (snapshot.empty || snapshot.docs[0] === undefined) return null;

      const docUsuario = snapshot.docs[0];
      const datosUsuario = docUsuario.data() as DocumentoUsuarioFirestore;

      const roles: DocumentoRolFirestore[] = [];
      if (Array.isArray(datosUsuario.rol_ids)) {
        for (const rolId of datosUsuario.rol_ids) {
          if (typeof rolId === 'string') {
            const docRol = await obtenerDoc(firestore.doc(`roles/${rolId}`));
            if (docRol.exists) {
              roles.push(docRol.data() as DocumentoRolFirestore);
            }
          }
        }
      }

      let pediatra: DocumentoPediatraFirestore | null = null;
      if (typeof datosUsuario.pediatra_id === 'string') {
        const docPediatra = await obtenerDoc(firestore.doc(`pediatras/${datosUsuario.pediatra_id}`));
        if (docPediatra.exists) {
          pediatra = docPediatra.data() as DocumentoPediatraFirestore;
        }
      }

      return mapearCuentaFirestore(docUsuario.id, datosUsuario, roles, pediatra);
    },
  };
}
