import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('L04 — Registro y Recepción de Muestras de Laboratorio (L04, CA12)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('L04: Flujo preanalítico de muestras (Toma → Recepción → Rechazo con motivo → Retoma unívoca CA12)', async () => {
    const sesionFlebotomista = {
      usuarioId: 'usr-lab-flebo-01',
      email: 'flebotomia@lab-clinico.salud.gt',
      nombre: 'Licda. Carmen Valladares',
      rolId: 'ANALISTA_LABORATORIO',
      rolEtiqueta: 'Flebotomista y Analista',
      institucionId: 'LABORATORIO_CLINICO',
      institucionNombre: 'Laboratorio Clínico Central',
      motorObjetivo: 'MongoDB',
      permisos: [
        'resultados.analizar',
        'pacientes.administrar',
        'historial.leer'
      ],
      fechaInicio: '2026-10-19T08:00:00Z',
      tokenSintetico: 'inst-token-lab-flebo'
    };
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionFlebotomista));
    window.history.pushState({}, '', '/laboratorio/muestras');

    render(<App />);

    // Título L04
    expect(
      await screen.findByRole('heading', {
        name: /Registro y Recepción de Muestras \(L04\)/i
      })
    ).toBeInTheDocument();

    // Métricas preanalíticas
    expect(screen.getByText('Total Muestras')).toBeInTheDocument();
    expect(screen.getByText('Pendientes de Flebotomía')).toBeInTheDocument();

    // Muestras en tabla
    expect(await screen.findByText('MUE-2026-0081-01')).toBeInTheDocument();
    expect(screen.getByText('MUE-2026-0082-01')).toBeInTheDocument();

    const user = userEvent.setup();

    // 1. Registrar Toma de Muestra MUE-2026-0082-01
    const btnToma = (await screen.findAllByRole('button', { name: /Registrar Toma/i }))[0];
    await user.click(btnToma);

    // Debe avanzar a TOMADA y mostrar botón Recibir en Lab
    const btnRecibir = await screen.findByRole('button', { name: /Recibir en Lab/i });
    expect(btnRecibir).toBeInTheDocument();
    await user.click(btnRecibir);

    // Debe avanzar a RECIBIDA y mostrar botones Aceptar y Rechazar
    const btnRechazar = await screen.findByRole('button', { name: /Rechazar/i });
    expect(btnRechazar).toBeInTheDocument();
    await user.click(btnRechazar);

    // Modal de rechazo preanalítico
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Rechazo de Muestra/i)).toBeInTheDocument();

    const btnConfirmarRechazo = screen.getByRole('button', { name: /Confirmar Rechazo/i });
    await user.click(btnConfirmarRechazo);

    // Muestra queda RECHAZADA y ofrece Registrar Retoma (CA12)
    const btnRetoma = await screen.findByRole('button', { name: /Registrar Retoma \(CA12\)/i });
    expect(btnRetoma).toBeInTheDocument();
    await user.click(btnRetoma);

    // Modal de retoma CA12
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Registrar Retoma de Muestra \(CA12\)/i)).toBeInTheDocument();

    const btnGenerarRetoma = screen.getByRole('button', { name: /Generar Retoma Unívoca/i });
    await user.click(btnGenerarRetoma);

    // Verifica que se generó la retoma MUE-2026-0082-01-R1
    expect(await screen.findByText('MUE-2026-0082-01-R1')).toBeInTheDocument();
    expect(screen.getAllByText('RETOMA').length).toBeGreaterThan(0);
  });
});
