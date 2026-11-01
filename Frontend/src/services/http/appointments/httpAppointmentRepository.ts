import { stableCommandKeys } from '../stableCommand';
import type { AppointmentRepository } from '../../contracts';
import type { CitaAgenda, CrearCitaDTO, InstitucionId, ReprogramacionRegistro } from '../../types';
import { HttpClient } from '../httpClient';
import { HttpError } from '../errors';

interface CitaDto {
  id: string;
  paciente_id: string;
  profesional_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string | null;
  duracion_minutos: number | null;
  motivo: string;
  consultorio?: string;
  secretaria_gestora?: string;
  estado: CitaAgenda['estado'];
  motivo_cancelacion?: string;
  fecha_creacion: string;
  version: number;
}

interface RevisionCitaDto {
  id: string;
  version: number;
  fecha_hora: string;
  actor_id: string;
  motivo_cambio: string;
  anterior: CitaDto;
  actual: CitaDto;
}

interface PacienteVersionDto {
  id: string;
  version: number;
}

function mapear(c: CitaDto, institucionId: InstitucionId): CitaAgenda {
  return {
    id: c.id,
    institucionId,
    pacienteId: c.paciente_id,
    pacienteNombre: c.paciente_id,
    pacienteCodigo: c.paciente_id,
    profesionalId: c.profesional_id,
    profesionalNombre: c.profesional_id,
    profesionalRol: institucionId === 'CLINICA_ODONTOLOGICA' ? 'ODONTOLOGO' : institucionId === 'CENTRO_PEDIATRICO' ? 'PEDIATRA' : 'MEDICO',
    fecha: c.fecha,
    horaInicio: c.hora_inicio,
    horaFin: c.hora_fin ?? '',
    duracionMinutos: c.duracion_minutos ?? 0,
    motivo: c.motivo,
    consultorio: c.consultorio ?? '',
    ...(c.secretaria_gestora ? { secretariaGestora: c.secretaria_gestora } : {}),
    estado: c.estado,
    motivoCancelacion: c.motivo_cancelacion,
    fechaCreacion: c.fecha_creacion,
    version: c.version,
  };
}

function mapearRevision(r: RevisionCitaDto): ReprogramacionRegistro {
  const previa = `${r.anterior.fecha} ${r.anterior.hora_inicio}`;
  const nueva =
    r.actual.estado === 'CANCELADA'
      ? `CANCELADA (${r.actual.fecha} ${r.actual.hora_inicio})`
      : `${r.actual.fecha} ${r.actual.hora_inicio}`;
  return {
    fechaHoraPrevia: previa,
    nuevaFechaHora: nueva,
    motivo: r.motivo_cambio,
    fechaRegistro: r.fecha_hora,
    usuario: r.actor_id,
  };
}

export function createHttpAppointmentRepository(http: HttpClient): AppointmentRepository {
  const path = (id: string) => `/citas/${encodeURIComponent(id)}`;
  const key = stableCommandKeys();

  return {
    async obtenerCitas(i, q) {
      // La agenda de presentación usa fin inclusivo; el contrato HTTP usa [desde,hasta).
      const [year, month, day] = q.fechaHasta.split('-').map(Number);
      const hasta = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
      const r = await http.get<CitaDto[]>('/citas', {
        query: {
          fecha_desde: q.fechaDesde,
          fecha_hasta: hasta,
          profesional_id: q.profesionalId === 'TODOS' ? undefined : q.profesionalId,
          estado: q.estado === 'TODOS' ? undefined : q.estado,
          q: q.q,
          limite: 100,
        },
      });
      if (r.meta.siguiente_cursor) {
        throw new HttpError({
          status: 400,
          codigo: 'RANGO_AMPLIO',
          mensaje: 'Reduce el rango de fechas para mostrar todas las citas.',
        });
      }
      return r.data.map((c) => mapear(c, i));
    },

    async obtenerPorId(i, id) {
      try {
        return mapear((await http.get<CitaDto>(path(id))).data, i);
      } catch (e) {
        if (e instanceof HttpError && e.status === 404) return null;
        throw e;
      }
    },

    async obtenerRevisiones(_i, id) {
      const r = await http.get<RevisionCitaDto[]>(`${path(id)}/revisiones`, {
        query: { orden: 'ASC', limite: 50 },
      });
      return r.data.map(mapearRevision);
    },

    async crear(i: InstitucionId, dto: CrearCitaDTO) {
      let versionPaciente = dto.versionPaciente;
      if (versionPaciente === undefined) {
        const pac = await http.get<PacienteVersionDto>(
          `/pacientes/${encodeURIComponent(dto.pacienteId)}`
        );
        versionPaciente = pac.data.version;
      }
      const body = {
        paciente_id: dto.pacienteId,
        version_paciente: versionPaciente,
        profesional_id: dto.profesionalId,
        fecha: dto.fecha,
        hora_inicio: dto.horaInicio,
        duracion_minutos: dto.duracionMinutos,
        motivo: dto.motivo,
        ...(dto.consultorio?.trim() ? { consultorio: dto.consultorio.trim() } : {}),
      };
      const idempotencyKey = dto.idempotencyKey ?? key('citas/crear', body);
      const res = await http.post<CitaDto>('/citas', body, { idempotencyKey });
      return mapear(res.data, i);
    },

    async reprogramar(
      i: InstitucionId,
      id: string,
      nuevaFecha: string,
      nuevaHora: string,
      motivo: string,
      versionEsperada?: number,
      duracionMinutos?: number,
      idempotencyKey?: string
    ) {
      let version = versionEsperada;
      let duracion = duracionMinutos;
      if (version === undefined || duracion === undefined || duracion === null) {
        const actual = (await http.get<CitaDto>(path(id))).data;
        version = version ?? actual.version;
        duracion = duracion ?? (actual.duracion_minutos !== null ? actual.duracion_minutos : undefined);
      }
      if (duracion === undefined || duracion === null || duracion <= 0) {
        throw new HttpError({
          status: 400,
          codigo: 'ESTADO_INVALIDO',
          mensaje: 'Es obligatorio especificar la duración de la cita para reprogramarla.',
        });
      }
      const body = {
        version_esperada: version,
        fecha: nuevaFecha,
        hora_inicio: nuevaHora,
        duracion_minutos: duracion,
        motivo,
      };
      const k = idempotencyKey ?? key(`${id}/reprogramacion`, body);
      const res = await http.patch<CitaDto>(`${path(id)}/reprogramacion`, body, {
        idempotencyKey: k,
      });
      return mapear(res.data, i);
    },

    async cancelar(
      i: InstitucionId,
      id: string,
      motivoCancelacion: string,
      versionEsperada?: number,
      idempotencyKey?: string
    ) {
      let version = versionEsperada;
      if (version === undefined) {
        const actual = (await http.get<CitaDto>(path(id))).data;
        version = actual.version;
      }
      const body = {
        version_esperada: version,
        motivo: motivoCancelacion,
      };
      const k = idempotencyKey ?? key(`${id}/cancelacion`, body);
      const res = await http.post<CitaDto>(`${path(id)}/cancelacion`, body, {
        idempotencyKey: k,
      });
      return mapear(res.data, i);
    },
  };
}
