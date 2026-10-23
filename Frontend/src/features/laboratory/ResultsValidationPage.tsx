import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileCheck2,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Search,
  RefreshCw
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { Alert } from '../../design-system/components/Alert';
import {
  ResultadoLaboratorio,
  OrdenLaboratorio
} from '../../services/types';
import { CorrectionRepetitionModal } from './components/CorrectionRepetitionModal';

export const ResultsValidationPage: React.FC = () => {
  const navigate = useNavigate();
  const { sesion } = useAuthSession();
  const { laboratoryRepository } = useServices();
  const institucionId = sesion?.institucionId || 'LABORATORIO_CLINICO';

  // Regla crítica CA13 / CA18: Verificación estricta de permiso
  const puedeValidar = sesion?.permisos.includes('resultados.validar') || false;

  const [ordenes, setOrdenes] = useState<OrdenLaboratorio[]>([]);
  const [todosResultados, setTodosResultados] = useState<ResultadoLaboratorio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [validando, setValidando] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState<'TODAS' | 'STAT' | 'URGENTE' | 'RUTINA'>('TODAS');

  const [resultadoSeleccionadoId, setResultadoSeleccionadoId] = useState<string | null>(null);
  const [modalCorrectionOpen, setModalCorrectionOpen] = useState(false);
  const [notaValidacion, setNotaValidacion] = useState('Resultados revisados técnicamente y validados conforme a las normas de control de calidad institucional.');
  const [colegiadoValidador, setColegiadoValidador] = useState(sesion?.colegiado || 'QB-3108');
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  const cargarDatos = async () => {
    setCargando(true);
    setErrorGlobal(null);
    try {
      const ords = await laboratoryRepository.obtenerBandeja(institucionId);
      setOrdenes(ords);

      // Obtener resultados de todas las órdenes
      const promesas = ords.map((o) => laboratoryRepository.obtenerResultadosPorOrden(institucionId, o.id));
      const resPorOrden = await Promise.all(promesas);
      const todos = resPorOrden.flat();
      setTodosResultados(todos);

      // Preseleccionar el primer resultado en BORRADOR si existe
      const primerBorrador = todos.find((r) => r.estado === 'BORRADOR');
      if (primerBorrador) {
        setResultadoSeleccionadoId(primerBorrador.id);
      } else if (todos.length > 0) {
        setResultadoSeleccionadoId(todos[0].id);
      }
    } catch (err: any) {
      setErrorGlobal(err?.message || 'Error cargando resultados para validación.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (puedeValidar) {
      cargarDatos();
    } else {
      setCargando(false);
    }
  }, [puedeValidar, institucionId]);

  // Filtrado de resultados pendientes de validación
  const resultadosFiltrados = useMemo(() => {
    return todosResultados
      .filter((r) => r.estado === 'BORRADOR')
      .filter((r) => {
        if (!filtroTexto.trim()) return true;
        const q = filtroTexto.toLowerCase();
        return (
          r.codigoOrden.toLowerCase().includes(q) ||
          r.pacienteNombre.toLowerCase().includes(q) ||
          r.nombrePrueba.toLowerCase().includes(q) ||
          r.codigoPrueba.toLowerCase().includes(q) ||
          r.codigoMuestra.toLowerCase().includes(q)
        );
      })
      .filter((r) => {
        if (filtroPrioridad === 'TODAS') return true;
        const ord = ordenes.find((o) => o.id === r.ordenId);
        return ord?.prioridad === filtroPrioridad;
      });
  }, [todosResultados, filtroTexto, filtroPrioridad, ordenes]);

  const resultadoSeleccionado = useMemo(() => {
    return todosResultados.find((r) => r.id === resultadoSeleccionadoId);
  }, [todosResultados, resultadoSeleccionadoId]);

  const ordenSeleccionada = useMemo(() => {
    if (!resultadoSeleccionado) return null;
    return ordenes.find((o) => o.id === resultadoSeleccionado.ordenId);
  }, [ordenes, resultadoSeleccionado]);

  const handleValidarResultado = async () => {
    if (!resultadoSeleccionado) return;
    setValidando(true);
    setErrorGlobal(null);
    setMensajeExito(null);

    try {
      const nombreValidador = sesion?.nombre || 'Lic. Kevin Estrada (Validador Técnico)';
      const validado = await laboratoryRepository.validarResultado(
        institucionId,
        resultadoSeleccionado.id,
        sesion?.cuentaId || 'usr-lab-val-01',
        `${nombreValidador} (Colegiado ${colegiadoValidador})`
      );

      setMensajeExito(
        `Resultado de «${validado.nombrePrueba}» para la orden ${validado.codigoOrden} validado y certificado con éxito.`
      );

      // Recargar lista
      await cargarDatos();
    } catch (err: any) {
      setErrorGlobal(err?.message || 'Error al validar el resultado analítico.');
    } finally {
      setValidando(false);
    }
  };

  // CASO DE ACCESO RESTRINGIDO (403): Sin permiso resultados.validar (CA13, CA18)
  if (!puedeValidar) {
    return (
      <div style={{ padding: '32px 24px', maxWidth: '800px', margin: '40px auto' }}>
        <Alert variant="danger" title="Acceso Denegado — Requiere Permiso de Validación (CA18)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              Su cuenta actual no cuenta con el permiso <code>resultados.validar</code>.
              Según la regla de integridad clínica y separación estricta de funciones (<strong>CA13</strong> y <strong>CA18</strong>),
              un analista técnico solo puede ingresar borradores en <code>L06</code>, y la certificación/firma pericial de resultados
              exige un profesional facultativo autorizado.
            </p>
            <div>
              <Button
                variant="secondary"
                onClick={() => navigate('/laboratorio/bandeja')}
              >
                <ArrowLeft size={16} style={{ marginRight: '8px' }} />
                Volver a la Bandeja de Laboratorio
              </Button>
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  if (cargando) {
    return (
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <SkeletonLoader variant="card" height={260} />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1300px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <nav aria-label="Ruta de navegación" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
        <Link to="/laboratorio/bandeja" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
          Bandeja de Laboratorio
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--color-strong)', fontWeight: 600 }}>Revisión y Validación de Resultados (L07)</span>
      </nav>

      {/* Encabezado */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--color-strong)' }}>
              Revisión y Validación de Resultados
            </h1>
            <Badge variant="primary">L07 — VALIDACIÓN</Badge>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            Certificación pericial de resultados analíticos previos a la emisión del informe oficial al paciente y médico solicitante.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="secondary"
            onClick={cargarDatos}
            aria-label="Actualizar resultados pendientes"
          >
            <RefreshCw size={16} style={{ marginRight: '6px' }} />
            Actualizar
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/laboratorio/bandeja')}
          >
            <ArrowLeft size={16} style={{ marginRight: '6px' }} />
            Volver a la Bandeja
          </Button>
        </div>
      </div>

      {mensajeExito && (
        <div style={{ marginBottom: '16px' }}>
          <Alert variant="success" title="Resultado Validado">
            {mensajeExito}
          </Alert>
        </div>
      )}

      {errorGlobal && (
        <div style={{ marginBottom: '16px' }}>
          <Alert variant="danger" title="Error en Validación">
            {errorGlobal}
          </Alert>
        </div>
      )}

      {/* Disposición en 2 Columnas (Maestro / Detalle) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(500px, 2fr)', gap: '20px', alignItems: 'start' }}>
        {/* Columna Izquierda: Cola de Resultados en Borrador */}
        <div>
          <Panel
            title="Resultados Pendientes de Firma"
            subtitle={`${resultadosFiltrados.length} análisis en espera de certificación`}
          >
            {/* Filtros */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Buscar por orden, paciente o prueba..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 32px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    fontSize: '12px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {(['TODAS', 'STAT', 'URGENTE', 'RUTINA'] as const).map((prio) => (
                  <button
                    key={prio}
                    type="button"
                    onClick={() => setFiltroPrioridad(prio)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: filtroPrioridad === prio ? 700 : 500,
                      borderRadius: '4px',
                      border: filtroPrioridad === prio ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                      backgroundColor: filtroPrioridad === prio ? 'var(--color-selection)' : 'transparent',
                      color: filtroPrioridad === prio ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    {prio}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de análisis candidatos */}
            {resultadosFiltrados.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                No hay resultados analíticos pendientes de validación en este momento.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto' }}>
                {resultadosFiltrados.map((res) => {
                  const esSeleccionado = res.id === resultadoSeleccionadoId;
                  const ord = ordenes.find((o) => o.id === res.ordenId);
                  const tieneCriticos = res.parametros.some((p) => p.alerta === 'CRITICO');

                  return (
                    <div
                      key={res.id}
                      onClick={() => setResultadoSeleccionadoId(res.id)}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: esSeleccionado ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                        backgroundColor: esSeleccionado
                          ? '#F0F7F5'
                          : tieneCriticos
                          ? '#FEF2F2'
                          : 'var(--color-surface, #ffffff)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: 'var(--color-primary)' }}>
                          {res.codigoOrden}
                        </span>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          {ord?.prioridad === 'STAT' && (
                            <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 5px', borderRadius: '4px', backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                              STAT
                            </span>
                          )}
                          <Badge variant="warning">BORRADOR v{res.version}</Badge>
                        </div>
                      </div>

                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-strong)' }}>
                        {res.nombrePrueba}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        Paciente: <strong>{res.pacienteNombre}</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                        <span>Analista: {res.analistaNombre}</span>
                        {tieneCriticos && (
                          <span style={{ color: '#B91C1C', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            <AlertTriangle size={12} /> Valor Crítico
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* Columna Derecha: Detalle Técnico del Resultado y Formulario de Validación */}
        <div>
          {resultadoSeleccionado ? (
            <Panel
              title={`Inspección Analítica: ${resultadoSeleccionado.nombrePrueba} (${resultadoSeleccionado.codigoPrueba})`}
              subtitle={`Serie: ${resultadoSeleccionado.serieResultadoId} · Versión: ${resultadoSeleccionado.version} · Muestra: ${resultadoSeleccionado.codigoMuestra}`}
            >
              {/* Resumen Clínico del Paciente */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  padding: '12px 14px',
                  backgroundColor: 'var(--color-background-alt)',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  fontSize: '12px',
                  marginBottom: '16px'
                }}
              >
                <div>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Paciente: </span>
                  <strong style={{ color: 'var(--color-strong)' }}>{resultadoSeleccionado.pacienteNombre}</strong>
                  <div style={{ color: 'var(--color-text-secondary)' }}>DPI: {resultadoSeleccionado.pacienteDpi}</div>
                </div>

                <div>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Orden Solicitada: </span>
                  <strong style={{ color: 'var(--color-strong)' }}>{resultadoSeleccionado.codigoOrden}</strong>
                  <div style={{ color: 'var(--color-text-secondary)' }}>Médico: {ordenSeleccionada?.medicoSolicitante}</div>
                </div>

                <div>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Equipo Analítico: </span>
                  <div style={{ fontWeight: 600, color: 'var(--color-strong)' }}>{resultadoSeleccionado.equipoAnalitico}</div>
                  <div style={{ color: 'var(--color-text-secondary)' }}>Método: {resultadoSeleccionado.metodoAnalitico}</div>
                </div>

                <div>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Analista de Corrida: </span>
                  <div style={{ fontWeight: 600, color: 'var(--color-strong)' }}>{resultadoSeleccionado.analistaNombre}</div>
                  <div style={{ color: 'var(--color-text-secondary)' }}>Fecha: {new Date(resultadoSeleccionado.fechaAnalisis).toLocaleString()}</div>
                </div>
              </div>

              {/* Alerta de valores críticos */}
              {resultadoSeleccionado.parametros.some((p) => p.alerta === 'CRITICO') && (
                <div style={{ marginBottom: '16px' }}>
                  <Alert variant="danger" title="Atención: Resultados Críticos / Valores de Pánico">
                    Este análisis contiene uno o más valores clasificados como CRÍTICOS. Como validador facultativo, verifique si se ejecutó la contramuestra o confirmación técnica antes de validar y certificar.
                  </Alert>
                </div>
              )}

              {/* Tabla de Parámetros Medidos */}
              <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-background-alt)' }}>
                      <th style={{ padding: '8px 10px', color: 'var(--color-text-secondary)' }}>Parámetro</th>
                      <th style={{ padding: '8px 10px', color: 'var(--color-text-secondary)' }}>Valor Medido</th>
                      <th style={{ padding: '8px 10px', color: 'var(--color-text-secondary)' }}>Unidad</th>
                      <th style={{ padding: '8px 10px', color: 'var(--color-text-secondary)' }}>Intervalo de Referencia</th>
                      <th style={{ padding: '8px 10px', color: 'var(--color-text-secondary)' }}>Evaluación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadoSeleccionado.parametros.map((param) => {
                      const esCritico = param.alerta === 'CRITICO';
                      const esFuera = param.alerta === 'ELEVADO' || param.alerta === 'DISMINUIDO';

                      return (
                        <tr
                          key={param.id}
                          style={{
                            borderBottom: '1px solid var(--color-border)',
                            backgroundColor: esCritico ? '#FEF2F2' : esFuera ? '#FFFBEB' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '10px' }}>
                            <strong style={{ color: 'var(--color-strong)' }}>{param.nombre}</strong>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginLeft: '6px', fontFamily: 'monospace' }}>
                              ({param.codigoParametro})
                            </span>
                          </td>
                          <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 700, fontSize: '14px', color: esCritico ? '#B91C1C' : 'var(--color-strong)' }}>
                            {param.valor}
                          </td>
                          <td style={{ padding: '10px', color: 'var(--color-text-secondary)' }}>
                            {param.unidad}
                          </td>
                          <td style={{ padding: '10px', color: 'var(--color-text-secondary)', fontFamily: 'monospace', fontSize: '12px' }}>
                            {param.rangoTexto}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <Badge
                              variant={
                                param.alerta === 'CRITICO'
                                  ? 'danger'
                                  : param.alerta === 'ELEVADO' || param.alerta === 'DISMINUIDO'
                                  ? 'warning'
                                  : 'success'
                              }
                            >
                              {param.alerta}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Observaciones del Analista */}
              {resultadoSeleccionado.observaciones && (
                <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-surface-hover, #F8FAFC)', borderRadius: '6px', border: '1px solid var(--color-border)', marginBottom: '16px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Observaciones del Analista: </span>
                  <em style={{ color: 'var(--color-strong)' }}>«{resultadoSeleccionado.observaciones}»</em>
                </div>
              )}

              {/* Formulario de Certificación y Firma Técnica */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  backgroundColor: '#EDF5F1',
                  border: '1px solid #D1E5DC',
                  marginBottom: '20px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <FileCheck2 size={18} style={{ color: 'var(--color-primary)' }} />
                  <strong style={{ color: 'var(--color-strong)', fontSize: '14px' }}>
                    Certificación Técnica y Dictamen Facultativo
                  </strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                      Profesional Validador
                    </label>
                    <input
                      type="text"
                      disabled
                      value={sesion?.nombre || 'Lic. Kevin Estrada (Validador Técnico)'}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        fontSize: '13px',
                        backgroundColor: 'var(--color-background-alt)'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                      Número de Colegiado / Registro
                    </label>
                    <input
                      type="text"
                      value={colegiadoValidador}
                      onChange={(e) => setColegiadoValidador(e.target.value)}
                      placeholder="Ej. QB-3108 / CMG-7819"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        fontSize: '13px',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                    Dictamen de Validación / Interpretación
                  </label>
                  <textarea
                    value={notaValidacion}
                    onChange={(e) => setNotaValidacion(e.target.value)}
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              {/* Botones de Validación */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/laboratorio/resultados/captura/${resultadoSeleccionado.ordenId}`)}
                    aria-label="Abrir captura o solicitar corrección"
                  >
                    <AlertTriangle size={15} style={{ marginRight: '6px' }} />
                    Editar en Captura (L06)
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setModalCorrectionOpen(true)}
                    aria-label="Abrir diálogo de corrección o repetición L08"
                  >
                    Corrección / Repetición (L08)
                  </Button>
                </div>

                <Button
                  variant="primary"
                  onClick={handleValidarResultado}
                  disabled={validando}
                  aria-label="Validar y Certificar Resultado"
                >
                  <CheckCircle2 size={16} style={{ marginRight: '6px' }} />
                  {validando ? 'Certificando...' : 'Validar y Certificar Resultado (L07)'}
                </Button>
              </div>

              {/* Modal de Corrección vs Repetición (L08) */}
              {modalCorrectionOpen && ordenSeleccionada && (
                <CorrectionRepetitionModal
                  isOpen={modalCorrectionOpen}
                  onClose={() => setModalCorrectionOpen(false)}
                  orden={ordenSeleccionada}
                  resultadoActual={resultadoSeleccionado}
                  todasLasVersiones={todosResultados.filter((r) => r.itemOrdenId === resultadoSeleccionado.itemOrdenId)}
                  onExito={(nuevo) => {
                    setMensajeExito(`Operación L08 completada: nueva versión/serie registrada (ID: ${nuevo.id}, Serie: ${nuevo.serieResultadoId}, Versión: v${nuevo.version}).`);
                    cargarDatos();
                  }}
                />
              )}
            </Panel>
          ) : (
            <Panel title="Detalle del Análisis">
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                Seleccione un análisis de la lista izquierda para revisar y validar sus parámetros.
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsValidationPage;
