import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';

describe('H06 — Órdenes de Examen y Resultados Hospitalarios (H06, RF-H05)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/acceso');
  });

  it('H06: Accede a /hospital/examenes y visualiza lista de órdenes, KPIs y estados', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Iniciar sesión
    const botonLogin = screen.getByRole('button', { name: /Iniciar sesión/i });
    await user.click(botonLogin);

    // Navegar a Órdenes de examen desde el sidebar
    const linkExamenes = await screen.findByRole('link', { name: /Órdenes de examen/i });
    await user.click(linkExamenes);

    // Encabezado y KPIs
    expect(await screen.findByRole('heading', { name: /Órdenes de Examen y Resultados Hospitalarios \(H06\)/i })).toBeInTheDocument();
    expect(screen.getByText(/Órdenes Totales/i)).toBeInTheDocument();
    expect(screen.getByText(/Pendientes \/ En Proceso/i)).toBeInTheDocument();
    expect(screen.getByText(/Resultados Validados/i)).toBeInTheDocument();
    expect(screen.getByText(/Urgentes \/ STAT/i)).toBeInTheDocument();

    // Comprobar orden existente de Roberto Estrada Morales tras resolver carga
    expect(await screen.findByText('ORD-HOSP-2026-0041')).toBeInTheDocument();
    expect(screen.getAllByText('Roberto Estrada Morales').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Cama 201-A').length).toBeGreaterThanOrEqual(1);
  });

  it('H06: Abre detalle y visualiza resultados estructurados con parámetros, valores y rangos de referencia', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }));
    const linkExamenes = await screen.findByRole('link', { name: /Órdenes de examen/i });
    await user.click(linkExamenes);

    // Esperar a que la tabla cargue
    expect(await screen.findByText('ORD-HOSP-2026-0041')).toBeInTheDocument();

    // Abrir detalle de la orden ORD-HOSP-2026-0041
    const botonesDetalle = await screen.findAllByRole('button', { name: /Ver Detalle y Resultados \(H06\)/i });
    await user.click(botonesDetalle[0]);

    // Verificar modal abierto con código de orden
    expect(await screen.findByRole('heading', { name: /Orden de Examen y Resultados \(H06\) — ORD-HOSP-2026-0041/i })).toBeInTheDocument();

    // Validar parámetros, unidades y rangos de referencia analíticos tras cargar
    expect(await screen.findByText('Recuento de Leucocitos')).toBeInTheDocument();
    expect(screen.getByText('7.4')).toBeInTheDocument();
    expect(screen.getAllByText('10^3/µL').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('4.5 - 11.0')).toBeInTheDocument();

    // Validar parámetro de Glucosa con evaluación descriptiva 'Elevado'
    expect(screen.getByText('Glucosa')).toBeInTheDocument();
    expect(screen.getByText('118.0')).toBeInTheDocument();
    expect(screen.getByText('70.0 - 100.0')).toBeInTheDocument();
    expect(screen.getByText('Elevado')).toBeInTheDocument();

    // Validar firma de químico biólogo responsable
    expect(screen.getAllByText(/Licda\. Sofia Morales \(Química Bióloga\)/i).length).toBeGreaterThanOrEqual(1);
  });

  it('H06: Emite una nueva orden médica de examen desde el modal institucional', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }));
    const linkExamenes = await screen.findByRole('link', { name: /Órdenes de examen/i });
    await user.click(linkExamenes);

    // Abrir modal de nueva orden
    const btnNuevaOrden = screen.getByRole('button', { name: /Nueva Orden de Examen \(H06\)/i });
    await user.click(btnNuevaOrden);

    expect(await screen.findByRole('heading', { name: /Nueva Solicitud \/ Orden de Examen Hospitalario \(H06\)/i })).toBeInTheDocument();

    // Llenar campos
    const inputMotivo = screen.getByLabelText(/Justificación \/ Motivo Clínico \*/i);
    await user.type(inputMotivo, 'Monitoreo metabólico preoperatorio');

    // Seleccionar prueba del catálogo
    const checkHematologia = screen.getByRole('checkbox', { name: /Hematología Completa Automatizada/i });
    await user.click(checkHematologia);

    // Emitir orden
    const btnEmitir = screen.getByRole('button', { name: /Confirmar emisión de orden médica/i });
    await user.click(btnEmitir);

    // Notificación de éxito
    expect(await screen.findByText(/Orden médica de examen emitida exitosamente/i)).toBeInTheDocument();
  });

  it('H06: Visualiza las órdenes de examen del paciente desde la pestaña del expediente clínico', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

    // Navegar a Pacientes y abrir expediente
    const linkPacientes = await screen.findByRole('link', { name: /Pacientes/i });
    await user.click(linkPacientes);

    const botonVerExpediente = await screen.findByRole('button', {
      name: /Ver expediente de Roberto Estrada Morales/i
    });
    await user.click(botonVerExpediente);

    // Cambiar a la pestaña de Exámenes y resultados
    const tabExamenes = await screen.findByRole('tab', { name: /Exámenes y resultados/i });
    await user.click(tabExamenes);

    // Verificar cabecera H06 dentro del expediente
    expect(await screen.findByRole('heading', { name: /Órdenes de Examen y Resultados de Laboratorio \(H06\)/i })).toBeInTheDocument();

    // Comprobar orden de Roberto Estrada Morales
    expect(await screen.findByText('ORD-HOSP-2026-0041')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Solicitar Examen \(H06\)/i })).toBeInTheDocument();
  });
});
