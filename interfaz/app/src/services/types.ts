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
