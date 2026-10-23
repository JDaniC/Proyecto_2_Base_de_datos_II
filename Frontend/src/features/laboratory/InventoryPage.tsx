import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Thermometer,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import {
  LoteReactivo,
  MovimientoInventario,
  TipoMovimientoInventario,
  EstadoLoteReactivo
} from '../../services/types';

export const InventoryPage: React.FC = () => {
  const { sesion } = useAuthSession();
  const { laboratoryRepository } = useServices();
  const institucionId = sesion?.institucionId || 'LABORATORIO_CLINICO';

  const [activeTab, setActiveTab] = useState<'lotes' | 'kardex'>('lotes');
  const [loading, setLoading] = useState(true);
  const [notificacion, setNotificacion] = useState<string | null>(null);

  // Datos
  const [lotes, setLotes] = useState<LoteReactivo[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoLoteReactivo | 'TODOS'>('TODOS');
  const [filtroSeccion, setFiltroSeccion] = useState<string>('TODAS');

  // Modales
  const [showModalMovimiento, setShowModalMovimiento] = useState(false);
  const [showModalNuevoLote, setShowModalNuevoLote] = useState(false);
  const [loteSeleccionado, setLoteSeleccionado] = useState<LoteReactivo | null>(null);

  // Formulario de Movimiento
  const [movTipo, setMovTipo] = useState<TipoMovimientoInventario>('CONSUMO');
  const [movCantidad, setMovCantidad] = useState('10');
  const [movMotivo, setMovMotivo] = useState('Consumo de determinaciones analíticas en rutina diaria');
  const [movOrdenId, setMovOrdenId] = useState('');
  const [guardandoMov, setGuardandoMov] = useState(false);
  const [errorMov, setErrorMov] = useState<string | null>(null);

  // Formulario de Nuevo Lote
  const [nuevoReactivoId, setNuevoReactivoId] = useState('rea-01');
  const [nuevoNumeroLote, setNuevoNumeroLote] = useState('');
  const [nuevoVencimiento, setNuevoVencimiento] = useState('');
  const [nuevaTemp, setNuevaTemp] = useState('2°C a 8°C (Refrigeración)');
  const [nuevaCantidadInicial, setNuevaCantidadInicial] = useState('500');
  const [nuevoMotivoRecepcion, setNuevoMotivoRecepcion] = useState('Ingreso de lote por orden de compra regular');
  const [guardandoLote, setGuardandoLote] = useState(false);
  const [errorLote, setErrorLote] = useState<string | null>(null);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [l, m] = await Promise.all([
        laboratoryRepository.obtenerLotesReactivos(institucionId),
        laboratoryRepository.obtenerMovimientosInventario(institucionId)
      ]);
      setLotes(l);
      setMovimientos(m);
      if (l.length > 0 && !loteSeleccionado) {
        setLoteSeleccionado(l[0]);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [institucionId]);

  // Manejador registrar movimiento
  const handleGuardarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMov(null);

    if (!loteSeleccionado) {
      setErrorMov('Debe seleccionar un lote de reactivo.');
      return;
    }

    const cantidad = parseInt(movCantidad, 10);
    if (isNaN(cantidad) || cantidad <= 0) {
      setErrorMov('La cantidad debe ser un número entero mayor a 0.');
      return;
    }

    if (!movMotivo.trim()) {
      setErrorMov('El motivo del movimiento es obligatorio para garantizar la trazabilidad de inventario (CA15).');
      return;
    }

    setGuardandoMov(true);
    try {
      const actor = {
        id: sesion?.cuentaId || 'usr-lab-analista',
        nombre: sesion?.nombre || 'Lic. Analista de Laboratorio'
      };

      const nuevoMov = await laboratoryRepository.registrarMovimientoInventario(
        institucionId,
        {
          loteId: loteSeleccionado.id,
          tipoMovimiento: movTipo,
          cantidad,
          motivo: movMotivo.trim(),
          ordenId: movOrdenId.trim() || undefined
        },
        actor
      );

      // Recargar datos para ver saldos actualizados y revisionStock
      const lotesActualizados = await laboratoryRepository.obtenerLotesReactivos(institucionId);
      setLotes(lotesActualizados);
      setMovimientos((prev) => [nuevoMov, ...prev]);

      setShowModalMovimiento(false);
      setNotificacion(
        `Movimiento ${nuevoMov.tipoMovimiento} de ${nuevoMov.cantidad} unid. registrado en lote ${nuevoMov.numeroLote}. Nuevo saldo: ${nuevoMov.saldoNuevo}.`
      );
      setTimeout(() => setNotificacion(null), 5000);
    } catch (err: unknown) {
      setErrorMov(err instanceof Error ? err.message : 'Error al registrar movimiento.');
    } finally {
      setGuardandoMov(false);
    }
  };

  // Manejador registrar nuevo lote
  const handleGuardarNuevoLote = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLote(null);

    if (!nuevoNumeroLote.trim()) {
      setErrorLote('El número de lote es obligatorio.');
      return;
    }

    if (!nuevoVencimiento) {
      setErrorLote('La fecha de vencimiento es obligatoria.');
      return;
    }

    const cant = parseInt(nuevaCantidadInicial, 10);
    if (isNaN(cant) || cant <= 0) {
      setErrorLote('La cantidad inicial de entrada debe ser un número entero mayor a 0.');
      return;
    }

    setGuardandoLote(true);
    try {
      const actor = {
        id: sesion?.cuentaId || 'usr-admin-lab-01',
        nombre: sesion?.nombre || 'Administrador de Laboratorio'
      };

      const creado = await laboratoryRepository.registrarNuevoLoteReactivo(
        institucionId,
        {
          reactivoId: nuevoReactivoId,
          numeroLote: nuevoNumeroLote.trim().toUpperCase(),
          fechaVencimiento: nuevoVencimiento,
          temperaturaAlmacenamiento: nuevaTemp.trim(),
          cantidadInicial: cant,
          motivoRecepcion: nuevoMotivoRecepcion.trim() || undefined
        },
        actor
      );

      const [lotesNuevos, movsNuevos] = await Promise.all([
        laboratoryRepository.obtenerLotesReactivos(institucionId),
        laboratoryRepository.obtenerMovimientosInventario(institucionId)
      ]);
      setLotes(lotesNuevos);
      setMovimientos(movsNuevos);

      setShowModalNuevoLote(false);
      setNotificacion(`Lote ${creado.numeroLote} de ${creado.reactivoNombre} registrado con saldo inicial de ${creado.saldoDisponible}.`);
      setTimeout(() => setNotificacion(null), 5000);
    } catch (err: unknown) {
      setErrorLote(err instanceof Error ? err.message : 'Error al registrar nuevo lote.');
    } finally {
      setGuardandoLote(false);
    }
  };

  // Filtrado de lotes
  const lotesFiltrados = lotes.filter((l) => {
    if (filtroEstado !== 'TODOS' && l.estado !== filtroEstado) return false;
    if (filtroSeccion !== 'TODAS' && l.seccion !== filtroSeccion) return false;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const match =
        l.reactivoNombre.toLowerCase().includes(q) ||
        l.reactivoCodigo.toLowerCase().includes(q) ||
        l.numeroLote.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Métricas
  const totalLotes = lotes.length;
  const lotesDisponibles = lotes.filter((l) => l.estado === 'DISPONIBLE').length;
  const lotesVencidos = lotes.filter((l) => l.estado === 'VENCIDO').length;
  const totalDeterminaciones = lotes.reduce((acc, l) => acc + (l.estado === 'DISPONIBLE' ? l.saldoDisponible : 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Breadcrumb */}
      <nav aria-label="Ruta de navegación" style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        <span>Inicio</span>
        <span style={{ margin: '0 8px' }}>/</span>
        <span>Laboratorio</span>
        <span style={{ margin: '0 8px' }}>/</span>
        <strong style={{ color: 'var(--color-strong)' }}>Reactivos, Lotes e Inventario (L12)</strong>
      </nav>

      {/* Alerta de notificación */}
      {notificacion && (
        <div
          role="status"
          style={{
            backgroundColor: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            border: '1px solid var(--color-success-border)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-input)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={16} />
          <span>{notificacion}</span>
        </div>
      )}

      {/* Encabezado y acciones principales */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--color-strong)',
                letterSpacing: '-0.3px'
              }}
            >
              Inventario de Reactivos, Lotes y Kardex (L12)
            </h1>
            <Badge variant="warning">Regla CA15</Badge>
          </div>
          <p
            style={{
              margin: '8px 0 0 0',
              fontSize: '14px',
              color: 'var(--color-text-secondary)',
              maxWidth: '820px',
              lineHeight: 1.5
            }}
          >
            Gestión analítica de lotes y reactivos de laboratorio. Trazabilidad de movimientos (entradas, consumos,
            ajustes y bajas), cálculo de saldos inmutables, control de revisión concurrente y bloqueo estricto de consumos
            vencidos o saldos negativos (Regla CA15).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="secondary"
            onClick={() => {
              setNuevoNumeroLote('');
              setNuevoVencimiento('');
              setErrorLote(null);
              setShowModalNuevoLote(true);
            }}
            leftIcon={<Package size={16} />}
          >
            Nuevo Lote de Reactivo
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (lotes.length > 0 && !loteSeleccionado) {
                setLoteSeleccionado(lotes[0]);
              }
              setErrorMov(null);
              setShowModalMovimiento(true);
            }}
            leftIcon={<Plus size={16} />}
          >
            Registrar Movimiento (CA15)
          </Button>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px'
        }}
      >
        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-selection)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Package size={20} />
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>
                Lotes Disponibles
              </span>
              <strong style={{ fontSize: '20px', color: 'var(--color-strong)' }}>
                {lotesDisponibles} / {totalLotes}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-success-bg)',
                color: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>
                Saldo Total Disponible
              </span>
              <strong style={{ fontSize: '20px', color: 'var(--color-success)' }}>
                {totalDeterminaciones.toLocaleString()} unid.
              </strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-error-bg)',
                color: 'var(--color-error-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShieldAlert size={20} />
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>
                Lotes Vencidos / Bloqueados
              </span>
              <strong style={{ fontSize: '20px', color: 'var(--color-error-text)' }}>
                {lotesVencidos}
              </strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-selection)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>
                Movimientos en Kardex
              </span>
              <strong style={{ fontSize: '20px', color: 'var(--color-strong)' }}>
                {movimientos.length}
              </strong>
            </div>
          </div>
        </Panel>
      </div>

      {/* Pestañas Lotes vs Kardex */}
      <div
        role="tablist"
        aria-label="Gestión de Inventario de Laboratorio"
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--color-border)'
        }}
      >
        <button
          role="tab"
          aria-selected={activeTab === 'lotes'}
          type="button"
          onClick={() => setActiveTab('lotes')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: activeTab === 'lotes' ? 700 : 500,
            color: activeTab === 'lotes' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'lotes' ? '3px solid var(--color-primary)' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          <Package size={16} />
          <span>Lotes de Reactivos e Insumos ({lotes.length})</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'kardex'}
          type="button"
          onClick={() => setActiveTab('kardex')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: activeTab === 'kardex' ? 700 : 500,
            color: activeTab === 'kardex' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'kardex' ? '3px solid var(--color-primary)' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          <FileText size={16} />
          <span>Kardex / Historial de Movimientos ({movimientos.length})</span>
        </button>
      </div>

      {/* Pestaña Lotes */}
      {activeTab === 'lotes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Barra de Filtros */}
          <Panel>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 240px', minWidth: '200px' }}>
                <Input
                  aria-label="Buscar reactivo o lote"
                  placeholder="Buscar por reactivo, código o lote..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  leftIcon={<Search size={16} />}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={16} style={{ color: 'var(--color-text-secondary)' }} />
                <label htmlFor="select-filtro-estado-lote" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Estado:
                </label>
                <select
                  id="select-filtro-estado-lote"
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value as EstadoLoteReactivo | 'TODOS')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    fontSize: '13px',
                    color: 'var(--color-strong)'
                  }}
                >
                  <option value="TODOS">Todos los estados</option>
                  <option value="DISPONIBLE">Disponible</option>
                  <option value="AGOTADO">Agotado</option>
                  <option value="VENCIDO">Vencido</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label htmlFor="select-filtro-seccion" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Sección:
                </label>
                <select
                  id="select-filtro-seccion"
                  value={filtroSeccion}
                  onChange={(e) => setFiltroSeccion(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    fontSize: '13px',
                    color: 'var(--color-strong)'
                  }}
                >
                  <option value="TODAS">Todas las secciones</option>
                  <option value="Bioquímica Clínica">Bioquímica Clínica</option>
                  <option value="Hematología y Coagulación">Hematología y Coagulación</option>
                  <option value="Inmunología Clínica">Inmunología Clínica</option>
                  <option value="Uroanálisis y Coprología">Uroanálisis y Coprología</option>
                </select>
              </div>
            </div>
          </Panel>

          {/* Tabla de Lotes */}
          <Panel>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
                <SkeletonLoader height={24} />
                <SkeletonLoader height={40} />
                <SkeletonLoader height={40} />
              </div>
            ) : lotesFiltrados.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                No se encontraron lotes de reactivos con los filtros seleccionados.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)',
                        backgroundColor: 'var(--color-background-alt)'
                      }}
                    >
                      <th style={{ padding: '10px 14px' }}>Reactivo / Insumo</th>
                      <th style={{ padding: '10px 14px' }}>Lote / Versión</th>
                      <th style={{ padding: '10px 14px' }}>Vencimiento</th>
                      <th style={{ padding: '10px 14px' }}>Conservación</th>
                      <th style={{ padding: '10px 14px' }}>Saldo Disponible</th>
                      <th style={{ padding: '10px 14px' }}>Estado</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotesFiltrados.map((lote) => {
                      const esVencido = lote.estado === 'VENCIDO';
                      const esAgotado = lote.estado === 'AGOTADO';

                      return (
                        <tr
                          key={lote.id}
                          style={{
                            borderBottom: '1px solid var(--color-divider)',
                            backgroundColor: esVencido ? '#FEF2F2' : esAgotado ? '#FFFBEB' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--color-strong)' }}>
                              {lote.reactivoNombre}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                              <code>{lote.reactivoCodigo}</code> · {lote.seccion}
                            </div>
                          </td>

                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)' }}>
                              {lote.numeroLote}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                              Revisión stock: #{lote.revisionStock} (CA15)
                            </div>
                          </td>

                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: esVencido ? 700 : 500, color: esVencido ? '#DC2626' : 'var(--color-strong)' }}>
                              {new Date(lote.fechaVencimiento).toLocaleDateString()}
                            </div>
                            {esVencido && (
                              <span style={{ fontSize: '11px', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <AlertTriangle size={12} /> Bloqueado para consumo
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Thermometer size={14} />
                              <span>{lote.temperaturaAlmacenamiento}</span>
                            </div>
                          </td>

                          <td style={{ padding: '10px 14px' }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: '14px',
                                color: esVencido ? '#9CA3AF' : esAgotado ? '#DC2626' : 'var(--color-strong)'
                              }}
                            >
                              {lote.saldoDisponible.toLocaleString()} {lote.unidadMedida}
                            </span>
                          </td>

                          <td style={{ padding: '10px 14px' }}>
                            <Badge
                              variant={
                                esVencido
                                  ? 'danger'
                                  : esAgotado
                                  ? 'warning'
                                  : 'success'
                              }
                            >
                              {lote.estado}
                            </Badge>
                          </td>

                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setLoteSeleccionado(lote);
                                setErrorMov(null);
                                setShowModalMovimiento(true);
                              }}
                            >
                              Registrar Movimiento
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* Pestaña Kardex */}
      {activeTab === 'kardex' && (
        <Panel>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
              Kardex Analítico de Movimientos de Inventario (Regla CA15)
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
              Registro append-only de entradas, consumos analíticos, ajustes y bajas con trazabilidad inmutable de actor y saldos.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    backgroundColor: 'var(--color-background-alt)'
                  }}
                >
                  <th style={{ padding: '10px 14px' }}>Fecha / Hora</th>
                  <th style={{ padding: '10px 14px' }}>Reactivo y Lote</th>
                  <th style={{ padding: '10px 14px' }}>Tipo de Movimiento</th>
                  <th style={{ padding: '10px 14px' }}>Cantidad</th>
                  <th style={{ padding: '10px 14px' }}>Saldo Anterior → Nuevo</th>
                  <th style={{ padding: '10px 14px' }}>Motivo / Justificación</th>
                  <th style={{ padding: '10px 14px' }}>Actor Responsable</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((mov) => {
                  const esEntrada = mov.tipoMovimiento === 'ENTRADA' || mov.tipoMovimiento === 'AJUSTE_ENTRADA';
                  return (
                    <tr key={mov.id} style={{ borderBottom: '1px solid var(--color-divider)' }}>
                      <td style={{ padding: '10px 14px', fontSize: '12px' }}>
                        <div>{new Date(mov.fechaHora).toLocaleDateString()}</div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>
                          {new Date(mov.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600 }}>{mov.reactivoNombre}</div>
                        <code style={{ fontSize: '11px', color: 'var(--color-primary)' }}>{mov.numeroLote}</code>
                      </td>

                      <td style={{ padding: '10px 14px' }}>
                        <Badge
                          variant={
                            mov.tipoMovimiento === 'ENTRADA' || mov.tipoMovimiento === 'AJUSTE_ENTRADA'
                              ? 'success'
                              : mov.tipoMovimiento === 'BAJA'
                              ? 'danger'
                              : 'info'
                          }
                        >
                          {mov.tipoMovimiento}
                        </Badge>
                      </td>

                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700 }}>
                        <span style={{ color: esEntrada ? 'var(--color-success)' : '#DC2626' }}>
                          {esEntrada ? `+${mov.cantidad}` : `-${mov.cantidad}`}
                        </span>
                      </td>

                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '12px' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{mov.saldoAnterior}</span>
                        <span style={{ margin: '0 6px' }}>→</span>
                        <strong>{mov.saldoNuevo}</strong>
                      </td>

                      <td style={{ padding: '10px 14px', fontSize: '12px', maxWidth: '280px' }}>
                        <div>{mov.motivo}</div>
                        {mov.ordenId && (
                          <div style={{ fontSize: '11px', color: 'var(--color-primary)', marginTop: '2px' }}>
                            Orden: {mov.ordenId}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        {mov.actorNombre}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Modal Registrar Movimiento */}
      {showModalMovimiento && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-movimiento-titulo"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-background)',
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-modal)',
              width: '100%',
              maxWidth: '580px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid var(--color-border)',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--color-divider)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-primary)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <RefreshCw size={20} />
                </div>
                <div>
                  <h3
                    id="modal-movimiento-titulo"
                    style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--color-strong)' }}
                  >
                    Registrar Movimiento de Inventario (CA15)
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Cálculo derivado de saldos e incremento de revisión de stock
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModalMovimiento(false)}
                aria-label="Cerrar modal"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleGuardarMovimiento}
              style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              {errorMov && (
                <div
                  role="alert"
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-input)',
                    backgroundColor: 'var(--color-error-bg)',
                    border: '1px solid var(--color-error-border)',
                    color: 'var(--color-error-text)',
                    fontSize: '13px'
                  }}
                >
                  {errorMov}
                </div>
              )}

              {/* Selector de Lote */}
              <div>
                <label
                  htmlFor="select-mov-lote"
                  style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                >
                  Lote de Reactivo *
                </label>
                <select
                  id="select-mov-lote"
                  value={loteSeleccionado?.id || ''}
                  onChange={(e) => {
                    const sel = lotes.find((l) => l.id === e.target.value);
                    if (sel) setLoteSeleccionado(sel);
                  }}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    fontSize: '13px'
                  }}
                >
                  {lotes.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.numeroLote} — {l.reactivoNombre} ({l.saldoDisponible} {l.unidadMedida} disp. · {l.estado})
                    </option>
                  ))}
                </select>
              </div>

              {/* Advertencia si lote es VENCIDO */}
              {loteSeleccionado && (loteSeleccionado.estado === 'VENCIDO' || loteSeleccionado.estado === 'INACTIVO') && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-input)',
                    backgroundColor: 'var(--color-error-bg)',
                    border: '1px solid var(--color-error-border)',
                    color: 'var(--color-error-text)',
                    fontSize: '12px'
                  }}
                >
                  <strong>Bloqueo de Regla CA15:</strong> El lote seleccionado se encuentra{' '}
                  <code>{loteSeleccionado.estado}</code>. Los consumos analíticos están estrictamente bloqueados. Solo
                  se admiten bajas o ajustes de salida por descarte.
                </div>
              )}

              {/* Tipo de Movimiento y Cantidad */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label
                    htmlFor="select-mov-tipo"
                    style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                  >
                    Tipo de Movimiento *
                  </label>
                  <select
                    id="select-mov-tipo"
                    value={movTipo}
                    onChange={(e) => setMovTipo(e.target.value as TipoMovimientoInventario)}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-input)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      fontSize: '13px'
                    }}
                  >
                    <option value="CONSUMO">Consumo Analítico</option>
                    <option value="ENTRADA">Entrada / Recepción</option>
                    <option value="AJUSTE_ENTRADA">Ajuste por Entrada</option>
                    <option value="AJUSTE_SALIDA">Ajuste por Salida</option>
                    <option value="BAJA">Baja / Descarte de reactivo</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="input-mov-cantidad"
                    style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                  >
                    Cantidad ({loteSeleccionado?.unidadMedida || 'unidades'}) *
                  </label>
                  <Input
                    id="input-mov-cantidad"
                    type="number"
                    min="1"
                    value={movCantidad}
                    onChange={(e) => setMovCantidad(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Motivo */}
              <div>
                <label
                  htmlFor="input-mov-motivo"
                  style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                >
                  Motivo Justificado (Regla CA15) *
                </label>
                <Input
                  id="input-mov-motivo"
                  value={movMotivo}
                  onChange={(e) => setMovMotivo(e.target.value)}
                  placeholder="ej. Consumo analítico de rutina para 10 determinaciones de glucosa"
                  required
                />
              </div>

              {/* Orden vinculada opcional */}
              <div>
                <label
                  htmlFor="input-mov-orden"
                  style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                >
                  Orden Clínica Vinculada (Opcional)
                </label>
                <Input
                  id="input-mov-orden"
                  value={movOrdenId}
                  onChange={(e) => setMovOrdenId(e.target.value)}
                  placeholder="ej. ord-lab-01 o ORD-LAB-2026-0081"
                />
              </div>

              {/* Botones */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '12px',
                  borderTop: '1px solid var(--color-divider)',
                  paddingTop: '16px'
                }}
              >
                <Button type="button" variant="secondary" onClick={() => setShowModalMovimiento(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" loading={guardandoMov}>
                  Confirmar Movimiento (CA15)
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Lote */}
      {showModalNuevoLote && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-nuevo-lote-titulo"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-background)',
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-modal)',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid var(--color-border)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--color-divider)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h3 id="modal-nuevo-lote-titulo" style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                Registrar Nuevo Lote de Reactivo
              </h3>
              <button
                type="button"
                onClick={() => setShowModalNuevoLote(false)}
                aria-label="Cerrar modal"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleGuardarNuevoLote}
              style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              {errorLote && (
                <div role="alert" style={{ color: 'var(--color-error-text)', fontSize: '13px' }}>
                  {errorLote}
                </div>
              )}

              <div>
                <label htmlFor="select-reactivo-base" style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Reactivo Base *
                </label>
                <select
                  id="select-reactivo-base"
                  value={nuevoReactivoId}
                  onChange={(e) => setNuevoReactivoId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    fontSize: '13px'
                  }}
                >
                  <option value="rea-01">Reactivo Hexoquinasa Glucosa Cobas (Bioquímica)</option>
                  <option value="rea-02">Diluente Cellpack DCL Sysmex (Hematología)</option>
                  <option value="rea-03">PreciControl Troponin I Cobas (Inmunología)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label htmlFor="input-num-lote" style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Número de Lote *
                  </label>
                  <Input
                    id="input-num-lote"
                    value={nuevoNumeroLote}
                    onChange={(e) => setNuevoNumeroLote(e.target.value)}
                    placeholder="ej. LOT-GLU-2027-B"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="input-venc-lote" style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Fecha de Vencimiento *
                  </label>
                  <Input
                    id="input-venc-lote"
                    type="date"
                    value={nuevoVencimiento}
                    onChange={(e) => setNuevoVencimiento(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label htmlFor="input-temp-lote" style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Conservación Térmica
                  </label>
                  <Input
                    id="input-temp-lote"
                    value={nuevaTemp}
                    onChange={(e) => setNuevaTemp(e.target.value)}
                    placeholder="ej. 2°C a 8°C"
                  />
                </div>
                <div>
                  <label htmlFor="input-cant-lote" style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Cantidad Inicial Recibida *
                  </label>
                  <Input
                    id="input-cant-lote"
                    type="number"
                    min="1"
                    value={nuevaCantidadInicial}
                    onChange={(e) => setNuevaCantidadInicial(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="input-motivo-recepcion" style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Motivo de Recepción
                </label>
                <Input
                  id="input-motivo-recepcion"
                  value={nuevoMotivoRecepcion}
                  onChange={(e) => setNuevoMotivoRecepcion(e.target.value)}
                  placeholder="ej. Factura F-8819 de proveedor oficial"
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '12px',
                  borderTop: '1px solid var(--color-divider)',
                  paddingTop: '16px'
                }}
              >
                <Button type="button" variant="secondary" onClick={() => setShowModalNuevoLote(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" loading={guardandoLote}>
                  Registrar Lote
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
