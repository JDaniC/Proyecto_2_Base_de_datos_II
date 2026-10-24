import {
  ReferenciaLaboratorio,
  CategoriaReferenciaLab,
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
  ResponsablePediatrico,
  AntecedentesClinicos,
  AntecedentesPerinatales,
  AlergiaRegistro,
  ProcedimientoOdontologico,
  PruebaLaboratorioCatalogo,
  VacunaCatalogo,
  AplicacionVacuna,
  ItemEsquemaPaciente,
  RegistrarAplicacionVacunaDTO,
  CorregirAplicacionVacunaDTO,
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
  RegistrarResultadoExamenDTO,
  OrdenLaboratorio,
  FiltrosBandejaLab,
  CrearOrdenLabDTO,
  MuestraLaboratorio,
  EstadoMuestraLaboratorio,
  ResultadoLaboratorio,
  GuardarResultadoBorradorDTO,
  InformeLaboratorio,
  EquipoLaboratorio,
  EstadoEquipoLaboratorio,
  RegistroControlCalidad,
  RegistrarControlCalidadDTO,
  EvaluacionControlCalidad,
  LoteReactivo,
  MovimientoInventario,
  RegistrarMovimientoDTO,
  RegistrarNuevoLoteDTO,
  FacturaLaboratorio,
  PagoLaboratorio,
  RegistrarPagoDTO,
  RevertirPagoDTO,
  AnularFacturaDTO
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
  obtenerProcedimientosPaciente(institucionId: InstitucionId, pacienteId: string): Promise<ProcedimientoHospitalarioItem[]>;
  registrarProcedimientoPaciente(institucionId: InstitucionId, pacienteId: string, proc: Omit<ProcedimientoHospitalarioItem, 'id'>): Promise<ProcedimientoHospitalarioItem>;
  agregarResponsable(institucionId: InstitucionId, pacienteId: string, resp: Omit<ResponsablePediatrico, 'id'>): Promise<ResponsablePediatrico>;
  actualizarResponsable(institucionId: InstitucionId, pacienteId: string, responsableId: string, cambios: Partial<Omit<ResponsablePediatrico, 'id'>>): Promise<ResponsablePediatrico>;
  eliminarResponsable(institucionId: InstitucionId, pacienteId: string, responsableId: string): Promise<void>;
  obtenerAntecedentes?(institucionId: InstitucionId, pacienteId: string): Promise<AntecedentesClinicos>;
  actualizarAntecedentes?(institucionId: InstitucionId, pacienteId: string, antecedentes: AntecedentesClinicos): Promise<AntecedentesClinicos>;
  confirmarSinAlergias?(institucionId: InstitucionId, pacienteId: string, verificadoPor: string): Promise<{ paciente: Paciente; antecedentes: AntecedentesClinicos }>;
  registrarAlergia?(institucionId: InstitucionId, pacienteId: string, alergia: AlergiaRegistro, verificadoPor?: string): Promise<{ paciente: Paciente; antecedentes: AntecedentesClinicos }>;
  eliminarAlergia?(institucionId: InstitucionId, pacienteId: string, sustancia: string): Promise<{ paciente: Paciente; antecedentes: AntecedentesClinicos }>;
  actualizarPerinatales?(institucionId: InstitucionId, pacienteId: string, perinatales: AntecedentesPerinatales): Promise<AntecedentesClinicos>;
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
  agregarProcedimiento(
    institucionId: InstitucionId,
    pacienteId: string,
    consultaId: string,
    proc: Omit<ProcedimientoHospitalarioItem, 'id'>
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
  obtenerReferenciasLaboratorio(institucionId: InstitucionId, categoria: CategoriaReferenciaLab): Promise<ReferenciaLaboratorio[]>;
  guardarReferenciaLaboratorio(institucionId: InstitucionId, referencia: Omit<ReferenciaLaboratorio, 'id'> & { id?: string }): Promise<ReferenciaLaboratorio>;
  obtenerMedicos(institucionId: InstitucionId): Promise<MedicoCatalogo[]>;
  crearMedico(institucionId: InstitucionId, medico: Omit<MedicoCatalogo, 'id'>): Promise<MedicoCatalogo>;
  cambiarEstadoMedico(institucionId: InstitucionId, id: string, estado: 'ACTIVO' | 'INACTIVO'): Promise<MedicoCatalogo>;
  obtenerAseguradoras(institucionId: InstitucionId): Promise<AseguradoraCatalogo[]>;
  obtenerProcedimientosOdontologicos(institucionId: InstitucionId): Promise<ProcedimientoOdontologico[]>;
  crearProcedimientoOdontologico(institucionId: InstitucionId, proc: Omit<ProcedimientoOdontologico, 'id'>): Promise<ProcedimientoOdontologico>;
  obtenerPruebasLaboratorio(institucionId: InstitucionId): Promise<PruebaLaboratorioCatalogo[]>;
  crearPruebaLaboratorio(institucionId: InstitucionId, prueba: Omit<PruebaLaboratorioCatalogo, 'id' | 'version'>): Promise<PruebaLaboratorioCatalogo>;
  crearNuevaVersionPruebaLaboratorio(institucionId: InstitucionId, pruebaId: string, cambios: Partial<Omit<PruebaLaboratorioCatalogo, 'id' | 'version'>>, motivoCambio: string): Promise<PruebaLaboratorioCatalogo>;
  cambiarEstadoPruebaLaboratorio(institucionId: InstitucionId, pruebaId: string, estado: 'ACTIVO' | 'INACTIVO'): Promise<PruebaLaboratorioCatalogo>;
  obtenerVacunas(institucionId: InstitucionId): Promise<VacunaCatalogo[]>;
  crearVacuna?(institucionId: InstitucionId, vacuna: Omit<VacunaCatalogo, 'id'>): Promise<VacunaCatalogo>;
  crearVersionEsquemaVacuna?(
    institucionId: InstitucionId,
    vacunaId: string,
    nuevaVersion: string,
    dosis: VacunaCatalogo['dosis']
  ): Promise<VacunaCatalogo>;
}

export interface VaccineRepository {
  obtenerAplicaciones(institucionId: InstitucionId, pacienteId: string): Promise<AplicacionVacuna[]>;
  obtenerEsquemaCompletoPaciente(
    institucionId: InstitucionId,
    pacienteId: string,
    edadMeses: number
  ): Promise<ItemEsquemaPaciente[]>;
  registrarAplicacion(
    institucionId: InstitucionId,
    pacienteId: string,
    dto: RegistrarAplicacionVacunaDTO,
    profesional: string
  ): Promise<AplicacionVacuna>;
  corregirAplicacion(
    institucionId: InstitucionId,
    aplicacionId: string,
    dto: CorregirAplicacionVacunaDTO,
    profesional: string
  ): Promise<AplicacionVacuna>;
  anularAplicacion(
    institucionId: InstitucionId,
    aplicacionId: string,
    motivo: string,
    profesional: string
  ): Promise<AplicacionVacuna>;
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

export interface LaboratoryRepository {
  obtenerBandeja(institucionId: InstitucionId, filtros?: FiltrosBandejaLab): Promise<OrdenLaboratorio[]>;
  obtenerOrdenPorId(institucionId: InstitucionId, ordenId: string): Promise<OrdenLaboratorio | null>;
  crearOrden(institucionId: InstitucionId, dto: CrearOrdenLabDTO): Promise<OrdenLaboratorio>;
  registrarTrasladoMuestra(institucionId: InstitucionId, muestraId: string, destino: string, actor: string): Promise<MuestraLaboratorio>;
  obtenerMuestras(institucionId: InstitucionId, ordenId?: string): Promise<MuestraLaboratorio[]>;
  actualizarEstadoMuestra(
    institucionId: InstitucionId,
    muestraId: string,
    nuevoEstado: EstadoMuestraLaboratorio,
    motivo?: string,
    actor?: string
  ): Promise<MuestraLaboratorio>;
  registrarRetomaMuestra(
    institucionId: InstitucionId,
    muestraRechazadaId: string,
    motivoRetoma: string,
    actor: string
  ): Promise<MuestraLaboratorio>;
  rectificarDatoMuestra(
    institucionId: InstitucionId,
    muestraId: string,
    campo: 'tuboContenedor' | 'tipoMuestra',
    nuevoValor: string,
    motivo: string,
    actor: string
  ): Promise<MuestraLaboratorio>;
  obtenerResultadosPorOrden(institucionId: InstitucionId, ordenId: string): Promise<ResultadoLaboratorio[]>;
  obtenerResultadoPorId(institucionId: InstitucionId, resultadoId: string): Promise<ResultadoLaboratorio | null>;
  guardarResultadoBorrador(institucionId: InstitucionId, dto: GuardarResultadoBorradorDTO): Promise<ResultadoLaboratorio>;
  validarResultado(
    institucionId: InstitucionId,
    resultadoId: string,
    validadorId: string,
    validadorNombre: string
  ): Promise<ResultadoLaboratorio>;
  corregirResultado(
    institucionId: InstitucionId,
    resultadoId: string,
    dto: GuardarResultadoBorradorDTO,
    motivo: string
  ): Promise<ResultadoLaboratorio>;
  repetirAnalisis(
    institucionId: InstitucionId,
    ordenId: string,
    itemOrdenId: string,
    nuevaMuestraId: string,
    dto: GuardarResultadoBorradorDTO
  ): Promise<ResultadoLaboratorio>;
  obtenerInformePorOrden(institucionId: InstitucionId, ordenId: string): Promise<InformeLaboratorio | null>;
  emitirInforme(
    institucionId: InstitucionId,
    ordenId: string,
    emisorId: string,
    emisorNombre: string,
    emisorColegiado: string,
    conclusiones?: string
  ): Promise<InformeLaboratorio>;
  obtenerEquipos(institucionId: InstitucionId): Promise<EquipoLaboratorio[]>;
  cambiarEstadoEquipo(institucionId: InstitucionId, equipoId: string, nuevoEstado: EstadoEquipoLaboratorio): Promise<EquipoLaboratorio>;
  registrarEquipo(institucionId: InstitucionId, equipo: Omit<EquipoLaboratorio, 'id'>): Promise<EquipoLaboratorio>;
  obtenerControlesCalidad(
    institucionId: InstitucionId,
    filtros?: { equipoId?: string; evaluacion?: EvaluacionControlCalidad | 'TODOS'; busqueda?: string }
  ): Promise<RegistroControlCalidad[]>;
  registrarControlCalidad(
    institucionId: InstitucionId,
    dto: RegistrarControlCalidadDTO,
    analista: { id: string; nombre: string }
  ): Promise<RegistroControlCalidad>;
  obtenerLotesReactivos(institucionId: InstitucionId): Promise<LoteReactivo[]>;
  obtenerMovimientosInventario(institucionId: InstitucionId, loteId?: string): Promise<MovimientoInventario[]>;
  registrarMovimientoInventario(
    institucionId: InstitucionId,
    dto: RegistrarMovimientoDTO,
    actor: { id: string; nombre: string }
  ): Promise<MovimientoInventario>;
  registrarNuevoLoteReactivo(
    institucionId: InstitucionId,
    dto: RegistrarNuevoLoteDTO,
    actor: { id: string; nombre: string }
  ): Promise<LoteReactivo>;
  obtenerFacturas(institucionId: InstitucionId): Promise<FacturaLaboratorio[]>;
  obtenerFacturaPorId(institucionId: InstitucionId, facturaId: string): Promise<FacturaLaboratorio | null>;
  obtenerFacturaPorOrden(institucionId: InstitucionId, ordenId: string): Promise<FacturaLaboratorio | null>;
  registrarPagoFactura(
    institucionId: InstitucionId,
    dto: RegistrarPagoDTO,
    cajero: { id: string; nombre: string }
  ): Promise<{ factura: FacturaLaboratorio; pago: PagoLaboratorio }>;
  revertirPagoFactura(
    institucionId: InstitucionId,
    dto: RevertirPagoDTO,
    actor: { id: string; nombre: string }
  ): Promise<FacturaLaboratorio>;
  anularFactura(
    institucionId: InstitucionId,
    dto: AnularFacturaDTO,
    actor: { id: string; nombre: string }
  ): Promise<FacturaLaboratorio>;
}
