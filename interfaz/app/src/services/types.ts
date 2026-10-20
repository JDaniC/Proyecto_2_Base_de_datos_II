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
