import React, { useState } from 'react';
import { AlertCircle, History, RefreshCw } from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Modal } from '../../design-system/components/Modal';
import { Button } from '../../design-system/components/Button';
import { DetalleConsultaCompleta } from '../../services/types';

interface ModificarConsultaModalProps {
  isOpen: boolean;
  onClose: () => void;
  consulta: DetalleConsultaCompleta | null;
  onConsultaActualizada: (actualizada: DetalleConsultaCompleta) => void;
}

export const ModificarConsultaModal: React.FC<ModificarConsultaModalProps> = ({
  isOpen,
  onClose,
  consulta,
  onConsultaActualizada
}) => {
  const { sesion } = useAuthSession();
  const { consultationRepository } = useServices();

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [motivo, setMotivo] = useState(consulta?.motivo || '');
  const [sintomas, setSintomas] = useState(consulta?.sintomas || '');
  const [observaciones, setObservaciones] = useState(consulta?.observaciones || '');
  const [motivoCorreccion, setMotivoCorreccion] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  if (!consulta) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    if (!motivo.trim() || motivo.trim().length < 4) {
      setErrorValidacion('El motivo de la consulta es obligatorio (mínimo 4 caracteres).');
      return;
    }

    if (!motivoCorreccion.trim() || motivoCorreccion.trim().length < 5) {
      setErrorValidacion(
        'El motivo obligatorio de rectificación es indispensable para generar la nueva versión (mínimo 5 caracteres).'
      );
      return;
    }

    setGuardando(true);

    try {
      const autor = `${sesion?.nombre || 'Dra. Elena Morales'} (${sesion?.rolEtiqueta || 'Médico Especialista'})`;
      const actualizada = await consultationRepository.actualizarConsultaFinalizada(
        institucionId,
        consulta.pacienteId,
        consulta.id,
        {
          motivo: motivo.trim(),
          sintomas: sintomas.trim(),
          observaciones: observaciones.trim()
        },
        motivoCorreccion.trim(),
        autor
      );

      setGuardando(false);
      onConsultaActualizada(actualizada);
      onClose();
    } catch (err: any) {
      setGuardando(false);
      setErrorValidacion(err.message || 'Error al actualizar la consulta clínica.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Rectificar Consulta Médica (Genera v${(consulta.revision || 1) + 1} — CA10)`}
      maxWidth="620px"
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

        {/* Advertencia normativa CA10 */}
        <div
          style={{
            backgroundColor: 'var(--color-selection)',
            border: '1px solid var(--color-primary)',
            borderRadius: 'var(--radius-input)',
            padding: '12px 16px',
            fontSize: '13px',
            color: 'var(--color-primary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '2px' }}>
            <History size={16} />
            Auditoría de Inmutabilidad Clínica (CA10)
          </div>
          <span>
            Esta consulta está en estado <strong>FINALIZADA</strong>. Toda rectificación incrementará la versión a{' '}
            <strong>v{(consulta.revision || 1) + 1}</strong> y registrará en la bitácora legal la fecha, el autor y la justificación escrita obligatoria, sin destruir el historial previo.
          </span>
        </div>

        {/* Motivo rectificado */}
        <div>
          <label
            htmlFor="rect-motivo-input"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
          >
            Motivo de consulta <span style={{ color: 'var(--color-danger-text)' }}>*</span>
          </label>
          <input
            id="rect-motivo-input"
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
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

        {/* Síntomas rectificados */}
        <div>
          <label
            htmlFor="rect-sintomas-input"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
          >
            Síntomas y evaluación clínica
          </label>
          <textarea
            id="rect-sintomas-input"
            rows={3}
            value={sintomas}
            onChange={(e) => setSintomas(e.target.value)}
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

        {/* Observaciones rectificadas */}
        <div>
          <label
            htmlFor="rect-obs-input"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
          >
            Observaciones clínicas del examen físico
          </label>
          <textarea
            id="rect-obs-input"
            rows={3}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
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

        {/* Justificación / Motivo obligatorio de la rectificación */}
        <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '14px' }}>
          <label
            htmlFor="rect-justificacion-input"
            style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--color-danger-text)', marginBottom: '6px' }}
          >
            Motivo obligatorio de la rectificación (CA10) <span style={{ color: 'var(--color-danger-text)' }}>*</span>
          </label>
          <textarea
            id="rect-justificacion-input"
            rows={3}
            value={motivoCorreccion}
            onChange={(e) => setMotivoCorreccion(e.target.value)}
            placeholder="Describa la justificación médica o administrativa que motiva esta enmienda en la consulta finalizada..."
            style={{
              width: '100%',
              backgroundColor: 'var(--color-input-bg)',
              border: '1px solid var(--color-danger-border)',
              borderRadius: 'var(--radius-input)',
              padding: '10px 14px',
              fontSize: '14px',
              color: 'var(--color-text)',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={guardando} leftIcon={<RefreshCw size={15} />}>
            Guardar nueva revisión (v{(consulta.revision || 1) + 1})
          </Button>
        </div>
      </form>
    </Modal>
  );
};
