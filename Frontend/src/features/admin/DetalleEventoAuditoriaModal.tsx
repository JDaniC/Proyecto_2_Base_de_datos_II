import { Modal } from '../../design-system/components/Modal';
import { getDisplayLabel } from '../../services/displayLabels';
import React from 'react';
import { FileText, ArrowRight } from 'lucide-react';
import { EventoAuditoria } from '../../services/types';
import { AUDIT_ACTION_LABELS, AUDIT_RESOURCE_LABELS, AUDIT_SEVERITY_LABELS } from './auditLabels';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';

interface DetalleEventoAuditoriaModalProps {
  evento: EventoAuditoria | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DetalleEventoAuditoriaModal: React.FC<DetalleEventoAuditoriaModalProps> = ({
  evento,
  isOpen,
  onClose
}) => {
  if (!isOpen || !evento) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalle de actividad"
      description={`${evento.id} · ${evento.correlacionId}`}
      maxWidth="680px"
      footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}
    >
      <Badge variant={evento.severidad === 'CRITICO' ? 'danger' : evento.severidad === 'ADVERTENCIA' ? 'warning' : 'info'} style={{ marginBottom: '16px' }}>
        {AUDIT_SEVERITY_LABELS[evento.severidad] || 'Información'}
      </Badge>
      <div style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Metadata Principal */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              backgroundColor: 'var(--color-background-alt)',
              padding: '14px',
              borderRadius: 'var(--radius-input)',
              fontSize: '13px'
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', fontWeight: 600 }}>
                FECHA Y HORA
              </span>
              <strong style={{ color: 'var(--color-strong)' }}>
                {new Date(evento.timestamp).toLocaleString('es-GT', { dateStyle: 'long', timeStyle: 'medium' })}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', fontWeight: 600 }}>
                ACCIÓN REGISTRADA
              </span>
              <strong style={{ color: 'var(--color-primary)' }}>{AUDIT_ACTION_LABELS[evento.accion] || 'Actividad'}</strong>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', fontWeight: 600 }}>
                ACTOR INSTITUCIONAL
              </span>
              <span style={{ fontWeight: 600, color: 'var(--color-strong)' }}>{evento.actor.nombre}</span>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                {getDisplayLabel(evento.actor.rol)} ({evento.actor.email})
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', fontWeight: 600 }}>
                ORIGEN DE CONEXIÓN
              </span>
              <span style={{ fontFamily: 'monospace', color: 'var(--color-strong)' }}>
                {evento.actor.ipOrigen || 'No registrada'}
              </span>
            </div>
          </div>

          {/* Recurso Afectado */}
          <div
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-input)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                Recurso Modificado / Accedido
              </span>
              <Badge variant="neutral">{AUDIT_RESOURCE_LABELS[evento.tipoRecurso] || 'Registro'}</Badge>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} color="var(--color-primary)" />
              <strong style={{ fontSize: '14px', color: 'var(--color-strong)' }}>{evento.recursoNombre}</strong>
              {evento.versionAfectada && (
                <Badge variant="info">{evento.versionAfectada}</Badge>
              )}
            </div>

            <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>
              Identificador de Recurso: {evento.recursoId}
            </span>
          </div>

          {/* Justificación / Motivo Obligatorio */}
          {evento.motivoJustificacion && (
            <div>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-strong)', marginBottom: '6px' }}>
                Motivo / Justificación Certificada
              </span>
              <div
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  borderLeft: '4px solid var(--color-primary)',
                  borderRadius: 'var(--radius-input)',
                  padding: '12px 14px',
                  fontSize: '13px',
                  color: 'var(--color-text)',
                  lineHeight: 1.5
                }}
              >
                {evento.motivoJustificacion}
              </div>
            </div>
          )}

          {/* Cambios Registrados (Diff) */}
          {evento.cambiosDetalle && evento.cambiosDetalle.length > 0 && (
            <div>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-strong)', marginBottom: '8px' }}>
                Detalle de Modificaciones Registradas
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {evento.cambiosDetalle.map((cambio, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: 'var(--color-background-alt)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-input)',
                      padding: '10px 14px',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}>
                      {cambio.campo.replaceAll('.', ' · ').replace(/([a-z])([A-Z])/g, '$1 $2')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          color: '#b91c1c',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontFamily: 'monospace'
                        }}
                      >
                        {cambio.valorAnterior !== null ? cambio.valorAnterior : '(ninguno)'}
                      </span>
                      <ArrowRight size={14} color="var(--color-text-secondary)" />
                      <span
                        style={{
                          backgroundColor: 'rgba(34, 197, 94, 0.1)',
                          color: '#15803d',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          fontWeight: 600
                        }}
                      >
                        {cambio.valorNuevo}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Garantía de Seguridad e Inmutabilidad */}
          <div
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 'var(--radius-input)',
              padding: '10px 14px',
              fontSize: '11px',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.4
            }}
          >
            Detalle de la actividad registrada en la institución.
          </div>
        </div>
    </Modal>
  );
};
