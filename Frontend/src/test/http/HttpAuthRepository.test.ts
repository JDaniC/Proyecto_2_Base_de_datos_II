import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpAuthRepository } from '../../services/http/httpAuthRepository';
import { HttpClient } from '../../services/http/httpClient';
import { TrialAuthProvider } from '../../services/http/authProvider';
import { TokenStorage } from '../../services/http/tokenStorage';
import { HttpError } from '../../services/http/errors';

describe('HttpAuthRepository — Sesión institucional y mapeos canónicos (E01-P2-03)', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TokenStorage.limpiar();
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    TokenStorage.limpiar();
    vi.restoreAllMocks();
  });

  it('inicia sesión para Hospital General y resuelve motor PostgreSQL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'X-Correlation-ID': 'corr-hosp-01' }),
      json: async () => ({
        data: {
          cuenta_id: '00000000-0000-4000-8000-000000000101',
          institucion: 'HOSPITAL_GENERAL',
          roles: ['ADMIN_INSTITUCIONAL'],
          permisos: ['pacientes.administrar', 'historial.leer', 'historial.archivar'],
          profesional: { id: '00000000-0000-4000-8000-000000000201', nombre: 'Dra. Elena Ramos', activo: true },
          version: 1,
        },
        meta: { correlacion: 'corr-hosp-01' },
      }),
    });

    const authProvider = new TrialAuthProvider();
    const httpClient = new HttpClient({ baseUrl: '/api/v1', tokenProvider: authProvider });
    const repo = new HttpAuthRepository(httpClient, authProvider);

    const sesion = await repo.iniciarSesion({
      email: 'admin.hospital@institucion.salud.gt',
      password: 'admin1234',
    });

    expect(sesion.institucionId).toBe('HOSPITAL_GENERAL');
    expect(sesion.institucionNombre).toBe('Hospital General San Juan');
    expect(sesion.motorObjetivo).toBe('PostgreSQL');
    expect(sesion.rolId).toBe('ADMIN_INSTITUCIONAL');
    expect(sesion.permisos).toContain('historial.leer');
    expect(sesion.nombre).toBe('Dra. Elena Ramos');

    // Verificar que POST /sesion se llamó SIN cuerpo (OpenAPI exigirSinCuerpo)
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/v1/sesion');
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
    expect(init.headers['Authorization']).toBe('Bearer token-fixture-uid-hospital-admin');
  });

  it('DEC06: mapea CENTRO_MEDICO_PEDIATRICO de servidor al alias CENTRO_PEDIATRICO de la UI', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'X-Correlation-ID': 'corr-ped-01' }),
      json: async () => ({
        data: {
          cuenta_id: '00000000-0000-4000-8000-000000000110',
          institucion: 'CENTRO_MEDICO_PEDIATRICO',
          roles: ['PEDIATRA'],
          permisos: ['pacientes.administrar', 'historial.leer', 'recetas.emitir'],
          profesional: { id: '00000000-0000-4000-8000-000000000204', nombre: 'Dra. Sofia Lima', activo: true },
          version: 1,
        },
        meta: { correlacion: 'corr-ped-01' },
      }),
    });

    const authProvider = new TrialAuthProvider();
    const httpClient = new HttpClient({ baseUrl: '/api/v1', tokenProvider: authProvider });
    const repo = new HttpAuthRepository(httpClient, authProvider);

    const sesion = await repo.iniciarSesion({
      email: 'pediatra.pediatria@institucion.salud.gt',
      password: 'pediatra1234',
    });

    // Alias en presentación de UI
    expect(sesion.institucionId).toBe('CENTRO_PEDIATRICO');
    expect(sesion.institucionNombre).toBe('Centro Médico Pediátrico San Gabriel');
    expect(sesion.motorObjetivo).toBe('Cloud Firestore');
    expect(sesion.rolId).toBe('PEDIATRA');
    expect(sesion.nombre).toBe('Dra. Sofia Lima');
  });

  it('inicia sesión para Clínica Odontológica y Laboratorio Clínico', async () => {
    // 1. Odontología
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        data: {
          cuenta_id: '00000000-0000-4000-8000-000000000104',
          institucion: 'CLINICA_ODONTOLOGICA',
          roles: ['ODONTOLOGO'],
          permisos: ['citas.administrar', 'consultas.registrar'],
          profesional: { id: '00000000-0000-4000-8000-000000000202', nombre: 'Dr. Roberto Paz', activo: true },
          version: 1,
        },
      }),
    });

    const authProvider = new TrialAuthProvider();
    const httpClient = new HttpClient({ baseUrl: '/api/v1', tokenProvider: authProvider });
    const repo = new HttpAuthRepository(httpClient, authProvider);

    const sesionDental = await repo.iniciarSesion({
      email: 'odontologo.dental@institucion.salud.gt',
      password: 'odontologo1234',
    });
    expect(sesionDental.institucionId).toBe('CLINICA_ODONTOLOGICA');
    expect(sesionDental.motorObjetivo).toBe('MySQL');

    // 2. Laboratorio
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        data: {
          cuenta_id: '00000000-0000-4000-8000-000000000107',
          institucion: 'LABORATORIO_CLINICO',
          roles: ['ANALISTA_LABORATORIO'],
          permisos: ['resultados.analizar'],
          version: 1,
        },
      }),
    });

    const sesionLab = await repo.iniciarSesion({
      email: 'analista.lab@institucion.salud.gt',
      password: 'analista1234',
    });
    expect(sesionLab.institucionId).toBe('LABORATORIO_CLINICO');
    expect(sesionLab.motorObjetivo).toBe('MongoDB');
  });

  it('rechaza contraseñas inválidas con 400 antes de contactar al backend', async () => {
    const authProvider = new TrialAuthProvider();
    const httpClient = new HttpClient({ baseUrl: '/api/v1', tokenProvider: authProvider });
    const repo = new HttpAuthRepository(httpClient, authProvider);

    await expect(
      repo.iniciarSesion({ email: 'admin.hospital@institucion.salud.gt', password: '12' })
    ).rejects.toThrowError(/al menos 4 caracteres/i);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rechaza credenciales incorrectas con 401 NO_AUTENTICADO', async () => {
    const authProvider = new TrialAuthProvider();
    const httpClient = new HttpClient({ baseUrl: '/api/v1', tokenProvider: authProvider });
    const repo = new HttpAuthRepository(httpClient, authProvider);

    await expect(
      repo.iniciarSesion({ email: 'admin.hospital@institucion.salud.gt', password: 'incorrecta-total' })
    ).rejects.toThrowError(/Credenciales inválidas/i);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('obtenerSesionActual devuelve null y limpia almacenamiento cuando no hay token', async () => {
    const authProvider = new TrialAuthProvider();
    const httpClient = new HttpClient({ baseUrl: '/api/v1', tokenProvider: authProvider });
    const repo = new HttpAuthRepository(httpClient, authProvider);

    const actual = await repo.obtenerSesionActual();
    expect(actual).toBeNull();
  });

  it('obtenerSesionActual limpia la sesión y devuelve null si el servidor responde 401', async () => {
    TokenStorage.guardarToken('token-invalido');

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers(),
      json: async () => ({
        error: { codigo: 'NO_AUTENTICADO', mensaje: 'Sesión expirada' },
      }),
    });

    const authProvider = new TrialAuthProvider();
    const httpClient = new HttpClient({ baseUrl: '/api/v1', tokenProvider: authProvider });
    const repo = new HttpAuthRepository(httpClient, authProvider);

    const expiracionDisparada = vi.fn();
    repo.onExpiracion(expiracionDisparada);

    const sesion = await repo.obtenerSesionActual();
    expect(sesion).toBeNull();
    expect(expiracionDisparada).toHaveBeenCalledTimes(1);
    expect(TokenStorage.obtenerToken()).toBeNull();
  });

  it('cerrarSesion invoca POST /sesion/cierre y limpia almacenamiento', async () => {
    TokenStorage.guardarToken('token-activo');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        data: { cerrada: true },
        meta: { correlacion: 'corr-cierre' },
      }),
    });

    const authProvider = new TrialAuthProvider();
    const httpClient = new HttpClient({ baseUrl: '/api/v1', tokenProvider: authProvider });
    const repo = new HttpAuthRepository(httpClient, authProvider);

    await repo.cerrarSesion();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/v1/sesion/cierre');
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
    expect(TokenStorage.obtenerToken()).toBeNull();
  });

  it('retira cuentas demo en modo entrega devolviendo lista vacía', async () => {
    const authProvider = new TrialAuthProvider();
    const httpClient = new HttpClient({ baseUrl: '/api/v1', tokenProvider: authProvider });
    const repo = new HttpAuthRepository(httpClient, authProvider);

    const cuentas = await repo.obtenerCuentasDemo();
    expect(cuentas).toEqual([]);
  });

  it('P1 regresión: propaga fallo de Firebase REST como 503 IDENTIDAD_NO_DISPONIBLE sin fallback local', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const authProvider = new TrialAuthProvider({
      emulatorUrl: 'http://127.0.0.1:9099',
    });
    const httpClient = new HttpClient({ baseUrl: '/api/v1', tokenProvider: authProvider });
    const repo = new HttpAuthRepository(httpClient, authProvider);

    // Aunque las credenciales coincidan con la tabla de ensayo, NO debe haber fallback silencioso
    let errorLanzado: unknown = null;
    try {
      await repo.iniciarSesion({
        email: 'admin.hospital@institucion.salud.gt',
        password: 'password123',
      });
    } catch (err) {
      errorLanzado = err;
    }

    expect(errorLanzado).toBeInstanceOf(HttpError);
    const httpErr = errorLanzado as HttpError;
    expect(httpErr.status).toBe(503);
    expect(httpErr.codigo).toBe('503 IDENTIDAD_NO_DISPONIBLE');
    expect(httpErr.mensaje).toContain('El servicio de autenticación institucional no está disponible');

    expect(TokenStorage.obtenerToken()).toBeNull();
  });

  it('P2 regresión: TokenStorage maneja SecurityError en el getter de sessionStorage usando memoria', () => {
    const originalGetter = Object.getOwnPropertyDescriptor(window, 'sessionStorage');

    try {
      Object.defineProperty(window, 'sessionStorage', {
        get() {
          throw new DOMException('The operation is insecure.', 'SecurityError');
        },
        configurable: true,
      });

      // No debe lanzar excepción y debe operar en memoria con total normalidad
      expect(() => TokenStorage.guardarToken('token-seguro')).not.toThrow();
      expect(TokenStorage.obtenerToken()).toBe('token-seguro');

      expect(() => TokenStorage.guardarSesionSerializada('{"cuentaId":"123"}')).not.toThrow();
      expect(TokenStorage.obtenerSesionSerializada()).toBe('{"cuentaId":"123"}');

      expect(() => TokenStorage.limpiar()).not.toThrow();
      expect(TokenStorage.obtenerToken()).toBeNull();
      expect(TokenStorage.obtenerSesionSerializada()).toBeNull();
    } finally {
      if (originalGetter) {
        Object.defineProperty(window, 'sessionStorage', originalGetter);
      }
    }
  });
});
