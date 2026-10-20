import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('V08 — Pantalla 05 Aprobada: Agenda de Citas Médicas', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('V08: Renderiza encabezado «Agenda médica institucional», breadcrumb y tira interactiva de días', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión con Dra. Elena Morales
    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Navegar a Agenda desde la barra lateral
    const linkAgenda = await screen.findByRole('link', { name: /Agenda de citas/i });
    await user.click(linkAgenda);

    // Encabezado y navegación
    expect(await screen.findByRole('heading', { name: /Agenda médica institucional/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /Migas de pan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Crear nueva cita médica/i })).toBeInTheDocument();
    expect(screen.getByText(/Semana del 19 al 24 de octubre, 2026/i)).toBeInTheDocument();

    // Tira de días con LUN 19 oct seleccionado por defecto
    const botonLunes = screen.getByRole('button', { name: /LUN 19 oct/i });
    expect(botonLunes).toHaveAttribute('aria-pressed', 'true');

    // Citas del lunes 19 de octubre visibles en vista diaria 24h
    expect(await screen.findByText('Roberto Estrada Morales')).toBeInTheDocument();
    expect(screen.getByText('08:30')).toBeInTheDocument();
    expect(screen.getByText('Claudia Méndez Arriola')).toBeInTheDocument();
  });

  it('V08: Al seleccionar otro día en la tira interactiva, actualiza el listado diario', async () => {
    const user = userEvent.setup();
    render(<App />);

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    const linkAgenda = await screen.findByRole('link', { name: /Agenda de citas/i });
    await user.click(linkAgenda);

    await screen.findByText('Roberto Estrada Morales');

    // Seleccionar Martes 20 oct
    const botonMartes = screen.getByRole('button', { name: /MAR 20 oct/i });
    await user.click(botonMartes);

    // Cita del martes debe mostrarse
    expect(await screen.findByText('Fernando Castillo Ruiz')).toBeInTheDocument();
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.queryByText('Roberto Estrada Morales')).not.toBeInTheDocument();
  });

  it('V08: Conmuta entre «Vista diaria (24 h)» y «Vista semanal»', async () => {
    const user = userEvent.setup();
    render(<App />);

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    const linkAgenda = await screen.findByRole('link', { name: /Agenda de citas/i });
    await user.click(linkAgenda);

    await screen.findByText('Roberto Estrada Morales');

    // Cambiar a Vista Semanal
    const botonSemanal = screen.getByRole('button', { name: /Vista semanal/i });
    await user.click(botonSemanal);

    // La grilla semanal debe mostrar columnas de los días
    expect(await screen.findByText(/LUN 19 oct/i)).toBeInTheDocument();
    expect(screen.getByText(/VIE 23 oct/i)).toBeInTheDocument();
  });

  it('V08: Filtra por estado contractual (DEC-04) mostrando citas canceladas y su motivo', async () => {
    const user = userEvent.setup();
    render(<App />);

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    const linkAgenda = await screen.findByRole('link', { name: /Agenda de citas/i });
    await user.click(linkAgenda);

    await screen.findByText('Roberto Estrada Morales');

    // Seleccionar Martes 20 oct (donde hay una cita cancelada)
    const botonMartes = screen.getByRole('button', { name: /MAR 20 oct/i });
    await user.click(botonMartes);

    // Esperar a que carguen las citas del martes
    expect(await screen.findByText('Fernando Castillo Ruiz')).toBeInTheDocument();

    // Filtrar por Canceladas
    const selectEstado = screen.getByLabelText(/Filtrar por estado contractual/i);
    await user.selectOptions(selectEstado, 'CANCELADA');

    expect(await screen.findByText('Gustavo Adolfo Salazar Marroquín')).toBeInTheDocument();
    expect(screen.queryByText('Fernando Castillo Ruiz')).not.toBeInTheDocument();
  });

  it('V08: Al hacer clic en una fila abre el modal de detalle con información clínica completa', async () => {
    const user = userEvent.setup();
    render(<App />);

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    const linkAgenda = await screen.findByRole('link', { name: /Agenda de citas/i });
    await user.click(linkAgenda);

    const filaCita = await screen.findByText('Roberto Estrada Morales');
    await user.click(filaCita);

    // Modal de Detalle de Cita
    const dialog = await screen.findByRole('dialog', { name: /Detalle de Cita Médica \(V08\)/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Consultorio 204 — Medicina Interna/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Ver expediente/i })).toBeInTheDocument();

    // Cerrar modal
    const botonCerrar = within(dialog).getByRole('button', { name: 'Cerrar' });
    await user.click(botonCerrar);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
