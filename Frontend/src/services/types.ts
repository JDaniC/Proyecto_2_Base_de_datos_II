export type InstitucionId =
  | 'HOSPITAL_GENERAL'
  | 'CLINICA_ODONTOLOGICA'
  | 'LABORATORIO_CLINICO'
  | 'CENTRO_PEDIATRICO';

export type MotorBaseDatos = 'PostgreSQL' | 'MySQL' | 'MongoDB' | 'Cloud Firestore';

export type EstadoCuenta = 'ACTIVO' | 'INACTIVO' | 'PENDIENTE';

export type RolId =
  | 'MEDICO'
  | 'SECRETARIA'
  | 'ADMIN_INSTITUCIONAL'
  | 'ODONTOLOGO'
  | 'ANALISTA_LABORATORIO'
  | 'VALIDADOR_LABORATORIO'
  | 'MEDICO_LABORATORIO'
  | 'PEDIATRA';

export type PermisoId =
  | 'pacientes.administrar'
  | 'historial.leer'
  | 'historial.archivar'
  | 'citas.administrar'
  | 'consultas.registrar'
  | 'diagnosticos.registrar'
  | 'tratamientos.registrar'
  | 'recetas.emitir'
  | 'resultados.analizar'
  | 'resultados.validar'
  | 'informes.emitir'
  | 'cobros.administrar'
  | 'inventario.administrar'
  | 'usuarios.administrar'
  | 'auditoria.leer';

export type CategoriaPermiso = 'PACIENTES' | 'CLINICA' | 'LABORATORIO' | 'ADMINISTRACION';

export interface DefinicionPermiso {
  id: PermisoId;
  categoria: CategoriaPermiso;
  nombre: string;
  descripcion: string;
  esCritico: boolean;
}

export interface DefinicionRolInstitucional {
  id: RolId;
  etiqueta: string;
  descripcion: string;
  institucionesPermitidas: InstitucionId[];
  permisos: PermisoId[];
  totalUsuarios?: number;
}

export interface MedicoCatalogo {
  id: string;
  nombre: string;
  colegiado: string;
  especialidadPrincipal: string;
  especialidadesSecundarias: string[];
  email: string;
  telefono: string;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface AseguradoraCatalogo {
  id: string;
  nombre: string;
  codigoAseguradora: string;
  planes: {
    id: string;
    nombrePlan: string;
    porcentajeCobertura: number;
    deducibleBaseGTQ: number;
    activo: boolean;
  }[];
  telefonoAutorizaciones: string;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface ProcedimientoOdontologico {
  id: string;
  codigo: string;
  nombre: string;
  categoria: 'PREVENTIVA' | 'RESTAURADORA' | 'ENDODONCIA' | 'CIRUGIA' | 'PERIODONCIA';
  duracionEstimadaMin: number;
  arancelReferencialGTQ: number;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface PruebaLaboratorioCatalogo {
  id: string;
  codigoPrueba: string;
  nombre: string;
  seccion: string;
  tipoMuestra: string;
  metodoAnalitico: string;
  version: number;
  tiempoEntregaHoras: number;
  parametros: {
    parametroId: string;
    nombre: string;
    unidadMedida: string;
    rangoReferencia: string;
  }[];
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface VacunaCatalogo {
  id: string;
  nombreVacuna: string;
  enfermedadPrevenida: string;
  viaAdministracion: 'INTRADERMICA' | 'INTRAMUSCULAR' | 'SUBCUTANEA' | 'ORAL';
  esquemaVersion: string;
  dosis: {
    dosisId: string;
    numeroDosis: number;
    etiquetaDosis: string;
    edadRecomendadaMeses: number;
    intervaloMinimoSemanas?: number;
  }[];
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface CuentaDemo {
  id: string;
  email: string;
  nombre: string;
  rolId: RolId;
  rolEtiqueta: string;
  institucionId: InstitucionId;
  institucionNombre: string;
  motorObjetivo: MotorBaseDatos;
  colegiado?: string;
  estado: EstadoCuenta;
  permisos: PermisoId[];
  descripcion: string;
  propositoPrueba: string;
}

export interface SesionUsuario {
  cuentaId: string;
  email: string;
  nombre: string;
  rolId: RolId;
  rolEtiqueta: string;
  institucionId: InstitucionId;
  institucionNombre: string;
  motorObjetivo: MotorBaseDatos;
  colegiado?: string;
  permisos: PermisoId[];
  fechaInicio: string;
  tokenSintetico: string;
}

export interface UsuarioInstitucional {
  id: string;
  institucionId: InstitucionId;
  nombreCompleto: string;
  email: string;
  rolId: RolId;
  rolEtiqueta: string;
  estado: EstadoCuenta;
  authUid: string;
  profesionalVinculado?: string;
  fechaCreacion: string;
  ultimoAcceso?: string;
}

export interface CrearUsuarioDTO {
  nombreCompleto: string;
  email: string;
  rolId: RolId;
  estado: EstadoCuenta;
  profesionalVinculado?: string;
}

export type SimulacionEscenario =
  | 'NORMAL'
  | '401_NO_AUTENTICADO'
  | '403_CUENTA_NO_HABILITADA'
  | '503_PERSISTENCIA_NO_DISPONIBLE';

export interface AppError {
  codigo: string;
  mensaje: string;
  status: number;
  correlacion: string;
  campos?: Record<string, string>;
}

// --- Tipos de la Pantalla 01 Aprobada: Dashboard Principal (V03) ---

export interface MetricaOperativa {
  id: string;
  etiqueta: string;
  valor: string | number;
  tendencia?: string;
  colorVariante?: 'primary' | 'info' | 'success' | 'warning';
}

export type EstadoCita = 'PROGRAMADA' | 'EN_CURSO' | 'ATENDIDA' | 'CANCELADA';

export interface CitaDashboard {
  id: string;
  hora: string;
  fecha: string;
  esHoy: boolean;
  pacienteNombre: string;
  pacienteCodigo: string;
  motivo: string;
  profesionalNombre: string;
  estado: EstadoCita;
  consultorioOArea?: string;
}

// --- Tipos de la Pantalla 05 Aprobada: Agenda de Citas (V08 y V09) ---

export interface ReprogramacionRegistro {
  fechaHoraPrevia: string;
  nuevaFechaHora: string;
  motivo: string;
  fechaRegistro: string;
  usuario?: string;
}

export interface CitaAgenda {
  id: string;
  institucionId: InstitucionId;
  pacienteId: string;
  pacienteNombre: string;
  pacienteCodigo: string;
  pacienteTelefono?: string;
  profesionalId: string;
  profesionalNombre: string;
  profesionalRol: string;
  fecha: string; // YYYY-MM-DD
  horaInicio: string; // HH:mm (24 h)
  horaFin: string; // HH:mm (24 h)
  duracionMinutos: number;
  motivo: string;
  estado: EstadoCita;
  consultorio: string;
  motivoCancelacion?: string;
  secretariaGestora?: string;
  historialReprogramaciones?: ReprogramacionRegistro[];
  fechaCreacion: string;
}

export interface FiltrosAgendaQuery {
  fechaDesde: string;
  fechaHasta: string;
  profesionalId?: string;
  estado?: EstadoCita | 'TODOS';
  q?: string;
}

export interface CrearCitaDTO {
  pacienteId: string;
  profesionalId: string;
  fecha: string;
  horaInicio: string;
  duracionMinutos: number;
  motivo: string;
  consultorio?: string;
  secretariaGestora?: string;
  idempotencyKey?: string;
}

export interface ActividadReciente {
  id: string;
  tiempoRelativo: string;
  autor: string;
  rolAutor: string;
  descripcion: string;
  recursoCodigo?: string;
  tipoEvento: 'CONSULTA' | 'RECETA' | 'DIAGNOSTICO' | 'CITA' | 'MUESTRA' | 'INGRESO' | 'AUDITORIA';
}

export interface DashboardData {
  institucionId: InstitucionId;
  institucionNombre: string;
  metricas: MetricaOperativa[];
  citasHoy: CitaDashboard[];
  citasProximas: CitaDashboard[];
  actividades: ActividadReciente[];
}

// --- Tipos de Pacientes (V04 Búsqueda y V05 Alta/Edición) ---

export type TipoIdentificacion = 'CUI' | 'PASAPORTE' | 'SIN_DOCUMENTO_MENOR';

export type SexoAdministrativo = 'MASCULINO' | 'FEMENINO' | 'OTRO';

export type EstadoPaciente = 'ACTIVO' | 'ARCHIVADO';

export type EstadoAlergias = 'SIN_VERIFICAR' | 'SIN_ALERGIAS_CONOCIDAS' | 'CON_ALERGIAS';

export interface ContactoEmergencia {
  nombre: string;
  parentesco: string;
  telefono: string;
}

export interface ResponsablePediatrico {
  id: string;
  nombre: string;
  parentesco: string;
  telefono: string;
  documento?: string;
  esPrincipal: boolean;
  autorizaAtencion: boolean;
}

export interface Paciente {
  id: string; // UUID público canónico
  codigoLegible: string; // ej. HC-HOSP-0104
  institucionId: InstitucionId;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  fechaNacimiento: string; // YYYY-MM-DD
  edadAnios: number;
  sexo: SexoAdministrativo;
  tipoIdentificacion: TipoIdentificacion;
  numeroIdentificacion: string;
  telefono: string;
  correo: string;
  direccion: string;
  estado: EstadoPaciente;
  estadoAlergias: EstadoAlergias;
  contactoEmergencia?: ContactoEmergencia;
  responsables?: ResponsablePediatrico[];
  fechaRegistro: string; // ISO
  historialConsultasCount: number;
  causaArchivo?: CausaArchivo;
  motivoArchivo?: string;
}

export type CausaArchivo = 'TRASLADO' | 'FALLECIMIENTO' | 'OTRA_ADMINISTRATIVA';

export interface AlergiaRegistro {
  sustancia: string;
  severidad: 'LEVE' | 'MODERADA' | 'SEVERA';
  reaccion: string;
}

export interface AntecedentesClinicos {
  patologicos: string[];
  quirurgicos: string[];
  familiares: string[];
  alergias: AlergiaRegistro[];
  medicamentosActuales: string[];
}

export interface SignosVitales {
  pesoKg: number | null;
  tallaCm: number | null;
  temperaturaC: number | null;
  presionSistolica: number | null;
  presionDiastolica: number | null;
  frecuenciaCardiacaLpm: number | null;
  frecuenciaRespiratoriaRpm?: number | null;
  saturacionOxigenoPct?: number | null;
  perimetroCefalicoCm?: number | null;
}

export interface DiagnosticoItemDTO {
  codigoCIE: string;
  nombre: string;
  esPrincipal: boolean;
  observacion?: string;
}

export interface TratamientoItemDTO {
  descripcion: string;
  indicaciones: string;
}

export interface MedicamentoRecetaDTO {
  nombre: string;
  presentacion: string;
  concentracion: string;
  dosis: string;
  unidad: string;
  frecuencia: string;
  duracion: string;
  via: string;
  indicaciones: string;
}

export interface RegistroConsultaCompletaDTO {
  pacienteId: string;
  citaId?: string;
  responsableId?: string;
  motivo: string;
  sintomas: string;
  observaciones?: string;
  signosVitales: SignosVitales;
  diagnosticos: DiagnosticoItemDTO[];
  tratamientos: TratamientoItemDTO[];
  receta?: {
    medicamentos: MedicamentoRecetaDTO[];
    observaciones?: string;
  };
  idempotencyKey: string;
}

export interface RevisionConsultaItem {
  revision: number;
  fechaHora: string;
  autor: string;
  motivo: string;
}

export interface DetalleConsultaCompleta {
  id: string;
  institucionId: InstitucionId;
  pacienteId: string;
  citaId?: string;
  fechaHora: string;
  motivo: string;
  sintomas: string;
  observaciones?: string;
  profesionalNombre: string;
  profesionalRol: string;
  estado: 'ABIERTA' | 'FINALIZADA';
  signosVitales: SignosVitales;
  diagnosticos: DiagnosticoHistorial[];
  tratamientos: TratamientoItemDTO[];
  receta?: RecetaHistorial;
  revision: number;
  historialRevisiones?: RevisionConsultaItem[];
}

export interface ConsultaPaciente {
  id: string;
  fechaHora: string;
  motivo: string;
  sintomas: string;
  profesionalNombre: string;
  profesionalRol: string;
  diagnosticoPrincipal: string;
  estado: 'FINALIZADA' | 'ABIERTA';
  signosVitales?: SignosVitales;
}

export interface DiagnosticoHistorial {
  id: string;
  codigoCIE: string;
  nombre: string;
  esPrincipal: boolean;
  fechaRegistro: string;
  registradoPor: string;
}

export interface RecetaMedicamentoItem {
  nombre: string;
  presentacion: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  via: string;
  indicaciones: string;
}

export interface RecetaHistorial {
  id: string;
  codigoReceta: string;
  fechaEmision: string;
  emitidaPor: string;
  rolEmisor: string;
  estado: 'EMITIDA' | 'DISPENSADA';
  medicamentos: RecetaMedicamentoItem[];
}

export type TipoEventoHistorial =
  | 'CONSULTA'
  | 'RECETA'
  | 'DIAGNOSTICO'
  | 'ARCHIVO'
  | 'REACTIVACION'
  | 'HOSPITALIZACION'
  | 'EXAMEN'
  | 'ORDEN_LAB'
  | 'VACUNA'
  | 'CRECIMIENTO';

export interface EventoHistorial {
  id: string;
  fechaHora: string;
  tipoEvento: TipoEventoHistorial;
  titulo: string;
  descripcion: string;
  profesional: string;
  rolProfesional: string;
  recursoCodigo?: string;
}

export interface ExpedienteCompleto {
  paciente: Paciente;
  antecedentes: AntecedentesClinicos;
  consultas: ConsultaPaciente[];
  diagnosticos: DiagnosticoHistorial[];
  recetas: RecetaHistorial[];
  eventos: EventoHistorial[];
}

export interface BuscarPacientesQuery {
  q?: string;
  estado?: EstadoPaciente | 'TODOS';
  sexo?: SexoAdministrativo | 'TODOS';
  orden?: 'NOMBRE_ASC' | 'NOMBRE_DESC' | 'FECHA_REGISTRO';
  cursor?: string;
  limite?: number;
}

export interface ResultadoPaginadoPacientes {
  items: Paciente[];
  cursorActual?: string;
  siguienteCursor?: string;
  anteriorCursor?: string;
  hayMas: boolean;
  paginaActual: number;
  totalEncontrados: number;
}

export interface CrearPacienteDTO {
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  sexo: SexoAdministrativo;
  tipoIdentificacion: TipoIdentificacion;
  numeroIdentificacion: string;
  telefono: string;
  correo: string;
  direccion: string;
  contactoEmergencia?: ContactoEmergencia;
  responsables?: ResponsablePediatrico[];
  idempotencyKey: string;
}

export interface ActualizarPacienteDTO {
  nombres?: string;
  apellidos?: string;
  fechaNacimiento?: string;
  sexo?: SexoAdministrativo;
  tipoIdentificacion?: TipoIdentificacion;
  numeroIdentificacion?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  contactoEmergencia?: ContactoEmergencia;
  responsables?: ResponsablePediatrico[];
  idempotencyKey: string;
}

export class PacienteDuplicadoException extends Error {
  codigo = '409 PACIENTE_DUPLICADO';
  status = 409;
  pacienteExistenteId: string;
  pacienteExistenteNombre: string;
  pacienteExistenteCodigo: string;
  numeroIdentificacion: string;

  constructor(
    mensaje: string,
    existente: { id: string; nombre: string; codigo: string; numeroIdentificacion: string }
  ) {
    super(mensaje);
    this.name = 'PacienteDuplicadoException';
    this.pacienteExistenteId = existente.id;
    this.pacienteExistenteNombre = existente.nombre;
    this.pacienteExistenteCodigo = existente.codigo;
    this.numeroIdentificacion = existente.numeroIdentificacion;
  }
}

export type AccionAuditoria =
  | 'CREACION'
  | 'MODIFICACION'
  | 'RECTIFICACION_CA10'
  | 'ARCHIVADO_EXPEDIENTE'
  | 'REACTIVACION_EXPEDIENTE'
  | 'CAMBIO_ESTADO_CUENTA'
  | 'ASIGNACION_PERMISOS'
  | 'EMISION_RECETA'
  | 'ACCESO_CLINICO';

export type TipoRecursoAuditoria =
  | 'PACIENTE'
  | 'EXPEDIENTE'
  | 'CONSULTA'
  | 'RECETA'
  | 'USUARIO'
  | 'ROL'
  | 'CATALOGO_MEDICO'
  | 'PRUEBA_LAB';

export type SeveridadAuditoria = 'INFO' | 'ADVERTENCIA' | 'CRITICO';

export interface EventoAuditoria {
  id: string;
  correlacionId: string;
  institucionId: InstitucionId;
  timestamp: string;
  actor: {
    nombre: string;
    email: string;
    rol: string;
    ipOrigen?: string;
  };
  accion: AccionAuditoria;
  tipoRecurso: TipoRecursoAuditoria;
  recursoId: string;
  recursoNombre: string;
  versionAfectada?: string;
  motivoJustificacion?: string;
  severidad: SeveridadAuditoria;
  cambiosDetalle?: {
    campo: string;
    valorAnterior: string | null;
    valorNuevo: string;
  }[];
}

export interface FiltrosAuditoriaQuery {
  actor?: string;
  accion?: string;
  tipoRecurso?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  correlacionId?: string;
}
