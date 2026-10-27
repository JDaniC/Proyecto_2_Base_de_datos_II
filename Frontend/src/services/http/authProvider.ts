import { TokenProvider } from './types';
import { TokenStorage } from './tokenStorage';
import { HttpError } from './errors';
import { generarIdCorrelacion } from './idempotency';

export interface TrialAuthProviderOptions {
  readonly apiKey?: string;
  readonly emulatorUrl?: string;
  readonly customTokens?: Record<string, string>;
}

interface CuentaEnsayoConfig {
  readonly uid: string;
  readonly token: string;
  readonly passwordPorDefecto: string;
}

/**
 * Cuentas sintéticas de ensayo para las cuatro instituciones (conforme a Backend CUENTAS_SINTETICAS).
 * Permite ejecutar pruebas completas de sesión y transporte HTTP sin requerir credenciales de producción.
 */
const CUENTAS_ENSAYO: Record<string, CuentaEnsayoConfig> = {
  // Hospital General
  'admin.hospital@institucion.salud.gt': {
    uid: 'fixture-uid-hospital-admin',
    token: 'token-fixture-uid-hospital-admin',
    passwordPorDefecto: 'admin1234',
  },
  'medico.hospital@institucion.salud.gt': {
    uid: 'fixture-uid-hospital-medico',
    token: 'token-fixture-uid-hospital-medico',
    passwordPorDefecto: 'medico1234',
  },
  'secretaria.hospital@institucion.salud.gt': {
    uid: 'fixture-uid-hospital-secretaria',
    token: 'token-fixture-uid-hospital-secretaria',
    passwordPorDefecto: 'secre1234',
  },
  'inactivo.hospital@institucion.salud.gt': {
    uid: 'fixture-uid-hospital-cuenta-inactiva',
    token: 'token-fixture-uid-hospital-cuenta-inactiva',
    passwordPorDefecto: 'inactivo1234',
  },

  // Clínica Odontológica
  'admin.dental@institucion.salud.gt': {
    uid: 'fixture-uid-dental-admin',
    token: 'token-fixture-uid-dental-admin',
    passwordPorDefecto: 'admin1234',
  },
  'odontologo.dental@institucion.salud.gt': {
    uid: 'fixture-uid-odontologo',
    token: 'token-fixture-uid-odontologo',
    passwordPorDefecto: 'odontologo1234',
  },
  'secretaria.dental@institucion.salud.gt': {
    uid: 'fixture-uid-dental-secretaria',
    token: 'token-fixture-uid-dental-secretaria',
    passwordPorDefecto: 'secre1234',
  },

  // Laboratorio Clínico
  'admin.lab@institucion.salud.gt': {
    uid: 'fixture-uid-lab-admin',
    token: 'token-fixture-uid-lab-admin',
    passwordPorDefecto: 'admin1234',
  },
  'medico.lab@institucion.salud.gt': {
    uid: 'fixture-uid-lab-medico',
    token: 'token-fixture-uid-lab-medico',
    passwordPorDefecto: 'medico1234',
  },
  'analista.lab@institucion.salud.gt': {
    uid: 'fixture-uid-lab-analista',
    token: 'token-fixture-uid-lab-analista',
    passwordPorDefecto: 'analista1234',
  },
  'validador.lab@institucion.salud.gt': {
    uid: 'fixture-uid-lab-validador',
    token: 'token-fixture-uid-lab-validador',
    passwordPorDefecto: 'validador1234',
  },

  // Centro Médico Pediátrico
  'admin.pediatria@institucion.salud.gt': {
    uid: 'fixture-uid-pediatria-admin',
    token: 'token-fixture-uid-pediatria-admin',
    passwordPorDefecto: 'admin1234',
  },
  'pediatra.pediatria@institucion.salud.gt': {
    uid: 'fixture-uid-pediatra',
    token: 'token-fixture-uid-pediatra',
    passwordPorDefecto: 'pediatra1234',
  },
  'secretaria.pediatria@institucion.salud.gt': {
    uid: 'fixture-uid-pediatria-secretaria',
    token: 'token-fixture-uid-pediatria-secretaria',
    passwordPorDefecto: 'secre1234',
  },

  // Tokens de prueba de fallo y vencimiento
  'vencido@institucion.salud.gt': {
    uid: 'no-importa',
    token: 'token-vencido',
    passwordPorDefecto: 'vencido1234',
  },
};

export class TrialAuthProvider implements TokenProvider {
  private readonly options: TrialAuthProviderOptions;
  public onTokenExpirado?: () => void;

  constructor(options: TrialAuthProviderOptions = {}) {
    this.options = options;
  }

  async obtenerToken(): Promise<string | null> {
    return TokenStorage.obtenerToken();
  }

  async establecerCredenciales(email: string, password?: string): Promise<string> {
    const correlacion = generarIdCorrelacion();

    if (!email || email.trim() === '') {
      throw new HttpError({
        status: 400,
        codigo: '400 CORREO_REQUERIDO',
        mensaje: 'El correo institucional o usuario es obligatorio.',
        correlacion,
        campos: { email: 'Este campo es obligatorio' },
      });
    }

    if (!password || password.trim().length < 4) {
      throw new HttpError({
        status: 400,
        codigo: '400 CONTRASENA_INVALIDA',
        mensaje: 'La contraseña debe contener al menos 4 caracteres.',
        correlacion,
        campos: { password: 'Longitud mínima de 4 caracteres' },
      });
    }

    const emailNormalizado = email.trim().toLowerCase();

    // 1. Si se configuró Firebase Auth REST (emulador o API Key), ejecuta la autenticación REST
    // y propaga cualquier error de servicio o de red sin fallback a tablas locales (AGENTS.md, RNF-005)
    const apiKey = this.options.apiKey || (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_FIREBASE_API_KEY : undefined);
    const emulatorUrl = this.options.emulatorUrl || (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_FIREBASE_AUTH_EMULATOR_URL : undefined);

    if (emulatorUrl || (apiKey && apiKey !== 'demo-api-key')) {
      const tokenRest = await this.autenticarFirebaseRest({
        email: emailNormalizado,
        password,
        apiKey: apiKey || 'demo-api-key',
        emulatorUrl,
      });
      TokenStorage.guardarToken(tokenRest);
      return tokenRest;
    }

    // 2. Autenticación con cuentas sintéticas de ensayo (modo aislado para tests/demostración local)
    const cuentaConfig = CUENTAS_ENSAYO[emailNormalizado];
    if (!cuentaConfig) {
      throw new HttpError({
        status: 401,
        codigo: '401 NO_AUTENTICADO',
        mensaje: 'Credenciales inválidas. Verifique su correo y contraseña institucional.',
        correlacion,
      });
    }

    if (password !== cuentaConfig.passwordPorDefecto && password !== 'password123' && password !== 'Admin1234!') {
      throw new HttpError({
        status: 401,
        codigo: '401 NO_AUTENTICADO',
        mensaje: 'Credenciales inválidas. Verifique su correo y contraseña institucional.',
        correlacion,
      });
    }

    const token = this.options.customTokens?.[emailNormalizado] || cuentaConfig.token;
    TokenStorage.guardarToken(token);
    return token;
  }

  async limpiar(): Promise<void> {
    TokenStorage.limpiar();
  }

  private async autenticarFirebaseRest(params: {
    email: string;
    password: string;
    apiKey: string;
    emulatorUrl?: string;
  }): Promise<string> {
    const urlBase = params.emulatorUrl
      ? `${params.emulatorUrl.replace(/\/+$/, '')}/identitytoolkit.googleapis.com`
      : 'https://identitytoolkit.googleapis.com';
    const endpoint = `${urlBase}/v1/accounts:signInWithPassword?key=${encodeURIComponent(params.apiKey)}`;

    const abortController = new AbortController();
    const timeout = setTimeout(() => {
      abortController.abort(new Error('Timeout de autenticación Firebase tras 15000 ms'));
    }, 15000);

    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: params.email,
          password: params.password,
          returnSecureToken: true,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const mensaje = (data as { error?: { message?: string } })?.error?.message;
        if (mensaje === 'EMAIL_NOT_FOUND' || mensaje === 'INVALID_PASSWORD' || mensaje === 'INVALID_LOGIN_CREDENTIALS') {
          throw new HttpError({
            status: 401,
            codigo: '401 NO_AUTENTICADO',
            mensaje: 'Credenciales inválidas. Verifique su correo y contraseña institucional.',
          });
        }
        throw new HttpError({
          status: res.status,
          codigo: `${res.status} ERROR_AUTENTICACION`,
          mensaje: 'No fue posible validar las credenciales en el proveedor de identidad.',
        });
      }

      const payload = (await res.json()) as { idToken?: string };
      if (!payload.idToken) {
        throw new HttpError({
          status: 500,
          codigo: '500 ERROR_INTERNO',
          mensaje: 'El proveedor de autenticación no devolvió un token de acceso válido.',
        });
      }

      return payload.idToken;
    } catch (error: unknown) {
      if (error instanceof HttpError) throw error;
      throw new HttpError({
        status: 503,
        codigo: '503 IDENTIDAD_NO_DISPONIBLE',
        mensaje: 'El servicio de autenticación institucional no está disponible.',
        causa: error,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
