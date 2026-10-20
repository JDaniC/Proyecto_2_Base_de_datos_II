import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { ServiceProvider } from '../app/ServiceContext';
import { AuthSessionProvider } from '../app/AuthSessionContext';
import { SkeletonLoader } from '../design-system/components/SkeletonLoader';
import { EmptyState } from '../design-system/components/EmptyState';
import { ErrorState } from '../design-system/components/ErrorState';
import { AccessRestrictedPage } from '../features/auth/AccessRestrictedPage';

describe('U02 — Shell de Navegación, Header, V02 Acceso Restringido y V19 Estados Transversales', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('V19: Componente SkeletonLoader renderiza bloques accesibles con aria-hidden', () => {
    const { container } = render(<SkeletonLoader variant="card" height="150px" />);
    const skeleton = container.querySelector('.skeleton-loader');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
  });

  it('V19: Componentes EmptyState y ErrorState ejecutan acciones y muestran referencias', async () => {
    const user = userEvent.setup();
    let retryCalled = false;

    render(
      <>
        <EmptyState
          title="Sin registros"
          description="No se encontraron elementos."
          actionText="Crear nuevo"
          onAction={() => {}}
        />
        <ErrorState
          title="Error en la consulta"
          message="No fue posible conectar con el servicio."
          correlacion="corr-test-12345"
          onRetry={() => {
            retryCalled = true;
          }}
        />
      </>
    );

    expect(screen.getByText('Sin registros')).toBeInTheDocument();
    expect(screen.getByText('Error en la consulta')).toBeInTheDocument();
    expect(screen.getByText(/corr-test-12345/i)).toBeInTheDocument();

    const botonReintentar = screen.getByRole('button', { name: /Reintentar operación/i });
    await user.click(botonReintentar);
    expect(retryCalled).toBe(true);
  });

  it('AuthGuard redirige a /acceso cuando no hay sesión activa', async () => {
    window.history.pushState({}, '', '/panel');
    render(<App />);

    // Debe mostrar la pantalla de acceso
    expect(
      await screen.findByRole('heading', { name: /Plataforma de Historiales Clínicos/i })
    ).toBeInTheDocument();
  });

  it('Shell autenticado: Header y Sidebar se adaptan a la institución activa', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión con Dra. Elena Morales (Hospital General)
    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Debe cargar el Shell con el panel de Hospital General
    const matchesInst = await screen.findAllByText('Hospital General San Juan');
    expect(matchesInst.length).toBeGreaterThan(0);
    expect(screen.getByText(/Médico Especialista/i)).toBeInTheDocument();

    // Comprobar ítems de navegación institucional de Hospital
    expect(screen.getByRole('link', { name: /Hospitalizaciones/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Habitaciones y camas/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Órdenes de examen/i })).toBeInTheDocument();
  });

  it('Sidebar permite alternar entre vista expandida y compacta', async () => {
    const user = userEvent.setup();
    render(<App />);

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    await screen.findAllByText('Hospital General San Juan');

    const botonColapsar = screen.getByRole('button', { name: /Colapsar barra lateral/i });
    await user.click(botonColapsar);

    // Debe cambiar la etiqueta del botón a expandir
    expect(screen.getByRole('button', { name: /Expandir barra lateral/i })).toBeInTheDocument();
  });

  it('V02: Acceso restringido muestra motivo claro y acciones de recuperación sin fugas técnicas', () => {
    render(
      <ServiceProvider>
        <AuthSessionProvider>
          <MemoryRouter>
            <AccessRestrictedPage
              codigo="403 SIN_PERMISO"
              motivo="Demostración de estado de acceso restringido para funciones no asignadas al rol."
              permisoRequerido="auditoria.leer"
            />
          </MemoryRouter>
        </AuthSessionProvider>
      </ServiceProvider>
    );

    expect(screen.getByRole('heading', { name: /Módulo con Acceso Restringido/i })).toBeInTheDocument();
    expect(screen.getByText('403 SIN_PERMISO')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Volver al panel principal/i })).toBeInTheDocument();

    // Comprobar que no exhibe motores de base de datos
    expect(screen.queryByText(/PostgreSQL/i)).not.toBeInTheDocument();
  });
});
