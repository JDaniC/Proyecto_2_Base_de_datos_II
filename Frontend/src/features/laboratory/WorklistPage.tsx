import { getDisplayLabel } from '../../services/displayLabels';
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FlaskConical,
  TestTube2,
  Plus,
  Search,
  Clock,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { MetricStrip } from '../../design-system/components/MetricStrip';
import {
  OrdenLaboratorio,
  PrioridadLaboratorio,
  EstadoOrdenLaboratorio
} from '../../services/types';

export const WorklistPage: React.FC = () => {
  const navigate = useNavigate();
  const { sesion } = useAuthSession();
  const { laboratoryRepository } = useServices();
  const institucionId = sesion?.institucionId || 'LABORATORIO_CLINICO';

  const [ordenes, setOrdenes] = useState<OrdenLaboratorio[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState<PrioridadLaboratorio | 'TODAS'>('TODAS');
  const [filtroEstado, setFiltroEstado] = useState<EstadoOrdenLaboratorio | 'TODOS'>('TODOS');
  const [filtroSeccion, setFiltroSeccion] = useState<string>('TODAS');

  const cargarBandeja = async () => {
    setCargando(true);
    try {
      const data = await laboratoryRepository.obtenerBandeja(institucionId, {
        prioridad: filtroPrioridad,
        estado: filtroEstado,
        seccion: filtroSeccion,
        busqueda
      });
      setOrdenes(data);
    } catch {
      // Fallback
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarBandeja();
  }, [institucionId, filtroPrioridad, filtroEstado, filtroSeccion, busqueda]);

  // Contadores métricos
  const metricas = useMemo(() => {
    const total = ordenes.length;
    const statUrgentes = ordenes.filter((o) => o.prioridad === 'STAT' || o.prioridad === 'URGENTE').length;
    const pendientesToma = ordenes.filter((o) => o.estado === 'MUESTRA_PENDIENTE' || o.estado === 'CREADA').length;
    const enAnalisis = ordenes.filter((o) => o.estado === 'EN_ANALISIS').length;
    const paraValidar = ordenes.filter((o) => o.estado === 'PARA_VALIDAR').length;
    return { total, statUrgentes, pendientesToma, enAnalisis, paraValidar };
  }, [ordenes]);

  const renderBadgePrioridad = (prioridad: PrioridadLaboratorio) => {
    switch (prioridad) {
      case 'STAT':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 800,
              backgroundColor: '#FEE2E2',
              color: '#991B1B',
              border: '1px solid #F87171',
              letterSpacing: '0.05em'
            }}
          >
            <AlertTriangle size={12} /> Inmediata
          </span>
        );
      case 'URGENTE':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #FCD34D'
            }}
          >
            <Clock size={12} /> URGENTE
          </span>
        );
      case 'RUTINA':
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: 'var(--color-background-alt)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)'
            }}
          >
            RUTINA
          </span>
        );
    }
  };

  const renderBadgeEstado = (estado: EstadoOrdenLaboratorio) => {
    switch (estado) {
      case 'CREADA':
        return <Badge variant="neutral">CREADA</Badge>;
      case 'MUESTRA_PENDIENTE':
        return <Badge variant="warning">MUESTRA PENDIENTE</Badge>;
      case 'EN_ANALISIS':
        return <Badge variant="info">EN ANÁLISIS</Badge>;
      case 'PARA_VALIDAR':
        return <Badge variant="primary">LISTA PARA VALIDAR</Badge>;
      case 'COMPLETADA':
        return <Badge variant="success">COMPLETADA</Badge>;
      case 'CANCELADA':
        return <Badge variant="danger">CANCELADA</Badge>;
      default:
        return <Badge variant="neutral">{estado}</Badge>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Encabezado Principal */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div>
          {/* Breadcrumb */}
          <nav aria-label="Ruta de navegación" style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
            <span>Inicio</span>
            <span style={{ margin: '0 8px' }}>/</span>
            <span>Laboratorio Clínico</span>
            <span style={{ margin: '0 8px' }}>/</span>
            <strong style={{ color: 'var(--color-strong)' }}>Bandeja de Trabajo</strong>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-selection)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FlaskConical size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--color-strong)' }}>
                Bandeja de trabajo
              </h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Revise órdenes, muestras y resultados pendientes.
              </p>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            onClick={() => navigate('/laboratorio/muestras')}
            leftIcon={<TestTube2 size={16} />}
          >
            Gestión de Muestras
          </Button>

          <Button
            variant="primary"
            onClick={() => navigate('/laboratorio/ordenes/nueva')}
            leftIcon={<Plus size={16} />}
          >
            Nueva Orden de Laboratorio
          </Button>
        </div>
      </div>

      <MetricStrip
        label="Resumen de órdenes"
        items={[
          { id: 'total', label: 'Órdenes', value: metricas.total },
          { id: 'prioritarias', label: 'Prioritarias', value: metricas.statUrgentes, tone: 'danger' },
          { id: 'muestras', label: 'Muestras pendientes', value: metricas.pendientesToma, tone: 'warning' },
          { id: 'analisis', label: 'En análisis', value: metricas.enAnalisis, tone: 'info' },
          { id: 'validacion', label: 'Por validar', value: metricas.paraValidar, tone: 'success' },
        ]}
      />

      {/* Filtros de Navegación y Búsqueda */}
      <Panel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Input búsqueda */}
            <div style={{ position: 'relative', flex: '1 1 280px' }}>
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
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por paciente, DPI, médico solicitante o código de orden (ORD-LAB-...)"
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: 'var(--radius-input)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-control)',
                  fontSize: '13px'
                }}
              />
            </div>

            {/* Select Prioridad */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Prioridad:</span>
              <select
                value={filtroPrioridad}
                onChange={(e) => setFiltroPrioridad(e.target.value as PrioridadLaboratorio | 'TODAS')}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-input)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-control)',
                  fontSize: '13px'
                }}
              >
                <option value="TODAS">Todas las prioridades</option>
                <option value="STAT">Emergencia</option>
                <option value="URGENTE">Urgente</option>
                <option value="RUTINA">Rutina</option>
              </select>
            </div>

            {/* Select Estado */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Estado:</span>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as EstadoOrdenLaboratorio | 'TODOS')}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-input)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-control)',
                  fontSize: '13px'
                }}
              >
                <option value="TODOS">Todos los estados</option>
                <option value="CREADA">Creada</option>
                <option value="MUESTRA_PENDIENTE">Muestra Pendiente</option>
                <option value="EN_ANALISIS">En Análisis</option>
                <option value="PARA_VALIDAR">Lista para Validar</option>
                <option value="COMPLETADA">Completada</option>
              </select>
            </div>

            {/* Select Sección */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Sección:</span>
              <select
                value={filtroSeccion}
                onChange={(e) => setFiltroSeccion(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-input)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-control)',
                  fontSize: '13px'
                }}
              >
                <option value="TODAS">Todas las secciones</option>
                <option value="Hematología">Hematología y Coagulación</option>
                <option value="Bioquímica">Bioquímica Clínica</option>
                <option value="Inmunología">Inmunología Clínica</option>
                <option value="Microbiología">Microbiología Clínica</option>
              </select>
            </div>
          </div>
        </div>
      </Panel>

      {/* Tabla de Órdenes */}
      <Panel>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
              Órdenes de Laboratorio ({ordenes.length})
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>
              Ordenadas por prioridad y fecha de emisión
            </p>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            Mostrando {ordenes.length} órdenes registradas
          </span>
        </div>

        {cargando ? (
          <SkeletonLoader variant="rectangular" height="240px" />
        ) : ordenes.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <FlaskConical size={32} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No se encontraron órdenes de laboratorio con los filtros seleccionados.</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>Intente ajustando el término de búsqueda o la prioridad.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 10px', color: 'var(--color-text-secondary)' }}>Código</th>
                  <th style={{ padding: '12px 10px', color: 'var(--color-text-secondary)' }}>Prioridad</th>
                  <th style={{ padding: '12px 10px', color: 'var(--color-text-secondary)' }}>Paciente</th>
                  <th style={{ padding: '12px 10px', color: 'var(--color-text-secondary)' }}>Pruebas Solicitadas</th>
                  <th style={{ padding: '12px 10px', color: 'var(--color-text-secondary)' }}>Muestra / Tubo</th>
                  <th style={{ padding: '12px 10px', color: 'var(--color-text-secondary)' }}>Estado Orden</th>
                  <th style={{ padding: '12px 10px', color: 'var(--color-text-secondary)' }}>Médico Solicitante</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((orden) => (
                  <tr
                    key={orden.id}
                    style={{
                      borderBottom: '1px solid var(--color-divider)',
                      backgroundColor: orden.prioridad === 'STAT' ? 'rgba(239, 68, 68, 0.02)' : 'transparent'
                    }}
                  >
                    {/* Código */}
                    <td style={{ padding: '12px 10px' }}>
                      <Link
                        to={`/laboratorio/ordenes/${orden.id}`}
                        style={{
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          color: 'var(--color-primary)',
                          textDecoration: 'none'
                        }}
                      >
                        <span className="table-identifier">{orden.codigoOrden}</span>
                      </Link>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        {new Date(orden.fechaCreacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hrs
                      </div>
                    </td>

                    {/* Prioridad */}
                    <td style={{ padding: '12px 10px' }}>
                      {renderBadgePrioridad(orden.prioridad)}
                    </td>

                    {/* Paciente */}
                    <td style={{ padding: '12px 10px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-strong)' }}>
                        {orden.pacienteNombre}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                        DPI: {orden.pacienteDpi} · {orden.pacienteEdad}a ({orden.pacienteSexo})
                      </div>
                    </td>

                    {/* Pruebas */}
                    <td style={{ padding: '12px 10px', maxWidth: '240px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {orden.items.map((it) => (
                          <div
                            key={it.id}
                            style={{
                              fontSize: '12px',
                              fontWeight: 500,
                              color: 'var(--color-strong)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                            title={it.nombrePrueba}
                          >
                            • {it.nombrePrueba}
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Muestras */}
                    <td style={{ padding: '12px 10px' }}>
                      {orden.muestras && orden.muestras.length > 0 ? (
                        <div>
                          <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-strong)' }}>
                            {orden.muestras[0].codigoMuestra}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                            {orden.muestras[0].tuboContenedor}
                          </div>
                          <div style={{ marginTop: '3px' }}>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor:
                                  orden.muestras[0].estado === 'ACEPTADA'
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : orden.muestras[0].estado === 'RECHAZADA'
                                    ? 'rgba(239, 68, 68, 0.15)'
                                    : 'rgba(245, 158, 11, 0.15)',
                                color:
                                  orden.muestras[0].estado === 'ACEPTADA'
                                    ? '#047857'
                                    : orden.muestras[0].estado === 'RECHAZADA'
                                    ? '#B91C1C'
                                    : '#B45309'
                              }}
                            >
                              {getDisplayLabel(orden.muestras[0].estado)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Sin muestra asignada</span>
                      )}
                    </td>

                    {/* Estado Orden */}
                    <td style={{ padding: '12px 10px' }}>
                      {renderBadgeEstado(orden.estado)}
                    </td>

                    {/* Médico Solicitante */}
                    <td style={{ padding: '12px 10px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      <div style={{ fontWeight: 500, color: 'var(--color-strong)' }}>{orden.medicoSolicitante}</div>
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/laboratorio/resultados/captura/${orden.id}`)}
                          aria-label={`Capturar resultados de ${orden.codigoOrden}`}
                        >
                          <FlaskConical size={14} style={{ marginRight: '4px' }} />
                          Resultados
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/laboratorio/ordenes/${orden.id}`)}
                          aria-label={`Ver orden ${orden.codigoOrden}`}
                        >
                          <Eye size={14} style={{ marginRight: '4px' }} />
                          Detalle
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
};
