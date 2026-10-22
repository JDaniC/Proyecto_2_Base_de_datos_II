import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('H02 — Ingreso y Detalle de Hospitalización (H02, H04, CA17)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('H02: Admisión hospitalaria registra nuevo internamiento asignando cama disponible', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión con Dra. Elena Morales
    const botonLogin = screen.getByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Navegar a Hospitalizaciones
    const linkHospitalizaciones = await screen.findByRole('link', { name: /^Hospitalizaciones$/i });
    await user.click(linkHospitalizaciones);

    // Click en Nuevo Ingreso (H02)
    const botonNuevoIngreso = await screen.findByRole('button', { name: /Nuevo Ingreso \(H02\)/i });
    await user.click(botonNuevoIngreso);

    // Verificar encabezado de H02
    expect(await screen.findByRole('heading', { name: /Registro de Ingreso Hospitalario \(H02\)/i })).toBeInTheDocument();
    expect(screen.getByText(/Garantía de Asignación Semiabierta \(CA17\)/i)).toBeInTheDocument();

    // Seleccionar a Roberto Estrada Morales
    const pacienteSelect = screen.getByLabelText(/Paciente a Hospitalizar/i);
    await user.selectOptions(pacienteSelect, 'pac-hosp-001');

    // Rellenar motivo de ingreso
    const motivoInput = screen.getByLabelText(/Motivo de Ingreso y Hallazgos Clínicos/i);
    await user.type(motivoInput, 'Paciente ingresa por bronconeumonía con requerimiento de oxigenoterapia continua.');

    // Confirmar ingreso
    const botonConfirmar = screen.getByRole('button', { name: /Confirmar Ingreso Hospitalario \(H02\)/i });
    await user.click(botonConfirmar);

    // Debe navegar a la vista de detalle H02
    expect(await screen.findByRole('heading', { name: /Roberto Estrada Morales/i })).toBeInTheDocument();
    expect(screen.getAllByText(/ACTIVA/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Paciente ingresa por bronconeumonía con requerimiento de oxigenoterapia continua/i)).toBeInTheDocument();
  });

  it('H02: Detalle de internamiento muestra notas de evolución, historial H04 y permite registrar alta médica', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    // Navegar a Hospitalizaciones
    const linkHospitalizaciones = await screen.findByRole('link', { name: /^Hospitalizaciones$/i });
    await user.click(linkHospitalizaciones);

    // Abrir detalle del primer paciente activo
    const botonesDetalle = await screen.findAllByRole('button', { name: /Ver Detalle/i });
    await user.click(botonesDetalle[0]);

    // Verificar encabezado de detalle H02
    expect(await screen.findByRole('heading', { name: /Roberto Estrada Morales/i })).toBeInTheDocument();
    expect(screen.getByText(/Cama 201-B \(Medicina Interna\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Datos del Ingreso Hospitalario/i)).toBeInTheDocument();

    // Comprobar pestañas de detalle
    const tabCamas = screen.getByRole('tab', { name: /Historial de Camas \(H04\)/i });
    await user.click(tabCamas);
    expect(await screen.findByText(/Auditoría de asignación semiabierta \[inicio, fin\) \(CA17\)/i)).toBeInTheDocument();

    // Comprobar pestaña de evolución
    const tabEvolucion = screen.getByRole('tab', { name: /Evolución y Notas/i });
    await user.click(tabEvolucion);
    expect(await screen.findByText(/Paciente ingresa hemodinámicamente estable pero con PA 170\/105 mmHg/i)).toBeInTheDocument();

    // Registrar Egreso / Alta Médica
    const botonAlta = screen.getByRole('button', { name: /Registrar Egreso \(Alta\)/i });
    await user.click(botonAlta);

    // Modal de egreso
    expect(await screen.findByRole('heading', { name: /Registrar Egreso Hospitalario \(H02\)/i })).toBeInTheDocument();
    const resumenInput = screen.getByLabelText(/Resumen Clínico de Estancia y Plan Ambulatorio/i);
    await user.type(resumenInput, 'Paciente estabilizado con buena respuesta a medicación oral. Alta con seguimiento ambulatorio en 15 días.');

    const botonConfirmarAlta = screen.getByRole('button', { name: /Confirmar Egreso y Liberar Cama/i });
    await user.click(botonConfirmarAlta);

    // Debe reflejar estado EGRESADA y resumen de egreso
    expect(await screen.findByRole('heading', { name: /Resumen de Egreso Hospitalario/i })).toBeInTheDocument();
    expect(screen.getAllByText(/EGRESADA/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Sin Cama Asignada/i)).toBeInTheDocument();
  });

  it('H02: Rechaza vinculación de consultas incompatibles de otro paciente (409 REFERENCIA_INCOMPATIBLE / CA17)', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión
    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    // Navegar a Hospitalizaciones
    const linkHospitalizaciones = await screen.findByRole('link', { name: /^Hospitalizaciones$/i });
    await user.click(linkHospitalizaciones);

    // Click en Nuevo Ingreso (H02)
    const botonNuevoIngreso = await screen.findByRole('button', { name: /Nuevo Ingreso \(H02\)/i });
    await user.click(botonNuevoIngreso);

    // Activar vinculación de consulta y provocar error incompatible
    const checkboxVincular = await screen.findByRole('checkbox', { name: /Vincular consulta ambulatoria previa/i });
    await user.click(checkboxVincular);

    const checkboxIncompatible = await screen.findByRole('checkbox', { name: /Provocar cruce con recurso de otro paciente/i });
    await user.click(checkboxIncompatible);

    const motivoInput = screen.getByLabelText(/Motivo de Ingreso y Hallazgos Clínicos/i);
    await user.type(motivoInput, 'Evaluación de prueba de aislamiento inter-paciente.');

    const botonConfirmar = screen.getByRole('button', { name: /Confirmar Ingreso Hospitalario \(H02\)/i });
    await user.click(botonConfirmar);

    // Debe mostrar la alerta de error 409 REFERENCIA_INCOMPATIBLE
    const alerta = await screen.findByRole('alert');
    expect(alerta).toBeInTheDocument();
    expect(within(alerta).getByText(/409 REFERENCIA_INCOMPATIBLE/i)).toBeInTheDocument();
  });
});
