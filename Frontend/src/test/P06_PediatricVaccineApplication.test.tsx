import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('P06 — Aplicación Determinista de Vacuna y Prevención de Doble Dosis (P06, Regla CA11)', () => {
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
    tokenSintetico: 'inst-token-ped-06'
  };

  it('P06: Permite registrar la aplicación de una dosis pendiente capturando lote y sitio (P06)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    window.history.pushState({}, '', '/pacientes/pac-ped-002?tab=vacunacion');

    const user = userEvent.setup();
    render(<App />);

    expect((await screen.findAllByText('Sofía Valentina Lemus Monroy')).length).toBeGreaterThan(0);

    // Esperar y abrir modal general de aplicación de vacuna
    const btnAplicar = await screen.findByRole('button', { name: /Aplicar \/ Registrar Vacuna \(P06\)/i });
    await user.click(btnAplicar);

    expect(
      await screen.findByRole('heading', { name: /Registrar Aplicación de Vacuna \(P06, Regla CA11\)/i })
    ).toBeInTheDocument();

    // Muestra clave determinista CA11
    expect(screen.getByText(/Clave Determinista CA11:/i)).toBeInTheDocument();

    // Llenar lote
    const inputLote = screen.getByPlaceholderText(/ej. VAC-GT-2026-09A/i);
    await user.type(inputLote, 'LOT-BCG-2026-X1');

    // Registrar dosis
    const btnGuardar = screen.getByRole('button', { name: /Registrar Dosis Aplicada \(CA11\)/i });
    await user.click(btnGuardar);

    // Notificación de éxito
    expect(
      await screen.findByText(/Aplicación de vacuna registrada exitosamente/i)
    ).toBeInTheDocument();
  });

  it('P06: Regla CA11 impide registrar dos veces la misma dosis para el mismo menor (Prevención doble aplicación)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionPediatria));
    // pac-ped-001 ya tiene aplicada la dosis única de BCG (dos-bcg-01)
    window.history.pushState({}, '', '/pacientes/pac-ped-001?tab=vacunacion');

    const user = userEvent.setup();
    render(<App />);

    expect((await screen.findAllByText('Mateo Nicolás Álvarez Arrecis')).length).toBeGreaterThan(0);

    // Abrir modal para intentar registrar nuevamente la dosis de BCG ya aplicada
    const btnAplicar = await screen.findByRole('button', { name: /Aplicar \/ Registrar Vacuna \(P06\)/i });
    await user.click(btnAplicar);

    expect(
      await screen.findByRole('heading', { name: /Registrar Aplicación de Vacuna \(P06, Regla CA11\)/i })
    ).toBeInTheDocument();

    // La vacuna por defecto es BCG (vac-01) y dosis única (dos-bcg-01)
    const inputLote = screen.getByPlaceholderText(/ej. VAC-GT-2026-09A/i);
    await user.type(inputLote, 'INTENTO-DUPLICADO-99');

    const btnGuardar = screen.getByRole('button', { name: /Registrar Dosis Aplicada \(CA11\)/i });
    await user.click(btnGuardar);

    // Debe saltar el error de la Regla CA11
    expect(
      await screen.findByText(/Regla CA11 \(Prevención de doble aplicación\): La dosis seleccionada ya fue administrada previamente/i)
    ).toBeInTheDocument();
  });
});
