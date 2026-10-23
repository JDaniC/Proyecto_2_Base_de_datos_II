import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TestTube2,
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
  X
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import {
  MuestraLaboratorio,
  EstadoMuestraLaboratorio
} from '../../services/types';

export const SamplesManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { sesion } = useAuthSession();
  const { laboratoryRepository } = useServices();
  const institucionId = sesion?.institucionId || 'LABORATORIO_CLINICO';

  const [muestras, setMuestras] = useState<MuestraLaboratorio[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoMuestraLaboratorio | 'TODOS'>('TODOS');

  // Modales
  const [muestraParaRechazar, setMuestraParaRechazar] = useState<MuestraLaboratorio | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('Hemólisis severa grado 3 (interferencia analítica)');
  const [muestraParaRetoma, setMuestraParaRetoma] = useState<MuestraLaboratorio | null>(null);
  const [motivoRetoma, setMotivoRetoma] = useState('Retoma requerida por muestra coagulada al ingreso');

  const [notificacion, setNotificacion] = useState<string | null>(null);

  const cargarMuestras = async () => {
    setCargando(true);
    try {
      const data = await laboratoryRepository.obtenerMuestras(institucionId);
      setMuestras(data);
    } catch {
      // Fallback
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarMuestras();
  }, [institucionId, laboratoryRepository]);

  // Contadores
  const metricas = useMemo(() => {
    const total = muestras.length;
    const pendientesToma = muestras.filter((m) => m.estado === 'PENDIENTE_TOMA').length;
    const tomadas = muestras.filter((m) => m.estado === 'TOMADA').length;
    const recibidas = muestras.filter((m) => m.estado === 'RECIBIDA').length;
    const aceptadas = muestras.filter((m) => m.estado === 'ACEPTADA' || m.estado === 'PROCESADA').length;
    const rechazadas = muestras.filter((m) => m.estado === 'RECHAZADA').length;
    return { total, pendientesToma, tomadas, recibidas, aceptadas, rechazadas };
  }, [muestras]);

  // Filtrado
  const muestrasFiltradas = useMemo(() => {
    let list = [...muestras];
    if (filtroEstado !== 'TODOS') {
      list = list.filter((m) => m.estado === filtroEstado);
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      list = list.filter(
        (m) =>
          m.codigoMuestra.toLowerCase().includes(q) ||
          m.codigoOrden.toLowerCase().includes(q) ||
          m.pacienteNombre.toLowerCase().includes(q) ||
          m.tuboContenedor.toLowerCase().includes(q)
      );
    }
    return list;
  }, [muestras, filtroEstado, busqueda]);

  // Acciones de transición de estado
  const handleAvanzarEstado = async (
    muestra: MuestraLaboratorio,
    nuevoEstado: EstadoMuestraLaboratorio
  ) => {
    try {
      const actor = sesion?.nombre || 'Personal de Laboratorio';
      const actualizada = await laboratoryRepository.actualizarEstadoMuestra(
        institucionId,
        muestra.id,
        nuevoEstado,
        undefined,
        actor
      );

      setMuestras((prev) => prev.map((m) => (m.id === actualizada.id ? actualizada : m)));
      setNotificacion(`Muestra ${actualizada.codigoMuestra} actualizada a estado ${nuevoEstado}.`);
      setTimeout(() => setNotificacion(null), 4000);
    } catch {
      // ignore
    }
  };

  // Rechazo de muestra
  const handleConfirmarRechazo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!muestraParaRechazar) return;

    try {
      const actor = sesion?.nombre || 'Analista de Recepción';
      const rechazada = await laboratoryRepository.actualizarEstadoMuestra(
        institucionId,
        muestraParaRechazar.id,
        'RECHAZADA',
        motivoRechazo,
        actor
      );

      setMuestras((prev) => prev.map((m) => (m.id === rechazada.id ? rechazada : m)));
      setMuestraParaRechazar(null);
      setNotificacion(`Muestra ${rechazada.codigoMuestra} marcada como RECHAZADA. Puede solicitar retoma.`);
      setTimeout(() => setNotificacion(null), 4000);
    } catch {
      // ignore
    }
  };

  // Registro de Retoma (CA12)
  const handleConfirmarRetoma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!muestraParaRetoma) return;

    try {
      const actor = sesion?.nombre || 'Supervisor de Laboratorio';
      const retoma = await laboratoryRepository.registrarRetomaMuestra(
        institucionId,
        muestraParaRetoma.id,
        motivoRetoma,
        actor
      );

      setMuestras((prev) => [retoma, ...prev]);
      setMuestraParaRetoma(null);
      setNotificacion(`Retoma ${retoma.codigoMuestra} generada exitosamente vinculada a la orden ${retoma.codigoOrden}.`);
      setTimeout(() => setNotificacion(null), 4000);
    } catch {
      // ignore
    }
  };

  const renderBadgeMuestra = (estado: EstadoMuestraLaboratorio) => {
    switch (estado) {
      case 'PENDIENTE_TOMA':
        return <Badge variant="neutral">PENDIENTE TOMA</Badge>;
      case 'TOMADA':
        return <Badge variant="warning">TOMADA</Badge>;
      case 'RECIBIDA':
        return <Badge variant="info">RECIBIDA EN LAB</Badge>;
      case 'ACEPTADA':
        return <Badge variant="success">ACEPTADA (APTA)</Badge>;
      case 'PROCESADA':
        return <Badge variant="primary">PROCESADA</Badge>;
      case 'RECHAZADA':
        return <Badge variant="danger">RECHAZADA</Badge>;
      default:
        return <Badge variant="neutral">{estado}</Badge>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <nav aria-label="Ruta de navegación" style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
            <Link to="/laboratorio/bandeja" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
              Bandeja de Trabajo (L01)
            </Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <strong style={{ color: 'var(--color-strong)' }}>Muestras y Tomas (L04)</strong>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-selection)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <TestTube2 size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--color-strong)' }}>
                Registro y Recepción de Muestras (L04)
              </h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Cadena de custodia preanalítica: toma, recepción, criterios de aceptación, rechazos y retomas (CA12)
              </p>
            </div>
            <Badge variant="primary">{sesion?.institucionNombre || 'Laboratorio Clínico Central'}</Badge>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={() => navigate('/laboratorio/bandeja')}
        >
          Volver a Bandeja (L01)
        </Button>
      </div>

      {/* Alerta de notificación */}
      {notificacion && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-selection)',
            border: '1px solid var(--color-primary)',
            borderRadius: '8px',
            color: 'var(--color-primary)',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={16} />
          <span>{notificacion}</span>
        </div>
      )}

      {/* Tira de Métricas Preanalíticas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px'
        }}
      >
        <div style={{ backgroundColor: 'var(--color-surface, #ffffff)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Total Muestras</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-strong)', marginTop: '4px' }}>{metricas.total}</div>
        </div>

        <div style={{ backgroundColor: 'var(--color-surface, #ffffff)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400E' }}>Pendientes de Flebotomía</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>{metricas.pendientesToma}</div>
        </div>

        <div style={{ backgroundColor: 'var(--color-surface, #ffffff)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)' }}>En Tránsito / Por Recibir</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)', marginTop: '4px' }}>{metricas.tomadas}</div>
        </div>

        <div style={{ backgroundColor: 'var(--color-surface, #ffffff)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#047857' }}>Aceptadas y Aptas</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>{metricas.aceptadas}</div>
        </div>

        <div style={{ backgroundColor: 'var(--color-surface, #ffffff)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#991B1B' }}>Rechazadas (CA12)</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>{metricas.rechazadas}</div>
        </div>
      </div>

      {/* Filtros */}
      <Panel>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
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
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por código de muestra (MUE-...), orden o paciente..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 'var(--radius-input)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-input-bg)',
                fontSize: '13px'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Estado:</span>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as EstadoMuestraLaboratorio | 'TODOS')}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-input)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-input-bg)',
                fontSize: '13px'
              }}
            >
              <option value="TODOS">Todos los estados</option>
              <option value="PENDIENTE_TOMA">Pendiente Toma</option>
              <option value="TOMADA">Tomada</option>
              <option value="RECIBIDA">Recibida en Lab</option>
              <option value="ACEPTADA">Aceptada</option>
              <option value="RECHAZADA">Rechazada</option>
              <option value="PROCESADA">Procesada</option>
            </select>
          </div>
        </div>
      </Panel>

      {/* Tabla de Muestras */}
      <Panel>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
              Control Preanalítico de Muestras ({muestrasFiltradas.length})
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>
              Gestión de ciclo de vida, trazabilidad unívoca y registro de retomas
            </p>
          </div>
        </div>

        {cargando ? (
          <SkeletonLoader variant="rectangular" height="240px" />
        ) : muestrasFiltradas.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <TestTube2 size={32} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No se encontraron muestras para el criterio seleccionado.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 10px', color: 'var(--color-text-secondary)' }}>Muestra</th>
                  <th style={{ padding: '12px 10px', color: 'var(--color-text-secondary)' }}>Orden Enlazada</th>
                  <th style={{ padding: '12px 10px', color: 'var(--color-text-secondary)' }}>Paciente</th>
                  <th style={{ padding: '12px 10px', color: 'var(--color-text-secondary)' }}>Tipo / Contenedor</th>
                  <th style={{ padding: '12px 10px', color: 'var(--color-text-secondary)' }}>Estado</th>
                  <th style={{ padding: '12px 10px', color: 'var(--color-text-secondary)' }}>Cadena de Custodia</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Transición de Estado</th>
                </tr>
              </thead>
              <tbody>
                {muestrasFiltradas.map((muestra) => (
                  <tr key={muestra.id} style={{ borderBottom: '1px solid var(--color-divider)' }}>
                    {/* Código Muestra */}
                    <td style={{ padding: '12px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: 'var(--color-strong)' }}>
                          {muestra.codigoMuestra}
                        </span>
                        {muestra.esRetoma && (
                          <span style={{ fontSize: '10px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#92400E' }}>
                            RETOMA
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Orden */}
                    <td style={{ padding: '12px 10px' }}>
                      <Link
                        to={`/laboratorio/ordenes/${muestra.ordenId}`}
                        style={{ fontFamily: 'monospace', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        {muestra.codigoOrden}
                      </Link>
                    </td>

                    {/* Paciente */}
                    <td style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--color-strong)' }}>
                      {muestra.pacienteNombre}
                    </td>

                    {/* Tipo / Contenedor */}
                    <td style={{ padding: '12px 10px' }}>
                      <div style={{ color: 'var(--color-strong)', fontWeight: 500 }}>{muestra.tuboContenedor}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{muestra.tipoMuestra}</div>
                    </td>

                    {/* Estado */}
                    <td style={{ padding: '12px 10px' }}>
                      {renderBadgeMuestra(muestra.estado)}
                      {muestra.motivoRechazo && (
                        <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '3px' }}>
                          Causa: {muestra.motivoRechazo}
                        </div>
                      )}
                    </td>

                    {/* Custodia */}
                    <td style={{ padding: '12px 10px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {muestra.tomadaPor ? (
                        <div>Toma: {muestra.tomadaPor}</div>
                      ) : (
                        <em>Sin flebotomista asignado</em>
                      )}
                      {muestra.recibidaPor && <div>Recepción: {muestra.recibidaPor}</div>}
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {muestra.estado === 'PENDIENTE_TOMA' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleAvanzarEstado(muestra, 'TOMADA')}
                          >
                            Registrar Toma
                          </Button>
                        )}

                        {muestra.estado === 'TOMADA' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleAvanzarEstado(muestra, 'RECIBIDA')}
                          >
                            Recibir en Lab
                          </Button>
                        )}

                        {muestra.estado === 'RECIBIDA' && (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleAvanzarEstado(muestra, 'ACEPTADA')}
                            >
                              Aceptar Muestra
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => setMuestraParaRechazar(muestra)}
                            >
                              Rechazar
                            </Button>
                          </>
                        )}

                        {muestra.estado === 'RECHAZADA' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setMuestraParaRetoma(muestra)}
                            leftIcon={<RotateCcw size={14} />}
                          >
                            Registrar Retoma (CA12)
                          </Button>
                        )}

                        {muestra.estado === 'ACEPTADA' && (
                          <span style={{ fontSize: '12px', color: '#047857', fontWeight: 600 }}>
                            Apta para análisis
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Modal Rechazar Muestra */}
      {muestraParaRechazar && (
        <div
          role="dialog"
          aria-modal="true"
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
              maxWidth: '520px',
              padding: '20px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid var(--color-border)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626' }}>
                <XCircle size={22} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                  Rechazo de Muestra ({muestraParaRechazar.codigoMuestra})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMuestraParaRechazar(null)}
                aria-label="Cerrar modal"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmarRechazo}>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                Rechazar una muestra no cancela la orden general, sino que habilita el protocolo de retoma controlada (CA12).
              </p>

              <label
                htmlFor="motivo-rechazo"
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
              >
                Motivo / Criterio Preanalítico de Rechazo *
              </label>
              <select
                id="motivo-rechazo"
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-input)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-input-bg)',
                  fontSize: '13px',
                  marginBottom: '16px'
                }}
              >
                <option value="Hemólisis severa grado 3 (interferencia analítica)">Hemólisis severa grado 3 (interferencia analítica)</option>
                <option value="Muestra coagulada en tubo con anticoagulante">Muestra coagulada en tubo con anticoagulante</option>
                <option value="Volumen insuficiente (relación sangre/anticoagulante inadecuada)">Volumen insuficiente (relación sangre/anticoagulante inadecuada)</option>
                <option value="Contenedor inapropiado o tapa abierta">Contenedor inapropiado o tapa abierta</option>
                <option value="Rótulo ilegible o discordancia con orden médica">Rótulo ilegible o discordancia con orden médica</option>
              </select>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button variant="secondary" type="button" onClick={() => setMuestraParaRechazar(null)}>
                  Cancelar
                </Button>
                <Button variant="danger" type="submit">
                  Confirmar Rechazo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Retoma (CA12) */}
      {muestraParaRetoma && (
        <div
          role="dialog"
          aria-modal="true"
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
              maxWidth: '520px',
              padding: '20px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid var(--color-border)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D97706' }}>
                <RotateCcw size={22} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                  Registrar Retoma de Muestra (CA12)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMuestraParaRetoma(null)}
                aria-label="Cerrar modal"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmarRetoma}>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                Se generará un <strong>nuevo documento de muestra unívoco</strong> vinculado a la orden{' '}
                <strong>{muestraParaRetoma.codigoOrden}</strong> para el paciente{' '}
                <strong>{muestraParaRetoma.pacienteNombre}</strong>, manteniendo la trazabilidad histórica completa.
              </p>

              <label
                htmlFor="motivo-retoma"
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
              >
                Motivo / Justificación de la Retoma *
              </label>
              <textarea
                id="motivo-retoma"
                rows={3}
                value={motivoRetoma}
                onChange={(e) => setMotivoRetoma(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-input)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-input-bg)',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  marginBottom: '16px'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button variant="secondary" type="button" onClick={() => setMuestraParaRetoma(null)}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit">
                  Generar Retoma Unívoca
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
