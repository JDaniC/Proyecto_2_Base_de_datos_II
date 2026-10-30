import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ServiceProvider } from '../../app/ServiceContext';
import { AuthSessionProvider } from '../../app/AuthSessionContext';
import { LoginPage } from '../../features/auth/LoginPage';
import { createHttpServices } from '../../services/http/serviceFactory';
import { TokenStorage } from '../../services/http/tokenStorage';
import { TrialAuthProvider } from '../../services/http/authProvider';
import { HttpClient } from '../../services/http/httpClient';
import { HttpAuthRepository } from '../../services/http/httpAuthRepository';

describe('ServiceFactory y Flujos de Interfaz en Modo API (E01-P2-03)', () => {
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

  it('los repositorios no integrados fallan con 503 PERSISTENCIA_NO_DISPONIBLE sin fallback silencioso a mocks', async () => {
    const services = createHttpServices({ baseUrl: '/api/v1' });

    expect(services.mode).toBe('api');
    expect(services.authRepository).toBeDefined();

    // Pacientes ya tiene adaptador E02; una caída de transporte conserva un error 503.
    mockFetch.mockRejectedValueOnce(new TypeError('offline'));
    await expect(services.patientRepository.buscar('HOSPITAL_GENERAL', { q: 'García' }))
      .rejects.toMatchObject({ status: 503, codigo: '503 PERSISTENCIA_NO_DISPONIBLE' });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    mockFetch.mockRejectedValueOnce(new TypeError('offline'));
    await expect(
      services.appointmentRepository.obtenerCitas('CLINICA_ODONTOLOGICA', {
        fechaDesde: '2026-10-26',
        fechaHasta: '2026-10-26',
      })
    ).rejects.toMatchObject({status: 503});
  });

  it('LoginPage inicia sesión correctamente con cuenta pediátrica y navega a sesion-activa', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'X-Correlation-ID': 'corr-ped-login' }),
      json: async () => ({
        data: {
          cuenta_id: '00000000-0000-4000-8000-000000000110',
          institucion: 'CENTRO_MEDICO_PEDIATRICO',
          roles: ['PEDIATRA'],
          permisos: ['pacientes.administrar', 'historial.leer'],
          profesional: { id: '00000000-0000-4000-8000-000000000204', nombre: 'Dra. Sofia Lima', activo: true },
          version: 1,
        },
        meta: { correlacion: 'corr-ped-login' },
      }),
    });

    const tokenProvider = new TrialAuthProvider();
    const httpClient = new HttpClient({ baseUrl: '/api/v1', tokenProvider });
    const authRepo = new HttpAuthRepository(httpClient, tokenProvider);

    const user = userEvent.setup();

    render(
      <ServiceProvider mode="api" customAuthRepository={authRepo}>
        <AuthSessionProvider>
          <MemoryRouter initialEntries={['/acceso']}>
            <Routes>
              <Route path="/acceso" element={<LoginPage />} />
              <Route path="/sesion-activa" element={<div data-testid="sesion-activa-pantalla">Sesión activa OK</div>} />
            </Routes>
          </MemoryRouter>
        </AuthSessionProvider>
      </ServiceProvider>
    );

    const inputEmail = screen.getByLabelText(/Correo institucional o usuario/i);
    const inputPassword = screen.getByPlaceholderText(/••••••••••••/i);
    const botonLogin = screen.getByRole('button', { name: /Iniciar sesión/i });

    await user.type(inputEmail, 'pediatra.pediatria@institucion.salud.gt');
    await user.type(inputPassword, 'pediatra1234');
    await user.click(botonLogin);

    await waitFor(() => {
      expect(screen.getByTestId('sesion-activa-pantalla')).toBeInTheDocument();
    });
  });

  it('LoginPage maneja error 503 sin perder el formulario para permitir reintento seguro', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      headers: new Headers({ 'X-Correlation-ID': 'corr-503-down' }),
      json: async () => ({
        error: { codigo: 'PERSISTENCIA_NO_DISPONIBLE', mensaje: 'El servicio requerido no está disponible.' },
        meta: { correlacion: 'corr-503-down' },
      }),
    });

    const tokenProvider = new TrialAuthProvider();
    const httpClient = new HttpClient({ baseUrl: '/api/v1', tokenProvider });
    const authRepo = new HttpAuthRepository(httpClient, tokenProvider);

    const user = userEvent.setup();

    render(
      <ServiceProvider mode="api" customAuthRepository={authRepo}>
        <AuthSessionProvider>
          <MemoryRouter initialEntries={['/acceso']}>
            <Routes>
              <Route path="/acceso" element={<LoginPage />} />
            </Routes>
          </MemoryRouter>
        </AuthSessionProvider>
      </ServiceProvider>
    );

    const inputEmail = screen.getByLabelText(/Correo institucional o usuario/i);
    const inputPassword = screen.getByPlaceholderText(/••••••••••••/i);
    const botonLogin = screen.getByRole('button', { name: /Iniciar sesión/i });

    await user.type(inputEmail, 'admin.hospital@institucion.salud.gt');
    await user.type(inputPassword, 'admin1234');
    await user.click(botonLogin);

    // Muestra alerta de error
    await waitFor(() => {
      expect(screen.getByText(/El servicio requerido no está disponible/i)).toBeInTheDocument();
    });

    // Los datos del formulario se CONSERVAN íntegros para el reintento (RNF-034)
    expect(inputEmail).toHaveValue('admin.hospital@institucion.salud.gt');
    expect(inputPassword).toHaveValue('admin1234');
  });

  it('LoginPage maneja error 401 credenciales inválidas', async () => {
    const tokenProvider = new TrialAuthProvider();
    const httpClient = new HttpClient({ baseUrl: '/api/v1', tokenProvider });
    const authRepo = new HttpAuthRepository(httpClient, tokenProvider);

    const user = userEvent.setup();

    render(
      <ServiceProvider mode="api" customAuthRepository={authRepo}>
        <AuthSessionProvider>
          <MemoryRouter initialEntries={['/acceso']}>
            <Routes>
              <Route path="/acceso" element={<LoginPage />} />
            </Routes>
          </MemoryRouter>
        </AuthSessionProvider>
      </ServiceProvider>
    );

    const inputEmail = screen.getByLabelText(/Correo institucional o usuario/i);
    const inputPassword = screen.getByPlaceholderText(/••••••••••••/i);
    const botonLogin = screen.getByRole('button', { name: /Iniciar sesión/i });

    await user.type(inputEmail, 'admin.hospital@institucion.salud.gt');
    await user.type(inputPassword, 'clave-invalida');
    await user.click(botonLogin);

    await waitFor(() => {
      expect(screen.getByText(/Credenciales inválidas/i)).toBeInTheDocument();
    });
  });
});
