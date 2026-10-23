import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  CheckCircle2,
  FlaskConical,
  Eye,
  FileCheck2
} from 'lucide-react';
import { Panel } from '../../design-system/components/Panel';
import { Button } from '../../design-system/components/Button';
import { Badge } from '../../design-system/components/Badge';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { EmptyState } from '../../design-system/components/EmptyState';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { NuevaOrdenExamenModal } from './components/NuevaOrdenExamenModal';
import { DetalleOrdenResultadosModal } from './components/DetalleOrdenResultadosModal';
import { RegistrarResultadosModal } from './components/RegistrarResultadosModal';
import {
  OrdenExamenHospital,
  PrioridadOrdenExamen,
  EstadoOrdenExamen
} from '../../services/types';

export const HospitalExamOrdersPage: React.FC = () => {
  const { sesion } = useAuthSession();
  const { examRepository } = useServices();
  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [ordenes, setOrdenes] = useState<OrdenExamenHospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODAS');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('TODAS');

  // Modales
  const [modalNuevaOrdenAbierto, setModalNuevaOrdenAbierto] = useState(false);
  const [ordenSeleccionadaDetalle, setOrdenSeleccionadaDetalle] = useState<OrdenExamenHospital | null>(null);
  const [ordenSeleccionadaRegistrar, setOrdenSeleccionadaRegistrar] = useState<OrdenExamenHospital | null>(null);
  const [notificacion, setNotificacion] = useState<string | null>(null);

  const cargarOrdenes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await examRepository.listarOrdenes(institucionId, filtroEstado);
      setOrdenes(data);
    } catch {
      setOrdenes([]);
    } finally {
      setLoading(false);
    }
  }, [institucionId, filtroEstado, examRepository]);

  useEffect(() => {
    cargarOrdenes();
  }, [cargarOrdenes]);

  const handleCancelarOrden = async (orden: OrdenExamenHospital) => {
    if (window.confirm(`¿Está seguro de cancelar la orden médica ${orden.codigoLegible}?`)) {
      try {
        await examRepository.cancelarOrden(institucionId, orden.id, 'Cancelada por el médico solicitante.');
        setNotificacion(`Orden ${orden.codigoLegible} cancelada exitosamente.`);
        await cargarOrdenes();
        setTimeout(() => setNotificacion(null), 3500);
      } catch (err: any) {
        alert(err?.message || 'Error al cancelar la orden.');
      }
    }
  };

  // Filtrado reactivo en memoria
  const ordenesFiltradas = ordenes.filter((o) => {
    const coincideTexto =
      !filtroTexto.trim() ||
      o.codigoLegible.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      o.pacienteNombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      o.motivoClinico.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      o.items.some((i) => i.nombre.toLowerCase().includes(filtroTexto.toLowerCase()));

    const coincidePrioridad = filtroPrioridad === 'TODAS' || o.prioridad === filtroPrioridad;

    return coincideTexto && coincidePrioridad;
  });

  // KPIs
  const totalOrdenes = ordenes.length;
  const pendientesEnProceso = ordenes.filter((o) => o.estado === 'SOLICITADA' || o.estado === 'EN_PROCESO').length;
  const completadas = ordenes.filter((o) => o.estado === 'COMPLETADA').length;
  const urgentesStat = ordenes.filter((o) => o.prioridad === 'URGENTE' || o.prioridad === 'STAT').length;

  const getPrioridadBadge = (p: PrioridadOrdenExamen) => {
    switch (p) {
      case 'STAT':
        return <Badge variant="danger">STAT (Inmediato)</Badge>;
      case 'URGENTE':
        return <Badge variant="warning">Urgente</Badge>;
      default:
        return <Badge variant="primary">Rutina</Badge>;
    }
  };

  const getEstadoBadge = (e: EstadoOrdenExamen) => {
    switch (e) {
      case 'COMPLETADA':
        return <Badge variant="success">Completada</Badge>;
      case 'EN_PROCESO':
        return <Badge variant="warning">En Proceso</Badge>;
      case 'CANCELADA':
        return <Badge variant="neutral">Cancelada</Badge>;
      default:
        return <Badge variant="primary">Solicitada</Badge>;
    }
  };

  return (
    <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Notificación flotante */}
      {notificacion && (
        <div
          role="status"
          style={{
            padding: '12px 16px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: 'var(--radius-panel)',
            color: '#065f46',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
            fontSize: '14px'
          }}
        >
          <CheckCircle2 size={18} />
          <span>{notificacion}</span>
        </div>
      )}

      {/* Encabezado canónico H06 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Hospital General San Juan
            </span>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>/</span>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Hospitalización y Urgencias
            </span>
          </div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--color-strong)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <FlaskConical size={26} color="var(--color-primary)" />
            Órdenes de Examen y Resultados Hospitalarios (H06)
          </h1>
          <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Emisión de órdenes diagnósticas, seguimiento de procesamiento y reporte estructurado de parámetros analíticos.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setModalNuevaOrdenAbierto(true)}
          leftIcon={<Plus size={18} />}
        >
          Nueva Orden de Examen (H06)
        </Button>
      </div>

      {/* Tarjetas resumen KPI */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        <Panel>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Órdenes Totales
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-strong)', marginTop: '4px' }}>
            {totalOrdenes}
          </div>
        </Panel>

        <Panel>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Pendientes / En Proceso
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#d97706', marginTop: '4px' }}>
            {pendientesEnProceso}
          </div>
        </Panel>

        <Panel>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Resultados Validados
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
            {completadas}
          </div>
        </Panel>

        <Panel>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Urgentes / STAT
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626', marginTop: '4px' }}>
            {urgentesStat}
          </div>
        </Panel>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
          padding: '16px',
          backgroundColor: 'var(--color-background)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-panel)'
        }}
      >
        <div style={{ position: 'relative', minWidth: '300px', flex: 1 }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-secondary)'
            }}
          />
          <input
            type="text"
            placeholder="Buscar por código (ORD-HOSP-...), paciente o examen..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-field)',
              fontSize: '13px'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Prioridad:</span>
          <select
            value={filtroPrioridad}
            onChange={(e) => setFiltroPrioridad(e.target.value)}
            aria-label="Filtro de Prioridad"
            style={{
              padding: '8px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-field)',
              fontSize: '13px',
              backgroundColor: 'var(--color-background)'
            }}
          >
            <option value="TODAS">Todas las prioridades</option>
            <option value="RUTINA">Rutina</option>
            <option value="URGENTE">Urgente</option>
            <option value="STAT">STAT / Inmediato</option>
          </select>

          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>Estado:</span>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            aria-label="Filtro de Estado"
            style={{
              padding: '8px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-field)',
              fontSize: '13px',
              backgroundColor: 'var(--color-background)'
            }}
          >
            <option value="TODAS">Todos los estados</option>
            <option value="SOLICITADA">Solicitadas</option>
            <option value="EN_PROCESO">En Proceso</option>
            <option value="COMPLETADA">Completadas</option>
            <option value="CANCELADA">Canceladas</option>
          </select>
        </div>
      </div>

      {/* Tabla de Órdenes */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <SkeletonLoader variant="rectangular" height="50px" />
          <SkeletonLoader variant="rectangular" height="50px" />
          <SkeletonLoader variant="rectangular" height="50px" />
        </div>
      ) : ordenesFiltradas.length === 0 ? (
        <EmptyState
          title="No se encontraron órdenes de examen"
          description="No existen solicitudes registradas que coincidan con los criterios de filtro aplicados."
        />
      ) : (
        <div
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-panel)',
            overflow: 'hidden',
            backgroundColor: 'var(--color-background)'
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-panel)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Código Orden</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Fecha Solicitud</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Paciente</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Ubicación</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Exámenes Solicitados</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Prioridad</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Estado</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ordenesFiltradas.map((ord) => (
                <tr
                  key={ord.id}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                    {ord.codigoLegible}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                    {new Date(ord.fechaSolicitud).toLocaleDateString()} {new Date(ord.fechaSolicitud).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <strong style={{ color: 'var(--color-strong)', display: 'block' }}>{ord.pacienteNombre}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>DPI: {ord.pacienteDpi}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-strong)' }}>
                      {ord.numeroCama || 'Consulta Externa'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {ord.items.map((it) => (
                        <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--color-strong)' }}>• {it.nombre}</span>
                          {it.estado === 'COMPLETADO' && (
                            <Badge variant="success">Listo</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{getPrioridadBadge(ord.prioridad)}</td>
                  <td style={{ padding: '12px 16px' }}>{getEstadoBadge(ord.estado)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setOrdenSeleccionadaDetalle(ord)}
                        leftIcon={<Eye size={14} />}
                        title="Ver detalle de orden y resultados analíticos"
                      >
                        Ver Detalle y Resultados (H06)
                      </Button>

                      {ord.items.some((it) => it.estado === 'PENDIENTE') && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setOrdenSeleccionadaRegistrar(ord)}
                          leftIcon={<FileCheck2 size={14} />}
                          title="Registrar valores analíticos de laboratorio"
                        >
                          Registrar
                        </Button>
                      )}

                      {ord.estado === 'SOLICITADA' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancelarOrden(ord)}
                          title="Cancelar orden médica"
                          style={{ color: '#dc2626' }}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Nueva Orden */}
      <NuevaOrdenExamenModal
        isOpen={modalNuevaOrdenAbierto}
        onClose={() => setModalNuevaOrdenAbierto(false)}
        onOrdenCreada={async () => {
          setNotificacion('Orden médica de examen emitida exitosamente.');
          await cargarOrdenes();
          setTimeout(() => setNotificacion(null), 3500);
        }}
      />

      {/* Modal Detalle y Resultados */}
      <DetalleOrdenResultadosModal
        isOpen={!!ordenSeleccionadaDetalle}
        onClose={() => setOrdenSeleccionadaDetalle(null)}
        orden={ordenSeleccionadaDetalle}
        onAbrirRegistrarResultado={(ord) => setOrdenSeleccionadaRegistrar(ord)}
      />

      {/* Modal Registrar Resultados */}
      <RegistrarResultadosModal
        isOpen={!!ordenSeleccionadaRegistrar}
        onClose={() => setOrdenSeleccionadaRegistrar(null)}
        orden={ordenSeleccionadaRegistrar}
        onResultadoRegistrado={async () => {
          setNotificacion('Resultados de examen registrados y validados exitosamente.');
          await cargarOrdenes();
          setTimeout(() => setNotificacion(null), 3500);
        }}
      />
    </div>
  );
};
