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
  DetalleConsultaCompleta,
  UsuarioInstitucional,
  CrearUsuarioDTO,
  EstadoCuenta,
  DefinicionRolInstitucional,
  DefinicionPermiso,
  PermisoId,
  MedicoCatalogo,
  AseguradoraCatalogo,
  PolizaSeguroPaciente,
  AfiliarPolizaDTO,
  ProcedimientoOdontologico,
  PruebaLaboratorioCatalogo,
  VacunaCatalogo,
  EventoAuditoria,
  FiltrosAuditoriaQuery,
  HospitalizacionItem,
  CamaHospitalaria,
  EstadoCama,
  NotaEvolucionItem,
  ProcedimientoHospitalarioItem,
  CrearIngresoHospitalarioDTO,
  RegistrarEgresoHospitalarioDTO,
  OrdenExamenHospital,
  ResultadoExamenHospital,
  CrearOrdenExamenDTO,
  RegistrarResultadoExamenDTO
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
  obtenerPolizasSeguro(institucionId: InstitucionId, pacienteId: string): Promise<PolizaSeguroPaciente[]>;
  afiliarPolizaSeguro(institucionId: InstitucionId, pacienteId: string, dto: AfiliarPolizaDTO): Promise<PolizaSeguroPaciente>;
  cambiarEstadoPoliza(institucionId: InstitucionId, pacienteId: string, polizaId: string, estado: 'ACTIVA' | 'VENCIDA' | 'SUSPENDIDA'): Promise<PolizaSeguroPaciente>;
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

export interface UserRepository {
  listarUsuarios(institucionId: InstitucionId): Promise<UsuarioInstitucional[]>;
  crearUsuario(institucionId: InstitucionId, dto: CrearUsuarioDTO): Promise<UsuarioInstitucional>;
  cambiarEstado(institucionId: InstitucionId, usuarioId: string, nuevoEstado: EstadoCuenta): Promise<UsuarioInstitucional>;
  obtenerRolesInstitucionales(institucionId: InstitucionId): Promise<DefinicionRolInstitucional[]>;
  obtenerCatalogoPermisos(): Promise<DefinicionPermiso[]>;
  actualizarPermisosRol(institucionId: InstitucionId, rolId: RolId, permisos: PermisoId[]): Promise<DefinicionRolInstitucional>;
}

export interface CatalogRepository {
  obtenerMedicos(institucionId: InstitucionId): Promise<MedicoCatalogo[]>;
  crearMedico(institucionId: InstitucionId, medico: Omit<MedicoCatalogo, 'id'>): Promise<MedicoCatalogo>;
  cambiarEstadoMedico(institucionId: InstitucionId, id: string, estado: 'ACTIVO' | 'INACTIVO'): Promise<MedicoCatalogo>;
  obtenerAseguradoras(institucionId: InstitucionId): Promise<AseguradoraCatalogo[]>;
  obtenerProcedimientosOdontologicos(institucionId: InstitucionId): Promise<ProcedimientoOdontologico[]>;
  obtenerPruebasLaboratorio(institucionId: InstitucionId): Promise<PruebaLaboratorioCatalogo[]>;
  obtenerVacunas(institucionId: InstitucionId): Promise<VacunaCatalogo[]>;
}

export interface AuditRepository {
  consultarEventos(institucionId: InstitucionId, filtros: FiltrosAuditoriaQuery): Promise<EventoAuditoria[]>;
  obtenerEventoPorId(institucionId: InstitucionId, id: string): Promise<EventoAuditoria | null>;
  registrarEvento(institucionId: InstitucionId, evento: Omit<EventoAuditoria, 'id' | 'correlacionId' | 'timestamp' | 'institucionId'>): Promise<EventoAuditoria>;
}

export interface HospitalizationRepository {
  listarHospitalizaciones(institucionId: InstitucionId, filtroEstado?: string): Promise<HospitalizacionItem[]>;
  obtenerHospitalizacionPorId(institucionId: InstitucionId, id: string): Promise<HospitalizacionItem | null>;
  obtenerHospitalizacionesPorPaciente(institucionId: InstitucionId, pacienteId: string): Promise<HospitalizacionItem[]>;
  crearIngreso(institucionId: InstitucionId, dto: CrearIngresoHospitalarioDTO): Promise<HospitalizacionItem>;
  registrarEgreso(institucionId: InstitucionId, hospitalizacionId: string, dto: RegistrarEgresoHospitalarioDTO): Promise<HospitalizacionItem>;
  listarCamas(institucionId: InstitucionId): Promise<CamaHospitalaria[]>;
  asignarCama(institucionId: InstitucionId, hospitalizacionId: string, nuevaCamaId: string, fechaInicio: string, motivo: string): Promise<HospitalizacionItem>;
  liberarCama(institucionId: InstitucionId, hospitalizacionId: string, fechaFin: string): Promise<HospitalizacionItem>;
  cambiarEstadoCama(institucionId: InstitucionId, camaId: string, nuevoEstado: EstadoCama): Promise<CamaHospitalaria>;
  agregarNotaEvolucion(institucionId: InstitucionId, hospitalizacionId: string, nota: Omit<NotaEvolucionItem, 'id'>): Promise<HospitalizacionItem>;
  agregarProcedimiento(institucionId: InstitucionId, hospitalizacionId: string, proc: Omit<ProcedimientoHospitalarioItem, 'id'>): Promise<HospitalizacionItem>;
}

export interface HospitalExamRepository {
  listarOrdenes(institucionId: InstitucionId, filtroEstado?: string): Promise<OrdenExamenHospital[]>;
  obtenerOrdenPorId(institucionId: InstitucionId, id: string): Promise<OrdenExamenHospital | null>;
  obtenerOrdenesPorPaciente(institucionId: InstitucionId, pacienteId: string): Promise<OrdenExamenHospital[]>;
  crearOrden(institucionId: InstitucionId, dto: CrearOrdenExamenDTO): Promise<OrdenExamenHospital>;
  cancelarOrden(institucionId: InstitucionId, ordenId: string, motivo: string): Promise<OrdenExamenHospital>;
  obtenerResultadosPorOrden(institucionId: InstitucionId, ordenId: string): Promise<ResultadoExamenHospital[]>;
  obtenerResultadoPorId(institucionId: InstitucionId, resultadoId: string): Promise<ResultadoExamenHospital | null>;
  obtenerResultadosPorPaciente(institucionId: InstitucionId, pacienteId: string): Promise<ResultadoExamenHospital[]>;
  registrarResultado(institucionId: InstitucionId, dto: RegistrarResultadoExamenDTO): Promise<ResultadoExamenHospital>;
}
