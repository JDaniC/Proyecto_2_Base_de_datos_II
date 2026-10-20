import { AuthRepository, IniciarSesionParams } from '../services/contracts';
import { CuentaDemo, SesionUsuario, AppError } from '../services/types';
import { DEMO_ACCOUNTS } from './demoAccounts';

const STORAGE_KEY = 'clinica_demo_sesion_v1';

export class MockAuthRepository implements AuthRepository {
  private cuentas: CuentaDemo[] = [...DEMO_ACCOUNTS];

  private generarCorrelacion(): string {
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const rand = Math.random().toString(36).substring(2, 7);
    return `corr-${timestamp}-${rand}`;
  }

  private async esperar(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async obtenerCuentasDemo(): Promise<CuentaDemo[]> {
    return this.cuentas;
  }

  async iniciarSesion(params: IniciarSesionParams): Promise<SesionUsuario> {
    const { email, password, cuentaId, escenario = 'NORMAL', simularLatencia = false } = params;
    const correlacion = this.generarCorrelacion();

    if (simularLatencia) {
      await this.esperar(450);
    }

    // Validación de email obligatorio
    if (!email || email.trim() === '') {
      const error: AppError = {
        codigo: '400 CORREO_REQUERIDO',
        mensaje: 'El identificador o correo institucional es obligatorio.',
        status: 400,
        correlacion,
        campos: { email: 'Este campo es obligatorio' },
      };
      throw error;
    }

    // Validación de contraseña si se suministra
    if (password !== undefined && password.trim().length > 0 && password.trim().length < 4) {
      const error: AppError = {
        codigo: '400 CONTRASENA_INVALIDA',
        mensaje: 'La contraseña debe contener al menos 4 caracteres.',
        status: 400,
        correlacion,
        campos: { password: 'Longitud mínima de 4 caracteres' },
      };
      throw error;
    }

    // Simulación forzada de escenarios de prueba
    if (escenario === '401_NO_AUTENTICADO') {
      const error: AppError = {
        codigo: '401 NO_AUTENTICADO',
        mensaje: 'Credenciales inválidas. Verifique su correo o contraseña institucional.',
        status: 401,
        correlacion,
      };
      throw error;
    }

    if (escenario === '403_CUENTA_NO_HABILITADA') {
      const error: AppError = {
        codigo: '403 CUENTA_NO_HABILITADA',
        mensaje: 'La cuenta no posee permisos vigentes o se encuentra inactiva.',
        status: 403,
        correlacion,
      };
      throw error;
    }

    if (escenario === '503_PERSISTENCIA_NO_DISPONIBLE') {
      const error: AppError = {
        codigo: '503 PERSISTENCIA_NO_DISPONIBLE',
        mensaje: 'El servicio de autenticación institucional no está disponible temporalmente.',
        status: 503,
        correlacion,
      };
      throw error;
    }

    // Búsqueda de cuenta por correo primero (si fue editado en el input) o por ID
    let cuenta: CuentaDemo | undefined;
    if (email && email.trim() !== '') {
      cuenta = this.cuentas.find((c) => c.email.toLowerCase() === email.trim().toLowerCase());
    }
    if (!cuenta && cuentaId) {
      cuenta = this.cuentas.find((c) => c.id === cuentaId);
    }

    if (!cuenta) {
      const error: AppError = {
        codigo: '404 CUENTA_NO_ENCONTRADA',
        mensaje: 'No se encontró un usuario institucional asociado al correo ingresado.',
        status: 404,
        correlacion,
        campos: { email: 'Usuario no registrado' },
      };
      throw error;
    }

    // Validación de estado de cuenta según CA02
    if (cuenta.estado !== 'ACTIVO') {
      const error: AppError = {
        codigo: '403 CUENTA_NO_HABILITADA',
        mensaje: `Acceso restringido: La cuenta de ${cuenta.nombre} se encuentra en estado "${cuenta.estado}". Comuníquese con el departamento administrativo.`,
        status: 403,
        correlacion,
      };
      throw error;
    }

    // Sesión válida creada (sin filtrar detalles internos de base de datos)
    const sesion: SesionUsuario = {
      cuentaId: cuenta.id,
      email: cuenta.email,
      nombre: cuenta.nombre,
      rolId: cuenta.rolId,
      rolEtiqueta: cuenta.rolEtiqueta,
      institucionId: cuenta.institucionId,
      institucionNombre: cuenta.institucionNombre,
      motorObjetivo: cuenta.motorObjetivo,
      colegiado: cuenta.colegiado,
      permisos: [...cuenta.permisos],
      fechaInicio: new Date().toISOString(),
      tokenSintetico: `inst-token-${cuenta.id.slice(4)}-${Date.now()}`,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
    } catch {
      // Ignorar errores de localStorage
    }

    return sesion;
  }

  async cerrarSesion(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignorar
    }
  }

  async obtenerSesionActual(): Promise<SesionUsuario | null> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SesionUsuario;
    } catch {
      return null;
    }
  }
}
