import { PatientRepository } from '../services/contracts';
import {
  Paciente,
  InstitucionId,
  BuscarPacientesQuery,
  ResultadoPaginadoPacientes,
  CrearPacienteDTO,
  ActualizarPacienteDTO,
  PacienteDuplicadoException,
  ExpedienteCompleto,
  DiagnosticoHistorial,
  RecetaHistorial,
  RecetaMedicamentoItem,
  CausaArchivo
} from '../services/types';
import {
  MOCK_PACIENTES_INICIALES,
  calcularEdadAnios,
  normalizarIdentificacion
} from './mockPatientsData';
import {
  MOCK_ANTECEDENTES_DEFECTO,
  MOCK_CONSULTAS_DEFECTO,
  MOCK_DIAGNOSTICOS_DEFECTO,
  MOCK_RECETAS_DEFECTO,
  MOCK_EVENTOS_TIMELINE_DEFECTO
} from './mockClinicalData';

const LOCAL_STORAGE_KEY = 'clinica_pacientes_dataset_v1';

export class MockPatientRepository implements PatientRepository {
  private pacientes: Paciente[] = [];
  private diagnosticosPorPaciente: Record<string, DiagnosticoHistorial[]> = {};
  private recetasPorPaciente: Record<string, RecetaHistorial[]> = {};

  constructor() {
    this.cargarPacientes();
  }

  private cargarPacientes(): void {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        this.pacientes = JSON.parse(raw);
        return;
      }
    } catch {
      // Fallback
    }
    this.pacientes = [...MOCK_PACIENTES_INICIALES];
    this.guardarEnStorage();
  }

  private guardarEnStorage(): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.pacientes));
    } catch {
      // Ignore if quota exceeded
    }
  }

  async buscar(
    institucionId: InstitucionId,
    query: BuscarPacientesQuery
  ): Promise<ResultadoPaginadoPacientes> {
    await new Promise((res) => setTimeout(res, 50));

    // Filtrar estrictamente por institución
    let filtrados = this.pacientes.filter((p) => p.institucionId === institucionId);

    // Búsqueda por término
    if (query.q && query.q.trim().length > 0) {
      const termino = query.q.trim().toLowerCase();
      const normTermino = normalizarIdentificacion(query.q);
      filtrados = filtrados.filter((p) => {
        const nombreMatch = p.nombreCompleto.toLowerCase().includes(termino);
        const docMatch = normalizarIdentificacion(p.numeroIdentificacion).includes(normTermino);
        const codMatch = p.codigoLegible.toLowerCase().includes(termino);
        return nombreMatch || docMatch || codMatch;
      });
    }

    // Filtro de estado
    if (query.estado && query.estado !== 'TODOS') {
      filtrados = filtrados.filter((p) => p.estado === query.estado);
    }

    // Filtro de sexo
    if (query.sexo && query.sexo !== 'TODOS') {
      filtrados = filtrados.filter((p) => p.sexo === query.sexo);
    }

    // Ordenamiento
    const orden = query.orden || 'NOMBRE_ASC';
    filtrados.sort((a, b) => {
      if (orden === 'NOMBRE_ASC') {
        return a.nombreCompleto.localeCompare(b.nombreCompleto, 'es');
      }
      if (orden === 'NOMBRE_DESC') {
        return b.nombreCompleto.localeCompare(a.nombreCompleto, 'es');
      }
      if (orden === 'FECHA_REGISTRO') {
        return new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime();
      }
      return 0;
    });

    const totalEncontrados = filtrados.length;
    const limite = query.limite || 10;

    // Descodificar cursor opaco (cur_<offset>)
    let offset = 0;
    if (query.cursor && query.cursor.startsWith('cur_')) {
      const parsed = parseInt(query.cursor.replace('cur_', ''), 10);
      if (!isNaN(parsed) && parsed >= 0) {
        offset = parsed;
      }
    }

    const items = filtrados.slice(offset, offset + limite);
    const hayMas = offset + limite < totalEncontrados;
    const siguienteCursor = hayMas ? `cur_${offset + limite}` : undefined;
    const anteriorCursor = offset > 0 ? `cur_${Math.max(0, offset - limite)}` : undefined;
    const paginaActual = Math.floor(offset / limite) + 1;

    return {
      items,
      cursorActual: `cur_${offset}`,
      siguienteCursor,
      anteriorCursor,
      hayMas,
      paginaActual,
      totalEncontrados
    };
  }

  async obtenerPorId(institucionId: InstitucionId, id: string): Promise<Paciente | null> {
    await new Promise((res) => setTimeout(res, 30));
    const encontrado = this.pacientes.find(
      (p) => p.id === id && p.institucionId === institucionId
    );
    return encontrado || null;
  }

  async obtenerExpedienteCompleto(
    institucionId: InstitucionId,
    id: string
  ): Promise<ExpedienteCompleto | null> {
    await new Promise((res) => setTimeout(res, 40));
    const paciente = await this.obtenerPorId(institucionId, id);
    if (!paciente) return null;

    const antecedentes = MOCK_ANTECEDENTES_DEFECTO[paciente.id] || {
      patologicos: ['Sin antecedentes patológicos crónicos registrados'],
      quirurgicos: ['Sin intervenciones quirúrgicas mayores'],
      familiares: ['No refiere antecedentes familiares relevantes'],
      alergias: [],
      medicamentosActuales: []
    };

    const consultas = MOCK_CONSULTAS_DEFECTO[paciente.id] || [];
    if (!this.diagnosticosPorPaciente[paciente.id]) {
      this.diagnosticosPorPaciente[paciente.id] = [...(MOCK_DIAGNOSTICOS_DEFECTO[paciente.id] || [])];
    }
    const diagnosticos = [...this.diagnosticosPorPaciente[paciente.id]];
    if (!this.recetasPorPaciente[paciente.id]) {
      this.recetasPorPaciente[paciente.id] = [...(MOCK_RECETAS_DEFECTO[paciente.id] || [])];
    }
    const recetas = [...this.recetasPorPaciente[paciente.id]];
    const eventos = MOCK_EVENTOS_TIMELINE_DEFECTO[paciente.id] || [
      {
        id: `evt-reg-${paciente.id}`,
        fechaHora: paciente.fechaRegistro,
        tipoEvento: 'DIAGNOSTICO',
        titulo: 'Apertura de expediente clínico',
        descripcion: 'Registro administrativo inicial de paciente',
        profesional: 'Personal Administrativo',
        rolProfesional: 'Admisión'
      }
    ];

    return {
      paciente,
      antecedentes,
      consultas,
      diagnosticos,
      recetas,
      eventos
    };
  }

  async crear(institucionId: InstitucionId, dto: CrearPacienteDTO): Promise<Paciente> {
    await new Promise((res) => setTimeout(res, 60));

    const normDoc = normalizarIdentificacion(dto.numeroIdentificacion);

    // Control de duplicados en la misma institución
    const duplicado = this.pacientes.find(
      (p) =>
        p.institucionId === institucionId &&
        normalizarIdentificacion(p.numeroIdentificacion) === normDoc
    );

    if (duplicado) {
      throw new PacienteDuplicadoException(
        `El documento ${dto.numeroIdentificacion} ya se encuentra registrado para el paciente ${duplicado.nombreCompleto} con código ${duplicado.codigoLegible}.`,
        {
          id: duplicado.id,
          nombre: duplicado.nombreCompleto,
          codigo: duplicado.codigoLegible,
          numeroIdentificacion: duplicado.numeroIdentificacion
        }
      );
    }

    const correlativo = this.pacientes.filter((p) => p.institucionId === institucionId).length + 1;
    const prefijoInstitucion =
      institucionId === 'HOSPITAL_GENERAL'
        ? 'HOSP'
        : institucionId === 'CLINICA_ODONTOLOGICA'
        ? 'ODON'
        : institucionId === 'LABORATORIO_CLINICO'
        ? 'LAB'
        : 'PED';

    const codigoLegible = `HC-${prefijoInstitucion}-${String(correlativo * 10 + 100).padStart(4, '0')}`;
    const edadAnios = calcularEdadAnios(dto.fechaNacimiento);
    const nombreCompleto = `${dto.nombres.trim()} ${dto.apellidos.trim()}`;

    const nuevoPaciente: Paciente = {
      id: `pac-${prefijoInstitucion.toLowerCase()}-${Date.now()}`,
      codigoLegible,
      institucionId,
      nombres: dto.nombres.trim(),
      apellidos: dto.apellidos.trim(),
      nombreCompleto,
      fechaNacimiento: dto.fechaNacimiento,
      edadAnios,
      sexo: dto.sexo,
      tipoIdentificacion: dto.tipoIdentificacion,
      numeroIdentificacion: dto.numeroIdentificacion.trim(),
      telefono: dto.telefono.trim(),
      correo: dto.correo.trim(),
      direccion: dto.direccion.trim(),
      estado: 'ACTIVO',
      estadoAlergias: 'SIN_VERIFICAR',
      contactoEmergencia: dto.contactoEmergencia,
      responsables: dto.responsables,
      fechaRegistro: new Date().toISOString(),
      historialConsultasCount: 0
    };

    this.pacientes.unshift(nuevoPaciente);
    this.guardarEnStorage();

    return nuevoPaciente;
  }

  async actualizar(
    institucionId: InstitucionId,
    id: string,
    dto: ActualizarPacienteDTO
  ): Promise<Paciente> {
    await new Promise((res) => setTimeout(res, 60));

    const index = this.pacientes.findIndex(
      (p) => p.id === id && p.institucionId === institucionId
    );

    if (index === -1) {
      throw new Error(`Paciente con ID ${id} no encontrado en la institución activa.`);
    }

    // Verificar duplicado si cambió el documento
    if (dto.numeroIdentificacion) {
      const normDoc = normalizarIdentificacion(dto.numeroIdentificacion);
      const duplicado = this.pacientes.find(
        (p) =>
          p.id !== id &&
          p.institucionId === institucionId &&
          normalizarIdentificacion(p.numeroIdentificacion) === normDoc
      );
      if (duplicado) {
        throw new PacienteDuplicadoException(
          `El documento ${dto.numeroIdentificacion} ya se encuentra registrado para el paciente ${duplicado.nombreCompleto} con código ${duplicado.codigoLegible}.`,
          {
            id: duplicado.id,
            nombre: duplicado.nombreCompleto,
            codigo: duplicado.codigoLegible,
            numeroIdentificacion: duplicado.numeroIdentificacion
          }
        );
      }
    }

    const actual = this.pacientes[index];
    const nombres = dto.nombres !== undefined ? dto.nombres.trim() : actual.nombres;
    const apellidos = dto.apellidos !== undefined ? dto.apellidos.trim() : actual.apellidos;
    const nombreCompleto = `${nombres} ${apellidos}`;
    const fechaNacimiento = dto.fechaNacimiento || actual.fechaNacimiento;
    const edadAnios = calcularEdadAnios(fechaNacimiento);

    const actualizado: Paciente = {
      ...actual,
      nombres,
      apellidos,
      nombreCompleto,
      fechaNacimiento,
      edadAnios,
      sexo: dto.sexo || actual.sexo,
      tipoIdentificacion: dto.tipoIdentificacion || actual.tipoIdentificacion,
      numeroIdentificacion: dto.numeroIdentificacion
        ? dto.numeroIdentificacion.trim()
        : actual.numeroIdentificacion,
      telefono: dto.telefono !== undefined ? dto.telefono.trim() : actual.telefono,
      correo: dto.correo !== undefined ? dto.correo.trim() : actual.correo,
      direccion: dto.direccion !== undefined ? dto.direccion.trim() : actual.direccion,
      contactoEmergencia: dto.contactoEmergencia !== undefined ? dto.contactoEmergencia : actual.contactoEmergencia,
      responsables: dto.responsables !== undefined ? dto.responsables : actual.responsables
    };

    this.pacientes[index] = actualizado;
    this.guardarEnStorage();

    return actualizado;
  }

  async archivar(
    institucionId: InstitucionId,
    id: string,
    causa: CausaArchivo,
    motivo: string
  ): Promise<Paciente> {
    await new Promise((res) => setTimeout(res, 50));
    const index = this.pacientes.findIndex(
      (p) => p.id === id && p.institucionId === institucionId
    );
    if (index === -1) {
      throw new Error(`Paciente con ID ${id} no encontrado.`);
    }
    this.pacientes[index] = {
      ...this.pacientes[index],
      estado: 'ARCHIVADO',
      causaArchivo: causa,
      motivoArchivo: motivo
    };
    this.guardarEnStorage();
    return this.pacientes[index];
  }

  async reactivar(
    institucionId: InstitucionId,
    id: string,
    _motivo: string,
    _correccionFallecimiento?: boolean
  ): Promise<Paciente> {
    await new Promise((res) => setTimeout(res, 50));
    const index = this.pacientes.findIndex(
      (p) => p.id === id && p.institucionId === institucionId
    );
    if (index === -1) {
      throw new Error(`Paciente con ID ${id} no encontrado.`);
    }
    this.pacientes[index] = {
      ...this.pacientes[index],
      estado: 'ACTIVO',
      causaArchivo: undefined,
      motivoArchivo: undefined
    };
    this.guardarEnStorage();
    return this.pacientes[index];
  }

  async agregarDiagnostico(
    _institucionId: InstitucionId,
    pacienteId: string,
    diagnostico: { codigoCIE: string; nombre: string; esPrincipal: boolean; registradoPor: string }
  ): Promise<DiagnosticoHistorial> {
    await new Promise((res) => setTimeout(res, 40));
    if (!this.diagnosticosPorPaciente[pacienteId]) {
      this.diagnosticosPorPaciente[pacienteId] = [...(MOCK_DIAGNOSTICOS_DEFECTO[pacienteId] || [])];
    }
    const lista = this.diagnosticosPorPaciente[pacienteId];

    if (diagnostico.esPrincipal) {
      lista.forEach((d) => {
        d.esPrincipal = false;
      });
    }

    const nuevo: DiagnosticoHistorial = {
      id: `dx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      codigoCIE: diagnostico.codigoCIE,
      nombre: diagnostico.nombre,
      esPrincipal: diagnostico.esPrincipal,
      fechaRegistro: new Date().toISOString().split('T')[0],
      registradoPor: diagnostico.registradoPor
    };

    lista.unshift(nuevo);
    return nuevo;
  }

  async emitirReceta(
    _institucionId: InstitucionId,
    pacienteId: string,
    receta: { emitidaPor: string; rolEmisor: string; medicamentos: RecetaMedicamentoItem[] }
  ): Promise<RecetaHistorial> {
    await new Promise((res) => setTimeout(res, 40));
    if (!this.recetasPorPaciente[pacienteId]) {
      this.recetasPorPaciente[pacienteId] = [...(MOCK_RECETAS_DEFECTO[pacienteId] || [])];
    }
    const correlativo = String(this.recetasPorPaciente[pacienteId].length + 1).padStart(4, '0');
    const anio = new Date().getFullYear();
    const nueva: RecetaHistorial = {
      id: `rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      codigoReceta: `REC-${anio}-${correlativo}`,
      fechaEmision: new Date().toISOString(),
      emitidaPor: receta.emitidaPor,
      rolEmisor: receta.rolEmisor,
      estado: 'EMITIDA',
      medicamentos: receta.medicamentos
    };

    this.recetasPorPaciente[pacienteId].unshift(nueva);
    return nueva;
  }
}
