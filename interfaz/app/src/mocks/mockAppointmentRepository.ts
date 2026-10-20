import { AppointmentRepository } from '../services/contracts';
import {
  CitaAgenda,
  InstitucionId,
  FiltrosAgendaQuery,
  CrearCitaDTO
} from '../services/types';
import { MOCK_CITAS_INICIALES } from './mockAppointmentsData';

const LOCAL_STORAGE_KEY_CITAS = 'clinica_citas_dataset_v1';

export class MockAppointmentRepository implements AppointmentRepository {
  private citas: CitaAgenda[] = [];

  constructor() {
    this.cargarCitas();
  }

  private cargarCitas(): void {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_CITAS);
      if (raw) {
        this.citas = JSON.parse(raw);
        return;
      }
    } catch {
      // Fallback
    }
    this.citas = [...MOCK_CITAS_INICIALES];
    this.guardarEnStorage();
  }

  private guardarEnStorage(): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_CITAS, JSON.stringify(this.citas));
    } catch {
      // Quota exceeded
    }
  }

  async obtenerCitas(
    institucionId: InstitucionId,
    query: FiltrosAgendaQuery
  ): Promise<CitaAgenda[]> {
    await new Promise((res) => setTimeout(res, 40));

    let filtradas = this.citas.filter((c) => c.institucionId === institucionId);

    // Filtro por rango de fechas
    if (query.fechaDesde && query.fechaHasta) {
      filtradas = filtradas.filter(
        (c) => c.fecha >= query.fechaDesde && c.fecha <= query.fechaHasta
      );
    } else if (query.fechaDesde) {
      filtradas = filtradas.filter((c) => c.fecha === query.fechaDesde);
    }

    // Filtro por profesional
    if (query.profesionalId && query.profesionalId !== 'TODOS') {
      filtradas = filtradas.filter((c) => c.profesionalId === query.profesionalId);
    }

    // Filtro por estado contractual (DEC-04)
    if (query.estado && query.estado !== 'TODOS') {
      filtradas = filtradas.filter((c) => c.estado === query.estado);
    }

    // Buscador por nombre o código de paciente
    if (query.q && query.q.trim().length > 0) {
      const termino = query.q.trim().toLowerCase();
      filtradas = filtradas.filter(
        (c) =>
          c.pacienteNombre.toLowerCase().includes(termino) ||
          c.pacienteCodigo.toLowerCase().includes(termino) ||
          c.motivo.toLowerCase().includes(termino)
      );
    }

    // Ordenamiento cronológico de 24 horas
    filtradas.sort((a, b) => {
      const cmpFecha = a.fecha.localeCompare(b.fecha);
      if (cmpFecha !== 0) return cmpFecha;
      return a.horaInicio.localeCompare(b.horaInicio);
    });

    return filtradas;
  }

  async obtenerPorId(institucionId: InstitucionId, id: string): Promise<CitaAgenda | null> {
    await new Promise((res) => setTimeout(res, 30));
    const cita = this.citas.find((c) => c.id === id && c.institucionId === institucionId);
    return cita || null;
  }

  async crear(institucionId: InstitucionId, dto: CrearCitaDTO): Promise<CitaAgenda> {
    await new Promise((res) => setTimeout(res, 50));

    // Comprobar solapamiento del mismo profesional en la misma fecha y hora
    const solapada = this.citas.find(
      (c) =>
        c.institucionId === institucionId &&
        c.profesionalId === dto.profesionalId &&
        c.fecha === dto.fecha &&
        c.horaInicio === dto.horaInicio &&
        c.estado === 'PROGRAMADA'
    );

    if (solapada) {
      throw new Error(
        `El profesional ya tiene una cita programada a las ${dto.horaInicio} el día ${dto.fecha}. Seleccione otro horario.`
      );
    }

    // Calcular hora de fin
    const [h, m] = dto.horaInicio.split(':').map((n) => parseInt(n, 10));
    const duracion = dto.duracionMinutos || 30;
    const totalMinutos = h * 60 + m + duracion;
    const horaFin = `${String(Math.floor(totalMinutos / 60)).padStart(2, '0')}:${String(
      totalMinutos % 60
    ).padStart(2, '0')}`;

    const nuevaCita: CitaAgenda = {
      id: `cita-gen-${Date.now()}`,
      institucionId,
      pacienteId: dto.pacienteId,
      pacienteNombre: 'Paciente Citado',
      pacienteCodigo: 'HC-PAC-0000',
      profesionalId: dto.profesionalId,
      profesionalNombre: 'Profesional Asignado',
      profesionalRol: 'Médico',
      fecha: dto.fecha,
      horaInicio: dto.horaInicio,
      horaFin,
      duracionMinutos: duracion,
      motivo: dto.motivo,
      estado: 'PROGRAMADA',
      consultorio: dto.consultorio || 'Consultorio General',
      fechaCreacion: new Date().toISOString()
    };

    this.citas.push(nuevaCita);
    this.guardarEnStorage();

    return nuevaCita;
  }

  async reprogramar(
    institucionId: InstitucionId,
    id: string,
    nuevaFecha: string,
    nuevaHora: string,
    _motivo: string
  ): Promise<CitaAgenda> {
    await new Promise((res) => setTimeout(res, 50));
    const index = this.citas.findIndex((c) => c.id === id && c.institucionId === institucionId);
    if (index === -1) {
      throw new Error(`Cita con ID ${id} no encontrada.`);
    }

    const actual = this.citas[index];
    if (actual.estado !== 'PROGRAMADA') {
      throw new Error(`Solo las citas en estado PROGRAMADA pueden ser reprogramadas.`);
    }

    const [h, m] = nuevaHora.split(':').map((n) => parseInt(n, 10));
    const duracion = actual.duracionMinutos || 30;
    const totalMinutos = h * 60 + m + duracion;
    const horaFin = `${String(Math.floor(totalMinutos / 60)).padStart(2, '0')}:${String(
      totalMinutos % 60
    ).padStart(2, '0')}`;

    const actualizada: CitaAgenda = {
      ...actual,
      fecha: nuevaFecha,
      horaInicio: nuevaHora,
      horaFin,
      estado: 'PROGRAMADA'
    };

    this.citas[index] = actualizada;
    this.guardarEnStorage();
    return actualizada;
  }

  async cancelar(
    institucionId: InstitucionId,
    id: string,
    motivoCancelacion: string
  ): Promise<CitaAgenda> {
    await new Promise((res) => setTimeout(res, 50));
    const index = this.citas.findIndex((c) => c.id === id && c.institucionId === institucionId);
    if (index === -1) {
      throw new Error(`Cita con ID ${id} no encontrada.`);
    }

    const actual = this.citas[index];
    if (actual.estado !== 'PROGRAMADA') {
      throw new Error(`Solo las citas en estado PROGRAMADA pueden ser canceladas.`);
    }

    if (!motivoCancelacion || motivoCancelacion.trim() === '') {
      throw new Error(`El motivo de cancelación es estrictamente obligatorio.`);
    }

    const cancelada: CitaAgenda = {
      ...actual,
      estado: 'CANCELADA',
      motivoCancelacion: motivoCancelacion.trim()
    };

    this.citas[index] = cancelada;
    this.guardarEnStorage();
    return cancelada;
  }
}
