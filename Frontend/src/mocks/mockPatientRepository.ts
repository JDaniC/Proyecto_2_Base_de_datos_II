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
  PolizaSeguroPaciente,
  AfiliarPolizaDTO,
  ResponsablePediatrico,
  ProcedimientoHospitalarioItem,
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
const LOCAL_STORAGE_KEY_POLIZAS = 'clinica_pacientes_polizas_v1';
const LOCAL_STORAGE_KEY_PROCEDIMIENTOS = 'clinica_pacientes_procedimientos_v1';

const MOCK_PROCEDIMIENTOS_INICIALES: Record<string, ProcedimientoHospitalarioItem[]> = {
  'pac-hosp-001': [
    {
      id: 'proc-hosp-01',
      nombre: 'Colecistectomía Laparoscópica Electiva',
      codigo: 'QXR-LAP-041',
      fechaHora: '2026-04-12T10:00:00Z',
      profesionalNombre: 'Dr. Fernando Arévalo (Cirujano General)',
      resultado: 'Resección vesicular completa sin perforación ni complicaciones biliares.',
      observaciones: 'Pieza quirúrgica enviada a anatomía patológica. Hemostasia verificada.',
      origen: 'HOSPITALIZACION',
      origenReferencia: 'hosp-001'
    },
    {
      id: 'proc-cons-01',
      nombre: 'Electrocardiograma de 12 derivaciones en reposo',
      codigo: 'PROC-CARD-01',
      fechaHora: '2026-10-18T09:40:00Z',
      profesionalNombre: 'Dra. Elena Morales',
      resultado: 'Ritmo sinusal normal, frecuencia 72 lpm, sin signos de isquemia.',
      observaciones: 'Trazado normal sin alteraciones de conducción.',
      origen: 'CONSULTA',
      origenReferencia: 'con-0104-1'
    }
  ]
};

const MOCK_POLIZAS_INICIALES: Record<string, PolizaSeguroPaciente[]> = {
  'pac-hosp-001': [
    {
      id: 'pol-001',
      pacienteId: 'pac-hosp-001',
      aseguradoraId: 'aseg-01',
      aseguradoraNombre: 'Seguros El Roble, S.A.',
      planId: 'pln-01',
      planNombre: 'Plan Roble Oro Hospitalario',
      numeroPoliza: 'POL-ROB-2026-4401',
      numeroCertificado: 'CERT-0089',
      vigenciaDesde: '2026-01-01',
      vigenciaHasta: '2026-12-31',
      estadoVigencia: 'ACTIVA',
      porcentajeCobertura: 90,
      copagoConsultaGTQ: 50,
      deducibleBaseGTQ: 500,
      limiteMaximoAnualGTQ: 150000,
      titular: {
        nombreCompleto: 'Roberto Estrada Morales',
        parentesco: 'TITULAR',
        numeroIdentificacion: '9900-10101-0101',
        telefonoContacto: '5555-0104'
      },
      observaciones: 'Cobertura preferencial en hospitalización al 90% con copago fijo de Q 50 en consulta externa.'
    }
  ],
  'pac-hosp-002': [
    {
      id: 'pol-002',
      pacienteId: 'pac-hosp-002',
      aseguradoraId: 'aseg-01',
      aseguradoraNombre: 'Seguros El Roble, S.A.',
      planId: 'pln-02',
      planNombre: 'Plan Roble Clásico Integral',
      numeroPoliza: 'POL-ROB-2025-1102',
      numeroCertificado: 'CERT-0145',
      vigenciaDesde: '2025-01-01',
      vigenciaHasta: '2025-12-31',
      estadoVigencia: 'VENCIDA',
      porcentajeCobertura: 80,
      copagoConsultaGTQ: 75,
      deducibleBaseGTQ: 1000,
      titular: {
        nombreCompleto: 'Claudia Méndez Arriola',
        parentesco: 'TITULAR',
        numeroIdentificacion: '9900-10102-0101',
        telefonoContacto: '5555-0108'
      },
      observaciones: 'Póliza no renovada para el ciclo actual.'
    }
  ]
};

export class MockPatientRepository implements PatientRepository {
  private pacientes: Paciente[] = [];
  private diagnosticosPorPaciente: Record<string, DiagnosticoHistorial[]> = {};
  private recetasPorPaciente: Record<string, RecetaHistorial[]> = {};
  private polizasPorPaciente: Record<string, PolizaSeguroPaciente[]> = {};
  private procedimientosPorPaciente: Record<string, ProcedimientoHospitalarioItem[]> = {};

  constructor() {
    this.cargarPacientes();
  }

  private cargarPacientes(): void {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        this.pacientes = JSON.parse(raw);
      } else {
        this.pacientes = [...MOCK_PACIENTES_INICIALES];
      }
      const rawPol = localStorage.getItem(LOCAL_STORAGE_KEY_POLIZAS);
      if (rawPol) {
        this.polizasPorPaciente = JSON.parse(rawPol);
      } else {
        this.polizasPorPaciente = JSON.parse(JSON.stringify(MOCK_POLIZAS_INICIALES));
      }
      const rawProc = localStorage.getItem(LOCAL_STORAGE_KEY_PROCEDIMIENTOS);
      if (rawProc) {
        this.procedimientosPorPaciente = JSON.parse(rawProc);
      } else {
        this.procedimientosPorPaciente = JSON.parse(JSON.stringify(MOCK_PROCEDIMIENTOS_INICIALES));
      }
      return;
    } catch {
      // Fallback
    }
    this.pacientes = [...MOCK_PACIENTES_INICIALES];
    this.polizasPorPaciente = JSON.parse(JSON.stringify(MOCK_POLIZAS_INICIALES));
    this.procedimientosPorPaciente = JSON.parse(JSON.stringify(MOCK_PROCEDIMIENTOS_INICIALES));
    this.guardarEnStorage();
  }

  private guardarEnStorage(): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.pacientes));
      localStorage.setItem(LOCAL_STORAGE_KEY_POLIZAS, JSON.stringify(this.polizasPorPaciente));
      localStorage.setItem(LOCAL_STORAGE_KEY_PROCEDIMIENTOS, JSON.stringify(this.procedimientosPorPaciente));
    } catch {
      // Ignore if quota exceeded
    }
  }

  async buscar(
    institucionId: InstitucionId,
    query: BuscarPacientesQuery
  ): Promise<ResultadoPaginadoPacientes> {
    this.cargarPacientes();
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
    this.cargarPacientes();
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
      eventos,
      polizas: this.polizasPorPaciente[paciente.id] || [],
      procedimientos: this.procedimientosPorPaciente[paciente.id] || []
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

  async obtenerPolizasSeguro(
    _institucionId: InstitucionId,
    pacienteId: string
  ): Promise<PolizaSeguroPaciente[]> {
    await new Promise((res) => setTimeout(res, 30));
    return [...(this.polizasPorPaciente[pacienteId] || [])];
  }

  async afiliarPolizaSeguro(
    _institucionId: InstitucionId,
    pacienteId: string,
    dto: AfiliarPolizaDTO
  ): Promise<PolizaSeguroPaciente> {
    await new Promise((res) => setTimeout(res, 50));
    const nuevaPoliza: PolizaSeguroPaciente = {
      id: `pol-${Date.now()}`,
      pacienteId,
      aseguradoraId: dto.aseguradoraId,
      aseguradoraNombre: dto.aseguradoraId === 'aseg-01' ? 'Seguros El Roble, S.A.' : 'Seguros Universales, S.A.',
      planId: dto.planId,
      planNombre: dto.planId === 'pln-01' ? 'Plan Roble Oro Hospitalario' : 'Plan Preferencial de Salud',
      numeroPoliza: dto.numeroPoliza.trim(),
      numeroCertificado: dto.numeroCertificado.trim(),
      vigenciaDesde: dto.vigenciaDesde,
      vigenciaHasta: dto.vigenciaHasta,
      estadoVigencia: 'ACTIVA',
      porcentajeCobertura: 85,
      copagoConsultaGTQ: dto.copagoConsultaGTQ || 50,
      deducibleBaseGTQ: 500,
      limiteMaximoAnualGTQ: 100000,
      titular: dto.titular,
      observaciones: dto.observaciones
    };

    if (!this.polizasPorPaciente[pacienteId]) {
      this.polizasPorPaciente[pacienteId] = [];
    }
    this.polizasPorPaciente[pacienteId].unshift(nuevaPoliza);
    this.guardarEnStorage();
    return nuevaPoliza;
  }

  async cambiarEstadoPoliza(
    _institucionId: InstitucionId,
    pacienteId: string,
    polizaId: string,
    estado: 'ACTIVA' | 'VENCIDA' | 'SUSPENDIDA'
  ): Promise<PolizaSeguroPaciente> {
    await new Promise((res) => setTimeout(res, 40));
    const lista = this.polizasPorPaciente[pacienteId] || [];
    const pol = lista.find((p) => p.id === polizaId);
    if (!pol) throw new Error('Póliza no encontrada');
    pol.estadoVigencia = estado;
    this.guardarEnStorage();
    return pol;
  }

  async obtenerProcedimientosPaciente(
    _institucionId: InstitucionId,
    pacienteId: string
  ): Promise<ProcedimientoHospitalarioItem[]> {
    await new Promise((res) => setTimeout(res, 30));
    return [...(this.procedimientosPorPaciente[pacienteId] || [])];
  }

  async registrarProcedimientoPaciente(
    _institucionId: InstitucionId,
    pacienteId: string,
    proc: Omit<ProcedimientoHospitalarioItem, 'id'>
  ): Promise<ProcedimientoHospitalarioItem> {
    await new Promise((res) => setTimeout(res, 50));
    const nuevoProc: ProcedimientoHospitalarioItem = {
      ...proc,
      id: `proc-pac-${Date.now()}`
    };

    if (!this.procedimientosPorPaciente[pacienteId]) {
      this.procedimientosPorPaciente[pacienteId] = [];
    }
    this.procedimientosPorPaciente[pacienteId].unshift(nuevoProc);
    this.guardarEnStorage();
    return nuevoProc;
  }

  async agregarResponsable(
    _institucionId: InstitucionId,
    pacienteId: string,
    resp: Omit<ResponsablePediatrico, 'id'>
  ): Promise<ResponsablePediatrico> {
    this.cargarPacientes();
    await new Promise((res) => setTimeout(res, 40));
    const paciente = this.pacientes.find((p) => p.id === pacienteId);
    if (!paciente) throw new Error(`Paciente ${pacienteId} no encontrado.`);

    if (!paciente.responsables) {
      paciente.responsables = [];
    }

    const nuevo: ResponsablePediatrico = {
      ...resp,
      id: `resp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    };

    paciente.responsables.push(nuevo);
    this.guardarEnStorage();
    return { ...nuevo };
  }

  async actualizarResponsable(
    _institucionId: InstitucionId,
    pacienteId: string,
    responsableId: string,
    cambios: Partial<Omit<ResponsablePediatrico, 'id'>>
  ): Promise<ResponsablePediatrico> {
    this.cargarPacientes();
    await new Promise((res) => setTimeout(res, 40));
    const paciente = this.pacientes.find((p) => p.id === pacienteId);
    if (!paciente) throw new Error(`Paciente ${pacienteId} no encontrado.`);
    if (!paciente.responsables) paciente.responsables = [];

    const index = paciente.responsables.findIndex((r) => r.id === responsableId);
    if (index === -1) throw new Error(`Responsable ${responsableId} no encontrado.`);

    const respActual = paciente.responsables[index];

    // Regla CA09: Nunca se permite desmarcar al único responsable principal del menor
    if (cambios.esPrincipal === false && respActual.esPrincipal) {
      const otrosPrincipales = paciente.responsables.filter((r) => r.id !== responsableId && r.esPrincipal);
      if (otrosPrincipales.length === 0) {
        throw new Error(
          'Regla CA09: No es posible desmarcar al único responsable principal del menor. El menor debe contar siempre con al menos un responsable principal activo.'
        );
      }
    }

    const respActualizado = {
      ...respActual,
      ...cambios
    };

    paciente.responsables[index] = respActualizado;

    // Regla CA09: Responsable compartido entre hermanos - sincronizar contacto si comparte documento o nombre
    if (cambios.telefono || cambios.nombre) {
      for (const p of this.pacientes) {
        if (p.id !== pacienteId && p.responsables) {
          for (let i = 0; i < p.responsables.length; i++) {
            const rComp = p.responsables[i];
            const coincideDocumento = respActual.documento && rComp.documento && respActual.documento === rComp.documento;
            const coincideNombre = rComp.nombre === respActual.nombre;
            if (coincideDocumento || coincideNombre) {
              if (cambios.telefono) rComp.telefono = cambios.telefono;
              if (cambios.nombre) rComp.nombre = cambios.nombre;
            }
          }
        }
      }
    }

    this.guardarEnStorage();
    return { ...respActualizado };
  }

  async eliminarResponsable(
    _institucionId: InstitucionId,
    pacienteId: string,
    responsableId: string
  ): Promise<void> {
    this.cargarPacientes();
    await new Promise((res) => setTimeout(res, 40));
    const paciente = this.pacientes.find((p) => p.id === pacienteId);
    if (!paciente) throw new Error(`Paciente ${pacienteId} no encontrado.`);
    if (!paciente.responsables) return;

    const respActual = paciente.responsables.find((r) => r.id === responsableId);
    if (!respActual) return;

    // Regla CA09: Nunca se permite dar de baja al último responsable principal del menor
    if (respActual.esPrincipal) {
      const principalesRestantes = paciente.responsables.filter((r) => r.id !== responsableId && r.esPrincipal);
      if (principalesRestantes.length === 0) {
        throw new Error(
          'Regla CA09: No es posible dar de baja al único responsable principal del menor. Debe designar otro responsable principal antes de proceder a la eliminación del vínculo.'
        );
      }
    }

    paciente.responsables = paciente.responsables.filter((r) => r.id !== responsableId);
    this.guardarEnStorage();
  }
}
