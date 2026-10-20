import React, { useState } from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Modal } from '../../design-system/components/Modal';
import { Button } from '../../design-system/components/Button';
import { CitaAgenda } from '../../services/types';

interface CancelarCitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cita: CitaAgenda | null;
  onCitaCancelada: (citaActualizada: CitaAgenda) => void;
}

export const CancelarCitaModal: React.FC<CancelarCitaModalProps> = ({
  isOpen,
  onClose,
  cita,
  onCitaCancelada
}) => {
  const { sesion } = useAuthSession();
  const { appointmentRepository } = useServices();

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  if (!cita) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    if (cita.estado !== 'PROGRAMADA') {
      setErrorValidacion('Solo las citas en estado PROGRAMADA pueden ser canceladas.');
      return;
    }

    if (!motivoCancelacion.trim() || motivoCancelacion.trim().length < 5) {
      setErrorValidacion('El motivo de cancelación es estrictamente obligatorio (mínimo 5 caracteres).');
      return;
    }

    setGuardando(true);

    try {
      const citaActualizada = await appointmentRepository.cancelar(
        institucionId,
        cita.id,
        motivoCancelacion.trim()
      );

      setGuardando(false);
      onCitaCancelada(citaActualizada);
    } catch (err: any) {
      setGuardando(false);
      setErrorValidacion(err.message || 'Error al cancelar la cita.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancelar Cita Médica (V09)"
      maxWidth="520px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {errorValidacion && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger-text)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-input)',
              fontSize: '13px',
              border: '1px solid var(--color-danger-border)'
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{errorValidacion}</span>
          </div>
        )}

        <div
          style={{
            backgroundColor: '#FFF5F5',
            border: '1px solid #FED7D7',
            borderRadius: 'var(--radius-input)',
            padding: '12px 16px',
            fontSize: '13px',
            color: '#9B2C2C'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '4px' }}>
            <AlertTriangle size={16} />
            Confirmación de cancelación clínica
          </div>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.4 }}>
            Esta acción transicionará la cita al estado <strong>CANCELADA</strong> y liberará el bloque del consultorio. Según la normativa institucional, todo registro cancelado requiere justificación obligatoria.
          </p>
        </div>

        {/* Resumen de la cita */}
        <div
          style={{
            backgroundColor: 'var(--color-panel)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-input)',
            padding: '12px 16px',
            fontSize: '13px'
          }}
        >
          <div>
            <strong>Paciente:</strong> {cita.pacienteNombre} ({cita.pacienteCodigo})
          </div>
          <div>
            <strong>Profesional:</strong> {cita.profesionalNombre}
          </div>
          <div>
            <strong>Horario:</strong> {cita.fecha} · {cita.horaInicio} a {cita.horaFin} h
          </div>
        </div>

        {/* Motivo obligatorio */}
        <div>
          <label
            htmlFor="cancelar-motivo-input"
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-strong)',
              marginBottom: '6px'
            }}
          >
            Motivo de cancelación (obligatorio) <span style={{ color: 'var(--color-danger-text)' }}>*</span>
          </label>
          <textarea
            id="cancelar-motivo-input"
            rows={3}
            value={motivoCancelacion}
            onChange={(e) => setMotivoCancelacion(e.target.value)}
            placeholder="Especifique el motivo clínico o administrativo de la cancelación..."
            style={{
              width: '100%',
              backgroundColor: 'var(--color-input-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-input)',
              padding: '10px 14px',
              fontSize: '14px',
              color: 'var(--color-text)',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Acciones */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '12px'
          }}
        >
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={guardando}
          >
            Volver
          </Button>
          <Button
            type="submit"
            variant="danger"
            loading={guardando}
            leftIcon={<XCircle size={16} />}
          >
            Confirmar cancelación
          </Button>
        </div>
      </form>
    </Modal>
  );
};
