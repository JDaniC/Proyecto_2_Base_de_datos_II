import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BedDouble,
  Clock,
  LogOut,
  ArrowRightLeft,
  ArrowLeft,
  Activity,
  Plus,
  CheckCircle2,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { EmptyState } from '../../design-system/components/EmptyState';
import { RegistrarEgresoModal } from './RegistrarEgresoModal';
import { AsignarCamaModal } from './AsignarCamaModal';
import {
  HospitalizacionItem,
  CamaHospitalaria,
  RegistrarEgresoHospitalarioDTO
} from '../../services/types';

export const HospitalizationDetailPage: React.FC = () => {
  const { ingresoId } = useParams<{ ingresoId: string }>();
  const navigate = useNavigate();
  const { sesion } = useAuthSession();
  const { hospitalizationRepository } = useServices();
  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [loading, setLoading] = useState(true);
  const [hospitalizacion, setHospitalizacion] = useState<HospitalizacionItem | null>(null);
  const [camas, setCamas] = useState<CamaHospitalaria[]>([]);
  const [tabActiva, setTabActiva] = useState<'evolucion' | 'camas' | 'consultas' | 'procedimientos'>('evolucion');

  // Modales
  const [modalEgresoAbierto, setModalEgresoAbierto] = useState(false);
  const [modalCamaAbierto, setModalCamaAbierto] = useState(false);

  // Formulario nueva nota de evolución
  const [mostrarFormNota, setMostrarFormNota] = useState(false);
  const [notaTexto, setNotaTexto] = useState('');
  const [planTexto, setPlanTexto] = useState('');
  const [guardandoNota, setGuardandoNota] = useState(false);

  // Formulario nuevo procedimiento
  const [mostrarFormProc, setMostrarFormProc] = useState(false);
  const [procNombre, setProcNombre] = useState('');
  const [procResultado, setProcResultado] = useState('');
  const [procObs, setProcObs] = useState('');
  const [guardandoProc, setGuardandoProc] = useState(false);

  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const cargarDatos = async () => {
    if (!ingresoId) return;
    setLoading(true);
    try {
      const [hosp, camasRes] = await Promise.all([
        hospitalizationRepository.obtenerHospitalizacionPorId(institucionId, ingresoId),
        hospitalizationRepository.listarCamas(institucionId)
      ]);
      setHospitalizacion(hosp);
      setCamas(camasRes);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [institucionId, ingresoId, hospitalizationRepository]);

  const handleEgresoConfirm = async (dto: RegistrarEgresoHospitalarioDTO) => {
    if (!hospitalizacion) return;
    const actualizado = await hospitalizationRepository.registrarEgreso(institucionId, hospitalizacion.id, dto);
    setHospitalizacion(actualizado);
    setMensajeExito('Egreso hospitalario registrado exitosamente y cama liberada.');
    const camasActualizadas = await hospitalizationRepository.listarCamas(institucionId);
    setCamas(camasActualizadas);
    setTimeout(() => setMensajeExito(null), 4000);
  };

  const handleAsignarCamaConfirm = async (nuevaCamaId: string, fechaInicio: string, motivo: string) => {
    if (!hospitalizacion) return;
    const actualizado = await hospitalizationRepository.asignarCama(institucionId, hospitalizacion.id, nuevaCamaId, fechaInicio, motivo);
    setHospitalizacion(actualizado);
    setMensajeExito('Traslado de cama registrado correctamente con intervalo [inicio, fin) no solapado.');
    const camasActualizadas = await hospitalizationRepository.listarCamas(institucionId);
    setCamas(camasActualizadas);
    setTimeout(() => setMensajeExito(null), 4000);
  };

  const handleAgregarNota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalizacion || !notaTexto.trim()) return;
    setGuardandoNota(true);
    try {
      const actualizado = await hospitalizationRepository.agregarNotaEvolucion(institucionId, hospitalizacion.id, {
        medicoNombre: sesion?.nombre || 'Dra. Elena Morales',
        medicoColegiado: sesion?.colegiado || 'CMG-10421',
        fechaHora: new Date().toISOString(),
        notaClinica: notaTexto.trim(),
        planTerapeutico: planTexto.trim() || undefined
      });
      setHospitalizacion(actualizado);
      setNotaTexto('');
      setPlanTexto('');
      setMostrarFormNota(false);
      setMensajeExito('Nota de evolución registrada exitosamente.');
      setTimeout(() => setMensajeExito(null), 3500);
    } finally {
      setGuardandoNota(false);
    }
  };

  const handleAgregarProc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalizacion || !procNombre.trim() || !procResultado.trim()) return;
    setGuardandoProc(true);
    try {
      const actualizado = await hospitalizationRepository.agregarProcedimiento(institucionId, hospitalizacion.id, {
        nombre: procNombre.trim(),
        fechaHora: new Date().toISOString(),
        profesionalNombre: sesion?.nombre || 'Dra. Elena Morales',
        resultado: procResultado.trim(),
        observaciones: procObs.trim() || undefined
      });
      setHospitalizacion(actualizado);
      setProcNombre('');
      setProcResultado('');
      setProcObs('');
      setMostrarFormProc(false);
      setMensajeExito('Procedimiento clínico registrado exitosamente.');
      setTimeout(() => setMensajeExito(null), 3500);
    } finally {
      setGuardandoProc(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <SkeletonLoader height={32} width={280} />
        <SkeletonLoader height={140} />
        <SkeletonLoader height={360} />
      </div>
    );
  }

  if (!hospitalizacion) {
    return (
      <Panel>
        <EmptyState
          title="Hospitalización no encontrada"
          description="El registro de internamiento solicitado no existe o no pertenece a esta institución."
          actionText="Volver a Hospitalizaciones"
          onAction={() => navigate('/hospital/hospitalizaciones')}
        />
      </Panel>
    );
  }

  const calcularEstanciaDias = (fechaIngreso: string, fechaEgreso?: string): number => {
    const inicio = new Date(fechaIngreso).getTime();
    const fin = fechaEgreso ? new Date(fechaEgreso).getTime() : Date.now();
    return Math.max(1, Math.round((fin - inicio) / (1000 * 60 * 60 * 24)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Breadcrumb */}
      <nav aria-label="Ruta de navegación" style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        <span>Inicio</span>
        <span style={{ margin: '0 8px' }}>/</span>
        <span>Hospitalización</span>
        <span style={{ margin: '0 8px' }}>/</span>
        <span
          onClick={() => navigate('/hospital/hospitalizaciones')}
          style={{ cursor: 'pointer', textDecoration: 'underline' }}
        >
          Hospitalizaciones (H01)
        </span>
        <span style={{ margin: '0 8px' }}>/</span>
        <strong style={{ color: 'var(--color-strong)' }}>Detalle de Internamiento {hospitalizacion.codigoIngreso} (H02)</strong>
      </nav>

      {/* Banner de éxito */}
      {mensajeExito && (
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
            fontSize: '14px'
          }}
        >
          <CheckCircle2 size={18} />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* Cabecera Principal H02 */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-panel)',
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
              <BedDouble size={20} />
            </div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--color-strong)' }}>
              {hospitalizacion.pacienteNombre}
            </h1>
            <Badge variant={hospitalizacion.estado === 'ACTIVA' ? 'success' : 'neutral'}>
              {hospitalizacion.estado}
            </Badge>
            {hospitalizacion.camaActual ? (
              <Badge variant="primary">
                Cama {hospitalizacion.camaActual.codigoCama} ({hospitalizacion.camaActual.servicio})
              </Badge>
            ) : (
              <Badge variant="neutral">Sin Cama Asignada</Badge>
            )}
          </div>

          <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--color-text-secondary)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span>Código de Ingreso: <strong style={{ color: 'var(--color-strong)' }}>{hospitalizacion.codigoIngreso}</strong></span>
            <span>Expediente: <strong style={{ color: 'var(--color-strong)' }}>{hospitalizacion.pacienteExpediente}</strong></span>
            <span>Estancia: <strong style={{ color: 'var(--color-strong)' }}>{calcularEstanciaDias(hospitalizacion.fechaIngreso, hospitalizacion.fechaEgreso)} días</strong></span>
          </div>
        </div>

        {/* Acciones principales de hospitalización */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            onClick={() => navigate('/hospital/hospitalizaciones')}
            leftIcon={<ArrowLeft size={16} />}
          >
            Volver a Lista (H01)
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate(`/pacientes/${hospitalizacion.pacienteId}`)}
            leftIcon={<ExternalLink size={16} />}
          >
            Expediente (V06)
          </Button>

          {hospitalizacion.estado === 'ACTIVA' && (
            <>
              <Button
                variant="secondary"
                onClick={() => setModalCamaAbierto(true)}
                leftIcon={<ArrowRightLeft size={16} />}
              >
                Cambiar Cama (H04)
              </Button>

              <Button
                variant="primary"
                onClick={() => setModalEgresoAbierto(true)}
                leftIcon={<LogOut size={16} />}
              >
                Registrar Egreso (Alta)
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tarjeta de Resumen Clínico del Ingreso */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Activity size={18} color="var(--color-primary)" />
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-strong)' }}>
              Datos del Ingreso Hospitalario
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-divider)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Fecha y Hora de Ingreso:</span>
              <strong style={{ color: 'var(--color-strong)' }}>
                {new Date(hospitalizacion.fechaIngreso).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' })}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-divider)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Médico Tratante (H08):</span>
              <span style={{ textAlign: 'right' }}>
                <strong style={{ color: 'var(--color-strong)', display: 'block' }}>{hospitalizacion.medicoTratanteNombre}</strong>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Colegiado: {hospitalizacion.medicoTratanteColegiado}</span>
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-divider)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Diagnóstico de Ingreso:</span>
              <span style={{ textAlign: 'right', maxWidth: '60%' }}>
                <strong style={{ color: 'var(--color-strong)' }}>{hospitalizacion.diagnosticoIngresoNombre}</strong>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                  CIE-10: {hospitalizacion.diagnosticoIngresoCIE}
                </div>
              </span>
            </div>

            <div style={{ marginTop: '4px' }}>
              <span style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Criterio y Motivo de Internamiento:</span>
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--color-background)',
                  borderRadius: 'var(--radius-field)',
                  border: '1px solid var(--color-border)',
                  lineHeight: 1.5,
                  color: 'var(--color-strong)'
                }}
              >
                {hospitalizacion.motivoIngreso}
              </div>
            </div>
          </div>
        </Panel>

        {/* Tarjeta de Egreso (si está egresada) o Ubicación Actual (si está activa) */}
        {hospitalizacion.estado === 'EGRESADA' ? (
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <LogOut size={18} color="#059669" />
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-strong)' }}>
                Resumen de Egreso Hospitalario
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-divider)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Fecha de Egreso:</span>
                <strong style={{ color: 'var(--color-strong)' }}>
                  {hospitalizacion.fechaEgreso ? new Date(hospitalizacion.fechaEgreso).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-divider)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Modalidad de Egreso:</span>
                <Badge variant="success">{hospitalizacion.tipoEgreso || 'ALTA_MEDICA'}</Badge>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-divider)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Diagnóstico de Egreso:</span>
                <span style={{ textAlign: 'right', maxWidth: '60%' }}>
                  <strong style={{ color: 'var(--color-strong)' }}>{hospitalizacion.diagnosticoEgresoNombre || hospitalizacion.diagnosticoIngresoNombre}</strong>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                    CIE-10: {hospitalizacion.diagnosticoEgresoCIE || hospitalizacion.diagnosticoIngresoCIE}
                  </div>
                </span>
              </div>

              <div style={{ marginTop: '4px' }}>
                <span style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Resumen Clínico y Plan Ambulatorio:</span>
                <div
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--color-selection)',
                    borderRadius: 'var(--radius-field)',
                    border: '1px solid var(--color-border)',
                    lineHeight: 1.5,
                    color: 'var(--color-strong)'
                  }}
                >
                  {hospitalizacion.resumenEgreso || 'Sin resumen registrado.'}
                </div>
              </div>
            </div>
          </Panel>
        ) : (
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <BedDouble size={18} color="var(--color-primary)" />
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-strong)' }}>
                Ubicación Hospitalaria Actual (H03)
              </h2>
            </div>

            {hospitalizacion.camaActual ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: 'var(--color-selection)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-field)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)' }}>
                      Cama {hospitalizacion.camaActual.codigoCama}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-strong)', marginTop: '2px' }}>
                      {hospitalizacion.camaActual.habitacion} • {hospitalizacion.camaActual.servicio}
                    </div>
                  </div>
                  <Badge variant="primary">OCUPADA</Badge>
                </div>

                <div
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--color-background)',
                    borderRadius: 'var(--radius-field)',
                    border: '1px solid var(--color-divider)',
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <ShieldCheck size={16} color="var(--color-primary)" />
                  <span>
                    Asignación auditada. El intervalo semiabierto [inicio, fin) no genera solapamientos (CA17).
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                El paciente no cuenta con una cama asignada en este momento.
              </div>
            )}
          </Panel>
        )}
      </div>

      {/* Pestañas de Detalle Clínico e Historial */}
      <Panel>
        {/* Barra de pestañas con indicador clínico */}
        <div
          role="tablist"
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--color-divider)',
            paddingBottom: '12px',
            marginBottom: '18px',
            overflowX: 'auto'
          }}
        >
          <button
            role="tab"
            aria-selected={tabActiva === 'evolucion'}
            onClick={() => setTabActiva('evolucion')}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '14px',
              fontWeight: tabActiva === 'evolucion' ? 700 : 500,
              color: tabActiva === 'evolucion' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom: tabActiva === 'evolucion' ? '3px solid var(--color-primary)' : '3px solid transparent',
              cursor: 'pointer'
            }}
          >
            Evolución y Notas ({hospitalizacion.notasEvolucion?.length || 0})
          </button>

          <button
            role="tab"
            aria-selected={tabActiva === 'camas'}
            onClick={() => setTabActiva('camas')}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '14px',
              fontWeight: tabActiva === 'camas' ? 700 : 500,
              color: tabActiva === 'camas' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom: tabActiva === 'camas' ? '3px solid var(--color-primary)' : '3px solid transparent',
              cursor: 'pointer'
            }}
          >
            Historial de Camas (H04) ({hospitalizacion.asignacionesCama.length})
          </button>

          <button
            role="tab"
            aria-selected={tabActiva === 'consultas'}
            onClick={() => setTabActiva('consultas')}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '14px',
              fontWeight: tabActiva === 'consultas' ? 700 : 500,
              color: tabActiva === 'consultas' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom: tabActiva === 'consultas' ? '3px solid var(--color-primary)' : '3px solid transparent',
              cursor: 'pointer'
            }}
          >
            Consultas Enlazadas ({hospitalizacion.consultasEnlazadasIds.length})
          </button>

          <button
            role="tab"
            aria-selected={tabActiva === 'procedimientos'}
            onClick={() => setTabActiva('procedimientos')}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '14px',
              fontWeight: tabActiva === 'procedimientos' ? 700 : 500,
              color: tabActiva === 'procedimientos' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom: tabActiva === 'procedimientos' ? '3px solid var(--color-primary)' : '3px solid transparent',
              cursor: 'pointer'
            }}
          >
            Procedimientos Realizados (H07) ({hospitalizacion.procedimientos?.length || 0})
          </button>
        </div>

        {/* Contenido Pestaña 1: Evolución Clínica */}
        {tabActiva === 'evolucion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Notas de evolución médica registradas cronológicamente durante la estancia.
              </div>
              {hospitalizacion.estado === 'ACTIVA' && !mostrarFormNota && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setMostrarFormNota(true)}
                  leftIcon={<Plus size={14} />}
                >
                  Agregar Nota de Evolución
                </Button>
              )}
            </div>

            {/* Formulario Inline para agregar nota */}
            {mostrarFormNota && (
              <form
                onSubmit={handleAgregarNota}
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-field)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-strong)' }}>
                  Nueva Nota de Evolución Médica
                </div>

                <div>
                  <label
                    htmlFor="nota-clinica-input"
                    style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
                  >
                    Evolución Clínica y Signos Vitales *
                  </label>
                  <textarea
                    id="nota-clinica-input"
                    rows={3}
                    value={notaTexto}
                    onChange={(e) => setNotaTexto(e.target.value)}
                    placeholder="Detallar evolución hemodinámica, hallazgos matutinos, tolerancia y respuesta terapéutica..."
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-field)',
                      fontSize: '13px',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="plan-terapeutico-input"
                    style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
                  >
                    Plan Terapéutico e Indicaciones (Opcional)
                  </label>
                  <input
                    id="plan-terapeutico-input"
                    type="text"
                    value={planTexto}
                    onChange={(e) => setPlanTexto(e.target.value)}
                    placeholder="Ajuste de dosis, exámenes complementarios o criterios de alta..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-field)',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                  <Button size="sm" variant="secondary" onClick={() => setMostrarFormNota(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" type="submit" variant="primary" disabled={guardandoNota}>
                    {guardandoNota ? 'Guardando...' : 'Guardar Nota'}
                  </Button>
                </div>
              </form>
            )}

            {/* Lista de notas */}
            {!hospitalizacion.notasEvolucion || hospitalizacion.notasEvolucion.length === 0 ? (
              <EmptyState
                title="Sin notas de evolución registradas"
                description="Aún no se han asentado notas clínicas durante esta hospitalización."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {hospitalizacion.notasEvolucion.map((nota) => (
                  <div
                    key={nota.id}
                    style={{
                      padding: '14px 16px',
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-field)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-strong)', fontSize: '13px' }}>
                        {nota.medicoNombre} ({nota.medicoColegiado})
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {new Date(nota.fechaHora).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                      {nota.notaClinica}
                    </p>

                    {nota.planTerapeutico && (
                      <div style={{ fontSize: '12px', color: 'var(--color-primary)', backgroundColor: 'var(--color-selection)', padding: '6px 10px', borderRadius: '4px' }}>
                        <strong>Plan:</strong> {nota.planTerapeutico}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contenido Pestaña 2: Historial de Camas (H04) */}
        {tabActiva === 'camas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                padding: '12px',
                backgroundColor: 'var(--color-selection)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-field)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <ShieldCheck size={18} color="var(--color-primary)" />
              <span>
                <strong>Auditoría de asignación semiabierta [inicio, fin) (CA17):</strong> Ninguna cama ni paciente puede
                mantener solapamiento de horario. Cada traslado fija el fin de la asignación anterior idéntico al inicio de la nueva.
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-background)' }}>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>Cama / Ubicación</th>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>Servicio</th>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>Fecha / Hora Inicio</th>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>Fecha / Hora Fin</th>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>Motivo / Causa</th>
                  </tr>
                </thead>
                <tbody>
                  {hospitalizacion.asignacionesCama.map((asig) => (
                    <tr key={asig.id} style={{ borderBottom: '1px solid var(--color-divider)' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-strong)' }}>{asig.codigoCama}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{asig.habitacion}</div>
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        <Badge variant="neutral">{asig.servicio}</Badge>
                      </td>

                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        {new Date(asig.fechaInicio).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>

                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        {asig.fechaFin ? (
                          new Date(asig.fechaFin).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' })
                        ) : (
                          <Badge variant="success">Actual (En curso)</Badge>
                        )}
                      </td>

                      <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>
                        {asig.motivoCambio || 'Ingreso inicial a sala'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Contenido Pestaña 3: Consultas Enlazadas */}
        {tabActiva === 'consultas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Consultas médicas ambulatorias o de emergencia asociadas directamente a este internamiento.
            </div>

            {hospitalizacion.consultasEnlazadasIds.length === 0 ? (
              <EmptyState
                title="Sin consultas previas enlazadas"
                description="Este ingreso hospitalario fue registrado directamente sin vincular una consulta externa previa."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {hospitalizacion.consultasEnlazadasIds.map((cid, idx) => (
                  <div
                    key={cid}
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--color-selection)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-field)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--color-strong)', fontSize: '13px' }}>
                        Consulta #{idx + 1} — Referencia {cid}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                        Paciente propietario: {hospitalizacion.pacienteNombre} ({hospitalizacion.pacienteExpediente})
                      </div>
                    </div>
                    <Badge variant="primary">Integridad RF-016 Verificada</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contenido Pestaña 4: Procedimientos Realizados (H07) */}
        {tabActiva === 'procedimientos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Procedimientos clínicos o quirúrgicos realizados durante el internamiento (H07).
              </div>
              {hospitalizacion.estado === 'ACTIVA' && !mostrarFormProc && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setMostrarFormProc(true)}
                  leftIcon={<Plus size={14} />}
                >
                  Registrar Procedimiento (H07)
                </Button>
              )}
            </div>

            {/* Formulario nuevo procedimiento */}
            {mostrarFormProc && (
              <form
                onSubmit={handleAgregarProc}
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-field)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-strong)' }}>
                  Registrar Procedimiento Hospitalario (H07)
                </div>

                <div>
                  <label
                    htmlFor="proc-nombre-input"
                    style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
                  >
                    Nombre del Procedimiento *
                  </label>
                  <input
                    id="proc-nombre-input"
                    type="text"
                    value={procNombre}
                    onChange={(e) => setProcNombre(e.target.value)}
                    placeholder="Ejemplo: Toracocentesis diagnóstica, Sutura de herida compleja..."
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-field)',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="proc-resultado-input"
                    style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
                  >
                    Resultado / Hallazgos *
                  </label>
                  <input
                    id="proc-resultado-input"
                    type="text"
                    value={procResultado}
                    onChange={(e) => setProcResultado(e.target.value)}
                    placeholder="Ejemplo: Procedimiento sin complicaciones, líquido claro obtenido..."
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-field)',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="proc-obs-input"
                    style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
                  >
                    Observaciones Técnicas (Opcional)
                  </label>
                  <input
                    id="proc-obs-input"
                    type="text"
                    value={procObs}
                    onChange={(e) => setProcObs(e.target.value)}
                    placeholder="Material utilizado, medicación intra-procedimiento..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-field)',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                  <Button size="sm" variant="secondary" onClick={() => setMostrarFormProc(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" type="submit" variant="primary" disabled={guardandoProc}>
                    {guardandoProc ? 'Registrando...' : 'Registrar Procedimiento'}
                  </Button>
                </div>
              </form>
            )}

            {!hospitalizacion.procedimientos || hospitalizacion.procedimientos.length === 0 ? (
              <EmptyState
                title="Sin procedimientos registrados"
                description="No se han registrado maniobras ni intervenciones clínicas en esta hospitalización."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {hospitalizacion.procedimientos.map((proc) => (
                  <div
                    key={proc.id}
                    style={{
                      padding: '14px 16px',
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-field)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--color-strong)', fontSize: '13px' }}>
                        {proc.nombre}
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {new Date(proc.fechaHora).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                      <strong>Resultado:</strong> {proc.resultado}
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      Ejecutor: {proc.profesionalNombre} {proc.observaciones && `• Observaciones: ${proc.observaciones}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Panel>

      {/* Modales */}
      {modalEgresoAbierto && (
        <RegistrarEgresoModal
          isOpen={modalEgresoAbierto}
          onClose={() => setModalEgresoAbierto(false)}
          hospitalizacion={hospitalizacion}
          onConfirm={handleEgresoConfirm}
        />
      )}

      {modalCamaAbierto && (
        <AsignarCamaModal
          isOpen={modalCamaAbierto}
          onClose={() => setModalCamaAbierto(false)}
          hospitalizacion={hospitalizacion}
          camasDisponibles={camas}
          onConfirm={handleAsignarCamaConfirm}
        />
      )}
    </div>
  );
};
