import { CuentaDemo, SesionUsuario, SimulacionEscenario } from './types';

export interface IniciarSesionParams {
  cuentaId: string;
  email: string;
  escenario?: SimulacionEscenario;
  simularLatencia?: boolean;
}

export interface AuthRepository {
  obtenerCuentasDemo(): Promise<CuentaDemo[]>;
  iniciarSesion(params: IniciarSesionParams): Promise<SesionUsuario>;
  cerrarSesion(): Promise<void>;
  obtenerSesionActual(): Promise<SesionUsuario | null>;
}
