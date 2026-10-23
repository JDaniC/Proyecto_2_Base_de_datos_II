import React, { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical,
  Plus,
  CheckCircle2,
  Eye,
  FileCheck2
} from 'lucide-react';
import { useAuthSession } from '../../../app/AuthSessionContext';
import { useServices } from '../../../app/ServiceContext';
import { Panel } from '../../../design-system/components/Panel';
import { Badge } from '../../../design-system/components/Badge';
import { Button } from '../../../design-system/components/Button';
import { SkeletonLoader } from '../../../design-system/components/SkeletonLoader';
import { EmptyState } from '../../../design-system/components/EmptyState';
import { NuevaOrdenExamenModal } from '../../hospital/components/NuevaOrdenExamenModal';
import { DetalleOrdenResultadosModal } from '../../hospital/components/DetalleOrdenResultadosModal';
import { RegistrarResultadosModal } from '../../hospital/components/RegistrarResultadosModal';
import {
  OrdenExamenHospital,
  PrioridadOrdenExamen,
  EstadoOrdenExamen
} from '../../../services/types';

interface PatientExamsViewProps {
  pacienteId: string;
  pacienteNombre: string;
  esArchivado?: boolean;
}

export const PatientExamsView: React.FC<PatientExamsViewProps> = ({
  pacienteId,
  pacienteNombre,
  esArchivado = false
}) => {
  const { sesion } = useAuthSession();
  const { examRepository } = useServices();
  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [loading, setLoading] = useState(true);
  const [ordenes, setOrdenes] = useState<OrdenExamenHospital[]>([]);
  const [modalNuevaOrdenAbierto, setModalNuevaOrdenAbierto] = useState(false);
  const [ordenSeleccionadaDetalle, setOrdenSeleccionadaDetalle] = useState<OrdenExamenHospital | null>(null);
  const [ordenSeleccionadaRegistrar, setOrdenSeleccionadaRegistrar] = useState<OrdenExamenHospital | null>(null);
  const [notificacion, setNotificacion] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await examRepository.obtenerOrdenesPorPaciente(institucionId, pacienteId);
      setOrdenes(data);
    } catch {
      setOrdenes([]);
    } finally {
      setLoading(false);
    }
  }, [institucionId, pacienteId, examRepository]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const getPrioridadBadge = (p: PrioridadOrdenExamen) => {
    switch (p) {
      case 'STAT':
        return <Badge variant="danger">STAT</Badge>;
      case 'URGENTE':
        return <Badge variant="warning">Urgente</Badge>;
      default:
        return <Badge variant="primary">Rutina</Badge>;
    }
  };

  const getEstadoBadge = (e: EstadoOrdenExamen) => {
    switch (e) {
      case 'COMPLETADA':
        return <Badge variant="success">Completada</Badge>;
      case 'EN_PROCESO':
        return <Badge variant="warning">En Proceso</Badge>;
      case 'CANCELADA':
        return <Badge variant="neutral">Cancelada</Badge>;
      default:
        return <Badge variant="primary">Solicitada</Badge>;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SkeletonLoader variant="rectangular" height="80px" />
        <SkeletonLoader variant="rectangular" height="180px" />
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

      {/* Cabecera de la subvista H06 */}
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
            <FlaskConical size={20} color="var(--color-primary)" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
              Órdenes de Examen y Resultados de Laboratorio (H06)
            </h2>
            <Badge variant="primary">{ordenes.length} {ordenes.length === 1 ? 'Orden' : 'Órdenes'}</Badge>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Exámenes diagnósticos solicitados, estado analítico y resultados estructurados con parámetros y rangos de referencia.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setModalNuevaOrdenAbierto(true)}
          leftIcon={<Plus size={16} />}
          disabled={esArchivado}
          title={esArchivado ? 'Expediente archivado: no se pueden solicitar nuevos exámenes' : undefined}
        >
          Solicitar Examen (H06)
        </Button>
      </div>

      {/* Lista de Órdenes del Paciente */}
      {ordenes.length === 0 ? (
        <EmptyState
          title="Sin órdenes de examen registradas"
          description="Este paciente no cuenta con solicitudes de examen o pruebas diagnósticas en la institución."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {ordenes.map((ord) => (
            <Panel key={ord.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '14px', color: 'var(--color-primary)' }}>
                      {ord.codigoLegible}
                    </span>
                    {getPrioridadBadge(ord.prioridad)}
                    {getEstadoBadge(ord.estado)}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    Solicitado por <strong>{ord.medicoSolicitanteNombre}</strong> el {new Date(ord.fechaSolicitud).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '8px', color: 'var(--color-strong)' }}>
                    <strong>Motivo:</strong> {ord.motivoClinico}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setOrdenSeleccionadaDetalle(ord)}
                    leftIcon={<Eye size={14} />}
                  >
                    Ver Resultados (H06)
                  </Button>

                  {ord.items.some((it) => it.estado === 'PENDIENTE') && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setOrdenSeleccionadaRegistrar(ord)}
                      leftIcon={<FileCheck2 size={14} />}
                    >
                      Registrar
                    </Button>
                  )}
                </div>
              </div>

              {/* Pruebas incluidas en la orden */}
              <div
                style={{
                  marginTop: '14px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--color-border)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                {ord.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'var(--color-panel)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-field)',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--color-strong)' }}>{item.nombre}</span>
                    <Badge variant={item.estado === 'COMPLETADO' ? 'success' : 'warning'}>
                      {item.estado === 'COMPLETADO' ? 'Validado' : 'Pendiente'}
                    </Badge>
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {/* Modal Nueva Orden */}
      <NuevaOrdenExamenModal
        isOpen={modalNuevaOrdenAbierto}
        onClose={() => setModalNuevaOrdenAbierto(false)}
        preselectedPacienteId={pacienteId}
        preselectedPacienteNombre={pacienteNombre}
        onOrdenCreada={async () => {
          setNotificacion('Orden médica de examen emitida exitosamente.');
          await cargarDatos();
          setTimeout(() => setNotificacion(null), 3500);
        }}
      />

      {/* Modal Detalle y Resultados */}
      <DetalleOrdenResultadosModal
        isOpen={!!ordenSeleccionadaDetalle}
        onClose={() => setOrdenSeleccionadaDetalle(null)}
        orden={ordenSeleccionadaDetalle}
        onAbrirRegistrarResultado={(ord) => setOrdenSeleccionadaRegistrar(ord)}
      />

      {/* Modal Registrar Resultados */}
      <RegistrarResultadosModal
        isOpen={!!ordenSeleccionadaRegistrar}
        onClose={() => setOrdenSeleccionadaRegistrar(null)}
        orden={ordenSeleccionadaRegistrar}
        onResultadoRegistrado={async () => {
          setNotificacion('Resultados de examen registrados y validados exitosamente.');
          await cargarDatos();
          setTimeout(() => setNotificacion(null), 3500);
        }}
      />
    </div>
  );
};
