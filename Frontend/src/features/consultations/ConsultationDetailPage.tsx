import { getErrorMessage } from '../../services/errors';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Edit3,
  User,
  Stethoscope,
  Calendar,
  Plus
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { Alert } from '../../design-system/components/Alert';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { EmptyState } from '../../design-system/components/EmptyState';
import { ImprimirRecetaModal } from './ImprimirRecetaModal';
import { ModificarConsultaModal } from './ModificarConsultaModal';
import { DetalleConsultaCompleta, Paciente } from '../../services/types';

export const ConsultationDetailPage: React.FC = () => {
  const { pacienteId, consultaId } = useParams<{ pacienteId: string; consultaId: string }>();
  const navigate = useNavigate();
  const { sesion } = useAuthSession();
  const { consultationRepository, patientRepository, mode } = useServices();

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [loading, setLoading] = useState(true);
  const [consulta, setConsulta] = useState<DetalleConsultaCompleta | null>(null);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [showImprimirReceta, setShowImprimirReceta] = useState(false);
  const [showModificarConsulta, setShowModificarConsulta] = useState(false);
  const [versionVista, setVersionVista] = useState<number | undefined>();
  const [versionActual, setVersionActual] = useState(1);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Procedimientos H07
  const [mostrarFormProc, setMostrarFormProc] = useState(false);
  const [procNombre, setProcNombre] = useState('');
  const [procResultado, setProcResultado] = useState('');
  const [procObs, setProcObs] = useState('');
  const [guardandoProc, setGuardandoProc] = useState(false);

  const handleRegistrarProcedimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consulta || !pacienteId || !procNombre.trim() || !procResultado.trim()) return;
    setGuardandoProc(true);
    try {
      const actualizada = await consultationRepository.agregarProcedimiento(
        institucionId,
        pacienteId,
        consulta.id,
        {
          nombre: procNombre.trim(),
          fechaHora: new Date().toISOString(),
          profesionalNombre: sesion?.nombre || consulta.profesionalNombre,
          resultado: procResultado.trim(),
          observaciones: procObs.trim() || undefined
        }
      );
      setConsulta(actualizada);
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

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!pacienteId || !consultaId) {
        setError('Parámetros de consulta no válidos.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        const [pacData, conData] = await Promise.all([
          patientRepository.obtenerPorId(institucionId, pacienteId),
          consultationRepository.obtenerPorId(institucionId, pacienteId, consultaId, versionVista)
        ]);

        if (!isMounted) return;

        if (!pacData) {
          setError('No se encontró el paciente solicitado.');
        } else if (!conData) {
          setError('No se encontró la consulta solicitada.');
        } else {
          // Aislamiento de rol Secretaría (RF-C08, CA18)
          if (sesion?.rolId === 'SECRETARIA') {
            setError('No tienes permiso para consultar las notas clínicas de esta atención.');
            return;
          }
          setPaciente(pacData);
          setConsulta(conData);
          if (versionVista === undefined) setVersionActual(conData.version ?? conData.revision);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(getErrorMessage(err, 'Error al recuperar los datos de la consulta.'));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [institucionId, pacienteId, consultaId, versionVista, consultationRepository, patientRepository]);

  const handleConsultaActualizada = (actualizada: DetalleConsultaCompleta) => {
    setConsulta(actualizada);
    setVersionActual(actualizada.version ?? actualizada.revision);
    setMensajeExito(`Consulta clínica actualizada con éxito a versión v${actualizada.revision}.`);
    setTimeout(() => setMensajeExito(null), 6000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '8px 0' }}>
        <SkeletonLoader height="40px" />
        <SkeletonLoader variant="card" height="120px" />
        <SkeletonLoader variant="card" height="200px" />
      </div>
    );
  }

  if (error || !consulta || !paciente) {
    return (
      <EmptyState
        title="Consulta no disponible"
        description={error || 'La consulta médica solicitada no existe o no pertenece a esta institución.'}
        actionText="Volver al expediente del paciente"
        onAction={() => navigate(`/pacientes/${pacienteId}`)}
      />
    );
  }

  const sv = consulta.signosVitales || {};
  const diagnosticoPrincipal = consulta.diagnosticos?.find((d) => d.esPrincipal);
  const diagnosticosSecundarios = consulta.diagnosticos?.filter((d) => !d.esPrincipal) || [];

  // Calcular IMC si existen peso y talla
  const peso = sv.pesoKg;
  const talla = sv.tallaCm;
  const imcCalculado =
    peso != null && talla != null && talla > 0
      ? (peso / Math.pow(talla / 100, 2)).toFixed(1)
      : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Breadcrumb de navegación */}
      <nav
        aria-label="Ruta de navegación"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: 'var(--color-text-secondary)'
        }}
      >
        <Link
          to={`/pacientes/${paciente.id}`}
          style={{
            color: 'var(--color-primary)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <ArrowLeft size={14} />
          <span>Volver al expediente de {paciente.nombreCompleto}</span>
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--color-strong)', fontWeight: 600 }}>
          Detalle de Consulta
        </span>
      </nav>

      {/* Alerta de notificación si se rectificó */}
      {mensajeExito && (
        <Alert variant="success" title="Actualización guardada">
          {mensajeExito}
        </Alert>
      )}

      {/* Cabecera Principal de la Consulta */}
      <div
        style={{
          backgroundColor: 'var(--color-background)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-panel)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--color-strong)'
                }}
              >
                {consulta.motivo}
              </h1>
              <Badge variant={consulta.estado === 'FINALIZADA' ? 'success' : 'warning'}>
                {consulta.estado === 'FINALIZADA' ? 'Finalizada' : 'En curso'}
              </Badge>
              <Badge variant="info">
                v{consulta.revision || 1}
              </Badge>
              {institucionId === 'CLINICA_ODONTOLOGICA' && (
                <Badge variant="primary">Odontología</Badge>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginTop: '8px',
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
                flexWrap: 'wrap'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={14} />
                {new Date(consulta.fechaHora).toLocaleString('es-GT', {
                  dateStyle: 'long',
                  timeStyle: 'short'
                })}
              </span>
              <span>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Stethoscope size={14} />
                {consulta.profesionalNombre} ({consulta.profesionalRol})
              </span>
              <span>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <User size={14} />
                Paciente: {paciente.nombreCompleto} ({paciente.codigoLegible})
              </span>
            </div>
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {consulta.receta && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowImprimirReceta(true)}
              >
                <Printer size={15} style={{ marginRight: '6px' }} />
                Imprimir Receta Médica
              </Button>
            )}
            {versionVista === undefined && sesion?.permisos.includes('consultas.registrar') && <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowModificarConsulta(true)}
            >
              <Edit3 size={15} style={{ marginRight: '6px' }} />
              Corregir o Actualizar Consulta
            </Button>}
          </div>
        </div>

        {/* Banner de trazabilidad / versión */}
        <div
          style={{
            backgroundColor: 'var(--color-panel)',
            borderLeft: '4px solid var(--color-primary)',
            padding: '10px 14px',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div>
            <strong>Registro clínico:</strong> Las modificaciones posteriores quedan registradas con su autor y motivo.
          </div>
          <div>
            Versión actual activa: <strong>v{consulta.revision || 1}</strong>
          </div>
        </div>
      </div>

      {/* Grid de Secciones */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Motivo y Síntomas */}
        <Panel title="Evaluación Clínica y Síntomas" subtitle="Motivo y cuadro actual relatado">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '14px' }}>
            <div>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 600 }}>
                Motivo de Consulta:
              </span>
              <p style={{ margin: '4px 0 0 0', fontWeight: 500, color: 'var(--color-strong)' }}>
                {consulta.motivo}
              </p>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 600 }}>
                Síntomas y Evolución:
              </span>
              <p style={{ margin: '4px 0 0 0', lineHeight: 1.5, color: 'var(--color-strong)' }}>
                {consulta.sintomas || 'No descritos detalladamente.'}
              </p>
            </div>
            {consulta.observaciones && (
              <div>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 600 }}>
                  Observaciones Adicionales / Examen Físico:
                </span>
                <p style={{ margin: '4px 0 0 0', lineHeight: 1.5, color: 'var(--color-strong)' }}>
                  {consulta.observaciones}
                </p>
              </div>
            )}
          </div>
        </Panel>

        {/* Signos Vitales Medidos */}
        <Panel
          title="Signos Vitales y Mediciones"
          subtitle="Registrados en la toma somatométrica de la consulta"
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px'
            }}
          >
            {/* Presión Arterial */}
            <div
              style={{
                backgroundColor: 'var(--color-panel)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)'
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                Presión Arterial
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                {sv.presionSistolica != null && sv.presionDiastolica != null ? (
                  `${sv.presionSistolica}/${sv.presionDiastolica} mmHg`
                ) : (
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 400 }}>
                    No medido
                  </span>
                )}
              </div>
            </div>

            {/* Frecuencia Cardíaca */}
            <div
              style={{
                backgroundColor: 'var(--color-panel)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)'
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                Frec. Cardíaca
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                {sv.frecuenciaCardiacaLpm != null ? (
                  `${sv.frecuenciaCardiacaLpm} lpm`
                ) : (
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 400 }}>
                    No medido
                  </span>
                )}
              </div>
            </div>

            {/* Frecuencia Respiratoria */}
            <div
              style={{
                backgroundColor: 'var(--color-panel)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)'
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                Frec. Respiratoria
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                {sv.frecuenciaRespiratoriaRpm != null ? (
                  `${sv.frecuenciaRespiratoriaRpm} rpm`
                ) : (
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 400 }}>
                    No medido
                  </span>
                )}
              </div>
            </div>

            {/* Temperatura */}
            <div
              style={{
                backgroundColor: 'var(--color-panel)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)'
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                Temperatura
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                {sv.temperaturaC != null ? (
                  `${sv.temperaturaC} °C`
                ) : (
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 400 }}>
                    No medido
                  </span>
                )}
              </div>
            </div>

            {/* Saturación O2 */}
            <div
              style={{
                backgroundColor: 'var(--color-panel)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)'
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                Saturación O₂
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                {sv.saturacionOxigenoPct != null ? (
                  `${sv.saturacionOxigenoPct}%`
                ) : (
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 400 }}>
                    No medido
                  </span>
                )}
              </div>
            </div>

            {/* Peso */}
            <div
              style={{
                backgroundColor: 'var(--color-panel)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)'
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                Peso Corporal
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                {sv.pesoKg != null ? (
                  `${sv.pesoKg} kg`
                ) : (
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 400 }}>
                    No medido
                  </span>
                )}
              </div>
            </div>

            {/* Talla */}
            <div
              style={{
                backgroundColor: 'var(--color-panel)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)'
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                Estatura / Talla
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                {sv.tallaCm != null ? (
                  `${sv.tallaCm} cm`
                ) : (
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 400 }}>
                    No medido
                  </span>
                )}
              </div>
            </div>

            {/* IMC */}
            <div
              style={{
                backgroundColor: 'var(--color-selection)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--color-primary)'
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '4px' }}>
                IMC Calculado
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)' }}>
                {imcCalculado != null ? (
                  `${imcCalculado} kg/m²`
                ) : (
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 400 }}>
                    No calculado
                  </span>
                )}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Diagnósticos y Tratamientos (V12) */}
      <Panel
        title="Diagnósticos (CIE-10) y Tratamientos Clínicos"
        subtitle="Diagnósticos, tratamientos y procedimientos vinculados a esta consulta."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Diagnóstico Principal */}
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '8px'
              }}
            >
              Diagnóstico Principal Obligatorio
            </div>
            {diagnosticoPrincipal ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'var(--color-panel)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  borderLeft: '4px solid var(--color-primary)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <code
                      style={{
                        backgroundColor: 'var(--color-background)',
                        border: '1px solid var(--color-border)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        color: 'var(--color-primary)'
                      }}
                    >
                      {diagnosticoPrincipal.codigoCIE}
                    </code>
                    <strong style={{ color: 'var(--color-strong)', fontSize: '14px' }}>
                      {diagnosticoPrincipal.nombre}
                    </strong>
                  </div>
                </div>
                <Badge variant="primary">Principal</Badge>
              </div>
            ) : (
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                Sin diagnóstico principal asignado.
              </div>
            )}
          </div>

          {/* Diagnósticos Secundarios */}
          {diagnosticosSecundarios.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--color-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '8px'
                }}
              >
                Diagnósticos Secundarios / Comorbilidades
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {diagnosticosSecundarios.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'var(--color-panel)',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      fontSize: '13px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <code style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                        {d.codigoCIE}
                      </code>
                      <span>{d.nombre}</span>
                    </div>
                    <Badge variant="neutral">Secundario</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tratamientos Clínicos Indicados */}
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '8px'
              }}
            >
              Tratamientos e Indicaciones Terapéuticas
            </div>
            {consulta.tratamientos && consulta.tratamientos.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {consulta.tratamientos.map((t, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: 'var(--color-panel)',
                      padding: '12px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      fontSize: '13px',
                      lineHeight: 1.5
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--color-strong)' }}>
                      • {t.descripcion}
                    </div>
                    {t.indicaciones && (
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                        Indicaciones: {t.indicaciones}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                No se registraron tratamientos no farmacológicos específicos.
              </div>
            )}
          </div>
        </div>
      </Panel>

      {/* Receta Médica Emitida (V13) */}
      <Panel
        title="Prescripción Farmacológica / Receta Oficial"
        subtitle="Medicamentos con posología, concentración e indicaciones estructuradas"
        action={
          consulta.receta ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowImprimirReceta(true)}
            >
              <Printer size={14} style={{ marginRight: '6px' }} />
              Imprimir Receta
            </Button>
          ) : undefined
        }
      >
        {consulta.receta && consulta.receta.medicamentos && consulta.receta.medicamentos.length > 0 ? (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                fontSize: '12px',
                color: 'var(--color-text-secondary)'
              }}
            >
              <span>
                Código Oficial de Prescripción: <strong>{consulta.receta.codigoReceta}</strong>
              </span>
              <span>
                Fecha de Emisión: {new Date(consulta.receta.fechaEmision).toLocaleDateString('es-GT', { dateStyle: 'long' })}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                    <th style={{ padding: '8px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Medicamento</th>
                    <th style={{ padding: '8px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Presentación</th>
                    <th style={{ padding: '8px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Dosis</th>
                    <th style={{ padding: '8px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Frecuencia / Vía</th>
                    <th style={{ padding: '8px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Duración</th>
                    <th style={{ padding: '8px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Indicaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {consulta.receta.medicamentos.map((m, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        backgroundColor: idx % 2 === 0 ? 'var(--color-background)' : 'var(--color-panel)'
                      }}
                    >
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: 'var(--color-strong)' }}>
                        {m.nombre}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        {m.presentacion} {m.concentracion}
                      </td>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>
                        {m.dosis}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        {m.frecuencia} ({m.via})
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        {m.duracion}
                      </td>
                      <td style={{ padding: '10px 8px', color: 'var(--color-strong)' }}>
                        {m.indicaciones || 'Según indicación'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
            No se prescribieron medicamentos para esta consulta médica.
          </div>
        )}
      </Panel>

      {/* Procedimientos Clínicos Realizados (H07) */}
      {mode !== 'api' && institucionId === 'HOSPITAL_GENERAL' && (
      <Panel
        title="Procedimientos Clínicos Realizados"
        subtitle="Intervenciones, exploraciones diagnósticas o procedimientos menores ambulatorios"
        action={
          !mostrarFormProc && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Plus size={14} />}
              onClick={() => setMostrarFormProc(true)}
            >
              Registrar Procedimiento
            </Button>
          )
        }
      >
        {mostrarFormProc && (
          <form
            onSubmit={handleRegistrarProcedimiento}
            style={{
              padding: '16px',
              backgroundColor: 'var(--color-panel)',
              borderRadius: 'var(--radius-panel)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '16px'
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-strong)' }}>
              Registrar Procedimiento Clínico
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              <div>
                <label
                  htmlFor="proc-cons-nombre"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
                >
                  Nombre del Procedimiento *
                </label>
                <input
                  id="proc-cons-nombre"
                  type="text"
                  value={procNombre}
                  onChange={(e) => setProcNombre(e.target.value)}
                  placeholder="Ejemplo: Curación de herida, Infiltración articular..."
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-input)',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="proc-cons-resultado"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
                >
                  Resultado o Hallazgos Obtenidos *
                </label>
                <input
                  id="proc-cons-resultado"
                  type="text"
                  value={procResultado}
                  onChange={(e) => setProcResultado(e.target.value)}
                  placeholder="Ejemplo: Procedimiento tolerado sin incidentes, sangrado mínimo..."
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-input)',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="proc-cons-obs"
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
              >
                Observaciones y Cuidados Posteriores (Opcional)
              </label>
              <input
                id="proc-cons-obs"
                type="text"
                value={procObs}
                onChange={(e) => setProcObs(e.target.value)}
                placeholder="Ejemplo: Se colocó vendaje compresivo, cita de control en 7 días..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <Button size="sm" variant="secondary" onClick={() => setMostrarFormProc(false)} disabled={guardandoProc}>
                Cancelar
              </Button>
              <Button size="sm" type="submit" variant="primary" disabled={guardandoProc}>
                {guardandoProc ? 'Registrando...' : 'Guardar Procedimiento'}
              </Button>
            </div>
          </form>
        )}

        {consulta.procedimientos && consulta.procedimientos.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {consulta.procedimientos.map((p) => (
              <div
                key={p.id}
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--color-panel)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                  fontSize: '13px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ color: 'var(--color-strong)', fontSize: '14px' }}>{p.nombre}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    {new Date(p.fechaHora).toLocaleString()}
                  </span>
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Profesional: </span>
                  <span style={{ fontWeight: 600 }}>{p.profesionalNombre}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Resultado: </span>
                  <span>{p.resultado}</span>
                </div>
                {p.observaciones && (
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    <em>Observaciones: {p.observaciones}</em>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
            No se realizaron procedimientos invasivos o diagnósticos en esta consulta médica.
          </div>
        )}
      </Panel>)}

      {/* Historial de Revisiones Auditadas (CA10) */}
      <Panel
        title="Historial de Modificaciones y Revisiones Versionadas"
        subtitle="Consulta las versiones conservadas de esta atención."
      >
        <label>Versión de la atención <select aria-label="Versión de la atención" value={versionVista ?? ''} onChange={e => setVersionVista(e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">Actual (v{versionActual})</option>
          {Array.from({length: Math.max(0, versionActual - 1)}, (_, i) => <option key={i+1} value={i+1}>v{i+1}</option>)}
        </select></label>
        {consulta.historialRevisiones && consulta.historialRevisiones.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {consulta.historialRevisiones.map((rev, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  backgroundColor: 'var(--color-panel)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  fontSize: '13px'
                }}
              >
                <div
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: '#FFFFFF',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '12px',
                    flexShrink: 0
                  }}
                >
                  v{rev.revision}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: 'var(--color-strong)' }}>
                      Revisión versión {rev.revision} por {rev.autor}
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {new Date(rev.fechaHora).toLocaleString('es-GT', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </span>
                  </div>
                  <div style={{ marginTop: '6px', color: 'var(--color-strong)' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                      Motivo / Justificación obligatoria:
                    </span>{' '}
                    <em>«{rev.motivo}»</em>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--color-panel)',
              borderRadius: '8px',
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
              fontSize: '13px'
            }}
          >
            {versionActual > 1 ? 'Selecciona una versión para consultar su contenido histórico.' : 'Se conserva la versión inicial (v1).'}
          </div>
        )}
      </Panel>

      {/* Modales */}
      {showImprimirReceta && consulta.receta && (
        <ImprimirRecetaModal
          isOpen={showImprimirReceta}
          onClose={() => setShowImprimirReceta(false)}
          receta={consulta.receta}
          paciente={paciente}
          institucionNombre={sesion?.institucionNombre || 'Hospital General'}
        />
      )}

      {showModificarConsulta && (
        <ModificarConsultaModal
          isOpen={showModificarConsulta}
          onClose={() => setShowModificarConsulta(false)}
          consulta={consulta}
          onConsultaActualizada={handleConsultaActualizada}
        />
      )}
    </div>
  );
};
