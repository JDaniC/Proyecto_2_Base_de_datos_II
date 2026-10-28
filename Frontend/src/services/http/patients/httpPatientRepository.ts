import type { PatientRepository } from '../../contracts';
import type { ActualizarPacienteDTO, BuscarPacientesQuery, CrearPacienteDTO, FiltrosHistorial, InstitucionId } from '../../types';
import { HttpClient } from '../httpClient';
import { HttpError } from '../errors';
import type { ExpedienteDto, HistorialDto, PacienteDto } from './patientDtos';
import { mapearAlta, mapearCambio, mapearEvento, mapearPaciente } from './patientMapper';

export function createHttpPatientRepository(http: HttpClient): PatientRepository {
  const path = (id: string) => `/pacientes/${encodeURIComponent(id)}`;
  const methods = {
    async buscar(_institucion: InstitucionId, q: BuscarPacientesQuery) {
      if (!q.q?.trim()) return { items: [], hayMas: false, paginaActual: 1 };
      if (q.sexo && q.sexo !== 'TODOS') throw new HttpError({ status: 400, codigo: '400 SOLICITUD_INVALIDA', mensaje: 'La búsqueda no admite filtro por sexo.' });
      if (q.orden && q.orden !== 'ASC' && q.orden !== 'DESC') throw new HttpError({ status: 400, codigo: '400 SOLICITUD_INVALIDA', mensaje: 'Selecciona orden de registro ascendente o descendente.' });
      const res = await http.get<PacienteDto[]>('/pacientes', { query: { q: q.q.trim(), estado: q.estado, orden: q.orden ?? 'ASC', cursor: q.cursor, limite: q.limite ?? 10 } });
      return { items: res.data.map((p) => mapearPaciente(p)), siguienteCursor: res.meta.siguiente_cursor, hayMas: Boolean(res.meta.siguiente_cursor), paginaActual: 1 };
    },
    async obtenerPorId(_institucion: InstitucionId, id: string) {
      try { return mapearPaciente((await http.get<PacienteDto>(path(id))).data); }
      catch (error) { if (error instanceof HttpError && error.status === 404) return null; throw error; }
    },
    async crear(_institucion: InstitucionId, dto: CrearPacienteDTO) {
      return mapearPaciente((await http.post<PacienteDto>('/pacientes', mapearAlta(dto), { idempotencyKey: dto.idempotencyKey })).data);
    },
    async actualizar(_institucion: InstitucionId, id: string, dto: ActualizarPacienteDTO) {
      return mapearPaciente((await http.patch<PacienteDto>(path(id), mapearCambio(dto), { idempotencyKey: dto.idempotencyKey })).data);
    },
    async obtenerExpedienteCompleto(_institucion: InstitucionId, id: string, filtros: FiltrosHistorial = {}) {
      try {
        const res = await http.get<ExpedienteDto>(`${path(id)}/expediente`, { query: { ...filtros, orden: filtros.orden ?? 'ASC', limite: filtros.limite ?? 20 } });
        return { paciente: mapearPaciente(res.data.paciente), eventos: res.data.historial.eventos.map(mapearEvento), siguienteCursor: res.meta.siguiente_cursor, soloProyeccion: true,
          antecedentes: { patologicos: [], quirurgicos: [], familiares: [], alergias: [], medicamentosActuales: [] }, consultas: [], diagnosticos: [], recetas: [] };
      } catch (error) { if (error instanceof HttpError && error.status === 404) return null; throw error; }
    },
    async obtenerHistorial(_institucion: InstitucionId, id: string, filtros: FiltrosHistorial) {
      const res = await http.get<HistorialDto>(`${path(id)}/historial`, { query: { ...filtros, orden: filtros.orden ?? 'ASC', limite: filtros.limite ?? 20 } });
      return { eventos: res.data.eventos.map(mapearEvento), siguienteCursor: res.meta.siguiente_cursor };
    },
  };
  // Las capacidades E03–E05 conservan un rechazo explícito hasta integrar su adaptador.
  return new Proxy(methods as unknown as PatientRepository, {
    get(target, prop, receiver) {
      if (prop in target) return Reflect.get(target, prop, receiver);
      if (typeof prop !== 'string' || prop === 'then') return undefined;
      return async () => { throw new HttpError({ status: 501, codigo: '501 NOT_IMPLEMENTED', mensaje: 'Esta operación todavía no está disponible.' }); };
    },
  });
}
