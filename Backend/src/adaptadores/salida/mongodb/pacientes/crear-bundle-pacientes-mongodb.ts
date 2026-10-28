import { crearHistorialMongodb } from '../../historial/historial-mongodb.js';
import type { ClientSession, Db } from 'mongodb';
import type { BundleInstitucional } from '../../../../aplicacion/puertos/bundle-institucional.js';
import type { RepositorioCuenta } from '../../../../aplicacion/puertos/repositorio-cuenta.js';
import type { UUID } from '../../../../dominio/compartido/uuid.js';
import type { LectorTransaccional } from '../../../../aplicacion/puertos/nucleo.js';
import type { Paciente } from '../../../../dominio/clinica/paciente.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { crearRepositorioCuentaInstitucionalMongodb } from '../../identidad/repositorio-cuenta-mongodb-institucional.js';
import { crearRepositorioCuentaMongodb } from '../repositorio-cuenta-mongodb.js';
import { crearUnidadDeTrabajoMongodb, desempaquetarRespuestaOperacion } from '../unidad-de-trabajo-mongodb.js';
import type { ClienteMongodb, DocumentoOperacionMongo, DocumentoRevisionMongo } from '../tipos-mongodb.js';
import { aplicarCambiosPacientesMongodb } from './aplicar-cambios-pacientes-mongodb.js';
import { crearRepositorioPacientesMongodb } from './repositorio-pacientes-mongodb.js';
import { identidadMongo, type DocumentoPacienteMongo } from './mapear-paciente-mongodb.js';

export async function crearBundlePacientesMongodb(cliente: ClienteMongodb): Promise<BundleInstitucional & {cuenta: RepositorioCuenta}> {
  try {
    await cliente.verificarReplicaSet();
    const indices = await cliente.db.collection('pacientes').listIndexes().toArray();
    for (const [name, key] of [
      ['ix_paciente_prefijos', {claves_nombre: 1, fecha_registro: 1, _id: 1}],
      ['ix_paciente_numero_busqueda', {numero_busqueda: 1, fecha_registro: 1, _id: 1}],
    ] as const) {
      if (!indices.some((i) => i.name === name && JSON.stringify(i.key) === JSON.stringify(key))) throw new Error();
    }
    const reservas = await cliente.db.collection('identidades_paciente').listIndexes().toArray();
    if (!reservas.some((i) => i.unique === true && JSON.stringify(i.key) === JSON.stringify({tipo_documento: 1, numero_documento: 1}))) throw new Error();
    if (await cliente.db.collection('pacientes').findOne({$or: [
      {claves_nombre: {$exists: false}},
      {tipo_documento: {$exists: true}, numero_busqueda: {$exists: false}},
    ]}, {projection: {_id: 1}, maxTimeMS: 3000})) throw new Error();
  } catch { throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'La persistencia de pacientes requiere preparación compatible.'); }

  const originales = new WeakMap<ClientSession, Map<string, DocumentoPacienteMongo>>();
  const uow = crearUnidadDeTrabajoMongodb({
    cliente,
    crearLector(db, session, usuarioId) {
      const cache = new Map<string, DocumentoPacienteMongo>();
      originales.set(session, cache);
      return crearLectorPacientesMongodb(db, session, usuarioId, cache);
    },
    aplicarCambios(db, session, contexto, comando, cambios) {
      return aplicarCambiosPacientesMongodb(db, session, contexto, comando, cambios, originales.get(session) ?? new Map());
    },
  });
  return Object.freeze({
    institucion: 'LABORATORIO_CLINICO', estadoPersistencia: 'DISPONIBLE', historial: crearHistorialMongodb(cliente.db),
    cuenta: crearRepositorioCuentaInstitucionalMongodb(cliente), pacientes: crearRepositorioPacientesMongodb(cliente.db), uow,
  });
}

function crearLectorPacientesMongodb(
  db: Db, session: ClientSession, actorId: string, originales: Map<string, DocumentoPacienteMongo>,
): LectorTransaccional {
  const pacientes = crearRepositorioPacientesMongodb(db, session, originales);
  const noDisponible = async (): Promise<never> => { throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'La lectura solicitada no está disponible.'); };
  return {
    cuentas: crearRepositorioCuentaMongodb(db, session),
    pacientes: {
      porId: (id) => pacientes.porId(id),
      async porVersion(id, version) {
        const actual = await pacientes.porId(id);
        if (actual?.version === version) return actual;
        const previa = await db.collection<DocumentoRevisionMongo>('revisiones').findOne({tipo_recurso: 'pacientes', recurso_id: id, version}, {session});
        const p = previa?.contenido_anterior as Paciente | undefined;
        return p && p.id === id && p.version === version ? p : null;
      },
    },
    identidades: {
      async titular(id) {
        const reserva = await db.collection<{_id: string; paciente_id: string}>('identidades_paciente').findOne(identidadMongo(id.tipo, id.numero), {session});
        return reserva ? uuidPublico(reserva.paciente_id) : null;
      },
    },
    operaciones: {
      async porClave<T>(actor: UUID, caso: string, clave: UUID) {
        if (actor !== actorId) throw new ErrorDominio('SIN_PERMISO', 'El actor no corresponde a la operación.');
        const op = await db.collection<DocumentoOperacionMongo>('operaciones').findOne({institucion_id: 'LABORATORIO_CLINICO', usuario_id: actor, caso_uso: caso, clave}, {session});
        return op ? {hashEntrada: op.hash_entrada, resultado: {
          httpStatus: op.codigo_respuesta, respuesta: desempaquetarRespuestaOperacion<T>(op.respuesta),
          correlacionOriginal: uuidPublico(op.respuesta.meta.correlacion),
        }} : null;
      },
    },
    citas: {porId: noDisponible}, consultas: {porId: noDisponible, porVersion: noDisponible},
    responsables: {porId: noDisponible, porPaciente: noDisponible}, profesionales: {porId: noDisponible}, historial: {eventos: noDisponible},
  };
}
