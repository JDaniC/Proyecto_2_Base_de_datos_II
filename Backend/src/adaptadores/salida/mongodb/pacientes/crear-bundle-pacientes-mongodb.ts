import {crearConsultasLaboratorioMongodb} from '../laboratorio/consultar-recursos.js';
import {crearListadosLaboratorioMongodb} from '../laboratorio/listar-recursos.js';
import {crearLectoresReferenciasMongodb} from '../laboratorio/leer-referencias.js';
import type {OrdenLaboratorio} from '../../../../dominio/laboratorio/ordenes.js';
import {crearLectorOrdenMongodb} from '../laboratorio/leer-orden.js';
import {crearLectorMuestraMongodb} from '../laboratorio/leer-muestra.js';
import {aplicarCambiosLaboratorio} from '../laboratorio/aplicar-cambios.js';
import type {Muestra} from '../../../../dominio/laboratorio/muestras.js';
import type {ResultadoLaboratorio} from '../../../../dominio/laboratorio/resultados/resultado.js';
import {crearLectorResultadoMongodb} from '../laboratorio/leer-resultado.js';
import { crearClinicaMongodb, aplicarCambiosClinicosMongodb } from '../consultas/clinica-mongodb.js';
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
  const originalesOrdenes = new WeakMap<ClientSession,Map<string,OrdenLaboratorio>>();
  const originalesMuestras = new WeakMap<ClientSession, Map<string,Muestra>>();
  const originalesResultados = new WeakMap<ClientSession, Map<string,ResultadoLaboratorio>>();
  const uow = crearUnidadDeTrabajoMongodb({
    cliente,
    crearLector(db, session, usuarioId) {
      const cache = new Map<string, DocumentoPacienteMongo>();
      originales.set(session, cache);
      const lector = crearLectorPacientesMongodb(db, session, usuarioId, cache);
      const muestras=new Map<string,Muestra>();originalesMuestras.set(session,muestras);
      const resultados=new Map<string,ResultadoLaboratorio>();originalesResultados.set(session,resultados);
      const cacheOrdenes=new Map<string,OrdenLaboratorio>();originalesOrdenes.set(session,cacheOrdenes);
      const ordenes=crearLectorOrdenMongodb(db,session);const lectorMuestras=crearLectorMuestraMongodb(db,session);const lectorResultados=crearLectorResultadoMongodb(db,session);
      return {...lector,laboratorio:{...crearLectoresReferenciasMongodb(db,session),async ordenPorId(id){const o=await ordenes.porId(id);if(o)cacheOrdenes.set(id,o);return o;},async muestraPorId(id){const m=await lectorMuestras.porId(id);if(m)muestras.set(id,m);return m;},async resultadoPorId(id){const r=await lectorResultados.porId(id);if(r)resultados.set(id,r);return r;},async ultimoResultadoPorSerie(id){const r=await lectorResultados.ultimoPorSerie(id);if(r)resultados.set(r.id,r);return r;}}, clinica: crearClinicaMongodb(db, session, cache)};
    },
    async aplicarCambios(db, session, contexto, comando, cambios) {
      if(comando.caso.startsWith('laboratorio.'))return aplicarCambiosLaboratorio(db,session,contexto,comando,cambios,originalesMuestras.get(session)??new Map(),originales.get(session)??new Map(),originalesOrdenes.get(session)??new Map(),originalesResultados.get(session)??new Map());
      if (comando.caso.startsWith('consulta.')) return aplicarCambiosClinicosMongodb(db, session, contexto, comando, cambios, originales.get(session) ?? new Map());
      return aplicarCambiosPacientesMongodb(db, session, contexto, comando, cambios, originales.get(session) ?? new Map());
    },
  });
  return Object.freeze({
    consultasLaboratorio: crearConsultasLaboratorioMongodb(cliente.db),
    listadosLaboratorio: crearListadosLaboratorioMongodb(cliente.db),
    clinica: crearClinicaMongodb(cliente.db),
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
