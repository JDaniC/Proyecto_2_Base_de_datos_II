import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Activity,
  ClipboardCheck,
  Pill,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Plus,
  Trash2,
  Stethoscope,
  Info,
  Edit2
} from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import {
  Paciente,
  CitaAgenda,
  SignosVitales,
  DiagnosticoItemDTO,
  TratamientoItemDTO,
  MedicamentoRecetaDTO,
  RegistroConsultaCompletaDTO
} from '../../services/types';
import { Button } from '../../design-system/components/Button';
import { Badge } from '../../design-system/components/Badge';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';

const CATALOGO_CIE10 = [
  { codigo: 'I10', nombre: 'Hipertensión esencial (primaria)' },
  { codigo: 'E11.9', nombre: 'Diabetes mellitus tipo 2 sin mención de complicación' },
  { codigo: 'J00', nombre: 'Rinofaringitis aguda (resfriado común)' },
  { codigo: 'J06.9', nombre: 'Infección respiratoria aguda de las vías superiores' },
  { codigo: 'J45.9', nombre: 'Asma bronquial no especificada' },
  { codigo: 'K29.7', nombre: 'Gastritis no especificada' },
  { codigo: 'K35.8', nombre: 'Apendicitis aguda no especificada (resuelta)' },
  { codigo: 'M54.5', nombre: 'Lumbago no especificado' },
  { codigo: 'R51', nombre: 'Cefalea' },
  { codigo: 'Z00.0', nombre: 'Examen médico general de rutina' },
  { codigo: 'K02.1', nombre: 'Caries de la dentina (Odontología)' },
  { codigo: 'K02.0', nombre: 'Caries limitada al esmalte (Odontología)' },
  { codigo: 'K04.0', nombre: 'Pulpitis aguda irreversible (Odontología)' },
  { codigo: 'K04.7', nombre: 'Absceso periapical sin fístula (Odontología)' },
  { codigo: 'K05.0', nombre: 'Gingivitis aguda marginal (Odontología)' },
  { codigo: 'K05.3', nombre: 'Periodontitis crónica del adulto (Odontología)' },
  { codigo: 'K08.1', nombre: 'Pérdida de dientes debida a extracción o traumatismo (Odontología)' },
  { codigo: 'Z01.2', nombre: 'Examen odontológico y profilaxis de rutina (Odontología)' },
  { codigo: 'Z00.1', nombre: 'Control de salud de rutina del niño y desarrollo (Pediatría)' }
];

const MEDICAMENTOS_SUGERIDOS = [
  { nombre: 'Losartán Potásico', presentacion: 'Comprimido', concentracion: '50 mg', via: 'Oral', frecuencia: 'Cada 12 horas', duracion: '90 días' },
  { nombre: 'Metformina Clorhidrato', presentacion: 'Tableta', concentracion: '850 mg', via: 'Oral', frecuencia: 'Cada 12 horas', duracion: '90 días' },
  { nombre: 'Amoxicilina + Ácido Clavulánico', presentacion: 'Tableta', concentracion: '500/125 mg', via: 'Oral', frecuencia: 'Cada 8 horas', duracion: '7 días' },
  { nombre: 'Amoxicilina', presentacion: 'Cápsula', concentracion: '500 mg', via: 'Oral', frecuencia: 'Cada 8 horas', duracion: '7 días' },
  { nombre: 'Paracetamol', presentacion: 'Tableta', concentracion: '500 mg', via: 'Oral', frecuencia: 'Cada 8 horas', duracion: '3 días' },
  { nombre: 'Ibuprofeno', presentacion: 'Tableta', concentracion: '600 mg', via: 'Oral', frecuencia: 'Cada 8 horas', duracion: '5 días' },
  { nombre: 'Ketorolaco Trometamina', presentacion: 'Tableta sublingual', concentracion: '10 mg', via: 'Sublingual', frecuencia: 'Cada 8 horas', duracion: '2 días' },
  { nombre: 'Clorhexidina al 0.12%', presentacion: 'Colutorio bucal', concentracion: '15 ml', via: 'Enjuague bucal', frecuencia: 'Cada 12 horas por 1 min', duracion: '10 días' },
  { nombre: 'Omeprazol', presentacion: 'Cápsula', concentracion: '20 mg', via: 'Oral', frecuencia: 'Cada 24 horas en ayunas', duracion: '30 días' },
  { nombre: 'Salbutamol aerosol', presentacion: 'Inhalador', concentracion: '100 mcg/dosis', via: 'Inhalatoria', frecuencia: 'Cada 6 a 8 horas a demanda', duracion: '30 días' }
];

const TRATAMIENTOS_SUGERIDOS_ODONTOLOGIA = [
  { nombre: 'Profilaxis dental con ultrasonido y pulido', indicaciones: 'Eliminación mecánica de placa y manchas extrínsecas.' },
  { nombre: 'Obturación con resina compuesta fotocurable', indicaciones: 'Aislamiento absoluto, grabado ácido y estratificación con resina universal.' },
  { nombre: 'Endodoncia unirradicular y conductometría', indicaciones: 'Instrumentación rotatoria, desinfección con NaOCl al 2.5% y sellado radicular.' },
  { nombre: 'Exodoncia dental simple bajo anestesia local', indicaciones: 'Sindesmotomía, luxación y hemostasia con gasa compresiva por 30 minutos.' },
  { nombre: 'Tartrectomía y alisado radicular por cuadrante', indicaciones: 'Curetaje subgingival y desbridamiento periodontal profundo.' }
];

export const NewConsultationWizardPage: React.FC = () => {
  const { pacienteId } = useParams<{ pacienteId: string }>();
  const [searchParams] = useSearchParams();
  const citaIdParam = searchParams.get('citaId');

  const navigate = useNavigate();
  const { sesion } = useAuthSession();
  const { patientRepository, appointmentRepository, consultationRepository } = useServices();

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [citaVinculada, setCitaVinculada] = useState<CitaAgenda | null>(null);
  const [cargandoInicial, setCargandoInicial] = useState(true);

  // Paso del Stepper (1 a 5)
  const [paso, setPaso] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Paso 1: Datos Generales
  const [motivo, setMotivo] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [responsableAutorizaId, setResponsableAutorizaId] = useState('');

  // Paso 2: Signos Vitales (null si no medido)
  const [pesoKg, setPesoKg] = useState<string>('');
  const [tallaCm, setTallaCm] = useState<string>('');
  const [temperaturaC, setTemperaturaC] = useState<string>('');
  const [presionSistolica, setPresionSistolica] = useState<string>('');
  const [presionDiastolica, setPresionDiastolica] = useState<string>('');
  const [frecuenciaCardiaca, setFrecuenciaCardiaca] = useState<string>('');
  const [frecuenciaRespiratoria, setFrecuenciaRespiratoria] = useState<string>('');
  const [saturacionOxigeno, setSaturacionOxigeno] = useState<string>('');
  const [perimetroCefalico, setPerimetroCefalico] = useState<string>('');

  // Paso 3: Diagnósticos y Tratamientos
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoItemDTO[]>([]);
  const [busquedaCIE, setBusquedaCIE] = useState('');
  const [tratamientos, setTratamientos] = useState<TratamientoItemDTO[]>([]);
  const [nuevoTratamientoDesc, setNuevoTratamientoDesc] = useState('');
  const [nuevoTratamientoIndic, setNuevoTratamientoIndic] = useState('');

  // Paso 4: Receta Médica
  const [emitirReceta, setEmitirReceta] = useState(false);
  const [medicamentos, setMedicamentos] = useState<MedicamentoRecetaDTO[]>([]);
  const [medNombre, setMedNombre] = useState('');
  const [medPresentacion, setMedPresentacion] = useState('Tableta');
  const [medConcentracion, setMedConcentracion] = useState('');
  const [medDosis, setMedDosis] = useState('1');
  const [medUnidad, setMedUnidad] = useState('tableta(s)');
  const [medFrecuencia, setMedFrecuencia] = useState('Cada 8 horas');
  const [medDuracion, setMedDuracion] = useState('5 días');
  const [medVia, setMedVia] = useState('Oral');
  const [medIndicaciones, setMedIndicaciones] = useState('');
  const [observacionesReceta, setObservacionesReceta] = useState('');

  // Estados de validación y envío
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [errorBloqueanteCita, setErrorBloqueanteCita] = useState<{
    codigo: string;
    mensaje: string;
  } | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Cargar datos del paciente y de la cita vinculada
  useEffect(() => {
    if (!pacienteId) return;

    let active = true;
    setCargandoInicial(true);

    Promise.all([
      patientRepository.obtenerPorId(institucionId, pacienteId),
      citaIdParam ? appointmentRepository.obtenerPorId(institucionId, citaIdParam) : Promise.resolve(null)
    ])
      .then(([pac, cita]) => {
        if (!active) return;
        setPaciente(pac);
        if (cita) {
          // Reglas de negocio CA06: Control de transición Cita -> Consulta
          if (cita.estado === 'CANCELADA') {
            setErrorBloqueanteCita({
              codigo: '409 ESTADO_INVALIDO',
              mensaje: 'No se puede iniciar una consulta clínica vinculada a una cita en estado CANCELADA (CA06).'
            });
            setCargandoInicial(false);
            return;
          }
          if (cita.estado === 'ATENDIDA') {
            setErrorBloqueanteCita({
              codigo: '409 CITA_YA_ATENDIDA',
              mensaje: 'La cita seleccionada ya fue atendida en una consulta previa y no admite duplicidad de atenciones (CA06).'
            });
            setCargandoInicial(false);
            return;
          }
          if (cita.pacienteId !== pac?.id) {
            setErrorBloqueanteCita({
              codigo: '409 REFERENCIA_INCOMPATIBLE',
              mensaje: 'La cita seleccionada pertenece a otro paciente y no es compatible con este expediente (CA17).'
            });
            setCargandoInicial(false);
            return;
          }
          setCitaVinculada(cita);
          if (cita.motivo && !motivo) {
            setMotivo(cita.motivo);
          }
        }
        if (pac?.responsables && pac.responsables.length > 0) {
          const principal = pac.responsables.find((r) => r.esPrincipal) || pac.responsables[0];
          setResponsableAutorizaId(principal.id);
        }
        setCargandoInicial(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Error cargando paciente para consulta:', err);
        setCargandoInicial(false);
      });

    return () => {
      active = false;
    };
  }, [pacienteId, citaIdParam, institucionId, patientRepository, appointmentRepository]);

  // Cálculo de IMC automático
  const imcCalculado = (() => {
    const peso = parseFloat(pesoKg);
    const tallaM = parseFloat(tallaCm) / 100;
    if (peso > 0 && tallaM > 0) {
      const imc = peso / (tallaM * tallaM);
      let estado = 'Normal';
      if (imc < 18.5) estado = 'Bajo peso';
      else if (imc >= 25 && imc < 30) estado = 'Sobrepeso';
      else if (imc >= 30) estado = 'Obesidad';
      return { valor: imc.toFixed(1), estado };
    }
    return null;
  })();

  // Handlers para agregar / quitar diagnósticos
  const agregarDiagnostico = (cie: { codigo: string; nombre: string }) => {
    if (diagnosticos.some((d) => d.codigoCIE === cie.codigo)) return;
    const esElPrimero = diagnosticos.length === 0;
    setDiagnosticos([
      ...diagnosticos,
      {
        codigoCIE: cie.codigo,
        nombre: cie.nombre,
        esPrincipal: esElPrimero
      }
    ]);
    setBusquedaCIE('');
  };

  const marcarComoPrincipal = (codigoCIE: string) => {
    setDiagnosticos(
      diagnosticos.map((d) => ({
        ...d,
        esPrincipal: d.codigoCIE === codigoCIE
      }))
    );
  };

  const eliminarDiagnostico = (codigoCIE: string) => {
    const filtrados = diagnosticos.filter((d) => d.codigoCIE !== codigoCIE);
    if (filtrados.length > 0 && !filtrados.some((d) => d.esPrincipal)) {
      filtrados[0].esPrincipal = true;
    }
    setDiagnosticos(filtrados);
  };

  // Handlers para tratamientos
  const agregarTratamiento = () => {
    if (!nuevoTratamientoDesc.trim()) return;
    setTratamientos([
      ...tratamientos,
      {
        descripcion: nuevoTratamientoDesc.trim(),
        indicaciones: nuevoTratamientoIndic.trim()
      }
    ]);
    setNuevoTratamientoDesc('');
    setNuevoTratamientoIndic('');
  };

  const eliminarTratamiento = (index: number) => {
    setTratamientos(tratamientos.filter((_, i) => i !== index));
  };

  // Handlers para medicamentos de receta
  const agregarMedicamento = () => {
    if (!medNombre.trim()) {
      setErrorValidacion('Debe indicar el nombre del medicamento a prescribir.');
      return;
    }
    setErrorValidacion(null);
    setMedicamentos([
      ...medicamentos,
      {
        nombre: medNombre.trim(),
        presentacion: medPresentacion,
        concentracion: medConcentracion.trim(),
        dosis: medDosis.trim(),
        unidad: medUnidad.trim(),
        frecuencia: medFrecuencia.trim(),
        duracion: medDuracion.trim(),
        via: medVia,
        indicaciones: medIndicaciones.trim()
      }
    ]);
    setMedNombre('');
    setMedConcentracion('');
    setMedIndicaciones('');
  };

  const eliminarMedicamento = (index: number) => {
    setMedicamentos(medicamentos.filter((_, i) => i !== index));
  };

  const autocompletarMedicamento = (med: (typeof MEDICAMENTOS_SUGERIDOS)[0]) => {
    setMedNombre(med.nombre);
    setMedPresentacion(med.presentacion);
    setMedConcentracion(med.concentracion);
    setMedVia(med.via);
    setMedFrecuencia(med.frecuencia);
    setMedDuracion(med.duracion);
  };

  // Validaciones por paso
  const avanzarPaso = () => {
    setErrorValidacion(null);

    if (paso === 1) {
      if (!motivo.trim() || motivo.trim().length < 4) {
        setErrorValidacion('El motivo de la consulta es obligatorio (mínimo 4 caracteres).');
        return;
      }
      if (institucionId === 'CENTRO_PEDIATRICO' && paciente?.responsables?.length && !responsableAutorizaId) {
        setErrorValidacion('En Pediatría es obligatorio seleccionar el responsable que autoriza la atención.');
        return;
      }
      setPaso(2);
      return;
    }

    if (paso === 2) {
      // Regla estricta: los campos no medidos deben mantenerse como null
      setPaso(3);
      return;
    }

    if (paso === 3) {
      if (diagnosticos.length > 0) {
        const principales = diagnosticos.filter((d) => d.esPrincipal);
        if (principales.length !== 1) {
          setErrorValidacion('Debe marcar exactamente un diagnóstico como principal de la atención.');
          return;
        }
      }
      setPaso(4);
      return;
    }

    if (paso === 4) {
      if (emitirReceta && medicamentos.length === 0) {
        setErrorValidacion('Ha indicado emitir receta pero no ha agregado ningún medicamento a la prescripción.');
        return;
      }
      setPaso(5);
      return;
    }
  };

  // Envío final
  const handleConfirmarConsulta = async () => {
    if (!pacienteId) return;
    setErrorValidacion(null);
    setGuardando(true);

    const signosVitalesPayload: SignosVitales = {
      pesoKg: pesoKg ? parseFloat(pesoKg) : null,
      tallaCm: tallaCm ? parseFloat(tallaCm) : null,
      temperaturaC: temperaturaC ? parseFloat(temperaturaC) : null,
      presionSistolica: presionSistolica ? parseInt(presionSistolica, 10) : null,
      presionDiastolica: presionDiastolica ? parseInt(presionDiastolica, 10) : null,
      frecuenciaCardiacaLpm: frecuenciaCardiaca ? parseInt(frecuenciaCardiaca, 10) : null,
      frecuenciaRespiratoriaRpm: frecuenciaRespiratoria ? parseInt(frecuenciaRespiratoria, 10) : null,
      saturacionOxigenoPct: saturacionOxigeno ? parseInt(saturacionOxigeno, 10) : null,
      perimetroCefalicoCm: perimetroCefalico ? parseFloat(perimetroCefalico) : null
    };

    const payload: RegistroConsultaCompletaDTO = {
      pacienteId,
      citaId: citaVinculada?.id,
      responsableId: responsableAutorizaId || undefined,
      motivo: motivo.trim(),
      sintomas: sintomas.trim(),
      observaciones: observaciones.trim(),
      signosVitales: signosVitalesPayload,
      diagnosticos,
      tratamientos,
      receta: emitirReceta
        ? {
            medicamentos,
            observaciones: observacionesReceta.trim()
          }
        : undefined,
      idempotencyKey: `con-${pacienteId}-${Date.now()}`
    };

    const profesional = {
      nombre: sesion?.nombre || 'Dra. Elena Morales',
      rol: sesion?.rolEtiqueta || 'Médico Especialista'
    };

    try {
      await consultationRepository.registrarConsultaCompleta(institucionId, payload, profesional);
      setGuardando(false);
      navigate(`/pacientes/${pacienteId}?tab=consultas`);
    } catch (err: any) {
      setGuardando(false);
      setErrorValidacion(err.message || 'Error al registrar la consulta médica.');
    }
  };

  if (cargandoInicial) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>
        <SkeletonLoader height="32px" width="300px" />
        <div style={{ marginTop: '20px' }}>
          <SkeletonLoader height="120px" width="100%" />
        </div>
      </div>
    );
  }

  if (!paciente) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center' }}>
        <h2>Paciente no encontrado</h2>
        <Button variant="primary" onClick={() => navigate('/pacientes')}>
          Volver a pacientes
        </Button>
      </div>
    );
  }

  const pasosConfig = [
    { num: 1, label: 'Datos Consulta', icon: FileText },
    { num: 2, label: 'Signos Vitales', icon: Activity },
    { num: 3, label: 'Diagnósticos (V12)', icon: ClipboardCheck },
    { num: 4, label: 'Receta Médica (V13)', icon: Pill },
    { num: 5, label: 'Revisión Final', icon: CheckCircle2 }
  ];

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '24px 16px' }}>
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
        <span onClick={() => navigate('/panel')} style={{ cursor: 'pointer' }}>Inicio</span>
        <span>/</span>
        <span onClick={() => navigate('/pacientes')} style={{ cursor: 'pointer' }}>Pacientes</span>
        <span>/</span>
        <span onClick={() => navigate(`/pacientes/${paciente.id}`)} style={{ cursor: 'pointer' }}>
          {paciente.nombres} {paciente.apellidos}
        </span>
        <span>/</span>
        <span style={{ color: 'var(--color-strong)', fontWeight: 600 }}>Registro de consulta</span>
      </nav>

      {/* Encabezado Principal */}
      <div
        style={{
          backgroundColor: 'var(--color-background)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-panel)',
          padding: '20px 24px',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-panel)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
                {institucionId === 'CLINICA_ODONTOLOGICA'
                  ? 'Registro de Consulta Odontológica (C03)'
                  : 'Registro de Consulta Médica (Pantalla 04 Aprobada)'}
              </h1>
              <Badge variant="primary">{sesion?.institucionNombre}</Badge>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              <span>
                <strong>Paciente:</strong> {paciente.nombres} {paciente.apellidos}
              </span>
              <span>
                <strong>Expediente:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>{paciente.codigoLegible}</span>
              </span>
              <span>
                <strong>Profesional en turno:</strong> {sesion?.nombre} ({sesion?.rolEtiqueta})
              </span>
            </div>
          </div>

          {citaVinculada && (
            <div
              style={{
                backgroundColor: 'var(--color-panel)',
                border: '1px solid var(--color-border)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            >
              <div style={{ color: 'var(--color-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Stethoscope size={14} />
                Cita programada vinculada
              </div>
              <div style={{ color: 'var(--color-text)', marginTop: '2px' }}>
                {citaVinculada.fecha} · {citaVinculada.horaInicio} h ({citaVinculada.consultorio})
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conflicto Bloqueante de Cita Vinculada (CA06) */}
      {errorBloqueanteCita && (
        <div
          role="alert"
          style={{
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            borderRadius: 'var(--radius-panel)',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: 'var(--shadow-panel)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-danger-text)', fontWeight: 700, fontSize: '17px', marginBottom: '8px' }}>
            <AlertCircle size={22} />
            <span>Conflicto de Cita Vinculada ({errorBloqueanteCita.codigo})</span>
          </div>
          <p style={{ color: 'var(--color-danger-text)', fontSize: '14px', margin: '0 0 16px 0' }}>
            {errorBloqueanteCita.mensaje}
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              onClick={() => navigate('/agenda')}
            >
              Regresar a la agenda
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setErrorBloqueanteCita(null);
                setCitaVinculada(null);
              }}
            >
              Continuar consulta sin vincular cita previa
            </Button>
          </div>
        </div>
      )}

      {/* Componente Stepper de 4 Pasos + Revisión Final (Design System #26) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--color-background)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-panel)',
          padding: '16px 24px',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-panel)'
        }}
      >
        {pasosConfig.map((item, idx) => {
          const Icon = item.icon;
          const isActive = paso === item.num;
          const isCompleted = paso > item.num;

          return (
            <React.Fragment key={item.num}>
              <button
                type="button"
                onClick={() => {
                  if (item.num < paso) setPaso(item.num as any);
                }}
                disabled={item.num > paso}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'none',
                  border: 'none',
                  cursor: item.num < paso ? 'pointer' : 'default',
                  opacity: item.num > paso ? 0.6 : 1,
                  padding: '6px 10px',
                  borderRadius: '8px',
                  backgroundColor: isActive ? 'var(--color-selection)' : 'transparent'
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: isActive
                      ? 'var(--color-primary)'
                      : isCompleted
                      ? 'var(--color-success-bg)'
                      : 'var(--color-control)',
                    color: isActive
                      ? '#FFFFFF'
                      : isCompleted
                      ? 'var(--color-success-text)'
                      : 'var(--color-text-secondary)',
                    border: isCompleted ? '1px solid var(--color-success-border)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '13px'
                  }}
                >
                  {isCompleted ? <CheckCircle2 size={16} /> : item.num}
                </div>
                <div style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon size={14} style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)', flexShrink: 0 }} />
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'var(--color-primary)' : 'var(--color-text)'
                    }}
                  >
                    {item.label}
                  </div>
                </div>
              </button>
              {idx < pasosConfig.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: '2px',
                    backgroundColor: paso > item.num ? 'var(--color-primary)' : 'var(--color-border)',
                    margin: '0 8px'
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Alerta de Error de Validación */}
      {errorValidacion && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'var(--color-danger-bg)',
            color: 'var(--color-danger-text)',
            border: '1px solid var(--color-danger-border)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-input)',
            marginBottom: '20px',
            fontSize: '13px'
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorValidacion}</span>
        </div>
      )}

      {/* Contenido Dinámico por Paso */}
      <div
        style={{
          backgroundColor: 'var(--color-background)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-panel)',
          padding: '24px 28px',
          boxShadow: 'var(--shadow-panel)'
        }}
      >
        {/* PASO 1: Datos de la Consulta */}
        {paso === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
              {institucionId === 'CLINICA_ODONTOLOGICA'
                ? 'Paso 1: Motivo de Consulta y Examen Estomatológico (C03)'
                : 'Paso 1: Motivo y Descripción del Cuadro Clínico'}
            </h2>

            {institucionId === 'CLINICA_ODONTOLOGICA' && (
              <div
                style={{
                  backgroundColor: 'var(--color-selection)',
                  border: '1px solid var(--color-primary)',
                  borderRadius: 'var(--radius-input)',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: 'var(--color-strong)'
                }}
              >
                <strong>Atención Odontológica Especializada (C03):</strong> Registro clínico estomatológico, tejidos periodontales y oclusión. Sin odontograma según alcance expreso (§8.3).
              </div>
            )}

            {/* Selector de responsable en Pediatría */}
            {institucionId === 'CENTRO_PEDIATRICO' && paciente.responsables && paciente.responsables.length > 0 && (
              <div>
                <label
                  htmlFor="responsable-select"
                  style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
                >
                  Responsable legal que autoriza la atención médica (Pediatría RF-P04) <span style={{ color: 'var(--color-danger-text)' }}>*</span>
                </label>
                <select
                  id="responsable-select"
                  value={responsableAutorizaId}
                  onChange={(e) => setResponsableAutorizaId(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--color-input-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-input)',
                    padding: '10px 14px',
                    fontSize: '14px',
                    color: 'var(--color-text)'
                  }}
                >
                  {paciente.responsables.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre} ({r.parentesco}) — Tel: {r.telefono} {r.esPrincipal ? '· Principal' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Motivo de consulta */}
            <div>
              <label
                htmlFor="motivo-input"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
              >
                Motivo de consulta principal <span style={{ color: 'var(--color-danger-text)' }}>*</span>
              </label>
              <input
                id="motivo-input"
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej. Control de hipertensión arterial y cifras glucémicas en ayunas..."
                style={{
                  width: '100%',
                  backgroundColor: 'var(--color-input-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                  padding: '10px 14px',
                  fontSize: '14px',
                  color: 'var(--color-text)'
                }}
              />
            </div>

            {/* Síntomas (Textarea 120px aprobado) */}
            <div>
              <label
                htmlFor="sintomas-input"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
              >
                Síntomas y evolución cronológica referida por el paciente (Textarea 120 px)
              </label>
              <textarea
                id="sintomas-input"
                value={sintomas}
                onChange={(e) => setSintomas(e.target.value)}
                placeholder="Describa semiología, tiempo de evolución, desencadenantes y manifestaciones clínicas..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  height: '120px',
                  backgroundColor: 'var(--color-input-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                  padding: '12px 14px',
                  fontSize: '14px',
                  color: 'var(--color-text)',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Observaciones (Textarea 120px aprobado) */}
            <div>
              <label
                htmlFor="observaciones-input"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}
              >
                Observaciones clínicas del examen físico y hallazgos inmediatos (Textarea 120 px)
              </label>
              <textarea
                id="observaciones-input"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Hallazgos a la inspección, palpación, auscultación o notas de enfermería..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  height: '120px',
                  backgroundColor: 'var(--color-input-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                  padding: '12px 14px',
                  fontSize: '14px',
                  color: 'var(--color-text)',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        )}

        {/* PASO 2: Signos Vitales y Mediciones */}
        {paso === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
                Paso 2: Signos Vitales y Parámetros Fisiológicos
              </h2>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--color-panel)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginTop: '10px',
                  fontSize: '13px',
                  color: 'var(--color-primary)'
                }}
              >
                <Info size={16} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Regla clínica estricta:</strong> Los parámetros no medidos deben permanecer vacíos. La plataforma almacenará estrictamente <em>null</em> (nunca 0) para prevenir distorsión en curvas y falsas alertas.
                </span>
              </div>
            </div>

            {/* Grid de Signos Vitales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
              <div>
                <label htmlFor="peso-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}>
                  Peso corporal (kg)
                </label>
                <input
                  id="peso-input"
                  type="number"
                  step="0.1"
                  min="0"
                  max="350"
                  value={pesoKg}
                  onChange={(e) => setPesoKg(e.target.value)}
                  placeholder="ej. 72.5"
                  style={{ width: '100%', backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-input)', padding: '10px 14px', fontSize: '14px', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label htmlFor="talla-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}>
                  Talla / Altura (cm)
                </label>
                <input
                  id="talla-input"
                  type="number"
                  step="0.5"
                  min="20"
                  max="250"
                  value={tallaCm}
                  onChange={(e) => setTallaCm(e.target.value)}
                  placeholder="ej. 170"
                  style={{ width: '100%', backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-input)', padding: '10px 14px', fontSize: '14px', color: 'var(--color-text)' }}
                />
              </div>

              {imcCalculado && (
                <div style={{ backgroundColor: 'var(--color-input-bg)', padding: '10px 14px', borderRadius: 'var(--radius-input)', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>IMC calculado automáticamente:</span>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-strong)' }}>
                    {imcCalculado.valor} kg/m² ({imcCalculado.estado})
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="temp-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}>
                  Temperatura (°C)
                </label>
                <input
                  id="temp-input"
                  type="number"
                  step="0.1"
                  min="30"
                  max="45"
                  value={temperaturaC}
                  onChange={(e) => setTemperaturaC(e.target.value)}
                  placeholder="ej. 36.6"
                  style={{ width: '100%', backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-input)', padding: '10px 14px', fontSize: '14px', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label htmlFor="pa-sis-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}>
                  PA Sistólica (mmHg)
                </label>
                <input
                  id="pa-sis-input"
                  type="number"
                  min="50"
                  max="260"
                  value={presionSistolica}
                  onChange={(e) => setPresionSistolica(e.target.value)}
                  placeholder="ej. 120"
                  style={{ width: '100%', backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-input)', padding: '10px 14px', fontSize: '14px', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label htmlFor="pa-dia-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}>
                  PA Diastólica (mmHg)
                </label>
                <input
                  id="pa-dia-input"
                  type="number"
                  min="30"
                  max="160"
                  value={presionDiastolica}
                  onChange={(e) => setPresionDiastolica(e.target.value)}
                  placeholder="ej. 80"
                  style={{ width: '100%', backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-input)', padding: '10px 14px', fontSize: '14px', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label htmlFor="fc-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}>
                  Frecuencia Cardíaca (lpm)
                </label>
                <input
                  id="fc-input"
                  type="number"
                  min="30"
                  max="250"
                  value={frecuenciaCardiaca}
                  onChange={(e) => setFrecuenciaCardiaca(e.target.value)}
                  placeholder="ej. 72"
                  style={{ width: '100%', backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-input)', padding: '10px 14px', fontSize: '14px', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label htmlFor="fr-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}>
                  Frecuencia Respiratoria (rpm)
                </label>
                <input
                  id="fr-input"
                  type="number"
                  min="8"
                  max="80"
                  value={frecuenciaRespiratoria}
                  onChange={(e) => setFrecuenciaRespiratoria(e.target.value)}
                  placeholder="ej. 16"
                  style={{ width: '100%', backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-input)', padding: '10px 14px', fontSize: '14px', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label htmlFor="spo2-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}>
                  Saturación de Oxígeno (%)
                </label>
                <input
                  id="spo2-input"
                  type="number"
                  min="50"
                  max="100"
                  value={saturacionOxigeno}
                  onChange={(e) => setSaturacionOxigeno(e.target.value)}
                  placeholder="ej. 98"
                  style={{ width: '100%', backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-input)', padding: '10px 14px', fontSize: '14px', color: 'var(--color-text)' }}
                />
              </div>

              {institucionId === 'CENTRO_PEDIATRICO' && (
                <div>
                  <label htmlFor="pc-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}>
                    Perímetro Cefálico (cm - Pediatría)
                  </label>
                  <input
                    id="pc-input"
                    type="number"
                    step="0.1"
                    min="20"
                    max="70"
                    value={perimetroCefalico}
                    onChange={(e) => setPerimetroCefalico(e.target.value)}
                    placeholder="ej. 43.5"
                    style={{ width: '100%', backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-input)', padding: '10px 14px', fontSize: '14px', color: 'var(--color-text)' }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* PASO 3: Diagnósticos y Tratamientos (V12) */}
        {paso === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
                Paso 3: Diagnósticos (CIE-10) y Tratamientos Institucionales (V12)
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Seleccione diagnósticos desde el catálogo. Si ingresa diagnósticos, debe marcar <strong>exactamente uno como principal</strong>.
              </p>
            </div>

            {/* Búsqueda de diagnósticos CIE-10 */}
            <div>
              <label htmlFor="cie-search" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '6px' }}>
                Buscador y catálogo de diagnósticos
              </label>
              <input
                id="cie-search"
                type="text"
                value={busquedaCIE}
                onChange={(e) => setBusquedaCIE(e.target.value)}
                placeholder="Escriba código o nombre de patología (ej. Hipertensión, Diabetes, Gastritis, Asma)..."
                style={{ width: '100%', backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-input)', padding: '10px 14px', fontSize: '14px', color: 'var(--color-text)' }}
              />

              {busquedaCIE.trim().length > 0 && (
                <div style={{ marginTop: '8px', maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: '#FFFFFF' }}>
                  {CATALOGO_CIE10.filter((c) => c.nombre.toLowerCase().includes(busquedaCIE.toLowerCase()) || c.codigo.toLowerCase().includes(busquedaCIE.toLowerCase())).map((cie) => (
                    <div
                      key={cie.codigo}
                      onClick={() => agregarDiagnostico(cie)}
                      style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <div>
                        <strong style={{ color: 'var(--color-primary)' }}>{cie.codigo}</strong> — {cie.nombre}
                      </div>
                      <Button size="sm" variant="secondary" leftIcon={<Plus size={14} />}>
                        Agregar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lista de diagnósticos asignados */}
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-strong)', marginBottom: '8px' }}>
                Diagnósticos vinculados a esta consulta ({diagnosticos.length}):
              </div>

              {diagnosticos.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', backgroundColor: 'var(--color-input-bg)', borderRadius: '8px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                  No se han agregado diagnósticos aún. Seleccione al menos uno desde el catálogo superior.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {diagnosticos.map((dx) => (
                    <div
                      key={dx.codigoCIE}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: dx.esPrincipal ? 'var(--color-selection)' : 'var(--color-panel)',
                        border: `1px solid ${dx.esPrincipal ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        padding: '10px 16px',
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                          <input
                            type="radio"
                            name="diagnostico-principal"
                            checked={dx.esPrincipal}
                            onChange={() => marcarComoPrincipal(dx.codigoCIE)}
                          />
                          <span style={{ fontWeight: dx.esPrincipal ? 700 : 500, color: dx.esPrincipal ? 'var(--color-primary)' : 'inherit' }}>
                            {dx.esPrincipal ? 'Principal' : 'Secundario'}
                          </span>
                        </label>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)' }}>
                          {dx.codigoCIE}
                        </span>
                        <span style={{ color: 'var(--color-strong)' }}>{dx.nombre}</span>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => eliminarDiagnostico(dx.codigoCIE)} aria-label="Eliminar diagnóstico">
                        <Trash2 size={14} style={{ color: 'var(--color-danger-text)' }} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tratamientos e indicaciones no farmacológicas */}
            <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-strong)', marginBottom: '8px' }}>
                Tratamientos y Procedimientos Indicados:
              </div>

              {institucionId === 'CLINICA_ODONTOLOGICA' && (
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Procedimientos odontológicos sugeridos del catálogo (C05):
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {TRATAMIENTOS_SUGERIDOS_ODONTOLOGIA.map((t) => (
                      <button
                        key={t.nombre}
                        type="button"
                        onClick={() => {
                          setNuevoTratamientoDesc(t.nombre);
                          setNuevoTratamientoIndic(t.indicaciones);
                        }}
                        style={{
                          backgroundColor: 'var(--color-input-bg)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '16px',
                          padding: '4px 10px',
                          fontSize: '12px',
                          color: 'var(--color-primary)',
                          cursor: 'pointer'
                        }}
                      >
                        + {t.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
                <div>
                  <label htmlFor="trat-desc" style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                    Tratamiento / Procedimiento
                  </label>
                  <input
                    id="trat-desc"
                    type="text"
                    value={nuevoTratamientoDesc}
                    onChange={(e) => setNuevoTratamientoDesc(e.target.value)}
                    placeholder="ej. Dieta baja en sodio, curación de herida, reposo..."
                    style={{ width: '100%', backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-input)', padding: '8px 12px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label htmlFor="trat-indic" style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                    Indicaciones y frecuencia
                  </label>
                  <input
                    id="trat-indic"
                    type="text"
                    value={nuevoTratamientoIndic}
                    onChange={(e) => setNuevoTratamientoIndic(e.target.value)}
                    placeholder="ej. 30 minutos diarios de caminata ligera..."
                    style={{ width: '100%', backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-input)', padding: '8px 12px', fontSize: '13px' }}
                  />
                </div>
                <Button size="sm" variant="secondary" onClick={agregarTratamiento} leftIcon={<Plus size={14} />}>
                  Añadir
                </Button>
              </div>

              {tratamientos.length > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {tratamientos.map((t, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-input-bg)', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
                      <div>
                        <strong>{t.descripcion}</strong> {t.indicaciones ? `— ${t.indicaciones}` : ''}
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => eliminarTratamiento(idx)}>
                        <Trash2 size={13} style={{ color: 'var(--color-danger-text)' }} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PASO 4: Receta Médica (V13) */}
        {paso === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
                Paso 4: Prescripción y Receta Médica (V13)
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Emisión de orden farmacológica institucional con registro estructurado e instantánea inmutable.
              </p>
            </div>

            {/* Toggle de emisión de receta */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: 'var(--color-panel)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-input)',
                border: '1px solid var(--color-border)'
              }}
            >
              <input
                id="toggle-receta"
                type="checkbox"
                checked={emitirReceta}
                onChange={(e) => setEmitirReceta(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="toggle-receta" style={{ fontWeight: 600, color: 'var(--color-strong)', fontSize: '14px', cursor: 'pointer' }}>
                Emitir receta médica oficial en esta atención
              </label>
            </div>

            {emitirReceta && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Medicamentos frecuentes */}
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Sugerencias frecuentes del catálogo institucional:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {MEDICAMENTOS_SUGERIDOS.map((m) => (
                      <button
                        key={m.nombre}
                        type="button"
                        onClick={() => autocompletarMedicamento(m)}
                        style={{
                          backgroundColor: 'var(--color-input-bg)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '16px',
                          padding: '4px 10px',
                          fontSize: '12px',
                          color: 'var(--color-primary)',
                          cursor: 'pointer'
                        }}
                      >
                        + {m.nombre} ({m.concentracion})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Formulario de agregar medicamento */}
                <div style={{ backgroundColor: 'var(--color-input-bg)', padding: '16px', borderRadius: 'var(--radius-input)', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-strong)', marginBottom: '12px' }}>
                    Agregar fármaco a la prescripción:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    <div>
                      <label htmlFor="med-nombre" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Medicamento <span style={{ color: 'var(--color-danger-text)' }}>*</span>
                      </label>
                      <input
                        id="med-nombre"
                        type="text"
                        value={medNombre}
                        onChange={(e) => setMedNombre(e.target.value)}
                        placeholder="ej. Losartán Potásico"
                        style={{ width: '100%', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '8px 10px', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label htmlFor="med-pres" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Presentación
                      </label>
                      <select
                        id="med-pres"
                        value={medPresentacion}
                        onChange={(e) => setMedPresentacion(e.target.value)}
                        style={{ width: '100%', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '8px 10px', fontSize: '13px' }}
                      >
                        <option value="Tableta">Tableta</option>
                        <option value="Comprimido">Comprimido</option>
                        <option value="Cápsula">Cápsula</option>
                        <option value="Jarabe">Jarabe</option>
                        <option value="Suspensión">Suspensión</option>
                        <option value="Inhalador">Inhalador</option>
                        <option value="Ampolla">Ampolla</option>
                        <option value="Crema / Ungüento">Crema / Ungüento</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="med-conc" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Concentración
                      </label>
                      <input
                        id="med-conc"
                        type="text"
                        value={medConcentracion}
                        onChange={(e) => setMedConcentracion(e.target.value)}
                        placeholder="ej. 50 mg, 850 mg"
                        style={{ width: '100%', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '8px 10px', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label htmlFor="med-dosis" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Dosis y unidad
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          id="med-dosis"
                          type="text"
                          value={medDosis}
                          onChange={(e) => setMedDosis(e.target.value)}
                          placeholder="1"
                          style={{ width: '60px', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '8px 10px', fontSize: '13px' }}
                        />
                        <input
                          type="text"
                          value={medUnidad}
                          onChange={(e) => setMedUnidad(e.target.value)}
                          placeholder="tableta"
                          style={{ flex: 1, backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '8px 10px', fontSize: '13px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="med-frec" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Frecuencia
                      </label>
                      <input
                        id="med-frec"
                        type="text"
                        value={medFrecuencia}
                        onChange={(e) => setMedFrecuencia(e.target.value)}
                        placeholder="ej. Cada 12 horas"
                        style={{ width: '100%', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '8px 10px', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label htmlFor="med-dur" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Duración
                      </label>
                      <input
                        id="med-dur"
                        type="text"
                        value={medDuracion}
                        onChange={(e) => setMedDuracion(e.target.value)}
                        placeholder="ej. 30 días"
                        style={{ width: '100%', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '8px 10px', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label htmlFor="med-via" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Vía de administración
                      </label>
                      <select
                        id="med-via"
                        value={medVia}
                        onChange={(e) => setMedVia(e.target.value)}
                        style={{ width: '100%', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '8px 10px', fontSize: '13px' }}
                      >
                        <option value="Oral">Oral</option>
                        <option value="Intravenosa">Intravenosa</option>
                        <option value="Intramuscular">Intramuscular</option>
                        <option value="Subcutánea">Subcutánea</option>
                        <option value="Inhalatoria">Inhalatoria</option>
                        <option value="Tópica">Tópica</option>
                        <option value="Oftálmica">Oftálmica</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="med-ind" style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Indicaciones especiales
                      </label>
                      <input
                        id="med-ind"
                        type="text"
                        value={medIndicaciones}
                        onChange={(e) => setMedIndicaciones(e.target.value)}
                        placeholder="ej. Tomar con alimentos por la mañana"
                        style={{ width: '100%', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '8px 10px', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <Button size="sm" variant="primary" onClick={agregarMedicamento} leftIcon={<Plus size={14} />}>
                      Agregar fármaco a la receta
                    </Button>
                  </div>
                </div>

                {/* Tabla de medicamentos agregados */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-strong)', marginBottom: '8px' }}>
                    Fármacos prescritos ({medicamentos.length}):
                  </div>

                  {medicamentos.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', backgroundColor: 'var(--color-input-bg)', borderRadius: '8px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                      No ha agregado medicamentos a la receta aún.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {medicamentos.map((m, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: 'var(--color-panel)',
                            border: '1px solid var(--color-border)',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            fontSize: '13px'
                          }}
                        >
                          <div>
                            <strong style={{ color: 'var(--color-strong)' }}>{m.nombre}</strong> {m.concentracion} — {m.presentacion}
                            <div style={{ color: 'var(--color-text-secondary)', marginTop: '2px', fontSize: '12px' }}>
                              Dosis: {m.dosis} {m.unidad} · Frecuencia: {m.frecuencia} · Duración: {m.duracion} ({m.via})
                            </div>
                            {m.indicaciones && (
                              <div style={{ color: 'var(--color-primary)', fontSize: '12px', marginTop: '2px' }}>
                                Indicaciones: {m.indicaciones}
                              </div>
                            )}
                          </div>
                          <Button size="sm" variant="secondary" onClick={() => eliminarMedicamento(idx)} aria-label="Eliminar medicamento">
                            <Trash2 size={13} style={{ color: 'var(--color-danger-text)' }} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Observaciones generales de la receta */}
                <div>
                  <label htmlFor="rec-obs" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-strong)', marginBottom: '4px' }}>
                    Observaciones y advertencias generales de la receta
                  </label>
                  <input
                    id="rec-obs"
                    type="text"
                    value={observacionesReceta}
                    onChange={(e) => setObservacionesReceta(e.target.value)}
                    placeholder="ej. Reevaluar en 7 días si no hay mejoría. Hidratación constante..."
                    style={{ width: '100%', backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-input)', padding: '8px 12px', fontSize: '13px' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* PASO 5: Revisión Final y Confirmación */}
        {paso === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-strong)', margin: 0 }}>
                Paso 5: Revisión Consolidada de la Consulta
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Verifique minuciosamente la información clínica antes de su firma y almacenamiento definitivo en el expediente.
              </p>
            </div>

            {/* Tarjeta 1: Datos de la Consulta */}
            <div style={{ backgroundColor: 'var(--color-panel)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-input)', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-strong)' }}>Datos de Consulta</span>
                <Button size="sm" variant="secondary" onClick={() => setPaso(1)} leftIcon={<Edit2 size={12} />}>
                  Editar paso 1
                </Button>
              </div>
              <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>Motivo:</strong> {motivo}</div>
                {sintomas && <div><strong>Síntomas:</strong> {sintomas}</div>}
                {observaciones && <div><strong>Observaciones:</strong> {observaciones}</div>}
                {citaVinculada && <div><strong>Cita vinculada:</strong> {citaVinculada.fecha} · {citaVinculada.horaInicio} h</div>}
              </div>
            </div>

            {/* Tarjeta 2: Signos Vitales */}
            <div style={{ backgroundColor: 'var(--color-panel)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-input)', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-strong)' }}>Signos Vitales y Parámetros</span>
                <Button size="sm" variant="secondary" onClick={() => setPaso(2)} leftIcon={<Edit2 size={12} />}>
                  Editar paso 2
                </Button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', fontSize: '13px' }}>
                <div>Peso: <strong>{pesoKg ? `${pesoKg} kg` : 'No medido (null)'}</strong></div>
                <div>Talla: <strong>{tallaCm ? `${tallaCm} cm` : 'No medido (null)'}</strong></div>
                {imcCalculado && <div>IMC: <strong>{imcCalculado.valor} ({imcCalculado.estado})</strong></div>}
                <div>Temperatura: <strong>{temperaturaC ? `${temperaturaC} °C` : 'No medido (null)'}</strong></div>
                <div>Presión: <strong>{presionSistolica && presionDiastolica ? `${presionSistolica}/${presionDiastolica} mmHg` : 'No medido (null)'}</strong></div>
                <div>Frec. Cardíaca: <strong>{frecuenciaCardiaca ? `${frecuenciaCardiaca} lpm` : 'No medido (null)'}</strong></div>
                <div>Frec. Respiratoria: <strong>{frecuenciaRespiratoria ? `${frecuenciaRespiratoria} rpm` : 'No medido (null)'}</strong></div>
                <div>Sat. O₂: <strong>{saturacionOxigeno ? `${saturacionOxigeno} %` : 'No medido (null)'}</strong></div>
              </div>
            </div>

            {/* Tarjeta 3: Diagnósticos y Tratamientos */}
            <div style={{ backgroundColor: 'var(--color-panel)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-input)', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-strong)' }}>Diagnósticos y Tratamientos</span>
                <Button size="sm" variant="secondary" onClick={() => setPaso(3)} leftIcon={<Edit2 size={12} />}>
                  Editar paso 3
                </Button>
              </div>
              <div style={{ fontSize: '13px' }}>
                <div><strong>Diagnóstico Principal:</strong> {diagnosticos.find((d) => d.esPrincipal) ? `${diagnosticos.find((d) => d.esPrincipal)?.codigoCIE} — ${diagnosticos.find((d) => d.esPrincipal)?.nombre}` : 'Sin diagnóstico principal'}</div>
                {diagnosticos.filter((d) => !d.esPrincipal).length > 0 && (
                  <div style={{ marginTop: '4px' }}>
                    <strong>Secundarios:</strong> {diagnosticos.filter((d) => !d.esPrincipal).map((d) => `${d.codigoCIE} (${d.nombre})`).join(', ')}
                  </div>
                )}
                {tratamientos.length > 0 && (
                  <div style={{ marginTop: '6px' }}>
                    <strong>Tratamientos:</strong> {tratamientos.map((t) => t.descripcion).join('; ')}
                  </div>
                )}
              </div>
            </div>

            {/* Tarjeta 4: Prescripción Médica */}
            <div style={{ backgroundColor: 'var(--color-panel)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-input)', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-strong)' }}>Receta Médica Oficial</span>
                <Button size="sm" variant="secondary" onClick={() => setPaso(4)} leftIcon={<Edit2 size={12} />}>
                  Editar paso 4
                </Button>
              </div>
              <div style={{ fontSize: '13px' }}>
                {!emitirReceta ? (
                  <span style={{ color: 'var(--color-text-secondary)' }}>Sin emisión de receta en esta atención.</span>
                ) : (
                  <div>
                    <div><strong>Fármacos prescritos ({medicamentos.length}):</strong></div>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                      {medicamentos.map((m, i) => (
                        <li key={i}>
                          <strong>{m.nombre}</strong> {m.concentracion} — {m.dosis} {m.unidad}, {m.frecuencia} por {m.duracion} ({m.via}).
                        </li>
                      ))}
                    </ul>
                    {observacionesReceta && <div style={{ marginTop: '6px' }}><em>{observacionesReceta}</em></div>}
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--color-selection)',
                border: '1px solid var(--color-primary)',
                borderRadius: 'var(--radius-input)',
                padding: '12px 16px',
                fontSize: '13px',
                color: 'var(--color-primary)'
              }}
            >
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <CheckCircle2 size={16} />
                Certificación clínica de la atención
              </div>
              <span>
                Al confirmar, la consulta quedará archivada en el expediente con estado <strong>FINALIZADA</strong> y firma del profesional en sesión. Si esta consulta proviene de una cita programada, pasará automáticamente a estado <strong>ATENDIDA</strong>.
              </span>
            </div>
          </div>
        )}

        {/* Barra de Navegación del Asistente */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '28px',
            borderTop: '1px solid var(--color-divider)',
            paddingTop: '20px'
          }}
        >
          <div>
            {paso > 1 ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setErrorValidacion(null);
                  setPaso((paso - 1) as any);
                }}
                leftIcon={<ChevronLeft size={16} />}
              >
                Paso anterior
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => navigate(`/pacientes/${paciente.id}`)}
              >
                Cancelar y salir
              </Button>
            )}
          </div>

          <div>
            {paso < 5 ? (
              <Button
                variant="primary"
                disabled={Boolean(errorBloqueanteCita)}
                onClick={avanzarPaso}
                rightIcon={<ChevronRight size={16} />}
              >
                Siguiente paso
              </Button>
            ) : (
              <Button
                variant="primary"
                disabled={Boolean(errorBloqueanteCita)}
                loading={guardando}
                onClick={handleConfirmarConsulta}
                leftIcon={<CheckCircle2 size={16} />}
              >
                Confirmar y Registrar Consulta Completa
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
