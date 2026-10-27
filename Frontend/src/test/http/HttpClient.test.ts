import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient } from '../../services/http/httpClient';
import { TokenProvider } from '../../services/http/types';
import { HttpError } from '../../services/http/errors';
import { IdempotencyTracker } from '../../services/http/idempotency';

describe('HttpClient — Transporte HTTP, correlación e idempotencia (E01-P2-03)', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let tokenMock: string | null = null;
  let onTokenExpiradoMock: ReturnType<typeof vi.fn>;
  let tokenProvider: TokenProvider;

  beforeEach(() => {
    tokenMock = 'token-prueba-123';
    onTokenExpiradoMock = vi.fn();
    tokenProvider = {
      obtenerToken: vi.fn(async () => tokenMock),
      establecerCredenciales: vi.fn(async () => 'token-nuevo'),
      limpiar: vi.fn(async () => {}),
      onTokenExpirado: onTokenExpiradoMock,
    };

    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adjunta cabecera de autenticación Bearer y correlación X-Correlation-ID', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'X-Correlation-ID': 'corr-srv-456' }),
      json: async () => ({
        data: { id: 'item-1' },
        meta: { correlacion: 'corr-srv-456' },
      }),
    });

    const client = new HttpClient({ baseUrl: '/api/v1', tokenProvider });
    const res = await client.get<{ id: string }>('/recurso');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/v1/recurso');
    expect(init.headers['Authorization']).toBe('Bearer token-prueba-123');
    expect(init.headers['X-Correlation-ID']).toBeDefined();
    expect(init.headers['Accept']).toBe('application/json');
    expect(res.data).toEqual({ id: 'item-1' });
    expect(res.meta.correlacion).toBe('corr-srv-456');
  });

  it('omite cabecera Authorization si skipAuth es verdadero o no hay token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ data: { ok: true } }),
    });

    const client = new HttpClient({ baseUrl: '/api/v1', tokenProvider });
    await client.get('/publico', { skipAuth: true });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers['Authorization']).toBeUndefined();
  });

  it('DEC08: envía y conserva Idempotency-Key estable para mutaciones reintentadas', async () => {
    const tracker = new IdempotencyTracker();
    const clave = tracker.obtenerClave();
    expect(clave).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    // Intento 1: falla por 503
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      headers: new Headers({ 'X-Correlation-ID': 'corr-503' }),
      json: async () => ({
        error: { codigo: 'PERSISTENCIA_NO_DISPONIBLE', mensaje: 'Fallo temporal' },
        meta: { correlacion: 'corr-503' },
      }),
    });

    const client = new HttpClient({ baseUrl: '/api/v1', tokenProvider });

    let errorCapturado: HttpError | null = null;
    try {
      await client.post('/comando', { nombre: 'Paciente' }, { idempotencyKey: clave });
    } catch (err) {
      errorCapturado = err as HttpError;
    }

    expect(errorCapturado).not.toBeNull();
    expect(errorCapturado?.status).toBe(503);
    expect(errorCapturado?.esReintentable).toBe(true);

    // Reintento: usa exactamente la MISMA clave idempotente
    const claveReintento = tracker.obtenerClave();
    expect(claveReintento).toBe(clave);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'X-Correlation-ID': 'corr-exito' }),
      json: async () => ({
        data: { confirmada: true },
        meta: { correlacion: 'corr-exito' },
      }),
    });

    const resReintento = await client.post('/comando', { nombre: 'Paciente' }, { idempotencyKey: claveReintento });
    expect(resReintento.data).toEqual({ confirmada: true });

    const [, init1] = mockFetch.mock.calls[0];
    const [, init2] = mockFetch.mock.calls[1];
    expect(init1.headers['Idempotency-Key']).toBe(clave);
    expect(init2.headers['Idempotency-Key']).toBe(clave);
  });

  it('DEC07: filtra y omite campos de autoridad en el cliente (actor, rol, institucionId)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ data: { ok: true } }),
    });

    const client = new HttpClient({ baseUrl: '/api/v1', tokenProvider });
    await client.post('/pacientes', {
      nombre: 'Juan',
      actor: 'suplantador',
      institucionId: 'HOSPITAL_GENERAL',
      rolEmisor: 'MEDICO',
    });

    const [, init] = mockFetch.mock.calls[0];
    const bodyEnviado = JSON.parse(init.body);
    expect(bodyEnviado).toEqual({ nombre: 'Juan' });
    expect(bodyEnviado.actor).toBeUndefined();
    expect(bodyEnviado.institucionId).toBeUndefined();
    expect(bodyEnviado.rolEmisor).toBeUndefined();
  });

  it('maneja 401 notificando onTokenExpirado y parseando error estructurado', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers({ 'X-Correlation-ID': 'corr-401' }),
      json: async () => ({
        error: { codigo: 'NO_AUTENTICADO', mensaje: 'Token ausente, inválido, vencido o revocado.' },
        meta: { correlacion: 'corr-401' },
      }),
    });

    const client = new HttpClient({ baseUrl: '/api/v1', tokenProvider });

    await expect(client.get('/recurso-protegido')).rejects.toThrowError(HttpError);
    expect(onTokenExpiradoMock).toHaveBeenCalledTimes(1);
  });

  it('parsea errores 400 con mapa de campos no válidos', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers(),
      json: async () => ({
        error: {
          codigo: 'SOLICITUD_INVALIDA',
          mensaje: 'La solicitud no cumple el contrato.',
          campos: [
            { campo: 'email', mensaje: 'Formato de correo incorrecto' },
            { campo: 'password', mensaje: 'Longitud mínima de 4 caracteres' },
          ],
        },
        meta: { correlacion: 'corr-400' },
      }),
    });

    const client = new HttpClient({ baseUrl: '/api/v1', tokenProvider });

    try {
      await client.post('/registro', {});
    } catch (err: unknown) {
      const httpErr = err as HttpError;
      expect(httpErr.status).toBe(400);
      expect(httpErr.codigo).toBe('400 SOLICITUD_INVALIDA');
      expect(httpErr.campos).toEqual({
        email: 'Formato de correo incorrecto',
        password: 'Longitud mínima de 4 caracteres',
      });
      return;
    }

    expect.fail('Debió lanzar HttpError');
  });

  it('traduce fallos de red en 503 PERSISTENCIA_NO_DISPONIBLE con esReintentable = true', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const client = new HttpClient({ baseUrl: '/api/v1', tokenProvider });

    try {
      await client.get('/servicios');
    } catch (err: unknown) {
      const httpErr = err as HttpError;
      expect(httpErr.status).toBe(503);
      expect(httpErr.codigo).toBe('503 PERSISTENCIA_NO_DISPONIBLE');
      expect(httpErr.esReintentable).toBe(true);
      expect(httpErr.mensaje).toContain('No se pudo conectar con el servidor institucional');
      return;
    }

    expect.fail('Debió lanzar HttpError de red');
  });
});
