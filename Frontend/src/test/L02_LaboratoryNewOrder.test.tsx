import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('L02 — Crear Orden de Laboratorio Clínico (L02)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('L02: Registra una orden de laboratorio clínico con prioridad STAT, pruebas versionadas y redirección a bandeja', async () => {
    const sesionRecepcion = {
      usuarioId: 'usr-lab-rec-01',
      email: 'recepcion@lab-clinico.salud.gt',
      nombre: 'Sofía Valenzuela',
      rolId: 'ANALISTA_LABORATORIO',
      rolEtiqueta: 'Recepción y Toma de Muestras',
      institucionId: 'LABORATORIO_CLINICO',
      institucionNombre: 'Laboratorio Clínico Central',
      motorObjetivo: 'MongoDB',
      permisos: [
        'pacientes.administrar',
        'resultados.analizar',
        'historial.leer'
      ],
      fechaInicio: '2026-10-19T08:00:00Z',
      tokenSintetico: 'inst-token-lab-rec'
    };
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionRecepcion));
    window.history.pushState({}, '', '/laboratorio/ordenes/nueva');

    render(<App />);

    // Título de la vista L02
    expect(
      await screen.findByRole('heading', {
        name: /Crear Orden de Laboratorio Clínico \(L02\)/i
      })
    ).toBeInTheDocument();

    const user = userEvent.setup();

    // 1. Seleccionar paciente
    const btnSeleccionar = (await screen.findAllByRole('button', { name: /Seleccionar/i }))[0];
    await user.click(btnSeleccionar);
    expect(screen.getByText(/Cambiar Paciente/i)).toBeInTheDocument();

    // 2. Médico y Prioridad STAT
    const inputMedico = screen.getByLabelText(/Médico Solicitante \*/i);
    await user.type(inputMedico, 'Dr. Luis Morales');

    const selectPrioridad = screen.getByLabelText(/Prioridad Analítica \*/i);
    await user.selectOptions(selectPrioridad, 'STAT');

    // Banner de advertencia STAT
    expect(screen.getByText(/Las órdenes con prioridad/i)).toBeInTheDocument();

    // Motivo clínico
    const inputMotivo = screen.getByLabelText(/Motivo Clínico \/ Justificación Diagnóstica \*/i);
    await user.type(inputMotivo, 'Fiebre persistente, leucocitosis marcada y sospecha de foco séptico');

    // 3. Selección de Prueba analítica
    const checkPrueba = (await screen.findAllByRole('checkbox'))[0];
    await user.click(checkPrueba);

    // 4. Resumen preanalítico de contenedores
    expect(screen.getByText(/Contenedores de Muestra a recolectar automáticamente:/i)).toBeInTheDocument();

    // 5. Emitir orden
    const btnEmitir = screen.getByRole('button', { name: /Emitir Orden de Laboratorio \(L02\)/i });
    expect(btnEmitir).toBeEnabled();
    await user.click(btnEmitir);

    // Verificación de redirección a bandeja L01 y visualización de la orden
    expect(
      await screen.findByRole('heading', {
        name: /Bandeja de Trabajo de Laboratorio Clínico \(L01\)/i
      })
    ).toBeInTheDocument();
  });
});
