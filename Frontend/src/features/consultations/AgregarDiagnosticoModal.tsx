import { getErrorMessage } from '../../services/errors';
import React, { useState } from 'react';
import { Stethoscope, Search, Check, AlertTriangle } from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Modal } from '../../design-system/components/Modal';
import { Button } from '../../design-system/components/Button';
import { CATALOGO_CIE10, CatalogoCIE10Item } from '../../services/clinicalCatalogs';
import { DiagnosticoHistorial } from '../../services/types';

interface AgregarDiagnosticoModalProps {
  isOpen: boolean;
  onClose: () => void;
  pacienteId: string;
  diagnosticosActuales: DiagnosticoHistorial[];
  onDiagnosticoAgregado: (nuevo: DiagnosticoHistorial) => void;
}

export const AgregarDiagnosticoModal: React.FC<AgregarDiagnosticoModalProps> = ({
  isOpen,
  onClose,
  pacienteId,
  diagnosticosActuales,
  onDiagnosticoAgregado
}) => {
  const { sesion } = useAuthSession();
  const { patientRepository } = useServices();

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState<CatalogoCIE10Item | null>(null);
  const [codigoPersonalizado, setCodigoPersonalizado] = useState('');
  const [nombrePersonalizado, setNombrePersonalizado] = useState('');
  const [esPrincipal, setEsPrincipal] = useState(diagnosticosActuales.length === 0);
  const [indicacionesTratamiento, setIndicacionesTratamiento] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const diagnosticoPrincipalActual = diagnosticosActuales.find((d) => d.esPrincipal);

  const resultados = CATALOGO_CIE10.filter(
    (c) =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.codigo.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleSeleccionar = (item: CatalogoCIE10Item) => {
    setSeleccionado(item);
    setCodigoPersonalizado(item.codigo);
    setNombrePersonalizado(item.nombre);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cod = (seleccionado ? seleccionado.codigo : codigoPersonalizado).trim();
    const nom = (seleccionado ? seleccionado.nombre : nombrePersonalizado).trim();

    if (!cod) {
      setError('El código CIE-10 es obligatorio.');
      return;
    }
    if (!nom || nom.length < 4) {
      setError('La descripción del diagnóstico debe contener al menos 4 caracteres.');
      return;
    }

    setGuardando(true);
    try {
      const registradoPor = sesion?.nombre || 'Dr. Médico Especialista';
      const nuevo = await patientRepository.agregarDiagnostico(institucionId, pacienteId, {
        codigoCIE: cod,
        nombre: nom,
        esPrincipal,
        registradoPor
      });

      setGuardando(false);
      onDiagnosticoAgregado(nuevo);
      onClose();
    } catch (err: any) {
      setGuardando(false);
      setError(getErrorMessage(err, 'Error al registrar el diagnóstico en el expediente.'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Diagnóstico Clínico Codificado"
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger-text)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-input)',
              fontSize: '13px',
              border: '1px solid var(--color-danger-border)'
            }}
          >
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Buscador de catálogo CIE-10 */}
        <div>
          <label
            htmlFor="cie10-search-input"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
          >
            Buscar en Catálogo Institucional CIE-10
          </label>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-secondary)'
              }}
            />
            <input
              id="cie10-search-input"
              type="text"
              placeholder="Escriba código (ej. I10, E11) o patología (ej. hipertensión)..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                backgroundColor: 'var(--color-control)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                fontSize: '14px',
                color: 'var(--color-text)'
              }}
            />
          </div>

          {busqueda.trim().length > 0 && (
            <div
              style={{
                marginTop: '6px',
                maxHeight: '160px',
                overflowY: 'auto',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
              }}
            >
              {resultados.length === 0 ? (
                <div style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  No se encontraron diagnósticos que coincidan con la búsqueda. Puede ingresar código manual abajo.
                </div>
              ) : (
                resultados.map((cie) => (
                  <div
                    key={cie.codigo}
                    onClick={() => handleSeleccionar(cie)}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--color-border-panel)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: seleccionado?.codigo === cie.codigo ? 'var(--color-selection)' : 'transparent',
                      transition: 'background-color var(--transition-fast)'
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--color-primary)', marginRight: '8px', fontFamily: 'monospace' }}>
                        {cie.codigo}
                      </strong>
                      <span style={{ fontSize: '13px', color: 'var(--color-strong)' }}>{cie.nombre}</span>
                    </div>
                    {seleccionado?.codigo === cie.codigo && <Check size={16} color="var(--color-primary)" />}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Campos de código y nombre seleccionados o manuales */}
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
          <div>
            <label
              htmlFor="codigo-cie-field"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
            >
              Código <span style={{ color: 'var(--color-danger-text)' }}>*</span>
            </label>
            <input
              id="codigo-cie-field"
              type="text"
              value={codigoPersonalizado}
              onChange={(e) => {
                setCodigoPersonalizado(e.target.value.toUpperCase());
                setSeleccionado(null);
              }}
              placeholder="CIE-10"
              style={{
                width: '100%',
                padding: '9px 12px',
                backgroundColor: 'var(--color-control)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: 'monospace'
              }}
            />
          </div>

          <div>
            <label
              htmlFor="nombre-cie-field"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
            >
              Descripción nosológica <span style={{ color: 'var(--color-danger-text)' }}>*</span>
            </label>
            <input
              id="nombre-cie-field"
              type="text"
              value={nombrePersonalizado}
              onChange={(e) => {
                setNombrePersonalizado(e.target.value);
                setSeleccionado(null);
              }}
              placeholder="Descripción nosológica del diagnóstico..."
              style={{
                width: '100%',
                padding: '9px 12px',
                backgroundColor: 'var(--color-control)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* Clasificación: Principal vs Secundario con regla estricta */}
        <div
          style={{
            backgroundColor: 'var(--color-panel)',
            padding: '14px',
            borderRadius: '8px',
            border: '1px solid var(--color-border)'
          }}
        >
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={esPrincipal}
              onChange={(e) => setEsPrincipal(e.target.checked)}
              style={{ marginTop: '3px', width: '16px', height: '16px' }}
            />
            <div>
              <strong style={{ fontSize: '13px', color: 'var(--color-strong)' }}>
                Designar como Diagnóstico Principal de este paciente
              </strong>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Normativa institucional: Todo expediente o atención exige exactamente un diagnóstico principal.
                {diagnosticoPrincipalActual && esPrincipal && (
                  <span style={{ color: 'var(--color-warning-text)', display: 'block', marginTop: '4px' }}>
                    Nota: Sustituirá a «{diagnosticoPrincipalActual.nombre}» como diagnóstico principal activo.
                  </span>
                )}
              </div>
            </div>
          </label>
        </div>

        {/* Tratamientos e indicaciones terapéuticas vinculadas */}
        <div>
          <label
            htmlFor="tratamiento-indicaciones-field"
            style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
          >
            Tratamiento o Pauta Terapéutica Vinculada (Opcional)
          </label>
          <textarea
            id="tratamiento-indicaciones-field"
            rows={2}
            value={indicacionesTratamiento}
            onChange={(e) => setIndicacionesTratamiento(e.target.value)}
            placeholder="Recomendaciones dietéticas, reposo, control de signos, fisioterapia..."
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: 'var(--color-control)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-input)',
              fontSize: '13px'
            }}
          />
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={guardando} leftIcon={<Stethoscope size={16} />}>
            Guardar Diagnóstico
          </Button>
        </div>
      </form>
    </Modal>
  );
};
