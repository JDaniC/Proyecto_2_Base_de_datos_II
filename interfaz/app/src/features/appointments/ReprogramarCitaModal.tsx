import React, { useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Modal } from '../../design-system/components/Modal';
import { Button } from '../../design-system/components/Button';
import { CitaAgenda } from '../../services/types';
import { INTERVALOS_HORA_24H } from './CrearCitaModal';

interface ReprogramarCitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cita: CitaAgenda | null;
  onCitaReprogramada: (citaActualizada: CitaAgenda) => void;
}

export const ReprogramarCitaModal: React.FC<ReprogramarCitaModalProps> = ({
  isOpen,
  onClose,
  cita,
  onCitaReprogramada
}) => {
  const { sesion } = useAuthSession();
  const { appointmentRepository } = useServices();

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [nuevaFecha, setNuevaFecha] = useState(cita?.fecha || '2026-10-20');
  const [nuevaHora, setNuevaHora] = useState(cita?.horaInicio || '09:00');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  if (!cita) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    if (cita.estado !== 'PROGRAMADA') {
      setErrorValidacion('Solo las citas en estado PROGRAMADA pueden ser reprogramadas.');
      return;
    }

    if (!nuevaFecha) {
      setErrorValidacion('Debe seleccionar la nueva fecha para la cita.');
      return;
    }

    if (!nuevaHora) {
      setErrorValidacion('Debe seleccionar el nuevo horario.');
      return;
    }

    if (!motivo.trim() || motivo.trim().length < 4) {
      setErrorValidacion('El motivo de la reprogramación es obligatorio (mínimo 4 caracteres).');
      return;
    }

    if (nuevaFecha === cita.fecha && nuevaHora === cita.horaInicio) {
      setErrorValidacion('Debe seleccionar una fecha u horario distinto al actual para reprogramar.');
      return;
    }

    setGuardando(true);

    try {
      const citaActualizada = await appointmentRepository.reprogramar(
        institucionId,
        cita.id,
        nuevaFecha,
        nuevaHora,
        motivo.trim()
      );

      setGuardando(false);
      onCitaReprogramada(citaActualizada);
    } catch (err: any) {
      setGuardando(false);
      setErrorValidacion(err.message || 'Error al reprogramar la cita médica.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reprogramar Cita Médica (V09)"
      maxWidth="560px"
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
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorValidacion}</span>
          </div>
        )}

        {/* Resumen del Horario Actual */}
        <div
          style={{
            backgroundColor: 'var(--color-panel)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-input)',
            padding: '12px 16px',
            fontSize: '13px'
          }}
        >
          <div style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
            Horario programado actual:
          </div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-strong)' }}>
            {cita.fecha} · {cita.horaInicio} a {cita.horaFin} h
          </div>
          <div style={{ marginTop: '6px', color: 'var(--color-text)' }}>
            <strong>Paciente:</strong> {cita.pacienteNombre} ({cita.pacienteCodigo})
          </div>
          <div style={{ color: 'var(--color-text-secondary)' }}>
            <strong>Profesional:</strong> {cita.profesionalNombre}
          </div>
        </div>

        {/* Nuevos datos de fecha y hora */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label
              htmlFor="reprogramar-fecha-input"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-strong)',
                marginBottom: '6px'
              }}
            >
              Nueva fecha <span style={{ color: 'var(--color-danger-text)' }}>*</span>
            </label>
            <input
              id="reprogramar-fecha-input"
              type="date"
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--color-input-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                padding: '10px 14px',
                fontSize: '14px',
                color: 'var(--color-text)'
              }}
            />
          </div>

          <div>
            <label
              htmlFor="reprogramar-hora-select"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-strong)',
                marginBottom: '6px'
              }}
            >
              Nueva hora (24 h, 15 min) <span style={{ color: 'var(--color-danger-text)' }}>*</span>
            </label>
            <select
              id="reprogramar-hora-select"
              value={nuevaHora}
              onChange={(e) => setNuevaHora(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--color-input-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                padding: '10px 14px',
                fontSize: '14px',
                color: 'var(--color-text)',
                cursor: 'pointer'
              }}
            >
              {INTERVALOS_HORA_24H.map((hora) => (
                <option key={hora} value={hora}>
                  {hora} h
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Motivo obligatorio de reprogramación */}
        <div>
          <label
            htmlFor="reprogramar-motivo-input"
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-strong)',
              marginBottom: '6px'
            }}
          >
            Motivo de reprogramación <span style={{ color: 'var(--color-danger-text)' }}>*</span>
          </label>
          <textarea
            id="reprogramar-motivo-input"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Indique la causa o solicitud médica/administrativa de la reprogramación..."
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
            variant="primary"
            loading={guardando}
            leftIcon={<RefreshCw size={16} />}
          >
            Guardar reprogramación
          </Button>
        </div>
      </form>
    </Modal>
  );
};
