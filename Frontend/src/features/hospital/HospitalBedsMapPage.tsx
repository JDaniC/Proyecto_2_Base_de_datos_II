import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BedDouble,
  Search,
  Filter,
  CheckCircle2,
  Wrench,
  User,
  ArrowRightLeft,
  LogOut,
  Building2,
  ShieldCheck,
  Plus,
  Eye
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { EmptyState } from '../../design-system/components/EmptyState';
import { Modal } from '../../design-system/components/Modal';
import { AsignarCamaModal } from './AsignarCamaModal';
import {
  CamaHospitalaria,
  HospitalizacionItem,
  EstadoCama
} from '../../services/types';

export const HospitalBedsMapPage: React.FC = () => {
  const navigate = useNavigate();
  const { sesion } = useAuthSession();
  const { hospitalizationRepository } = useServices();

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [loading, setLoading] = useState(true);
  const [camas, setCamas] = useState<CamaHospitalaria[]>([]);
  const [hospitalizaciones, setHospitalizaciones] = useState<HospitalizacionItem[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODAS' | EstadoCama>('TODAS');
  const [filtroPiso, setFiltroPiso] = useState<string>('TODOS');
  const [filtroServicio, setFiltroServicio] = useState<string>('TODOS');

  // Modal para traslado H04
  const [hospParaTraslado, setHospParaTraslado] = useState<HospitalizacionItem | null>(null);
  const [modalTrasladoAbierto, setModalTrasladoAbierto] = useState(false);

  // Modal para liberar cama
  const [camaParaLiberar, setCamaParaLiberar] = useState<CamaHospitalaria | null>(null);
  const [modalLiberarAbierto, setModalLiberarAbierto] = useState(false);
  const [liberando, setLiberando] = useState(false);

  // Notificación de éxito
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [camasData, hospData] = await Promise.all([
        hospitalizationRepository.listarCamas(institucionId),
        hospitalizationRepository.listarHospitalizaciones(institucionId)
      ]);
      setCamas(camasData);
      setHospitalizaciones(hospData);
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
  const totalCamas = camas.length;
  const ocupadas = camas.filter((c) => c.estado === 'OCUPADA').length;
  const disponibles = camas.filter((c) => c.estado === 'DISPONIBLE').length;
  const mantenimiento = camas.filter((c) => c.estado === 'MANTENIMIENTO').length;
  const porcentajeOcupacion = totalCamas > 0 ? Math.round((ocupadas / totalCamas) * 100) : 0;

  // Filtros
  const pisosUnicos = Array.from(new Set(camas.map((c) => c.piso))).sort((a, b) => a - b);
  const serviciosUnicos = Array.from(new Set(camas.map((c) => c.salaServicio))).sort();

  const camasFiltradas = camas.filter((c) => {
    if (filtroEstado !== 'TODAS' && c.estado !== filtroEstado) return false;
    if (filtroPiso !== 'TODOS' && c.piso.toString() !== filtroPiso) return false;
    if (filtroServicio !== 'TODOS' && c.salaServicio !== filtroServicio) return false;

    if (busqueda.trim() !== '') {
      const q = busqueda.toLowerCase();
      const coincide =
        c.codigoCama.toLowerCase().includes(q) ||
        c.numeroHabitacion.toLowerCase().includes(q) ||
        c.salaServicio.toLowerCase().includes(q) ||
        (c.pacienteActual && c.pacienteActual.toLowerCase().includes(q));
      if (!coincide) return false;
    }
    return true;
  });

  // Agrupar camas por habitación
  const habitacionesMap = new Map<string, CamaHospitalaria[]>();
  camasFiltradas.forEach((cama) => {
    const key = `Habitación ${cama.numeroHabitacion}`;
    if (!habitacionesMap.has(key)) {
      habitacionesMap.set(key, []);
    }
    habitacionesMap.get(key)!.push(cama);
  });

  const handleToggleMantenimiento = async (cama: CamaHospitalaria) => {
    const nuevoEstado: EstadoCama = cama.estado === 'MANTENIMIENTO' ? 'DISPONIBLE' : 'MANTENIMIENTO';
    try {
      await hospitalizationRepository.cambiarEstadoCama(institucionId, cama.id, nuevoEstado);
      const camasActualizadas = await hospitalizationRepository.listarCamas(institucionId);
      setCamas(camasActualizadas);
      setMensajeExito(
        `Cama ${cama.codigoCama} actualizada a estado ${nuevoEstado === 'DISPONIBLE' ? 'DISPONIBLE' : 'EN MANTENIMIENTO'}.`
      );
      setTimeout(() => setMensajeExito(null), 3500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al cambiar estado de cama');
    }
  };

  const handleAbrirTraslado = (cama: CamaHospitalaria) => {
    const hosp = hospitalizaciones.find((h) => h.id === cama.hospitalizacionActivaId);
    if (hosp) {
      setHospParaTraslado(hosp);
      setModalTrasladoAbierto(true);
    }
  };

  const handleConfirmarTraslado = async (nuevaCamaId: string, fechaInicio: string, motivo: string) => {
    if (!hospParaTraslado) return;
    await hospitalizationRepository.asignarCama(institucionId, hospParaTraslado.id, nuevaCamaId, fechaInicio, motivo);
    setMensajeExito('Traslado de cama registrado exitosamente bajo intervalo semiabierto [inicio, fin) (CA17).');
    await cargarDatos();
    setModalTrasladoAbierto(false);
    setTimeout(() => setMensajeExito(null), 3500);
  };

  const handleConfirmarLiberarCama = async () => {
    if (!camaParaLiberar || !camaParaLiberar.hospitalizacionActivaId) return;
    setLiberando(true);
    try {
      await hospitalizationRepository.liberarCama(
        institucionId,
        camaParaLiberar.hospitalizacionActivaId,
        new Date().toISOString()
      );
      setMensajeExito(`Cama ${camaParaLiberar.codigoCama} liberada exitosamente.`);
      await cargarDatos();
      setModalLiberarAbierto(false);
      setTimeout(() => setMensajeExito(null), 3500);
    } finally {
      setLiberando(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Breadcrumb */}
      <nav aria-label="Ruta de navegación" style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        <span>Inicio</span>
        <span style={{ margin: '0 8px' }}>/</span>
        <span>Hospitalización</span>
        <span style={{ margin: '0 8px' }}>/</span>
        <strong style={{ color: 'var(--color-strong)' }}>Habitaciones y Camas (H03)</strong>
      </nav>

      {/* Banner de éxito */}
      {mensajeExito && (
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
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* Cabecera Principal H03 */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
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
              Habitaciones, Camas y Ocupación (H03)
            </h1>
            <Badge variant="primary">{sesion?.institucionNombre || 'Hospital General'}</Badge>
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: 'var(--color-text-secondary)', maxWidth: '780px', lineHeight: 1.5 }}>
            Distribución física y operativa de camas por habitación y sala de internamiento. Asignación y traslados
            auditados bajo semántica de intervalo semiabierto `[inicio, fin)` sin solapamiento temporal (`CA17`).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            onClick={() => navigate('/hospital/hospitalizaciones')}
            leftIcon={<BedDouble size={16} />}
          >
            Hospitalizaciones (H01)
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/hospital/hospitalizaciones/nueva')}
            leftIcon={<Plus size={16} />}
          >
            Nuevo Ingreso (H02)
          </Button>
        </div>
      </div>

      {/* Tarjetas de Resumen / KPIs de Camas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-selection)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total de Camas
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-strong)' }}>
                {totalCamas}
              </div>
            </div>
          </div>
        </Panel>

        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <User size={20} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Camas Ocupadas
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-strong)' }}>
                {ocupadas} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>({porcentajeOcupacion}%)</span>
              </div>
            </div>
          </div>
        </Panel>

        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Camas Disponibles
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#059669' }}>
                {disponibles}
              </div>
            </div>
          </div>
        </Panel>

        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Wrench size={20} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                En Mantenimiento
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#d97706' }}>
                {mantenimiento}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Controles de Búsqueda y Filtros */}
      <Panel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Buscador */}
            <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '240px' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Search size={16} />
              </div>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por código de cama, habitación, servicio o paciente..."
                aria-label="Buscar camas"
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-field)',
                  fontSize: '13px'
                }}
              />
            </div>

            {/* Selector de Piso */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="select-piso" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)' }}>
                Piso:
              </label>
              <select
                id="select-piso"
                value={filtroPiso}
                onChange={(e) => setFiltroPiso(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-field)',
                  fontSize: '13px'
                }}
              >
                <option value="TODOS">Todos los pisos</option>
                {pisosUnicos.map((p) => (
                  <option key={p} value={p.toString()}>
                    Piso {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Servicio */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="select-servicio" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)' }}>
                Servicio:
              </label>
              <select
                id="select-servicio"
                value={filtroServicio}
                onChange={(e) => setFiltroServicio(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-field)',
                  fontSize: '13px'
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

          {/* Filtros rápidos por estado */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={14} /> Estado:
            </span>
            {(['TODAS', 'DISPONIBLE', 'OCUPADA', 'MANTENIMIENTO'] as const).map((est) => (
              <button
                key={est}
                aria-label={`Filtro ${est}`}
                onClick={() => setFiltroEstado(est)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: '1px solid',
                  borderColor: filtroEstado === est ? 'var(--color-primary)' : 'var(--color-border)',
                  backgroundColor: filtroEstado === est ? 'var(--color-selection)' : 'var(--color-surface)',
                  color: filtroEstado === est ? 'var(--color-primary)' : 'var(--color-text-primary)',
                  fontSize: '12px',
                  fontWeight: filtroEstado === est ? 700 : 500,
                  cursor: 'pointer'
                }}
              >
                {est}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {/* Distribución de Camas agrupadas por Habitación */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SkeletonLoader height={140} />
          <SkeletonLoader height={140} />
        </div>
      ) : habitacionesMap.size === 0 ? (
        <Panel>
          <EmptyState
            title="No se encontraron camas"
            description="Ninguna cama coincide con los criterios de búsqueda o filtros seleccionados."
            actionText="Restablecer Filtros"
            onAction={() => {
              setBusqueda('');
              setFiltroEstado('TODAS');
              setFiltroPiso('TODOS');
              setFiltroServicio('TODOS');
            }}
          />
        </Panel>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {Array.from(habitacionesMap.entries()).map(([habNombre, listaCamas]) => {
            const primerCama = listaCamas[0];
            return (
              <Panel key={habNombre}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-divider)', paddingBottom: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--color-selection)',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Building2 size={16} />
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                        {habNombre}
                      </h2>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        Piso {primerCama.piso} • Servicio: <strong>{primerCama.salaServicio}</strong>
                      </div>
                    </div>
                  </div>

                  <Badge variant="neutral">{listaCamas.length} {listaCamas.length === 1 ? 'cama' : 'camas'}</Badge>
                </div>

                {/* Grid de camas en la habitación */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {listaCamas.map((cama) => (
                    <div
                      key={cama.id}
                      style={{
                        padding: '16px',
                        backgroundColor: cama.estado === 'OCUPADA' ? 'rgba(59, 130, 246, 0.03)' : 'var(--color-background)',
                        border: '1px solid',
                        borderColor:
                          cama.estado === 'OCUPADA'
                            ? 'var(--color-primary)'
                            : cama.estado === 'MANTENIMIENTO'
                            ? '#f59e0b'
                            : 'var(--color-border)',
                        borderRadius: 'var(--radius-field)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                            Cama {cama.codigoCama}
                          </span>
                          <Badge
                            variant={
                              cama.estado === 'DISPONIBLE'
                                ? 'success'
                                : cama.estado === 'OCUPADA'
                                ? 'primary'
                                : 'warning'
                            }
                          >
                            {cama.estado}
                          </Badge>
                        </div>

                        {cama.estado === 'OCUPADA' ? (
                          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>
                              Paciente Internado
                            </div>
                            <div style={{ fontWeight: 600, color: 'var(--color-strong)' }}>
                              {cama.pacienteActual}
                            </div>
                          </div>
                        ) : cama.estado === 'MANTENIMIENTO' ? (
                          <div style={{ fontSize: '12px', color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Wrench size={14} />
                            <span>Fuera de servicio para desinfección o reparación.</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle2 size={14} />
                            <span>Lista para asignación inmediata.</span>
                          </div>
                        )}
                      </div>

                      {/* Botones de acción operativa H04 */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid var(--color-divider)', paddingTop: '10px' }}>
                        {cama.estado === 'OCUPADA' && cama.hospitalizacionActivaId && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => navigate(`/hospital/hospitalizaciones/${cama.hospitalizacionActivaId}`)}
                              leftIcon={<Eye size={13} />}
                            >
                              Ver Ingreso
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleAbrirTraslado(cama)}
                              leftIcon={<ArrowRightLeft size={13} />}
                            >
                              Trasladar
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setCamaParaLiberar(cama);
                                setModalLiberarAbierto(true);
                              }}
                              leftIcon={<LogOut size={13} />}
                            >
                              Liberar
                            </Button>
                          </>
                        )}

                        {cama.estado === 'DISPONIBLE' && (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => navigate(`/hospital/hospitalizaciones/nueva?camaId=${cama.id}`)}
                              leftIcon={<Plus size={13} />}
                            >
                              Asignar Ingreso
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              aria-label={`Mantenimiento cama ${cama.codigoCama}`}
                              onClick={() => handleToggleMantenimiento(cama)}
                              leftIcon={<Wrench size={13} />}
                            >
                              Mantenimiento
                            </Button>
                          </>
                        )}

                        {cama.estado === 'MANTENIMIENTO' && (
                          <Button
                            size="sm"
                            variant="primary"
                            aria-label={`Habilitar cama ${cama.codigoCama}`}
                            onClick={() => handleToggleMantenimiento(cama)}
                            leftIcon={<CheckCircle2 size={13} />}
                          >
                            Habilitar Cama
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* Modal de Traslado H04 */}
      {modalTrasladoAbierto && hospParaTraslado && (
        <AsignarCamaModal
          isOpen={modalTrasladoAbierto}
          onClose={() => setModalTrasladoAbierto(false)}
          hospitalizacion={hospParaTraslado}
          camasDisponibles={camas}
          onConfirm={handleConfirmarTraslado}
        />
      )}

      {/* Modal para Liberar Cama H04 */}
      {modalLiberarAbierto && camaParaLiberar && (
        <Modal
          isOpen={modalLiberarAbierto}
          onClose={() => setModalLiberarAbierto(false)}
          title="Liberar Cama Hospitalaria (H04)"
          maxWidth="480px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', color: 'var(--color-strong)', lineHeight: 1.5 }}>
              ¿Está seguro de liberar la <strong>Cama {camaParaLiberar.codigoCama}</strong> ocupada actualmente por{' '}
              <strong>{camaParaLiberar.pacienteActual}</strong>?
            </div>

            <div
              style={{
                padding: '10px 12px',
                backgroundColor: 'var(--color-selection)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-field)',
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <ShieldCheck size={16} color="var(--color-primary)" />
              <span>
                La cama quedará en estado DISPONIBLE y la asignación registrará la fecha/hora de término semiabierta (CA17).
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Button variant="secondary" onClick={() => setModalLiberarAbierto(false)} disabled={liberando}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmarLiberarCama}
                disabled={liberando}
                leftIcon={<LogOut size={16} />}
              >
                {liberando ? 'Liberando...' : 'Confirmar Liberación de Cama'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
