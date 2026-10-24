import { Alert } from '../../design-system/components/Alert';
import { Modal } from '../../design-system/components/Modal';
import { getErrorMessage } from '../../services/errors';
import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Eye
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { MetricStrip } from '../../design-system/components/MetricStrip';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import {
  FacturaLaboratorio,
  PagoLaboratorio,
  MetodoPagoLab,
  EstadoFacturaLab
} from '../../services/types';

export const BillingPaymentsPage: React.FC = () => {
  const { sesion } = useAuthSession();
  const { laboratoryRepository } = useServices();
  const institucionId = sesion?.institucionId || 'LABORATORIO_CLINICO';

  const [activeTab, setActiveTab] = useState<'facturas' | 'recibos'>('facturas');
  const [loading, setLoading] = useState(true);
  const [notificacion, setNotificacion] = useState<{ tipo: 'success' | 'error' | 'info'; mensaje: string } | null>(null);

  // Datos
  const [facturas, setFacturas] = useState<FacturaLaboratorio[]>([]);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoFacturaLab | 'TODOS'>('TODOS');

  // Modales
  const [showModalPago, setShowModalPago] = useState(false);
  const [showModalRevertir, setShowModalRevertir] = useState(false);
  const [showModalAnular, setShowModalAnular] = useState(false);
  const [showModalDetalle, setShowModalDetalle] = useState(false);

  // Selección
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<FacturaLaboratorio | null>(null);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<PagoLaboratorio | null>(null);

  // Formulario Pago (CA14)
  const [montoIngresadoQ, setMontoIngresadoQ] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<MetodoPagoLab>('EFECTIVO');
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [errorPago, setErrorPago] = useState<string | null>(null);
  const [procesandoPago, setProcesandoPago] = useState(false);

  // Formulario Reversión
  const [motivoReversion, setMotivoReversion] = useState('');
  const [errorReversion, setErrorReversion] = useState<string | null>(null);
  const [procesandoReversion, setProcesandoReversion] = useState(false);

  // Formulario Anulación
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [errorAnulacion, setErrorAnulacion] = useState<string | null>(null);
  const [procesandoAnulacion, setProcesandoAnulacion] = useState(false);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const facturasData = await laboratoryRepository.obtenerFacturas(institucionId);
      setFacturas(facturasData);
    } catch {
      setNotificacion({
        tipo: 'error',
        mensaje: 'Error al cargar las facturas y cobros de laboratorio.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [institucionId]);

  // Formateador de moneda en Quetzales desde centavos enteros
  const formatearGTQ = (centavos: number) => {
    return `Q ${(centavos / 100).toFixed(2)}`;
  };

  // Convertir string de quetzales a centavos enteros sin flotantes
  const parsearACentavos = (valorStr: string): number => {
    const limpio = valorStr.replace(/[^0-9.]/g, '');
    const num = parseFloat(limpio);
    if (isNaN(num) || num < 0) return 0;
    return Math.round(num * 100);
  };

  // Generador de clave de idempotencia única
  const generarClaveIdempotencia = (facturaId: string) => {
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    return `idemp-${facturaId}-${Date.now()}-${randomSuffix}`;
  };

  // Abrir Modal de Pago
  const handleAbrirPago = (factura: FacturaLaboratorio) => {
    setFacturaSeleccionada(factura);
    setMontoIngresadoQ((factura.saldoPendienteCentavos / 100).toFixed(2));
    setMetodoPago('EFECTIVO');
    setIdempotencyKey(generarClaveIdempotencia(factura.id));
    setErrorPago(null);
    setShowModalPago(true);
  };

  // Abrir Modal de Reversión
  const handleAbrirRevertir = (factura: FacturaLaboratorio, pago: PagoLaboratorio) => {
    setFacturaSeleccionada(factura);
    setPagoSeleccionado(pago);
    setMotivoReversion('');
    setErrorReversion(null);
    setShowModalRevertir(true);
  };

  // Abrir Modal de Anulación
  const handleAbrirAnular = (factura: FacturaLaboratorio) => {
    setFacturaSeleccionada(factura);
    setMotivoAnulacion('');
    setErrorAnulacion(null);
    setShowModalAnular(true);
  };

  // Abrir Detalle
  const handleAbrirDetalle = (factura: FacturaLaboratorio) => {
    setFacturaSeleccionada(factura);
    setShowModalDetalle(true);
  };

  // Validación reactiva de sobrepago (CA14)
  const montoCentavosActual = parsearACentavos(montoIngresadoQ);
  const saldoPendienteActual = facturaSeleccionada?.saldoPendienteCentavos || 0;
  const esSobrepago = montoCentavosActual > saldoPendienteActual;

  // Registrar Pago (CA14)
  const handleConfirmarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facturaSeleccionada) return;

    if (montoCentavosActual <= 0) {
      setErrorPago('El monto a pagar debe ser mayor a cero.');
      return;
    }

    if (esSobrepago) {
      setErrorPago(
        `El monto ingresado (${formatearGTQ(
          montoCentavosActual
        )}) supera el saldo pendiente (${formatearGTQ(saldoPendienteActual)}).`
      );
      return;
    }

    if (!idempotencyKey.trim()) {
      setErrorPago('No se pudo iniciar el cobro. Inténtalo de nuevo.');
      return;
    }

    try {
      setProcesandoPago(true);
      setErrorPago(null);

      const cajero = {
        id: sesion?.cuentaId || 'cajero-actual',
        nombre: sesion?.nombre || 'Recepción Central'
      };

      const resultado = await laboratoryRepository.registrarPagoFactura(
        institucionId,
        {
          facturaId: facturaSeleccionada.id,
          montoCentavos: montoCentavosActual,
          metodoPago,
          idempotencyKey: idempotencyKey.trim()
        },
        cajero
      );

      setNotificacion({
        tipo: 'success',
        mensaje: `Cobro de ${formatearGTQ(resultado.pago.montoCentavos)} registrado con éxito (Recibo ${resultado.pago.codigoRecibo}).`
      });

      setShowModalPago(false);
      setFacturaSeleccionada(null);
      await cargarDatos();
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err, 'Error inesperado al registrar el cobro.');
      setErrorPago(errorMsg);
    } finally {
      setProcesandoPago(false);
    }
  };

  // Revertir Pago (CA14)
  const handleConfirmarReversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facturaSeleccionada || !pagoSeleccionado) return;

    if (!motivoReversion.trim()) {
      setErrorReversion('Debe detallar el motivo justificado de la reversión.');
      return;
    }

    try {
      setProcesandoReversion(true);
      setErrorReversion(null);

      const actor = {
        id: sesion?.cuentaId || 'cajero-actual',
        nombre: sesion?.nombre || 'Recepción Central'
      };

      await laboratoryRepository.revertirPagoFactura(
        institucionId,
        {
          facturaId: facturaSeleccionada.id,
          pagoId: pagoSeleccionado.id,
          motivo: motivoReversion.trim()
        },
        actor
      );

      setNotificacion({
        tipo: 'info',
        mensaje: `Recibo ${pagoSeleccionado.codigoRecibo} revertido correctamente. Saldo de factura reabierto.`
      });

      setShowModalRevertir(false);
      setFacturaSeleccionada(null);
      setPagoSeleccionado(null);
      await cargarDatos();
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err, 'Error al revertir el pago.');
      setErrorReversion(errorMsg);
    } finally {
      setProcesandoReversion(false);
    }
  };

  // Anular Factura (CA14)
  const handleConfirmarAnulacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facturaSeleccionada) return;

    if (!motivoAnulacion.trim()) {
      setErrorAnulacion('Debe ingresar el motivo de la anulación fiscal.');
      return;
    }

    try {
      setProcesandoAnulacion(true);
      setErrorAnulacion(null);

      const actor = {
        id: sesion?.cuentaId || 'cajero-actual',
        nombre: sesion?.nombre || 'Recepción Central'
      };

      await laboratoryRepository.anularFactura(
        institucionId,
        {
          facturaId: facturaSeleccionada.id,
          motivo: motivoAnulacion.trim()
        },
        actor
      );

      setNotificacion({
        tipo: 'info',
        mensaje: `Factura ${facturaSeleccionada.codigoFactura} anulada satisfactoriamente.`
      });

      setShowModalAnular(false);
      setFacturaSeleccionada(null);
      await cargarDatos();
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err, 'Error al anular la factura.');
      setErrorAnulacion(errorMsg);
    } finally {
      setProcesandoAnulacion(false);
    }
  };

  // Cálculos de métricas globales
  const metricas = React.useMemo(() => {
    let totalFacturadoCentavos = 0;
    let totalCobradoCentavos = 0;
    let totalSaldoCentavos = 0;
    let pendientesCount = 0;

    facturas.forEach((f) => {
      if (f.estado !== 'ANULADA') {
        totalFacturadoCentavos += f.totalCentavos;
        totalCobradoCentavos += f.totalPagadoCentavos;
        totalSaldoCentavos += f.saldoPendienteCentavos;
        if (f.saldoPendienteCentavos > 0) {
          pendientesCount++;
        }
      }
    });

    return {
      totalFacturadoCentavos,
      totalCobradoCentavos,
      totalSaldoCentavos,
      pendientesCount
    };
  }, [facturas]);

  // Facturas filtradas
  const facturasFiltradas = facturas.filter((f) => {
    const matchBusqueda =
      f.codigoFactura.toLowerCase().includes(busqueda.toLowerCase()) ||
      f.codigoOrden.toLowerCase().includes(busqueda.toLowerCase()) ||
      f.pacienteNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      f.pacienteNit.toLowerCase().includes(busqueda.toLowerCase());

    const matchEstado = filtroEstado === 'TODOS' || f.estado === filtroEstado;
    return matchBusqueda && matchEstado;
  });

  // Lista aplanada de todos los pagos
  const todosLosPagos = React.useMemo(() => {
    const lista: Array<{ factura: FacturaLaboratorio; pago: PagoLaboratorio }> = [];
    facturas.forEach((f) => {
      f.pagos.forEach((p) => {
        lista.push({ factura: f, pago: p });
      });
    });
    return lista.sort((a, b) => new Date(b.pago.fechaHora).getTime() - new Date(a.pago.fechaHora).getTime());
  }, [facturas]);

  const pagosFiltrados = todosLosPagos.filter((item) => {
    const matchBusqueda =
      item.pago.codigoRecibo.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.factura.codigoFactura.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.factura.pacienteNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.factura.pacienteNit.toLowerCase().includes(busqueda.toLowerCase());
    return matchBusqueda;
  });

  const getBadgeEstadoFactura = (estado: EstadoFacturaLab) => {
    switch (estado) {
      case 'EMITIDA':
        return <Badge variant="warning">Emitida (Pendiente)</Badge>;
      case 'PAGADA_PARCIAL':
        return <Badge variant="info">Pago Parcial</Badge>;
      case 'PAGADA_TOTAL':
        return <Badge variant="success">Pagada Total</Badge>;
      case 'ANULADA':
        return <Badge variant="neutral">Anulada</Badge>;
    }
  };

  const getBadgeMetodoPago = (metodo: MetodoPagoLab) => {
    switch (metodo) {
      case 'EFECTIVO':
        return <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Efectivo</span>;
      case 'TARJETA_CREDITO':
        return <span className="text-xs font-medium text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">Tarj. Crédito</span>;
      case 'TRANSFERENCIA_BANCARIA':
        return <span className="text-xs font-medium text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">Transferencia</span>;
      case 'SEGURO_MEDICO':
        return <span className="text-xs font-medium text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">Seguro Médico</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-clinic-primary-soft rounded-lg text-clinic-primary">
              <CreditCard size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Cobros y Facturación de Laboratorio
              </h1>
              <p className="text-sm text-slate-600">
                Consulta facturas y registra pagos de laboratorio.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={cargarDatos}
            className="flex items-center gap-2 text-slate-700 bg-white border-slate-300 hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Alerta de notificación */}
      {notificacion && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between shadow-sm border ${
            notificacion.tipo === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : notificacion.tipo === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-blue-50 text-blue-900 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notificacion.tipo === 'success' && <CheckCircle2 size={18} className="text-emerald-600" />}
            {notificacion.tipo === 'error' && <AlertTriangle size={18} className="text-rose-600" />}
            {notificacion.tipo === 'info' && <ShieldCheck size={18} className="text-blue-600" />}
            <span className="text-sm font-medium">{notificacion.mensaje}</span>
          </div>
          <button
            onClick={() => setNotificacion(null)}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            Cerrar
          </button>
        </div>
      )}

      <MetricStrip
        label="Resumen de cobros"
        items={[
          { id: 'facturado', label: 'Total facturado', value: formatearGTQ(metricas.totalFacturadoCentavos) },
          { id: 'cobrado', label: 'Total cobrado', value: formatearGTQ(metricas.totalCobradoCentavos), tone: 'success' },
          { id: 'saldo', label: 'Saldo pendiente', value: formatearGTQ(metricas.totalSaldoCentavos), tone: 'warning' },
          { id: 'facturas', label: 'Facturas pendientes', value: metricas.pendientesCount },
        ]}
      />

      {/* Tabs de Navegación y Filtros */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 px-4 pt-3 pb-2 gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('facturas')}
              className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors border-b-2 ${
                activeTab === 'facturas'
                  ? 'border-clinic-primary text-clinic-primary bg-slate-50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Facturas y Órdenes ({facturas.length})
            </button>
            <button
              onClick={() => setActiveTab('recibos')}
              className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors border-b-2 ${
                activeTab === 'recibos'
                  ? 'border-clinic-primary text-clinic-primary bg-slate-50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Recibos ({todosLosPagos.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pb-1">
            <div className="relative min-w-[240px]">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={
                  activeTab === 'facturas'
                    ? 'Buscar factura, orden o paciente...'
                    : 'Buscar recibo, factura o paciente...'
                }
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-clinic-primary"
              />
            </div>

            {activeTab === 'facturas' && (
              <div className="flex items-center gap-1.5">
                <Filter size={14} className="text-slate-400" />
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value as EstadoFacturaLab | 'TODOS')}
                  aria-label="Filtrar por estado de factura"
                  className="text-xs bg-slate-50 border border-slate-300 rounded-md py-1.5 px-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-clinic-primary"
                >
                  <option value="TODOS">Todos los estados</option>
                  <option value="EMITIDA">Emitida (Pendiente)</option>
                  <option value="PAGADA_PARCIAL">Pago Parcial</option>
                  <option value="PAGADA_TOTAL">Pagada Total</option>
                  <option value="ANULADA">Anulada</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Contenido de la Pestaña 1: Facturas */}
        {activeTab === 'facturas' && (
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 space-y-3">
                <SkeletonLoader height="40px" />
                <SkeletonLoader height="40px" />
                <SkeletonLoader height="40px" />
              </div>
            ) : facturasFiltradas.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileText size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="font-medium">No se encontraron facturas registradas</p>
                <p className="text-xs text-slate-400 mt-1">Ajuste los criterios de búsqueda o filtro</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <th className="py-3 px-4 font-semibold">N° Factura</th>
                    <th className="py-3 px-4 font-semibold">Orden / Paciente</th>
                    <th className="py-3 px-4 font-semibold">NIT</th>
                    <th className="py-3 px-4 font-semibold">Fecha Emisión</th>
                    <th className="py-3 px-4 font-semibold text-right">Total Factura</th>
                    <th className="py-3 px-4 font-semibold text-right">Total Cobrado</th>
                    <th className="py-3 px-4 font-semibold text-right">Saldo Pendiente</th>
                    <th className="py-3 px-4 font-semibold text-center">Estado</th>
                    <th className="py-3 px-4 font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {facturasFiltradas.map((factura) => {
                    const puedePagar = factura.estado !== 'PAGADA_TOTAL' && factura.estado !== 'ANULADA';
                    const tienePagosConfirmados = factura.pagos.some((p) => p.estado === 'CONFIRMADO');
                    const puedeAnular = factura.estado !== 'ANULADA' && !tienePagosConfirmados;

                    return (
                      <tr key={factura.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <span className="table-identifier">{factura.codigoFactura}</span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900">{factura.pacienteNombre}</p>
                          <p className="text-[11px] text-slate-500"><span className="table-identifier">{factura.codigoOrden}</span></p>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">
                          <span className="table-identifier">{factura.pacienteNit}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {new Date(factura.fechaEmision).toLocaleDateString('es-GT', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900">
                          <span className="table-identifier">{formatearGTQ(factura.totalCentavos)}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-emerald-700">
                          <span className="table-identifier">{formatearGTQ(factura.totalPagadoCentavos)}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-amber-700">
                          <span className="table-identifier">{formatearGTQ(factura.saldoPendienteCentavos)}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {getBadgeEstadoFactura(factura.estado)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={!puedePagar}
                              onClick={() => handleAbrirPago(factura)}
                              className="text-xs px-2.5 py-1 bg-clinic-primary hover:bg-clinic-primary-dark text-white"
                              title={
                                !puedePagar
                                  ? 'La factura ya está totalmente liquidada o anulada'
                                  : 'Registrar pago'
                              }
                            >
                              Cobrar
                            </Button>

                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleAbrirDetalle(factura)}
                              className="text-xs px-2 py-1 text-slate-700 bg-white border border-slate-300 hover:bg-slate-50"
                              title="Ver detalle de pruebas y recibos"
                            >
                              <Eye size={13} />
                            </Button>

                            <Button
                              variant="danger"
                              size="sm"
                              disabled={!puedeAnular}
                              onClick={() => handleAbrirAnular(factura)}
                              className="text-xs px-2 py-1"
                              title={
                                tienePagosConfirmados
                                  ? 'Revierte los pagos antes de anular esta factura.'
                                  : factura.estado === 'ANULADA'
                                  ? 'Factura ya anulada'
                                  : 'Anular factura'
                              }
                            >
                              Anular
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Contenido de la Pestaña 2: Recibos */}
        {activeTab === 'recibos' && (
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 space-y-3">
                <SkeletonLoader height="40px" />
                <SkeletonLoader height="40px" />
                <SkeletonLoader height="40px" />
              </div>
            ) : pagosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Receipt size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="font-medium">No hay comprobantes de pago registrados</p>
                <p className="text-xs text-slate-400 mt-1">Los recibos confirmados aparecerán en este historial</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <th className="py-3 px-4 font-semibold">N° Recibo</th>
                    <th className="py-3 px-4 font-semibold">Factura / Paciente</th>
                    <th className="py-3 px-4 font-semibold">Fecha y Hora</th>
                    <th className="py-3 px-4 font-semibold">Método</th>
                    <th className="py-3 px-4 font-semibold">Cajero</th>
                    <th className="py-3 px-4 font-semibold text-right">Monto GTQ</th>
                    <th className="py-3 px-4 font-semibold text-center">Estado</th>
                    <th className="py-3 px-4 font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagosFiltrados.map(({ factura, pago }) => {
                    const esReversible = pago.estado === 'CONFIRMADO';

                    return (
                      <tr key={pago.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900 font-mono">
                          {pago.codigoRecibo}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900">{factura.pacienteNombre}</p>
                          <p className="text-[11px] text-slate-500 font-mono"><span className="table-identifier">{factura.codigoFactura}</span></p>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {new Date(pago.fechaHora).toLocaleString('es-GT', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3 px-4">
                          {getBadgeMetodoPago(pago.metodoPago)}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {pago.cajeroNombre}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          <span className="table-identifier">{formatearGTQ(pago.montoCentavos)}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {pago.estado === 'CONFIRMADO' ? (
                            <Badge variant="success">Confirmado</Badge>
                          ) : (
                            <Badge variant="neutral">Revertido</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={!esReversible}
                            onClick={() => handleAbrirRevertir(factura, pago)}
                            className="text-xs px-2 py-1 text-rose-700 border-rose-200 hover:bg-rose-50"
                            title={
                              !esReversible
                                ? `Pago revertido el ${pago.fechaReversion ? new Date(pago.fechaReversion).toLocaleDateString() : ''}: ${pago.motivoReversion}`
                                : 'Revertir este pago y reabrir el saldo de la factura'
                            }
                          >
                            <RotateCcw size={12} className="mr-1 inline" />
                            Revertir
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: Registrar Pago (CA14) */}
      {showModalPago && facturaSeleccionada && (
        <Modal isOpen onClose={() => setShowModalPago(false)} title="Registrar pago" description={facturaSeleccionada.codigoFactura}>
          <form onSubmit={handleConfirmarPago} className="space-y-4 text-sm">
              {/* Resumen Factura */}
              <div className="billing-summary bg-slate-50 rounded-lg p-3.5 border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Factura:</span>
                  <span className="font-bold text-slate-900"><span className="table-identifier">{facturaSeleccionada.codigoFactura}</span></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paciente:</span>
                  <span className="font-semibold text-slate-900">{facturaSeleccionada.pacienteNombre} (NIT: {facturaSeleccionada.pacienteNit})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Factura:</span>
                  <span className="font-medium text-slate-900"><span className="table-identifier">{formatearGTQ(facturaSeleccionada.totalCentavos)}</span></span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm">
                  <span className="font-bold text-slate-700">Saldo Pendiente Actual:</span>
                  <span className="font-bold text-amber-700"><span className="table-identifier">{formatearGTQ(facturaSeleccionada.saldoPendienteCentavos)}</span></span>
                </div>
              </div>

              {/* Input Monto */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">
                    Monto a Pagar (Quetzales GTQ) <span className="text-rose-500">*</span>
                  </label>
                  <Button variant="ghost" size="sm"
                    type="button"
                    onClick={() => setMontoIngresadoQ((facturaSeleccionada.saldoPendienteCentavos / 100).toFixed(2))}
                    className="text-xs text-clinic-primary hover:underline font-semibold"
                  >
                    Usar saldo total
                  </Button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-slate-500">Q</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={montoIngresadoQ}
                    onChange={(e) => setMontoIngresadoQ(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-clinic-primary"
                    placeholder="0.00"
                  />
                </div>

              </div>

              {/* Advertencia reactiva de sobrepago (CA14) */}
              {esSobrepago && (
                <Alert variant="warning" title="El monto supera el saldo pendiente">
                  Ingresa un monto de hasta {formatearGTQ(saldoPendienteActual)}.
                </Alert>
              )}

              {/* Método de Pago */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Método de Pago <span className="text-rose-500">*</span></label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value as MetodoPagoLab)}
                  className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-clinic-primary text-xs"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA_CREDITO">Tarjeta de Crédito</option>
                  <option value="TRANSFERENCIA_BANCARIA">Transferencia Bancaria</option>
                  <option value="SEGURO_MEDICO">Seguro Médico / Cobertura</option>
                </select>
              </div>

              {/* Error Backend */}
              {errorPago && <Alert variant="danger">{errorPago}</Alert>}

              {/* Acciones */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModalPago(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={procesandoPago}
                  disabled={procesandoPago || esSobrepago || montoCentavosActual <= 0}
                  className="bg-clinic-primary hover:bg-clinic-primary-dark text-white"
                >
                  Confirmar Pago
                </Button>
              </div>
            </form>
        </Modal>
      )}

      {/* MODAL 2: Revertir Pago (CA14) */}
      {showModalRevertir && facturaSeleccionada && pagoSeleccionado && (
        <Modal isOpen onClose={() => setShowModalRevertir(false)} title="Revertir pago" description={facturaSeleccionada.codigoFactura}>
          <form onSubmit={handleConfirmarReversion} className="space-y-4 text-sm">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Recibo:</span>
                  <span className="font-bold text-slate-900">{pagoSeleccionado.codigoRecibo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Factura:</span>
                  <span className="font-medium text-slate-900"><span className="table-identifier">{facturaSeleccionada.codigoFactura}</span></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Monto del Recibo:</span>
                  <span className="font-bold text-rose-700"><span className="table-identifier">{formatearGTQ(pagoSeleccionado.montoCentavos)}</span></span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                <p className="font-semibold">Efecto contable de la reversión:</p>
                <p className="mt-0.5">
                  El monto de {formatearGTQ(pagoSeleccionado.montoCentavos)} será reintegrado al saldo pendiente de la factura y el recibo quedará marcado como <strong>REVERTIDO</strong> en la bitácora contable.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  Motivo justificado de la reversión <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={motivoReversion}
                  onChange={(e) => setMotivoReversion(e.target.value)}
                  placeholder="Detalle la causa (ej. error de digitación en caja, rechazo bancario posterior, cobro duplicado)..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-clinic-primary"
                />
              </div>

              {errorReversion && <Alert variant="danger">{errorReversion}</Alert>}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModalRevertir(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  loading={procesandoReversion}
                  disabled={procesandoReversion || !motivoReversion.trim()}
                >
                  Confirmar Reversión
                </Button>
              </div>
            </form>
        </Modal>
      )}

      {/* MODAL 3: Anular Factura (CA14) */}
      {showModalAnular && facturaSeleccionada && (
        <Modal isOpen onClose={() => setShowModalAnular(false)} title="Anular factura" description={facturaSeleccionada.codigoFactura}>
          <form onSubmit={handleConfirmarAnulacion} className="space-y-4 text-sm">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Factura:</span>
                  <span className="font-bold text-slate-900"><span className="table-identifier">{facturaSeleccionada.codigoFactura}</span></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paciente:</span>
                  <span className="font-semibold text-slate-900">{facturaSeleccionada.pacienteNombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Monto Total:</span>
                  <span className="font-bold text-slate-900"><span className="table-identifier">{formatearGTQ(facturaSeleccionada.totalCentavos)}</span></span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                <p className="font-semibold">:</p>
                <p className="mt-0.5">
                  Una factura con pagos confirmados vigentes no puede anularse directamente; se deben revertir previamente sus comprobantes de pago.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  Motivo de la anulación fiscal <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  placeholder="Detalle el motivo fiscal o administrativo para la anulación..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-clinic-primary"
                />
              </div>

              {errorAnulacion && <Alert variant="danger">{errorAnulacion}</Alert>}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModalAnular(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  loading={procesandoAnulacion}
                  disabled={procesandoAnulacion || !motivoAnulacion.trim()}
                >
                  Confirmar Anulación
                </Button>
              </div>
            </form>
        </Modal>
      )}

      {/* MODAL 4: Detalle de Factura y Recibos */}
      {showModalDetalle && facturaSeleccionada && (
        <Modal
          isOpen
          onClose={() => setShowModalDetalle(false)}
          title={`Detalle de factura ${facturaSeleccionada.codigoFactura}`}
          description={`Orden: ${facturaSeleccionada.codigoOrden}`}
          maxWidth="680px"
          footer={<Button variant="secondary" onClick={() => setShowModalDetalle(false)}>Cerrar</Button>}
        >
          <div className="space-y-6 text-sm">
              {/* Información general */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div>
                  <p className="text-slate-500">Paciente:</p>
                  <p className="font-bold text-slate-900">{facturaSeleccionada.pacienteNombre}</p>
                </div>
                <div>
                  <p className="text-slate-500">NIT:</p>
                  <p className="font-mono font-medium text-slate-900"><span className="table-identifier">{facturaSeleccionada.pacienteNit}</span></p>
                </div>
                <div>
                  <p className="text-slate-500">Fecha Emisión:</p>
                  <p className="font-medium text-slate-900">
                    {new Date(facturaSeleccionada.fechaEmision).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Estado:</p>
                  <div className="mt-0.5">{getBadgeEstadoFactura(facturaSeleccionada.estado)}</div>
                </div>
              </div>

              {/* Items / Determinaciones analíticas */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-2 uppercase tracking-wider">
                  Determinaciones y Aranceles Facturados
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="py-2 px-3 font-semibold">Código</th>
                        <th className="py-2 px-3 font-semibold">Descripción del Análisis</th>
                        <th className="py-2 px-3 font-semibold text-right">Arancel</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {facturaSeleccionada.items.map((it) => (
                        <tr key={it.id}>
                          <td className="py-2 px-3 font-mono text-slate-600">{it.codigoPrueba}</td>
                          <td className="py-2 px-3 font-medium text-slate-900">{it.nombrePrueba}</td>
                          <td className="py-2 px-3 text-right font-medium text-slate-900">
                            <span className="table-identifier">{formatearGTQ(it.arancelCentavos)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-bold border-t border-slate-200">
                        <td colSpan={2} className="py-2 px-3 text-right text-slate-700">Total:</td>
                        <td className="py-2 px-3 text-right text-slate-900">
                          <span className="table-identifier">{formatearGTQ(facturaSeleccionada.totalCentavos)}</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Historial de Pagos y Recibos */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-2 uppercase tracking-wider">
                  Recibos de Pago Emitidos ({facturaSeleccionada.pagos.length})
                </h4>
                {facturaSeleccionada.pagos.length === 0 ? (
                  <p className="text-slate-500 italic p-3 bg-slate-50 rounded border border-slate-200">
                    No se registran cobros efectuados para esta factura.
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <th className="py-2 px-3 font-semibold">Recibo</th>
                          <th className="py-2 px-3 font-semibold">Fecha</th>
                          <th className="py-2 px-3 font-semibold">Método</th>
                          <th className="py-2 px-3 font-semibold text-right">Monto</th>
                          <th className="py-2 px-3 font-semibold text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {facturaSeleccionada.pagos.map((p) => (
                          <tr key={p.id}>
                            <td className="py-2 px-3 font-mono font-medium text-slate-900">{p.codigoRecibo}</td>
                            <td className="py-2 px-3 text-slate-600">{new Date(p.fechaHora).toLocaleString()}</td>
                            <td className="py-2 px-3">{getBadgeMetodoPago(p.metodoPago)}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900"><span className="table-identifier">{formatearGTQ(p.montoCentavos)}</span></td>
                            <td className="py-2 px-3 text-center">
                              {p.estado === 'CONFIRMADO' ? (
                                <Badge variant="success">Confirmado</Badge>
                              ) : (
                                <Badge variant="neutral">Revertido</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Resumen de Liquidación */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Liquidado a la fecha:</span>
                  <span className="font-bold text-emerald-700"><span className="table-identifier">{formatearGTQ(facturaSeleccionada.totalPagadoCentavos)}</span></span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-1.5">
                  <span className="text-slate-800">Saldo Pendiente de Cobro:</span>
                  <span className="text-amber-700"><span className="table-identifier">{formatearGTQ(facturaSeleccionada.saldoPendienteCentavos)}</span></span>
                </div>
              </div>
            </div>

        </Modal>
      )}
    </div>
  );
};

export default BillingPaymentsPage;
