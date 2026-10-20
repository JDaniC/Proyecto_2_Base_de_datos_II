import React, { useState } from 'react';
import { Pill, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Modal } from '../../design-system/components/Modal';
import { Button } from '../../design-system/components/Button';
import { MEDICAMENTOS_SUGERIDOS, CatalogoMedicamentoItem } from '../../services/clinicalCatalogs';
import { RecetaHistorial, RecetaMedicamentoItem } from '../../services/types';

interface EmitirRecetaModalProps {
  isOpen: boolean;
  onClose: () => void;
  pacienteId: string;
  onRecetaEmitida: (nueva: RecetaHistorial) => void;
}

export const EmitirRecetaModal: React.FC<EmitirRecetaModalProps> = ({
  isOpen,
  onClose,
  pacienteId,
  onRecetaEmitida
}) => {
  const { sesion } = useAuthSession();
  const { patientRepository } = useServices();

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [medicamentos, setMedicamentos] = useState<RecetaMedicamentoItem[]>([
    {
      nombre: '',
      presentacion: 'Tableta',
      dosis: '',
      frecuencia: 'Cada 8 horas',
      duracion: '5 días',
      via: 'Oral',
      indicaciones: 'Tomar después de los alimentos.'
    }
  ]);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agregarMedicamento = () => {
    setMedicamentos((prev) => [
      ...prev,
      {
        nombre: '',
        presentacion: 'Tableta',
        dosis: '',
        frecuencia: 'Cada 8 horas',
        duracion: '5 días',
        via: 'Oral',
        indicaciones: 'Tomar según prescripción médica.'
      }
    ]);
  };

  const eliminarMedicamento = (index: number) => {
    if (medicamentos.length <= 1) return;
    setMedicamentos((prev) => prev.filter((_, i) => i !== index));
  };

  const actualizarMedicamento = (index: number, campo: keyof RecetaMedicamentoItem, valor: string) => {
    setMedicamentos((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [campo]: valor } : m))
    );
  };

  const aplicarSugerido = (index: number, item: CatalogoMedicamentoItem) => {
    setMedicamentos((prev) =>
      prev.map((m, i) =>
        i === index
          ? {
              ...m,
              nombre: item.nombre,
              presentacion: item.presentacion,
              dosis: item.concentracion,
              via: item.via,
              frecuencia: item.frecuencia,
              duracion: item.duracion
            }
          : m
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validación de al menos 1 medicamento completo
    if (medicamentos.length === 0) {
      setError('Debe incluir al menos un fármaco en la prescripción médica.');
      return;
    }

    for (let i = 0; i < medicamentos.length; i++) {
      const m = medicamentos[i];
      if (!m.nombre.trim() || m.nombre.trim().length < 3) {
        setError(`El fármaco #${i + 1} requiere un nombre válido (mínimo 3 caracteres).`);
        return;
      }
      if (!m.dosis.trim()) {
        setError(`Especifique la dosis para el fármaco #${i + 1} (${m.nombre}).`);
        return;
      }
    }

    setGuardando(true);
    try {
      const emitidaPor = sesion?.nombre || 'Dr. Médico Especialista';
      const rolEmisor = sesion?.rolEtiqueta || 'Médico Tratante';

      const nuevaReceta = await patientRepository.emitirReceta(institucionId, pacienteId, {
        emitidaPor,
        rolEmisor,
        medicamentos
      });

      setGuardando(false);
      onRecetaEmitida(nuevaReceta);
      onClose();
    } catch (err: any) {
      setGuardando(false);
      setError(err.message || 'Error al emitir la receta médica oficial.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Emitir Receta Médica Oficial (V13)"
      maxWidth="720px"
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

        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Prescripción médica estructurada con certificación institucional. Los medicamentos prescritos
          quedarán guardados de forma inmutable con trazabilidad auditable.
        </div>

        {/* Lista de medicamentos dinámicos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '440px', overflowY: 'auto', paddingRight: '4px' }}>
          {medicamentos.map((med, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: 'var(--color-panel)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  Fármaco #{idx + 1}
                </span>
                {medicamentos.length > 1 && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => eliminarMedicamento(idx)}
                    leftIcon={<Trash2 size={13} />}
                  >
                    Eliminar
                  </Button>
                )}
              </div>

              {/* Botones de sugerencias rápidas */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  Sugeridos:
                </span>
                {MEDICAMENTOS_SUGERIDOS.slice(0, 4).map((sug) => (
                  <button
                    key={sug.nombre}
                    type="button"
                    onClick={() => aplicarSugerido(idx, sug)}
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: 'var(--color-text)'
                    }}
                  >
                    + {sug.nombre}
                  </button>
                ))}
              </div>

              {/* Grid de campos del medicamento */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Nombre del Medicamento *
                  </label>
                  <input
                    type="text"
                    value={med.nombre}
                    onChange={(e) => actualizarMedicamento(idx, 'nombre', e.target.value)}
                    placeholder="ej. Losartán Potásico"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: 'var(--color-input-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-input)',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Presentación
                  </label>
                  <input
                    type="text"
                    value={med.presentacion}
                    onChange={(e) => actualizarMedicamento(idx, 'presentacion', e.target.value)}
                    placeholder="Tableta, Jarabe..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: 'var(--color-input-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-input)',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Dosis *
                  </label>
                  <input
                    type="text"
                    value={med.dosis}
                    onChange={(e) => actualizarMedicamento(idx, 'dosis', e.target.value)}
                    placeholder="ej. 50 mg"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: 'var(--color-input-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-input)',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              {/* Fila de Posología: Vía, Frecuencia, Duración */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Vía de administración
                  </label>
                  <input
                    type="text"
                    value={med.via}
                    onChange={(e) => actualizarMedicamento(idx, 'via', e.target.value)}
                    placeholder="Oral, I.V..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: 'var(--color-input-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-input)',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Frecuencia
                  </label>
                  <input
                    type="text"
                    value={med.frecuencia}
                    onChange={(e) => actualizarMedicamento(idx, 'frecuencia', e.target.value)}
                    placeholder="Cada 8 horas, Cada 12h..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: 'var(--color-input-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-input)',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Duración
                  </label>
                  <input
                    type="text"
                    value={med.duracion}
                    onChange={(e) => actualizarMedicamento(idx, 'duracion', e.target.value)}
                    placeholder="7 días, 30 días..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: 'var(--color-input-bg)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-input)',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Indicaciones / Modo de toma
                </label>
                <input
                  type="text"
                  value={med.indicaciones}
                  onChange={(e) => actualizarMedicamento(idx, 'indicaciones', e.target.value)}
                  placeholder="ej. Tomar con las comidas..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'var(--color-input-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-input)',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Botón para agregar otro fármaco */}
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={agregarMedicamento}
            leftIcon={<Plus size={14} />}
          >
            Agregar otro medicamento a la receta
          </Button>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={guardando} leftIcon={<Pill size={16} />}>
            Emitir Receta Oficial (V13)
          </Button>
        </div>
      </form>
    </Modal>
  );
};
