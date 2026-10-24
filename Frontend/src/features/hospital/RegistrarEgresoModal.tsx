import { toClinicDateTimeInput, fromClinicDateTimeInput } from '../../services/dates';
import { getErrorMessage } from '../../services/errors';
import React, { useState } from 'react';
import { LogOut, AlertCircle } from 'lucide-react';
import { Modal } from '../../design-system/components/Modal';
import { Button } from '../../design-system/components/Button';
import { Badge } from '../../design-system/components/Badge';
import { CATALOGO_CIE10 } from '../../services/clinicalCatalogs';
import { RegistrarEgresoHospitalarioDTO, HospitalizacionItem } from '../../services/types';

interface RegistrarEgresoModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitalizacion: HospitalizacionItem;
  onConfirm: (dto: RegistrarEgresoHospitalarioDTO) => Promise<void>;
}

export const RegistrarEgresoModal: React.FC<RegistrarEgresoModalProps> = ({
  isOpen,
  onClose,
  hospitalizacion,
  onConfirm
}) => {
  const [fechaEgreso, setFechaEgreso] = useState<string>(
    toClinicDateTimeInput()
  );
  const [tipoEgreso, setTipoEgreso] = useState<'ALTA_MEDICA' | 'TRASLADO' | 'VOLUNTARIA' | 'FALLECIMIENTO'>('ALTA_MEDICA');
  const [cieCodigo, setCieCodigo] = useState<string>(hospitalizacion.diagnosticoIngresoCIE);
  const [cieNombre, setCieNombre] = useState<string>(hospitalizacion.diagnosticoIngresoNombre);
  const [resumenClinico, setResumenClinico] = useState<string>('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCieSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cod = e.target.value;
    const encontrado = CATALOGO_CIE10.find((c) => c.codigo === cod);
    if (encontrado) {
      setCieCodigo(encontrado.codigo);
      setCieNombre(encontrado.nombre);
    } else {
      setCieCodigo(cod);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!resumenClinico.trim()) {
      setError('Debe ingresar un resumen clínico detallado del egreso.');
      return;
    }
    if (!cieCodigo.trim() || !cieNombre.trim()) {
      setError('Debe especificar el diagnóstico nosológico de egreso.');
      return;
    }

    setGuardando(true);
    try {
      await onConfirm({
        fechaEgreso: fromClinicDateTimeInput(fechaEgreso),
        tipoEgreso,
        diagnosticoEgresoCIE: cieCodigo.trim(),
        diagnosticoEgresoNombre: cieNombre.trim(),
        resumenClinico: resumenClinico.trim()
      });
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error al registrar egreso hospitalario'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Egreso Hospitalario"
      maxWidth="600px"
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
              {hospitalizacion.codigoIngreso} • Cama {hospitalizacion.camaActual?.codigoCama || 'Sin cama'}
            </div>
          </div>
          <Badge variant="primary">Liberará Cama {hospitalizacion.camaActual?.codigoCama}</Badge>
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

        {/* Fecha y Hora de Egreso */}
        <div>
          <label
            htmlFor="fecha-egreso-input"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
          >
            Fecha y Hora de Egreso
          </label>
          <input
            id="fecha-egreso-input"
            type="datetime-local"
            value={fechaEgreso}
            onChange={(e) => setFechaEgreso(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-input)',
              fontSize: '13px'
            }}
          />
        </div>

        {/* Tipo de Egreso */}
        <div>
          <label
            htmlFor="tipo-egreso-select"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
          >
            Causa o Modalidad de Egreso
          </label>
          <select
            id="tipo-egreso-select"
            value={tipoEgreso}
            onChange={(e) => setTipoEgreso(e.target.value as any)}
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-input)',
              fontSize: '13px'
            }}
          >
            <option value="ALTA_MEDICA">Alta médica definitiva (Resolución clínica)</option>
            <option value="TRASLADO">Traslado a otra institución hospitalaria</option>
            <option value="VOLUNTARIA">Alta voluntaria contra indicación médica</option>
            <option value="FALLECIMIENTO">Defunción intrahospitalaria</option>
          </select>
        </div>

        {/* Diagnóstico de Egreso CIE-10 */}
        <div>
          <label
            htmlFor="cie-egreso-select"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
          >
            Diagnóstico de Egreso (CIE-10)
          </label>
          <select
            id="cie-egreso-select"
            value={cieCodigo}
            onChange={handleCieSelect}
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-input)',
              fontSize: '13px',
              marginBottom: '8px'
            }}
          >
            {CATALOGO_CIE10.map((c) => (
              <option key={c.codigo} value={c.codigo}>
                {c.codigo} — {c.nombre}
              </option>
            ))}
          </select>

          <input
            id="diagnostico-egreso-nombre"
            type="text"
            value={cieNombre}
            onChange={(e) => setCieNombre(e.target.value)}
            placeholder="Descripción detallada del diagnóstico de alta..."
            required
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-input)',
              fontSize: '13px'
            }}
          />
        </div>

        {/* Resumen Clínico */}
        <div>
          <label
            htmlFor="resumen-clinico-textarea"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
          >
            Resumen Clínico de Estancia y Plan Ambulatorio
          </label>
          <textarea
            id="resumen-clinico-textarea"
            rows={4}
            value={resumenClinico}
            onChange={(e) => setResumenClinico(e.target.value)}
            placeholder="Detallar evolución intrahospitalaria, respuesta a fármacos, indicaciones al alta y citas de seguimiento..."
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
            disabled={guardando}
            leftIcon={<LogOut size={16} />}
          >
            {guardando ? 'Guardando...' : 'Confirmar Egreso y Liberar Cama'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
