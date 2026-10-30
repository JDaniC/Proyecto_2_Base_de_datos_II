import { Decimal128, Long, type Document } from 'mongodb';
import type { Consulta, ProfesionalHistorico } from '../../../../dominio/clinica/consulta.js';
import { validarTamanoClinico } from '../../../../dominio/clinica/consulta.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../../dominio/compartido/version.js';
import { instanteUtc } from '../../../../dominio/compartido/instante-utc.js';

export interface DocumentoConsultaMongo extends Document {
  _id: string; revision: number; paciente_id: string; historial_id: string; solicitante_medico_id: string;
  registrado_por_id: string; fecha_hora: Date; motivo: string; sintomas?: string; observaciones?: string;
  estado: Consulta['estado']; profesional_historico?: ProfesionalHistorico; signos_vitales?: Document;
  diagnosticos: Document[]; tratamientos: Document[]; receta?: Document; cita_id?: string;
}
const fecha = (v: unknown) => instanteUtc((v as Date).toISOString());
export const enteroBson = (v: number) => v > 2_147_483_647 ? Long.fromNumber(v) : v;

/** Campos clínicos reales del modelo; no duplica la consulta en un JSON libre. */
export function documentoConsulta(c: Consulta, historialId: string, actorId: string, anterior?: DocumentoConsultaMongo): DocumentoConsultaMongo {
  validarTamanoClinico(c);
  if (c.cita_id || c.autorizacion || c.responsable_id) throw new ErrorDominio('ESTADO_INVALIDO', 'Referencia clínica incompatible con laboratorio.');
  const doc: DocumentoConsultaMongo = {
    ...(anterior ?? {}), _id: c.id, revision: enteroBson(c.version) as number, paciente_id: c.paciente_id,
    historial_id: historialId, solicitante_medico_id: c.profesional.id, registrado_por_id: anterior?.registrado_por_id ?? actorId,
    fecha_hora: new Date(c.fecha_hora), motivo: c.motivo, estado: c.estado,
    profesional_historico: c.profesional,
    signos_vitales: { fecha_hora_medicion: anterior?.signos_vitales?.fecha_hora_medicion ?? new Date(c.fecha_hora),
      ...Object.fromEntries(Object.entries(c.signos_vitales).map(([k,v]) => [k, v === null ? null : Decimal128.fromString(String(v))])) },
    diagnosticos: c.diagnosticos.map(d => ({ ...anterior?.diagnosticos.find(x => x.diagnostico_id === d.id), diagnostico_id: d.id, codigo: d.codigo_cie, nombre: d.nombre,
      es_principal: d.es_principal, ...(d.observacion?.trim() ? {observaciones: d.observacion} : {}),
      fecha_registro: new Date(d.fecha_registro), registrado_por: d.registrado_por })),
    tratamientos: c.tratamientos.map(t => ({...anterior?.tratamientos.find(x => x.tratamiento_id === t.id), tratamiento_id: t.id, nombre: t.descripcion, indicaciones: t.indicaciones,
      fecha_registro: new Date(t.fecha_registro), registrado_por: t.registrado_por})),
  };
  delete doc.sintomas; delete doc.observaciones; delete doc.receta;
  if (c.sintomas.trim()) doc.sintomas = c.sintomas;
  if (c.observaciones?.trim()) doc.observaciones = c.observaciones;
  if (c.receta) {
    const r = c.receta;
    doc.receta = {receta_id: r.id, codigo_legible: r.codigo_legible, version: enteroBson(r.version), estado: r.estado,
      fecha_emision: new Date(r.fecha_emision), prescriptor_id: r.prescriptor.id, prescriptor_nombre_historico: r.prescriptor.nombre,
      colegiado_historico: r.prescriptor.colegiado, entidad_colegiacion_historica: r.prescriptor.entidad_colegiacion,
      medicamentos: r.medicamentos.map(({id, ...m}) => ({medicamento_id: id, ...m})),
      ...(r.observaciones?.trim() ? {indicaciones_generales: r.observaciones} : {})};
  }
  return doc;
}

/** Legado sin procedencia histórica verificable se reconcilia, nunca se rellena desde perfiles actuales. */
export function mapearConsulta(doc: DocumentoConsultaMongo): Consulta {
  try {
    const p = doc.profesional_historico;
    if (!p || p.id !== doc.solicitante_medico_id || !p.entidad_colegiacion || p.rol !== 'MEDICO_LABORATORIO') throw new Error();
    const componente = (d: Document) => {
      if (!d.registrado_por || !d.fecha_registro) throw new Error();
      return {fecha_registro: fecha(d.fecha_registro), registrado_por: d.registrado_por as ProfesionalHistorico};
    };
    const r = doc.receta;
    if (r && (r.estado !== 'EMITIDA' || !r.codigo_legible || !r.entidad_colegiacion_historica)) throw new Error();
    const consulta: Consulta = {id: uuidPublico(doc._id), version: versionPositiva(Number(doc.revision)),
      paciente_id: uuidPublico(doc.paciente_id), fecha_hora: fecha(doc.fecha_hora), profesional: p, estado: doc.estado,
      motivo: doc.motivo, sintomas: doc.sintomas ?? '', ...(doc.observaciones ? {observaciones: doc.observaciones} : {}),
      ...(doc.cita_id ? {cita_id: uuidPublico(doc.cita_id)} : {}),
      signos_vitales: Object.fromEntries(Object.entries(doc.signos_vitales ?? {}).filter(([k]) => k !== 'fecha_hora_medicion')
        .map(([k,v]) => [k, v === null ? null : Number(String(v))])),
      diagnosticos: doc.diagnosticos.map(d => ({id: uuidPublico(d.diagnostico_id), codigo_cie: d.codigo, nombre: d.nombre,
        es_principal: d.es_principal, ...(d.observaciones ? {observacion: d.observaciones} : {}), ...componente(d)})),
      tratamientos: doc.tratamientos.map(t => ({id: uuidPublico(t.tratamiento_id), descripcion: t.nombre, indicaciones: t.indicaciones, ...componente(t)})),
      ...(r ? {receta: {id: uuidPublico(r.receta_id), codigo_legible: r.codigo_legible, version: versionPositiva(Number(r.version)), estado: 'EMITIDA' as const,
        fecha_emision: fecha(r.fecha_emision), prescriptor: {id: uuidPublico(r.prescriptor_id), nombre: r.prescriptor_nombre_historico,
          colegiado: r.colegiado_historico, entidad_colegiacion: r.entidad_colegiacion_historica, rol: 'MEDICO_LABORATORIO' as const},
        medicamentos: (r.medicamentos as Document[]).map(({medicamento_id, ...m}) => ({id: uuidPublico(medicamento_id), ...m})) as unknown as NonNullable<Consulta['receta']>['medicamentos'],
        ...(r.indicaciones_generales ? {observaciones: r.indicaciones_generales} : {})}} : {}),
    };
    return consulta;
  } catch { throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'La consulta requiere reconciliación de procedencia histórica.'); }
}
