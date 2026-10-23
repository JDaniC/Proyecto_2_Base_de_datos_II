import React, { useState, useEffect } from 'react';
import {
  FileText,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../../../design-system/components/Modal';
import { Button } from '../../../design-system/components/Button';
import { Badge } from '../../../design-system/components/Badge';
import { useServices } from '../../../app/ServiceContext';
import { useAuthSession } from '../../../app/AuthSessionContext';
import {
  PrioridadOrdenExamen,
  CrearOrdenExamenDTO,
  PruebaLaboratorioCatalogo,
  Paciente
} from '../../../services/types';

interface NuevaOrdenExamenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrdenCreada: () => void;
  preselectedPacienteId?: string;
  preselectedPacienteNombre?: string;
}

export const NuevaOrdenExamenModal: React.FC<NuevaOrdenExamenModalProps> = ({
  isOpen,
  onClose,
  onOrdenCreada,
  preselectedPacienteId,
  preselectedPacienteNombre
}) => {
  const { sesion } = useAuthSession();
  const { examRepository, catalogRepository, patientRepository } = useServices();
  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteId, setPacienteId] = useState(preselectedPacienteId || '');
  const [prioridad, setPrioridad] = useState<PrioridadOrdenExamen>('RUTINA');
  const [motivoClinico, setMotivoClinico] = useState('');
  const [diagnosticoCIE10, setDiagnosticoCIE10] = useState('');
  const [pruebasCatalogo, setPruebasCatalogo] = useState<PruebaLaboratorioCatalogo[]>([]);
  const [pruebasSeleccionadas, setPruebasSeleccionadas] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Cargar catálogo de pruebas de laboratorio
      catalogRepository.obtenerPruebasLaboratorio(institucionId).then(setPruebasCatalogo);

      // Si no hay paciente preseleccionado, cargar lista de pacientes
      if (!preselectedPacienteId) {
        patientRepository.buscar(institucionId, { q: '', limite: 50 }).then((res) => {
          setPacientes(res.items);
          if (res.items.length > 0 && !pacienteId) {
            setPacienteId(res.items[0].id);
          }
        });
      } else {
        setPacienteId(preselectedPacienteId);
      }

      setError(null);
      setMotivoClinico('');
      setDiagnosticoCIE10('');
      setPruebasSeleccionadas([]);
    }
  }, [isOpen, preselectedPacienteId, catalogRepository, patientRepository, institucionId, pacienteId]);

  const handleTogglePrueba = (id: string) => {
    setPruebasSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!pacienteId) {
      setError('Debe seleccionar un paciente para la orden.');
      return;
    }
    if (!motivoClinico.trim()) {
      setError('Debe ingresar la justificación o motivo clínico de la solicitud.');
      return;
    }
    if (pruebasSeleccionadas.length === 0) {
      setError('Debe seleccionar al menos una prueba o examen del catálogo.');
      return;
    }

    setGuardando(true);
    try {
      const dto: CrearOrdenExamenDTO = {
        pacienteId,
        medicoSolicitanteId: sesion?.cuentaId || 'med-01',
        medicoSolicitanteNombre: sesion ? `${sesion.nombre} (${sesion.rolEtiqueta})` : 'Dra. Elena Morales (Colegiado 8892)',
        prioridad,
        motivoClinico: motivoClinico.trim(),
        diagnosticoPresuntivoCIE10: diagnosticoCIE10.trim() || undefined,
        pruebasIds: pruebasSeleccionadas
      };

      await (examRepository as any).crearOrden(institucionId, dto, pruebasCatalogo);
      onOrdenCreada();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al emitir la orden médica de examen.');
    } finally {
      setGuardando(false);
    }
  };

  // Agrupar pruebas por sección
  const pruebasPorSeccion = pruebasCatalogo.reduce<Record<string, PruebaLaboratorioCatalogo[]>>((acc, p) => {
    if (!acc[p.seccion]) acc[p.seccion] = [];
    acc[p.seccion].push(p);
    return acc;
  }, {});

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva Solicitud / Orden de Examen Hospitalario (H06)"
      maxWidth="700px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div
            role="alert"
            style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #f87171',
              borderRadius: 'var(--radius-field)',
              color: '#b91c1c',
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

        {/* Paciente y Prioridad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          <div>
            <label
              htmlFor="select-paciente-orden"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
            >
              Paciente *
            </label>
            {preselectedPacienteId ? (
              <div
                style={{
                  padding: '9px 12px',
                  backgroundColor: 'var(--color-panel)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-field)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-strong)'
                }}
              >
                {preselectedPacienteNombre || 'Paciente seleccionado'}
              </div>
            ) : (
              <select
                id="select-paciente-orden"
                value={pacienteId}
                onChange={(e) => setPacienteId(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-field)',
                  fontSize: '13px'
                }}
              >
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombres} {p.apellidos} ({p.codigoLegible})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label
              htmlFor="select-prioridad-orden"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
            >
              Prioridad Clínica *
            </label>
            <select
              id="select-prioridad-orden"
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value as PrioridadOrdenExamen)}
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-field)',
                fontSize: '13px'
              }}
            >
              <option value="RUTINA">Rutina (Turno estándar / 24 horas)</option>
              <option value="URGENTE">Urgente (Prioridad clínica / 2-4 horas)</option>
              <option value="STAT">STAT / Inmediato (Emergencia médica / &lt; 1 hora)</option>
            </select>
          </div>
        </div>

        {/* Motivo y Diagnóstico Presuntivo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          <div>
            <label
              htmlFor="input-cie10-orden"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
            >
              Diagnóstico Presuntivo (CIE-10)
            </label>
            <input
              id="input-cie10-orden"
              type="text"
              value={diagnosticoCIE10}
              onChange={(e) => setDiagnosticoCIE10(e.target.value)}
              placeholder="Ejemplo: K80.0 - Colelitiasis, E11.9 - Diabetes tipo 2"
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
              htmlFor="input-motivo-orden"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
            >
              Justificación / Motivo Clínico *
            </label>
            <input
              id="input-motivo-orden"
              type="text"
              value={motivoClinico}
              onChange={(e) => setMotivoClinico(e.target.value)}
              placeholder="Ejemplo: Evaluación prequirúrgica, sospecha de sepsis..."
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

        {/* Selección de Pruebas del Catálogo Institucional */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)' }}>
              Pruebas y Exámenes a Solicitar *
            </label>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {pruebasSeleccionadas.length} seleccionada(s)
            </span>
          </div>

          <div
            style={{
              maxHeight: '240px',
              overflowY: 'auto',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-panel)',
              padding: '12px',
              backgroundColor: 'var(--color-panel)'
            }}
          >
            {Object.entries(pruebasPorSeccion).map(([seccion, pruebas]) => (
              <div key={seccion} style={{ marginBottom: '14px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--color-primary)',
                    marginBottom: '6px'
                  }}
                >
                  {seccion}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pruebas.map((p) => {
                    const checked = pruebasSeleccionadas.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-field)',
                          backgroundColor: checked ? 'var(--color-selection)' : 'var(--color-background)',
                          border: checked ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleTogglePrueba(p.id)}
                          style={{ marginTop: '2px', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '13px', color: 'var(--color-strong)' }}>
                              {p.nombre}
                            </strong>
                            <Badge variant="neutral">{p.codigoPrueba}</Badge>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                            Muestra: {p.tipoMuestra} • Tiempo de entrega: ~{p.tiempoEntregaHoras} h
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <Button variant="secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={guardando}
            aria-label="Confirmar emisión de orden médica"
            leftIcon={<FileText size={16} />}
          >
            {guardando ? 'Emitiendo orden...' : 'Emitir Orden Médica (H06)'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
