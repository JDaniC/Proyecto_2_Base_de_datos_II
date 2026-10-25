/**
 * Contrato de diseño E00-P1-03; declaraciones puras, sin implementación.
 * E01-P1-02 lo materializa en aplicación/dominio y conserva esta semántica.
 * DTO HTTP en openapi.yaml; nunca importar contratos React ni tipos de drivers.
 */
export type UUID = string;
export type Version = number;
export type FechaCivil = string;
export type InstanteUTC = string;
export type Institucion = 'HOSPITAL_GENERAL' | 'CLINICA_ODONTOLOGICA'
  | 'LABORATORIO_CLINICO' | 'CENTRO_MEDICO_PEDIATRICO';
export type Permiso = 'pacientes.administrar' | 'historial.leer' | 'historial.archivar'
  | 'citas.administrar' | 'consultas.registrar' | 'diagnosticos.registrar'
  | 'tratamientos.registrar' | 'recetas.emitir' | 'usuarios.administrar'
  | 'auditoria.leer' | 'resultados.analizar' | 'resultados.validar'
  | 'informes.emitir' | 'cobros.administrar' | 'inventario.administrar'
  | 'ordenes.administrar' | 'muestras.administrar';
export type Rol = 'ADMIN_INSTITUCIONAL' | 'SECRETARIA' | 'MEDICO' | 'ODONTOLOGO'
  | 'PEDIATRA' | 'MEDICO_LABORATORIO' | 'ANALISTA_LABORATORIO' | 'VALIDADOR_LABORATORIO';
export interface IdentidadVerificada {
  readonly uid: string;
  readonly institucion: Institucion;
  readonly emitidoEn: InstanteUTC;
}
export interface Cuenta {
  readonly id: UUID;
  readonly uid: string;
  readonly institucion: Institucion;
  readonly estado: 'PENDIENTE' | 'ACTIVA' | 'INACTIVA';
  readonly roles: readonly Rol[];
  readonly permisos: readonly Permiso[];
  readonly version: Version;
  readonly profesional?: { readonly id: UUID; readonly activo: boolean };
}
/** Construido únicamente por autenticación tras verificar token + cuenta local. */
export interface ContextoAutenticado {
  readonly identidad: IdentidadVerificada;
  readonly cuenta: Cuenta;
  readonly correlacion: UUID;
}
export interface VerificadorIdentidad {
  /** Incluye firma, audiencia, emisor, vencimiento y revocación, obligatorios. */
  verificar(token: string): Promise<IdentidadVerificada>;
  revocarSesiones(uidVerificado: string): Promise<void>;
}
export interface RepositorioCuenta {
  /** Ya ligado al bundle institucional, sin parámetro de motor/institución. */
  porUid(uidVerificado: string): Promise<Cuenta | null>;
}
export interface Reloj { ahora(): InstanteUTC; }
export interface GeneradorIds { nuevo(): UUID; }
export interface Identificacion { readonly tipo: 'CUI' | 'PASAPORTE'; readonly numero: string; }
/** Proyección de identidad leída sin límites ni catálogo de captura. */
export interface IdentificacionLeida { readonly tipo: string; readonly numero: string; }
export interface PerfilPaciente {
  readonly nombres: string; readonly apellidos: string;
  readonly fechaNacimiento: FechaCivil; readonly sexo: 'MASCULINO' | 'FEMENINO' | 'OTRO';
  readonly identificacion?: Identificacion;
  readonly telefono?: string; readonly correo?: string; readonly direccion?: string;
  readonly grupoSanguineo?: string;
  readonly contactoEmergencia?: { readonly nombres: string; readonly apellidos: string; readonly parentesco: string; readonly telefono: string };
}
export type CausaArchivo = 'TRASLADO' | 'FALLECIMIENTO' | 'OTRA_ADMINISTRATIVA';
export interface ArchivoRegistrado {
  readonly causa: CausaArchivo; readonly motivo: string;
  readonly fechaHora: InstanteUTC; readonly actorId: UUID;
}
export type Paciente = Omit<PerfilPaciente,
  'fechaNacimiento' | 'sexo' | 'identificacion' | 'telefono' | 'correo' | 'direccion' | 'grupoSanguineo'> & {
  readonly fechaNacimiento: FechaCivil | null; readonly sexo: string | null;
  readonly identificacion?: IdentificacionLeida;
  readonly telefono?: string; readonly correo?: string; readonly direccion?: string;
  readonly grupoSanguineo?: string;
  readonly id: UUID; readonly historialId: UUID; readonly version: Version;
  readonly codigoLegible: string; readonly fechaRegistro: InstanteUTC;
} & (
  | { readonly estado: 'ACTIVO'; readonly baja?: never }
  | { readonly estado: 'ARCHIVADO'; readonly baja: ArchivoRegistrado }
);
/** Omitido = conservar; null = retirar del snapshot; valor = reemplazar. */
export type CambioPerfilPaciente = Partial<Pick<PerfilPaciente,
  'nombres' | 'apellidos' | 'fechaNacimiento' | 'sexo'>> & {
  readonly identificacion?: Identificacion | null;
  readonly telefono?: string | null; readonly correo?: string | null;
  readonly direccion?: string | null; readonly grupoSanguineo?: string | null;
  readonly contactoEmergencia?: PerfilPaciente['contactoEmergencia'] | null;
};
export interface CambioDemografico {
  readonly versionEsperada: Version; readonly cambios: CambioPerfilPaciente;
}
export type EventoEstadoPaciente = {
  readonly id: UUID; readonly pacienteId: UUID; readonly versionAnterior: Version;
  readonly fechaHora: InstanteUTC; readonly actorId: UUID;
} & (
  | { readonly tipo: 'ARCHIVO'; readonly baja: ArchivoRegistrado }
  | { readonly tipo: 'REACTIVACION'; readonly bajaAnterior: ArchivoRegistrado;
      readonly motivo: string; readonly correccionFallecimiento: boolean }
);
export type Cita = {
  readonly id: UUID; readonly pacienteId: UUID; readonly profesionalId: UUID;
  readonly fecha: FechaCivil; readonly horaInicio: string; readonly horaFin: string | null;
  readonly duracionMinutos: number | null;
  readonly motivo: string; readonly consultorio?: string; readonly version: Version;
  readonly fechaCreacion: InstanteUTC;
} & (
  | { readonly estado: 'PROGRAMADA' | 'EN_CURSO' | 'ATENDIDA'; readonly motivoCancelacion?: never }
  | { readonly estado: 'CANCELADA'; readonly motivoCancelacion: string }
);
export interface RangoInstantes {
  readonly desde?: InstanteUTC; readonly hastaExclusiva?: InstanteUTC;
}
/** Cancelación/reprogramación conserva motivo propio, horario y estado anteriores. */
export interface RevisionCita {
  readonly id: UUID; readonly citaId: UUID; readonly version: Version;
  readonly fechaHora: InstanteUTC; readonly actorId: UUID; readonly motivoCambio: string;
  readonly anterior: Cita; readonly actual: Cita;
}
export interface RevisionPaciente {
  readonly id: UUID; readonly pacienteId: UUID; readonly anterior: Paciente;
  readonly actorId: UUID; readonly fechaHora: InstanteUTC;
}
/** Presiones/frecuencias enteras; escala peso 3, talla/saturación 2, temperatura 1.
 * DTO inválido se rechaza; no redondear mediciones en adaptadores.
 */
export interface SignosVitales {
  readonly pesoKg?: number | null; readonly tallaCm?: number | null;
  readonly temperaturaC?: number | null; readonly presionSistolica?: number | null;
  readonly presionDiastolica?: number | null; readonly frecuenciaCardiacaLpm?: number | null;
  readonly frecuenciaRespiratoriaRpm?: number | null; readonly saturacionOxigenoPct?: number | null;
  readonly perimetroCefalicoCm?: number | null;
}
export interface DiagnosticoEntrada {
  readonly codigoCie: string; readonly nombre: string;
  readonly esPrincipal: boolean; readonly observacion?: string;
}
export interface TratamientoEntrada { readonly descripcion: string; readonly indicaciones: string; }
export interface MedicamentoEntrada {
  readonly nombre: string; readonly presentacion: string; readonly concentracion: string;
  readonly dosis: string; readonly frecuencia: string;
  readonly duracion: string; readonly via: string; readonly indicaciones: string;
}
export interface RecetaEntrada {
  readonly medicamentos: readonly MedicamentoEntrada[]; readonly observaciones?: string;
}
export interface RecetaEmitida extends Omit<RecetaEntrada, 'medicamentos'> {
  readonly medicamentos: readonly Medicamento[];
  readonly id: UUID; readonly codigoLegible: string; readonly version: Version;
  readonly estado: 'EMITIDA' | 'ANULADA'; readonly fechaEmision: InstanteUTC;
  readonly prescriptor: ProfesionalHistorico;
}
export interface ContenidoClinicoEntrada {
  readonly motivo: string; readonly sintomas: string; readonly observaciones?: string;
  readonly signosVitales: SignosVitales; readonly diagnosticos: readonly DiagnosticoEntrada[];
  readonly tratamientos: readonly TratamientoEntrada[];
  readonly receta?: RecetaEntrada;
}
/** Snapshot persistido/lectura; fecha de receta es propia, sellada por el servidor. */
export interface Diagnostico extends DiagnosticoEntrada {
  readonly id: UUID; readonly fechaRegistro: InstanteUTC; readonly registradoPor: ProfesionalHistorico;
}
export interface Tratamiento extends TratamientoEntrada {
  readonly id: UUID; readonly fechaRegistro: InstanteUTC; readonly registradoPor: ProfesionalHistorico;
}
export interface Medicamento extends MedicamentoEntrada { readonly id: UUID; }
export interface ContenidoClinico extends Omit<ContenidoClinicoEntrada, 'receta' | 'diagnosticos' | 'tratamientos'> {
  readonly diagnosticos: readonly Diagnostico[]; readonly tratamientos: readonly Tratamiento[];
  readonly receta?: RecetaEmitida;
}
export interface Consulta extends ContenidoClinico {
  readonly id: UUID; readonly pacienteId: UUID; readonly citaId?: UUID;
  readonly profesionalId: UUID; readonly profesionalHistorico: ProfesionalHistorico; readonly version: Version;
  readonly estado: 'ABIERTA' | 'FINALIZADA'; readonly fechaHora: InstanteUTC;
  readonly autorizacion?: {
    readonly responsableId: UUID; readonly versionVinculo: Version; readonly autorizaba: true;
    readonly identificacionHistorica: IdentificacionLeida; readonly nombreHistorico: string;
    readonly fechaHora: InstanteUTC;
  };
}
export interface VinculoResponsable {
  readonly responsableId: UUID; readonly pacienteId: UUID;
  readonly parentesco: string;
  readonly version: Version; readonly esPrincipal: boolean;
  readonly autorizaAtencion: boolean; readonly activo: boolean;
}
export interface RevisionConsulta {
  readonly id: UUID; readonly consultaId: UUID; readonly anterior: Consulta;
  /** Versión resultante del cambio; anterior.version identifica el snapshot conservado. */
  readonly version: Version;
  readonly motivo: string; readonly autorId: UUID; readonly fechaHora: InstanteUTC;
}
export interface Pagina<T> { readonly elementos: readonly T[]; readonly siguienteCursor?: string; }
export interface FiltrosPagina { readonly limite: number; readonly cursor?: string; readonly orden: 'ASC' | 'DESC'; }
export type TipoEventoHistorial = 'CONSULTA' | 'DIAGNOSTICO' | 'TRATAMIENTO' | 'RECETA' | 'ARCHIVO'
  | 'REACTIVACION' | 'HOSPITALIZACION' | 'EXAMEN' | 'ORDEN_LAB' | 'RESULTADO_LAB'
  | 'INFORME_LAB' | 'VACUNA' | 'CRECIMIENTO';
export type EventoHistorial = {
  readonly id: UUID; readonly fechaHora: InstanteUTC; readonly recursoId: UUID;
  readonly titulo: string;
} & (
  | { readonly tipo: 'DIAGNOSTICO' | 'TRATAMIENTO' | 'RECETA'; readonly consultaId: UUID;
      readonly versionConsulta: Version }
  | { readonly tipo: 'CONSULTA'; readonly consultaId?: UUID; readonly versionConsulta: Version }
  | { readonly tipo: Exclude<TipoEventoHistorial, 'CONSULTA' | 'DIAGNOSTICO' | 'TRATAMIENTO' | 'RECETA'>;
      readonly consultaId?: UUID; readonly versionConsulta?: never }
);
export interface RepositorioPaciente {
  porId(id: UUID): Promise<Paciente | null>;
  historialEstados(id: UUID, pagina: FiltrosPagina): Promise<Pagina<EventoEstadoPaciente>>;
  buscar(q: string, estado: 'ACTIVO' | 'ARCHIVADO' | 'TODOS', pagina: FiltrosPagina): Promise<Pagina<Paciente>>;
}
export interface FiltrosCitas {
  readonly desde: FechaCivil; readonly hastaExclusiva: FechaCivil;
  readonly profesionalId?: UUID; readonly estado?: Cita['estado']; readonly q?: string;
}
export interface RepositorioCita {
  porId(id: UUID): Promise<Cita | null>;
  revisiones(id: UUID, pagina: FiltrosPagina, rango?: RangoInstantes): Promise<Pagina<RevisionCita>>;
  /** Aplicar TODOS los filtros antes de paginar y vincularlos al cursor. */
  listar(filtros: FiltrosCitas, pagina: FiltrosPagina): Promise<Pagina<Cita>>;
  /** Bloquea/reserva el intervalo en la misma transacción, no valida fuera de UoW. */
  solapamientos(profesionalId: UUID, fecha: FechaCivil, inicio: string, fin: string): Promise<readonly Cita[]>;
}
export interface RepositorioConsulta {
  /** Una cita identifica a lo sumo una consulta; permite estado EN_CURSO derivado. */
  porCita(citaId: UUID): Promise<Consulta | null>;
  porId(id: UUID): Promise<Consulta | null>;
  /** Snapshot exacto por (consulta UUID, versión), vigente o anterior. Nunca fallback
   * a vigente ni búsqueda paginada. null si no existe en el ámbito autorizado.
   * La versión anterior se conserva atómicamente antes de reemplazar la vigente.
   */
  porVersion(id: UUID, version: Version): Promise<Consulta | null>;
  revisiones(id: UUID, pagina: FiltrosPagina, rango?: RangoInstantes): Promise<Pagina<RevisionConsulta>>;
}
export interface ConsultaHistorial {
  /** Mezcla paginada por (fecha_hora, UUID); filtros/ámbito atados al cursor. */
  eventos(pacienteId: UUID, pagina: FiltrosPagina,
    rango?: RangoInstantes,
    tipo?: EventoHistorial['tipo']): Promise<Pagina<EventoHistorial>>;
}
export interface RepositorioIdentidades {
  titular(identidadNormalizada: Identificacion): Promise<UUID | null>;
}
export interface Responsable {
  readonly id: UUID; readonly version: Version;
  readonly nombres: string; readonly apellidos: string; readonly nombre: string;
  readonly telefono: string; readonly documento: IdentificacionLeida;
}
/** Captura nueva conserva el catálogo; el snapshot de lectura admite tipos legados. */
export type ResponsableCapturado = Omit<Responsable, 'documento'> & {
  readonly documento: Identificacion;
};
export interface ProfesionalHistorico {
  readonly id: UUID; readonly nombre: string; readonly rol: Rol;
  readonly colegiado: string; readonly entidadColegiacion: string;
}
export interface RepositorioProfesional {
  porId(id: UUID): Promise<(ProfesionalHistorico & { readonly activo: boolean }) | null>;
}
export interface ResponsablePaciente {
  readonly responsable: Responsable;
  readonly vinculo: VinculoResponsable;
}
export interface RepositorioResponsables {
  /** Recarga por paciente: resolver vínculo y snapshot sin IDs conocidos de antemano. */
  porPaciente(pacienteId: UUID, pagina: FiltrosPagina): Promise<Pagina<ResponsablePaciente>>;
  porId(id: UUID): Promise<Responsable | null>;
  porDocumento(documento: Identificacion): Promise<Responsable | null>;
  vinculo(pacienteId: UUID, responsableId: UUID): Promise<VinculoResponsable | null>;
}
export interface ComandoEstable {
  readonly id: UUID; readonly clave: UUID; readonly caso: string;
  readonly hashEntrada: string; readonly instante: InstanteUTC;
  /** UUID de datos/revisiones/eventos fijados antes de entrar al callback repetible. */
  readonly ids: Readonly<Record<string, UUID>>;
}
export interface ResultadoDurable<T> {
  readonly httpStatus: number;
  readonly respuesta: T;
  readonly correlacionOriginal: UUID;
}
export interface Operacion<T> {
  readonly hashEntrada: string;
  readonly resultado: ResultadoDurable<T>;
}
export interface RepositorioOperaciones {
  /** Clave efectiva: institución del bundle + actor + caso + clave. */
  porClave<T>(actorId: UUID, caso: string, clave: UUID): Promise<Operacion<T> | null>;
}
export interface LectorTransaccional {
  readonly cuentas: RepositorioCuenta;
  readonly pacientes: RepositorioPaciente;
  readonly identidades: RepositorioIdentidades;
  readonly citas: RepositorioCita;
  readonly consultas: RepositorioConsulta;
  readonly responsables: RepositorioResponsables;
  readonly profesionales: RepositorioProfesional;
  readonly operaciones: RepositorioOperaciones;
}
/** Cambios de agregado, nunca SQL, paths de documentos ni nombres de tabla. */
export type CambioComun =
  | { readonly tipo: 'ALTA_PACIENTE'; readonly paciente: Paciente }
  | { readonly tipo: 'CAMBIO_PACIENTE'; readonly anterior: Version; readonly paciente: Paciente }
  | { readonly tipo: 'GUARDAR_CITA'; readonly anterior: Version | null; readonly cita: Cita }
  | { readonly tipo: 'GUARDAR_CONSULTA'; readonly anterior: Version | null; readonly consulta: Consulta }
  | { readonly tipo: 'RESERVAR_IDENTIDAD'; readonly identidad: Identificacion; readonly pacienteId: UUID }
  | { readonly tipo: 'LIBERAR_IDENTIDAD'; readonly identidad: IdentificacionLeida; readonly pacienteId: UUID }
  | { readonly tipo: 'AVANZAR_HISTORIAL'; readonly pacienteId: UUID; readonly anterior: Version }
  | { readonly tipo: 'ALTA_RESPONSABLE'; readonly responsable: ResponsableCapturado }
  | { readonly tipo: 'VINCULAR_RESPONSABLE'; readonly vinculo: VinculoResponsable };
export interface EventoAuditoria {
  readonly id: UUID; readonly actorId: UUID; readonly caso: string;
  readonly recursoId: UUID; readonly fechaHora: InstanteUTC; readonly correlacion: UUID;
  // Sin payload clínico. Actor/institución se sellan dentro del adaptador autorizado.
}
export interface PlanConfirmacion<T> {
  readonly tipo: 'CONFIRMAR';
  readonly cambios: readonly CambioComun[];
  readonly revisiones: readonly RevisionConsulta[];
  readonly revisionesCita: readonly RevisionCita[];
  readonly revisionesPaciente: readonly RevisionPaciente[];
  readonly eventosHistorial: readonly EventoHistorial[];
  /** Persistir con el cambio de estado; conserva causa/motivo después de reactivar. */
  readonly estadosPaciente: readonly EventoEstadoPaciente[];
  readonly auditoria: readonly EventoAuditoria[];
  readonly resultado: ResultadoDurable<T>;
  // UoW añade operación idempotente y sus reservas al mismo commit.
}
export interface PlanRepeticion<T> {
  readonly tipo: 'REPETIR'; readonly operacion: Operacion<T>;
}
export interface UnidadDeTrabajo {
  /**
   * Callback sin efectos externos, sin commits y sin lecturas después del plan.
   * Revalida cuenta actual, permisos, pertenencia y versiones en cada intento.
   * Valida clave/hash, aplica cambios+reservas+revisiones+operación+auditoría juntos.
   * Un fallo revierte todo; reintentos transitorios completos <=3 con plazo acotado.
   * Commit incierto: reconciliar operación durable antes de volver a aplicar.
   */
  ejecutar<T>(contexto: ContextoAutenticado, comando: ComandoEstable,
    planificar: (lector: LectorTransaccional) => Promise<PlanConfirmacion<T> | PlanRepeticion<T>>
  ): Promise<ResultadoDurable<T>>;
}
/** Bundle inmutable por petición, resuelto fuera de dominio y sin motor en comandos. */
export interface BundleInstitucional {
  readonly citas: RepositorioCita;
  readonly identidades: RepositorioIdentidades;
  readonly profesionales: RepositorioProfesional;
  readonly unidadDeTrabajo: UnidadDeTrabajo;
  readonly pacientes: RepositorioPaciente;
  readonly consultas: RepositorioConsulta;
  readonly responsables: RepositorioResponsables;
  readonly historial: ConsultaHistorial;
  readonly cuenta: RepositorioCuenta;
}
