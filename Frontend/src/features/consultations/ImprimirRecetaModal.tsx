import React from 'react';
import { Printer, ShieldCheck, Pill } from 'lucide-react';
import { Modal } from '../../design-system/components/Modal';
import { Button } from '../../design-system/components/Button';
import { RecetaHistorial, Paciente } from '../../services/types';

interface ImprimirRecetaModalProps {
  isOpen: boolean;
  onClose: () => void;
  receta: RecetaHistorial | null;
  paciente: Paciente | null;
  institucionNombre: string;
}

export const ImprimirRecetaModal: React.FC<ImprimirRecetaModalProps> = ({
  isOpen,
  onClose,
  receta,
  paciente,
  institucionNombre
}) => {
  if (!receta || !paciente) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Receta Médica Oficial"
      maxWidth="680px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Vista para impresión con formato institucional */}
        <div
          id="receta-imprimible"
          style={{
            backgroundColor: '#FFFFFF',
            border: '2px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
            color: 'var(--color-strong)',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          {/* Cabecera institucional */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '2px solid var(--color-primary)',
              paddingBottom: '14px',
              marginBottom: '16px'
            }}
          >
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>
                {institucionNombre}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Sistema Integrado de Salud · Prescripción Farmacológica Certificada
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: 'var(--color-selection)',
                  color: 'var(--color-primary)',
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontFamily: 'monospace'
                }}
              >
                {receta.codigoReceta}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Emisión: {new Date(receta.fechaEmision).toLocaleDateString('es-GT', { dateStyle: 'long' })}
              </div>
            </div>
          </div>

          {/* Ficha del Paciente */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              backgroundColor: 'var(--color-panel)',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '20px'
            }}
          >
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>Paciente:</span>{' '}
              <strong>{paciente.nombres} {paciente.apellidos}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>Expediente:</span>{' '}
              <strong style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>{paciente.codigoLegible}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>Identificación:</span>{' '}
              <span>{paciente.tipoIdentificacion} {paciente.numeroIdentificacion}</span>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>Profesional Emisor:</span>{' '}
              <span>{receta.emitidaPor}</span>
            </div>
          </div>

          {/* Fármacos Prescritos (Rp) */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '16px',
                fontWeight: 800,
                color: 'var(--color-primary)',
                marginBottom: '12px'
              }}
            >
              <Pill size={18} />
              <span>Rp. (Prescripción Médica)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {receta.medicamentos.map((med, index) => (
                <div
                  key={index}
                  style={{
                    borderLeft: '3px solid var(--color-primary)',
                    paddingLeft: '12px',
                    fontSize: '13px',
                    lineHeight: 1.5
                  }}
                >
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-strong)' }}>
                    {index + 1}. {med.nombre} {med.concentracion} {med.presentacion ? `(${med.presentacion})` : ''}
                  </div>
                  <div style={{ color: 'var(--color-text)', marginTop: '2px' }}>
                    <strong>Dosis:</strong> {med.dosis} · <strong>Frecuencia:</strong> {med.frecuencia} · <strong>Duración:</strong> {med.duracion} ({med.via})
                  </div>
                  {med.indicaciones && (
                    <div style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', marginTop: '2px' }}>
                      Indicaciones: {med.indicaciones}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pie de Firma y Sello */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginTop: '40px',
              paddingTop: '20px',
              borderTop: '1px dashed var(--color-border)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              <ShieldCheck size={16} style={{ color: 'var(--color-success-text)' }} />
              <span>Documento clínico electrónico validado bajo protocolo institucional.</span>
            </div>

            <div style={{ textAlign: 'center', width: '220px' }}>
              <div style={{ borderBottom: '1px solid var(--color-strong)', height: '40px', marginBottom: '6px' }} />
              <div style={{ fontSize: '12px', fontWeight: 700 }}>{receta.emitidaPor}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{receta.rolEmisor}</div>
            </div>
          </div>
        </div>

        {/* Acciones del Modal */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button variant="primary" leftIcon={<Printer size={16} />} onClick={handlePrint}>
            Imprimir receta
          </Button>
        </div>
      </div>
    </Modal>
  );
};
