import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';

describe('L13 — Cobros, Facturación y Pagos de Laboratorio (L13, CA14)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sesionCaja = {
    cuentaId: 'usr-lab-caja-01',
    email: 'cobros@lab-clinico.salud.gt',
    nombre: 'Recepción Central y Caja',
    rolId: 'ANALISTA_LABORATORIO',
    rolEtiqueta: 'Cajero / Recepcionista',
    institucionId: 'LABORATORIO_CLINICO',
    institucionNombre: 'Laboratorio Clínico Central',
    motorObjetivo: 'MongoDB',
    permisos: [
      'resultados.analizar',
      'pacientes.administrar',
      'usuarios.administrar',
      'historial.leer'
    ],
    fechaInicio: '2026-10-22T08:00:00Z',
    tokenSintetico: 'inst-token-lab-caja'
  };

  it('L13: Muestra el listado de facturas, totales en GTQ sin coma flotante y tarjetas KPI (CA14)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionCaja));
    window.history.pushState({}, '', '/laboratorio/cobros');

    render(<App />);

    // Encabezado
    expect(await screen.findByText(/Cobros y Facturación de Laboratorio/i)).toBeInTheDocument();
    expect(screen.getByText(/Liquidación de órdenes analíticas en unidades enteras GTQ/i)).toBeInTheDocument();

    // KPIs
    expect(screen.getByText(/Total Facturado/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Cobrado/i)).toBeInTheDocument();
    expect(screen.getByText(/Saldo Pendiente/i)).toBeInTheDocument();
    expect(screen.getByText(/Facturas Pendientes/i)).toBeInTheDocument();

    // Facturas iniciales
    expect(await screen.findByText('FACT-LAB-2026-0081')).toBeInTheDocument();
    expect(screen.getByText('Ana Lucía Morales')).toBeInTheDocument();
    expect(screen.getByText('Q 420.00')).toBeInTheDocument();
    expect(screen.getByText('Q 200.00')).toBeInTheDocument();
    expect(screen.getByText('Q 220.00')).toBeInTheDocument();
    expect(screen.getAllByText('Pago Parcial').length).toBeGreaterThan(0);

    expect(screen.getByText('FACT-LAB-2026-0085')).toBeInTheDocument();
    expect(screen.getByText('Jorge Mario Castillo')).toBeInTheDocument();
    expect(screen.getAllByText('Pagada Total').length).toBeGreaterThan(0);
  });

  it('L13: Bloquea el sobrepago impidiendo montos superiores al saldo pendiente (Regla CA14)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionCaja));
    window.history.pushState({}, '', '/laboratorio/cobros');

    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText('FACT-LAB-2026-0081')).toBeInTheDocument();

    // Localizar la fila de Ana Lucía Morales
    const fila = screen.getByText('FACT-LAB-2026-0081').closest('tr');
    expect(fila).not.toBeNull();

    const botonPagar = within(fila!).getByRole('button', { name: /Registrar Pago \(CA14\)/i });
    await user.click(botonPagar);

    // Modal de cobro debe abrirse
    expect(await screen.findByText(/Registrar Cobro de Factura/i)).toBeInTheDocument();
    expect(screen.getByText(/Saldo Pendiente Actual:/i)).toBeInTheDocument();

    // Intentar pagar Q 500.00 (saldo es Q 220.00)
    const inputMonto = screen.getByPlaceholderText('0.00');
    await user.clear(inputMonto);
    await user.type(inputMonto, '500.00');

    // Debe mostrar advertencia reactiva de sobrepago
    expect(await screen.findByText(/Bloqueo de Sobrepago \(Regla CA14\)/i)).toBeInTheDocument();
    expect(screen.getByText(/supera el saldo pendiente/i)).toBeInTheDocument();

    // El botón Confirmar Pago (CA14) debe estar deshabilitado
    const botonConfirmar = screen.getByRole('button', { name: /Confirmar Pago \(CA14\)/i });
    expect(botonConfirmar).toBeDisabled();
  });

  it('L13: Registra un pago válido en centavos enteros GTQ y liquida saldo (Regla CA14)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionCaja));
    window.history.pushState({}, '', '/laboratorio/cobros');

    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText('FACT-LAB-2026-0081')).toBeInTheDocument();

    const fila = screen.getByText('FACT-LAB-2026-0081').closest('tr');
    const botonPagar = within(fila!).getByRole('button', { name: /Registrar Pago \(CA14\)/i });
    await user.click(botonPagar);

    expect(await screen.findByText(/Registrar Cobro de Factura/i)).toBeInTheDocument();

    // Liquidar los Q 220.00 restantes
    const botonLiquidar = screen.getByText(/Liquidar Saldo Total/i);
    await user.click(botonLiquidar);

    const botonConfirmar = screen.getByRole('button', { name: /Confirmar Pago \(CA14\)/i });
    expect(botonConfirmar).not.toBeDisabled();

    await user.click(botonConfirmar);

    // Verificar notificación de éxito
    expect(await screen.findByText(/registrado con éxito/i)).toBeInTheDocument();

    // La factura ahora debe estar en Pagada Total con saldo Q 0.00
    const filaActualizada = (await screen.findByText('FACT-LAB-2026-0081')).closest('tr');
    expect(within(filaActualizada!).getByText('Pagada Total')).toBeInTheDocument();
    expect(within(filaActualizada!).getByText('Q 0.00')).toBeInTheDocument();
  });

  it('L13: Pestaña de Recibos y Reversión de Comprobante reabriendo saldo (Regla CA14)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionCaja));
    window.history.pushState({}, '', '/laboratorio/cobros');

    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText('FACT-LAB-2026-0081')).toBeInTheDocument();

    // Cambiar a la pestaña de Recibos
    const tabRecibos = screen.getByRole('button', { name: /Recibos y Auditoría de Pagos/i });
    await user.click(tabRecibos);

    // Debe mostrar los recibos emitidos
    expect(await screen.findByText('REC-2026-0042')).toBeInTheDocument();
    expect(screen.getByText('REC-2026-0039')).toBeInTheDocument();

    // Localizar fila del recibo REC-2026-0042 (de la factura FACT-LAB-2026-0081)
    const filaRecibo = screen.getByText('REC-2026-0042').closest('tr');
    expect(filaRecibo).not.toBeNull();

    const botonRevertir = within(filaRecibo!).getByRole('button', { name: /Revertir/i });
    await user.click(botonRevertir);

    // Modal de reversión
    expect(await screen.findByText(/Revertir Recibo de Pago/i)).toBeInTheDocument();
    expect(screen.getByText(/Efecto contable de la reversión:/i)).toBeInTheDocument();

    // Ingresar motivo justificado
    const inputMotivo = screen.getByPlaceholderText(/Detalle la causa/i);
    await user.type(inputMotivo, 'Error de digitación en la terminal POS.');

    const botonConfirmarReversion = screen.getByRole('button', { name: /Confirmar Reversión/i });
    await user.click(botonConfirmarReversion);

    // Notificación de reversión exitosa
    expect(await screen.findByText(/revertido correctamente/i)).toBeInTheDocument();

    // El estado del recibo en la tabla pasa a Revertido
    const filaReciboActualizada = (await screen.findByText('REC-2026-0042')).closest('tr');
    expect(within(filaReciboActualizada!).getByText('Revertido')).toBeInTheDocument();
  });

  it('L13: Bloquea anulación de factura si tiene pagos confirmados activos (Regla CA14)', async () => {
    localStorage.setItem('clinica_demo_sesion_v1', JSON.stringify(sesionCaja));
    window.history.pushState({}, '', '/laboratorio/cobros');

    render(<App />);

    expect(await screen.findByText('FACT-LAB-2026-0081')).toBeInTheDocument();

    // FACT-LAB-2026-0081 tiene un pago confirmado activo (REC-2026-0042)
    const fila = screen.getByText('FACT-LAB-2026-0081').closest('tr');
    const botonAnular = within(fila!).getByRole('button', { name: /Anular/i });

    // Debe estar deshabilitado según Regla CA14
    expect(botonAnular).toBeDisabled();
    expect(botonAnular).toHaveAttribute(
      'title',
      expect.stringContaining('Regla CA14: No se puede anular porque posee pagos activos')
    );
  });
});
