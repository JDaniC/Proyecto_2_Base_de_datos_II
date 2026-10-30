import type { AppointmentRepository } from '../../contracts';
import type { CitaAgenda, InstitucionId } from '../../types';
import { HttpClient } from '../httpClient';
import { HttpError } from '../errors';
interface CitaDto {id: string; paciente_id: string; profesional_id: string; fecha: string; hora_inicio: string; hora_fin: string | null; duracion_minutos: number | null; motivo: string; consultorio?: string; estado: CitaAgenda['estado']; motivo_cancelacion?: string; fecha_creacion: string; version: number}
function mapear(c: CitaDto, institucionId: InstitucionId): CitaAgenda {return {id: c.id, institucionId, pacienteId: c.paciente_id, pacienteNombre: c.paciente_id, pacienteCodigo: c.paciente_id, profesionalId: c.profesional_id, profesionalNombre: c.profesional_id, profesionalRol: '', fecha: c.fecha, horaInicio: c.hora_inicio, horaFin: c.hora_fin ?? '', duracionMinutos: c.duracion_minutos ?? 0, motivo: c.motivo, consultorio: c.consultorio ?? '', estado: c.estado, motivoCancelacion: c.motivo_cancelacion, fechaCreacion: c.fecha_creacion, version: c.version};}
export function createHttpAppointmentRepository(http: HttpClient): AppointmentRepository {
  const path = (id: string) => `/citas/${encodeURIComponent(id)}`;
  const pendiente = async (): Promise<CitaAgenda> => { throw new HttpError({status: 501, codigo: 'NOT_IMPLEMENTED', mensaje: 'La gestión de agenda todavía no está integrada.'}); };
  return {
    async obtenerCitas(i,q) {
      // La agenda de presentación usa fin inclusivo; el contrato HTTP usa [desde,hasta).
      const [year, month, day] = q.fechaHasta.split('-').map(Number);
      const hasta = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
      const r = await http.get<CitaDto[]>('/citas', {query: {fecha_desde: q.fechaDesde, fecha_hasta: hasta, profesional_id: q.profesionalId === 'TODOS' ? undefined : q.profesionalId, estado: q.estado === 'TODOS' ? undefined : q.estado, q: q.q, limite: 100}});
      if (r.meta.siguiente_cursor) throw new HttpError({status: 400, codigo: 'RANGO_AMPLIO', mensaje: 'Reduce el rango de fechas para mostrar todas las citas.'});
      return r.data.map(c => mapear(c,i));
    },
    async obtenerPorId(i,id) {try{return mapear((await http.get<CitaDto>(path(id))).data,i);}catch(e){if(e instanceof HttpError && e.status === 404)return null; throw e;}},
    crear: pendiente,
    reprogramar: pendiente,
    cancelar: pendiente,
  };
}
