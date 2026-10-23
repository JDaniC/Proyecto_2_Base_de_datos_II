import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('P02 — Seguimiento de Crecimiento y Percentiles OMS (P02, CA10)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sesionPediatria = {
    cuentaId: 'usr-ped-01',
    email: 'dra.marcela@pediatria-demo.gt',
    nombre: 'Dra. Marcela Estrada',
    rolId: 'PEDIATRA',
    rolEtiqueta: 'Médico Pediatra',
    institucionId: 'CENTRO_PEDIATRICO',
    institucionNombre: 'Centro Médico Pediátrico',
    motorObjetivo: 'Firestore',
    permisos: [
      'pacientes.administrar',
      'consultas.registrar',
      'historial.leer',
      'usuarios.administrar'
    ],
    fechaInicio: '2026-10-22T08:00:00Z',
    tokenSintetico: 'inst-token-ped-02'
  };

  it('P02: Muestra el seguimiento longitudinal de crecimiento, KPIs e IMC honesto (CA10)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    window.history.pushState({}, '', '/pacientes/pac-ped-001?tab=crecimiento');

    render(<App />);

    // Encabezado del expediente
    expect((await screen.findAllByText('Mateo Nicolás Álvarez Arrecis')).length).toBeGreaterThan(0);

    // Pestaña activa
    expect(screen.getByRole('tab', { name: /Crecimiento y curvas OMS/i })).toBeInTheDocument();

    // Banner de regla CA10
    expect(await screen.findByText(/Seguimiento Longitudinal y Evaluación Somatométrica \(P02, Regla CA10\)/i)).toBeInTheDocument();

    // Tarjetas KPI
    expect(screen.getByText(/Último Peso Medido/i)).toBeInTheDocument();
    expect((await screen.findAllByText('16.50 kg')).length).toBeGreaterThan(0);

    expect(screen.getByText(/Última Talla Medida/i)).toBeInTheDocument();
    expect(screen.getAllByText('103.5 cm').length).toBeGreaterThan(0);

    expect(screen.getAllByText(/Índice de Masa Corporal \(IMC\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('15.4 kg/m²').length).toBeGreaterThan(0);

    expect(screen.getByText(/Perímetro Cefálico/i)).toBeInTheDocument();
    expect(screen.getAllByText('50.8 cm').length).toBeGreaterThan(0);

    // Tabla longitudinal
    expect(screen.getByText(/Historial de Controles Somatométricos/i)).toBeInTheDocument();
    expect(screen.getByText('4 años (48 m)')).toBeInTheDocument();
    expect(screen.getByText('3 años (36 m)')).toBeInTheDocument();
    expect(screen.getByText('2 años (24 m)')).toBeInTheDocument();

    // Curvas referenciales OMS
    expect(screen.getByText(/Curvas de Crecimiento Referenciales OMS/i)).toBeInTheDocument();
    expect(screen.getByText(/Percentil 50 \(Mediana OMS\)/i)).toBeInTheDocument();
  });

  it('P02: Calcula honestamente las variaciones entre controles sucesivos (CA10)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    window.history.pushState({}, '', '/pacientes/pac-ped-001?tab=crecimiento');

    render(<App />);

    // El último control (4 años, 16.5kg) respecto al previo (3 años, 14.6kg) tiene variación de +1.9 kg
    expect((await screen.findAllByText('+1.9 kg')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('+7.5 cm').length).toBeGreaterThan(0);

    // El control de 3 años (14.6kg) respecto a 2 años (12.4kg) tiene variación de +2.2 kg
    expect(screen.getByText('+2.2 kg')).toBeInTheDocument();
    expect(screen.getByText('+9 cm')).toBeInTheDocument();
  });

  it('P02: Permite registrar una nueva medición somatométrica con cálculo reactivo de IMC (Regla CA10)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    window.history.pushState({}, '', '/pacientes/pac-ped-001?tab=crecimiento');

    const user = userEvent.setup();
    render(<App />);

    expect((await screen.findAllByText('16.50 kg')).length).toBeGreaterThan(0);

    // Abrir modal de nuevo control
    const btnNuevo = screen.getByRole('button', { name: /Nuevo Control de Crecimiento \(P02\)/i });
    await user.click(btnNuevo);

    expect(await screen.findByRole('heading', { name: /Nuevo Control de Crecimiento/i })).toBeInTheDocument();

    // Llenar medición: peso 18.2 kg y talla 108.0 cm
    const inputPeso = screen.getByPlaceholderText('ej. 16.50');
    await user.type(inputPeso, '18.20');

    const inputTalla = screen.getByPlaceholderText('ej. 103.5');
    await user.type(inputTalla, '108.0');

    // Debe mostrar cálculo derivado reactivo de IMC en el modal
    expect(screen.getByText(/15.60 kg\/m²/i)).toBeInTheDocument();

    const btnGuardar = screen.getByRole('button', { name: /Guardar Medición Somatométrica \(CA10\)/i });
    await user.click(btnGuardar);

    // Debe actualizarse la tabla con la nueva medición y el nuevo KPI
    expect((await screen.findAllByText('18.20 kg')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('108.0 cm').length).toBeGreaterThan(0);
    expect(screen.getAllByText('15.6 kg/m²').length).toBeGreaterThan(0);
  });
});
