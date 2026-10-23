import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('H05 — Seguros y Cobertura del Paciente (H05)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  const abrirExpedienteYSeguros = async (user: ReturnType<typeof userEvent.setup>) => {
    // Iniciar sesión
    const botonLogin = await screen.findByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Ir a Pacientes
    const linkPacientes = await screen.findByRole('link', { name: /Pacientes/i });
    await user.click(linkPacientes);

    // Ver expediente de Roberto Estrada Morales
    const botonVerExpediente = await screen.findByRole('button', {
      name: /Ver expediente de Roberto Estrada Morales/i
    });
    await user.click(botonVerExpediente);

    // Esperar encabezado del expediente
    expect(await screen.findByRole('heading', { name: 'Roberto Estrada Morales' })).toBeInTheDocument();

    // Cambiar a la pestaña de Seguros y cobertura
    const tabSeguros = await screen.findByRole('tab', { name: /Seguros y cobertura/i });
    await user.click(tabSeguros);
  };

  it('H05: Visualiza las pólizas y coberturas activas del paciente en el expediente clínico', async () => {
    const user = userEvent.setup();
    render(<App />);

    await abrirExpedienteYSeguros(user);

    // Esperar a que cargue el encabezado H05
    expect(await screen.findByRole('heading', { name: /Seguros Médicos y Pólizas de Cobertura \(H05\)/i })).toBeInTheDocument();

    // Validar tarjetas de resumen KPI
    expect(screen.getByText(/Pólizas Vigentes/i)).toBeInTheDocument();
    expect(screen.getByText(/Cobertura Máxima/i)).toBeInTheDocument();
    expect(screen.getAllByText(/90%/i).length).toBeGreaterThanOrEqual(1);

    // Validar datos de la póliza de Seguros El Roble
    expect(screen.getAllByText(/Seguros El Roble/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('POL-ROB-2026-4401')).toBeInTheDocument();
    expect(screen.getByText(/Plan Roble Oro Hospitalario/i)).toBeInTheDocument();
    expect(screen.getByText(/Q 500/i)).toBeInTheDocument();
  });

  it('H05: Permite suspender y reactivar una póliza existente', async () => {
    const user = userEvent.setup();
    render(<App />);

    await abrirExpedienteYSeguros(user);

    expect(await screen.findByRole('heading', { name: /Seguros Médicos y Pólizas de Cobertura \(H05\)/i })).toBeInTheDocument();

    // Suspender póliza
    const btnSuspender = screen.getByRole('button', { name: /Suspender/i });
    await user.click(btnSuspender);

    // Verificar notificación y cambio de estado
    expect(await screen.findByText(/Póliza actualizada a estado SUSPENDIDA/i)).toBeInTheDocument();

    // Reactivar póliza
    const btnReactivar = screen.getByRole('button', { name: /Reactivar/i });
    await user.click(btnReactivar);

    expect(await screen.findByText(/Póliza actualizada a estado ACTIVA/i)).toBeInTheDocument();
  });

  it('H05: Abre modal de afiliación y registra una nueva póliza para el paciente', async () => {
    const user = userEvent.setup();
    render(<App />);

    await abrirExpedienteYSeguros(user);

    expect(await screen.findByRole('heading', { name: /Seguros Médicos y Pólizas de Cobertura \(H05\)/i })).toBeInTheDocument();

    // Abrir modal de afiliación
    const btnAfiliar = screen.getByRole('button', { name: /Afiliar Póliza \(H05\)/i });
    await user.click(btnAfiliar);

    // Verificar modal abierto
    expect(await screen.findByRole('heading', { name: /Afiliar Póliza de Seguro Médico \(H05\)/i })).toBeInTheDocument();

    // Llenar formulario
    const inputPoliza = screen.getByLabelText(/Número de Póliza \*/i);
    await user.type(inputPoliza, 'POL-G&T-2026-X');

    const inputCert = screen.getByLabelText(/Certificado \/ Carné de Afiliado \*/i);
    await user.type(inputCert, 'CERT-99');

    // Confirmar afiliación
    const btnConfirmar = screen.getByRole('button', { name: /Confirmar afiliación de póliza/i });
    await user.click(btnConfirmar);

    // Notificación de éxito
    expect(await screen.findByText(/Póliza de seguro afiliada exitosamente/i)).toBeInTheDocument();
    // La nueva póliza aparece en la lista
    expect(screen.getByText('POL-G&T-2026-X')).toBeInTheDocument();
  });
});
