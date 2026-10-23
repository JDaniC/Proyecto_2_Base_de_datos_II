import { AppointmentRepository } from '../services/contracts';
import {
  CitaAgenda,
  InstitucionId,
  FiltrosAgendaQuery,
  CrearCitaDTO,
  ReprogramacionRegistro
} from '../services/types';
import { MOCK_CITAS_INICIALES, PROFESIONALES_DISPONIBLES } from './mockAppointmentsData';
import { MOCK_PACIENTES_INICIALES } from './mockPatientsData';

const LOCAL_STORAGE_KEY_CITAS = 'clinica_citas_dataset_v1';
const LOCAL_STORAGE_KEY_PACIENTES = 'clinica_pacientes_dataset_v1';

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
    this.cargarCitas();
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
    this.cargarCitas();
    await new Promise((res) => setTimeout(res, 30));
    const cita = this.citas.find((c) => c.id === id && c.institucionId === institucionId);
    return cita || null;
  }

  private obtenerPacientesDisponibles() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PACIENTES);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // Fallback
    }
    return MOCK_PACIENTES_INICIALES;
  }

  async crear(institucionId: InstitucionId, dto: CrearCitaDTO): Promise<CitaAgenda> {
    await new Promise((res) => setTimeout(res, 50));

    if (!dto.pacienteId) {
      throw new Error('Debe seleccionar un paciente con expediente activo.');
    }
    if (!dto.profesionalId) {
      throw new Error('Debe seleccionar un profesional de la salud asignado.');
    }
    if (!dto.fecha) {
      throw new Error('Debe indicar la fecha de la cita.');
    }
    if (!dto.horaInicio) {
      throw new Error('Debe indicar la hora de inicio (formato 24 h).');
    }
    if (!dto.motivo || dto.motivo.trim().length < 4) {
      throw new Error('El motivo de la cita es obligatorio (mínimo 4 caracteres).');
    }

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

    // Obtener datos del paciente
    const listaPacientes = this.obtenerPacientesDisponibles();
    const paciente = listaPacientes.find((p: any) => p.id === dto.pacienteId);
    const pacienteNombre = paciente
      ? `${paciente.nombres} ${paciente.apellidos}`
      : 'Paciente Registrado';
    const pacienteCodigo = paciente ? (paciente.codigoLegible || paciente.codigoExpediente || 'HC-GEN-000') : 'HC-GEN-000';
    const pacienteTelefono = paciente?.telefono || undefined;

    // Obtener datos del profesional
    const profesionalesInst = PROFESIONALES_DISPONIBLES[institucionId] || [];
    const profesional = profesionalesInst.find((p) => p.id === dto.profesionalId);
    const profesionalNombre = profesional ? profesional.nombre : 'Profesional Institucional';
    const profesionalRol = profesional ? profesional.especialidad : 'Especialista';

    const nuevaCita: CitaAgenda = {
      id: `cita-gen-${Date.now()}`,
      institucionId,
      pacienteId: dto.pacienteId,
      pacienteNombre,
      pacienteCodigo,
      pacienteTelefono,
      profesionalId: dto.profesionalId,
      profesionalNombre,
      profesionalRol,
      fecha: dto.fecha,
      horaInicio: dto.horaInicio,
      horaFin,
      duracionMinutos: duracion,
      motivo: dto.motivo.trim(),
      estado: 'PROGRAMADA',
      consultorio: dto.consultorio || 'Consultorio General',
      secretariaGestora: dto.secretariaGestora,
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
    motivo: string
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

    if (!motivo || motivo.trim().length < 4) {
      throw new Error('El motivo de la reprogramación es obligatorio (mínimo 4 caracteres).');
    }

    // Verificar si el profesional tiene conflicto en el nuevo horario
    const conflicto = this.citas.find(
      (c) =>
        c.id !== id &&
        c.institucionId === institucionId &&
        c.profesionalId === actual.profesionalId &&
        c.fecha === nuevaFecha &&
        c.horaInicio === nuevaHora &&
        c.estado === 'PROGRAMADA'
    );
    if (conflicto) {
      throw new Error(
        `El profesional ya tiene una cita programada a las ${nuevaHora} el día ${nuevaFecha}. Seleccione otro horario.`
      );
    }

    const [h, m] = nuevaHora.split(':').map((n) => parseInt(n, 10));
    const duracion = actual.duracionMinutos || 30;
    const totalMinutos = h * 60 + m + duracion;
    const horaFin = `${String(Math.floor(totalMinutos / 60)).padStart(2, '0')}:${String(
      totalMinutos % 60
    ).padStart(2, '0')}`;

    const registroReprogramacion: ReprogramacionRegistro = {
      fechaHoraPrevia: `${actual.fecha} · ${actual.horaInicio} a ${actual.horaFin} h`,
      nuevaFechaHora: `${nuevaFecha} · ${nuevaHora} a ${horaFin} h`,
      motivo: motivo.trim(),
      fechaRegistro: new Date().toISOString()
    };

    const historialPrevio = actual.historialReprogramaciones || [];

    const actualizada: CitaAgenda = {
      ...actual,
      fecha: nuevaFecha,
      horaInicio: nuevaHora,
      horaFin,
      estado: 'PROGRAMADA',
      historialReprogramaciones: [...historialPrevio, registroReprogramacion]
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

    if (!motivoCancelacion || motivoCancelacion.trim().length < 5) {
      throw new Error('El motivo de cancelación es obligatorio (mínimo 5 caracteres).');
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
