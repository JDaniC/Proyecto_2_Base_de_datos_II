import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('V01 — Inicio de Sesión (Modo Demostración)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('CA-V01-01 / CA-V01-02: Renderiza encabezado, banner de modo demo y catálogo de identidades', async () => {
    render(<App />);

    expect(
      await screen.findByText(/Plataforma Unificada de Historiales Clínicos/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Modo demostración — sin autenticación real · Datos clínicos ficticios/i)
    ).toBeInTheDocument();

    const matchesElena = await screen.findAllByText(/Dra. Elena Morales/i);
    expect(matchesElena.length).toBeGreaterThan(0);

    expect(
      screen.getByRole('button', { name: /Iniciar sesión demo/i })
    ).toBeInTheDocument();
  });

  it('Filtra las cuentas al seleccionar una pestaña de institución', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText(/Plataforma Unificada/i);
    await screen.findAllByText(/Dra. Elena Morales/i);

    const tabOdon = screen.getByRole('tab', { name: /Clínica Odontológica/i });
    await user.click(tabOdon);

    expect(await screen.findByText(/Dr. Javier Castellanos/i)).toBeInTheDocument();
    expect(screen.queryByText(/Medicina Interna — Acceso a consultas/i)).not.toBeInTheDocument();
  });

  it('Actualiza el correo al seleccionar otra cuenta sintética', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findAllByText(/Dra. Elena Morales/i);

    const inputEmail = screen.getByLabelText(/Identificador \/ Correo sintético/i);
    expect(inputEmail).toHaveValue('elena.morales@hospital-general.salud.gt');

    const cardAna = screen.getByText(/Ana Lucía Méndez/i);
    await user.click(cardAna);

    expect(inputEmail).toHaveValue('secretaria@clinica-dental.salud.gt');
  });

  it('CA-V01-03: Realiza un inicio de sesión exitoso y transiciona a la vista de sesión activa', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findAllByText(/Dra. Elena Morales/i);

    // Desactivar latencia para acelerar prueba
    const switchLatencia = screen.getByRole('switch', { name: /Simular latencia de red/i });
    await user.click(switchLatencia);

    const botonLogin = screen.getByRole('button', { name: /Iniciar sesión demo/i });
    await user.click(botonLogin);

    // Debe mostrar la vista /sesion-activa
    expect(await screen.findByRole('heading', { name: /Bienvenido, Dra. Elena Morales/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Hospital General San Juan/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/PostgreSQL/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/SESIÓN ACTIVA/i)).toBeInTheDocument();
  });

  it('CA-V01-04: Bloquea el acceso para cuentas en estado INACTIVO (403 CUENTA_NO_HABILITADA)', async () => {
    const user = userEvent.setup();
    render(<App />);

    const cardMateo = await screen.findByText(/Dr. Mateo Solares/i);
    await user.click(cardMateo);

    const inputEmail = screen.getByLabelText(/Identificador \/ Correo sintético/i);
    expect(inputEmail).toHaveValue('mateo.solares@hospital-general.salud.gt');

    const switchLatencia = screen.getByRole('switch', { name: /Simular latencia de red/i });
    await user.click(switchLatencia);

    const botonLogin = screen.getByRole('button', { name: /Iniciar sesión demo/i });
    await user.click(botonLogin);

    const alertError = await screen.findByRole('alert');
    expect(alertError).toHaveTextContent(/403 CUENTA_NO_HABILITADA/i);
    expect(alertError).toHaveTextContent(/La cuenta de Dr. Mateo Solares/i);
  });

  it('Abre y cierra el modal de instrucciones de acceso demo', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findAllByText(/Dra. Elena Morales/i);

    const botonAyuda = screen.getByRole('button', { name: /¿Problemas de acceso o información de cuentas\?/i });
    await user.click(botonAyuda);

    expect(screen.getByRole('dialog', { name: /Instrucciones de Acceso Institucional \(Demo\)/i })).toBeInTheDocument();

    const botonEntendido = screen.getByRole('button', { name: /Entendido/i });
    await user.click(botonEntendido);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
