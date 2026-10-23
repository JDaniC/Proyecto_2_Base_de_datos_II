import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  User,
  PlusCircle,
  Edit2,
  Archive,
  RefreshCw,
  Pill,
  Activity,
  FileCheck,
  FileText,
  ShieldAlert
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import {
  ExpedienteCompleto,
  DiagnosticoHistorial,
  RecetaHistorial,
  CausaArchivo
} from '../../services/types';
import { Button } from '../../design-system/components/Button';
import { Badge } from '../../design-system/components/Badge';
import { Alert } from '../../design-system/components/Alert';
import { Tabs, TabItem } from '../../design-system/components/Tabs';
import { Panel } from '../../design-system/components/Panel';
import { Accordion, AccordionItem } from '../../design-system/components/Accordion';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { Toast } from '../../design-system/components/Toast';
import { ClinicalTimeline } from './components/ClinicalTimeline';
import { ArchivePatientModal } from './components/ArchivePatientModal';
import { DiagnosticosTratamientosView } from '../consultations/DiagnosticosTratamientosView';
import { RecetasPrescripcionesView } from '../consultations/RecetasPrescripcionesView';
import { PatientInsurancesView } from './components/PatientInsurancesView';
import { PatientExamsView } from './components/PatientExamsView';
import { PatientProceduresView } from './components/PatientProceduresView';
import { PediatricGuardiansView } from './components/PediatricGuardiansView';
import { PediatricGrowthView } from './components/PediatricGrowthView';
import { PediatricHistoryAllergiesView } from './components/PediatricHistoryAllergiesView';
import { PediatricVaccinesScheduleView } from './components/PediatricVaccinesScheduleView';

export const PatientRecordPage: React.FC = () => {
  const { pacienteId } = useParams<{ pacienteId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { sesion } = useAuthSession();
  const { patientRepository } = useServices();

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [expediente, setExpediente] = useState<ExpedienteCompleto | null>(null);
  const [cargando, setCargando] = useState(true);
  const tabParam = searchParams.get('tab');
  const initialTab =
    tabParam === 'seguros'
      ? 'SEGUROS'
      : tabParam === 'examenes'
      ? 'EXAMENES'
      : tabParam === 'procedimientos'
      ? 'PROCEDIMIENTOS'
      : tabParam === 'responsables'
      ? 'RESPONSABLES'
      : tabParam === 'crecimiento'
      ? 'CRECIMIENTO'
      : tabParam === 'antecedentes'
      ? 'ANTECEDENTES'
      : tabParam === 'vacunacion' || tabParam === 'vacunas'
      ? 'VACUNACION'
      : 'GENERAL';
  const [tabActiva, setTabActiva] = useState(initialTab);
  const [modalArchivoAbierto, setModalArchivoAbierto] = useState(false);
  const [toastMensaje, setToastMensaje] = useState<string | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'seguros') {
      setTabActiva('SEGUROS');
    } else if (tabParam === 'examenes') {
      setTabActiva('EXAMENES');
    } else if (tabParam === 'procedimientos') {
      setTabActiva('PROCEDIMIENTOS');
    } else if (tabParam === 'responsables') {
      setTabActiva('RESPONSABLES');
    } else if (tabParam === 'crecimiento') {
      setTabActiva('CRECIMIENTO');
    } else if (tabParam === 'antecedentes') {
      setTabActiva('ANTECEDENTES');
    } else if (tabParam === 'vacunacion' || tabParam === 'vacunas') {
      setTabActiva('VACUNACION');
    }
  }, [searchParams]);

  const tienePermisoHistorial = sesion?.permisos.includes('historial.leer') ?? true;
  const tienePermisoArchivar = sesion?.permisos.includes('historial.archivar') ?? false;
  const tienePermisoConsultas = sesion?.permisos.includes('consultas.registrar') ?? false;

  const cargarExpediente = useCallback(async (silencioso = false) => {
    if (!pacienteId) return;
    if (!silencioso) setCargando(true);
    try {
      const data = await patientRepository.obtenerExpedienteCompleto(institucionId, pacienteId);
      setExpediente(data);
    } catch (err) {
      console.error('Error cargando expediente clínico:', err);
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, [institucionId, pacienteId, patientRepository]);

  useEffect(() => {
    cargarExpediente();
  }, [cargarExpediente]);

  const handleArchivar = async (causa: CausaArchivo, motivo: string) => {
    if (!pacienteId) return;
    await patientRepository.archivar(institucionId, pacienteId, causa, motivo);
    setToastMensaje('Expediente clínico archivado correctamente.');
    await cargarExpediente();
  };

  const handleReactivar = async (motivo: string, correccionFallecimiento?: boolean) => {
    if (!pacienteId) return;
    await patientRepository.reactivar(institucionId, pacienteId, motivo, correccionFallecimiento);
    setToastMensaje('Expediente clínico reactivado exitosamente.');
    await cargarExpediente();
  };

  if (cargando) {
    return (
      <div style={{ padding: '32px' }}>
        <SkeletonLoader variant="rectangular" height="120px" style={{ marginBottom: '24px' }} />
        <SkeletonLoader variant="card" height="320px" />
      </div>
    );
  }

  if (!expediente) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-strong)' }}>Expediente clínico no encontrado</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
          El expediente solicitado no existe o no pertenece a la institución activa.
        </p>
        <Button variant="primary" onClick={() => navigate('/pacientes')}>
          Volver al listado de pacientes
        </Button>
      </div>
    );
  }

  const { paciente, antecedentes, consultas, diagnosticos, recetas, eventos } = expediente;
  const isArchived = paciente.estado === 'ARCHIVADO';

  const handleDiagnosticosActualizados = (nuevos: DiagnosticoHistorial[]) => {
    setExpediente((prev) => (prev ? { ...prev, diagnosticos: nuevos } : null));
  };

  const handleRecetasActualizadas = (nuevas: RecetaHistorial[]) => {
    setExpediente((prev) => (prev ? { ...prev, recetas: nuevas } : null));
  };

  const esPediatrico = institucionId === 'CENTRO_PEDIATRICO' || paciente.responsables !== undefined;

  // Configuración de pestañas con subrayado de 3px
  const tabsList: TabItem[] = [
    { id: 'GENERAL', label: 'General y antecedentes' },
    ...(esPediatrico
      ? [
          { id: 'RESPONSABLES', label: `Responsables y tutores (${paciente.responsables?.length || 0})` },
          { id: 'CRECIMIENTO', label: 'Crecimiento y curvas OMS' },
          { id: 'ANTECEDENTES', label: 'Antecedentes y alergias' },
          { id: 'VACUNACION', label: 'Esquema de vacunación' }
        ]
      : []),
    { id: 'CONSULTAS', label: `Consultas (${consultas.length})` },
    { id: 'DIAGNOSTICOS', label: `Diagnósticos (${diagnosticos.length})` },
    { id: 'RECETAS', label: `Recetas emitidas (${recetas.length})` },
    { id: 'SEGUROS', label: `Seguros y cobertura (${expediente.polizas?.length || 0})` },
    { id: 'EXAMENES', label: 'Exámenes y resultados' },
    { id: 'PROCEDIMIENTOS', label: 'Procedimientos realizados' },
    { id: 'TIMELINE', label: `Actividad e historial (${eventos.length})` }
  ];

  // Acordeón múltiple para antecedentes clínicos
  const itemsAcordeonAntecedentes: AccordionItem[] = [
    {
      id: 'patologicos',
      title: 'Antecedentes Patológicos Crónicos',
      subtitle: 'Enfermedades crónicas, metabólicas y cardiovasculares',
      icon: <Activity size={18} />,
      defaultOpen: true,
      content: (
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          {antecedentes.patologicos.map((p, idx) => (
            <li key={idx} style={{ marginBottom: '6px' }}>{p}</li>
          ))}
        </ul>
      )
    },
    {
      id: 'quirurgicos',
      title: 'Antecedentes Quirúrgicos y Hospitalarios',
      subtitle: 'Procedimientos invasivos y cirugías previas',
      icon: <FileCheck size={18} />,
      content: (
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          {antecedentes.quirurgicos.map((q, idx) => (
            <li key={idx} style={{ marginBottom: '6px' }}>{q}</li>
          ))}
        </ul>
      )
    },
    {
      id: 'alergias',
      title: 'Alergias a Medicamentos y Sustancias',
      subtitle: 'Reacciones adversas documentadas clínicamente',
      icon: <ShieldAlert size={18} />,
      defaultOpen: true,
      content:
        antecedentes.alergias.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {antecedentes.alergias.map((a, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'var(--color-panel)',
                  padding: '8px 12px',
                  borderRadius: '6px'
                }}
              >
                <div>
                  <strong style={{ color: 'var(--color-strong)' }}>{a.sustancia}</strong>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Reacción: {a.reaccion}
                  </div>
                </div>
                <Badge variant={a.severidad === 'SEVERA' ? 'danger' : 'warning'}>
                  {a.severidad}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
            {paciente.estadoAlergias === 'SIN_VERIFICAR'
              ? 'Alergias sin verificar clínicamente. Se requiere anamnesis farmacológica.'
              : 'Sin alergias medicamentosas conocidas documentadas.'}
          </div>
        )
    },
    {
      id: 'medicamentos',
      title: 'Medicación Habitual y Tratamientos Continuos',
      subtitle: 'Fármacos prescritos de uso regular',
      icon: <Pill size={18} />,
      content: (
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          {antecedentes.medicamentosActuales.map((m, idx) => (
            <li key={idx} style={{ marginBottom: '6px' }}>{m}</li>
          ))}
        </ul>
      )
    },
    {
      id: 'familiares',
      title: 'Antecedentes Heredofamiliares',
      subtitle: 'Patologías relevantes de primer grado de consanguinidad',
      icon: <User size={18} />,
      content: (
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          {antecedentes.familiares.map((f, idx) => (
            <li key={idx} style={{ marginBottom: '6px' }}>{f}</li>
          ))}
        </ul>
      )
    }
  ];

  return (
    <div style={{ padding: '32px 32px 64px' }}>
      {/* Toast */}
      <Toast
        toast={toastMensaje ? { id: 'toast-rec', type: 'success', message: toastMensaje } : null}
        onClose={() => setToastMensaje(null)}
      />

      {/* Migas de pan */}
      <nav
        aria-label="Migas de pan"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          marginBottom: '16px'
        }}
      >
        <span
          onClick={() => navigate('/panel')}
          style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
        >
          Inicio
        </span>
        <span>/</span>
        <span
          onClick={() => navigate('/pacientes')}
          style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
        >
          Pacientes
        </span>
        <span>/</span>
        <span style={{ color: 'var(--color-strong)', fontWeight: 600 }}>
          {paciente.codigoLegible}
        </span>
      </nav>

      {/* Encabezado del Perfil Clínico */}
      <div
        style={{
          backgroundColor: 'var(--color-background)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-panel)',
          padding: '24px 28px',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-panel)'
        }}
      >
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: 'var(--color-strong)',
                  margin: 0
                }}
              >
                {paciente.nombreCompleto}
              </h1>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  backgroundColor: 'var(--color-selection)',
                  padding: '3px 10px',
                  borderRadius: '6px'
                }}
              >
                {paciente.codigoLegible}
              </span>
              <Badge variant={isArchived ? 'neutral' : 'success'}>
                {isArchived ? 'Expediente Archivado' : 'Expediente Activo'}
              </Badge>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '14px',
                color: 'var(--color-text-secondary)',
                marginTop: '8px',
                flexWrap: 'wrap'
              }}
            >
              <span>{paciente.edadAnios} años ({paciente.fechaNacimiento})</span>
              <span>•</span>
              <span>
                {paciente.sexo === 'MASCULINO'
                  ? 'Masculino'
                  : paciente.sexo === 'FEMENINO'
                  ? 'Femenino'
                  : 'Otro'}
              </span>
              <span>•</span>
              <span>{paciente.tipoIdentificacion}: {paciente.numeroIdentificacion}</span>
              <span>•</span>
              <span>{sesion?.institucionNombre}</span>
            </div>
          </div>

          {/* Acciones del Encabezado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              leftIcon={<Edit2 size={16} />}
              onClick={() => navigate(`/pacientes/${paciente.id}/editar`)}
            >
              Editar datos
            </Button>

            {tienePermisoArchivar && (
              <Button
                variant={isArchived ? 'secondary' : 'ghost'}
                leftIcon={isArchived ? <RefreshCw size={16} /> : <Archive size={16} />}
                onClick={() => setModalArchivoAbierto(true)}
              >
                {isArchived ? 'Reactivar expediente' : 'Archivar'}
              </Button>
            )}

            <Button
              variant="primary"
              leftIcon={<PlusCircle size={16} />}
              disabled={isArchived || !tienePermisoConsultas}
              onClick={() => navigate(`/pacientes/${paciente.id}/consultas/nueva`)}
              title={
                isArchived
                  ? 'Expediente archivado: no admite nuevas consultas'
                  : !tienePermisoConsultas
                  ? 'Su rol no tiene permiso para registrar consultas médicas'
                  : 'Iniciar nueva consulta médica'
              }
            >
              Nueva consulta
            </Button>
          </div>
        </div>
      </div>

      {/* Alerta Clínica Prioritaria: Alergias sin verificar o Alergias severas */}
      {paciente.estadoAlergias === 'SIN_VERIFICAR' && (
        <div style={{ marginBottom: '24px' }}>
          <Alert
            variant="warning"
            title="ALERTA CLÍNICA PRIORITARIA: Alergias sin verificar clínicamente"
          >
            Este paciente no cuenta con confirmación clínica de alergias medicamentosas o de contacto.
            Antes de prescribir, administrar sustancias o realizar procedimientos invasivos, verifique y registre el estado de alergias.
          </Alert>
        </div>
      )}

      {paciente.estadoAlergias === 'CON_ALERGIAS' && (
        <div style={{ marginBottom: '24px' }}>
          <Alert
            variant="danger"
            title="ALERTA CLÍNICA: Paciente con alergias medicamentosas registradas"
          >
            Se registran reacciones alérgicas documentadas:{' '}
            <strong>
              {antecedentes.alergias.length > 0
                ? antecedentes.alergias.map((a) => a.sustancia).join(', ')
                : 'Alergias documentadas'}
            </strong>
            . Verifique contraindicaciones cruzadas antes de emitir recetas clínicas o administrar fármacos.
          </Alert>
        </div>
      )}

      {/* Pestañas con línea inferior de 3px */}
      <div style={{ marginBottom: '24px' }}>
        <Tabs tabs={tabsList} activeTab={tabActiva} onChange={setTabActiva} />
      </div>

      {/* Contenido de la Pestaña Activa */}
      {tabActiva === 'GENERAL' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Tarjeta de Datos Administrativos */}
          <Panel title="Datos Administrativos y Contacto" subtitle="Información general de contacto institucional">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: '2px' }}>
                  Teléfono principal
                </span>
                <strong style={{ color: 'var(--color-strong)' }}>{paciente.telefono}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: '2px' }}>
                  Correo electrónico
                </span>
                <strong style={{ color: 'var(--color-strong)' }}>{paciente.correo || 'No registrado'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: '2px' }}>
                  Dirección domiciliaria
                </span>
                <strong style={{ color: 'var(--color-strong)' }}>{paciente.direccion}</strong>
              </div>

              {paciente.contactoEmergencia && (
                <div
                  style={{
                    backgroundColor: 'var(--color-panel)',
                    padding: '12px',
                    borderRadius: 'var(--radius-input)',
                    marginTop: '8px'
                  }}
                >
                  <span style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                    Contacto de emergencia hospitalario
                  </span>
                  <div>{paciente.contactoEmergencia.nombre} ({paciente.contactoEmergencia.parentesco})</div>
                  <div style={{ color: 'var(--color-primary)', fontWeight: 600, marginTop: '2px' }}>
                    Tel: {paciente.contactoEmergencia.telefono}
                  </div>
                </div>
              )}

              {paciente.responsables && paciente.responsables.length > 0 && (
                <div
                  style={{
                    backgroundColor: 'var(--color-panel)',
                    padding: '12px',
                    borderRadius: 'var(--radius-input)',
                    marginTop: '8px'
                  }}
                >
                  <span style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                    Responsable legal pediátrico
                  </span>
                  <div>{paciente.responsables[0].nombre} ({paciente.responsables[0].parentesco})</div>
                  <div>Tel: {paciente.responsables[0].telefono}</div>
                  <Badge variant="success">Autoriza atención médica</Badge>
                </div>
              )}
            </div>
          </Panel>

          {/* Acordeón de Antecedentes Clínicos (Visible si tiene permiso historial.leer) */}
          <div>
            {tienePermisoHistorial ? (
              <Accordion items={itemsAcordeonAntecedentes} allowMultiple={true} />
            ) : (
              <Panel title="Información Clínica Protegida">
                <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
                  Su rol administrativo no tiene asignado el permiso <code>historial.leer</code> para consultar notas y antecedentes clínicos reservados.
                </p>
              </Panel>
            )}
          </div>
        </div>
      )}

      {tabActiva === 'RESPONSABLES' && (
        <PediatricGuardiansView
          paciente={paciente}
          onActualizado={() => cargarExpediente(true)}
        />
      )}

      {tabActiva === 'CRECIMIENTO' && (
        <PediatricGrowthView
          paciente={paciente}
          consultas={consultas}
          onActualizado={() => cargarExpediente(true)}
        />
      )}

      {tabActiva === 'ANTECEDENTES' && (
        <PediatricHistoryAllergiesView
          paciente={paciente}
          antecedentes={antecedentes}
          institucionId={institucionId}
          onActualizar={() => cargarExpediente(true)}
        />
      )}

      {tabActiva === 'VACUNACION' && (
        <PediatricVaccinesScheduleView
          paciente={paciente}
          onActualizado={() => cargarExpediente(true)}
        />
      )}

      {tabActiva === 'CONSULTAS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {consultas.length === 0 ? (
            <Panel>
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
                No hay consultas médicas registradas en este expediente.
              </div>
            </Panel>
          ) : (
            consultas.map((c) => (
              <Panel
                key={c.id}
                title={c.motivo}
                subtitle={`${c.profesionalNombre} (${c.profesionalRol}) · ${new Date(c.fechaHora).toLocaleDateString('es-GT', { dateStyle: 'long' })}`}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: '12px' }}>
                      Síntomas y evaluación clínica:
                    </span>
                    <p style={{ margin: '4px 0 0 0', lineHeight: 1.5 }}>{c.sintomas}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      Diagnóstico principal:
                    </span>
                    <strong style={{ color: 'var(--color-strong)' }}>{c.diagnosticoPrincipal}</strong>
                    <Badge variant="success">Finalizada</Badge>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '12px',
                      borderTop: '1px solid var(--color-border)',
                      paddingTop: '10px'
                    }}
                  >
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      Consulta ID: <code>{c.id}</code>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/pacientes/${pacienteId}/consultas/${c.id}`)}
                    >
                      <FileText size={14} style={{ marginRight: '6px' }} />
                      Ver Detalle de Consulta (V11)
                    </Button>
                  </div>
                </div>
              </Panel>
            ))
          )}
        </div>
      )}

      {tabActiva === 'DIAGNOSTICOS' && (
        <DiagnosticosTratamientosView
          pacienteId={paciente.id}
          diagnosticos={diagnosticos}
          onDiagnosticosActualizados={handleDiagnosticosActualizados}
          esArchivado={paciente.estado === 'ARCHIVADO'}
        />
      )}

      {tabActiva === 'RECETAS' && (
        <RecetasPrescripcionesView
          paciente={paciente}
          recetas={recetas}
          onRecetasActualizadas={handleRecetasActualizadas}
          esArchivado={paciente.estado === 'ARCHIVADO'}
        />
      )}

      {tabActiva === 'SEGUROS' && (
        <PatientInsurancesView
          pacienteId={paciente.id}
          pacienteNombre={paciente.nombreCompleto}
          pacienteDpi={paciente.numeroIdentificacion}
          pacienteTelefono={paciente.telefono}
          esArchivado={paciente.estado === 'ARCHIVADO'}
        />
      )}

      {tabActiva === 'EXAMENES' && (
        <PatientExamsView
          pacienteId={paciente.id}
          pacienteNombre={paciente.nombreCompleto}
          esArchivado={paciente.estado === 'ARCHIVADO'}
        />
      )}

      {tabActiva === 'PROCEDIMIENTOS' && (
        <PatientProceduresView
          pacienteId={paciente.id}
          pacienteNombre={paciente.nombreCompleto}
          esArchivado={paciente.estado === 'ARCHIVADO'}
        />
      )}

      {tabActiva === 'TIMELINE' && (
        <ClinicalTimeline eventos={eventos} />
      )}

      {/* Modal de Archivo / Reactivación (V14) */}
      <ArchivePatientModal
        isOpen={modalArchivoAbierto}
        onClose={() => setModalArchivoAbierto(false)}
        paciente={paciente}
        onConfirmArchivar={handleArchivar}
        onConfirmReactivar={handleReactivar}
      />
    </div>
  );
};
