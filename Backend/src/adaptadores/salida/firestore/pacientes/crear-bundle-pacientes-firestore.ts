import { crearHistorialFirestore } from '../../historial/historial-firestore.js';
import type { ClienteFirestore } from '../tipos-firestore.js';
import { INSTITUCION_PEDIATRIA } from '../tipos-firestore.js';
import type { LectorTransaccional, UnidadDeTrabajo } from '../../../../aplicacion/puertos/nucleo.js';
import type { RepositorioPacienteLectura } from '../../../../aplicacion/puertos/repositorio-paciente.js';
import type { BundleInstitucional } from '../../../../aplicacion/puertos/bundle-institucional.js';
import type { RepositorioCuenta } from '../../../../aplicacion/puertos/repositorio-cuenta.js';
import type { UUID } from '../../../../dominio/compartido/uuid.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import { claveOperacion } from '../validador-firestore.js';
import {
  crearUnidadDeTrabajoFirestore,
  desempaquetarRespuestaOperacion,
  type DatosOperacionFirestore,
} from '../unidad-de-trabajo-firestore.js';
import { crearRepositorioCuentaFirestore } from '../repositorio-cuenta-firestore.js';
import { crearRepositorioCuentaInstitucionalFirestore } from '../../identidad/repositorio-cuenta-firestore-institucional.js';
import { RepositorioPacientesFirestore } from './repositorio-pacientes-firestore.js';
import { aplicarCambiosPacientesFirestore } from './aplicar-cambios-pacientes-firestore.js';

export function crearRepositorioPacientesFirestore(cliente: ClienteFirestore): RepositorioPacienteLectura {
  return new RepositorioPacientesFirestore(cliente.firestore, cliente.firestore);
}

export function crearUnidadDeTrabajoPacientesFirestore(cliente: ClienteFirestore): UnidadDeTrabajo {
  return crearUnidadDeTrabajoFirestore({
    cliente,
    crearLector: (transaction, usuarioId) => {
      const repoPacientes = new RepositorioPacientesFirestore(transaction, cliente.firestore);
      const repoCuenta = crearRepositorioCuentaFirestore(transaction, cliente.firestore);
      const noDisponible = async (): Promise<never> => {
        throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'La lectura solicitada no está disponible.');
      };

      return {
        cuentas: repoCuenta,
        pacientes: repoPacientes,
        identidades: {
          titular: (ident: { tipo: string; numero: string }) => repoPacientes.titularIdentidad(ident),
        },
        responsables: {
          porId: (id: UUID) => repoPacientes.porIdResponsable(id),
          porPaciente: async (pacienteId: UUID) => repoPacientes.porPacienteResponsables(pacienteId),
        },
        operaciones: {
          async porClave<T>(actor: UUID, caso: string, clave: UUID) {
            if (actor !== usuarioId) throw new ErrorDominio('SIN_PERMISO', 'El actor no corresponde a la operación.');
            const claveOp = claveOperacion(
              INSTITUCION_PEDIATRIA,
              actor,
              caso,
              clave,
            );
            const ref = cliente.firestore.doc(`operaciones/${claveOp}`);
            const snap = await transaction.get(ref);
            if (!snap.exists) return null;
            const datos = snap.data() as DatosOperacionFirestore;
            return {
              hashEntrada: datos.hash_entrada,
              resultado: {
                httpStatus: datos.codigo_respuesta,
                respuesta: desempaquetarRespuestaOperacion<T>(datos.respuesta),
                correlacionOriginal: uuidPublico(datos.respuesta.meta.correlacion),
              },
            };
          },
        },
        profesionales: { porId: noDisponible },
        citas: { porId: noDisponible },
        consultas: { porId: noDisponible, porVersion: noDisponible },
        historial: { eventos: noDisponible },
      } as unknown as LectorTransaccional;
    },
    aplicarCambios: (transaction, contexto, comando, cambios) =>
      aplicarCambiosPacientesFirestore(transaction, cliente.firestore, contexto, comando, cambios),
  });
}

export function crearBundlePacientesFirestore(cliente: ClienteFirestore): BundleInstitucional & { cuenta: RepositorioCuenta } {
  return Object.freeze({
    institucion: 'CENTRO_MEDICO_PEDIATRICO',
    estadoPersistencia: 'DISPONIBLE', historial: crearHistorialFirestore(cliente.firestore),
    cuenta: crearRepositorioCuentaInstitucionalFirestore(cliente),
    pacientes: crearRepositorioPacientesFirestore(cliente),
    uow: crearUnidadDeTrabajoPacientesFirestore(cliente),
  });
}
