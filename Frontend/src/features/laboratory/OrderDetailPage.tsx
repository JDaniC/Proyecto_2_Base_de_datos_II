import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FlaskConical,
  TestTube2,
  Clock,
  AlertTriangle,
  User,
  CheckCircle2,
  FileText,
  History
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { Alert } from '../../design-system/components/Alert';
import {
  OrdenLaboratorio,
  PrioridadLaboratorio,
  EstadoOrdenLaboratorio
} from '../../services/types';

export const OrderDetailPage: React.FC = () => {
  const { ordenId } = useParams<{ ordenId: string }>();
  const navigate = useNavigate();
  const { sesion } = useAuthSession();
  const { laboratoryRepository } = useServices();
  const institucionId = sesion?.institucionId || 'LABORATORIO_CLINICO';

  const [orden, setOrden] = useState<OrdenLaboratorio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [tabActiva, setTabActiva] = useState<'pruebas' | 'muestras' | 'trazabilidad'>('pruebas');

  useEffect(() => {
    const cargar = async () => {
      if (!ordenId) return;
      setCargando(true);
      try {
        const data = await laboratoryRepository.obtenerOrdenPorId(institucionId, ordenId);
        setOrden(data);
      } catch {
        // Fallback
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [institucionId, ordenId, laboratoryRepository]);

  if (cargando) {
    return (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SkeletonLoader variant="rectangular" height="40px" width="300px" />
        <SkeletonLoader variant="card" height="240px" />
      </div>
    );
  }

  if (!orden) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <Alert variant="danger" title="Orden no encontrada">
          No se encontró la orden de laboratorio solicitada con identificador «{ordenId}».
        </Alert>
        <div style={{ marginTop: '16px' }}>
          <Button variant="secondary" onClick={() => navigate('/laboratorio/bandeja')}>
            Volver a la Bandeja
          </Button>
        </div>
      </div>
    );
  }

  const renderBadgePrioridad = (prioridad: PrioridadLaboratorio) => {
    switch (prioridad) {
      case 'STAT':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 800,
              backgroundColor: '#FEE2E2',
              color: '#991B1B',
              border: '1px solid #F87171'
            }}
          >
            <AlertTriangle size={14} /> STAT (Emergencia Vital)
          </span>
        );
      case 'URGENTE':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              border: '1px solid #FCD34D'
            }}
          >
            <Clock size={14} /> URGENTE
          </span>
        );
      case 'RUTINA':
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
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

  const pasos = [
    { id: 'CREADA', label: '1. Orden Creada' },
    { id: 'MUESTRA_PENDIENTE', label: '2. Muestra Recolectada' },
    { id: 'EN_ANALISIS', label: '3. En Análisis' },
    { id: 'PARA_VALIDAR', label: '4. Validación Técnica' },
    { id: 'COMPLETADA', label: '5. Informe Emitido' }
  ];

  const getPasoIndex = (estado: EstadoOrdenLaboratorio) => {
    switch (estado) {
      case 'CREADA':
        return 0;
      case 'MUESTRA_PENDIENTE':
        return 1;
      case 'EN_ANALISIS':
        return 2;
      case 'PARA_VALIDAR':
        return 3;
      case 'COMPLETADA':
        return 4;
      default:
        return 0;
    }
  };

  const indiceActual = getPasoIndex(orden.estado);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Cabecera y Navegación */}
      <div>
        <nav aria-label="Ruta de navegación" style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
          <Link to="/laboratorio/bandeja" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
            Bandeja de Trabajo (L01)
          </Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <strong style={{ color: 'var(--color-strong)' }}>Detalle de Orden {orden.codigoOrden} (L03)</strong>
        </nav>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button variant="secondary" size="sm" onClick={() => navigate('/laboratorio/bandeja')} aria-label="Volver a la bandeja">
              <ArrowLeft size={16} />
            </Button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--color-strong)' }}>
                  Orden {orden.codigoOrden} (L03)
                </h1>
                {renderBadgePrioridad(orden.prioridad)}
                <Badge variant="primary">{orden.estado}</Badge>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Seguimiento del circuito preanalítico, analítico y postanalítico institucional
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Button
              variant="secondary"
              onClick={() => navigate('/laboratorio/muestras')}
              leftIcon={<TestTube2 size={16} />}
            >
              Gestionar Muestras (L04)
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(`/laboratorio/informes/${orden.id}`)}
              leftIcon={<FileText size={16} />}
            >
              Informe Oficial (L09)
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate(`/laboratorio/resultados/captura/${orden.id}`)}
              leftIcon={<FlaskConical size={16} />}
            >
              Capturar Resultados (L06)
            </Button>
          </div>
        </div>
      </div>

      {/* Flujo de Estados / Stepper Operativo */}
      <Panel>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {pasos.map((paso, idx) => {
            const completado = idx < indiceActual;
            const activo = idx === indiceActual;
            return (
              <div
                key={paso.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: activo
                    ? 'var(--color-selection)'
                    : completado
                    ? 'rgba(16, 185, 129, 0.08)'
                    : 'transparent',
                  border: activo
                    ? '1px solid var(--color-primary)'
                    : completado
                    ? '1px solid rgba(16, 185, 129, 0.2)'
                    : '1px solid transparent'
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    backgroundColor: activo
                      ? 'var(--color-primary)'
                      : completado
                      ? '#10B981'
                      : 'var(--color-border)',
                    color: '#ffffff'
                  }}
                >
                  {completado ? <CheckCircle2 size={14} /> : idx + 1}
                </div>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: activo ? 700 : completado ? 600 : 500,
                    color: activo ? 'var(--color-primary)' : completado ? '#065F46' : 'var(--color-text-secondary)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {paso.label}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Resumen Clínico del Paciente y de la Orden */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Ficha Paciente */}
        <Panel title="Paciente">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-selection)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <User size={18} />
              </div>
              <div>
                <strong style={{ fontSize: '15px', color: 'var(--color-strong)' }}>{orden.pacienteNombre}</strong>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  DPI: {orden.pacienteDpi}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Edad: </span>
                <strong>{orden.pacienteEdad} años</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Sexo: </span>
                <strong>{orden.pacienteSexo}</strong>
              </div>
            </div>
          </div>
        </Panel>

        {/* Ficha Médica */}
        <Panel title="Solicitud Médica">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>Médico Solicitante:</span>
              <div style={{ fontWeight: 600, color: 'var(--color-strong)', marginTop: '2px' }}>
                {orden.medicoSolicitante}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '10px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Motivo Clínico / Justificación:</span>
              <p style={{ margin: '4px 0 0 0', color: 'var(--color-strong)', fontStyle: 'italic', lineHeight: 1.4 }}>
                «{orden.motivoClinico}»
              </p>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              Emisión: {new Date(orden.fechaCreacion).toLocaleString()}
            </div>
          </div>
        </Panel>
      </div>

      {/* Pestañas de Detalle */}
      <div
        role="tablist"
        aria-label="Detalle de la Orden"
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid var(--color-border)',
          overflowX: 'auto'
        }}
      >
        <button
          role="tab"
          aria-selected={tabActiva === 'pruebas'}
          type="button"
          onClick={() => setTabActiva('pruebas')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: tabActiva === 'pruebas' ? 700 : 500,
            color: tabActiva === 'pruebas' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: tabActiva === 'pruebas' ? '3px solid var(--color-primary)' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          <FlaskConical size={16} />
          <span>Pruebas Analíticas Solicitadas ({orden.items.length})</span>
        </button>

        <button
          role="tab"
          aria-selected={tabActiva === 'muestras'}
          type="button"
          onClick={() => setTabActiva('muestras')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: tabActiva === 'muestras' ? 700 : 500,
            color: tabActiva === 'muestras' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: tabActiva === 'muestras' ? '3px solid var(--color-primary)' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          <TestTube2 size={16} />
          <span>Muestras y Contenedores ({orden.muestras.length})</span>
        </button>

        <button
          role="tab"
          aria-selected={tabActiva === 'trazabilidad'}
          type="button"
          onClick={() => setTabActiva('trazabilidad')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: tabActiva === 'trazabilidad' ? 700 : 500,
            color: tabActiva === 'trazabilidad' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: tabActiva === 'trazabilidad' ? '3px solid var(--color-primary)' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          <History size={16} />
          <span>Trazabilidad de Muestra y Eventos (L05)</span>
        </button>
      </div>

      {/* Contenido Pestaña 1: Pruebas */}
      {tabActiva === 'pruebas' && (
        <Panel title="Pruebas Analíticas Incluidas">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '10px', color: 'var(--color-text-secondary)' }}>Código</th>
                  <th style={{ padding: '10px', color: 'var(--color-text-secondary)' }}>Prueba</th>
                  <th style={{ padding: '10px', color: 'var(--color-text-secondary)' }}>Sección</th>
                  <th style={{ padding: '10px', color: 'var(--color-text-secondary)' }}>Tipo de Muestra</th>
                  <th style={{ padding: '10px', color: 'var(--color-text-secondary)' }}>Versión</th>
                  <th style={{ padding: '10px', color: 'var(--color-text-secondary)' }}>Estado</th>
                  <th style={{ padding: '10px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Arancel</th>
                </tr>
              </thead>
              <tbody>
                {orden.items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-divider)' }}>
                    <td style={{ padding: '12px 10px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {item.codigoPrueba}
                    </td>
                    <td style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--color-strong)' }}>
                      {item.nombrePrueba}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <Badge variant="neutral">{item.seccion}</Badge>
                    </td>
                    <td style={{ padding: '12px 10px', color: 'var(--color-text-secondary)' }}>
                      {item.tipoMuestra}
                    </td>
                    <td style={{ padding: '12px 10px', fontFamily: 'monospace' }}>
                      v{item.versionPrueba}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <Badge variant={item.estado === 'VALIDADO' ? 'success' : item.estado === 'EN_PROCESO' ? 'info' : 'warning'}>
                        {item.estado}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--color-strong)' }}>
                      Q {item.arancelGTQ.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                  <td colSpan={6} style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700 }}>
                    Total de la Orden:
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 800, fontSize: '15px', color: 'var(--color-strong)' }}>
                    Q {orden.totalArancelGTQ.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>
      )}

      {/* Contenido Pestaña 2: Muestras */}
      {tabActiva === 'muestras' && (
        <Panel title="Muestras Asignadas y Contenedores">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {orden.muestras.map((muestra) => (
              <div
                key={muestra.id}
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--color-panel)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-surface, #ffffff)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-primary)'
                    }}
                  >
                    <TestTube2 size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontFamily: 'monospace', fontSize: '14px', color: 'var(--color-strong)' }}>
                        {muestra.codigoMuestra}
                      </strong>
                      <Badge
                        variant={
                          muestra.estado === 'ACEPTADA'
                            ? 'success'
                            : muestra.estado === 'RECHAZADA'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {muestra.estado}
                      </Badge>
                      {muestra.esRetoma && <Badge variant="neutral">Retoma</Badge>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      Contenedor: <strong>{muestra.tuboContenedor}</strong> · Tipo: <strong>{muestra.tipoMuestra}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textAlign: 'right' }}>
                  {muestra.tomadaPor && (
                    <div>
                      Tomada por: <strong>{muestra.tomadaPor}</strong>
                    </div>
                  )}
                  {muestra.fechaToma && (
                    <div>Fecha toma: {new Date(muestra.fechaToma).toLocaleString()}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Contenido Pestaña 3: Trazabilidad (L05) */}
      {tabActiva === 'trazabilidad' && (
        <Panel
          title="Trazabilidad Cronológica de Muestra (L05)"
          subtitle="Bitácora inmutable de eventos preanalíticos, recepción, rectificaciones y retomas"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {orden.muestras.flatMap((m) => m.eventosTrazabilidad).length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                No hay eventos registrados en la bitácora de trazabilidad.
              </div>
            ) : (
              orden.muestras
                .flatMap((m) =>
                  m.eventosTrazabilidad.map((evt) => ({
                    ...evt,
                    codigoMuestra: m.codigoMuestra
                  }))
                )
                .sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime())
                .map((evento, idx) => (
                  <div
                    key={evento.id || idx}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      padding: '12px 16px',
                      backgroundColor: 'var(--color-panel)',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor:
                          evento.tipoEvento === 'ACEPTACION'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : evento.tipoEvento === 'RECHAZO'
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'var(--color-selection)',
                        color:
                          evento.tipoEvento === 'ACEPTACION'
                            ? '#047857'
                            : evento.tipoEvento === 'RECHAZO'
                            ? '#B91C1C'
                            : 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '12px',
                        flexShrink: 0
                      }}
                    >
                      {idx + 1}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: 'var(--color-strong)', fontSize: '13px' }}>
                            {evento.tipoEvento} · Muestra {evento.codigoMuestra}
                          </strong>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                            por {evento.actor}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          {new Date(evento.fechaHora).toLocaleString()}
                        </span>
                      </div>

                      <div style={{ fontSize: '13px', color: 'var(--color-strong)', marginTop: '4px' }}>
                        {evento.detalle}
                      </div>

                      {evento.motivo && (
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          <em>Motivo / Causa: «{evento.motivo}»</em>
                        </div>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </Panel>
      )}
    </div>
  );
};
