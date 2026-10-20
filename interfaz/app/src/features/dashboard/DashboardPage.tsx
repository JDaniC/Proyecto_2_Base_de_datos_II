import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  UserPlus,
  CalendarPlus,
  Stethoscope,
  FileText,
  Pill,
  TestTube,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { Tabs, TabItem } from '../../design-system/components/Tabs';
import { Modal } from '../../design-system/components/Modal';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { DashboardData, CitaDashboard, EstadoCita } from '../../services/types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { sesion } = useAuthSession();
  const { dashboardRepository } = useServices();

  const [datos, setDatos] = useState<DashboardData | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [tabCitas, setTabCitas] = useState<string>('HOY');
  const [citaSeleccionada, setCitaSeleccionada] = useState<CitaDashboard | null>(null);

  useEffect(() => {
    if (!sesion) return;
    setCargando(true);
    dashboardRepository
      .obtenerDashboard(sesion.institucionId, sesion.rolId)
      .then((resultado) => {
        setDatos(resultado);
        setCargando(false);
      })
      .catch(() => {
        setCargando(false);
      });
  }, [dashboardRepository, sesion]);

  if (!sesion) return null;

  // Fecha actual formateada en zona horaria America/Guatemala
  const fechaHoy = new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'full',
    timeZone: 'America/Guatemala',
  }).format(new Date());

  const getEstadoBadge = (estado: EstadoCita) => {
    switch (estado) {
      case 'PROGRAMADA':
        return <Badge variant="warning" withDot>Programada</Badge>;
      case 'EN_CURSO':
        return <Badge variant="primary" withDot>En atención</Badge>;
      case 'ATENDIDA':
        return <Badge variant="success" withDot>Atendida</Badge>;
      case 'CANCELADA':
        return <Badge variant="danger" withDot>Cancelada</Badge>;
    }
  };

  const getIconoActividad = (tipo: string) => {
    switch (tipo) {
      case 'DIAGNOSTICO':
        return <Stethoscope size={16} color="var(--color-primary)" />;
      case 'RECETA':
        return <Pill size={16} color="var(--color-info-text)" />;
      case 'MUESTRA':
        return <TestTube size={16} color="var(--color-warning-text)" />;
      case 'INGRESO':
        return <Activity size={16} color="var(--color-success-text)" />;
      case 'CITA':
        return <Calendar size={16} color="var(--color-primary)" />;
      default:
        return <FileText size={16} color="var(--color-text-secondary)" />;
    }
  };

  const citasVisibles = tabCitas === 'HOY' ? (datos?.citasHoy || []) : (datos?.citasProximas || []);

  const tabsCitas: TabItem[] = [
    {
      id: 'HOY',
      label: `Citas de hoy (${datos?.citasHoy.length || 0})`,
    },
    {
      id: 'PROXIMAS',
      label: `Próximas (${datos?.citasProximas.length || 0})`,
    },
  ];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Encabezado principal «Resumen general» y contexto de fecha */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
              {fechaHoy}
            </span>
            <span style={{ color: 'var(--color-divider)' }}>•</span>
            <Badge variant="primary">{sesion.institucionNombre}</Badge>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-strong)' }}>
            Resumen general
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Bienvenido, {sesion.nombre} · {sesion.rolEtiqueta}
          </p>
        </div>

        {/* Acciones rápidas de cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/agenda')}
            leftIcon={<CalendarPlus size={16} />}
          >
            Nueva cita
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/pacientes/nuevo')}
            leftIcon={<UserPlus size={16} />}
          >
            Registrar paciente
          </Button>
        </div>
      </div>

      {/* 2. Métricas operativas en un ÚNICO panel horizontal (sin tarjetas individuales) */}
      <Panel variant="white" padding="md">
        {cargando ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <SkeletonLoader variant="rectangular" height="60px" />
            <SkeletonLoader variant="rectangular" height="60px" />
            <SkeletonLoader variant="rectangular" height="60px" />
            <SkeletonLoader variant="rectangular" height="60px" />
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '24px',
              alignItems: 'center',
            }}
          >
            {datos?.metricas.map((metrica, idx) => (
              <div
                key={metrica.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  paddingLeft: idx > 0 ? '16px' : 0,
                  borderLeft: idx > 0 ? '1px solid var(--color-divider)' : 'none',
                }}
              >
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  {metrica.etiqueta}
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-strong)', lineHeight: 1.1 }}>
                    {metrica.valor}
                  </span>
                </div>
                {metrica.tendencia && (
                  <span style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 500 }}>
                    {metrica.tendencia}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Layout de dos columnas: Próximas Citas (Panel sutil) y Actividad Reciente */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>
        
        {/* 3. Panel sutil (#F8FBF9) para Próximas citas con selector «Hoy / Próximas» */}
        <Panel
          variant="subtle"
          title="Agenda de atenciones"
          subtitle="Pacientes citados para consulta o procedimiento clínico"
          padding="none"
        >
          {/* Selector de pestañas Hoy / Próximas */}
          <div style={{ padding: '0 16px', borderBottom: '1px solid var(--color-divider)' }}>
            <Tabs tabs={tabsCitas} activeTab={tabCitas} onChange={setTabCitas} />
          </div>

          <div style={{ padding: '8px 16px 16px' }}>
            {cargando ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 0' }}>
                <SkeletonLoader variant="rectangular" height="52px" />
                <SkeletonLoader variant="rectangular" height="52px" />
                <SkeletonLoader variant="rectangular" height="52px" />
              </div>
            ) : citasVisibles.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                No hay citas programadas para este filtro.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {citasVisibles.map((cita) => (
                  <div
                    key={cita.id}
                    onClick={() => setCitaSeleccionada(cita)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setCitaSeleccionada(cita);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-input)',
                      backgroundColor: 'var(--color-background)',
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: 'var(--color-strong)',
                          fontWeight: 700,
                          fontSize: '14px',
                          fontVariantNumeric: 'tabular-nums',
                          width: '64px',
                          flexShrink: 0,
                        }}
                      >
                        <Clock size={14} color="var(--color-text-secondary)" />
                        {cita.hora}
                      </div>

                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-strong)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {cita.pacienteNombre}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                            {cita.pacienteCodigo}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {cita.motivo}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      {getEstadoBadge(cita.estado)}
                      <ArrowRight size={14} color="var(--color-text-secondary)" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

        {/* 4. Sección «Actividad reciente» con filas limpias separadas por divider */}
        <Panel
          variant="white"
          title="Actividad reciente del centro"
          subtitle="Eventos clínicos y registros administrativos recientes"
          padding="none"
        >
          <div style={{ padding: '8px 16px' }}>
            {cargando ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 0' }}>
                <SkeletonLoader variant="rectangular" height="40px" />
                <SkeletonLoader variant="rectangular" height="40px" />
                <SkeletonLoader variant="rectangular" height="40px" />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {datos?.actividades.map((actividad, index) => (
                  <div
                    key={actividad.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 0',
                      borderBottom:
                        index < (datos.actividades.length - 1)
                          ? '1px solid var(--color-divider)'
                          : 'none',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--color-selection)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      {getIconoActividad(actividad.tipoEvento)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)' }}>
                          {actividad.autor}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                          {actividad.tiempoRelativo}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                        {actividad.descripcion}
                      </p>
                      {actividad.recursoCodigo && (
                        <div style={{ marginTop: '4px' }}>
                          <code style={{ fontSize: '11px', backgroundColor: 'var(--color-control)', padding: '2px 6px', borderRadius: '4px' }}>
                            {actividad.recursoCodigo}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Modal accesible de detalle de cita al hacer clic en una fila */}
      {citaSeleccionada && (
        <Modal
          isOpen={Boolean(citaSeleccionada)}
          onClose={() => setCitaSeleccionada(null)}
          title="Detalle de Cita Médica"
          description={`Expediente: ${citaSeleccionada.pacienteCodigo}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setCitaSeleccionada(null)}>
                Cerrar
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setCitaSeleccionada(null);
                  navigate('/agenda');
                }}
              >
                Ver en agenda completa
              </Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>Paciente:</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                  {citaSeleccionada.pacienteNombre}
                </span>
              </div>
              <div>{getEstadoBadge(citaSeleccionada.estado)}</div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                padding: '12px',
                backgroundColor: 'var(--color-background-alt)',
                borderRadius: 'var(--radius-input)',
                border: '1px solid var(--color-border)',
                fontSize: '13px',
              }}
            >
              <div>
                <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Horario programado:</span>
                <strong style={{ color: 'var(--color-strong)' }}>
                  {citaSeleccionada.hora} ({citaSeleccionada.fecha})
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Ubicación:</span>
                <strong style={{ color: 'var(--color-strong)' }}>
                  {citaSeleccionada.consultorioOArea || 'Consultorio regular'}
                </strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Profesional a cargo:</span>
                <strong style={{ color: 'var(--color-strong)' }}>{citaSeleccionada.profesionalNombre}</strong>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', display: 'block', marginBottom: '4px' }}>
                Motivo de la atención:
              </span>
              <p style={{ fontSize: '14px', color: 'var(--color-text)', lineHeight: 1.5, backgroundColor: 'var(--color-panel)', padding: '12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--color-border-panel)' }}>
                {citaSeleccionada.motivo}
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
