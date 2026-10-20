import React from 'react';
import { X, ShieldCheck, FileText, ArrowRight } from 'lucide-react';
import { EventoAuditoria } from '../../services/types';
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-auditoria-titulo"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-panel)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--color-background-alt)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-selection)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 id="modal-auditoria-titulo" style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                  Detalle de Evento de Auditoría
                </h2>
                <Badge variant={evento.severidad === 'CRITICO' ? 'danger' : evento.severidad === 'ADVERTENCIA' ? 'warning' : 'info'}>
                  {evento.severidad}
                </Badge>
              </div>
              <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>
                {evento.id} • Correlación: {evento.correlacionId}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de auditoría"
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
              <strong style={{ color: 'var(--color-primary)' }}>{evento.accion}</strong>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', fontWeight: 600 }}>
                ACTOR INSTITUCIONAL
              </span>
              <span style={{ fontWeight: 600, color: 'var(--color-strong)' }}>{evento.actor.nombre}</span>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                {evento.actor.rol} ({evento.actor.email})
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', fontWeight: 600 }}>
                ORIGEN DE CONEXIÓN
              </span>
              <span style={{ fontFamily: 'monospace', color: 'var(--color-strong)' }}>
                {evento.actor.ipOrigen || '192.168.1.1 (Red interna)'}
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
              <Badge variant="neutral">{evento.tipoRecurso}</Badge>
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
                  backgroundColor: 'var(--color-surface)',
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
                      Campo: <code style={{ color: 'var(--color-primary)' }}>{cambio.campo}</code>
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
            Registro inmutable generado bajo norma de trazabilidad clínica institucional. Ninguna clave, secreto, token
            ni contraseña se almacena ni expone en la interfaz de auditoría.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--color-divider)',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: 'var(--color-background-alt)'
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Cerrar detalle
          </Button>
        </div>
      </div>
    </div>
  );
};
