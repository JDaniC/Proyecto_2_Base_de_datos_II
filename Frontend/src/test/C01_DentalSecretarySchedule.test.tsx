import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { App } from '../app/App';

describe('C01 — Agenda de Secretaría Odontológica (C01, RF-C08, CA18)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('C01: Inicia sesión como Secretaría Odontológica, accede a /agenda y visualiza banner de secretaría, sillones y resumen', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Desplegar panel de evaluación rápida
    const botonHerramientas = await screen.findByRole('button', { name: /Perfiles de prueba para evaluación/i });
    await user.click(botonHerramientas);

    const selectorDemo = screen.getByLabelText(/Cargar cuenta de demostración/i);
    await user.selectOptions(selectorDemo, 'usr-odon-sec-01');

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Navegar a la agenda odontológica
    const linkAgenda = await screen.findByRole('link', { name: /Agenda de citas/i });
    await user.click(linkAgenda);

    // Verificar encabezado institucional odontológico (C01)
    expect(
      await screen.findByRole('heading', { name: /Agenda odontológica \/ Gestión de secretaría/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Odontología')).toBeInTheDocument();

    // Verificar banner de operador de secretaría (RF-C08, CA18)
    expect(screen.getByText(/Gestión de Secretaría \(C01\):/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Ana Lucía Méndez/i).length).toBeGreaterThanOrEqual(2);

    // Verificar tarjetas de resumen odontológico
    expect(screen.getByText('Citas del día')).toBeInTheDocument();
    expect(screen.getAllByText('Programadas').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Atendidas').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Canceladas').length).toBeGreaterThan(0);

    // Verificar sillones odontológicos y citas listadas
    expect(await screen.findByText('María Fernanda López Barillas')).toBeInTheDocument();
    expect(screen.getByText('Evaluación de caries oclusal y profilaxis dental profunda')).toBeInTheDocument();
    expect(screen.getAllByText('Sillón 1 — Operatoria y Estética Dental').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Secretaría:/i).length).toBeGreaterThan(0);
  });

  it('C01: Abre modal para programar nueva cita odontológica con vínculo de secretaría gestora y sillón dental', async () => {
    const user = userEvent.setup();
    render(<App />);

    const botonHerramientas = await screen.findByRole('button', { name: /Perfiles de prueba para evaluación/i });
    await user.click(botonHerramientas);

    const selectorDemo = screen.getByLabelText(/Cargar cuenta de demostración/i);
    await user.selectOptions(selectorDemo, 'usr-odon-sec-01');

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    const linkAgenda = await screen.findByRole('link', { name: /Agenda de citas/i });
    await user.click(linkAgenda);

    // Botón para nueva cita odontológica
    const btnNuevaCita = await screen.findByRole('button', { name: /Nueva cita odontológica/i });
    await user.click(btnNuevaCita);

    // Modal C01
    expect(await screen.findByText('Programar Cita Odontológica (C01)')).toBeInTheDocument();
    expect(screen.getByText(/Secretaría gestora asignada:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Ana Lucía Méndez/i).length).toBeGreaterThan(0);

    // Consultorio por defecto debe ser un sillón dental
    const inputConsultorio = screen.getByLabelText(/Consultorio o sala de atención/i);
    expect(inputConsultorio).toHaveValue('Sillón 1 — Operatoria y Estética Dental');
  });
});
