import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('L12 — Reactivos, Lotes e Inventario de Laboratorio (L12, CA15)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sesionInventario = {
    cuentaId: 'usr-lab-inv-01',
    email: 'inventario@lab-clinico.salud.gt',
    nombre: 'Licda. Marcela Estrada',
    rolId: 'ANALISTA_LABORATORIO',
    rolEtiqueta: 'Encargada de Reactivos e Insumos',
    institucionId: 'LABORATORIO_CLINICO',
    institucionNombre: 'Laboratorio Clínico Central',
    motorObjetivo: 'MongoDB',
    permisos: [
      'resultados.analizar',
      'inventario.administrar',
      'pacientes.administrar',
      'historial.leer'
    ],
    fechaInicio: '2026-10-22T08:00:00Z',
    tokenSintetico: 'inst-token-lab-inv'
  };

  it('L12: Muestra el listado de lotes de reactivos, saldos disponibles, revisiones de stock y estados (CA15)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionInventario));
    window.history.pushState({}, '', '/laboratorio/inventario');

    render(<App />);

    // Encabezado y Regla CA15
    expect(await screen.findByText(/Inventario de Reactivos, Lotes y Kardex \(L12\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Regla CA15/i).length).toBeGreaterThan(0);

    // KPIs
    expect(screen.getByText(/Lotes Disponibles/i)).toBeInTheDocument();
    expect(screen.getByText(/Saldo Total Disponible/i)).toBeInTheDocument();
    expect(screen.getByText(/Lotes Vencidos \/ Bloqueados/i)).toBeInTheDocument();

    // Lotes del mock
    expect(await screen.findByText('LOT-GLU-2026-A')).toBeInTheDocument();
    expect(screen.getByText('Reactivo Hexoquinasa Glucosa Cobas')).toBeInTheDocument();
    expect(screen.getByText(/1,450 Determinaciones/i)).toBeInTheDocument();
    expect(screen.getByText(/Revisión stock: #3/i)).toBeInTheDocument();

    // Lote vencido
    expect(screen.getByText('LOT-URI-2025-X')).toBeInTheDocument();
    expect(screen.getByText(/Bloqueado para consumo/i)).toBeInTheDocument();
    expect(screen.getByText('VENCIDO')).toBeInTheDocument();
  });

  it('L12: Registra un consumo analítico válido incrementando la revisión de stock y deduciendo el saldo (CA15)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionInventario));
    window.history.pushState({}, '', '/laboratorio/inventario');

    render(<App />);
    const user = userEvent.setup();

    // Esperar carga de lotes
    expect(await screen.findByText('LOT-GLU-2026-A')).toBeInTheDocument();

    // Abrir modal de movimiento
    const btnMovimiento = screen.getByRole('button', { name: /Registrar Movimiento \(CA15\)/i });
    await user.click(btnMovimiento);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Registrar Movimiento de Inventario \(CA15\)/i)).toBeInTheDocument();

    // Seleccionar cantidad 50
    const inputCantidad = screen.getByLabelText(/Cantidad/i);
    await user.clear(inputCantidad);
    await user.type(inputCantidad, '50');

    // Motivo
    const inputMotivo = screen.getByLabelText(/Motivo Justificado \(Regla CA15\) \*/i);
    await user.clear(inputMotivo);
    await user.type(inputMotivo, 'Corrida matutina de 50 glucosas de pacientes hospitalarios');

    // Guardar
    const btnGuardar = screen.getByRole('button', { name: /Confirmar Movimiento \(CA15\)/i });
    await user.click(btnGuardar);

    // Saldo anterior era 1450, deducido 50 = 1400 y revisión stock incrementada a #4
    expect(await screen.findByText(/1,400 Determinaciones/i)).toBeInTheDocument();
    expect(screen.getByText(/Revisión stock: #4/i)).toBeInTheDocument();
  });

  it('L12: Regla CA15: Bloquea consumos analíticos en lotes con estado VENCIDO', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionInventario));
    window.history.pushState({}, '', '/laboratorio/inventario');

    render(<App />);
    const user = userEvent.setup();

    // Esperar carga y hacer clic en el botón de la fila del lote vencido
    const loteVencido = await screen.findByText('LOT-URI-2025-X');
    const filaVencido = loteVencido.closest('tr')!;
    const btnFilaVencido = within(filaVencido).getByRole('button', { name: /Registrar Movimiento/i });
    await user.click(btnFilaVencido);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Bloqueo de Regla CA15/i)).toBeInTheDocument();

    // Intentar registrar consumo
    const inputCantidad = screen.getByLabelText(/Cantidad/i);
    await user.clear(inputCantidad);
    await user.type(inputCantidad, '10');

    const btnGuardar = screen.getByRole('button', { name: /Confirmar Movimiento \(CA15\)/i });
    await user.click(btnGuardar);

    // Debe mostrar error de bloqueo
    expect(await screen.findByText(/Bloqueo de seguridad analítica/i)).toBeInTheDocument();
    expect(screen.getByText(/No se permite registrar consumos de un lote en estado VENCIDO/i)).toBeInTheDocument();
  });

  it('L12: Regla CA15: Bloquea intentos de consumo o salida que dejen saldo negativo', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionInventario));
    window.history.pushState({}, '', '/laboratorio/inventario');

    render(<App />);
    const user = userEvent.setup();

    // Esperar carga y abrir modal
    expect(await screen.findByText('LOT-GLU-2026-A')).toBeInTheDocument();
    const btnMovimiento = screen.getByRole('button', { name: /Registrar Movimiento \(CA15\)/i });
    await user.click(btnMovimiento);

    // Intentar consumir 99999 (mucho más de lo disponible)
    const inputCantidad = screen.getByLabelText(/Cantidad/i);
    await user.clear(inputCantidad);
    await user.type(inputCantidad, '99999');

    const btnGuardar = screen.getByRole('button', { name: /Confirmar Movimiento \(CA15\)/i });
    await user.click(btnGuardar);

    // Error de saldo insuficiente
    expect(await screen.findByText(/Saldo insuficiente/i)).toBeInTheDocument();
    expect(screen.getByText(/No se permiten saldos negativos/i)).toBeInTheDocument();
  });

  it('L12: Permite auditar el Kardex append-only de movimientos históricos', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionInventario));
    window.history.pushState({}, '', '/laboratorio/inventario');

    render(<App />);
    const user = userEvent.setup();

    // Cambiar a pestaña Kardex
    const tabKardex = await screen.findByRole('tab', { name: /Kardex \/ Historial de Movimientos/i });
    await user.click(tabKardex);

    expect(await screen.findByText(/Kardex Analítico de Movimientos de Inventario \(Regla CA15\)/i)).toBeInTheDocument();
    expect(await screen.findByText(/Recepción de pedido mensual de insumos Roche Diagnostics/i)).toBeInTheDocument();
    expect(screen.getByText(/Consumo analítico en Cobas c 311/i)).toBeInTheDocument();
  });
});
