import { getDisplayLabel } from '../../services/displayLabels';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BedDouble,
  Search,
  Plus,
  Filter,
  Clock,
  Eye
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Panel } from '../../design-system/components/Panel';
import { MetricStrip } from '../../design-system/components/MetricStrip';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { EmptyState } from '../../design-system/components/EmptyState';
import {
  HospitalizacionItem,
  CamaHospitalaria,
  EstadoHospitalizacion
} from '../../services/types';

export const HospitalizationsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { sesion } = useAuthSession();
  const { hospitalizationRepository } = useServices();

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [loading, setLoading] = useState(true);
  const [hospitalizaciones, setHospitalizaciones] = useState<HospitalizacionItem[]>([]);
  const [camas, setCamas] = useState<CamaHospitalaria[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODAS' | EstadoHospitalizacion>('TODAS');
  const [filtroServicio, setFiltroServicio] = useState<string>('TODOS');

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [hospData, camasData] = await Promise.all([
        hospitalizationRepository.listarHospitalizaciones(institucionId),
        hospitalizationRepository.listarCamas(institucionId)
      ]);
      setHospitalizaciones(hospData);
      setCamas(camasData);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [institucionId, hospitalizationRepository]);

  // KPIs
  const camasOcupadas = camas.filter((c) => c.estado === 'OCUPADA').length;
  const camasDisponibles = camas.filter((c) => c.estado === 'DISPONIBLE').length;
  const activas = hospitalizaciones.filter((h) => h.estado === 'ACTIVA').length;
  const egresadas = hospitalizaciones.filter((h) => h.estado === 'EGRESADA').length;

  const serviciosUnicos = Array.from(new Set(camas.map((c) => c.salaServicio)));

  const filtradas = hospitalizaciones.filter((h) => {
    if (filtroEstado !== 'TODAS' && h.estado !== filtroEstado) return false;
    if (filtroServicio !== 'TODOS' && h.camaActual?.servicio !== filtroServicio) return false;

    if (busqueda.trim() !== '') {
      const q = busqueda.toLowerCase();
      const coincide =
        h.pacienteNombre.toLowerCase().includes(q) ||
        h.pacienteExpediente.toLowerCase().includes(q) ||
        h.medicoTratanteNombre.toLowerCase().includes(q) ||
        h.codigoIngreso.toLowerCase().includes(q) ||
        (h.camaActual?.codigoCama && h.camaActual.codigoCama.toLowerCase().includes(q));
      if (!coincide) return false;
    }
    return true;
  });

  const calcularEstanciaDias = (fechaIngreso: string, fechaEgreso?: string): number => {
    const inicio = new Date(fechaIngreso).getTime();
    const fin = fechaEgreso ? new Date(fechaEgreso).getTime() : Date.now();
    const diff = Math.max(1, Math.round((fin - inicio) / (1000 * 60 * 60 * 24)));
    return diff;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Breadcrumb */}
      <nav aria-label="Ruta de navegación" style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        <span>Inicio</span>
        <span style={{ margin: '0 8px' }}>/</span>
        <span>Hospitalización</span>
        <span style={{ margin: '0 8px' }}>/</span>
        <strong style={{ color: 'var(--color-strong)' }}>Monitoreo de Hospitalizaciones</strong>
      </nav>

      {/* Cabecera Principal H01 */}
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
              <BedDouble size={20} />
            </div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--color-strong)' }}>
              Hospitalizaciones Activas e Históricas
            </h1>
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: 'var(--color-text-secondary)', maxWidth: '780px', lineHeight: 1.5 }}>
            Seguimiento de pacientes internados, asignación de camas y registro de altas médicas.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="secondary"
            onClick={() => navigate('/hospital/camas')}
            leftIcon={<BedDouble size={16} />}
          >
            Mapa de Camas
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/hospital/hospitalizaciones/nueva')}
            leftIcon={<Plus size={16} />}
          >
            Nuevo Ingreso
          </Button>
        </div>
      </div>

      <MetricStrip
        label="Resumen de hospitalizaciones"
        items={[
          { id: 'ingresos-activos', label: 'Pacientes internados', value: activas },
          { id: 'camas', label: 'Camas ocupadas', value: camasOcupadas, detail: `${camasDisponibles} disponibles` },
          { id: 'altas', label: 'Altas registradas', value: egresadas, tone: 'success' },
        ]}
      />

      {/* Buscador y Filtros */}
      <Panel>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Buscador */}
          <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-secondary)'
              }}
            />
            <input
              type="text"
              placeholder="Buscar por paciente, expediente, cama, médico o código de ingreso..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                backgroundColor: 'var(--color-control)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                fontSize: '13px'
              }}
            />
          </div>

          {/* Filtros por Estado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="var(--color-text-secondary)" />
            {(['TODAS', 'ACTIVA', 'EGRESADA'] as const).map((est) => (
              <button
                key={est}
                type="button"
                onClick={() => setFiltroEstado(est)}
                style={{
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: filtroEstado === est ? 700 : 500,
                  backgroundColor: filtroEstado === est ? 'var(--color-selection)' : 'transparent',
                  color: filtroEstado === est ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  border: '1px solid',
                  borderColor: filtroEstado === est ? 'var(--color-primary)' : 'var(--color-border)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {est === 'TODAS' ? 'Todas' : est}
              </button>
            ))}
          </div>

          {/* Filtro por Servicio */}
          <div>
            <select
              value={filtroServicio}
              onChange={(e) => setFiltroServicio(e.target.value)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                backgroundColor: 'var(--color-control)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-input)',
                color: 'var(--color-strong)'
              }}
            >
              <option value="TODOS">Todos los servicios</option>
              {serviciosUnicos.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Panel>

      {/* Tabla de Hospitalizaciones */}
      <Panel>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
              Hospitalizaciones Registradas ({filtradas.length})
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Lista de internamientos clínicos con cama actual y días de estancia
            </span>
          </div>
        </div>

        {loading ? (
          <SkeletonLoader variant="rectangular" height="260px" />
        ) : filtradas.length === 0 ? (
          <EmptyState
            title="Sin hospitalizaciones encontradas"
            description="No se registran pacientes hospitalizados que coincidan con los filtros seleccionados."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Ingreso / Paciente</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Cama y Ubicación</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Fecha Ingreso</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Estancia</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Diagnóstico Ingreso</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Médico Tratante</th>
                  <th style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>Estado</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((hosp) => (
                  <tr
                    key={hosp.id}
                    style={{
                      borderBottom: '1px solid var(--color-divider)',
                      transition: 'background-color var(--transition-fast)'
                    }}
                  >
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-strong)' }}>{hosp.pacienteNombre}</div>
                      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>
                        {hosp.codigoIngreso} • {hosp.pacienteExpediente}
                      </div>
                    </td>

                    <td style={{ padding: '12px' }}>
                      {hosp.camaActual ? (
                        <div>
                          <Badge variant="primary">{hosp.camaActual.codigoCama}</Badge>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                            {hosp.camaActual.habitacion} ({hosp.camaActual.servicio})
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Sin cama asignada</span>
                      )}
                    </td>

                    <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 500, color: 'var(--color-strong)' }}>
                        {new Date(hosp.fechaIngreso).toLocaleDateString('es-GT', { dateStyle: 'medium' })}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                        {new Date(hosp.fechaIngreso).toLocaleTimeString('es-GT', { timeStyle: 'short' })}
                      </div>
                    </td>

                    <td style={{ padding: '12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--color-strong)' }}>
                        <Clock size={13} color="var(--color-primary)" />
                        {calcularEstanciaDias(hosp.fechaIngreso, hosp.fechaEgreso)} días
                      </span>
                    </td>

                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-strong)' }}>{hosp.diagnosticoIngresoNombre}</div>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                        CIE-10: {hosp.diagnosticoIngresoCIE}
                      </span>
                    </td>

                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-strong)' }}>{hosp.medicoTratanteNombre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{hosp.medicoTratanteColegiado}</div>
                    </td>

                    <td style={{ padding: '12px' }}>
                      <Badge variant={hosp.estado === 'ACTIVA' ? 'success' : hosp.estado === 'EGRESADA' ? 'neutral' : 'danger'}>
                        {getDisplayLabel(hosp.estado)}
                      </Badge>
                    </td>

                    <td style={{ padding: '12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/hospital/hospitalizaciones/${hosp.id}`)}
                        leftIcon={<Eye size={13} />}
                      >
                        Ver Detalle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
};
