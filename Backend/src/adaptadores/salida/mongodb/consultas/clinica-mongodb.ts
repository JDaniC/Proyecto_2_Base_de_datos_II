import { createHash } from 'node:crypto';
import { BSON, type ClientSession, type Db, type Document } from 'mongodb';
import type { PuertosClinicos } from '../../../../aplicacion/puertos/clinica.js';
import type { CambioPlanificado, ComandoEstable } from '../../../../aplicacion/puertos/nucleo.js';
import type { ContextoAutenticado } from '../../../../aplicacion/puertos/contexto-autenticado.js';
import type { Consulta, ProfesionalClinico } from '../../../../dominio/clinica/consulta.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { normalizarInstante } from '../../../../aplicacion/casos-uso/historiales/consultar-historial.js';
import { validarEventoHistorial } from '../../historial/proyeccion-historial.js';
import { crearHistorialMongodb } from '../../historial/historial-mongodb.js';
import { crearRepositorioPacientesMongodb } from '../pacientes/repositorio-pacientes-mongodb.js';
import { documentoConsulta, enteroBson, mapearConsulta, type DocumentoConsultaMongo } from './mapear-consulta-mongodb.js';
import type { DocumentoPacienteMongo } from '../pacientes/mapear-paciente-mongodb.js';

const huellaObjetivo = 'b78469fa37b07f32f5a95b7b8b1838369320f67fc014f12e3a316d114bf900c7';
export async function verificarClinicaMongodb(db: Db): Promise<void> {
  try {
    const info = (await db.listCollections({name: 'consultas_clinicas'}, {nameOnly: false}).toArray())[0];
    const canonico = (v: unknown): unknown => Array.isArray(v) ? v.map(canonico) : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort().map(k => [k,canonico((v as Record<string,unknown>)[k])])) : v;
    if (!info || info.options?.validationLevel !== 'strict' || info.options.validationAction !== 'error' ||
      createHash('sha256').update(JSON.stringify(canonico(info.options.validator))).digest('hex') !== huellaObjetivo) throw new Error();
    const manifiesto = await db.collection('historial_modelo').findOne({id: 5});
    if (!manifiesto || manifiesto.version !== 2 || manifiesto.estado !== 'LISTO' || manifiesto.huella !== huellaObjetivo) throw new Error();
    const indices = await db.collection('revisiones').listIndexes().toArray();
    if (!indices.some(i => i.unique && JSON.stringify(i.key) === JSON.stringify({tipo_recurso: 1, recurso_id: 1, version: 1}))) throw new Error();
    await crearHistorialMongodb(db).verificarPreparacion();
  } catch { throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'La clínica requiere migraciones 004/005 y esquema compatible.'); }
}
export function crearClinicaMongodb(db: Db, session?: ClientSession, originales = new Map<string, DocumentoPacienteMongo>()): PuertosClinicos {
  const opciones = session ? {session} : {};
  const preparar = async () => { if (!session) await verificarClinicaMongodb(db); };
  const consultas = db.collection<DocumentoConsultaMongo>('consultas_clinicas');
  const porId: PuertosClinicos['consultas']['porId'] = async id => {
    await preparar(); const doc = await consultas.findOne({_id: id}, opciones); return doc ? mapearConsulta(doc) : null;
  };
  const noAgenda = async (): Promise<never> => { throw new ErrorDominio('SIN_PERMISO', 'Laboratorio no dispone de agenda pública.'); };
  return {
    pacientes: crearRepositorioPacientesMongodb(db, session, originales),
    profesionales: {async porId(id) {
      await preparar();
      const doc = await db.collection<{_id: string} & Document>('solicitantes').findOne({_id: id}, opciones);
      if (!doc) return null;
      return {id: uuidPublico(doc._id), nombre: doc.nombre_completo, rol: 'MEDICO_LABORATORIO', activo: doc.activo === true,
        tipo: doc.tipo === 'MEDICO' ? 'INDIVIDUAL' : 'INSTITUCIONAL', colegiado: doc.numero_colegiado ?? '', entidad_colegiacion: doc.entidad_colegiacion ?? ''} as ProfesionalClinico;
    }},
    consultas: {porId,
      async porVersion(id, version) {
        const actual = await porId(id);
        if (!actual || actual.version === version) return actual;
        const r = await db.collection('revisiones').findOne({tipo_recurso: 'consultas', recurso_id: id, version}, opciones);
        const c = r?.contenido_anterior as Consulta | undefined;
        if (!c) return null;
        if (c.id !== id || c.version !== version || c.paciente_id !== actual.paciente_id) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'La revisión clínica es incompatible.');
        return c;
      },
      async porCita(id) {await preparar(); const doc = await consultas.findOne({cita_id: id}, opciones); return doc ? mapearConsulta(doc) : null;},
    },
    citas: {porId: noAgenda, listar: noAgenda, solapamientos: noAgenda}, responsables: {autorizacion: noAgenda},
  };
}
export async function aplicarCambiosClinicosMongodb(db: Db, session: ClientSession, contexto: ContextoAutenticado,
  comando: ComandoEstable, cambios: readonly CambioPlanificado[], originales: ReadonlyMap<string, DocumentoPacienteMongo>): Promise<void> {
  const consultaCambio = cambios.find(c => c.agregado === 'consultas');
  const c = consultaCambio?.nuevoEstado as Consulta | undefined;
  if (!c || cambios.filter(x => x.agregado === 'consultas').length !== 1 || c.profesional.id !== contexto.cuenta.profesional?.id || !comando.caso.startsWith('consulta.')) {
    throw new ErrorDominio('ESTADO_INVALIDO', 'Plan clínico incompatible.');
  }
  const paciente = originales.get(c.paciente_id);
  if (!paciente || paciente.historial.estado !== 'ACTIVO' && consultaCambio!.versionAnterior === null) throw new ErrorDominio('ESTADO_INVALIDO', 'El historial no permite una nueva atención.');
  for (const cambio of cambios) {
    if (cambio.agregado === 'consultas' && cambio.tipo === 'GUARDAR') {
      const coleccion = db.collection<DocumentoConsultaMongo>('consultas_clinicas');
      const anterior = cambio.versionAnterior === null ? null : await coleccion.findOne({_id: c.id, revision: cambio.versionAnterior}, {session});
      if (cambio.versionAnterior !== null && !anterior) throw new ErrorDominio('VERSION_DESACTUALIZADA', 'La consulta cambió.');
      if (anterior && (anterior.paciente_id !== c.paciente_id || anterior.solicitante_medico_id !== c.profesional.id ||
        anterior.historial_id !== paciente.historial.id_historial || anterior.fecha_hora.toISOString() !== c.fecha_hora)) throw new ErrorDominio('ESTADO_INVALIDO', 'Referencias clínicas inmutables.');
      const doc = documentoConsulta(c, paciente.historial.id_historial, contexto.cuenta.id, anterior ?? undefined);
      if (BSON.calculateObjectSize(doc) > 262144) throw new ErrorDominio('LIMITE_AGREGADO', 'El documento excede el límite de tamaño.');
      if (c.version !== (cambio.versionAnterior ?? 0) + 1) throw new ErrorDominio('VERSION_DESACTUALIZADA', 'Versión clínica incompatible.');
      if (!anterior) await coleccion.insertOne(doc, {session});
      else if ((await coleccion.replaceOne({_id: c.id, revision: cambio.versionAnterior!}, doc, {session})).matchedCount !== 1) throw new ErrorDominio('VERSION_DESACTUALIZADA', 'La consulta cambió.');
    } else if (cambio.agregado === 'pacientes' && cambio.tipo === 'AVANZAR_REVISION') {
      if (cambio.recursoId !== paciente._id || Number(paciente.revision) !== cambio.versionAnterior) throw new ErrorDominio('VERSION_DESACTUALIZADA', 'El paciente cambió.');
      const r = await db.collection<DocumentoPacienteMongo>('pacientes').updateOne({_id: paciente._id, revision: paciente.revision},
        {$set: {revision: enteroBson(Number(paciente.revision) + 1) as number}}, {session});
      if (r.matchedCount !== 1) throw new ErrorDominio('VERSION_DESACTUALIZADA', 'El paciente cambió.');
    } else if (cambio.agregado === 'eventosHistorial' && cambio.tipo === 'CREAR') {
      const {pacienteId, ...entrada} = cambio.nuevoEstado as Record<string, unknown>;
      const evento = validarEventoHistorial(entrada, 'LABORATORIO_CLINICO');
      if (pacienteId !== c.paciente_id || evento.consultaId !== c.id || evento.versionConsulta !== c.version) throw new ErrorDominio('ESTADO_INVALIDO', 'Evento clínico incompatible.');
      await db.collection<{_id: string} & Document>('historial_eventos').insertOne({_id: evento.id, paciente_id: pacienteId,
        tipo: evento.tipo, fecha_hora: normalizarInstante(evento.fechaHora), contenido: evento}, {session});
    } else throw new ErrorDominio('ESTADO_INVALIDO', 'Cambio clínico no admitido.');
  }
}
