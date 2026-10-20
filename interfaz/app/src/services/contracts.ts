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
  CausaArchivo
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
}
