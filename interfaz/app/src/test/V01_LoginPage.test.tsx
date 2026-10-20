import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('V01 — Inicio de Sesión (Diseño Clínico Institucional)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('CA-V01-01 / CA-V01-02: Renderiza encabezado institucional, campos de credenciales y botón de acceso', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /Plataforma de Historiales Clínicos/i })
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/Correo institucional o usuario/i)
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/••••••••••••/i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: /Iniciar sesión/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Acceso seguro con cifrado institucional SSL/i)
    ).toBeInTheDocument();
  });

  it('Permite cargar un perfil de prueba para evaluación desde el panel de herramientas', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: /Plataforma de Historiales Clínicos/i });

    // Desplegar panel de evaluación rápida
    const botonHerramientas = screen.getByRole('button', { name: /Perfiles de prueba para evaluación/i });
    await user.click(botonHerramientas);

    const selectorDemo = screen.getByLabelText(/Cargar cuenta de demostración/i);
    expect(selectorDemo).toBeInTheDocument();

    // Seleccionar cuenta de Odontología
    await user.selectOptions(selectorDemo, 'usr-odon-sec-01');

    const inputEmail = screen.getByLabelText(/Correo institucional o usuario/i);
    expect(inputEmail).toHaveValue('secretaria@clinica-dental.salud.gt');
  });

  it('CA-V01-03: Realiza inicio de sesión exitoso y muestra la vista institucional sin filtrar motores de base de datos', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: /Plataforma de Historiales Clínicos/i });

    const botonLogin = screen.getByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Debe acceder al portal institucional
    expect(await screen.findByRole('heading', { name: /Resumen general/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Hospital General San Juan/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Médico Especialista/i).length).toBeGreaterThan(0);

    // Comprobar que NO expone nombres técnicos de motores de base de datos al usuario clínico
    expect(screen.queryByText(/PostgreSQL/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Aislamiento Institucional Estricto/i)).not.toBeInTheDocument();
  });

  it('CA-V01-04: Bloquea el acceso para cuentas en estado INACTIVO (403 CUENTA_NO_HABILITADA)', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: /Plataforma de Historiales Clínicos/i });

    // Desplegar herramientas de evaluación y seleccionar cuenta inactiva
    const botonHerramientas = screen.getByRole('button', { name: /Perfiles de prueba para evaluación/i });
    await user.click(botonHerramientas);

    const selectorDemo = screen.getByLabelText(/Cargar cuenta de demostración/i);
    await user.selectOptions(selectorDemo, 'usr-hosp-ina-01');

    const botonLogin = screen.getByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    const alertError = await screen.findByRole('alert');
    expect(alertError).toHaveTextContent(/403 CUENTA_NO_HABILITADA/i);
    expect(alertError).toHaveTextContent(/Dr. Mateo Solares/i);
  });

  it('Abre y cierra el modal de recuperación de contraseña', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: /Plataforma de Historiales Clínicos/i });

    const botonOlvido = screen.getByRole('button', { name: /¿Olvidó su contraseña\?/i });
    await user.click(botonOlvido);

    expect(screen.getByRole('dialog', { name: /Asistencia de Acceso Institucional/i })).toBeInTheDocument();

    const botonCerrar = screen.getByRole('button', { name: 'Cerrar' });
    await user.click(botonCerrar);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('Permite cerrar sesión y regresar al inicio de sesión', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: /Plataforma de Historiales Clínicos/i });

    const botonLogin = screen.getByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    await screen.findByRole('heading', { name: /Resumen general/i });

    const botonAbrirModal = screen.getByRole('button', { name: 'Cerrar sesión' });
    await user.click(botonAbrirModal);

    // Modal de confirmación
    const dialog = screen.getByRole('dialog');
    const botonConfirmar = within(dialog).getByRole('button', { name: /Cerrar sesión/i });
    await user.click(botonConfirmar);

    // Debe volver a la pantalla de acceso
    expect(await screen.findByRole('heading', { name: /Plataforma de Historiales Clínicos/i })).toBeInTheDocument();
  });
});
