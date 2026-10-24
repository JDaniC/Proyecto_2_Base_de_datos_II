import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('C02 — Detalle de Cita Odontológica y Transición Cita → Consulta (C02, CA06, CA18)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('C02: Secretaría visualiza detalle de cita, secretaria gestora, y tiene bloqueado el inicio clínico (CA18)', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión como Secretaría Odontológica
    const botonHerramientas = await screen.findByRole('button', { name: /Perfiles de prueba para evaluación/i });
    await user.click(botonHerramientas);

    const selectorDemo = screen.getByLabelText(/Cargar cuenta de demostración/i);
    await user.selectOptions(selectorDemo, 'usr-odon-sec-01');

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Navegar a agenda
    const linkAgenda = await screen.findByRole('link', { name: /Agenda de citas/i });
    await user.click(linkAgenda);

    // Abrir detalle de cita programada
    const citaCard = await screen.findByText('Evaluación de caries oclusal y profilaxis dental profunda');
    await user.click(citaCard);

    // Verificar modal C02
    expect(await screen.findByText('Detalle de Cita Odontológica (C02)')).toBeInTheDocument();
    expect(screen.getAllByText('María Fernanda López Barillas').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sillón 1 — Operatoria y Estética Dental/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Secretaría gestora de la cita:/i)).toBeInTheDocument();

    // Regla de aislamiento de rol CA18: Botón de iniciar consulta clínica deshabilitado para secretaría
    const botonIniciarConsulta = screen.getByRole('button', { name: /Iniciar consulta odontológica/i });
    expect(botonIniciarConsulta).toBeDisabled();
    expect(screen.getByText(/Aislamiento de rol \(CA18\):/i)).toBeInTheDocument();
  });

  it('C02: Valida estados CANCELADA (bloquea consulta) y ATENDIDA (ofrece enlace y previene duplicación 409 CITA_YA_ATENDIDA)', async () => {
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

    // 1. Cita CANCELADA
    const citaCancelada = await screen.findByText('Revisión y ajuste de prótesis dental removible');
    await user.click(citaCancelada);

    expect(await screen.findByText('Detalle de Cita Odontológica (C02)')).toBeInTheDocument();
    expect(screen.getByText(/Motivo obligatorio de cancelación:/i)).toBeInTheDocument();
    expect(screen.getByText('Paciente notificó incompatibilidad laboral de último momento')).toBeInTheDocument();
    // No debe permitir iniciar consulta clínica (409 ESTADO_INVALIDO)
    expect(screen.queryByRole('button', { name: /Iniciar consulta odontológica/i })).not.toBeInTheDocument();

    // Cerrar modal
    const btnsCerrar = screen.getAllByRole('button', { name: /Cerrar/i });
    await user.click(btnsCerrar[btnsCerrar.length - 1]);

    // 2. Cita ATENDIDA
    const citaAtendida = await screen.findByText('Endodoncia unirradicular pieza 2.1 y obturación estética');
    await user.click(citaAtendida);

    expect(await screen.findByText('Detalle de Cita Odontológica (C02)')).toBeInTheDocument();
    expect(screen.getByText(/Cita atendida\. Registro de consulta clínica completado exitosamente/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver consulta odontológica realizada/i })).toBeInTheDocument();
  });

  it('C02: Odontólogo colegiado tiene habilitada la transición a consulta odontológica (CA06)', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión con rol ODONTOLOGO (Dr. Javier Castellanos)
    const botonHerramientas = await screen.findByRole('button', { name: /Perfiles de prueba para evaluación/i });
    await user.click(botonHerramientas);

    const selectorDemo = screen.getByLabelText(/Cargar cuenta de demostración/i);
    await user.selectOptions(selectorDemo, 'usr-odon-odo-01');

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    const linkAgenda = await screen.findByRole('link', { name: /Agenda de citas/i });
    await user.click(linkAgenda);

    // Abrir cita programada
    const citaCard = await screen.findByText('Evaluación de caries oclusal y profilaxis dental profunda');
    await user.click(citaCard);

    expect(await screen.findByText('Detalle de Cita Odontológica (C02)')).toBeInTheDocument();

    // Como Odontólogo tratante, el botón está activo y habilitado
    const botonIniciarConsulta = screen.getByRole('button', { name: /Iniciar consulta odontológica/i });
    expect(botonIniciarConsulta).not.toBeDisabled();
  });
});
