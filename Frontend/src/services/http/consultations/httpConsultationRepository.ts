import type { ConsultationRepository } from '../../contracts';
import type { DetalleConsultaCompleta, InstitucionId, RegistroConsultaCompletaDTO, SignosVitales } from '../../types';
import { HttpClient } from '../httpClient';
import { HttpError } from '../errors';

const signos = {pesoKg: 'peso_kg', tallaCm: 'talla_cm', temperaturaC: 'temperatura_c', presionSistolica: 'presion_sistolica', presionDiastolica: 'presion_diastolica', frecuenciaCardiacaLpm: 'frecuencia_cardiaca_lpm', frecuenciaRespiratoriaRpm: 'frecuencia_respiratoria_rpm', saturacionOxigenoPct: 'saturacion_oxigeno_pct', perimetroCefalicoCm: 'perimetro_cefalico_cm'} as const;
interface ConsultaDto {
  id: string; paciente_id: string; cita_id?: string; responsable_id?: string; fecha_hora: string; version: number;
  profesional: {nombre: string; rol: string}; estado: 'ABIERTA' | 'FINALIZADA'; motivo: string; sintomas: string; observaciones?: string;
  signos_vitales: Record<string, number | null>;
  diagnosticos: {id: string; codigo_cie: string; nombre: string; es_principal: boolean; observacion?: string; fecha_registro: string; registrado_por: {nombre: string}}[];
  tratamientos: {descripcion: string; indicaciones: string}[];
  receta?: {id: string; codigo_legible: string; fecha_emision: string; estado: 'EMITIDA'; prescriptor: {nombre: string; rol: string}; medicamentos: NonNullable<DetalleConsultaCompleta['receta']>['medicamentos']; observaciones?: string};
}
export function mapearConsulta(c: ConsultaDto, institucionId: InstitucionId): DetalleConsultaCompleta {
  return {id: c.id, pacienteId: c.paciente_id, institucionId, citaId: c.cita_id, responsableId: c.responsable_id,
    fechaHora: c.fecha_hora, motivo: c.motivo, sintomas: c.sintomas, observaciones: c.observaciones,
    profesionalNombre: c.profesional.nombre, profesionalRol: c.profesional.rol, estado: c.estado, revision: c.version, version: c.version,
    signosVitales: Object.fromEntries(Object.entries(signos).map(([k,v]) => [k,c.signos_vitales[v] ?? null])) as unknown as SignosVitales,
    diagnosticos: c.diagnosticos.map(d => ({id: d.id, codigoCIE: d.codigo_cie, nombre: d.nombre, esPrincipal: d.es_principal, observacion: d.observacion, fechaRegistro: d.fecha_registro, registradoPor: d.registrado_por.nombre})),
    tratamientos: c.tratamientos.map(t => ({descripcion: t.descripcion, indicaciones: t.indicaciones})),
    receta: c.receta && {id: c.receta.id, codigoReceta: c.receta.codigo_legible, fechaEmision: c.receta.fecha_emision, emitidaPor: c.receta.prescriptor.nombre, rolEmisor: c.receta.prescriptor.rol, estado: c.receta.estado, medicamentos: c.receta.medicamentos, observaciones: c.receta.observaciones}};
}
function contenido(d: Partial<RegistroConsultaCompletaDTO>, i: InstitucionId) {
  return {motivo: d.motivo, sintomas: d.sintomas, observaciones: d.observaciones,
    signos_vitales: Object.fromEntries(Object.entries(signos).filter(([k]) => (k !== 'perimetroCefalicoCm' || i === 'CENTRO_PEDIATRICO') && d.signosVitales?.[k as keyof SignosVitales] !== undefined).map(([k,v]) => [v,d.signosVitales![k as keyof SignosVitales]])),
    diagnosticos: d.diagnosticos?.map(x => ({codigo_cie: x.codigoCIE, nombre: x.nombre, es_principal: x.esPrincipal, ...(x.observacion === undefined ? {} : {observacion: x.observacion})})),
    tratamientos: d.tratamientos?.map(t => ({descripcion: t.descripcion, indicaciones: t.indicaciones})),
    receta: d.receta && {medicamentos: d.receta.medicamentos.map(m => ({nombre:m.nombre, presentacion:m.presentacion, concentracion:m.concentracion, dosis:[m.dosis,m.unidad].filter(Boolean).join(' '), frecuencia:m.frecuencia, duracion:m.duracion, via:m.via, indicaciones:m.indicaciones})), observaciones: d.receta.observaciones}};
}
export function createHttpConsultationRepository(http: HttpClient): ConsultationRepository {
  return {
    async registrarConsultaCompleta(i, d) {
      const body = {...contenido(d, i), paciente_id: d.pacienteId, version_paciente: d.versionPaciente,
        cita_id: d.citaId, version_cita: d.versionCita, responsable_id: d.responsableId, version_vinculo: d.versionVinculo};
      return mapearConsulta((await http.post<ConsultaDto>('/consultas/completas', body, {idempotencyKey: d.idempotencyKey})).data, i);
    },
    async obtenerPorId(i, paciente, id, version) {
      try {
        const c = mapearConsulta((await http.get<ConsultaDto>(`/consultas/${encodeURIComponent(id)}`, {query: {version}})).data, i);
        if (c.pacienteId !== paciente) throw new HttpError({status: 409, codigo: 'REFERENCIA_INCOMPATIBLE', mensaje: 'La consulta pertenece a otro paciente.'});
        return c;
      } catch(e) {if(e instanceof HttpError && e.status === 404) return null; throw e;}
    },
    async actualizarConsultaFinalizada(i, _p, id, d, motivo, _autor, version) {
      return mapearConsulta((await http.post<ConsultaDto>(`/consultas/${encodeURIComponent(id)}/correcciones`, {version_esperada: version, motivo_correccion: motivo, contenido: contenido(d, i)}, {idempotencyKey: d.idempotencyKey})).data, i);
    },
    async agregarProcedimiento() {throw new HttpError({status: 501, codigo: 'NOT_IMPLEMENTED', mensaje: 'Los procedimientos se habilitarán en su módulo.'});}
  };
}
