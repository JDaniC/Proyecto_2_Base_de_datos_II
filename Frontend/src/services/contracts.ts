/**
 * Contratos de servicios de presentación y frontera de integración HTTP (E00-P2-02).
 *
 * Reglas de mapeo hacia `/api/v1` (DEC06–DEC13):
 * 1. Autoridad e institución (DEC06, DEC07): los parámetros `institucionId`, `profesional`,
 *    `autor`, `registradoPor`, `emitidaPor`, `rolEmisor`, `verificadoPor`, `secretariaGestora`,
 *    `analista`, `validadorId`/`validadorNombre`, `emisorId`/`emisorNombre`/`emisorColegiado`,
 *    `cajero` y `actor` existen únicamente para los repositorios simulados (`src/mocks/`).
 *    El adaptador HTTP los omite en el request y el backend los deriva del token Firebase
 *    verificado y la cuenta institucional activa (`CENTRO_PEDIATRICO` <-> `CENTRO_MEDICO_PEDIATRICO`).
 * 2. Concurrencia e idempotencia (DEC08): las mutaciones incluyen `versionEsperada` (`version_esperada`)
 *    y `Idempotency-Key` estable por intención de formulario.
 * 3. Contratos excluidos (DEC11): los métodos marcados con `@deprecated` corresponden a pantallas
 *    retiradas (matriz editable de permisos, CRUD de médicos/camas, selector demo o dashboard
 *    simulado) o a escritura directa de auditoría; no se publican como endpoints HTTP.
 */
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
  /**
   * @deprecated Excluido del alcance HTTP (DEC11 / limpieza de LoginPage): solo helper de pruebas mock.
   */
  obtenerCuentasDemo(): Promise<CuentaDemo[]>;
  iniciarSesion(params: IniciarSesionParams): Promise<SesionUsuario>;
  cerrarSesion(): Promise<void>;
  obtenerSesionActual(): Promise<SesionUsuario | null>;
}

export interface DashboardRepository {
  /**
   * @deprecated Excluido del alcance HTTP: `DashboardPage.tsx` navega por capacidades de sesión sin endpoint de métricas simuladas.
   */
  obtenerDashboard(institucionId: InstitucionId, rolId: RolId): Promise<DashboardData>;
}

export interface PatientRepository {
  buscar(institucionId: InstitucionId, query: BuscarPacientesQuery): Promise<ResultadoPaginadoPacientes>;
  obtenerPorId(institucionId: InstitucionId, id: string): Promise<Paciente | null>;
  obtenerExpedienteCompleto(institucionId: InstitucionId, id: string): Promise<ExpedienteCompleto | null>;
  crear(institucionId: InstitucionId, dto: CrearPacienteDTO): Promise<Paciente>;
  actualizar(institucionId: InstitucionId, id: string, dto: ActualizarPacienteDTO): Promise<Paciente>;
  archivar(institucionId: InstitucionId, id: string, causa: CausaArchivo, motivo: string, versionEsperada?: number): Promise<Paciente>;
  reactivar(institucionId: InstitucionId, id: string, motivo: string, correccionFallecimiento?: boolean, versionEsperada?: number): Promise<Paciente>;
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
  cambiarEstadoPoliza(institucionId: InstitucionId, pacienteId: string, polizaId: string, estado: 'ACTIVA' | 'VENCIDA' | 'SUSPENDIDA', versionEsperada?: number): Promise<PolizaSeguroPaciente>;
  obtenerProcedimientosPaciente(institucionId: InstitucionId, pacienteId: string): Promise<ProcedimientoHospitalarioItem[]>;
  registrarProcedimientoPaciente(institucionId: InstitucionId, pacienteId: string, proc: Omit<ProcedimientoHospitalarioItem, 'id'>): Promise<ProcedimientoHospitalarioItem>;
  agregarResponsable(institucionId: InstitucionId, pacienteId: string, resp: Omit<ResponsablePediatrico, 'id'>): Promise<ResponsablePediatrico>;
  actualizarResponsable(institucionId: InstitucionId, pacienteId: string, responsableId: string, cambios: Partial<Omit<ResponsablePediatrico, 'id'>>, versionEsperada?: number): Promise<ResponsablePediatrico>;
  eliminarResponsable(institucionId: InstitucionId, pacienteId: string, responsableId: string, versionEsperada?: number): Promise<void>;
  /** @remarks Sin llamada directa en UI actual: absorbido en `obtenerExpedienteCompleto`. */
  obtenerAntecedentes?(institucionId: InstitucionId, pacienteId: string): Promise<AntecedentesClinicos>;
  /** @remarks Sin llamada directa en UI actual: en Pediatría se usan `confirmarSinAlergias`, `registrarAlergia`, `eliminarAlergia` y `actualizarPerinatales`. */
  actualizarAntecedentes?(institucionId: InstitucionId, pacienteId: string, antecedentes: AntecedentesClinicos, versionEsperada?: number): Promise<AntecedentesClinicos>;
  confirmarSinAlergias?(institucionId: InstitucionId, pacienteId: string, verificadoPor: string, versionEsperada?: number): Promise<{ paciente: Paciente; antecedentes: AntecedentesClinicos }>;
  registrarAlergia?(institucionId: InstitucionId, pacienteId: string, alergia: AlergiaRegistro, verificadoPor?: string, versionEsperada?: number): Promise<{ paciente: Paciente; antecedentes: AntecedentesClinicos }>;
  eliminarAlergia?(institucionId: InstitucionId, pacienteId: string, sustancia: string, versionEsperada?: number): Promise<{ paciente: Paciente; antecedentes: AntecedentesClinicos }>;
  actualizarPerinatales?(institucionId: InstitucionId, pacienteId: string, perinatales: AntecedentesPerinatales, versionEsperada?: number): Promise<AntecedentesClinicos>;
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
    motivo: string,
    versionEsperada?: number
  ): Promise<CitaAgenda>;
  cancelar(institucionId: InstitucionId, id: string, motivoCancelacion: string, versionEsperada?: number): Promise<CitaAgenda>;
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
    autor: string,
    versionEsperada?: number
  ): Promise<DetalleConsultaCompleta>;
  agregarProcedimiento(
    institucionId: InstitucionId,
    pacienteId: string,
    consultaId: string,
    proc: Omit<ProcedimientoHospitalarioItem, 'id'>,
    versionEsperada?: number
  ): Promise<DetalleConsultaCompleta>;
}

export interface UserRepository {
  listarUsuarios(institucionId: InstitucionId): Promise<UsuarioInstitucional[]>;
  crearUsuario(institucionId: InstitucionId, dto: CrearUsuarioDTO): Promise<UsuarioInstitucional>;
  cambiarEstado(institucionId: InstitucionId, usuarioId: string, nuevoEstado: EstadoCuenta, versionEsperada?: number): Promise<UsuarioInstitucional>;
  /**
   * @deprecated Excluido del alcance HTTP (DEC11): roles fijos por institución, sin matriz editable de permisos.
   */
  obtenerRolesInstitucionales(institucionId: InstitucionId): Promise<DefinicionRolInstitucional[]>;
  /**
   * @deprecated Excluido del alcance HTTP (DEC11): roles fijos por institución, sin matriz editable de permisos.
   */
  obtenerCatalogoPermisos(): Promise<DefinicionPermiso[]>;
  /**
   * @deprecated Excluido del alcance HTTP (DEC11): prohibido editar matriz de permisos por rol desde UI/API.
   */
  actualizarPermisosRol(institucionId: InstitucionId, rolId: RolId, permisos: PermisoId[]): Promise<DefinicionRolInstitucional>;
}

export interface CatalogRepository {
  obtenerReferenciasLaboratorio(institucionId: InstitucionId, categoria: CategoriaReferenciaLab): Promise<ReferenciaLaboratorio[]>;
  guardarReferenciaLaboratorio(institucionId: InstitucionId, referencia: Omit<ReferenciaLaboratorio, 'id'> & { id?: string }, versionEsperada?: number): Promise<ReferenciaLaboratorio>;
  obtenerMedicos(institucionId: InstitucionId): Promise<MedicoCatalogo[]>;
  /**
   * @deprecated Excluido del alcance HTTP (DEC11): sin CRUD administrativo de médicos; provisión y seed controlados.
   */
  crearMedico(institucionId: InstitucionId, medico: Omit<MedicoCatalogo, 'id'>): Promise<MedicoCatalogo>;
  /**
   * @deprecated Excluido del alcance HTTP (DEC11): sin CRUD administrativo de médicos; provisión y seed controlados.
   */
  cambiarEstadoMedico(institucionId: InstitucionId, id: string, estado: 'ACTIVO' | 'INACTIVO'): Promise<MedicoCatalogo>;
  obtenerAseguradoras(institucionId: InstitucionId): Promise<AseguradoraCatalogo[]>;
  /** @remarks Selector de solo lectura por seed para atención odontológica (`E04-P1-01`); actualmente `NewConsultationWizardPage.tsx` usa constante local. */
  obtenerProcedimientosOdontologicos(institucionId: InstitucionId): Promise<ProcedimientoOdontologico[]>;
  /**
   * @deprecated Excluido del alcance HTTP (DEC11): catálogos odontológicos por seed + selectores, sin alta en UI.
   */
  crearProcedimientoOdontologico(institucionId: InstitucionId, proc: Omit<ProcedimientoOdontologico, 'id'>): Promise<ProcedimientoOdontologico>;
  obtenerPruebasLaboratorio(institucionId: InstitucionId): Promise<PruebaLaboratorioCatalogo[]>;
  crearPruebaLaboratorio(institucionId: InstitucionId, prueba: Omit<PruebaLaboratorioCatalogo, 'id' | 'version'>): Promise<PruebaLaboratorioCatalogo>;
  crearNuevaVersionPruebaLaboratorio(institucionId: InstitucionId, pruebaId: string, cambios: Partial<Omit<PruebaLaboratorioCatalogo, 'id' | 'version'>>, motivoCambio: string, versionEsperada?: number): Promise<PruebaLaboratorioCatalogo>;
  cambiarEstadoPruebaLaboratorio(institucionId: InstitucionId, pruebaId: string, estado: 'ACTIVO' | 'INACTIVO', versionEsperada?: number): Promise<PruebaLaboratorioCatalogo>;
  obtenerVacunas(institucionId: InstitucionId): Promise<VacunaCatalogo[]>;
  crearVacuna?(institucionId: InstitucionId, vacuna: Omit<VacunaCatalogo, 'id'>): Promise<VacunaCatalogo>;
  crearVersionEsquemaVacuna?(
    institucionId: InstitucionId,
    vacunaId: string,
    nuevaVersion: string,
    dosis: VacunaCatalogo['dosis'],
    versionEsperada?: number
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
    profesional: string,
    versionEsperada?: number
  ): Promise<AplicacionVacuna>;
  anularAplicacion(
    institucionId: InstitucionId,
    aplicacionId: string,
    motivo: string,
    profesional: string,
    versionEsperada?: number
  ): Promise<AplicacionVacuna>;
}

export interface AuditRepository {
  consultarEventos(institucionId: InstitucionId, filtros: FiltrosAuditoriaQuery): Promise<EventoAuditoria[]>;
  /** @remarks Sin llamada directa en UI actual: `DetalleEventoAuditoriaModal` usa el ítem cargado en `consultarEventos`. */
  obtenerEventoPorId(institucionId: InstitucionId, id: string): Promise<EventoAuditoria | null>;
  /**
   * @deprecated Excluido del alcance HTTP (`plan/03_CONTRATOS_Y_FLUJOS.md` §2): el servidor genera la auditoría dentro de cada UoW; nunca se acepta desde React.
   */
  registrarEvento(institucionId: InstitucionId, evento: Omit<EventoAuditoria, 'id' | 'correlacionId' | 'timestamp' | 'institucionId'>): Promise<EventoAuditoria>;
}

export interface HospitalizationRepository {
  listarHospitalizaciones(institucionId: InstitucionId, filtroEstado?: string): Promise<HospitalizacionItem[]>;
  obtenerHospitalizacionPorId(institucionId: InstitucionId, id: string): Promise<HospitalizacionItem | null>;
  /** @remarks Sin llamada directa en UI actual: cubierto por `listarHospitalizaciones` y `obtenerExpedienteCompleto`. */
  obtenerHospitalizacionesPorPaciente(institucionId: InstitucionId, pacienteId: string): Promise<HospitalizacionItem[]>;
  crearIngreso(institucionId: InstitucionId, dto: CrearIngresoHospitalarioDTO): Promise<HospitalizacionItem>;
  registrarEgreso(institucionId: InstitucionId, hospitalizacionId: string, dto: RegistrarEgresoHospitalarioDTO): Promise<HospitalizacionItem>;
  listarCamas(institucionId: InstitucionId): Promise<CamaHospitalaria[]>;
  asignarCama(institucionId: InstitucionId, hospitalizacionId: string, nuevaCamaId: string, fechaInicio: string, motivo: string, versionEsperada?: number): Promise<HospitalizacionItem>;
  liberarCama(institucionId: InstitucionId, hospitalizacionId: string, fechaFin: string, versionEsperada?: number): Promise<HospitalizacionItem>;
  /**
   * @deprecated Excluido del alcance HTTP (DEC11): camas solo cambian por disponibilidad/asignación en ingreso, traslado o egreso, sin CRUD de camas.
   */
  cambiarEstadoCama(institucionId: InstitucionId, camaId: string, nuevoEstado: EstadoCama): Promise<CamaHospitalaria>;
  agregarNotaEvolucion(institucionId: InstitucionId, hospitalizacionId: string, nota: Omit<NotaEvolucionItem, 'id'>, versionEsperada?: number): Promise<HospitalizacionItem>;
  agregarProcedimiento(institucionId: InstitucionId, hospitalizacionId: string, proc: Omit<ProcedimientoHospitalarioItem, 'id'>, versionEsperada?: number): Promise<HospitalizacionItem>;
}

export interface HospitalExamRepository {
  listarOrdenes(institucionId: InstitucionId, filtroEstado?: string): Promise<OrdenExamenHospital[]>;
  /** @remarks Sin llamada directa en UI actual: el detalle usa la orden ya cargada en listado/expediente. */
  obtenerOrdenPorId(institucionId: InstitucionId, id: string): Promise<OrdenExamenHospital | null>;
  obtenerOrdenesPorPaciente(institucionId: InstitucionId, pacienteId: string): Promise<OrdenExamenHospital[]>;
  crearOrden(institucionId: InstitucionId, dto: CrearOrdenExamenDTO, catalogoPruebas?: PruebaLaboratorioCatalogo[]): Promise<OrdenExamenHospital>;
  cancelarOrden(institucionId: InstitucionId, ordenId: string, motivo: string, versionEsperada?: number): Promise<OrdenExamenHospital>;
  obtenerResultadosPorOrden(institucionId: InstitucionId, ordenId: string): Promise<ResultadoExamenHospital[]>;
  /** @remarks Sin llamada directa en UI actual: los resultados se consultan por orden (`obtenerResultadosPorOrden`). */
  obtenerResultadoPorId(institucionId: InstitucionId, resultadoId: string): Promise<ResultadoExamenHospital | null>;
  /** @remarks Sin llamada directa en UI actual: `PatientExamsView` consulta `obtenerOrdenesPorPaciente` y luego `obtenerResultadosPorOrden`. */
  obtenerResultadosPorPaciente(institucionId: InstitucionId, pacienteId: string): Promise<ResultadoExamenHospital[]>;
  registrarResultado(institucionId: InstitucionId, dto: RegistrarResultadoExamenDTO, catalogoPruebas?: PruebaLaboratorioCatalogo[]): Promise<ResultadoExamenHospital>;
}

export interface LaboratoryRepository {
  obtenerBandeja(institucionId: InstitucionId, filtros?: FiltrosBandejaLab): Promise<OrdenLaboratorio[]>;
  obtenerOrdenPorId(institucionId: InstitucionId, ordenId: string): Promise<OrdenLaboratorio | null>;
  crearOrden(institucionId: InstitucionId, dto: CrearOrdenLabDTO): Promise<OrdenLaboratorio>;
  registrarTrasladoMuestra(institucionId: InstitucionId, muestraId: string, destino: string, actor: string, versionEsperada?: number): Promise<MuestraLaboratorio>;
  obtenerMuestras(institucionId: InstitucionId, ordenId?: string): Promise<MuestraLaboratorio[]>;
  actualizarEstadoMuestra(
    institucionId: InstitucionId,
    muestraId: string,
    nuevoEstado: EstadoMuestraLaboratorio,
    motivo?: string,
    actor?: string,
    versionEsperada?: number
  ): Promise<MuestraLaboratorio>;
  registrarRetomaMuestra(
    institucionId: InstitucionId,
    muestraRechazadaId: string,
    motivoRetoma: string,
    actor: string,
    versionEsperada?: number
  ): Promise<MuestraLaboratorio>;
  rectificarDatoMuestra(
    institucionId: InstitucionId,
    muestraId: string,
    campo: 'tuboContenedor' | 'tipoMuestra',
    nuevoValor: string,
    motivo: string,
    actor: string,
    versionEsperada?: number
  ): Promise<MuestraLaboratorio>;
  obtenerResultadosPorOrden(institucionId: InstitucionId, ordenId: string): Promise<ResultadoLaboratorio[]>;
  /** @remarks Sin llamada directa en UI actual: captura, validación e informe usan `obtenerResultadosPorOrden`. */
  obtenerResultadoPorId(institucionId: InstitucionId, resultadoId: string): Promise<ResultadoLaboratorio | null>;
  guardarResultadoBorrador(institucionId: InstitucionId, dto: GuardarResultadoBorradorDTO): Promise<ResultadoLaboratorio>;
  validarResultado(
    institucionId: InstitucionId,
    resultadoId: string,
    validadorId: string,
    validadorNombre: string,
    versionEsperada?: number
  ): Promise<ResultadoLaboratorio>;
  corregirResultado(
    institucionId: InstitucionId,
    resultadoId: string,
    dto: GuardarResultadoBorradorDTO,
    motivo: string,
    versionEsperada?: number
  ): Promise<ResultadoLaboratorio>;
  repetirAnalisis(
    institucionId: InstitucionId,
    ordenId: string,
    itemOrdenId: string,
    nuevaMuestraId: string,
    dto: GuardarResultadoBorradorDTO,
    versionEsperada?: number
  ): Promise<ResultadoLaboratorio>;
  obtenerInformePorOrden(institucionId: InstitucionId, ordenId: string): Promise<InformeLaboratorio | null>;
  emitirInforme(
    institucionId: InstitucionId,
    ordenId: string,
    emisorId: string,
    emisorNombre: string,
    emisorColegiado: string,
    conclusiones?: string,
    versionEsperada?: number
  ): Promise<InformeLaboratorio>;
  obtenerEquipos(institucionId: InstitucionId): Promise<EquipoLaboratorio[]>;
  cambiarEstadoEquipo(institucionId: InstitucionId, equipoId: string, nuevoEstado: EstadoEquipoLaboratorio, versionEsperada?: number): Promise<EquipoLaboratorio>;
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
  /** @remarks Sin llamada directa en UI actual: `BillingPaymentsPage` carga `obtenerFacturas`. */
  obtenerFacturaPorId(institucionId: InstitucionId, facturaId: string): Promise<FacturaLaboratorio | null>;
  /** @remarks Sin llamada directa en vistas actuales (usado en `ProductScope.test.tsx`); se sirve vía `GET /api/v1/laboratorio/facturas?ordenId={id}`. */
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
