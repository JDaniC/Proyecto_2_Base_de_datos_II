import React, { useState } from 'react';
import { Archive, RefreshCw } from 'lucide-react';
import { Paciente, CausaArchivo } from '../../../services/types';
import { Modal } from '../../../design-system/components/Modal';
import { Button } from '../../../design-system/components/Button';
import { Select } from '../../../design-system/components/Select';
import { Alert } from '../../../design-system/components/Alert';

export interface ArchivePatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  paciente: Paciente;
  onConfirmArchivar: (causa: CausaArchivo, motivo: string) => Promise<void>;
  onConfirmReactivar: (motivo: string, correccionFallecimiento?: boolean) => Promise<void>;
}

export const ArchivePatientModal: React.FC<ArchivePatientModalProps> = ({
  isOpen,
  onClose,
  paciente,
  onConfirmArchivar,
  onConfirmReactivar
}) => {
  const isArchived = paciente.estado === 'ARCHIVADO';
  const fueFallecimiento = paciente.causaArchivo === 'FALLECIMIENTO';

  const [causa, setCausa] = useState<CausaArchivo>('TRASLADO');
  const [motivo, setMotivo] = useState('');
  const [confirmaCorreccionFallecimiento, setConfirmaCorreccionFallecimiento] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    if (!motivo.trim()) {
      setErrorValidacion('El motivo o justificación de la acción es estrictamente obligatorio.');
      return;
    }

    if (isArchived && fueFallecimiento && !confirmaCorreccionFallecimiento) {
      setErrorValidacion(
        'Debe confirmar explícitamente que se trata de una corrección por baja administrativa errónea de defunción.'
      );
      return;
    }

    setProcesando(true);
    try {
      if (isArchived) {
        await onConfirmReactivar(motivo.trim(), fueFallecimiento ? confirmaCorreccionFallecimiento : undefined);
      } else {
        await onConfirmArchivar(causa, motivo.trim());
      }
      onClose();
    } catch (err) {
      setErrorValidacion(err instanceof Error ? err.message : 'Error al procesar la solicitud.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isArchived ? 'Reactivación de Expediente Clínico (V14)' : 'Archivo de Expediente Clínico (V14)'}
      maxWidth="560px"
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Alerta de advertencia institucional */}
          <Alert
            variant={isArchived ? 'warning' : 'danger'}
            title={isArchived ? 'Reactivar atención clínica' : 'Acción administrativa restrictiva'}
          >
            {isArchived ? (
              fueFallecimiento ? (
                <span>
                  <strong>Atención prioritaria:</strong> Este expediente fue archivado con causa de{' '}
                  <strong>FALLECIMIENTO</strong>. Para reactivarlo se requiere justificación y
                  confirmación explícita de rectificación de baja errónea.
                </span>
              ) : (
                <span>
                  Al reactivar el expediente «<strong>{paciente.codigoLegible}</strong>», el paciente
                  volverá al estado <strong>ACTIVO</strong> y se podrán agendar citas y registrar
                  atenciones clínicas.
                </span>
              )
            ) : (
              <span>
                Al archivar el expediente «<strong>{paciente.codigoLegible}</strong>», se bloqueará la
                apertura de nuevas consultas y citas. Toda la información histórica permanecerá
                inalterable para fines legales y de auditoría.
              </span>
            )}
          </Alert>

          {errorValidacion && (
            <Alert variant="danger" title="Validación">
              {errorValidacion}
            </Alert>
          )}

          {/* Formulario Archivar */}
          {!isArchived && (
            <div>
              <Select
                label="Causa del archivo de expediente *"
                value={causa}
                onChange={(e) => setCausa(e.target.value as CausaArchivo)}
                options={[
                  { value: 'TRASLADO', label: 'Traslado a otra institución médica' },
                  { value: 'FALLECIMIENTO', label: 'Fallecimiento del paciente' },
                  { value: 'OTRA_ADMINISTRATIVA', label: 'Otra causa administrativa justificada' }
                ]}
              />
            </div>
          )}

          {/* Formulario Reactivar por defunción */}
          {isArchived && fueFallecimiento && (
            <div
              style={{
                backgroundColor: 'var(--color-panel)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-input)',
                border: '1px solid var(--color-border-panel)'
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-strong)',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={confirmaCorreccionFallecimiento}
                  onChange={(e) => setConfirmaCorreccionFallecimiento(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
                />
                Confirmo rectificación por registro erróneo de defunción
              </label>
            </div>
          )}

          {/* Campo de Motivo */}
          <div>
            <label
              htmlFor="motivo-archivo"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-strong)',
                marginBottom: '6px'
              }}
            >
              {isArchived
                ? 'Motivo o resolución de reactivación *'
                : 'Motivo y observaciones del archivo *'}
            </label>
            <textarea
              id="motivo-archivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={
                isArchived
                  ? 'Describa el motivo médico o administrativo por el cual se reactiva el expediente...'
                  : 'Describa detalladamente el motivo del archivo y los documentos de respaldo...'
              }
              rows={4}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-input)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-input-bg)',
                fontSize: '13px',
                lineHeight: 1.5,
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Acciones */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '24px'
          }}
        >
          <Button type="button" variant="secondary" onClick={onClose} disabled={procesando}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant={isArchived ? 'primary' : 'danger'}
            leftIcon={isArchived ? <RefreshCw size={16} /> : <Archive size={16} />}
            disabled={procesando}
          >
            {procesando
              ? 'Procesando...'
              : isArchived
              ? 'Confirmar reactivación'
              : 'Confirmar archivo de expediente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
