import { toClinicDateTimeInput, fromClinicDateTimeInput } from '../../services/dates';
import { getErrorMessage } from '../../services/errors';
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BedDouble,
  User,
  Stethoscope,
  CheckCircle2,
  ArrowLeft,
  ShieldAlert,
  Link as LinkIcon
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { CATALOGO_CIE10 } from '../../services/clinicalCatalogs';
import {
  Paciente,
  MedicoCatalogo,
  CamaHospitalaria,
  CrearIngresoHospitalarioDTO
} from '../../services/types';

export const HospitalizationAdmissionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pacienteIdParam = searchParams.get('pacienteId');

  const { sesion } = useAuthSession();
  const { hospitalizationRepository, patientRepository, catalogRepository } = useServices();
  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [loading, setLoading] = useState(true);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [medicos, setMedicos] = useState<MedicoCatalogo[]>([]);
  const [camas, setCamas] = useState<CamaHospitalaria[]>([]);

  // Campos del formulario
  const [pacienteSeleccionadoId, setPacienteSeleccionadoId] = useState<string>('');
  const [medicoSeleccionadoId, setMedicoSeleccionadoId] = useState<string>('');
  const [camaSeleccionadaId, setCamaSeleccionadaId] = useState<string>('');
  const [fechaIngreso, setFechaIngreso] = useState<string>(
    toClinicDateTimeInput()
  );
  const [cieCodigo, setCieCodigo] = useState<string>('I10');
  const [cieNombre, setCieNombre] = useState<string>('Hipertensión esencial (primaria)');
  const [motivoIngreso, setMotivoIngreso] = useState<string>('');
  
  // Enlace de consultas previas del mismo paciente
  const [enlazarConsultaPrevia, setEnlazarConsultaPrevia] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  useEffect(() => {
    const cargarCatalogos = async () => {
      setLoading(true);
      try {
        const [pacientesRes, medicosRes, camasRes] = await Promise.all([
          patientRepository.buscar(institucionId, { q: '' }),
          catalogRepository.obtenerMedicos(institucionId),
          hospitalizationRepository.listarCamas(institucionId)
        ]);

        const activosPacientes = pacientesRes.items.filter((p) => p.estado === 'ACTIVO');
        setPacientes(activosPacientes);

        const activosMedicos = medicosRes.filter((m) => m.estado === 'ACTIVO');
        setMedicos(activosMedicos);

        const camasDisponibles = camasRes.filter((c) => c.estado === 'DISPONIBLE');
        setCamas(camasDisponibles);

        // Preselección inteligente
        if (pacienteIdParam) {
          setPacienteSeleccionadoId(pacienteIdParam);
        } else if (activosPacientes.length > 0) {
          setPacienteSeleccionadoId(activosPacientes[0].id);
        }

        if (activosMedicos.length > 0) {
          setMedicoSeleccionadoId(activosMedicos[0].id);
        }

        if (camasDisponibles.length > 0) {
          setCamaSeleccionadaId(camasDisponibles[0].id);
        }
      } catch {
        setErrorGlobal('Error al cargar datos maestros hospitalarios');
      } finally {
        setLoading(false);
      }
    };

    cargarCatalogos();
  }, [institucionId, patientRepository, catalogRepository, hospitalizationRepository, pacienteIdParam]);

  const handleCieChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cod = e.target.value;
    const found = CATALOGO_CIE10.find((c) => c.codigo === cod);
    if (found) {
      setCieCodigo(found.codigo);
      setCieNombre(found.nombre);
    } else {
      setCieCodigo(cod);
    }
  };

  const pacienteActual = pacientes.find((p) => p.id === pacienteSeleccionadoId);
  const medicoActual = medicos.find((m) => m.id === medicoSeleccionadoId);
  const camaActual = camas.find((c) => c.id === camaSeleccionadaId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGlobal(null);

    if (!pacienteSeleccionadoId) {
      setErrorGlobal('Debe seleccionar un paciente con expediente activo.');
      return;
    }
    if (!medicoSeleccionadoId) {
      setErrorGlobal('Debe asignar un médico tratante activo responsable del internamiento.');
      return;
    }
    if (!camaSeleccionadaId) {
      setErrorGlobal('Debe asignar una cama disponible en el hospital.');
      return;
    }
    if (!motivoIngreso.trim()) {
      setErrorGlobal('Debe detallar el motivo clínico y criterios de ingreso.');
      return;
    }

    const consultasEnlazadas: string[] = [];
    if (enlazarConsultaPrevia) {
      consultasEnlazadas.push(`cons-${pacienteActual?.id || 'pac'}-previa-01`);
    }

    const dto: CrearIngresoHospitalarioDTO = {
      pacienteId: pacienteSeleccionadoId,
      pacienteNombre: pacienteActual?.nombreCompleto,
      pacienteExpediente: pacienteActual?.codigoLegible,
      medicoTratanteId: medicoSeleccionadoId,
      medicoTratanteNombre: medicoActual?.nombre,
      medicoTratanteColegiado: medicoActual?.colegiado,
      camaId: camaSeleccionadaId,
      fechaIngreso: fromClinicDateTimeInput(fechaIngreso),
      diagnosticoIngresoCIE: cieCodigo,
      diagnosticoIngresoNombre: cieNombre,
      motivoIngreso: motivoIngreso.trim(),
      consultasEnlazadasIds: consultasEnlazadas
    };

    setGuardando(true);
    try {
      const nuevoIngreso = await hospitalizationRepository.crearIngreso(institucionId, dto);
      navigate(`/hospital/hospitalizaciones/${nuevoIngreso.id}`);
    } catch (err: unknown) {
      setErrorGlobal(getErrorMessage(err, 'Error al registrar el ingreso hospitalario'));
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <SkeletonLoader height={32} width={260} />
        <SkeletonLoader height={380} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Breadcrumb */}
      <nav aria-label="Ruta de navegación" style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        <span>Inicio</span>
        <span style={{ margin: '0 8px' }}>/</span>
        <span>Hospitalización</span>
        <span style={{ margin: '0 8px' }}>/</span>
        <span
          onClick={() => navigate('/hospital/hospitalizaciones')}
          style={{ cursor: 'pointer', textDecoration: 'underline' }}
        >
          Hospitalizaciones
        </span>
        <span style={{ margin: '0 8px' }}>/</span>
        <strong style={{ color: 'var(--color-strong)' }}>Nuevo Ingreso Hospitalario</strong>
      </nav>

      {/* Cabecera Principal */}
      <div
        style={{
          backgroundColor: 'var(--color-background)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-panel)',
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
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
              Registro de Ingreso Hospitalario
            </h1>
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: 'var(--color-text-secondary)', maxWidth: '780px', lineHeight: 1.5 }}>
            Registre el ingreso, asigne una cama y vincule el diagnóstico y las consultas relacionadas.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => navigate('/hospital/hospitalizaciones')}
          leftIcon={<ArrowLeft size={16} />}
        >
          Volver a Hospitalizaciones
        </Button>
      </div>

      {errorGlobal && (
        <div
          role="alert"
          style={{
            padding: '14px 18px',
            backgroundColor: '#fee2e2',
            border: '1px solid #f87171',
            borderRadius: 'var(--radius-panel)',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '14px'
          }}
        >
          <ShieldAlert size={20} />
          <div>
            <strong>Error de validación clínica:</strong> {errorGlobal}
          </div>
        </div>
      )}

      {/* Formulario de Admisión */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Panel 1: Paciente y Médico Tratante */}
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <User size={18} color="var(--color-primary)" />
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                1. Paciente y Médico Responsable
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label
                  htmlFor="paciente-select"
                  style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
                >
                  Paciente a Hospitalizar (Expediente Activo) *
                </label>
                <select
                  id="paciente-select"
                  value={pacienteSeleccionadoId}
                  onChange={(e) => setPacienteSeleccionadoId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-input)',
                    fontSize: '13px'
                  }}
                >
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombreCompleto} — {p.codigoLegible} ({p.tipoIdentificacion}: {p.numeroIdentificacion})
                    </option>
                  ))}
                </select>
                {pacienteActual && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Edad: <strong>{pacienteActual.edadAnios} años</strong> • Sexo: <strong>{pacienteActual.sexo}</strong> • Estado: <Badge variant="success">ACTIVO</Badge>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="medico-select"
                  style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
                >
                  Médico Tratante / Especialista Responsable *
                </label>
                <select
                  id="medico-select"
                  value={medicoSeleccionadoId}
                  onChange={(e) => setMedicoSeleccionadoId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-input)',
                    fontSize: '13px'
                  }}
                >
                  {medicos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} — {m.especialidadPrincipal} ({m.colegiado})
                    </option>
                  ))}
                </select>
                {medicoActual && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Colegiado Activo: <strong>{medicoActual.colegiado}</strong> • Especialidad: <strong>{medicoActual.especialidadPrincipal}</strong>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="fecha-ingreso-input"
                  style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
                >
                  Fecha y Hora de Ingreso *
                </label>
                <input
                  id="fecha-ingreso-input"
                  type="datetime-local"
                  value={fechaIngreso}
                  onChange={(e) => setFechaIngreso(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-input)',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>
          </Panel>

          {/* Panel 2: Cama y Ubicación Hospitalaria */}
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <BedDouble size={18} color="var(--color-primary)" />
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                2. Asignación de Cama Inicial
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label
                  htmlFor="cama-select"
                  style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
                >
                  Cama Hospitalaria Disponible *
                </label>
                {camas.length === 0 ? (
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      borderRadius: 'var(--radius-input)',
                      fontSize: '13px'
                    }}
                  >
                    No hay camas disponibles actualmente en el hospital. Libere o limpie una cama para continuar.
                  </div>
                ) : (
                  <select
                    id="cama-select"
                    value={camaSeleccionadaId}
                    onChange={(e) => setCamaSeleccionadaId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-input)',
                      fontSize: '13px'
                    }}
                  >
                    {camas.map((c) => (
                      <option key={c.id} value={c.id}>
                        Cama {c.codigoCama} — {c.salaServicio} (Habitación {c.numeroHabitacion}, Piso {c.piso})
                      </option>
                    ))}
                  </select>
                )}

                {camaActual && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px 12px',
                      backgroundColor: 'var(--color-selection)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-input)',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--color-strong)' }}>
                      Ubicación: Habitación {camaActual.numeroHabitacion} • Piso {camaActual.piso}
                    </div>
                    <div style={{ color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      Servicio: {camaActual.salaServicio} • Estado: <Badge variant="success">DISPONIBLE</Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* Invariante CA17 */}
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-divider)',
                  borderRadius: 'var(--radius-input)',
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)'
                }}
              >
                La cama debe estar disponible durante el periodo de ingreso seleccionado.
              </div>
            </div>
          </Panel>
        </div>

        {/* Panel 3: Diagnóstico y Motivo Clínico */}
        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Stethoscope size={18} color="var(--color-primary)" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
              3. Diagnóstico de Ingreso y Criterios Clínicos
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <div>
              <label
                htmlFor="cie-ingreso-select"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
              >
                Diagnóstico Principal de Ingreso (Catálogo CIE-10) *
              </label>
              <select
                id="cie-ingreso-select"
                value={cieCodigo}
                onChange={handleCieChange}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                  fontSize: '13px',
                  marginBottom: '8px'
                }}
              >
                {CATALOGO_CIE10.map((c) => (
                  <option key={c.codigo} value={c.codigo}>
                    {c.codigo} — {c.nombre}
                  </option>
                ))}
              </select>

              <input
                id="diagnostico-ingreso-nombre"
                type="text"
                value={cieNombre}
                onChange={(e) => setCieNombre(e.target.value)}
                placeholder="Descripción nosológica detallada del diagnóstico de ingreso..."
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label
                htmlFor="motivo-ingreso-textarea"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
              >
                Motivo de Ingreso y Hallazgos Clínicos *
              </label>
              <textarea
                id="motivo-ingreso-textarea"
                rows={4}
                value={motivoIngreso}
                onChange={(e) => setMotivoIngreso(e.target.value)}
                placeholder="Describir motivo de la internación, signos vitales de ingreso, examen físico relevante y plan inicial..."
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        </Panel>

        {/* Panel 4: Vinculación de Consultas Previas y Validación CA17 */}
        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <LinkIcon size={18} color="var(--color-primary)" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
              4. Consultas previas relacionadas
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={enlazarConsultaPrevia}
                onChange={(e) => setEnlazarConsultaPrevia(e.target.checked)}
              />
              <span>Vincular consulta ambulatoria previa que originó la orden de internamiento</span>
            </label>

            {enlazarConsultaPrevia && (
              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--color-selection)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ fontSize: '13px', color: 'var(--color-strong)', fontWeight: 600 }}>
                  Consulta seleccionada: Consulta de Urgencias / Medicina General — Expediente {pacienteActual?.codigoLegible}
                </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                La consulta seleccionada debe pertenecer a {pacienteActual?.nombreCompleto}.
              </div>
              </div>
            )}
          </div>
        </Panel>

        {/* Acciones Finales */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
          <Button
            variant="secondary"
            onClick={() => navigate('/hospital/hospitalizaciones')}
            disabled={guardando}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={guardando || camas.length === 0}
            leftIcon={<CheckCircle2 size={16} />}
          >
            {guardando ? 'Registrando Ingreso...' : 'Confirmar Ingreso Hospitalario'}
          </Button>
        </div>
      </form>
    </div>
  );
};
