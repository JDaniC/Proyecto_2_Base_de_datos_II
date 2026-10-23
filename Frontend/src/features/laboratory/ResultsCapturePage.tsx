import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
  Save,
  ShieldAlert,
  TestTube2,
  FileCheck2,
  Cpu
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { Alert } from '../../design-system/components/Alert';
import {
  OrdenLaboratorio,
  ResultadoLaboratorio,
  ParametroResultadoLab,
  ItemOrdenLab,
  MuestraLaboratorio
} from '../../services/types';
import {
  calcularAlertaParametro,
  obtenerParametrosDefecto
} from '../../mocks/mockLaboratoryRepository';

export const ResultsCapturePage: React.FC = () => {
  const { ordenId } = useParams<{ ordenId: string }>();
  const navigate = useNavigate();
  const { sesion } = useAuthSession();
  const { laboratoryRepository } = useServices();
  const institucionId = sesion?.institucionId || 'LABORATORIO_CLINICO';

  const [orden, setOrden] = useState<OrdenLaboratorio | null>(null);
  const [resultadosExistentes, setResultadosExistentes] = useState<ResultadoLaboratorio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  // Ítem de prueba actualmente seleccionado para capturar
  const [itemSeleccionadoId, setItemSeleccionadoId] = useState<string>('');

  // Formulario del resultado para el ítem seleccionado
  const [equipoAnalitico, setEquipoAnalitico] = useState('Cobas b 123 Gas Analyzer');
  const [metodoAnalitico, setMetodoAnalitico] = useState('Potenciometría y Amperometría Selectiva');
  const [loteReactivo, setLoteReactivo] = useState('LOTE-R2026-44');
  const [observaciones, setObservaciones] = useState('');
  const [parametrosForm, setParametrosForm] = useState<ParametroResultadoLab[]>([]);

  // Permisos
  const puedeValidar = sesion?.permisos.includes('resultados.validar') || false;
  const puedeAnalizar = sesion?.permisos.includes('resultados.analizar') || false;

  useEffect(() => {
    const cargarDatos = async () => {
      if (!ordenId) return;
      setCargando(true);
      setErrorGlobal(null);
      try {
        const ord = await laboratoryRepository.obtenerOrdenPorId(institucionId, ordenId);
        if (!ord) {
          setErrorGlobal('La orden de laboratorio solicitada no existe o no se encuentra.');
          return;
        }
        setOrden(ord);

        const res = await laboratoryRepository.obtenerResultadosPorOrden(institucionId, ord.id);
        setResultadosExistentes(res);

        if (ord.items.length > 0) {
          setItemSeleccionadoId(ord.items[0].id);
        }
      } catch (err: any) {
        setErrorGlobal(err?.message || 'Error al cargar información de la orden.');
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [ordenId, institucionId, laboratoryRepository]);

  // Cada vez que cambia el ítem seleccionado, sincronizar el formulario
  useEffect(() => {
    if (!orden || !itemSeleccionadoId) return;
    const item = orden.items.find((i) => i.id === itemSeleccionadoId);
    if (!item) return;

    // Buscar si ya existe resultado guardado
    const resExistente = resultadosExistentes.find(
      (r) => r.itemOrdenId === item.id && r.estado === 'BORRADOR'
    ) || resultadosExistentes.find((r) => r.itemOrdenId === item.id);

    if (resExistente) {
      setEquipoAnalitico(resExistente.equipoAnalitico);
      setMetodoAnalitico(resExistente.metodoAnalitico);
      setLoteReactivo(resExistente.loteReactivo || 'LOTE-R2026-44');
      setObservaciones(resExistente.observaciones || '');
      setParametrosForm(resExistente.parametros);
    } else {
      // Cargar parámetros por defecto del catálogo
      const defecto = obtenerParametrosDefecto(item.codigoPrueba);
      setParametrosForm(defecto);
      if (item.codigoPrueba.includes('GAS')) {
        setEquipoAnalitico('Cobas b 123 Gas Analyzer (Roche)');
        setMetodoAnalitico('Potenciometría / Amperometría Directa');
        setLoteReactivo('LOTE-GAS-2026-08');
      } else if (item.codigoPrueba.includes('BIO') || item.codigoPrueba.includes('ELEC')) {
        setEquipoAnalitico('Analizador Bioquímico Mindray BS-480');
        setMetodoAnalitico('Potenciometría Indirecta ISE y Fotometría Enzimática');
        setLoteReactivo('LOTE-BIO-2026-14');
      } else if (item.codigoPrueba.includes('HEM')) {
        setEquipoAnalitico('Contador Hematológico Sysmex XN-550');
        setMetodoAnalitico('Citometría de Flujo Fluorescente');
        setLoteReactivo('LOTE-HEM-2026-21');
      } else if (item.codigoPrueba.includes('MIC')) {
        setEquipoAnalitico('Sistema Automatizado VITEK 2 Compact');
        setMetodoAnalitico('Turbidimetría y Microdilución en Caldo');
        setLoteReactivo('LOTE-MIC-2026-03');
      } else {
        setEquipoAnalitico('Analizador Automatizado Multicanal');
        setMetodoAnalitico('Espectrofotometría Clínica');
        setLoteReactivo('LOTE-GEN-2026-01');
      }
      setObservaciones('');
    }
    setMensajeExito(null);
  }, [itemSeleccionadoId, orden, resultadosExistentes]);

  const itemActivo: ItemOrdenLab | undefined = useMemo(() => {
    return orden?.items.find((i) => i.id === itemSeleccionadoId);
  }, [orden, itemSeleccionadoId]);

  // Verificar estado preanalítico de las muestras de la orden
  const muestrasAceptadas = useMemo(() => {
    if (!orden) return [];
    return orden.muestras.filter((m) => m.estado === 'ACEPTADA' || m.estado === 'PROCESADA');
  }, [orden]);

  const hayMuestraApta = muestrasAceptadas.length > 0;
  const muestraPrincipal: MuestraLaboratorio | undefined = muestrasAceptadas[0];

  const handleCambioValorParametro = (paramId: string, nuevoValor: string) => {
    setParametrosForm((prev) =>
      prev.map((p) => {
        if (p.id !== paramId) return p;
        const alertaCalculada = calcularAlertaParametro(
          nuevoValor,
          p.rangoReferenciaMin,
          p.rangoReferenciaMax,
          p.valorPanicoMin,
          p.valorPanicoMax
        );
        return {
          ...p,
          valor: nuevoValor,
          alerta: alertaCalculada
        };
      })
    );
  };

  const conteoAlertas = useMemo(() => {
    let criticos = 0;
    let fueraRango = 0;
    let normales = 0;
    for (const p of parametrosForm) {
      if (p.alerta === 'CRITICO') criticos++;
      else if (p.alerta === 'ELEVADO' || p.alerta === 'DISMINUIDO') fueraRango++;
      else if (p.valor.trim() !== '') normales++;
    }
    return { criticos, fueraRango, normales, total: parametrosForm.length };
  }, [parametrosForm]);

  const handleGuardarBorrador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orden || !itemActivo) return;
    if (!hayMuestraApta || !muestraPrincipal) {
      setErrorGlobal('No se puede guardar el resultado analítico sin una muestra ACEPTADA o PROCESADA.');
      return;
    }

    setGuardando(true);
    setErrorGlobal(null);
    setMensajeExito(null);

    try {
      const resultadoGuardado = await laboratoryRepository.guardarResultadoBorrador(institucionId, {
        ordenId: orden.id,
        itemOrdenId: itemActivo.id,
        muestraId: muestraPrincipal.id,
        equipoAnalitico,
        metodoAnalitico,
        loteReactivo,
        parametros: parametrosForm.map((p) => ({
          parametroId: p.id,
          codigoParametro: p.codigoParametro,
          nombre: p.nombre,
          valor: p.valor,
          unidad: p.unidad,
          rangoReferenciaMin: p.rangoReferenciaMin,
          rangoReferenciaMax: p.rangoReferenciaMax,
          rangoTexto: p.rangoTexto,
          alerta: p.alerta,
          valorPanicoMin: p.valorPanicoMin,
          valorPanicoMax: p.valorPanicoMax
        })),
        observaciones,
        analistaId: sesion?.cuentaId || 'usr-lab-ana-01',
        analistaNombre: sesion?.nombre || 'Licda. Sofía Paniagua'
      });

      // Actualizar estado local
      const resActualizados = await laboratoryRepository.obtenerResultadosPorOrden(institucionId, orden.id);
      setResultadosExistentes(resActualizados);

      // Recargar orden para refrescar su estado (EN_ANALISIS / PARA_VALIDAR)
      const ordenActualizada = await laboratoryRepository.obtenerOrdenPorId(institucionId, orden.id);
      if (ordenActualizada) setOrden(ordenActualizada);

      setMensajeExito(
        `Resultados de «${itemActivo.nombrePrueba}» guardados exitosamente en estado BORRADOR (Serie: ${resultadoGuardado.serieResultadoId}, Versión ${resultadoGuardado.version}).`
      );
    } catch (err: any) {
      setErrorGlobal(err?.message || 'Error guardando resultados analíticos.');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <SkeletonLoader variant="card" height={220} />
      </div>
    );
  }

  if (errorGlobal && !orden) {
    return (
      <div style={{ padding: '24px', maxWidth: '800px', margin: '40px auto' }}>
        <Alert variant="danger" title="Error al cargar la orden">
          {errorGlobal}
        </Alert>
        <div style={{ marginTop: '16px' }}>
          <Button variant="secondary" onClick={() => navigate('/laboratorio/bandeja')}>
            <ArrowLeft size={16} style={{ marginRight: '8px' }} />
            Volver a la bandeja
          </Button>
        </div>
      </div>
    );
  }

  if (!orden) return null;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Breadcrumb de navegación */}
      <nav aria-label="Ruta de navegación" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
        <Link to="/laboratorio/bandeja" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
          Bandeja de Laboratorio
        </Link>
        <span>/</span>
        <Link to={`/laboratorio/ordenes/${orden.id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
          Orden {orden.codigoOrden}
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--color-strong)', fontWeight: 600 }}>Captura de Resultados (L06)</span>
      </nav>

      {/* Encabezado Principal */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--color-strong)' }}>
              Captura de Resultados Analíticos
            </h1>
            <Badge variant="neutral">L06 — BORRADOR</Badge>
          </div>
          <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            Orden <strong style={{ color: 'var(--color-strong)' }}>{orden.codigoOrden}</strong> · Paciente:{' '}
            <strong style={{ color: 'var(--color-strong)' }}>{orden.pacienteNombre}</strong> ({orden.pacienteEdad} años, {orden.pacienteSexo}) · Solicitante: {orden.medicoSolicitante}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="secondary"
            onClick={() => navigate(`/laboratorio/ordenes/${orden.id}`)}
          >
            <ArrowLeft size={16} style={{ marginRight: '6px' }} />
            Volver a la Orden
          </Button>
          {puedeValidar && (
            <Button
              variant="secondary"
              onClick={() => navigate('/laboratorio/resultados/validacion')}
            >
              <FileCheck2 size={16} style={{ marginRight: '6px' }} />
              Bandeja de Validación (L07)
            </Button>
          )}
        </div>
      </div>

      {/* Alerta de Éxito / Error */}
      {mensajeExito && (
        <div style={{ marginBottom: '16px' }}>
          <Alert variant="success" title="Borrador Registrado">
            {mensajeExito}
          </Alert>
        </div>
      )}

      {errorGlobal && (
        <div style={{ marginBottom: '16px' }}>
          <Alert variant="danger" title="Error en Captura de Resultados">
            {errorGlobal}
          </Alert>
        </div>
      )}

      {/* Verificación Preanalítica de Muestra (RF-016, CA06, CA12) */}
      {!hayMuestraApta ? (
        <div style={{ marginBottom: '20px' }}>
          <Alert variant="warning" title="Muestra pendiente o no apta para análisis">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ margin: 0 }}>
                Esta orden aún no cuenta con una muestra en estado <strong>ACEPTADA</strong> o <strong>PROCESADA</strong>.
                Según las buenas prácticas clínicas y la regla <code>CA12</code>, no se permite ingresar resultados analíticos sobre muestras en estado pendiente de toma, en tránsito o rechazadas.
              </p>
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/laboratorio/muestras')}
                >
                  <TestTube2 size={14} style={{ marginRight: '6px' }} />
                  Ir al Registro y Recepción de Muestras (L04)
                </Button>
              </div>
            </div>
          </Alert>
        </div>
      ) : (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#EDF5F1',
            border: '1px solid #D1E5DC',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TestTube2 size={18} style={{ color: 'var(--color-primary)' }} />
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>Muestra vinculada: </span>
              <strong style={{ color: 'var(--color-strong)' }}>{muestraPrincipal?.codigoMuestra}</strong>
              <span style={{ margin: '0 6px' }}>·</span>
              <span>{muestraPrincipal?.tipoMuestra} ({muestraPrincipal?.tuboContenedor})</span>
            </div>
          </div>
          <Badge variant="success">Muestra Aceptada</Badge>
        </div>
      )}

      {/* Selector de Pruebas de la Orden */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--color-border)', marginBottom: '20px', overflowX: 'auto' }}>
        {orden.items.map((item) => {
          const tieneResultado = resultadosExistentes.some((r) => r.itemOrdenId === item.id);
          const esActivo = item.id === itemSeleccionadoId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setItemSeleccionadoId(item.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                border: 'none',
                background: 'none',
                borderBottom: esActivo ? '3px solid var(--color-primary)' : '3px solid transparent',
                fontWeight: esActivo ? 700 : 500,
                color: esActivo ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: '13px'
              }}
            >
              <FlaskConical size={16} />
              <span>{item.nombrePrueba}</span>
              {tieneResultado ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', color: '#047857' }}>
                  <CheckCircle2 size={14} />
                </span>
              ) : (
                <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--color-background-alt)', color: 'var(--color-text-secondary)' }}>
                  Pendiente
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Formulario Principal de Captura */}
      {itemActivo && (
        <form onSubmit={handleGuardarBorrador}>
          {/* Ficha técnica del análisis */}
          <Panel
            title={`Parámetros de «${itemActivo.nombrePrueba}» (${itemActivo.codigoPrueba} v${itemActivo.versionPrueba})`}
            subtitle={`Sección: ${itemActivo.seccion} · Tipo de espécimen: ${itemActivo.tipoMuestra}`}
          >
            {/* Metadatos Analíticos: Equipo, Método, Lote y Analista */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
                padding: '16px',
                backgroundColor: 'var(--color-surface-hover, #F8FAFC)',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                marginBottom: '20px'
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  Equipo Analítico Automatizado
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={16} style={{ color: 'var(--color-primary)' }} />
                  <input
                    type="text"
                    value={equipoAnalitico}
                    onChange={(e) => setEquipoAnalitico(e.target.value)}
                    required
                    disabled={!hayMuestraApta}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  Método Analítico / Principio
                </label>
                <input
                  type="text"
                  value={metodoAnalitico}
                  onChange={(e) => setMetodoAnalitico(e.target.value)}
                  required
                  disabled={!hayMuestraApta}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  Lote de Reactivo / Cartucho
                </label>
                <input
                  type="text"
                  value={loteReactivo}
                  onChange={(e) => setLoteReactivo(e.target.value)}
                  required
                  disabled={!hayMuestraApta}
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

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                  Analista Responsable (Sesión)
                </label>
                <div style={{ padding: '8px 10px', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)' }}>
                  {sesion?.nombre || 'Licda. Sofía Paniagua (Química Bióloga)'}
                </div>
              </div>
            </div>

            {/* Alerta de valores críticos detectados */}
            {conteoAlertas.criticos > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <Alert variant="danger" title="¡Valores de Pánico / Críticos Detectados!">
                  Se han detectado {conteoAlertas.criticos} parámetro(s) con valores de alerta crítica.
                  Recuerde que ante un valor de pánico debe verificar de inmediato el procedimiento de notificación telefónica de urgencia al médico solicitante según la normativa institucional.
                </Alert>
              </div>
            )}

            {/* Tabla de Captura de Parámetros Dinámicos */}
            <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-background-alt)' }}>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', width: '28%' }}>Parámetro Analítico</th>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', width: '22%' }}>Valor Medido</th>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', width: '12%' }}>Unidad</th>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', width: '22%' }}>Rango de Referencia</th>
                    <th style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', width: '16%' }}>Alerta Clínica</th>
                  </tr>
                </thead>
                <tbody>
                  {parametrosForm.map((param) => {
                    const esCritico = param.alerta === 'CRITICO';
                    const esFueraRango = param.alerta === 'ELEVADO' || param.alerta === 'DISMINUIDO';

                    return (
                      <tr
                        key={param.id}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          backgroundColor: esCritico
                            ? '#FEF2F2'
                            : esFueraRango
                            ? '#FFFBEB'
                            : 'transparent'
                        }}
                      >
                        <td style={{ padding: '12px' }}>
                          <strong style={{ color: 'var(--color-strong)' }}>{param.nombre}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                            {param.codigoParametro}
                          </div>
                        </td>

                        <td style={{ padding: '12px' }}>
                          <input
                            type="text"
                            value={param.valor}
                            onChange={(e) => handleCambioValorParametro(param.id, e.target.value)}
                            placeholder="Ingrese medición..."
                            aria-label={`Valor para ${param.nombre}`}
                            disabled={!hayMuestraApta}
                            style={{
                              width: '100%',
                              maxWidth: '180px',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: esCritico
                                ? '2px solid #EF4444'
                                : esFueraRango
                                ? '1.5px solid #F59E0B'
                                : '1px solid var(--color-border)',
                              fontSize: '14px',
                              fontWeight: 600,
                              fontFamily: 'monospace',
                              backgroundColor: 'var(--color-surface, #ffffff)',
                              color: esCritico ? '#B91C1C' : 'var(--color-strong)'
                            }}
                          />
                        </td>

                        <td style={{ padding: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                          {param.unidad}
                        </td>

                        <td style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{param.rangoTexto}</span>
                          {(param.valorPanicoMin !== undefined || param.valorPanicoMax !== undefined) && (
                            <div style={{ fontSize: '11px', color: '#DC2626' }}>
                              Pánico: {param.valorPanicoMin ? `< ${param.valorPanicoMin} ` : ''}
                              {param.valorPanicoMax ? `> ${param.valorPanicoMax}` : ''}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '12px' }}>
                          {param.alerta === 'CRITICO' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: '#FEE2E2',
                                color: '#991B1B',
                                border: '1px solid #FCA5A5'
                              }}
                            >
                              <AlertTriangle size={12} /> CRÍTICO
                            </span>
                          ) : param.alerta === 'ELEVADO' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: '#FEF3C7',
                                color: '#92400E',
                                border: '1px solid #FCD34D'
                              }}
                            >
                              ↑ ELEVADO
                            </span>
                          ) : param.alerta === 'DISMINUIDO' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: '#E0F2FE',
                                color: '#0369A1',
                                border: '1px solid #BAE6FD'
                              }}
                            >
                              ↓ DISMINUIDO
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: '#ECFDF5',
                                color: '#047857',
                                border: '1px solid #A7F3D0'
                              }}
                            >
                              NORMAL
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Observaciones Técnicas del Analista */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}>
                Observaciones Analíticas / Comentarios de Validación Técnica Interna
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones de la corrida analítica, calibración del equipo, diluciones aplicadas o notas para el validador..."
                rows={3}
                disabled={!hayMuestraApta}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Separación de Funciones: Regla CA13 y CA18 */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-background-alt)',
                border: '1px solid var(--color-border)',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                fontSize: '13px'
              }}
            >
              <ShieldAlert size={20} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <strong style={{ color: 'var(--color-strong)' }}>
                  Separación de Responsabilidades y Seguridad Analítica (CA13, CA18)
                </strong>
                <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  Esta acción guarda los resultados exclusivamente en estado <strong>BORRADOR</strong>.
                  {!puedeValidar ? (
                    <span>
                      {' '}Usted cuenta con permiso de análisis (<code>resultados.analizar</code>). La certificación oficial e informe requieren validación independiente por un profesional facultativo autorizado (<code>resultados.validar</code>).
                    </span>
                  ) : (
                    <span>
                      {' '}Usted posee también el permiso de validación (<code>resultados.validar</code>). Podrá proceder a certificar estos resultados desde la bandeja de validación una vez guardado el borrador.
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Botones de Acción */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(`/laboratorio/ordenes/${orden.id}`)}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                variant="primary"
                disabled={!hayMuestraApta || guardando || !puedeAnalizar}
              >
                <Save size={16} style={{ marginRight: '6px' }} />
                {guardando ? 'Guardando Borrador...' : 'Guardar Resultados en Borrador'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </div>
  );
};
export default ResultsCapturePage;
