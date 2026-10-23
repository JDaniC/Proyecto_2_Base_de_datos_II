import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { Modal } from '../../../design-system/components/Modal';
import { Button } from '../../../design-system/components/Button';
import { AseguradoraCatalogo, AfiliarPolizaDTO } from '../../../services/types';

interface AfiliarPolizaModalProps {
  isOpen: boolean;
  onClose: () => void;
  pacienteNombre: string;
  pacienteDpi: string;
  pacienteTelefono: string;
  aseguradoras: AseguradoraCatalogo[];
  onConfirm: (dto: AfiliarPolizaDTO) => Promise<void>;
}

export const AfiliarPolizaModal: React.FC<AfiliarPolizaModalProps> = ({
  isOpen,
  onClose,
  pacienteNombre,
  pacienteDpi,
  pacienteTelefono,
  aseguradoras,
  onConfirm
}) => {
  const [aseguradoraId, setAseguradoraId] = useState<string>('');
  const [planId, setPlanId] = useState<string>('');
  const [numeroPoliza, setNumeroPoliza] = useState('');
  const [numeroCertificado, setNumeroCertificado] = useState('');
  const [vigenciaDesde, setVigenciaDesde] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [vigenciaHasta, setVigenciaHasta] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [copagoConsulta, setCopagoConsulta] = useState('50');

  // Titular
  const [esTitular, setEsTitular] = useState(true);
  const [titularNombre, setTitularNombre] = useState(pacienteNombre);
  const [titularParentesco, setTitularParentesco] = useState<'TITULAR' | 'PADRE' | 'MADRE' | 'CONYUGE' | 'HIJO' | 'OTRO'>('TITULAR');
  const [titularDpi, setTitularDpi] = useState(pacienteDpi);
  const [titularTelefono, setTitularTelefono] = useState(pacienteTelefono);
  const [observaciones, setObservaciones] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (aseguradoras.length > 0 && !aseguradoraId) {
      setAseguradoraId(aseguradoras[0].id);
      if (aseguradoras[0].planes.length > 0) {
        setPlanId(aseguradoras[0].planes[0].id);
      }
    }
  }, [aseguradoras, aseguradoraId]);

  const aseguradoraActual = aseguradoras.find((a) => a.id === aseguradoraId);

  const handleAseguradoraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setAseguradoraId(id);
    const aseg = aseguradoras.find((a) => a.id === id);
    if (aseg && aseg.planes.length > 0) {
      setPlanId(aseg.planes[0].id);
    } else {
      setPlanId('');
    }
  };

  const handleEsTitularChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setEsTitular(checked);
    if (checked) {
      setTitularNombre(pacienteNombre);
      setTitularParentesco('TITULAR');
      setTitularDpi(pacienteDpi);
      setTitularTelefono(pacienteTelefono);
    } else {
      setTitularNombre('');
      setTitularParentesco('CONYUGE');
      setTitularDpi('');
      setTitularTelefono('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!numeroPoliza.trim()) {
      setError('Debe ingresar el número de póliza.');
      return;
    }
    if (!numeroCertificado.trim()) {
      setError('Debe ingresar el número de certificado.');
      return;
    }
    if (!titularNombre.trim() || !titularDpi.trim()) {
      setError('Debe completar los datos del titular de la póliza.');
      return;
    }

    setGuardando(true);
    try {
      await onConfirm({
        aseguradoraId,
        planId,
        numeroPoliza: numeroPoliza.trim(),
        numeroCertificado: numeroCertificado.trim(),
        vigenciaDesde,
        vigenciaHasta,
        copagoConsultaGTQ: parseFloat(copagoConsulta) || 50,
        titular: {
          nombreCompleto: titularNombre.trim(),
          parentesco: esTitular ? 'TITULAR' : titularParentesco,
          numeroIdentificacion: titularDpi.trim(),
          telefonoContacto: titularTelefono.trim()
        },
        observaciones: observaciones.trim() || undefined
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al afiliar la póliza');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Afiliar Póliza de Seguro Médico (H05)"
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: 'var(--radius-field)',
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

        {/* Aseguradora y Plan */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          <div>
            <label
              htmlFor="select-aseguradora-modal"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
            >
              Compañía Aseguradora *
            </label>
            <select
              id="select-aseguradora-modal"
              value={aseguradoraId}
              onChange={handleAseguradoraChange}
              required
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-field)',
                fontSize: '13px'
              }}
            >
              {aseguradoras.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} ({a.codigoAseguradora})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="select-plan-modal"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
            >
              Plan de Cobertura *
            </label>
            <select
              id="select-plan-modal"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-field)',
                fontSize: '13px'
              }}
            >
              {aseguradoraActual?.planes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombrePlan} — {p.porcentajeCobertura}% Cobertura
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Número de Póliza y Certificado */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          <div>
            <label
              htmlFor="input-numero-poliza"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
            >
              Número de Póliza *
            </label>
            <input
              id="input-numero-poliza"
              type="text"
              value={numeroPoliza}
              onChange={(e) => setNumeroPoliza(e.target.value)}
              placeholder="Ejemplo: POL-ROB-2026-9901"
              required
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-field)',
                fontSize: '13px'
              }}
            />
          </div>

          <div>
            <label
              htmlFor="input-numero-certificado"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
            >
              Certificado / Carné de Afiliado *
            </label>
            <input
              id="input-numero-certificado"
              type="text"
              value={numeroCertificado}
              onChange={(e) => setNumeroCertificado(e.target.value)}
              placeholder="Ejemplo: CERT-0452"
              required
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-field)',
                fontSize: '13px'
              }}
            />
          </div>
        </div>

        {/* Vigencia */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div>
            <label
              htmlFor="input-vigencia-desde"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
            >
              Vigencia Desde *
            </label>
            <input
              id="input-vigencia-desde"
              type="date"
              value={vigenciaDesde}
              onChange={(e) => setVigenciaDesde(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-field)',
                fontSize: '13px'
              }}
            />
          </div>

          <div>
            <label
              htmlFor="input-vigencia-hasta"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
            >
              Vigencia Hasta *
            </label>
            <input
              id="input-vigencia-hasta"
              type="date"
              value={vigenciaHasta}
              onChange={(e) => setVigenciaHasta(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-field)',
                fontSize: '13px'
              }}
            />
          </div>

          <div>
            <label
              htmlFor="input-copago-gtq"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
            >
              Copago Consulta (GTQ)
            </label>
            <input
              id="input-copago-gtq"
              type="number"
              value={copagoConsulta}
              onChange={(e) => setCopagoConsulta(e.target.value)}
              placeholder="50"
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-field)',
                fontSize: '13px'
              }}
            />
          </div>
        </div>

        {/* Titular de la Póliza */}
        <div
          style={{
            padding: '14px',
            backgroundColor: 'var(--color-background)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-field)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-strong)' }}>
              Titular del Seguro (Titular_Seguro)
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={esTitular}
                onChange={handleEsTitularChange}
              />
              <span>El paciente es el titular</span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            <div>
              <label
                htmlFor="input-titular-nombre"
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
              >
                Nombre Completo del Titular *
              </label>
              <input
                id="input-titular-nombre"
                type="text"
                value={titularNombre}
                onChange={(e) => setTitularNombre(e.target.value)}
                disabled={esTitular}
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-field)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label
                htmlFor="select-titular-parentesco"
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
              >
                Parentesco con Paciente *
              </label>
              <select
                id="select-titular-parentesco"
                value={titularParentesco}
                onChange={(e) => setTitularParentesco(e.target.value as any)}
                disabled={esTitular}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-field)',
                  fontSize: '13px'
                }}
              >
                <option value="TITULAR">Titular directo</option>
                <option value="CONYUGE">Cónyuge</option>
                <option value="PADRE">Padre</option>
                <option value="MADRE">Madre</option>
                <option value="HIJO">Hijo(a)</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="input-titular-dpi"
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
              >
                DPI / Identificación del Titular *
              </label>
              <input
                id="input-titular-dpi"
                type="text"
                value={titularDpi}
                onChange={(e) => setTitularDpi(e.target.value)}
                disabled={esTitular}
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-field)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label
                htmlFor="input-titular-tel"
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
              >
                Teléfono del Titular
              </label>
              <input
                id="input-titular-tel"
                type="text"
                value={titularTelefono}
                onChange={(e) => setTitularTelefono(e.target.value)}
                disabled={esTitular}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-field)',
                  fontSize: '13px'
                }}
              />
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="textarea-observaciones-poliza"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
          >
            Observaciones o Coberturas Adicionales (Opcional)
          </label>
          <input
            id="textarea-observaciones-poliza"
            type="text"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Ejemplo: Exclusiones de preexistencia, límites anuales o coaseguro especial..."
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-field)',
              fontSize: '13px'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <Button variant="secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={guardando}
            aria-label="Confirmar afiliación de póliza"
            leftIcon={<ShieldCheck size={16} />}
          >
            {guardando ? 'Afiliando...' : 'Afiliar y Guardar Póliza'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
