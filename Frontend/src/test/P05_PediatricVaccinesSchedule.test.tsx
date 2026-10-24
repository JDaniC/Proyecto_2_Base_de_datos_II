import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('P05 — Esquema de Vacunación y Dosis Pendientes (P05, CA11)', () => {
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
    tokenSintetico: 'inst-token-ped-05'
  };

  it('P05: Despliega KPIs de cobertura vacunal, dosis aplicadas, pendientes y futuras (P05)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    window.history.pushState({}, '', '/pacientes/pac-ped-001?tab=vacunacion');

    render(<App />);

    // Encabezado del menor
    expect((await screen.findAllByText('Mateo Nicolás Álvarez Arrecis')).length).toBeGreaterThan(0);

    // Pestaña activa
    expect(screen.getByRole('tab', { name: /Esquema de vacunación/i })).toBeInTheDocument();

    // Banner de regla CA11 y KPIs
    expect(
      await screen.findByText(/Control de Inmunizaciones y Esquema Oficial \(P05, Regla CA11\)/i)
    ).toBeInTheDocument();

    expect(screen.getByText(/Total Esquema/i)).toBeInTheDocument();
    expect(screen.getByText(/Aplicadas \(Vigentes\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Dosis Pendientes/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Dosis Futuras/i)).toBeInTheDocument();
    expect(screen.getByText(/Cobertura Total/i)).toBeInTheDocument();

    // Biológicos presentes en el esquema
    expect(screen.getAllByText(/BCG \(Bacilo de Calmette-Guérin\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Hepatitis B Pediátrica/i).length).toBeGreaterThan(0);

    // Estados reflejados
    expect(screen.getAllByText('APLICADA').length).toBeGreaterThan(0);
  });

  it('P05: Permite conmutar filtros de estado de dosis (P05)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    window.history.pushState({}, '', '/pacientes/pac-ped-001?tab=vacunacion');

    const user = userEvent.setup();
    render(<App />);

    expect(
      await screen.findByText(/Control de Inmunizaciones y Esquema Oficial/i)
    ).toBeInTheDocument();

    // Botones de filtro
    const btnFiltroAplicadas = screen.getByRole('button', { name: /Aplicadas \(/i });
    await user.click(btnFiltroAplicadas);

    // Solo deben mostrarse dosis aplicadas
    expect(screen.getAllByText('APLICADA').length).toBeGreaterThan(0);
    expect(screen.queryByText('FUTURA')).not.toBeInTheDocument();

    // Cambiar a todas
    const btnFiltroTodas = screen.getByRole('button', { name: /Todas \(/i });
    await user.click(btnFiltroTodas);

    expect(screen.getAllByText('APLICADA').length).toBeGreaterThan(0);
  });

  it('P05: Permite filtrar vacunas del esquema por búsqueda de texto (P05)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    window.history.pushState({}, '', '/pacientes/pac-ped-001?tab=vacunacion');

    const user = userEvent.setup();
    render(<App />);

    expect(
      await screen.findByText(/Control de Inmunizaciones y Esquema Oficial/i)
    ).toBeInTheDocument();

    const inputBuscar = screen.getByPlaceholderText(/Buscar vacuna o patología/i);
    await user.type(inputBuscar, 'Tuberculosis');

    expect(screen.getByText(/BCG \(Bacilo de Calmette-Guérin\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/Hepatitis B Pediátrica/i)).not.toBeInTheDocument();
  });
});
