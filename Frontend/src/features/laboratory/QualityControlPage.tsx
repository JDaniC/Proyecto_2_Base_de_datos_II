import React, { useState, useEffect } from 'react';
import {
  Activity,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import {
  EquipoLaboratorio,
  RegistroControlCalidad,
  EstadoEquipoLaboratorio,
  EvaluacionControlCalidad,
  NivelControlCalidad
} from '../../services/types';

export const QualityControlPage: React.FC = () => {
  const { sesion } = useAuthSession();
  const { laboratoryRepository } = useServices();
  const institucionId = sesion?.institucionId || 'LABORATORIO_CLINICO';

  const [activeTab, setActiveTab] = useState<'controles' | 'equipos'>('controles');
  const [loading, setLoading] = useState(true);
  const [notificacion, setNotificacion] = useState<string | null>(null);

  // Datos
  const [equipos, setEquipos] = useState<EquipoLaboratorio[]>([]);
  const [controles, setControles] = useState<RegistroControlCalidad[]>([]);

  // Filtros
  const [filtroEquipo, setFiltroEquipo] = useState<string>('TODOS');
  const [filtroEvaluacion, setFiltroEvaluacion] = useState<EvaluacionControlCalidad | 'TODOS'>('TODOS');
  const [busqueda, setBusqueda] = useState<string>('');

  // Modales
  const [showModalQC, setShowModalQC] = useState(false);
  const [showModalEquipo, setShowModalEquipo] = useState(false);

  // Formulario nuevo QC
  const [qcEquipoId, setQcEquipoId] = useState('');
  const [qcPruebaId, setQcPruebaId] = useState('lab-trop-01');
  const [qcParametroId, setQcParametroId] = useState('p-inm-01');
  const [qcLoteControl, setQcLoteControl] = useState('PreciControl Lote 9021');
  const [qcNivel, setQcNivel] = useState<NivelControlCalidad>('NIVEL_1_NORMAL');
  const [qcValorMedido, setQcValorMedido] = useState('0.026');
  const [qcObservaciones, setQcObservaciones] = useState('');
  const [guardandoQC, setGuardandoQC] = useState(false);
  const [errorQC, setErrorQC] = useState<string | null>(null);

  // Formulario nuevo Equipo
  const [eqCodigo, setEqCodigo] = useState('');
  const [eqNombre, setEqNombre] = useState('');
  const [eqModelo, setEqModelo] = useState('');
  const [eqSerie, setEqSerie] = useState('');
  const [eqSeccion, setEqSeccion] = useState('Inmunología Clínica');
  const [eqFabricante, setEqFabricante] = useState('');
  const [eqNotas, setEqNotas] = useState('');
  const [guardandoEquipo, setGuardandoEquipo] = useState(false);
  const [errorEquipo, setErrorEquipo] = useState<string | null>(null);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [eqs, qcs] = await Promise.all([
        laboratoryRepository.obtenerEquipos(institucionId),
        laboratoryRepository.obtenerControlesCalidad(institucionId)
      ]);
      setEquipos(eqs);
      setControles(qcs);
      if (eqs.length > 0 && !qcEquipoId) {
        setQcEquipoId(eqs[0].id);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [institucionId]);

  // Manejador registrar corrida QC
  const handleGuardarQC = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorQC(null);

    const valNum = parseFloat(qcValorMedido);
    if (isNaN(valNum) || valNum <= 0) {
      setErrorQC('El valor analítico medido debe ser un número positivo válido.');
      return;
    }

    if (!qcLoteControl.trim()) {
      setErrorQC('Debe especificar el código de lote del material de control.');
      return;
    }

    setGuardandoQC(true);
    try {
      const analista = {
        id: sesion?.cuentaId || 'usr-lab-analista',
        nombre: sesion?.nombre || 'Lic. Analista de Laboratorio'
      };

      const nuevoQC = await laboratoryRepository.registrarControlCalidad(
        institucionId,
        {
          equipoId: qcEquipoId,
          pruebaId: qcPruebaId,
          parametroId: qcParametroId,
          loteMaterialControl: qcLoteControl.trim(),
          nivelControl: qcNivel,
          valorMedido: valNum,
          observaciones: qcObservaciones.trim() || undefined
        },
        analista
      );

      setControles((prev) => [nuevoQC, ...prev]);
      setShowModalQC(false);
      setNotificacion(
        `Corrida de control ${nuevoQC.codigoCorrida} registrada con evaluación: ${nuevoQC.evaluacion} (Z-Score: ${nuevoQC.zScore}).`
      );
      setTimeout(() => setNotificacion(null), 5000);
    } catch (err: unknown) {
      setErrorQC(err instanceof Error ? err.message : 'Error al registrar corrida de calidad.');
    } finally {
      setGuardandoQC(false);
    }
  };

  // Manejador registrar equipo
  const handleGuardarEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorEquipo(null);

    if (!eqCodigo.trim() || !eqNombre.trim() || !eqFabricante.trim()) {
      setErrorEquipo('Código, nombre del equipo y fabricante son campos obligatorios.');
      return;
    }

    setGuardandoEquipo(true);
    try {
      const ahora = new Date().toISOString();
      const proxima = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const nuevoEq = await laboratoryRepository.registrarEquipo(institucionId, {
        codigo: eqCodigo.trim().toUpperCase(),
        nombre: eqNombre.trim(),
        modelo: eqModelo.trim() || 'Estándar',
        numeroSerie: eqSerie.trim() || `SN-${Date.now()}`,
        seccion: eqSeccion,
        fabricante: eqFabricante.trim(),
        estado: 'OPERATIVO',
        fechaInstalacion: ahora,
        ultimaCalibracion: ahora,
        proximaCalibracion: proxima,
        notas: eqNotas.trim() || undefined
      });

      setEquipos((prev) => [...prev, nuevoEq]);
      setShowModalEquipo(false);
      setNotificacion(`Equipo ${nuevoEq.nombre} registrado exitosamente con estado OPERATIVO.`);
      setTimeout(() => setNotificacion(null), 5000);
    } catch (err: unknown) {
      setErrorEquipo(err instanceof Error ? err.message : 'Error al registrar equipo.');
    } finally {
      setGuardandoEquipo(false);
    }
  };

  // Manejador cambiar estado de equipo
  const handleCambiarEstadoEquipo = async (equipoId: string, nuevoEstado: EstadoEquipoLaboratorio) => {
    try {
      const actualizado = await laboratoryRepository.cambiarEstadoEquipo(institucionId, equipoId, nuevoEstado);
      setEquipos((prev) => prev.map((eq) => (eq.id === actualizado.id ? actualizado : eq)));
      setNotificacion(`Estado del equipo ${actualizado.nombre} actualizado a ${nuevoEstado}.`);
      setTimeout(() => setNotificacion(null), 5000);
    } catch {
      setNotificacion('Error al cambiar estado del equipo.');
    }
  };

  // Filtrado de controles
  const controlesFiltrados = controles.filter((c) => {
    if (filtroEquipo !== 'TODOS' && c.equipoId !== filtroEquipo) return false;
    if (filtroEvaluacion !== 'TODOS' && c.evaluacion !== filtroEvaluacion) return false;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const match =
        c.codigoCorrida.toLowerCase().includes(q) ||
        c.pruebaNombre.toLowerCase().includes(q) ||
        c.equipoNombre.toLowerCase().includes(q) ||
        c.loteMaterialControl.toLowerCase().includes(q) ||
        c.analistaNombre.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Métricas
  const totalCorridas = controles.length;
  const corridasAceptadas = controles.filter((c) => c.evaluacion === 'ACEPTADO').length;
  const corridasAdvertencia = controles.filter((c) => c.evaluacion === 'ADVERTENCIA').length;
  const corridasRechazadas = controles.filter((c) => c.evaluacion === 'RECHAZADO').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Breadcrumb */}
      <nav aria-label="Ruta de navegación" style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        <span>Inicio</span>
        <span style={{ margin: '0 8px' }}>/</span>
        <span>Laboratorio</span>
        <span style={{ margin: '0 8px' }}>/</span>
        <strong style={{ color: 'var(--color-strong)' }}>Equipos y Control de Calidad Analítico (L11)</strong>
      </nav>

      {/* Alerta de notificación */}
      {notificacion && (
        <div
          role="status"
          style={{
            backgroundColor: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            border: '1px solid var(--color-success-border)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-input)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={16} />
          <span>{notificacion}</span>
        </div>
      )}

      {/* Encabezado y acciones principales */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--color-strong)',
                letterSpacing: '-0.3px'
              }}
            >
              Control de Calidad Analítico y Estado de Equipos (L11)
            </h1>
            <Badge variant="primary">Reglas de Westgard</Badge>
          </div>
          <p
            style={{
              margin: '8px 0 0 0',
              fontSize: '14px',
              color: 'var(--color-text-secondary)',
              maxWidth: '820px',
              lineHeight: 1.5
            }}
          >
            Gestión integral del control de calidad interno (IQC), registro de mediciones analíticas, límites históricos
            aplicados (±2SD, ±3SD), trazabilidad por equipo y monitoreo de calibraciones instrumentales.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="secondary"
            onClick={() => setShowModalEquipo(true)}
            leftIcon={<Cpu size={16} />}
          >
            Registrar Equipo
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowModalQC(true)}
            leftIcon={<Plus size={16} />}
          >
            Nueva Corrida QC (L11)
          </Button>
        </div>
      </div>

      {/* Tarjetas KPI de Calidad */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px'
        }}
      >
        <Panel>
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
              <Activity size={20} />
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>
                Total Corridas QC
              </span>
              <strong style={{ fontSize: '20px', color: 'var(--color-strong)' }}>{totalCorridas}</strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-success-bg)',
                color: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>
                Aceptadas (|Z| ≤ 2 SD)
              </span>
              <strong style={{ fontSize: '20px', color: 'var(--color-success)' }}>{corridasAceptadas}</strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-warning-bg)',
                color: 'var(--color-warning)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>
                Advertencias (1:2s)
              </span>
              <strong style={{ fontSize: '20px', color: 'var(--color-warning)' }}>{corridasAdvertencia}</strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-error-bg)',
                color: 'var(--color-error-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <XCircle size={20} />
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>
                Rechazadas (1:3s)
              </span>
              <strong style={{ fontSize: '20px', color: 'var(--color-error-text)' }}>{corridasRechazadas}</strong>
            </div>
          </div>
        </Panel>
      </div>

      {/* Navegación por pestañas */}
      <div
        role="tablist"
        aria-label="Gestión de Calidad y Equipos"
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--color-border)'
        }}
      >
        <button
          role="tab"
          aria-selected={activeTab === 'controles'}
          type="button"
          onClick={() => setActiveTab('controles')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: activeTab === 'controles' ? 700 : 500,
            color: activeTab === 'controles' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'controles' ? '3px solid var(--color-primary)' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          <Activity size={16} />
          <span>Corridas de Control de Calidad ({controles.length})</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'equipos'}
          type="button"
          onClick={() => setActiveTab('equipos')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: activeTab === 'equipos' ? 700 : 500,
            color: activeTab === 'equipos' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'equipos' ? '3px solid var(--color-primary)' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          <Cpu size={16} />
          <span>Parque de Equipos Analíticos ({equipos.length})</span>
        </button>
      </div>

      {/* Vista de Controles de Calidad */}
      {activeTab === 'controles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Barra de Filtros */}
          <Panel>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ flex: '1 1 240px', minWidth: '200px' }}>
                <Input
                  aria-label="Buscar control de calidad"
                  placeholder="Buscar por corrida, prueba, lote o equipo..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  leftIcon={<Search size={16} />}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={16} style={{ color: 'var(--color-text-secondary)' }} />
                <label htmlFor="select-filtro-equipo" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Equipo:
                </label>
                <select
                  id="select-filtro-equipo"
                  value={filtroEquipo}
                  onChange={(e) => setFiltroEquipo(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    fontSize: '13px',
                    color: 'var(--color-strong)'
                  }}
                >
                  <option value="TODOS">Todos los analizadores</option>
                  {equipos.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label htmlFor="select-filtro-evaluacion" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Evaluación:
                </label>
                <select
                  id="select-filtro-evaluacion"
                  value={filtroEvaluacion}
                  onChange={(e) => setFiltroEvaluacion(e.target.value as EvaluacionControlCalidad | 'TODOS')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background)',
                    fontSize: '13px',
                    color: 'var(--color-strong)'
                  }}
                >
                  <option value="TODOS">Todas las evaluaciones</option>
                  <option value="ACEPTADO">Aceptado (≤ 2 SD)</option>
                  <option value="ADVERTENCIA">Advertencia (Regla 1:2s)</option>
                  <option value="RECHAZADO">Rechazado (Regla 1:3s)</option>
                </select>
              </div>
            </div>
          </Panel>

          {/* Tabla de Mediciones de Control */}
          <Panel>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
                <SkeletonLoader height={24} />
                <SkeletonLoader height={40} />
                <SkeletonLoader height={40} />
              </div>
            ) : controlesFiltrados.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                No se encontraron corridas de control de calidad con los filtros seleccionados.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)',
                        backgroundColor: 'var(--color-background-alt)'
                      }}
                    >
                      <th style={{ padding: '10px 14px' }}>Corrida / Fecha</th>
                      <th style={{ padding: '10px 14px' }}>Equipo Analítico</th>
                      <th style={{ padding: '10px 14px' }}>Prueba y Versión</th>
                      <th style={{ padding: '10px 14px' }}>Lote / Nivel</th>
                      <th style={{ padding: '10px 14px' }}>Diana (±2SD)</th>
                      <th style={{ padding: '10px 14px' }}>Valor Medido</th>
                      <th style={{ padding: '10px 14px' }}>Z-Score</th>
                      <th style={{ padding: '10px 14px' }}>Evaluación Westgard</th>
                      <th style={{ padding: '10px 14px' }}>Analista</th>
                    </tr>
                  </thead>
                  <tbody>
                    {controlesFiltrados.map((qc) => {
                      const esAdvertencia = qc.evaluacion === 'ADVERTENCIA';
                      const esRechazado = qc.evaluacion === 'RECHAZADO';

                      return (
                        <tr
                          key={qc.id}
                          style={{
                            borderBottom: '1px solid var(--color-divider)',
                            backgroundColor: esRechazado ? '#FEF2F2' : esAdvertencia ? '#FFFBEB' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)' }}>
                              {qc.codigoCorrida}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                              {new Date(qc.fechaHora).toLocaleDateString()} {new Date(qc.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--color-strong)' }}>{qc.equipoNombre}</div>
                          </td>

                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 600 }}>{qc.pruebaNombre}</div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                              <code>{qc.pruebaCodigo}</code> (v{qc.pruebaVersion}.0) · {qc.parametroNombre}
                            </div>
                          </td>

                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 500 }}>{qc.loteMaterialControl}</div>
                            <Badge variant={qc.nivelControl === 'NIVEL_1_NORMAL' ? 'neutral' : 'info'}>
                              {qc.nivelControl === 'NIVEL_1_NORMAL' ? 'Nivel 1 Normal' : 'Nivel 2 Patológico'}
                            </Badge>
                          </td>

                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '12px' }}>
                            <div>{qc.mediaDiana} {qc.unidadMedida}</div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                              [{qc.limiteInferior2SD} - {qc.limiteSuperior2SD}]
                            </div>
                          </td>

                          <td style={{ padding: '10px 14px' }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: '14px',
                                color: esRechazado ? '#DC2626' : esAdvertencia ? '#D97706' : 'var(--color-strong)'
                              }}
                            >
                              {qc.valorMedido} {qc.unidadMedida}
                            </span>
                          </td>

                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700 }}>
                            <span
                              style={{
                                color: esRechazado ? '#DC2626' : esAdvertencia ? '#D97706' : 'var(--color-success)'
                              }}
                            >
                              {qc.zScore > 0 ? `+${qc.zScore}` : qc.zScore} SD
                            </span>
                          </td>

                          <td style={{ padding: '10px 14px' }}>
                            <Badge
                              variant={
                                esRechazado ? 'danger' : esAdvertencia ? 'warning' : 'success'
                              }
                            >
                              {qc.evaluacion}
                            </Badge>
                            {qc.reglaViolada && (
                              <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '4px' }}>
                                {qc.reglaViolada}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            {qc.analistaNombre}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* Vista de Equipos Analíticos */}
      {activeTab === 'equipos' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {equipos.map((eq) => {
            const esOperativo = eq.estado === 'OPERATIVO';
            const esCalibracion = eq.estado === 'CALIBRACION_PENDIENTE';

            return (
              <Panel key={eq.id}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)', fontSize: '12px' }}>
                        {eq.codigo}
                      </span>
                      <h3 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                        {eq.nombre}
                      </h3>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        {eq.fabricante} · {eq.modelo}
                      </div>
                    </div>

                    <Badge
                      variant={esOperativo ? 'success' : esCalibracion ? 'danger' : 'warning'}
                    >
                      {eq.estado}
                    </Badge>
                  </div>

                  <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--color-text-secondary)' }}>
                    <div>
                      Sección: <strong style={{ color: 'var(--color-strong)' }}>{eq.seccion}</strong>
                    </div>
                    <div>
                      Serie: <code style={{ color: 'var(--color-strong)' }}>{eq.numeroSerie}</code>
                    </div>
                    <div>
                      Última Calibración: {new Date(eq.ultimaCalibracion).toLocaleDateString()}
                    </div>
                    <div>
                      Próxima Calibración: <strong style={{ color: esCalibracion ? '#DC2626' : 'var(--color-strong)' }}>{new Date(eq.proximaCalibracion).toLocaleDateString()}</strong>
                    </div>
                    {eq.notas && (
                      <div style={{ fontStyle: 'italic', marginTop: '4px', backgroundColor: 'var(--color-background-alt)', padding: '6px 8px', borderRadius: '4px' }}>
                        {eq.notas}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 'auto', borderTop: '1px solid var(--color-divider)', paddingTop: '10px', display: 'flex', gap: '8px' }}>
                    {esOperativo ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCambiarEstadoEquipo(eq.id, 'EN_MANTENIMIENTO')}
                      >
                        Poner en Mantenimiento
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleCambiarEstadoEquipo(eq.id, 'OPERATIVO')}
                      >
                        Habilitar Operativo
                      </Button>
                    )}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* Modal para Registrar Corrida QC */}
      {showModalQC && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-qc-titulo"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-background)',
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-modal)',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid var(--color-border)',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--color-divider)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-primary)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Activity size={20} />
                </div>
                <div>
                  <h3
                    id="modal-qc-titulo"
                    style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--color-strong)' }}
                  >
                    Registrar Corrida de Control de Calidad (L11)
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Evaluación automatizada de reglas de Westgard y cálculo de Z-Score
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModalQC(false)}
                aria-label="Cerrar modal"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                  padding: '6px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Formulario */}
            <form
              onSubmit={handleGuardarQC}
              style={{
                padding: '20px 24px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              {errorQC && (
                <div
                  role="alert"
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-input)',
                    backgroundColor: 'var(--color-error-bg)',
                    border: '1px solid var(--color-error-border)',
                    color: 'var(--color-error-text)',
                    fontSize: '13px'
                  }}
                >
                  {errorQC}
                </div>
              )}

              {/* Equipo y Prueba */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label
                    htmlFor="qc-select-equipo"
                    style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                  >
                    Equipo Analítico *
                  </label>
                  <select
                    id="qc-select-equipo"
                    value={qcEquipoId}
                    onChange={(e) => setQcEquipoId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-input)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      fontSize: '13px'
                    }}
                  >
                    {equipos.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.nombre} ({eq.estado})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="qc-select-prueba"
                    style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                  >
                    Prueba Analítica *
                  </label>
                  <select
                    id="qc-select-prueba"
                    value={qcPruebaId}
                    onChange={(e) => {
                      setQcPruebaId(e.target.value);
                      if (e.target.value === 'lab-trop-01') {
                        setQcParametroId('p-inm-01');
                        setQcValorMedido('0.026');
                      } else {
                        setQcParametroId('p-hem-01');
                        setQcValorMedido('225');
                      }
                    }}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-input)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      fontSize: '13px'
                    }}
                  >
                    <option value="lab-trop-01">Troponina I de Alta Sensibilidad (INM-001 v2)</option>
                    <option value="lab-hem-01">Hematología Completa - Plaquetas (HEM-001 v2)</option>
                  </select>
                </div>
              </div>

              {/* Lote y Nivel */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label
                    htmlFor="qc-input-lote"
                    style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                  >
                    Lote de Material Control *
                  </label>
                  <Input
                    id="qc-input-lote"
                    value={qcLoteControl}
                    onChange={(e) => setQcLoteControl(e.target.value)}
                    placeholder="ej. PreciControl Troponin Lote 88214"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="qc-select-nivel"
                    style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                  >
                    Nivel de Control *
                  </label>
                  <select
                    id="qc-select-nivel"
                    value={qcNivel}
                    onChange={(e) => setQcNivel(e.target.value as NivelControlCalidad)}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-input)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                      fontSize: '13px'
                    }}
                  >
                    <option value="NIVEL_1_NORMAL">Nivel 1 (Normal)</option>
                    <option value="NIVEL_2_PATOLOGICO">Nivel 2 (Patológico)</option>
                  </select>
                </div>
              </div>

              {/* Valor Medido */}
              <div>
                <label
                  htmlFor="qc-input-valor"
                  style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                >
                  Valor Analítico Medido *
                </label>
                <Input
                  id="qc-input-valor"
                  type="number"
                  step="any"
                  value={qcValorMedido}
                  onChange={(e) => setQcValorMedido(e.target.value)}
                  placeholder="ej. 0.026"
                  required
                />
              </div>

              {/* Observaciones */}
              <div>
                <label
                  htmlFor="qc-input-obs"
                  style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}
                >
                  Observaciones Técnicas
                </label>
                <Input
                  id="qc-input-obs"
                  value={qcObservaciones}
                  onChange={(e) => setQcObservaciones(e.target.value)}
                  placeholder="ej. Corrida matutina de rutina sin incidentes"
                />
              </div>

              {/* Botones */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '12px',
                  borderTop: '1px solid var(--color-divider)',
                  paddingTop: '16px'
                }}
              >
                <Button type="button" variant="secondary" onClick={() => setShowModalQC(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" loading={guardandoQC}>
                  Guardar y Evaluar Corrida
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Registrar Equipo */}
      {showModalEquipo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-equipo-titulo"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-background)',
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-modal)',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid var(--color-border)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--color-divider)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h3 id="modal-equipo-titulo" style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                Registrar Equipo Analítico
              </h3>
              <button
                type="button"
                onClick={() => setShowModalEquipo(false)}
                aria-label="Cerrar modal"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleGuardarEquipo}
              style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              {errorEquipo && (
                <div role="alert" style={{ color: 'var(--color-error-text)', fontSize: '13px' }}>
                  {errorEquipo}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label htmlFor="input-eq-codigo" style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Código *
                  </label>
                  <Input
                    id="input-eq-codigo"
                    value={eqCodigo}
                    onChange={(e) => setEqCodigo(e.target.value)}
                    placeholder="EQ-ROCHE-05"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="input-eq-nombre" style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Nombre del Analizador *
                  </label>
                  <Input
                    id="input-eq-nombre"
                    value={eqNombre}
                    onChange={(e) => setEqNombre(e.target.value)}
                    placeholder="ej. Analizador Roche Cobas c 501"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label htmlFor="input-eq-fab" style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Fabricante *
                  </label>
                  <Input
                    id="input-eq-fab"
                    value={eqFabricante}
                    onChange={(e) => setEqFabricante(e.target.value)}
                    placeholder="ej. Roche Diagnostics"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="input-eq-modelo" style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Modelo
                  </label>
                  <Input
                    id="input-eq-modelo"
                    value={eqModelo}
                    onChange={(e) => setEqModelo(e.target.value)}
                    placeholder="ej. Cobas 6000 c 501"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label htmlFor="input-eq-serie" style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Número de Serie
                  </label>
                  <Input
                    id="input-eq-serie"
                    value={eqSerie}
                    onChange={(e) => setEqSerie(e.target.value)}
                    placeholder="ej. SN-ROC-77810"
                  />
                </div>
                <div>
                  <label htmlFor="input-eq-seccion" style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Sección Analítica
                  </label>
                  <Input
                    id="input-eq-seccion"
                    value={eqSeccion}
                    onChange={(e) => setEqSeccion(e.target.value)}
                    placeholder="ej. Inmunología Clínica"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="input-eq-notas" style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Notas de Mantenimiento / Calibración
                </label>
                <Input
                  id="input-eq-notas"
                  value={eqNotas}
                  onChange={(e) => setEqNotas(e.target.value)}
                  placeholder="ej. Calibración semestral vigente"
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  marginTop: '12px',
                  borderTop: '1px solid var(--color-divider)',
                  paddingTop: '16px'
                }}
              >
                <Button type="button" variant="secondary" onClick={() => setShowModalEquipo(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" loading={guardandoEquipo}>
                  Registrar Equipo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
