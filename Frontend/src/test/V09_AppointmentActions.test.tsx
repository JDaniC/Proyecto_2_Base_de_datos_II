import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('V09 — Crear, Reprogramar y Cancelar Cita Médica (CA06)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('V09: Abre modal «Programar Nueva Cita Médica», valida campos y crea cita exitosamente', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión
    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Navegar a Agenda
    const linkAgenda = await screen.findByRole('link', { name: /Agenda de citas/i });
    await user.click(linkAgenda);

    // Clic en «Nueva cita»
    const botonNuevaCita = await screen.findByRole('button', { name: /Crear nueva cita médica/i });
    await user.click(botonNuevaCita);

    // Modal abierto
    const modalCrear = await screen.findByRole('dialog');
    expect(within(modalCrear).getByText(/Programar Nueva Cita Médica \(V09\)/i)).toBeInTheDocument();

    // Esperar a que se carguen los pacientes
    const pacienteSelect = within(modalCrear).getByLabelText(/Paciente con expediente activo/i);
    await waitFor(() => {
      expect(within(pacienteSelect).getAllByRole('option').length).toBeGreaterThan(0);
    });

    // Comprobar selector de intervalos en 24 horas
    const horaSelect = within(modalCrear).getByLabelText(/Hora \(24 h, intervalos 15 min\)/i);
    expect(horaSelect).toBeInTheDocument();
    expect(within(horaSelect).getByText('08:00 h')).toBeInTheDocument();
    expect(within(horaSelect).getByText('08:15 h')).toBeInTheDocument();

    // Intentar enviar sin motivo
    const botonSubmit = within(modalCrear).getByRole('button', { name: /Programar cita/i });
    await user.click(botonSubmit);

    // Debe mostrar alerta de validación
    expect(await within(modalCrear).findByRole('alert')).toHaveTextContent(/El motivo de la cita es obligatorio/i);

    // Escribir motivo válido
    const inputMotivo = within(modalCrear).getByLabelText(/Motivo de consulta/i);
    await user.type(inputMotivo, 'Evaluación general y revisión de analíticas de control');

    // Cambiar hora a las 11:30 para evitar solapamiento
    await user.selectOptions(horaSelect, '11:30');

    // Confirmar
    await user.click(botonSubmit);

    // El modal se cierra y aparece notificación de éxito
    expect(await screen.findByRole('status')).toHaveTextContent(/Cita médica programada exitosamente/i);

    // La cita aparece en el listado del día
    expect(await screen.findByText(/Evaluación general y revisión de analíticas de control/i)).toBeInTheDocument();
    expect(screen.getAllByText('11:30').length).toBeGreaterThanOrEqual(1);
  });

  it('V09: Reprogramar cita exige motivo obligatorio y conserva historial de auditoría', async () => {
    const user = userEvent.setup();
    render(<App />);

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    const linkAgenda = await screen.findByRole('link', { name: /Agenda de citas/i });
    await user.click(linkAgenda);

    // Clic en la cita programada de Roberto Estrada (08:30)
    const citaCard = await screen.findByText('Roberto Estrada Morales');
    await user.click(citaCard);

    // Modal de Detalle
    const modalDetalle = await screen.findByRole('dialog');
    expect(within(modalDetalle).getByText(/Detalle de Cita Médica/i)).toBeInTheDocument();

    // Clic en «Reprogramar cita»
    const botonReprogramar = within(modalDetalle).getByRole('button', { name: /Reprogramar cita/i });
    await user.click(botonReprogramar);

    // Modal de Reprogramación
    const modalReprogramar = await screen.findByRole('dialog');
    expect(within(modalReprogramar).getByText(/Reprogramar Cita Médica \(V09\)/i)).toBeInTheDocument();

    // Seleccionar nueva hora (14:00)
    const horaSelect = within(modalReprogramar).getByLabelText(/Nueva hora/i);
    await user.selectOptions(horaSelect, '14:00');

    // Intentar guardar sin motivo
    const botonGuardar = within(modalReprogramar).getByRole('button', { name: /Guardar reprogramación/i });
    await user.click(botonGuardar);

    expect(await within(modalReprogramar).findByRole('alert')).toHaveTextContent(/El motivo de la reprogramación es obligatorio/i);

    // Escribir motivo de reprogramación
    const inputMotivo = within(modalReprogramar).getByLabelText(/Motivo de reprogramación/i);
    await user.type(inputMotivo, 'Paciente solicita cambio de turno por compromiso laboral vespertino');

    // Guardar
    await user.click(botonGuardar);

    // Toast de éxito y auditoría
    expect(await screen.findByRole('status')).toHaveTextContent(/Cita médica reprogramada exitosamente/i);

    // El diálogo activo muestra el detalle actualizado con la sección de auditoría
    const modalAudit = await screen.findByRole('dialog');
    expect(within(modalAudit).getByText(/Historial de reprogramaciones \(Auditoría\)/i)).toBeInTheDocument();
    expect(within(modalAudit).getByText(/Paciente solicita cambio de turno por compromiso laboral vespertino/i)).toBeInTheDocument();
  });

  it('V09: Cancelar cita exige motivo obligatorio según normativa (CA06) y actualiza estado a CANCELADA', async () => {
    const user = userEvent.setup();
    render(<App />);

    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    const linkAgenda = await screen.findByRole('link', { name: /Agenda de citas/i });
    await user.click(linkAgenda);

    // Clic en la cita de Claudia Méndez
    const citaCard = await screen.findByText('Claudia Méndez Arriola');
    await user.click(citaCard);

    const modalDetalle = await screen.findByRole('dialog');
    const botonCancelar = within(modalDetalle).getByRole('button', { name: /Cancelar cita/i });
    await user.click(botonCancelar);

    // Modal de Cancelación
    const modalCancelar = await screen.findByRole('dialog');
    expect(within(modalCancelar).getByText(/Cancelar Cita Médica \(V09\)/i)).toBeInTheDocument();
    expect(within(modalCancelar).getByText(/Confirmación de cancelación clínica/i)).toBeInTheDocument();

    // Intentar confirmar sin motivo
    const botonConfirmar = within(modalCancelar).getByRole('button', { name: /Confirmar cancelación/i });
    await user.click(botonConfirmar);

    expect(await within(modalCancelar).findByRole('alert')).toHaveTextContent(/El motivo de cancelación es estrictamente obligatorio/i);

    // Escribir motivo clínico / administrativo
    const textareaMotivo = within(modalCancelar).getByLabelText(/Motivo de cancelación \(obligatorio\)/i);
    await user.type(textareaMotivo, 'Paciente notifica imposibilidad de traslado por emergencia familiar');

    // Confirmar cancelación
    await user.click(botonConfirmar);

    // Notificación
    expect(await screen.findByRole('status')).toHaveTextContent(/Cita médica cancelada con motivo registrado/i);

    // En el detalle la cita ahora muestra badge CANCELADA y el motivo
    const modalActualizado = await screen.findByRole('dialog');
    expect(within(modalActualizado).getByText('Cancelada')).toBeInTheDocument();
    expect(within(modalActualizado).getByText(/Paciente notifica imposibilidad de traslado por emergencia familiar/i)).toBeInTheDocument();
  });
});
