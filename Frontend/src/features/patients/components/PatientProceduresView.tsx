import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Plus,
  CheckCircle2
} from 'lucide-react';
import { useAuthSession } from '../../../app/AuthSessionContext';
import { useServices } from '../../../app/ServiceContext';
import { Panel } from '../../../design-system/components/Panel';
import { Badge } from '../../../design-system/components/Badge';
import { Button } from '../../../design-system/components/Button';
import { SkeletonLoader } from '../../../design-system/components/SkeletonLoader';
import { EmptyState } from '../../../design-system/components/EmptyState';
import { Modal } from '../../../design-system/components/Modal';
import { ProcedimientoHospitalarioItem } from '../../../services/types';

interface PatientProceduresViewProps {
  pacienteId: string;
  pacienteNombre: string;
  esArchivado?: boolean;
}

export const PatientProceduresView: React.FC<PatientProceduresViewProps> = ({
  pacienteId,
  pacienteNombre,
  esArchivado = false
}) => {
  const { sesion } = useAuthSession();
  const { patientRepository } = useServices();
  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [loading, setLoading] = useState(true);
  const [procedimientos, setProcedimientos] = useState<ProcedimientoHospitalarioItem[]>([]);
  const [filtroOrigen, setFiltroOrigen] = useState<'TODOS' | 'HOSPITALIZACION' | 'CONSULTA'>('TODOS');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [notificacion, setNotificacion] = useState<string | null>(null);

  // Form state
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [resultado, setResultado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [profesional, setProfesional] = useState(sesion?.nombre || 'Dra. Elena Morales');
  const [guardando, setGuardando] = useState(false);

  const cargarProcedimientos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await patientRepository.obtenerProcedimientosPaciente(institucionId, pacienteId);
      setProcedimientos(data);
    } catch {
      setProcedimientos([]);
    } finally {
      setLoading(false);
    }
  }, [institucionId, pacienteId, patientRepository]);

  useEffect(() => {
    cargarProcedimientos();
  }, [cargarProcedimientos]);

  const handleRegistrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !resultado.trim()) return;

    setGuardando(true);
    try {
      await patientRepository.registrarProcedimientoPaciente(institucionId, pacienteId, {
        nombre: nombre.trim(),
        codigo: codigo.trim() || undefined,
        fechaHora: new Date().toISOString(),
        profesionalNombre: profesional.trim(),
        resultado: resultado.trim(),
        observaciones: observaciones.trim() || undefined,
        origen: 'CONSULTA'
      });

      setNotificacion('Procedimiento clínico registrado exitosamente.');
      setModalAbierto(false);
      setNombre('');
      setCodigo('');
      setResultado('');
      setObservaciones('');
      await cargarProcedimientos();
      setTimeout(() => setNotificacion(null), 3500);
    } finally {
      setGuardando(false);
    }
  };

  const procsFiltrados = procedimientos.filter((p) => {
    if (filtroOrigen === 'TODOS') return true;
    return p.origen === filtroOrigen;
  });

  const totalHosp = procedimientos.filter((p) => p.origen === 'HOSPITALIZACION').length;
  const totalCons = procedimientos.filter((p) => p.origen === 'CONSULTA').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SkeletonLoader variant="rectangular" height="80px" />
        <SkeletonLoader variant="rectangular" height="220px" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {notificacion && (
        <div
          role="status"
          style={{
            padding: '12px 16px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: 'var(--radius-panel)',
            color: '#065f46',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px'
          }}
        >
          <CheckCircle2 size={18} />
          <span>{notificacion}</span>
        </div>
      )}

      {/* Cabecera canónica H07 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="var(--color-primary)" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
              Procedimientos Clínicos y Quirúrgicos Realizados
            </h2>
            <Badge variant="primary">{procedimientos.length} {procedimientos.length === 1 ? 'Procedimiento' : 'Procedimientos'}</Badge>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Registro cronológico consolidado de intervenciones, exploraciones diagnósticas y procedimientos invasivos o ambulatorios.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setModalAbierto(true)}
          leftIcon={<Plus size={16} />}
          disabled={esArchivado}
          title={esArchivado ? 'Expediente archivado: no se pueden registrar nuevos procedimientos' : undefined}
        >
          Registrar Procedimiento
        </Button>
      </div>

      {/* Tarjetas resumen KPI */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px'
        }}
      >
        <Panel>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Total Realizados
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-strong)', marginTop: '4px' }}>
            {procedimientos.length}
          </div>
        </Panel>

        <Panel>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Quirúrgicos / Hospitalización
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '4px' }}>
            {totalHosp}
          </div>
        </Panel>

        <Panel>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Ambulatorios / Consulta
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
            {totalCons}
          </div>
        </Panel>
      </div>

      {/* Filtro de origen */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Filtrar origen:</span>
        <button
          onClick={() => setFiltroOrigen('TODOS')}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-input)',
            border: '1px solid var(--color-border)',
            backgroundColor: filtroOrigen === 'TODOS' ? 'var(--color-selection)' : 'var(--color-background)',
            color: filtroOrigen === 'TODOS' ? 'var(--color-primary)' : 'var(--color-strong)',
            fontWeight: filtroOrigen === 'TODOS' ? 600 : 400,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Todos ({procedimientos.length})
        </button>
        <button
          onClick={() => setFiltroOrigen('HOSPITALIZACION')}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-input)',
            border: '1px solid var(--color-border)',
            backgroundColor: filtroOrigen === 'HOSPITALIZACION' ? 'var(--color-selection)' : 'var(--color-background)',
            color: filtroOrigen === 'HOSPITALIZACION' ? 'var(--color-primary)' : 'var(--color-strong)',
            fontWeight: filtroOrigen === 'HOSPITALIZACION' ? 600 : 400,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Hospitalización ({totalHosp})
        </button>
        <button
          onClick={() => setFiltroOrigen('CONSULTA')}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-input)',
            border: '1px solid var(--color-border)',
            backgroundColor: filtroOrigen === 'CONSULTA' ? 'var(--color-selection)' : 'var(--color-background)',
            color: filtroOrigen === 'CONSULTA' ? 'var(--color-primary)' : 'var(--color-strong)',
            fontWeight: filtroOrigen === 'CONSULTA' ? 600 : 400,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Consulta Ambulatoria ({totalCons})
        </button>
      </div>

      {/* Lista de procedimientos */}
      {procsFiltrados.length === 0 ? (
        <EmptyState
          title="Sin procedimientos registrados"
          description="No se registran intervenciones o procedimientos clínicos que coincidan con el filtro seleccionado."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {procsFiltrados.map((proc) => (
            <Panel key={proc.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '15px', color: 'var(--color-strong)' }}>{proc.nombre}</strong>
                    {proc.codigo && <Badge variant="neutral">{proc.codigo}</Badge>}
                    <Badge variant={proc.origen === 'HOSPITALIZACION' ? 'primary' : 'success'}>
                      {proc.origen === 'HOSPITALIZACION' ? 'Hospitalización' : 'Consulta Ambulatoria'}
                    </Badge>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    Realizado por <strong>{proc.profesionalNombre}</strong> el {new Date(proc.fechaHora).toLocaleString()}
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--color-border)',
                  fontSize: '13px'
                }}
              >
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Resultado / Hallazgos: </span>
                  <span style={{ color: 'var(--color-strong)' }}>{proc.resultado}</span>
                </div>
                {proc.observaciones && (
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    <em>Observaciones: {proc.observaciones}</em>
                  </div>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {/* Modal Registrar Procedimiento */}
      <Modal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title="Registrar Procedimiento Clínico Realizado"
        maxWidth="600px"
      >
        <form onSubmit={handleRegistrar} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label
              htmlFor="proc-modal-paciente"
              style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
            >
              Paciente
            </label>
            <input
              id="proc-modal-paciente"
              type="text"
              value={pacienteNombre}
              disabled
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                backgroundColor: 'var(--color-panel)',
                fontSize: '13px'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <label
                htmlFor="proc-modal-nombre"
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
              >
                Nombre del Procedimiento *
              </label>
              <input
                id="proc-modal-nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ejemplo: Toracocentesis, Biopsia cutánea..."
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label
                htmlFor="proc-modal-codigo"
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
              >
                Código Institucional (Opcional)
              </label>
              <input
                id="proc-modal-codigo"
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ejemplo: QXR-01, PROC-MED-04"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                  fontSize: '13px'
                }}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="proc-modal-profesional"
              style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
            >
              Profesional Ejecutor *
            </label>
            <input
              id="proc-modal-profesional"
              type="text"
              value={profesional}
              onChange={(e) => setProfesional(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                fontSize: '13px'
              }}
            />
          </div>

          <div>
            <label
              htmlFor="proc-modal-resultado"
              style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
            >
              Resultado o Hallazgos Obtenidos *
            </label>
            <input
              id="proc-modal-resultado"
              type="text"
              value={resultado}
              onChange={(e) => setResultado(e.target.value)}
              placeholder="Descripción del resultado de la intervención..."
              required
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                fontSize: '13px'
              }}
            />
          </div>

          <div>
            <label
              htmlFor="proc-modal-obs"
              style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
            >
              Observaciones Adicionales
            </label>
            <input
              id="proc-modal-obs"
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Indicaciones, evolución inmediata o muestras enviadas..."
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                fontSize: '13px'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setModalAbierto(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={guardando}
              aria-label="Confirmar registro de procedimiento realizado"
            >
              {guardando ? 'Guardando...' : 'Guardar Procedimiento'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
