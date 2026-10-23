import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('L11 — Equipos y Control de Calidad Analítico (L11)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sesionAnalistaQC = {
    cuentaId: 'usr-lab-analista-01',
    email: 'analista@lab-clinico.salud.gt',
    nombre: 'Licda. Sofía Paniagua',
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
    fechaInicio: '2026-10-22T08:00:00Z',
    tokenSintetico: 'inst-token-lab-analista'
  };

  it('L11: Muestra el tablero de control de calidad con KPIs, corridas QC y reglas de Westgard', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionAnalistaQC));
    window.history.pushState({}, '', '/laboratorio/calidad');

    render(<App />);

    // Título y reglas
    expect(await screen.findByText(/Control de Calidad Analítico y Estado de Equipos \(L11\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Reglas de Westgard/i)).toBeInTheDocument();

    // KPIs
    expect(screen.getByText(/Total Corridas QC/i)).toBeInTheDocument();
    expect(screen.getByText(/Aceptadas \(\|Z\| ≤ 2 SD\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Advertencias \(1:2s\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Rechazadas \(1:3s\)/i)).toBeInTheDocument();

    // Corridas iniciales del mock
    expect(await screen.findByText('QC-2026-1022-01')).toBeInTheDocument();
    expect(screen.getAllByText(/PreciControl Troponin Lote 88214/i).length).toBeGreaterThan(0);
    expect(screen.getByText('+0.33 SD')).toBeInTheDocument();
    expect(screen.getByText('QC-2026-1022-03')).toBeInTheDocument();
    expect(screen.getByText('+2.5 SD')).toBeInTheDocument();
    expect(screen.getByText(/Regla Westgard 1:2s/i)).toBeInTheDocument();
  });

  it('L11: Registra una nueva corrida de control de calidad con cálculo automático de Z-score y evaluación', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionAnalistaQC));
    window.history.pushState({}, '', '/laboratorio/calidad');

    render(<App />);
    const user = userEvent.setup();

    // Abrir modal de nueva corrida QC
    const btnNuevaCorrida = await screen.findByRole('button', { name: /Nueva Corrida QC \(L11\)/i });
    await user.click(btnNuevaCorrida);

    // Modal visible
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Registrar Corrida de Control de Calidad \(L11\)/i)).toBeInTheDocument();

    // Rellenar formulario
    const inputLote = screen.getByLabelText(/Lote de Material Control \*/i);
    await user.clear(inputLote);
    await user.type(inputLote, 'PreciControl Cardíaco Lote 99401');

    const inputValor = screen.getByLabelText(/Valor Analítico Medido \*/i);
    await user.clear(inputValor);
    await user.type(inputValor, '0.027');

    const btnGuardar = screen.getByRole('button', { name: /Guardar y Evaluar Corrida/i });
    await user.click(btnGuardar);

    // Debe aparecer en la tabla con su nuevo lote y evaluación
    expect(await screen.findByText('PreciControl Cardíaco Lote 99401')).toBeInTheDocument();
    expect(screen.getByText('0.027 ng/mL')).toBeInTheDocument();
  });

  it('L11: Permite consultar parque de equipos analíticos y cambiar su estado operativo', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionAnalistaQC));
    window.history.pushState({}, '', '/laboratorio/calidad');

    render(<App />);
    const user = userEvent.setup();

    // Cambiar a pestaña de equipos
    const tabEquipos = await screen.findByRole('tab', { name: /Parque de Equipos Analíticos/i });
    await user.click(tabEquipos);

    // Verificar tarjetas de equipos
    expect(await screen.findByText('EQ-ROCHE-01')).toBeInTheDocument();
    expect(screen.getByText('Analizador Roche Cobas e 411')).toBeInTheDocument();
    expect(screen.getByText('EQ-SYSMEX-02')).toBeInTheDocument();
    expect(screen.getByText('Analizador Hematológico Sysmex XN-550')).toBeInTheDocument();
    expect(screen.getByText('CALIBRACION_PENDIENTE')).toBeInTheDocument();

    // Poner primer equipo en mantenimiento
    const btnMantenimiento = screen.getAllByRole('button', { name: /Poner en Mantenimiento/i })[0];
    await user.click(btnMantenimiento);

    // El estado del equipo debe cambiar a EN_MANTENIMIENTO
    expect(await screen.findByText('EN_MANTENIMIENTO')).toBeInTheDocument();
  });
});
