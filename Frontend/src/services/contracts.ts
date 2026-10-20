import {
  CuentaDemo,
  SesionUsuario,
  SimulacionEscenario,
  DashboardData,
  InstitucionId,
  RolId,
  Paciente,
  BuscarPacientesQuery,
  ResultadoPaginadoPacientes,
  CrearPacienteDTO,
  ActualizarPacienteDTO,
  ExpedienteCompleto,
  DiagnosticoHistorial,
  RecetaHistorial,
  RecetaMedicamentoItem,
  CausaArchivo,
  CitaAgenda,
  FiltrosAgendaQuery,
  CrearCitaDTO,
  RegistroConsultaCompletaDTO,
  DetalleConsultaCompleta
} from './types';

export interface IniciarSesionParams {
  email: string;
  password?: string;
  cuentaId?: string;
  escenario?: SimulacionEscenario;
  simularLatencia?: boolean;
}

export interface AuthRepository {
  obtenerCuentasDemo(): Promise<CuentaDemo[]>;
  iniciarSesion(params: IniciarSesionParams): Promise<SesionUsuario>;
  cerrarSesion(): Promise<void>;
  obtenerSesionActual(): Promise<SesionUsuario | null>;
}

export interface DashboardRepository {
  obtenerDashboard(institucionId: InstitucionId, rolId: RolId): Promise<DashboardData>;
}

export interface PatientRepository {
  buscar(institucionId: InstitucionId, query: BuscarPacientesQuery): Promise<ResultadoPaginadoPacientes>;
  obtenerPorId(institucionId: InstitucionId, id: string): Promise<Paciente | null>;
  obtenerExpedienteCompleto(institucionId: InstitucionId, id: string): Promise<ExpedienteCompleto | null>;
  crear(institucionId: InstitucionId, dto: CrearPacienteDTO): Promise<Paciente>;
  actualizar(institucionId: InstitucionId, id: string, dto: ActualizarPacienteDTO): Promise<Paciente>;
  archivar(institucionId: InstitucionId, id: string, causa: CausaArchivo, motivo: string): Promise<Paciente>;
  reactivar(institucionId: InstitucionId, id: string, motivo: string, correccionFallecimiento?: boolean): Promise<Paciente>;
  agregarDiagnostico(
    institucionId: InstitucionId,
    pacienteId: string,
    diagnostico: { codigoCIE: string; nombre: string; esPrincipal: boolean; registradoPor: string }
  ): Promise<DiagnosticoHistorial>;
  emitirReceta(
    institucionId: InstitucionId,
    pacienteId: string,
    receta: { emitidaPor: string; rolEmisor: string; medicamentos: RecetaMedicamentoItem[] }
  ): Promise<RecetaHistorial>;
}

export interface AppointmentRepository {
  obtenerCitas(institucionId: InstitucionId, query: FiltrosAgendaQuery): Promise<CitaAgenda[]>;
  obtenerPorId(institucionId: InstitucionId, id: string): Promise<CitaAgenda | null>;
  crear(institucionId: InstitucionId, dto: CrearCitaDTO): Promise<CitaAgenda>;
  reprogramar(
    institucionId: InstitucionId,
    id: string,
    nuevaFecha: string,
    nuevaHora: string,
    motivo: string
  ): Promise<CitaAgenda>;
  cancelar(institucionId: InstitucionId, id: string, motivoCancelacion: string): Promise<CitaAgenda>;
}

export interface ConsultationRepository {
  registrarConsultaCompleta(
    institucionId: InstitucionId,
    dto: RegistroConsultaCompletaDTO,
    profesional: { nombre: string; rol: string }
  ): Promise<DetalleConsultaCompleta>;
  obtenerPorId(
    institucionId: InstitucionId,
    pacienteId: string,
    consultaId: string
  ): Promise<DetalleConsultaCompleta | null>;
  actualizarConsultaFinalizada(
    institucionId: InstitucionId,
    pacienteId: string,
    consultaId: string,
    cambios: Partial<RegistroConsultaCompletaDTO>,
    motivoCorreccion: string,
    autor: string
  ): Promise<DetalleConsultaCompleta>;
}
