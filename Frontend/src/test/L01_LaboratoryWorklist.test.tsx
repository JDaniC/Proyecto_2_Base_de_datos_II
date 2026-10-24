import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('L01 — Bandeja de Trabajo de Laboratorio Clínico (L01)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('L01: Analista de laboratorio visualiza bandeja de trabajo con métricas, órdenes priorizadas (STAT/Urgente) y muestras', async () => {
    const sesionAnalista = {
      usuarioId: 'usr-lab-analista-01',
      email: 'analista@lab-clinico.salud.gt',
      nombre: 'Lic. Kevin Estrada',
      rolId: 'ANALISTA_LABORATORIO',
      rolEtiqueta: 'Analista de Laboratorio Clínico',
      institucionId: 'LABORATORIO_CLINICO',
      institucionNombre: 'Laboratorio Clínico Central',
      motorObjetivo: 'MongoDB',
      permisos: [
        'resultados.analizar',
        'pacientes.administrar',
        'historial.leer'
      ],
      fechaInicio: '2026-10-19T08:00:00Z',
      tokenSintetico: 'inst-token-lab-analista'
    };
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionAnalista));
    window.history.pushState({}, '', '/laboratorio/bandeja');

    render(<App />);

    // Encabezado institucional L01
    expect(
      await screen.findByRole('heading', {
        name: /Bandeja de Trabajo de Laboratorio Clínico \(L01\)/i
      })
    ).toBeInTheDocument();

    // Botones de acción del flujo analítico L02 y L04
    expect(screen.getByRole('button', { name: /Nueva Orden de Laboratorio \(L02\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gestión de Muestras \(L04\)/i })).toBeInTheDocument();

    // Métricas operativas
    expect(screen.getByText('Total Órdenes en Bandeja')).toBeInTheDocument();
    expect(screen.getByText('Emergencias (STAT / Urgente)')).toBeInTheDocument();

    // Órdenes con clasificación de prioridad y pacientes
    expect(await screen.findByText('ORD-LAB-2026-0081')).toBeInTheDocument();
    expect(screen.getByText('Ana Lucía Morales')).toBeInTheDocument();
    expect(screen.getByText('STAT')).toBeInTheDocument();
    expect(screen.getByText(/Gasometría Arterial Completa/i)).toBeInTheDocument();

    expect(screen.getByText('ORD-LAB-2026-0082')).toBeInTheDocument();
    expect(screen.getByText('Carlos Fernando López')).toBeInTheDocument();
    expect(screen.getAllByText('URGENTE').length).toBeGreaterThan(0);

    expect(screen.getByText('ORD-LAB-2026-0083')).toBeInTheDocument();
    expect(screen.getByText('Sofía Daniela Reyes')).toBeInTheDocument();

    // Filtro interactivo por búsqueda de paciente
    const user = userEvent.setup();
    const inputBusqueda = screen.getByPlaceholderText(/Buscar por paciente, DPI, médico/i);
    await user.type(inputBusqueda, 'Sofía');

    expect(await screen.findByText('ORD-LAB-2026-0083')).toBeInTheDocument();
    expect(screen.queryByText('ORD-LAB-2026-0081')).not.toBeInTheDocument();
    expect(screen.queryByText('ORD-LAB-2026-0082')).not.toBeInTheDocument();
  });

  it('L01: Usuario sin permisos analíticos recibe bloqueo de acceso 403 SIN_PERMISO', async () => {
    const sesionSinPermiso = {
      usuarioId: 'usr-sin-permiso',
      email: 'externo@salud.gt',
      nombre: 'Usuario Externo',
      rolId: 'SECRETARIA',
      rolEtiqueta: 'Personal de Apoyo',
      institucionId: 'HOSPITAL_GENERAL',
      institucionNombre: 'Hospital General',
      motorObjetivo: 'PostgreSQL',
      permisos: ['citas.administrar'],
      fechaInicio: '2026-10-19T08:00:00Z',
      tokenSintetico: 'inst-token-sin-permiso'
    };
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionSinPermiso));
    window.history.pushState({}, '', '/laboratorio/bandeja');

    render(<App />);

    expect(
      await screen.findByText(/403 SIN_PERMISO/i)
    ).toBeInTheDocument();
  });
});
