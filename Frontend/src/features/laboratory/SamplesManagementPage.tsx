import { Input } from '../../design-system/components/Input';
import { Modal } from '../../design-system/components/Modal';
import { Alert } from '../../design-system/components/Alert';
import { getErrorMessage } from '../../services/errors';
import { getDisplayLabel } from '../../services/displayLabels';
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TestTube2,
  Search,
  CheckCircle2,
  RotateCcw,
  History,
  Edit3
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Panel } from '../../design-system/components/Panel';
import { MetricStrip } from '../../design-system/components/MetricStrip';
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
  const [traslado, setTraslado] = useState<MuestraLaboratorio | null>(null);
  const [destino, setDestino] = useState('');
  const [muestraParaRechazar, setMuestraParaRechazar] = useState<MuestraLaboratorio | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [muestraParaRetoma, setMuestraParaRetoma] = useState<MuestraLaboratorio | null>(null);
  const [motivoRetoma, setMotivoRetoma] = useState('');

  // Trazabilidad y Rectificación (L05, CA12)
  const [muestraParaTrazabilidad, setMuestraParaTrazabilidad] = useState<MuestraLaboratorio | null>(null);
  const [mostrarFormRectificar, setMostrarFormRectificar] = useState(false);
  const [campoRectificar, setCampoRectificar] = useState<'tuboContenedor' | 'tipoMuestra'>('tuboContenedor');
  const [nuevoValorRectificar, setNuevoValorRectificar] = useState('');
  const [motivoRectificar, setMotivoRectificar] = useState('');
  const [guardandoRectificacion, setGuardandoRectificacion] = useState(false);

  const [notificacion, setNotificacion] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

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
    setErrorAccion(null);
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
      setNotificacion(`Muestra ${actualizada.codigoMuestra} actualizada a estado ${getDisplayLabel(nuevoEstado).toLowerCase()}.`);
      setTimeout(() => setNotificacion(null), 4000);
    } catch (err: unknown) {
      setErrorAccion(getErrorMessage(err, 'No se pudo actualizar la muestra. Inténtalo de nuevo.'));
    }
  };

  // Rechazo de muestra
  const handleConfirmarRechazo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!muestraParaRechazar) return;
    if (!motivoRechazo.trim()) { setErrorAccion('Escribe el motivo del rechazo.'); return; }

    setErrorAccion(null);
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
      setNotificacion(`Muestra ${rechazada.codigoMuestra} rechazada. Puedes registrar una nueva toma.`);
      setTimeout(() => setNotificacion(null), 4000);
    } catch (err: unknown) {
      setErrorAccion(getErrorMessage(err, 'No se pudo actualizar la muestra. Inténtalo de nuevo.'));
    }
  };

  // Registro de Retoma (CA12)
  const handleConfirmarRetoma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!muestraParaRetoma) return;
    if (!motivoRetoma.trim()) { setErrorAccion('Escribe el motivo de la nueva toma.'); return; }

    setErrorAccion(null);
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
    } catch (err: unknown) {
      setErrorAccion(getErrorMessage(err, 'No se pudo actualizar la muestra. Inténtalo de nuevo.'));
    }
  };

  const handleConfirmarRectificacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!muestraParaTrazabilidad || !nuevoValorRectificar.trim() || !motivoRectificar.trim()) return;

    setGuardandoRectificacion(true);
    setErrorAccion(null);
    try {
      const actor = sesion?.nombre || 'Analista de Calidad';
      const rectificada = await laboratoryRepository.rectificarDatoMuestra(
        institucionId,
        muestraParaTrazabilidad.id,
        campoRectificar,
        nuevoValorRectificar.trim(),
        motivoRectificar.trim(),
        actor
      );

      setMuestras((prev) => prev.map((m) => (m.id === rectificada.id ? rectificada : m)));
      setMuestraParaTrazabilidad(rectificada);
      setMostrarFormRectificar(false);
      setNuevoValorRectificar('');
      setMotivoRectificar('');
      setNotificacion(`Datos de la muestra ${rectificada.codigoMuestra} actualizados.`);
      setTimeout(() => setNotificacion(null), 4000);
    } catch (err: unknown) {
      setErrorAccion(getErrorMessage(err, 'No se pudo actualizar la muestra. Inténtalo de nuevo.'));
    } finally {
      setGuardandoRectificacion(false);
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
              Bandeja de Trabajo
            </Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <strong style={{ color: 'var(--color-strong)' }}>Muestras y Tomas</strong>
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
                Registro y Recepción de Muestras
              </h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Registra la toma, recepción y estado de cada muestra.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={() => navigate('/laboratorio/bandeja')}
        >
          Volver a Bandeja
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

      <MetricStrip
        label="Resumen de muestras"
        items={[
          { id: 'total', label: 'Total', value: metricas.total },
          { id: 'pendientes', label: 'Pendientes de toma', value: metricas.pendientesToma, tone: 'warning' },
          { id: 'tomadas', label: 'Por recibir', value: metricas.tomadas, tone: 'info' },
          { id: 'aceptadas', label: 'Aptas para análisis', value: metricas.aceptadas, tone: 'success' },
          { id: 'rechazadas', label: 'Rechazadas', value: metricas.rechazadas, tone: 'danger' },
        ]}
      />

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
                backgroundColor: 'var(--color-control)',
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
                backgroundColor: 'var(--color-control)',
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
              Revisa la toma, recepción, aceptación y rechazo de muestras.
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
                          <span className="table-identifier">{muestra.codigoMuestra}</span>
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
                        <span className="table-identifier">{muestra.codigoOrden}</span>
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
                            Registrar Retoma
                          </Button>
                        )}

                        {['TOMADA', 'RECIBIDA', 'ACEPTADA'].includes(muestra.estado) && <Button size="sm" variant="secondary" onClick={() => { setDestino(''); setTraslado(muestra); }}>Registrar traslado</Button>}
                        {muestra.estado === 'ACEPTADA' && <Button size="sm" variant="secondary" onClick={() => handleAvanzarEstado(muestra, 'PROCESADA')}>Registrar procesamiento</Button>}
                        {muestra.estado === 'ACEPTADA' && (
                          <span style={{ fontSize: '12px', color: '#047857', fontWeight: 600 }}>
                            Apta para análisis
                          </span>
                        )}

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setMuestraParaTrazabilidad(muestra);
                            setMostrarFormRectificar(false);
                          }}
                          aria-label={`Ver trazabilidad de ${muestra.codigoMuestra}`}
                        >
                          <History size={13} style={{ marginRight: '4px' }} />
                          Trazabilidad
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {traslado && <Modal isOpen onClose={() => setTraslado(null)} title="Registrar traslado de muestra" description={traslado.codigoMuestra}>
        <form style={{ display: 'flex', flexDirection: 'column', gap: 16 }} onSubmit={async e => { e.preventDefault(); try { const actualizada = await laboratoryRepository.registrarTrasladoMuestra(institucionId, traslado.id, destino, sesion!.nombre); setMuestras(prev => prev.map(m => m.id === actualizada.id ? actualizada : m)); setTraslado(null); setNotificacion('Traslado registrado.'); } catch (error) { setErrorAccion(getErrorMessage(error, 'No se pudo registrar el traslado.')); } }}>
          <Input label="Destino de la muestra" value={destino} onChange={e => setDestino(e.target.value)} required />
          {errorAccion && <Alert variant="danger">{errorAccion}</Alert>}
          <Button type="submit">Guardar traslado</Button>
        </form>
      </Modal>}
      {/* Modal Rechazar Muestra */}
      {muestraParaRechazar && (
        <Modal isOpen onClose={() => setMuestraParaRechazar(null)} title="Rechazar muestra" description={muestraParaRechazar.codigoMuestra}>
          <form noValidate onSubmit={handleConfirmarRechazo}>
              {errorAccion && <Alert variant="danger" style={{ marginBottom: '16px' }}>{errorAccion}</Alert>}
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                La orden permanece activa. Registra una nueva toma para continuar el análisis.
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
                  backgroundColor: 'var(--color-control)',
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
        </Modal>
      )}

      {/* Modal Registrar Retoma (CA12) */}
      {muestraParaRetoma && (
        <Modal isOpen onClose={() => setMuestraParaRetoma(null)} title="Registrar nueva toma de muestra" description={muestraParaRetoma.codigoMuestra}>
          <form noValidate onSubmit={handleConfirmarRetoma}>
              {errorAccion && <Alert variant="danger" style={{ marginBottom: '16px' }}>{errorAccion}</Alert>}
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                Se registrará una nueva muestra para la orden{' '}
                <strong><span className="table-identifier">{muestraParaRetoma.codigoOrden}</span></strong> para el paciente{' '}
                <strong>{muestraParaRetoma.pacienteNombre}</strong>.
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
                  backgroundColor: 'var(--color-control)',
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
                  Registrar nueva toma
                </Button>
              </div>
            </form>
        </Modal>
      )}

      {/* Modal Trazabilidad de Muestra y Eventos (L05) */}
      {muestraParaTrazabilidad && (
        <Modal
          isOpen
          onClose={() => setMuestraParaTrazabilidad(null)}
          title="Historial de la muestra"
          description={`${muestraParaTrazabilidad.codigoMuestra} · ${muestraParaTrazabilidad.codigoOrden}`}
          maxWidth="640px"
          footer={<Button variant="secondary" onClick={() => setMuestraParaTrazabilidad(null)}>Cerrar</Button>}
        >
          {errorAccion && <Alert variant="danger" style={{ marginBottom: '16px' }}>{errorAccion}</Alert>}
          {/* Ficha resumida de la muestra */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: 'var(--color-panel)',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                fontSize: '12px',
                marginBottom: '16px'
              }}
            >
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Paciente: </span>
                <strong>{muestraParaTrazabilidad.pacienteNombre}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Estado Actual: </span>
                <strong>{getDisplayLabel(muestraParaTrazabilidad.estado)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Contenedor: </span>
                <strong>{muestraParaTrazabilidad.tuboContenedor}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Tipo Muestra: </span>
                <strong>{muestraParaTrazabilidad.tipoMuestra}</strong>
              </div>
            </div>

            {/* Sub-formulario de rectificación administrativa */}
            <div style={{ marginBottom: '16px' }}>
              {!mostrarFormRectificar ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setMostrarFormRectificar(true)}
                  leftIcon={<Edit3 size={14} />}
                >
                  Rectificar Dato Administrativo
                </Button>
              ) : (
                <form
                  onSubmit={handleConfirmarRectificacion}
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-background-alt)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <strong style={{ fontSize: '13px', color: 'var(--color-strong)' }}>
                    Rectificación Auditada de Dato Preanalítico
                  </strong>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                        Campo a Rectificar
                      </label>
                      <select
                        value={campoRectificar}
                        onChange={(e) => setCampoRectificar(e.target.value as 'tuboContenedor' | 'tipoMuestra')}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--color-border)',
                          backgroundColor: 'var(--color-control)',
                          fontSize: '12px'
                        }}
                      >
                        <option value="tuboContenedor">Contenedor / Tubo</option>
                        <option value="tipoMuestra">Tipo de Muestra</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                        Nuevo Valor *
                      </label>
                      <input
                        type="text"
                        value={nuevoValorRectificar}
                        onChange={(e) => setNuevoValorRectificar(e.target.value)}
                        placeholder="Ej. Tubo Lila K2EDTA 4 mL"
                        required
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--color-border)',
                          backgroundColor: 'var(--color-control)',
                          fontSize: '12px'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                      Motivo / Justificación Obligatoria de Corrección *
                    </label>
                    <input
                      type="text"
                      value={motivoRectificar}
                      onChange={(e) => setMotivoRectificar(e.target.value)}
                      placeholder="Ej. Corrección por especificación exacta del volumen del tubo"
                      required
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-control)',
                        fontSize: '12px'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      type="button"
                      onClick={() => setMostrarFormRectificar(false)}
                      disabled={guardandoRectificacion}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      type="submit"
                      disabled={guardandoRectificacion}
                    >
                      {guardandoRectificacion ? 'Guardando...' : 'Guardar Rectificación'}
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Línea de tiempo de eventos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-strong)' }}>
                Eventos Cronológicos Registrados ({muestraParaTrazabilidad.eventosTrazabilidad.length})
              </div>

              {muestraParaTrazabilidad.eventosTrazabilidad
                .slice()
                .reverse()
                .map((evt, idx) => (
                  <div
                    key={evt.id || idx}
                    style={{
                      padding: '12px',
                      backgroundColor: 'var(--color-panel)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor:
                            evt.tipoEvento === 'ACEPTACION'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : evt.tipoEvento === 'RECHAZO'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : evt.tipoEvento === 'RECTIFICACION'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'var(--color-selection)',
                          color:
                            evt.tipoEvento === 'ACEPTACION'
                              ? '#047857'
                              : evt.tipoEvento === 'RECHAZO'
                              ? '#B91C1C'
                              : evt.tipoEvento === 'RECTIFICACION'
                              ? '#B45309'
                              : 'var(--color-primary)'
                        }}
                      >
                        {getDisplayLabel(evt.tipoEvento)}
                      </span>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>
                        {new Date(evt.fechaHora).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ color: 'var(--color-strong)', fontWeight: 500 }}>
                      {evt.detalle}
                    </div>

                    <div style={{ marginTop: '2px', color: 'var(--color-text-secondary)' }}>
                      Actor: <strong>{evt.actor}</strong>
                    </div>

                    {evt.motivo && (
                      <div style={{ marginTop: '4px', fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
                        Motivo: «{evt.motivo}»
                      </div>
                    )}
                  </div>
                ))}
            </div>
        </Modal>
      )}
    </div>
  );
};
