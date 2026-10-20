import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('U03 — Pantalla 01 Aprobada: Panel Inicial / Dashboard (V03)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('Renderiza encabezado «Resumen general», fecha y métricas en un único panel horizontal', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión con Dra. Elena Morales
    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Encabezado
    expect(await screen.findByRole('heading', { name: /Resumen general/i })).toBeInTheDocument();
    expect(screen.getByText(/Bienvenido, Dra. Elena Morales/i)).toBeInTheDocument();

    // Métricas operativas en panel horizontal (Hospital General)
    expect(await screen.findByText(/Pacientes ingresados hoy/i)).toBeInTheDocument();
    expect(screen.getByText('38')).toBeInTheDocument();
    expect(screen.getByText(/Hospitalizaciones activas/i)).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
  });

  it('Panel sutil de citas: alterna entre «Hoy» y «Próximas»', async () => {
    const user = userEvent.setup();
    render(<App />);

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    await screen.findByRole('heading', { name: /Resumen general/i });

    // Cita de hoy visible inicialmente
    expect(await screen.findByText('Roberto Estrada Morales')).toBeInTheDocument();
    expect(screen.getByText('08:30')).toBeInTheDocument();

    // Cambiar a pestaña Próximas
    const tabProximas = screen.getByRole('tab', { name: /Próximas/i });
    await user.click(tabProximas);

    // Cita próxima debe mostrarse
    expect(await screen.findByText('Marcos Antonio Solares')).toBeInTheDocument();
    expect(screen.queryByText('Roberto Estrada Morales')).not.toBeInTheDocument();
  });

  it('Al hacer clic en una fila de cita abre el modal de detalle de cita', async () => {
    const user = userEvent.setup();
    render(<App />);

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    await screen.findByRole('heading', { name: /Resumen general/i });

    const filaCita = await screen.findByText('Roberto Estrada Morales');
    await user.click(filaCita);

    // Modal de detalle
    const dialog = await screen.findByRole('dialog', { name: /Detalle de Cita Médica/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Consultorio 204 — Medicina Interna/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Evaluación y control de hipertensión arterial/i)).toBeInTheDocument();

    // Cerrar modal
    const botonCerrar = within(dialog).getByRole('button', { name: 'Cerrar' });
    await user.click(botonCerrar);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('Sección de actividad reciente muestra eventos clínicos y trazabilidad', async () => {
    const user = userEvent.setup();
    render(<App />);

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    await screen.findByRole('heading', { name: /Resumen general/i });

    expect(screen.getByText(/Actividad reciente del centro/i)).toBeInTheDocument();
    expect(screen.getByText(/Dr. Fernando Paz/i)).toBeInTheDocument();
    expect(screen.getByText(/Diagnóstico principal registrado y codificado para paciente/i)).toBeInTheDocument();
  });
});
