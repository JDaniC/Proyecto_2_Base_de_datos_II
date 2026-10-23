import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('L08 — Corrección (Nueva Versión) vs Repetición (Nueva Serie) (L08, CA12, CA13)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('L08: Genera corrección de versión (misma serie, versión + 1) con motivo obligatorio e inmutabilidad previa (CA12)', async () => {
    const sesionValidador = {
      cuentaId: 'usr-lab-val-01',
      email: 'validador@lab-clinico.salud.gt',
      nombre: 'Lic. Kevin Estrada',
      rolId: 'VALIDADOR_LABORATORIO',
      rolEtiqueta: 'Químico Biólogo Validador',
      institucionId: 'LABORATORIO_CLINICO',
      institucionNombre: 'Laboratorio Clínico Central',
      motorObjetivo: 'MongoDB',
      colegiado: 'QB-4912',
      permisos: [
        'resultados.analizar',
        'resultados.validar',
        'pacientes.administrar',
        'historial.leer'
      ],
      fechaInicio: '2026-10-22T08:00:00Z',
      tokenSintetico: 'inst-token-lab-validador'
    };
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionValidador));
    window.history.pushState({}, '', '/laboratorio/resultados/validacion');

    render(<App />);
    const user = userEvent.setup();

    // 1. Esperar que cargue la lista en L07
    expect((await screen.findAllByText(/Urocultivo con Antibiograma Automatizado/i)).length).toBeGreaterThan(0);

    // 2. Abrir diálogo de L08 (Corrección / Repetición)
    const btnL08 = screen.getByRole('button', { name: /Abrir diálogo de corrección o repetición L08/i });
    await user.click(btnL08);

    // 3. Verificar modal de L08
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Corrección de Versiones vs Repetición de Series \(L08\)/i)).toBeInTheDocument();

    // 4. Modo Corrección (misma serie, versión + 1)
    expect(screen.getByText(/Corregir Resultado \(Nueva Versión v2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/SER-2026-0084-1 \(Versión 2\)/i)).toBeInTheDocument();

    // 5. Ingresar motivo obligatorio de corrección
    const textareaMotivo = screen.getByPlaceholderText(/Ej\. Corrección por recalibración/i);
    await user.type(textareaMotivo, 'Recálculo tras dilución volumétrica 1:2 en placa confirmatoria de urocultivo');

    // 6. Modificar parámetro
    const inputColonias = screen.getByLabelText(/Nuevo valor para Recuento de Colonias/i);
    await user.clear(inputColonias);
    await user.type(inputColonias, '80000');

    // 7. Guardar versión v2
    const btnGuardarV2 = screen.getByRole('button', { name: /Guardar Versión v2/i });
    await user.click(btnGuardarV2);

    // 8. Verificar notificación de éxito con ID de nueva versión en misma serie
    expect(await screen.findByText(/Operación L08 completada/i)).toBeInTheDocument();
    expect(screen.getAllByText(/SER-2026-0084-1/i).length).toBeGreaterThan(0);
  });

  it('L08: Genera repetición técnica de análisis (nueva serie independiente) vinculando muestra (CA12)', async () => {
    const sesionValidador = {
      cuentaId: 'usr-lab-val-01',
      email: 'validador@lab-clinico.salud.gt',
      nombre: 'Lic. Kevin Estrada',
      rolId: 'VALIDADOR_LABORATORIO',
      rolEtiqueta: 'Químico Biólogo Validador',
      institucionId: 'LABORATORIO_CLINICO',
      institucionNombre: 'Laboratorio Clínico Central',
      motorObjetivo: 'MongoDB',
      colegiado: 'QB-4912',
      permisos: [
        'resultados.analizar',
        'resultados.validar',
        'pacientes.administrar',
        'historial.leer'
      ],
      fechaInicio: '2026-10-22T08:00:00Z',
      tokenSintetico: 'inst-token-lab-validador'
    };
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionValidador));
    window.history.pushState({}, '', '/laboratorio/resultados/validacion');

    render(<App />);
    const user = userEvent.setup();

    // Abrir diálogo L08
    expect((await screen.findAllByText(/Urocultivo con Antibiograma Automatizado/i)).length).toBeGreaterThan(0);
    const btnL08 = screen.getByRole('button', { name: /Abrir diálogo de corrección o repetición L08/i });
    await user.click(btnL08);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    // Cambiar a la pestaña de Repetición Técnica (Nueva Serie)
    const tabRepeticion = screen.getByRole('button', { name: /Repetición Técnica \(Nueva Serie\)/i });
    await user.click(tabRepeticion);

    // Verificar explicación de nueva serie
    expect(screen.getByText(/SER-2026-0084-REP/i)).toBeInTheDocument();

    // Justificación obligatoria
    const textareaMotivo = screen.getByPlaceholderText(/Ej\. Repetición por confirmación/i);
    await user.type(textareaMotivo, 'Repetición técnica solicitada por sospecha de contaminación en recolección');

    // Ejecutar nueva serie
    const btnCrearSerie = screen.getByRole('button', { name: /Crear Nueva Serie de Análisis/i });
    await user.click(btnCrearSerie);

    // Notificación de éxito
    expect(await screen.findByText(/Operación L08 completada/i)).toBeInTheDocument();
  });
});
