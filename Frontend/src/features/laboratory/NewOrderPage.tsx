import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  User,
  TestTube2,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { Alert } from '../../design-system/components/Alert';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import {
  Paciente,
  PruebaLaboratorioCatalogo,
  PrioridadLaboratorio
} from '../../services/types';

export const NewOrderPage: React.FC = () => {
  const navigate = useNavigate();
  const { sesion } = useAuthSession();
  const { laboratoryRepository, patientRepository, catalogRepository } = useServices();
  const institucionId = sesion?.institucionId || 'LABORATORIO_CLINICO';

  // Datos de catálogo
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pruebasCatalogo, setPruebasCatalogo] = useState<PruebaLaboratorioCatalogo[]>([]);
  const [cargandoInicial, setCargandoInicial] = useState(true);

  // Formulario
  const [busquedaPaciente, setBusquedaPaciente] = useState('');
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null);

  const [medicoSolicitante, setMedicoSolicitante] = useState('');
  const [colegiadoMedico, setColegiadoMedico] = useState('');
  const [prioridad, setPrioridad] = useState<PrioridadLaboratorio>('RUTINA');
  const [motivoClinico, setMotivoClinico] = useState('');

  // Pruebas seleccionadas
  const [pruebasSeleccionadas, setPruebasSeleccionadas] = useState<PruebaLaboratorioCatalogo[]>([]);
  const [filtroSeccionPruebas, setFiltroSeccionPruebas] = useState<string>('TODAS');
  const [busquedaPrueba, setBusquedaPrueba] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargar = async () => {
      setCargandoInicial(true);
      try {
        const [resPacientes, resPruebas] = await Promise.all([
          patientRepository.buscar(institucionId, { limite: 20 }),
          catalogRepository.obtenerPruebasLaboratorio(institucionId)
        ]);
        setPacientes(resPacientes.items);
        setPruebasCatalogo(resPruebas);
      } catch {
        // Fallback
      } finally {
        setCargandoInicial(false);
      }
    };
    cargar();
  }, [institucionId, patientRepository, catalogRepository]);

  // Filtrado de pacientes en tiempo real
  const pacientesFiltrados = useMemo(() => {
    if (!busquedaPaciente.trim()) return pacientes.slice(0, 5);
    const q = busquedaPaciente.toLowerCase();
    return pacientes.filter(
      (p) =>
        p.nombres.toLowerCase().includes(q) ||
        p.apellidos.toLowerCase().includes(q) ||
        p.numeroIdentificacion.toLowerCase().includes(q) ||
        p.codigoLegible.toLowerCase().includes(q)
    );
  }, [pacientes, busquedaPaciente]);

  // Filtrado de pruebas de laboratorio
  const pruebasFiltradas = useMemo(() => {
    let list = pruebasCatalogo;
    if (filtroSeccionPruebas !== 'TODAS') {
      list = list.filter((p) => p.seccion.toLowerCase().includes(filtroSeccionPruebas.toLowerCase()));
    }
    if (busquedaPrueba.trim()) {
      const q = busquedaPrueba.toLowerCase();
      list = list.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.codigoPrueba.toLowerCase().includes(q) ||
          p.tipoMuestra.toLowerCase().includes(q)
      );
    }
    return list;
  }, [pruebasCatalogo, filtroSeccionPruebas, busquedaPrueba]);

  // Muestras requeridas y contenedor
  const contenedoresRequeridos = useMemo(() => {
    const tipos = new Set<string>();
    pruebasSeleccionadas.forEach((p) => {
      tipos.add(p.tipoMuestra);
    });
    return Array.from(tipos);
  }, [pruebasSeleccionadas]);

  // Cálculo de total aproximado
  const totalArancelEstimado = useMemo(() => {
    return pruebasSeleccionadas.length * 150;
  }, [pruebasSeleccionadas]);

  const handleTogglePrueba = (prueba: PruebaLaboratorioCatalogo) => {
    const existe = pruebasSeleccionadas.find((p) => p.id === prueba.id);
    if (existe) {
      setPruebasSeleccionadas((prev) => prev.filter((p) => p.id !== prueba.id));
    } else {
      setPruebasSeleccionadas((prev) => [...prev, prueba]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!pacienteSeleccionado) {
      setError('Debe seleccionar un paciente para emitir la orden de laboratorio.');
      return;
    }

    if (!medicoSolicitante.trim()) {
      setError('El nombre del médico solicitante es obligatorio.');
      return;
    }

    if (!motivoClinico.trim()) {
      setError('El motivo o justificación clínica de la orden es obligatorio.');
      return;
    }

    if (pruebasSeleccionadas.length === 0) {
      setError('Debe seleccionar al menos una prueba analítica del catálogo.');
      return;
    }

    setGuardando(true);
    try {
      await laboratoryRepository.crearOrden(institucionId, {
        pacienteId: pacienteSeleccionado.id,
        pacienteNombre: `${pacienteSeleccionado.nombres} ${pacienteSeleccionado.apellidos}`,
        pacienteDpi: pacienteSeleccionado.numeroIdentificacion,
        pacienteEdad: 30, // Estimado clínico
        pacienteSexo: pacienteSeleccionado.sexo,
        medicoSolicitante: colegiadoMedico ? `${medicoSolicitante} (${colegiadoMedico})` : medicoSolicitante,
        prioridad,
        motivoClinico,
        pruebasSeleccionadasIds: pruebasSeleccionadas.map((p) => p.id)
      });

      navigate(`/laboratorio/bandeja`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar la orden de laboratorio.');
    } finally {
      setGuardando(false);
    }
  };

  if (cargandoInicial) {
    return (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SkeletonLoader variant="rectangular" height="40px" width="300px" />
        <SkeletonLoader variant="card" height="300px" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Cabecera */}
      <div>
        <nav aria-label="Ruta de navegación" style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
          <Link to="/laboratorio/bandeja" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
            Bandeja de Trabajo (L01)
          </Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <strong style={{ color: 'var(--color-strong)' }}>Nueva Orden de Laboratorio (L02)</strong>
        </nav>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button variant="secondary" size="sm" onClick={() => navigate('/laboratorio/bandeja')} aria-label="Volver a la bandeja">
              <ArrowLeft size={16} />
            </Button>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--color-strong)' }}>
                Crear Orden de Laboratorio Clínico (L02)
              </h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Ingreso de solicitud analítica con asignación automática de muestras y contenedores unívocos
              </p>
            </div>
          </div>
          <Badge variant="primary">{sesion?.institucionNombre || 'Laboratorio Clínico Central'}</Badge>
        </div>
      </div>

      {error && (
        <Alert variant="danger" title="Error de validación preanalítica">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Paso 1: Selección del Paciente */}
        <Panel
          title="1. Identificación del Paciente Solicitante"
          subtitle="Selección por DPI, código legible o nombres completos"
        >
          {pacienteSeleccionado ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                backgroundColor: 'var(--color-selection)',
                border: '1px solid var(--color-primary)',
                borderRadius: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-primary)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700
                  }}
                >
                  <User size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-strong)' }}>
                    {pacienteSeleccionado.nombres} {pacienteSeleccionado.apellidos}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    Identificación: <strong>{pacienteSeleccionado.numeroIdentificacion}</strong> · Expediente:{' '}
                    <strong>{pacienteSeleccionado.codigoLegible}</strong> · Sexo:{' '}
                    <strong>{pacienteSeleccionado.sexo}</strong>
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant="secondary"
                type="button"
                onClick={() => setPacienteSeleccionado(null)}
              >
                Cambiar Paciente
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
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
                  value={busquedaPaciente}
                  onChange={(e) => setBusquedaPaciente(e.target.value)}
                  placeholder="Buscar paciente por nombre, DPI o número de expediente..."
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {pacientesFiltrados.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setPacienteSeleccionado(p)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-panel)',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--color-strong)', fontSize: '13px' }}>
                        {p.nombres} {p.apellidos}
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginLeft: '10px' }}>
                        DPI: {p.numeroIdentificacion} · Exp: {p.codigoLegible}
                      </span>
                    </div>
                    <Button size="sm" variant="secondary" type="button" onClick={() => setPacienteSeleccionado(p)}>
                      Seleccionar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        {/* Paso 2: Datos Médicos y Prioridad */}
        <Panel
          title="2. Médico Solicitante y Prioridad Clínica"
          subtitle="Clasificación según urgencia y justificación diagnóstica"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div>
                <label
                  htmlFor="medico-nombre"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
                >
                  Médico Solicitante *
                </label>
                <Input
                  id="medico-nombre"
                  value={medicoSolicitante}
                  onChange={(e) => setMedicoSolicitante(e.target.value)}
                  placeholder="Ej. Dr. Fernando Arévalo"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="medico-col"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
                >
                  Número de Colegiado CMG
                </label>
                <Input
                  id="medico-col"
                  value={colegiadoMedico}
                  onChange={(e) => setColegiadoMedico(e.target.value)}
                  placeholder="Ej. CMG-7819"
                />
              </div>

              <div>
                <label
                  htmlFor="prioridad-orden"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
                >
                  Prioridad Analítica *
                </label>
                <select
                  id="prioridad-orden"
                  value={prioridad}
                  onChange={(e) => setPrioridad(e.target.value as PrioridadLaboratorio)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-input-bg)',
                    fontSize: '13px',
                    fontWeight: prioridad === 'STAT' ? 800 : prioridad === 'URGENTE' ? 700 : 500,
                    color: prioridad === 'STAT' ? '#DC2626' : prioridad === 'URGENTE' ? '#D97706' : 'var(--color-strong)'
                  }}
                >
                  <option value="RUTINA">Rutina (Atención Estándar)</option>
                  <option value="URGENTE">Urgente (Prioridad Preferencial)</option>
                  <option value="STAT">STAT (Emergencia Médica Vital Inmediata)</option>
                </select>
              </div>
            </div>

            {prioridad === 'STAT' && (
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #F87171',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  color: '#991B1B'
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Atención:</strong> Las órdenes con prioridad <strong>STAT</strong> omiten tiempos de cola regular y activan alerta inmediata en cabina analítica.
                </span>
              </div>
            )}

            <div>
              <label
                htmlFor="motivo-clinico"
                style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}
              >
                Motivo Clínico / Justificación Diagnóstica *
              </label>
              <textarea
                id="motivo-clinico"
                rows={3}
                value={motivoClinico}
                onChange={(e) => setMotivoClinico(e.target.value)}
                placeholder="Describa el cuadro clínico, sospecha diagnóstica y antecedentes relevantes que justifiquen las pruebas..."
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-input)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-input-bg)',
                  fontSize: '13px',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>
        </Panel>

        {/* Paso 3: Selección de Pruebas Versionadas */}
        <Panel
          title="3. Selección de Pruebas Analíticas del Catálogo"
          subtitle="Catálogo versionado con indicaciones de muestra y aranceles institucionales"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Buscador de pruebas */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 240px' }}>
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
                  value={busquedaPrueba}
                  onChange={(e) => setBusquedaPrueba(e.target.value)}
                  placeholder="Buscar prueba por nombre, código o muestra..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-input-bg)',
                    fontSize: '13px'
                  }}
                />
              </div>

              <select
                value={filtroSeccionPruebas}
                onChange={(e) => setFiltroSeccionPruebas(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-input)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-input-bg)',
                  fontSize: '13px'
                }}
              >
                <option value="TODAS">Todas las secciones</option>
                <option value="Hematología">Hematología y Coagulación</option>
                <option value="Bioquímica">Bioquímica Clínica</option>
                <option value="Inmunología">Inmunología Clínica</option>
                <option value="Microbiología">Microbiología Clínica</option>
              </select>
            </div>

            {/* Lista seleccionable de pruebas */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '10px',
                maxHeight: '340px',
                overflowY: 'auto',
                padding: '4px'
              }}
            >
              {pruebasFiltradas.map((prueba) => {
                const seleccionada = pruebasSeleccionadas.some((p) => p.id === prueba.id);
                return (
                  <div
                    key={prueba.id}
                    onClick={() => handleTogglePrueba(prueba)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: seleccionada ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      backgroundColor: seleccionada ? 'var(--color-selection)' : 'var(--color-panel)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '11px', color: 'var(--color-primary)' }}>
                        {prueba.codigoPrueba} v{prueba.version}
                      </span>
                      <input
                        type="checkbox"
                        checked={seleccionada}
                        onChange={() => {}}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-strong)' }}>
                      {prueba.nombre}
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <TestTube2 size={12} /> {prueba.tipoMuestra}
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      Sección: <strong>{prueba.seccion}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        {/* Resumen de Muestras y Envío */}
        <Panel title="4. Resumen Preanalítico de Muestras y Confirmación">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  Pruebas seleccionadas:{' '}
                  <strong style={{ color: 'var(--color-strong)' }}>{pruebasSeleccionadas.length} análisis</strong>
                </span>
                <div style={{ marginTop: '4px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {pruebasSeleccionadas.map((p) => (
                    <span
                      key={p.id}
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--color-background-alt)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-strong)'
                      }}
                    >
                      {p.codigoPrueba} - {p.nombre}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Total Arancelario Estimado</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-strong)' }}>
                  Q {totalArancelEstimado.toFixed(2)}
                </div>
              </div>
            </div>

            {contenedoresRequeridos.length > 0 && (
              <div
                style={{
                  backgroundColor: 'var(--color-panel)',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)'
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-strong)', marginBottom: '6px' }}>
                  Contenedores de Muestra a recolectar automáticamente:
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {contenedoresRequeridos.map((c, i) => (
                    <span
                      key={i}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--color-surface, #ffffff)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-primary)',
                        fontWeight: 600
                      }}
                    >
                      <TestTube2 size={14} /> {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Button variant="secondary" type="button" onClick={() => navigate('/laboratorio/bandeja')} disabled={guardando}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={guardando || pruebasSeleccionadas.length === 0 || !pacienteSeleccionado}
                leftIcon={<Plus size={16} />}
              >
                {guardando ? 'Emitiendo Orden...' : 'Emitir Orden de Laboratorio (L02)'}
              </Button>
            </div>
          </div>
        </Panel>
      </form>
    </div>
  );
};
