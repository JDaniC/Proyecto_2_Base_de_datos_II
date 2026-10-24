import { toClinicDateTimeInput, fromClinicDateTimeInput } from '../../services/dates';
import { getErrorMessage } from '../../services/errors';
import React, { useState, useEffect } from 'react';
import { AlertCircle, ArrowRightLeft } from 'lucide-react';
import { Modal } from '../../design-system/components/Modal';
import { Button } from '../../design-system/components/Button';
import { Badge } from '../../design-system/components/Badge';
import { HospitalizacionItem, CamaHospitalaria } from '../../services/types';

interface AsignarCamaModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitalizacion: HospitalizacionItem;
  camasDisponibles: CamaHospitalaria[];
  onConfirm: (nuevaCamaId: string, fechaInicio: string, motivo: string) => Promise<void>;
}

export const AsignarCamaModal: React.FC<AsignarCamaModalProps> = ({
  isOpen,
  onClose,
  hospitalizacion,
  camasDisponibles,
  onConfirm
}) => {
  const [nuevaCamaId, setNuevaCamaId] = useState<string>('');
  const [fechaInicio, setFechaInicio] = useState<string>(
    toClinicDateTimeInput()
  );
  const [motivo, setMotivo] = useState<string>('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtrar camas que estén disponibles
  const camasLibres = camasDisponibles.filter((c) => c.estado === 'DISPONIBLE');

  useEffect(() => {
    if (camasLibres.length > 0 && !nuevaCamaId) {
      setNuevaCamaId(camasLibres[0].id);
    }
  }, [camasLibres, nuevaCamaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nuevaCamaId) {
      setError('Debe seleccionar una cama destino disponible.');
      return;
    }
    if (!motivo.trim()) {
      setError('Debe indicar el motivo del traslado o asignación de cama.');
      return;
    }

    setGuardando(true);
    try {
      await onConfirm(nuevaCamaId, fromClinicDateTimeInput(fechaInicio), motivo.trim());
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error al asignar cama'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Asignar o Trasladar Cama Hospitalaria"
      maxWidth="560px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: 'var(--color-selection)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-input)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)' }}>
              {hospitalizacion.pacienteNombre}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
              {hospitalizacion.codigoIngreso} • Cama actual: {hospitalizacion.camaActual?.codigoCama || 'Ninguna'}
            </div>
          </div>
          <Badge variant="neutral">En curso</Badge>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: 'var(--radius-input)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Cama destino */}
        <div>
          <label
            htmlFor="cama-destino-select"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
          >
            Cama Destino (Disponibles en el hospital)
          </label>
          {camasLibres.length === 0 ? (
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: 'var(--radius-input)', fontSize: '13px' }}>
              No hay camas disponibles actualmente en la institución.
            </div>
          ) : (
            <select
              id="cama-destino-select"
              value={nuevaCamaId}
              onChange={(e) => setNuevaCamaId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                fontSize: '13px'
              }}
            >
              {camasLibres.map((cama) => (
                <option key={cama.id} value={cama.id}>
                  Cama {cama.codigoCama} — {cama.salaServicio} (Hab. {cama.numeroHabitacion}, Piso {cama.piso})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Fecha y Hora de Inicio del Traslado */}
        <div>
          <label
            htmlFor="fecha-inicio-traslado"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
          >
            Fecha y Hora de Ocupación de la Nueva Cama
          </label>
          <input
            id="fecha-inicio-traslado"
            type="datetime-local"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-input)',
              fontSize: '13px'
            }}
          />
          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'block' }}>
            La asignación actual finalizará cuando se confirme el traslado.
          </span>
        </div>

        {/* Motivo del Traslado */}
        <div>
          <label
            htmlFor="motivo-traslado-input"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
          >
            Causa o Justificación del Traslado
          </label>
          <textarea
            id="motivo-traslado-input"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej.: requiere cuidados intermedios o presenta mejoría clínica..."
            required
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-input)',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '8px',
            borderTop: '1px solid var(--color-divider)',
            paddingTop: '14px'
          }}
        >
          <Button variant="secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={guardando || camasLibres.length === 0}
            leftIcon={<ArrowRightLeft size={16} />}
          >
            {guardando ? 'Asignando...' : 'Confirmar Traslado'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
