import { getDisplayLabel } from '../../services/displayLabels';
import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Search,
  Eye
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { EmptyState } from '../../design-system/components/EmptyState';
import { DetalleEventoAuditoriaModal } from './DetalleEventoAuditoriaModal';
import { EventoAuditoria, FiltrosAuditoriaQuery } from '../../services/types';
import { AUDIT_ACTION_LABELS, AUDIT_RESOURCE_LABELS, AUDIT_SEVERITY_LABELS } from './auditLabels';

export const AuditSearchPage: React.FC = () => {
  const { sesion } = useAuthSession();
  const { auditRepository } = useServices();

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [filtros, setFiltros] = useState<FiltrosAuditoriaQuery>({
    actor: '',
    accion: 'TODAS',
    tipoRecurso: 'TODOS',
    correlacionId: '',
    fechaDesde: '',
    fechaHasta: ''
  });

  const [eventoSeleccionado, setEventoSeleccionado] = useState<EventoAuditoria | null>(null);
  const [showModalDetalle, setShowModalDetalle] = useState(false);

  const cargarEventos = async () => {
    setLoading(true);
    try {
      const data = await auditRepository.consultarEventos(institucionId, filtros);
      setEventos(data);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEventos();
  }, [institucionId, auditRepository]);

  const handleLimpiarFiltros = () => {
    const fLimpios = {
      actor: '',
      accion: 'TODAS',
      tipoRecurso: 'TODOS',
      correlacionId: '',
      fechaDesde: '',
      fechaHasta: ''
    };
    setFiltros(fLimpios);
    auditRepository.consultarEventos(institucionId, fLimpios).then(setEventos);
  };

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    cargarEventos();
  };

  const handleAbrirDetalle = (evento: EventoAuditoria) => {
    setEventoSeleccionado(evento);
    setShowModalDetalle(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Breadcrumb */}
      <nav aria-label="Ruta de navegación" style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        <span>Inicio</span>
        <span style={{ margin: '0 8px' }}>/</span>
        <span>Administración</span>
        <span style={{ margin: '0 8px' }}>/</span>
        <strong style={{ color: 'var(--color-strong)' }}>Registro de actividad</strong>
      </nav>

      {/* Cabecera Principal V18 */}
      <div
        style={{
          backgroundColor: 'var(--color-background)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-panel)',
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
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
              <ShieldCheck size={20} />
            </div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--color-strong)' }}>
              Registro de actividad
            </h1>
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: 'var(--color-text-secondary)', maxWidth: '780px', lineHeight: 1.5 }}>
            Consulta las acciones realizadas en esta institución y revisa sus detalles.
          </p>
        </div>

      </div>

      {/* Panel de Filtros */}
      <Panel>
        <form onSubmit={handleBuscar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {/* Actor */}
            <div>
              <label htmlFor="filtro-actor" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}>
                Actor institucional
              </label>
              <input
                id="filtro-actor"
                type="text"
                placeholder="Nombre, correo o rol..."
                value={filtros.actor}
                onChange={(e) => setFiltros({ ...filtros, actor: e.target.value })}
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

            {/* Acción */}
            <div>
              <label htmlFor="filtro-accion" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}>
                Acción auditada
              </label>
              <select
                id="filtro-accion"
                value={filtros.accion}
                onChange={(e) => setFiltros({ ...filtros, accion: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-control)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                  fontSize: '13px'
                }}
              >
                <option value="TODAS">Todas las acciones</option>
                <option value="CREACION">Creación</option>
                <option value="MODIFICACION">Modificación</option>
                <option value="RECTIFICACION_CA10">Corrección clínica</option>
                <option value="ARCHIVADO_EXPEDIENTE">Expediente archivado</option>
                <option value="REACTIVACION_EXPEDIENTE">Expediente reactivado</option>
                <option value="CAMBIO_ESTADO_CUENTA">Cambio de cuenta</option>
                <option value="ASIGNACION_PERMISOS">Cambio de permisos</option>
                <option value="EMISION_RECETA">Receta emitida</option>
                <option value="ACCESO_CLINICO">Acceso clínico</option>
              </select>
            </div>

            {/* Tipo de Recurso */}
            <div>
              <label htmlFor="filtro-recurso" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}>
                Tipo de recurso
              </label>
              <select
                id="filtro-recurso"
                value={filtros.tipoRecurso}
                onChange={(e) => setFiltros({ ...filtros, tipoRecurso: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-control)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                  fontSize: '13px'
                }}
              >
                <option value="TODOS">Todos los recursos</option>
                <option value="PACIENTE">Paciente</option>
                <option value="EXPEDIENTE">Expediente</option>
                <option value="CONSULTA">Consulta</option>
                <option value="RECETA">Receta</option>
                <option value="USUARIO">Usuario</option>
                <option value="ROL">Rol</option>
                <option value="CATALOGO_MEDICO">Catálogo médico</option>
                <option value="PRUEBA_LAB">Prueba de laboratorio</option>
              </select>
            </div>

            {/* Correlación ID */}
            <div>
              <label htmlFor="filtro-correlacion" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}>
                Código de correlación / ID
              </label>
              <input
                id="filtro-correlacion"
                type="text"
                placeholder="corr-xxxx o EVT-xxxx..."
                value={filtros.correlacionId}
                onChange={(e) => setFiltros({ ...filtros, correlacionId: e.target.value })}
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

            {/* Fecha Desde */}
            <div>
              <label htmlFor="filtro-desde" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}>
                Fecha desde
              </label>
              <input
                id="filtro-desde"
                type="date"
                value={filtros.fechaDesde}
                onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
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

            {/* Fecha Hasta */}
            <div>
              <label htmlFor="filtro-hasta" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}>
                Fecha hasta
              </label>
              <input
                id="filtro-hasta"
                type="date"
                value={filtros.fechaHasta}
                onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
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
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--color-divider)', paddingTop: '12px' }}>
            <Button type="button" variant="ghost" size="sm" onClick={handleLimpiarFiltros}>
              Limpiar filtros
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              leftIcon={<Search size={14} />}
            >
              Buscar eventos
            </Button>
          </div>
        </form>
      </Panel>

      {/* Tabla de Eventos de Auditoría */}
      <Panel>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
              Eventos Registrados ({eventos.length})
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Ordenados del más reciente al más antiguo
            </span>
          </div>
        </div>

        {loading ? (
          <SkeletonLoader variant="rectangular" height="260px" />
        ) : eventos.length === 0 ? (
          <EmptyState
            title="Sin eventos de auditoría coincidentes"
            description="No se encontraron registros de auditoría que coincidan con los criterios de búsqueda seleccionados."
            actionText="Restablecer filtros"
            onAction={handleLimpiarFiltros}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Fecha / Hora</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Actor</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Acción</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Recurso Afectado</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Severidad</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Correlación</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((ev) => (
                  <tr
                    key={ev.id}
                    style={{
                      borderBottom: '1px solid var(--color-divider)',
                      transition: 'background-color var(--transition-fast)'
                    }}
                  >
                    <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-strong)' }}>
                        {new Date(ev.timestamp).toLocaleDateString('es-GT', { dateStyle: 'medium' })}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                        {new Date(ev.timestamp).toLocaleTimeString('es-GT', { timeStyle: 'short' })}
                      </div>
                    </td>

                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-strong)' }}>{ev.actor.nombre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{getDisplayLabel(ev.actor.rol)}</div>
                    </td>

                    <td style={{ padding: '12px' }}>
                      <Badge
                        variant={
                          ev.accion === 'RECTIFICACION_CA10'
                            ? 'warning'
                            : ev.accion === 'ARCHIVADO_EXPEDIENTE'
                            ? 'danger'
                            : ev.accion === 'CREACION'
                            ? 'success'
                            : 'info'
                        }
                      >
                        {AUDIT_ACTION_LABELS[ev.accion] || 'Actividad'}
                      </Badge>
                    </td>

                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--color-strong)' }}>{ev.recursoNombre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                        {AUDIT_RESOURCE_LABELS[ev.tipoRecurso] || 'Registro'} {ev.versionAfectada && `(versión ${ev.versionAfectada})`}
                      </div>
                    </td>

                    <td style={{ padding: '12px' }}>
                      <Badge
                        variant={
                          ev.severidad === 'CRITICO'
                            ? 'danger'
                            : ev.severidad === 'ADVERTENCIA'
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        {AUDIT_SEVERITY_LABELS[ev.severidad] || 'Información'}
                      </Badge>
                    </td>

                    <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      {ev.correlacionId}
                    </td>

                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAbrirDetalle(ev)}
                        leftIcon={<Eye size={13} />}
                      >
                        Inspeccionar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Modal de Detalle */}
      {showModalDetalle && (
        <DetalleEventoAuditoriaModal
          isOpen={showModalDetalle}
          evento={eventoSeleccionado}
          onClose={() => {
            setShowModalDetalle(false);
            setEventoSeleccionado(null);
          }}
        />
      )}
    </div>
  );
};
