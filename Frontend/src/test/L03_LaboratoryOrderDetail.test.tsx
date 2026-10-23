import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('L03 — Detalle y Seguimiento de Orden de Laboratorio (L03)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('L03: Visualiza detalle completo de orden, stepper operativo, pruebas, muestras y trazabilidad (L05)', async () => {
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
    window.history.pushState({}, '', '/laboratorio/ordenes/ord-lab-01');

    render(<App />);

    // Título y Prioridad L03
    expect(
      await screen.findByRole('heading', {
        name: /Orden ORD-LAB-2026-0081 \(L03\)/i
      })
    ).toBeInTheDocument();

    expect(screen.getByText(/STAT \(Emergencia Vital\)/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. En Análisis/i)).toBeInTheDocument();

    // Datos del paciente y médico
    expect(screen.getByText('Ana Lucía Morales')).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Fernando Arévalo/i)).toBeInTheDocument();
    expect(screen.getByText(/cetoacidosis diabética/i)).toBeInTheDocument();

    // Pestaña 1: Pruebas Analíticas Solicitadas
    expect(screen.getByText(/Gasometría Arterial Completa/i)).toBeInTheDocument();
    expect(screen.getByText(/Electrólitos Séricos/i)).toBeInTheDocument();
    expect(screen.getByText(/Q 420\.00/i)).toBeInTheDocument();

    const user = userEvent.setup();

    // Pestaña 2: Muestras y Contenedores
    const tabMuestras = screen.getByRole('tab', { name: /Muestras y Contenedores/i });
    await user.click(tabMuestras);

    expect(screen.getByText('MUE-2026-0081-01')).toBeInTheDocument();
    expect(screen.getByText('ACEPTADA')).toBeInTheDocument();
    expect(screen.getByText(/Jeringa Heparinizada/i)).toBeInTheDocument();

    // Pestaña 3: Trazabilidad de Muestra y Eventos (L05)
    const tabTrazabilidad = screen.getByRole('tab', { name: /Trazabilidad de Muestra y Eventos \(L05\)/i });
    await user.click(tabTrazabilidad);

    expect(screen.getByText(/Punción en arteria radial izquierda/i)).toBeInTheDocument();
    expect(screen.getByText(/Licda\. Carmen Valladares/i)).toBeInTheDocument();
    expect(screen.getByText(/Criterios preanalíticos cumplidos/i)).toBeInTheDocument();
  });

  it('L03: Muestra mensaje de alerta si la orden no existe', async () => {
    const sesionAnalista = {
      usuarioId: 'usr-lab-analista-01',
      email: 'analista@lab-clinico.salud.gt',
      nombre: 'Lic. Kevin Estrada',
      rolId: 'ANALISTA_LABORATORIO',
      rolEtiqueta: 'Analista de Laboratorio Clínico',
      institucionId: 'LABORATORIO_CLINICO',
      institucionNombre: 'Laboratorio Clínico Central',
      motorObjetivo: 'MongoDB',
      permisos: ['resultados.analizar', 'historial.leer'],
      fechaInicio: '2026-10-19T08:00:00Z',
      tokenSintetico: 'inst-token-lab-analista'
    };
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionAnalista));
    window.history.pushState({}, '', '/laboratorio/ordenes/ord-inexistente-999');

    render(<App />);

    expect(await screen.findByText(/Orden no encontrada/i)).toBeInTheDocument();
  });
});
