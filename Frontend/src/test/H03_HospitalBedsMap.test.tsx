import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('H03 — Habitaciones, Camas y Ocupación (H03, H04, CA17)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('H03: Personal de salud accede a /hospital/camas y visualiza mapa de camas agrupadas por habitación y KPIs', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión
    const botonLogin = screen.getByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Navegar a Habitaciones y camas desde el sidebar
    const linkCamas = await screen.findByRole('link', { name: /Habitaciones y camas/i });
    await user.click(linkCamas);

    // Verificar encabezado principal H03 y KPIs
    expect(await screen.findByRole('heading', { name: /Habitaciones, Camas y Ocupación \(H03\)/i })).toBeInTheDocument();
    expect(screen.getByText(/Total de Camas/i)).toBeInTheDocument();
    expect(screen.getByText(/Camas Ocupadas/i)).toBeInTheDocument();
    expect(screen.getByText(/Camas Disponibles/i)).toBeInTheDocument();
    expect(screen.getByText(/En Mantenimiento/i)).toBeInTheDocument();

    // Comprobar presencia de habitaciones del hospital tras cargar datos
    expect(await screen.findByRole('heading', { name: /Habitación 201/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Habitación 202/i })).toBeInTheDocument();

    // Comprobar camas y sus estados
    expect(screen.getByText('Cama 201-A')).toBeInTheDocument();
    expect(screen.getByText('Cama 201-B')).toBeInTheDocument();
    expect(screen.getByText('Roberto Estrada Morales')).toBeInTheDocument();
  });

  it('H03: Filtra camas por estado operativo DISPONIBLE y MANTENIMIENTO', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    const linkCamas = await screen.findByRole('link', { name: /Habitaciones y camas/i });
    await user.click(linkCamas);

    // Esperar a que carguen las habitaciones
    expect(await screen.findByRole('heading', { name: /Habitación 201/i })).toBeInTheDocument();

    // Filtrar por DISPONIBLE
    const botonDisponible = await screen.findByRole('button', { name: /Filtro DISPONIBLE/i });
    await user.click(botonDisponible);

    // Debe mostrar camas libres y no mostrar paciente internado
    expect(screen.getByText('Cama 201-A')).toBeInTheDocument();
    expect(screen.queryByText('Roberto Estrada Morales')).not.toBeInTheDocument();

    // Filtrar por MANTENIMIENTO
    const botonMantenimiento = screen.getByRole('button', { name: /Filtro MANTENIMIENTO/i });
    await user.click(botonMantenimiento);

    expect(screen.getByText('Cama 203-B')).toBeInTheDocument();
    expect(screen.getByText(/Fuera de servicio para desinfección o reparación/i)).toBeInTheDocument();
  });

  it('H03 & H04: Permite enviar cama a mantenimiento y luego habilitarla nuevamente', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    const linkCamas = await screen.findByRole('link', { name: /Habitaciones y camas/i });
    await user.click(linkCamas);

    // Esperar a que carguen las habitaciones
    expect(await screen.findByRole('heading', { name: /Habitación 201/i })).toBeInTheDocument();

    // Encontrar botón de mantenimiento para la cama 201-A
    const botonMantenimiento = await screen.findByRole('button', { name: /Mantenimiento cama 201-A/i });
    await user.click(botonMantenimiento);

    // Comprobar notificación de éxito
    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/actualizada a estado EN MANTENIMIENTO/i)).toBeInTheDocument();

    // Ahora debe existir un botón para habilitar cama 201-A
    const botonHabilitar = await screen.findByRole('button', { name: /Habilitar cama 201-A/i });
    await user.click(botonHabilitar);

    expect(await screen.findByText(/actualizada a estado DISPONIBLE/i)).toBeInTheDocument();
  });
});
