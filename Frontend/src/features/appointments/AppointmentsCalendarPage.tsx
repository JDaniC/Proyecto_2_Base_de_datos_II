import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  User,
  MapPin,
  Filter,
  FileText,
  RefreshCw,
  XCircle,
  Stethoscope,
  History,
  CheckCircle2
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import {
  CitaAgenda,
  EstadoCita
} from '../../services/types';
import { Button } from '../../design-system/components/Button';
import { Badge } from '../../design-system/components/Badge';
import { Modal } from '../../design-system/components/Modal';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { EmptyState } from '../../design-system/components/EmptyState';
import { PROFESIONALES_DISPONIBLES } from '../../mocks/mockAppointmentsData';
import { CrearCitaModal } from './CrearCitaModal';
import { ReprogramarCitaModal } from './ReprogramarCitaModal';
import { CancelarCitaModal } from './CancelarCitaModal';

const DIAS_SEMANA_BASE = [
  { diaSemana: 'LUN', fecha: '2026-10-19', label: '19 oct' },
  { diaSemana: 'MAR', fecha: '2026-10-20', label: '20 oct' },
  { diaSemana: 'MIÉ', fecha: '2026-10-21', label: '21 oct' },
  { diaSemana: 'JUE', fecha: '2026-10-22', label: '22 oct' },
  { diaSemana: 'VIE', fecha: '2026-10-23', label: '23 oct' },
  { diaSemana: 'SÁB', fecha: '2026-10-24', label: '24 oct' }
];

export const AppointmentsCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const { sesion } = useAuthSession();
  const { appointmentRepository } = useServices();

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';
  const profesionales = PROFESIONALES_DISPONIBLES[institucionId] || [];

  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>('2026-10-19');
  const [vistaModo, setVistaModo] = useState<'DIARIA' | 'SEMANAL'>('DIARIA');
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [profesionalFiltro, setProfesionalFiltro] = useState<string>('TODOS');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoCita | 'TODOS'>('TODOS');

  const [citas, setCitas] = useState<CitaAgenda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [citaSeleccionada, setCitaSeleccionada] = useState<CitaAgenda | null>(null);

  // Estados de Modales V09
  const [isCrearModalOpen, setIsCrearModalOpen] = useState(false);
  const [citaParaReprogramar, setCitaParaReprogramar] = useState<CitaAgenda | null>(null);
  const [citaParaCancelar, setCitaParaCancelar] = useState<CitaAgenda | null>(null);
  const [toastMensaje, setToastMensaje] = useState<string | null>(null);

  const cargarCitas = useCallback(() => {
    let cancelado = false;
    setCargando(true);
    const fechaDesde = vistaModo === 'DIARIA' ? fechaSeleccionada : '2026-10-19';
    const fechaHasta = vistaModo === 'DIARIA' ? fechaSeleccionada : '2026-10-24';

    appointmentRepository
      .obtenerCitas(institucionId, {
        fechaDesde,
        fechaHasta,
        profesionalId: profesionalFiltro,
        estado: estadoFiltro,
        q: terminoBusqueda
      })
      .then((data) => {
        if (!cancelado) {
          setCitas(data);
          setCargando(false);
        }
      })
      .catch((err) => {
        if (!cancelado) {
          console.error('Error cargando citas de agenda:', err);
          setCargando(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [
    appointmentRepository,
    institucionId,
    vistaModo,
    fechaSeleccionada,
    profesionalFiltro,
    estadoFiltro,
    terminoBusqueda
  ]);

  useEffect(() => {
    const cleanup = cargarCitas();
    return () => {
      if (cleanup) cleanup();
    };
  }, [cargarCitas]);

  const mostrarToast = (mensaje: string) => {
    setToastMensaje(mensaje);
    setTimeout(() => {
      setToastMensaje(null);
    }, 4000);
  };

  const getBadgeEstado = (estado: EstadoCita) => {
    switch (estado) {
      case 'PROGRAMADA':
        return <Badge variant="primary">Programada</Badge>;
      case 'ATENDIDA':
        return <Badge variant="success">Atendida</Badge>;
      case 'CANCELADA':
        return <Badge variant="danger">Cancelada</Badge>;
      default:
        return <Badge variant="neutral">{estado}</Badge>;
    }
  };

  const getBordeColor = (estado: EstadoCita) => {
    switch (estado) {
      case 'PROGRAMADA':
        return 'var(--color-primary)';
      case 'ATENDIDA':
        return 'var(--color-success-text)';
      case 'CANCELADA':
        return 'var(--color-danger-text)';
      default:
        return 'var(--color-border)';
    }
  };

  return (
    <div style={{ padding: '32px 32px 64px' }}>
      {/* Migas de pan */}
      <nav
        aria-label="Migas de pan"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          marginBottom: '16px'
        }}
      >
        <span
          onClick={() => navigate('/panel')}
          style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
        >
          Inicio
        </span>
        <span>/</span>
        <span style={{ color: 'var(--color-strong)', fontWeight: 600 }}>Agenda de citas</span>
      </nav>

      {/* Notificación de retroalimentación de operaciones V09 */}
      {toastMensaje && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'var(--color-success-bg)',
            color: 'var(--color-success-text)',
            border: '1px solid var(--color-success-border)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-input)',
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{toastMensaje}</span>
        </div>
      )}

      {/* Encabezado y Acción Primaria */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 700,
                color: 'var(--color-strong)',
                margin: 0
              }}
            >
              {institucionId === 'CLINICA_ODONTOLOGICA'
                ? 'Agenda odontológica / Gestión de secretaría'
                : 'Agenda médica institucional'}
            </h1>
            <Badge variant="neutral">
              {citas.length} {citas.length === 1 ? 'cita' : 'citas'}
            </Badge>
            {institucionId === 'CLINICA_ODONTOLOGICA' && (
              <Badge variant="primary">Odontología</Badge>
            )}
          </div>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--color-text-secondary)',
              marginTop: '4px',
              marginBottom: 0
            }}
          >
            {institucionId === 'CLINICA_ODONTOLOGICA'
              ? 'Gestión y programación de citas para sillones odontológicos y especialistas en Clínica Odontológica Integral.'
              : `Gestión y seguimiento de atenciones programadas en ${sesion?.institucionNombre}.`}
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<CalendarPlus size={18} />}
          onClick={() => setIsCrearModalOpen(true)}
          aria-label={
            institucionId === 'CLINICA_ODONTOLOGICA'
              ? 'Crear nueva cita odontológica'
              : 'Crear nueva cita médica'
          }
        >
          {institucionId === 'CLINICA_ODONTOLOGICA' ? 'Nueva cita odontológica' : 'Nueva cita'}
        </Button>
      </div>

      {/* Banner de Secretaría Odontológica (C01, RF-C08) */}
      {institucionId === 'CLINICA_ODONTOLOGICA' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-selection)',
            border: '1px solid var(--color-primary)',
            borderRadius: 'var(--radius-input)',
            padding: '12px 16px',
            marginBottom: '16px',
            fontSize: '13px',
            color: 'var(--color-strong)',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
            <span>
              <strong>Gestión de Secretaría (C01):</strong> Operador activo:{' '}
              <strong>{sesion?.nombre || 'Ana Lucía Méndez'}</strong> ({sesion?.rolEtiqueta || 'Secretaría'}). Asignación de sillones y control de citas odontológicas.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            <span>Sillón 1: Operatoria</span>
            <span>•</span>
            <span>Sillón 2: Endodoncia</span>
            <span>•</span>
            <span>Sillón 3: Ortodoncia</span>
          </div>
        </div>
      )}

      {/* Tarjetas de Resumen C01 Odontología */}
      {institucionId === 'CLINICA_ODONTOLOGICA' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginBottom: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-panel)',
              padding: '12px 16px',
              boxShadow: 'var(--shadow-panel)'
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Citas del día</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-strong)' }}>
              {citas.length}
            </div>
          </div>
          <div
            style={{
              backgroundColor: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-panel)',
              padding: '12px 16px',
              boxShadow: 'var(--shadow-panel)'
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Programadas</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>
              {citas.filter((c) => c.estado === 'PROGRAMADA').length}
            </div>
          </div>
          <div
            style={{
              backgroundColor: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-panel)',
              padding: '12px 16px',
              boxShadow: 'var(--shadow-panel)'
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Atendidas</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-success-text)' }}>
              {citas.filter((c) => c.estado === 'ATENDIDA').length}
            </div>
          </div>
          <div
            style={{
              backgroundColor: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-panel)',
              padding: '12px 16px',
              boxShadow: 'var(--shadow-panel)'
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Canceladas</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-danger-text)' }}>
              {citas.filter((c) => c.estado === 'CANCELADA').length}
            </div>
          </div>
        </div>
      )}

      {/* Panel Superior: Selector de Semana y Tira de Días Interactiva */}
      <div
        style={{
          backgroundColor: 'var(--color-background)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-panel)',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: 'var(--shadow-panel)'
        }}
      >
        {/* Cabecera de navegación de semana y conmutador diario/semanal */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ChevronLeft size={16} />}
              onClick={() => setFechaSeleccionada('2026-10-19')}
              aria-label="Semana anterior"
            />
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-strong)' }}>
              Semana del 19 al 24 de octubre, 2026
            </span>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ChevronRight size={16} />}
              onClick={() => setFechaSeleccionada('2026-10-23')}
              aria-label="Semana siguiente"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFechaSeleccionada('2026-10-19')}
            >
              Hoy
            </Button>
          </div>

          {/* Conmutador de vista Diaria / Semanal */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--color-control)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)'
            }}
          >
            <button
              type="button"
              onClick={() => setVistaModo('DIARIA')}
              style={{
                padding: '6px 14px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor:
                  vistaModo === 'DIARIA' ? 'var(--color-background)' : 'transparent',
                color:
                  vistaModo === 'DIARIA'
                    ? 'var(--color-primary)'
                    : 'var(--color-text-secondary)',
                boxShadow:
                  vistaModo === 'DIARIA' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
            >
              Vista diaria (24 h)
            </button>
            <button
              type="button"
              onClick={() => setVistaModo('SEMANAL')}
              style={{
                padding: '6px 14px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor:
                  vistaModo === 'SEMANAL' ? 'var(--color-background)' : 'transparent',
                color:
                  vistaModo === 'SEMANAL'
                    ? 'var(--color-primary)'
                    : 'var(--color-text-secondary)',
                boxShadow:
                  vistaModo === 'SEMANAL' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
            >
              Vista semanal
            </button>
          </div>
        </div>

        {/* Tira de días interactiva con fondo menta #DDEFE9 para el día activo */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: '8px'
          }}
        >
          {DIAS_SEMANA_BASE.map((dia) => {
            const isSelected = fechaSeleccionada === dia.fecha;
            return (
              <button
                key={dia.fecha}
                type="button"
                onClick={() => setFechaSeleccionada(dia.fecha)}
                aria-pressed={isSelected}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '10px 8px',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  backgroundColor: isSelected ? 'var(--color-selection)' : 'var(--color-background)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  gap: '4px'
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    letterSpacing: '0.05em'
                  }}
                >
                  {dia.diaSemana}
                </span>
                <span
                  style={{
                    fontSize: '16px',
                    fontWeight: isSelected ? 800 : 600,
                    color: isSelected ? 'var(--color-primary)' : 'var(--color-strong)'
                  }}
                >
                  {dia.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barra de Filtros: Buscador, Profesional y Estado (DEC-04) */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          backgroundColor: 'var(--color-panel)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-panel)',
          border: '1px solid var(--color-border-panel)'
        }}
      >
        <div style={{ flex: '1 1 260px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '14px',
              color: 'var(--color-text-secondary)',
              pointerEvents: 'none'
            }}
          />
          <input
            type="search"
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
            placeholder="Buscar por paciente, código o motivo..."
            aria-label="Buscador de citas"
            style={{
              width: '100%',
              height: '38px',
              backgroundColor: 'var(--color-input-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '0 14px 0 38px',
              fontSize: '13px',
              color: 'var(--color-strong)',
              outline: 'none'
            }}
          />
        </div>

        {/* Selector de Profesional */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={16} style={{ color: 'var(--color-text-secondary)' }} />
          <select
            value={profesionalFiltro}
            onChange={(e) => setProfesionalFiltro(e.target.value)}
            aria-label="Filtrar por profesional"
            style={{
              height: '38px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-background)',
              padding: '0 10px',
              fontSize: '13px'
            }}
          >
            <option value="TODOS">Todos los profesionales</option>
            {profesionales.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({p.especialidad})
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Estado Contractual (DEC-04) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} style={{ color: 'var(--color-text-secondary)' }} />
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value as EstadoCita | 'TODOS')}
            aria-label="Filtrar por estado contractual"
            style={{
              height: '38px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-background)',
              padding: '0 10px',
              fontSize: '13px'
            }}
          >
            <option value="TODOS">Todos los estados</option>
            <option value="PROGRAMADA">Programadas</option>
            <option value="ATENDIDA">Atendidas</option>
            <option value="CANCELADA">Canceladas</option>
          </select>
        </div>
      </div>

      {/* Contenedor de Citas: Vista Diaria vs Vista Semanal */}
      {cargando ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <SkeletonLoader variant="rectangular" height="72px" />
          <SkeletonLoader variant="rectangular" height="72px" />
          <SkeletonLoader variant="rectangular" height="72px" />
        </div>
      ) : citas.length === 0 ? (
        <EmptyState
          title="Sin citas agendadas"
          description={
            terminoBusqueda || estadoFiltro !== 'TODOS'
              ? 'No hay citas médicas que coincidan con los filtros aplicados para este período.'
              : 'No hay citas registradas en la agenda para la fecha seleccionada.'
          }
          actionText="Ver todos los horarios"
          onAction={() => {
            setTerminoBusqueda('');
            setEstadoFiltro('TODOS');
            setProfesionalFiltro('TODOS');
          }}
        />
      ) : vistaModo === 'DIARIA' ? (
        /* Vista Diaria en Filas Cronológicas (24 h) */
        <div
          style={{
            backgroundColor: 'var(--color-background)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-panel)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-panel)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {citas.map((cita) => (
              <div
                key={cita.id}
                onClick={() => setCitaSeleccionada(cita)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setCitaSeleccionada(cita)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--color-divider)',
                  borderLeft: `4px solid ${getBordeColor(cita.estado)}`,
                  cursor: 'pointer',
                  transition: 'background-color var(--transition-fast)',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {/* Horario 24 h */}
                <div style={{ minWidth: '100px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} style={{ color: 'var(--color-primary)' }} />
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '15px',
                      fontWeight: 700,
                      color: 'var(--color-strong)'
                    }}
                  >
                    {cita.horaInicio}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    - {cita.horaFin}
                  </span>
                </div>

                {/* Paciente y Código */}
                <div style={{ flex: '1 1 220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-strong)', fontSize: '15px' }}>
                      {cita.pacienteNombre}
                    </span>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        color: 'var(--color-primary)',
                        backgroundColor: 'var(--color-panel)',
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      {cita.pacienteCodigo}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text)', marginTop: '2px' }}>
                    {cita.motivo}
                  </div>
                </div>

                {/* Profesional y Consultorio */}
                <div style={{ minWidth: '220px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  <div style={{ fontWeight: 500, color: 'var(--color-strong)' }}>
                    {cita.profesionalNombre}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <MapPin size={13} />
                    <span>{cita.consultorio}</span>
                  </div>
                  {cita.secretariaGestora && (
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      Secretaría: <strong>{cita.secretariaGestora}</strong>
                    </div>
                  )}
                </div>

                {/* Estado */}
                <div style={{ minWidth: '110px', textAlign: 'right' }}>
                  {getBadgeEstado(cita.estado)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Vista Semanal (Grilla de 6 Columnas) */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px'
          }}
        >
          {DIAS_SEMANA_BASE.map((dia) => {
            const citasDelDia = citas.filter((c) => c.fecha === dia.fecha);
            return (
              <div
                key={dia.fecha}
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-panel)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  minHeight: '260px'
                }}
              >
                <div
                  style={{
                    borderBottom: '1px solid var(--color-divider)',
                    paddingBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <strong style={{ fontSize: '13px', color: 'var(--color-strong)' }}>
                    {dia.diaSemana} {dia.label}
                  </strong>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    {citasDelDia.length}
                  </span>
                </div>

                {citasDelDia.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: '20px', fontStyle: 'italic' }}>
                    Sin citas
                  </div>
                ) : (
                  citasDelDia.map((cita) => (
                    <div
                      key={cita.id}
                      onClick={() => setCitaSeleccionada(cita)}
                      style={{
                        backgroundColor: 'var(--color-panel)',
                        borderLeft: `3px solid ${getBordeColor(cita.estado)}`,
                        padding: '8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>{cita.horaInicio}</span>
                        {getBadgeEstado(cita.estado)}
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--color-strong)', marginTop: '2px' }}>
                        {cita.pacienteNombre}
                      </div>
                      <div style={{ color: 'var(--color-text-secondary)', marginTop: '2px', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cita.motivo}
                      </div>
                      {cita.secretariaGestora && (
                        <div style={{ color: 'var(--color-primary)', fontSize: '10px', marginTop: '2px' }}>
                          Sec: {cita.secretariaGestora}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalle de Cita Médica / Odontológica (C02) */}
      {citaSeleccionada && (
        <Modal
          isOpen={Boolean(citaSeleccionada)}
          onClose={() => setCitaSeleccionada(null)}
          title={
            institucionId === 'CLINICA_ODONTOLOGICA'
              ? 'Detalle de Cita Odontológica (C02)'
              : 'Detalle de Cita Médica (V08)'
          }
          maxWidth="560px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--color-panel)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-input)'
              }}
            >
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Horario programado:</span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                  {citaSeleccionada.fecha} · {citaSeleccionada.horaInicio} a {citaSeleccionada.horaFin} h
                </div>
              </div>
              {getBadgeEstado(citaSeleccionada.estado)}
            </div>

            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Paciente:</span>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                {citaSeleccionada.pacienteNombre}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                Expediente: {citaSeleccionada.pacienteCodigo}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Profesional y área:</span>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-strong)' }}>
                {citaSeleccionada.profesionalNombre} ({citaSeleccionada.profesionalRol})
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                {citaSeleccionada.consultorio}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Motivo de la atención:</span>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--color-text)',
                  backgroundColor: 'var(--color-input-bg)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  margin: '4px 0 0 0'
                }}
              >
                {citaSeleccionada.motivo}
              </p>
            </div>

            {/* Secretaria gestora (Odontología C02) */}
            {citaSeleccionada.secretariaGestora && (
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--color-strong)',
                  backgroundColor: 'var(--color-selection)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-primary)'
                }}
              >
                <strong>Secretaría gestora de la cita:</strong> {citaSeleccionada.secretariaGestora}
              </div>
            )}

            {/* Aviso de cita ya atendida (C02) */}
            {citaSeleccionada.estado === 'ATENDIDA' && (
              <div
                style={{
                  backgroundColor: 'var(--color-success-bg)',
                  border: '1px solid var(--color-success-border)',
                  borderRadius: 'var(--radius-input)',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: 'var(--color-success-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle2 size={16} />
                <span>Cita atendida. Registro de consulta clínica completado exitosamente (409 CITA_YA_ATENDIDA en reintentos).</span>
              </div>
            )}

            {/* Aviso de aislamiento de rol secretaría (RF-C08, CA18) */}
            {sesion?.rolId === 'SECRETARIA' && institucionId === 'CLINICA_ODONTOLOGICA' && (
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'var(--color-input-bg)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)'
                }}
              >
                <strong>Aislamiento de rol (CA18):</strong> Como secretaría, puede reprogramar o cancelar esta cita. El inicio de la consulta y examen clínico corresponde exclusivamente al odontólogo tratante.
              </div>
            )}

            {/* Motivo de cancelación obligatorio (si aplica) */}
            {citaSeleccionada.estado === 'CANCELADA' && citaSeleccionada.motivoCancelacion && (
              <div
                style={{
                  backgroundColor: 'var(--color-danger-bg)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-danger-border)'
                }}
              >
                <strong style={{ color: 'var(--color-danger-text)', fontSize: '13px' }}>
                  Motivo obligatorio de cancelación:
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-danger-text)' }}>
                  {citaSeleccionada.motivoCancelacion}
                </p>
              </div>
            )}

            {/* Historial de reprogramaciones (Auditoría V09) */}
            {citaSeleccionada.historialReprogramaciones && citaSeleccionada.historialReprogramaciones.length > 0 && (
              <div
                style={{
                  backgroundColor: 'var(--color-input-bg)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--color-strong)',
                    marginBottom: '8px'
                  }}
                >
                  <History size={15} />
                  <span>Historial de reprogramaciones (Auditoría):</span>
                </div>
                {citaSeleccionada.historialReprogramaciones.map((rep, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: '12px',
                      borderTop: idx > 0 ? '1px dashed var(--color-border)' : 'none',
                      paddingTop: idx > 0 ? '6px' : 0,
                      marginTop: idx > 0 ? '6px' : 0
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Horario anterior:</span>{' '}
                      <strong>{rep.fechaHoraPrevia}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Nuevo horario:</span>{' '}
                      <strong>{rep.nuevaFechaHora}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Motivo:</span> {rep.motivo}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Botones de acción contextual */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                marginTop: '16px',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {citaSeleccionada.estado === 'PROGRAMADA' && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<RefreshCw size={14} />}
                      onClick={() => {
                        setCitaParaReprogramar(citaSeleccionada);
                        setCitaSeleccionada(null);
                      }}
                    >
                      Reprogramar cita
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<XCircle size={14} />}
                      onClick={() => {
                        setCitaParaCancelar(citaSeleccionada);
                        setCitaSeleccionada(null);
                      }}
                    >
                      Cancelar cita
                    </Button>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {citaSeleccionada.estado === 'PROGRAMADA' && (
                  sesion?.rolId === 'SECRETARIA' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Stethoscope size={15} />}
                      disabled
                      title="Atención clínica odontológica reservada para el odontólogo tratante (CA18)"
                    >
                      {institucionId === 'CLINICA_ODONTOLOGICA'
                        ? 'Iniciar consulta odontológica'
                        : 'Iniciar atención médica'}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Stethoscope size={15} />}
                      onClick={() => {
                        const pId = citaSeleccionada.pacienteId;
                        const cId = citaSeleccionada.id;
                        setCitaSeleccionada(null);
                        navigate(`/pacientes/${pId}/consultas/nueva?citaId=${cId}`);
                      }}
                    >
                      {institucionId === 'CLINICA_ODONTOLOGICA'
                        ? 'Iniciar consulta odontológica'
                        : 'Iniciar atención médica'}
                    </Button>
                  )
                )}
                {citaSeleccionada.estado === 'ATENDIDA' && (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<FileText size={15} />}
                    onClick={() => {
                      const pId = citaSeleccionada.pacienteId;
                      setCitaSeleccionada(null);
                      navigate(`/pacientes/${pId}`);
                    }}
                  >
                    {institucionId === 'CLINICA_ODONTOLOGICA'
                      ? 'Ver consulta odontológica realizada'
                      : 'Ver atención en expediente'}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<FileText size={15} />}
                  onClick={() => {
                    const pId = citaSeleccionada.pacienteId;
                    setCitaSeleccionada(null);
                    navigate(`/pacientes/${pId}`);
                  }}
                >
                  Ver expediente
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCitaSeleccionada(null)}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal V09: Programar Nueva Cita */}
      <CrearCitaModal
        isOpen={isCrearModalOpen}
        onClose={() => setIsCrearModalOpen(false)}
        fechaInicial={fechaSeleccionada}
        onCitaCreada={(_nuevaId) => {
          cargarCitas();
          mostrarToast('Cita médica programada exitosamente en el horario seleccionado.');
        }}
      />

      {/* Modal V09: Reprogramar Cita */}
      <ReprogramarCitaModal
        isOpen={Boolean(citaParaReprogramar)}
        onClose={() => {
          setCitaSeleccionada(citaParaReprogramar);
          setCitaParaReprogramar(null);
        }}
        cita={citaParaReprogramar}
        onCitaReprogramada={(citaActualizada) => {
          setCitaParaReprogramar(null);
          setCitaSeleccionada(citaActualizada);
          cargarCitas();
          mostrarToast('Cita médica reprogramada exitosamente. Se ha registrado en la bitácora de auditoría.');
        }}
      />

      {/* Modal V09: Cancelar Cita */}
      <CancelarCitaModal
        isOpen={Boolean(citaParaCancelar)}
        onClose={() => {
          setCitaSeleccionada(citaParaCancelar);
          setCitaParaCancelar(null);
        }}
        cita={citaParaCancelar}
        onCitaCancelada={(citaActualizada) => {
          setCitaParaCancelar(null);
          setCitaSeleccionada(citaActualizada);
          cargarCitas();
          mostrarToast('Cita médica cancelada con motivo registrado según normativa.');
        }}
      />
    </div>
  );
};
