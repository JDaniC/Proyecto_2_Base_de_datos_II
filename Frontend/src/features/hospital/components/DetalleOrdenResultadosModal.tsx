import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  FlaskConical,
  Plus
} from 'lucide-react';
import { Modal } from '../../../design-system/components/Modal';
import { Button } from '../../../design-system/components/Button';
import { Badge } from '../../../design-system/components/Badge';
import { SkeletonLoader } from '../../../design-system/components/SkeletonLoader';
import { useServices } from '../../../app/ServiceContext';
import { useAuthSession } from '../../../app/AuthSessionContext';
import {
  OrdenExamenHospital,
  ResultadoExamenHospital,
  AlertaParametro
} from '../../../services/types';

interface DetalleOrdenResultadosModalProps {
  isOpen: boolean;
  onClose: () => void;
  orden: OrdenExamenHospital | null;
  onAbrirRegistrarResultado?: (orden: OrdenExamenHospital) => void;
}

export const DetalleOrdenResultadosModal: React.FC<DetalleOrdenResultadosModalProps> = ({
  isOpen,
  onClose,
  orden,
  onAbrirRegistrarResultado
}) => {
  const { sesion } = useAuthSession();
  const { examRepository } = useServices();
  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [loading, setLoading] = useState(true);
  const [resultados, setResultados] = useState<ResultadoExamenHospital[]>([]);

  const cargarResultados = useCallback(async () => {
    if (!orden) return;
    setLoading(true);
    try {
      const data = await examRepository.obtenerResultadosPorOrden(institucionId, orden.id);
      setResultados(data);
    } catch {
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }, [institucionId, orden, examRepository]);

  useEffect(() => {
    if (isOpen && orden) {
      cargarResultados();
    }
  }, [isOpen, orden, cargarResultados]);

  if (!orden) return null;

  const getAlertaBadge = (alerta: AlertaParametro) => {
    switch (alerta) {
      case 'NORMAL':
        return <Badge variant="success">Normal</Badge>;
      case 'ELEVADO':
        return <Badge variant="warning">Elevado</Badge>;
      case 'DISMINUIDO':
        return <Badge variant="warning">Disminuido</Badge>;
      case 'CRITICO':
        return <Badge variant="danger">Crítico</Badge>;
      default:
        return <Badge variant="neutral">{alerta}</Badge>;
    }
  };

  const getPrioridadBadge = (prioridad: string) => {
    switch (prioridad) {
      case 'STAT':
        return <Badge variant="danger">STAT (Inmediato)</Badge>;
      case 'URGENTE':
        return <Badge variant="warning">Urgente</Badge>;
      default:
        return <Badge variant="primary">Rutina</Badge>;
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Orden de Examen y Resultados (H06) — ${orden.codigoLegible}`}
      maxWidth="850px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Cabecera de la Orden Médica */}
        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--color-panel)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-panel)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
            fontSize: '13px'
          }}
        >
          <div>
            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Paciente:</span>
            <strong style={{ color: 'var(--color-strong)', fontSize: '15px' }}>{orden.pacienteNombre}</strong>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              DPI: {orden.pacienteDpi}
            </div>
          </div>

          <div>
            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Ubicación Hospitalaria:</span>
            <strong style={{ color: 'var(--color-strong)' }}>{orden.numeroCama || 'Consulta Externa'}</strong>
            {orden.hospitalizacionId && (
              <div style={{ fontSize: '11px', color: 'var(--color-primary)' }}>
                Internamiento Activo
              </div>
            )}
          </div>

          <div>
            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Prioridad y Estado:</span>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              {getPrioridadBadge(orden.prioridad)}
              {getEstadoBadge(orden.estado)}
            </div>
          </div>

          <div>
            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Médico Solicitante:</span>
            <strong style={{ color: 'var(--color-strong)' }}>{orden.medicoSolicitanteNombre}</strong>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Fecha: {new Date(orden.fechaSolicitud).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Motivo Clínico */}
        <div style={{ fontSize: '13px', padding: '0 4px' }}>
          <strong style={{ color: 'var(--color-strong)' }}>Motivo Clínico / Sospecha Diagnóstica:</strong>{' '}
          <span style={{ color: 'var(--color-text-secondary)' }}>{orden.motivoClinico}</span>
          {orden.diagnosticoPresuntivoCIE10 && (
            <div style={{ marginTop: '4px', fontSize: '12px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Diagnóstico presuntivo: </span>
              <Badge variant="neutral">{orden.diagnosticoPresuntivoCIE10}</Badge>
            </div>
          )}
        </div>

        {/* Desglose de Pruebas y Resultados Paramétricos */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
              Exámenes Solicitados y Resultados Analíticos
            </h3>
            {orden.items.some((it) => it.estado === 'PENDIENTE') && onAbrirRegistrarResultado && (
              <Button
                size="sm"
                variant="primary"
                leftIcon={<Plus size={14} />}
                onClick={() => {
                  onClose();
                  onAbrirRegistrarResultado(orden);
                }}
              >
                Registrar Resultados de Laboratorio
              </Button>
            )}
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <SkeletonLoader variant="rectangular" height="120px" />
              <SkeletonLoader variant="rectangular" height="120px" />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {orden.items.map((item) => {
                const resultado = resultados.find((r) => r.pruebaId === item.pruebaId);

                return (
                  <div
                    key={item.id}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-panel)',
                      overflow: 'hidden',
                      backgroundColor: 'var(--color-background)'
                    }}
                  >
                    {/* Encabezado del examen */}
                    <div
                      style={{
                        padding: '12px 16px',
                        backgroundColor: 'var(--color-panel)',
                        borderBottom: '1px solid var(--color-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FlaskConical size={16} color="var(--color-primary)" />
                          <strong style={{ fontSize: '14px', color: 'var(--color-strong)' }}>
                            {item.nombre}
                          </strong>
                          <Badge variant="neutral">{item.codigoPrueba}</Badge>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          Sección: {item.seccion}
                        </div>
                      </div>

                      <div>
                        {item.estado === 'COMPLETADO' ? (
                          <Badge variant="success">Resultado Validado</Badge>
                        ) : (
                          <Badge variant="warning">Pendiente de Procesar</Badge>
                        )}
                      </div>
                    </div>

                    {/* Contenido del resultado */}
                    {item.estado === 'COMPLETADO' && resultado ? (
                      <div style={{ padding: '16px' }}>
                        {/* Tabla de Parámetros */}
                        <div style={{ overflowX: 'auto', marginBottom: '14px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Parámetro Analítico</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Valor Medido</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Unidad</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Rango de Referencia</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'center' }}>Evaluación</th>
                              </tr>
                            </thead>
                            <tbody>
                              {resultado.parametros.map((p) => (
                                <tr key={p.parametroId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                  <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--color-strong)' }}>
                                    {p.nombre}
                                  </td>
                                  <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--color-strong)', fontFamily: 'monospace' }}>
                                    {p.valorMedido}
                                  </td>
                                  <td style={{ padding: '8px 10px', color: 'var(--color-text-secondary)' }}>
                                    {p.unidadMedida}
                                  </td>
                                  <td style={{ padding: '8px 10px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                                    {p.rangoReferencia}
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                    {getAlertaBadge(p.alerta)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Interpretación Clínica */}
                        <div
                          style={{
                            padding: '10px 14px',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 'var(--radius-field)',
                            fontSize: '13px',
                            marginBottom: '10px'
                          }}
                        >
                          <strong style={{ color: 'var(--color-strong)', display: 'block', marginBottom: '3px' }}>
                            Interpretación Clínica del Resultado:
                          </strong>
                          <span style={{ color: 'var(--color-text-secondary)' }}>
                            {resultado.interpretacionClinica}
                          </span>
                        </div>

                        {/* Firma y trazabilidad */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '12px',
                            color: 'var(--color-text-secondary)',
                            flexWrap: 'wrap',
                            gap: '8px'
                          }}
                        >
                          <span>
                            Validado por: <strong>{resultado.responsableAnalisis}</strong>
                            {resultado.colegiadoResponsable && ` (Colegiado ${resultado.colegiadoResponsable})`}
                          </span>
                          <span>
                            Fecha de emisión: {new Date(resultado.fechaEmision).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '24px',
                          textAlign: 'center',
                          color: 'var(--color-text-secondary)',
                          fontSize: '13px'
                        }}
                      >
                        <Clock size={24} style={{ margin: '0 auto 8px auto', display: 'block', opacity: 0.6 }} />
                        <div>Muestra en proceso analítico en el laboratorio institucional.</div>
                        <div style={{ fontSize: '11px', marginTop: '4px' }}>
                          Indicaciones de toma: {item.indicacionesMuestra || 'Muestra estándar'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
