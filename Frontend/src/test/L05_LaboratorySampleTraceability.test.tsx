import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('L05 — Trazabilidad de Muestra y Bitácora de Eventos (L05, CA12)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('L05: Abre bitácora de trazabilidad de muestra y registra rectificación auditada de dato preanalítico (CA12)', async () => {
    const sesionAnalista = {
      usuarioId: 'usr-lab-analista-01',
      email: 'analista@lab-clinico.salud.gt',
      nombre: 'Lic. Kevin Estrada',
      rolId: 'ANALISTA_LABORATORIO',
      rolEtiqueta: 'Analista de Calidad',
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
    window.history.pushState({}, '', '/laboratorio/muestras');

    render(<App />);

    const user = userEvent.setup();

    // Abrir modal de trazabilidad L05 de la muestra MUE-2026-0081-01
    const btnTrazabilidad = (await screen.findAllByRole('button', { name: /Ver trazabilidad/i }))[0];
    await user.click(btnTrazabilidad);

    // Modal de Trazabilidad L05
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Bitácora de Trazabilidad y Eventos \(L05\)/i)).toBeInTheDocument();
    expect(screen.getAllByText('MUE-2026-0081-01').length).toBeGreaterThan(0);

    // Eventos cronológicos existentes
    expect(screen.getByText(/Punción en arteria radial izquierda/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Licda\. Carmen Valladares/i).length).toBeGreaterThan(0);

    // Abrir formulario de rectificación CA12
    const btnRectificar = screen.getByRole('button', { name: /Rectificar Dato Administrativo \(CA12\)/i });
    await user.click(btnRectificar);

    expect(screen.getByText(/Rectificación Auditada de Dato Preanalítico/i)).toBeInTheDocument();

    // Llenar datos de rectificación
    const inputNuevoValor = screen.getByPlaceholderText(/Ej\. Tubo Lila/i);
    const inputMotivo = screen.getByPlaceholderText(/Ej\. Corrección por especificación/i);

    await user.type(inputNuevoValor, 'Jeringa Heparinizada 2 mL con filtro hermético');
    await user.type(inputMotivo, 'Aclaración de capacidad volumétrica de émbolo por protocolo de gasometría');

    const btnGuardar = screen.getByRole('button', { name: /Guardar Rectificación/i });
    await user.click(btnGuardar);

    // Verificación de nuevo evento en la bitácora
    expect(await screen.findByText(/RECTIFICACION/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Jeringa Heparinizada 2 mL con filtro hermético/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Aclaración de capacidad volumétrica/i)).toBeInTheDocument();
  });
});
