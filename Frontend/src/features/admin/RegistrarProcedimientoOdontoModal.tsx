import React, { useState } from 'react';
import { X, PlusCircle, Stethoscope, AlertCircle } from 'lucide-react';
import { useServices } from '../../app/ServiceContext';
import { useAuthSession } from '../../app/AuthSessionContext';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { ProcedimientoOdontologico } from '../../services/types';

interface RegistrarProcedimientoOdontoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcedimientoCreado: (proc: ProcedimientoOdontologico) => void;
}

const CATEGORIAS: Array<ProcedimientoOdontologico['categoria']> = [
  'PREVENTIVA',
  'RESTAURADORA',
  'ENDODONCIA',
  'CIRUGIA',
  'PERIODONCIA'
];

export const RegistrarProcedimientoOdontoModal: React.FC<RegistrarProcedimientoOdontoModalProps> = ({
  isOpen,
  onClose,
  onProcedimientoCreado
}) => {
  const { catalogRepository } = useServices();
  const { sesion } = useAuthSession();
  const institucionId = sesion?.institucionId || 'CLINICA_ODONTOLOGICA';

  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState<ProcedimientoOdontologico['categoria']>('RESTAURADORA');
  const [duracionMin, setDuracionMin] = useState('30');
  const [arancelGTQ, setArancelGTQ] = useState('350');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!codigo.trim()) {
      setError('El código del procedimiento es obligatorio (ej. ODON-06).');
      return;
    }

    if (!nombre.trim()) {
      setError('El nombre del procedimiento odontológico es obligatorio.');
      return;
    }

    const duracion = parseInt(duracionMin, 10);
    if (isNaN(duracion) || duracion <= 0) {
      setError('La duración estimada en sillón debe ser un número entero positivo de minutos.');
      return;
    }

    const arancel = parseFloat(arancelGTQ);
    if (isNaN(arancel) || arancel < 0) {
      setError('El arancel referencial debe ser un valor numérico válido en Quetzales.');
      return;
    }

    setGuardando(true);
    try {
      const nuevo = await catalogRepository.crearProcedimientoOdontologico(institucionId, {
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        categoria,
        duracionEstimadaMin: duracion,
        arancelReferencialGTQ: arancel,
        estado: 'ACTIVO'
      });

      onProcedimientoCreado(nuevo);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar el procedimiento odontológico.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-odonto-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface, #ffffff)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--color-border)'
        }}
      >
        {/* Cabecera del modal */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-divider)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-selection)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Stethoscope size={20} />
            </div>
            <div>
              <h3 id="modal-odonto-title" style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                Nuevo Procedimiento Odontológico (C05)
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Catálogo institucional de intervenciones y aranceles estomatológicos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              padding: '4px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {error && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                marginBottom: '16px',
                color: 'var(--color-danger, #ef4444)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
              <div>
                <label
                  htmlFor="proc-codigo"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
                >
                  Código Nosológico *
                </label>
                <Input
                  id="proc-codigo"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Ej. ODON-06"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="proc-categoria"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
                >
                  Categoría Clínica *
                </label>
                <select
                  id="proc-categoria"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as ProcedimientoOdontologico['categoria'])}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-input-bg)',
                    fontSize: '13px',
                    color: 'var(--color-strong)'
                  }}
                >
                  {CATEGORIAS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="proc-nombre"
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
              >
                Nombre del Procedimiento *
              </label>
              <Input
                id="proc-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Pulpotomía cameral con óxido de zinc y eugenol"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label
                  htmlFor="proc-duracion"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
                >
                  Duración Sillón (minutos) *
                </label>
                <Input
                  id="proc-duracion"
                  type="number"
                  min="5"
                  step="5"
                  value={duracionMin}
                  onChange={(e) => setDuracionMin(e.target.value)}
                  placeholder="Ej. 45"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="proc-arancel"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
                >
                  Arancel Referencial (Q) *
                </label>
                <Input
                  id="proc-arancel"
                  type="number"
                  min="0"
                  step="0.01"
                  value={arancelGTQ}
                  onChange={(e) => setArancelGTQ(e.target.value)}
                  placeholder="Ej. 350.00"
                  required
                />
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              borderTop: '1px solid var(--color-divider)',
              paddingTop: '16px'
            }}
          >
            <Button variant="secondary" type="button" onClick={onClose} disabled={guardando}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={guardando} leftIcon={<PlusCircle size={16} />}>
              {guardando ? 'Guardando...' : 'Registrar Procedimiento'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
