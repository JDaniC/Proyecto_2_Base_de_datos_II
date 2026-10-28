import { getErrorMessage } from '../../services/errors';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, FileText } from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import {
  TipoIdentificacion,
  SexoAdministrativo,
  ResponsablePediatrico,
  PacienteDuplicadoException
} from '../../services/types';
import type { Paciente, ActualizarPacienteDTO } from '../../services/types';
import { generarClaveIdempotencia } from '../../services/http/idempotency';
import { HttpError } from '../../services/http/errors';
import { mapearAlta, mapearCambio } from '../../services/http/patients/patientMapper';
import { toClinicDateTimeInput } from '../../services/dates';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { Select } from '../../design-system/components/Select';
import { Panel } from '../../design-system/components/Panel';
import { Alert } from '../../design-system/components/Alert';
import { Toast } from '../../design-system/components/Toast';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { ExistingGuardianSelector } from './components/ExistingGuardianSelector';

export const PatientFormPage: React.FC = () => {
  const { pacienteId } = useParams<{ pacienteId: string }>();
  const { sesion } = useAuthSession();
  if (!sesion) return null;
  if (!sesion.permisos.includes('pacientes.administrar')) return <Alert variant="warning" title="Acceso restringido">Tu cuenta no permite administrar pacientes.</Alert>;
  return <PatientForm key={`${sesion?.cuentaId}/${pacienteId ?? 'nuevo'}`} />;
};

const PatientForm: React.FC = () => {
  const { pacienteId } = useParams<{ pacienteId: string }>();
  const isEditing = Boolean(pacienteId);
  const navigate = useNavigate();
  const { sesion } = useAuthSession();
  const { patientRepository, mode } = useServices();
  const esApi = mode === 'api';
  const original = useRef<Paciente | null>(null);
  const envioActivo = useRef(false);
  const intencion = useRef<{ firma: string; clave: string } | null>(null);
  const [resultadoIncierto, setResultadoIncierto] = useState(false);
  const [cargaFallida, setCargaFallida] = useState(false);

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  // Datos generales
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [sexo, setSexo] = useState<SexoAdministrativo | ''>('MASCULINO');
  const [tipoIdentificacion, setTipoIdentificacion] = useState<TipoIdentificacion>('CUI');
  const [numeroIdentificacion, setNumeroIdentificacion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [direccion, setDireccion] = useState('');
  const [grupoSanguineo, setGrupoSanguineo] = useState('');
  const [responsablesExistentes, setResponsablesExistentes] = useState<ResponsablePediatrico[]>([]);
  const documentoOpcional = esApi || institucionId === 'CLINICA_ODONTOLOGICA' || institucionId === 'CENTRO_PEDIATRICO';

  // Hospital: Contacto de emergencia
  const [contactoNombre, setContactoNombre] = useState('');
  const [contactoApellidos, setContactoApellidos] = useState('');
  const [contactoParentesco, setContactoParentesco] = useState('');
  const [contactoTelefono, setContactoTelefono] = useState('');

  // Pediatría: Responsable legal
  const [respNombre, setRespNombre] = useState('');
  const [respApellidos, setRespApellidos] = useState('');
  const [respParentesco, setRespParentesco] = useState('Madre');
  const [respDocumento, setRespDocumento] = useState('');
  const [respTipoDocumento, setRespTipoDocumento] = useState<'CUI' | 'PASAPORTE'>('CUI');
  const [respTelefono, setRespTelefono] = useState('');
  const [respEsPrincipal, setRespEsPrincipal] = useState(true);
  const [respAutoriza, setRespAutoriza] = useState(true);
  const [usarResponsableExistente, setUsarResponsableExistente] = useState(false);
  const [responsableSeleccionado, setResponsableSeleccionado] = useState<ResponsablePediatrico | null>(null);
  const [duplicadoResponsable, setDuplicadoResponsable] = useState(false);

  // Estados de control
  const [cargandoInicial, setCargandoInicial] = useState(isEditing);
  const [guardando, setGuardando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [errorDuplicado, setErrorDuplicado] = useState<{
    id: string;
    nombre: string;
    codigo: string;
    documento: string;
  } | null>(null);
  const [toastMensaje, setToastMensaje] = useState<string | null>(null);

  // Cargar datos para edición si corresponde
  useEffect(() => {
    if (!isEditing || !pacienteId) return;

    let mounted = true;
    (async () => {
      try {
        const paciente = await patientRepository.obtenerPorId(institucionId, pacienteId);
        if (!mounted) return;
        if (!paciente) {
          setCargaFallida(true);
          setErrorValidacion('El expediente solicitado no existe o no pertenece a esta institución.');
          return;
        }
        if (mounted) {
          original.current = paciente;
          setNombres(paciente.nombres);
          setApellidos(paciente.apellidos);
          setFechaNacimiento(paciente.fechaNacimiento);
          setSexo(paciente.sexo);
          setTipoIdentificacion(paciente.tipoIdentificacion);
          setNumeroIdentificacion(paciente.numeroIdentificacion);
          setTelefono(paciente.telefono);
          setCorreo(paciente.correo);
          setDireccion(paciente.direccion);
          setGrupoSanguineo(paciente.grupoSanguineo || '');
          setResponsablesExistentes(paciente.responsables || []);

          if (paciente.contactoEmergencia) {
            setContactoNombre(esApi ? paciente.contactoEmergencia.nombres || '' : paciente.contactoEmergencia.nombre);
            setContactoApellidos(paciente.contactoEmergencia.apellidos || '');
            setContactoParentesco(paciente.contactoEmergencia.parentesco);
            setContactoTelefono(paciente.contactoEmergencia.telefono);
          }

          if (paciente.responsables && paciente.responsables.length > 0) {
            const resp = paciente.responsables.find(r => r.esPrincipal) || paciente.responsables[0];
            setRespNombre(resp.nombre);
            setRespParentesco(resp.parentesco);
            setRespDocumento(resp.documento || '');
            setRespTelefono(resp.telefono);
            setRespEsPrincipal(resp.esPrincipal);
            setRespAutoriza(resp.autorizaAtencion);
          }
        }
      } catch (err) {
        if (mounted) {
          setCargaFallida(true);
          setErrorValidacion(getErrorMessage(err, 'No se pudo cargar el perfil. Recarga para reintentar.'));
        }
      } finally {
        if (mounted) setCargandoInicial(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [institucionId, isEditing, pacienteId, patientRepository, esApi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (envioActivo.current || cargaFallida) return;
    setErrorValidacion(null);
    setErrorDuplicado(null);
    setDuplicadoResponsable(false);

    // Validaciones base
    if (!nombres.trim() || !apellidos.trim()) {
      setErrorValidacion('Por favor ingrese nombres y apellidos del paciente.');
      return;
    }

    if (!fechaNacimiento && (!isEditing || original.current?.fechaNacimiento)) {
      setErrorValidacion('La fecha de nacimiento es obligatoria.');
      return;
    }

    if (fechaNacimiento > toClinicDateTimeInput().slice(0, 10)) {
      setErrorValidacion('La fecha de nacimiento no puede ser futura.');
      return;
    }

    if (!esApi && !documentoOpcional && !numeroIdentificacion.trim()) {
      setErrorValidacion('El número de identificación o código de menor es obligatorio.');
      return;
    }

    if (!esApi && !telefono.trim()) {
      setErrorValidacion('Debe ingresar un número telefónico de contacto.');
      return;
    }

    // Validación Pediatría: Responsable principal y autorización
    if (institucionId === 'CENTRO_PEDIATRICO' && !(esApi && isEditing)) {
      if (esApi && usarResponsableExistente && !responsableSeleccionado) {
        setErrorValidacion('Busca un menor y selecciona al responsable registrado que vincularás.');
        return;
      }
      if (!(esApi && usarResponsableExistente) && (!respNombre.trim() || (esApi && (!respApellidos.trim() || !respDocumento.trim() || !respTelefono.trim())))) {
        setErrorValidacion('En Pediatría es obligatorio registrar los datos del responsable legal / tutor.');
        return;
      }
      if (!respEsPrincipal) {
        setErrorValidacion('Selecciona un responsable principal.');
        return;
      }
      if (!esApi && !respAutoriza) {
        setErrorValidacion('Se requiere confirmación explícita de autorización de atención clínica por parte del tutor.');
        return;
      }
    }

    if (!sexo && (!isEditing || original.current?.sexo)) {
      setErrorValidacion('Selecciona el sexo administrativo.');
      return;
    }
    if (esApi && institucionId === 'HOSPITAL_GENERAL' && (contactoNombre.trim() || contactoApellidos.trim() || contactoParentesco.trim() || contactoTelefono.trim()) && (!contactoNombre.trim() || !contactoApellidos.trim() || !contactoParentesco.trim() || !contactoTelefono.trim())) {
      setErrorValidacion('Completa nombres, apellidos, parentesco y teléfono del contacto o retira todos sus campos.');
      return;
    }
    envioActivo.current = true;
    setGuardando(true);
    let confirmado = false;

    try {
      const contactoEmergencia =
        institucionId === 'HOSPITAL_GENERAL' && contactoNombre.trim()
          ? {
              nombre: esApi ? `${contactoNombre.trim()} ${contactoApellidos.trim()}` : contactoNombre.trim(),
              ...(esApi ? { nombres: contactoNombre.trim(), apellidos: contactoApellidos.trim() } : {}),
              parentesco: contactoParentesco.trim() || 'Familiar',
              telefono: contactoTelefono.trim() || telefono.trim()
            }
          : undefined;

      const responsablePrincipal =
        esApi && usarResponsableExistente && responsableSeleccionado
          ? [{ ...responsableSeleccionado, parentesco: respParentesco, esPrincipal: respEsPrincipal, autorizaAtencion: respAutoriza }]
          : institucionId === 'CENTRO_PEDIATRICO' && respNombre.trim()
          ? [
              {
                id: responsablesExistentes.find(r => r.esPrincipal)?.id || (esApi ? '' : `resp-${Date.now()}`),
                nombre: respNombre.trim(),
                ...(esApi ? { nombres: respNombre.trim(), apellidos: respApellidos.trim(), tipoDocumento: respTipoDocumento } : {}),
                parentesco: respParentesco,
                telefono: respTelefono.trim() || telefono.trim(),
                documento: respDocumento.trim(),
                esPrincipal: respEsPrincipal,
                autorizaAtencion: respAutoriza
              }
            ]
          : undefined;

      const responsables = responsablePrincipal ? [...responsablesExistentes.filter(r => !r.esPrincipal), ...responsablePrincipal] : undefined;
      const documento = numeroIdentificacion.trim() || '';
      const tipoDocumento = documento ? tipoIdentificacion : institucionId === 'CENTRO_PEDIATRICO' ? 'SIN_DOCUMENTO_MENOR' : 'SIN_DOCUMENTO';

      const datos = { nombres: nombres.trim(), apellidos: apellidos.trim(), fechaNacimiento, sexo: sexo as SexoAdministrativo, tipoIdentificacion: tipoDocumento,
        numeroIdentificacion: documento, grupoSanguineo: institucionId === 'HOSPITAL_GENERAL' ? grupoSanguineo : undefined,
        telefono, correo, direccion, contactoEmergencia, responsables: esApi && isEditing ? undefined : responsables };
      const cambios: Omit<ActualizarPacienteDTO, 'idempotencyKey'> = {};
      if (esApi && isEditing && original.current) {
        const previo = original.current;
        cambios.versionEsperada = previo.version;
        for (const campo of ['nombres', 'apellidos', 'fechaNacimiento', 'sexo', 'telefono', 'correo', 'direccion', 'grupoSanguineo'] as const) {
          if (campo === 'grupoSanguineo' && institucionId !== 'HOSPITAL_GENERAL') continue;
          if (datos[campo] !== (previo[campo] ?? (campo === 'grupoSanguineo' ? '' : undefined))) Object.assign(cambios, { [campo]: datos[campo] });
        }
        if (documento !== previo.numeroIdentificacion || (documento && tipoDocumento !== previo.tipoIdentificacion)) {
          cambios.tipoIdentificacion = tipoDocumento;
          cambios.numeroIdentificacion = documento;
        }
        const contactoCambio = (['nombres', 'apellidos', 'parentesco', 'telefono'] as const).some((c) => contactoEmergencia?.[c] !== previo.contactoEmergencia?.[c]);
        if (institucionId === 'HOSPITAL_GENERAL' && contactoCambio) {
          cambios.contactoEmergencia = contactoEmergencia ?? { nombre: '', parentesco: '', telefono: '' };
        }
        if (Object.keys(cambios).length === 1) {
          setErrorValidacion('No hay cambios para guardar.');
          return;
        }
      }
      const comando = esApi && isEditing ? cambios : datos;
      // La intención HTTP no incluye IDs temporales ni metadatos de presentación.
      const firma = JSON.stringify(esApi ? isEditing ? mapearCambio({ ...cambios, idempotencyKey: '' }) : mapearAlta({ ...datos, idempotencyKey: '' }) : comando);
      if (!intencion.current || intencion.current.firma !== firma) intencion.current = { firma, clave: generarClaveIdempotencia() };
      const idempotencyKey = intencion.current.clave;

      if (isEditing && pacienteId) {
        await patientRepository.actualizar(institucionId, pacienteId, {
          ...comando,
          idempotencyKey
        });
        confirmado = true;
        setToastMensaje('Expediente actualizado exitosamente.');
        navigate(`/pacientes/${pacienteId}`);
      } else {
        const nuevo = await patientRepository.crear(institucionId, {
          ...datos,
          idempotencyKey
        });
        confirmado = true;
        setToastMensaje(`Paciente registrado exitosamente con código ${nuevo.codigoLegible}.`);
        navigate(`/pacientes/${nuevo.id}`);
      }
    } catch (err) {
      if (err instanceof HttpError) {
        setResultadoIncierto(err.esReintentable || err.status >= 500);
        const esResponsable = Object.keys(err.campos ?? {}).some((c) => c.startsWith('responsables')) || (institucionId === 'CENTRO_PEDIATRICO' && !isEditing && usarResponsableExistente);
        if (err.codigo.includes('PACIENTE_DUPLICADO')) {
          // El contrato público puede omitir el campo del conflicto: no inferir a quién identifica.
          const puedeSerResponsable = esResponsable || (institucionId === 'CENTRO_PEDIATRICO' && !isEditing);
          setDuplicadoResponsable(puedeSerResponsable);
          setErrorValidacion(puedeSerResponsable ? 'Ya existe la identificación del paciente o de su responsable. Busca el paciente existente o selecciona un responsable registrado.' : 'El documento ya está registrado. Busca el paciente existente para reutilizar su perfil.');
        } else if (err.codigo.includes('VERSION_DESACTUALIZADA')) {
          setErrorValidacion(esResponsable ? 'Los datos del responsable cambiaron. Vuelve a seleccionarlo para revisar su versión actual; conservamos los datos del menor.' : 'Otra sesión modificó este perfil. Tus cambios siguen aquí; revisa el perfil actualizado antes de volver a editar.');
        } else {
          setErrorValidacion([getErrorMessage(err, 'No se pudo guardar.'), ...Object.values(err.campos ?? {})].join(' '));
        }
      } else
      if (err instanceof PacienteDuplicadoException) {
        setErrorDuplicado({
          id: err.pacienteExistenteId,
          nombre: err.pacienteExistenteNombre,
          codigo: err.pacienteExistenteCodigo,
          documento: err.numeroIdentificacion
        });
      } else {
        setErrorValidacion(
          getErrorMessage(err, 'Ocurrió un error inesperado al procesar el expediente.')
        );
      }
    } finally {
      if (!confirmado) envioActivo.current = false;
      setGuardando(false);
    }
  };

  if (cargandoInicial) {
    return (
      <div style={{ padding: '32px', maxWidth: '880px', margin: '0 auto' }}>
        <SkeletonLoader variant="card" height="240px" />
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 32px 64px', maxWidth: '960px', margin: '0 auto' }}>
      {/* Toast de confirmación */}
      <Toast
        toast={toastMensaje ? { id: 'pac-toast', type: 'success', message: toastMensaje } : null}
        onClose={() => setToastMensaje(null)}
      />

      {/* Migas de Pan */}
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
          {isEditing ? 'Editar expediente' : 'Nuevo paciente'}
        </span>
      </nav>

      {/* Encabezado */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 700,
              color: 'var(--color-strong)',
              margin: 0
            }}
          >
            {isEditing ? 'Modificación de expediente' : 'Alta administrativa de paciente'}
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--color-text-secondary)',
              marginTop: '4px',
              marginBottom: 0
            }}
          >
            Registra los datos de identificación y contacto del paciente.
          </p>
        </div>

        <Button
          variant="secondary"
          leftIcon={<ArrowLeft size={16} />}
          onClick={() => navigate('/pacientes')}
        >
          Volver a pacientes
        </Button>
      </div>

      {errorDuplicado && (
        <div style={{ marginBottom: '24px' }}>
          <Alert
            variant="warning"
            title="Este paciente ya está registrado"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ margin: 0 }}>
                El documento «<strong>{errorDuplicado.documento}</strong>» ya está asociado a «<strong>{errorDuplicado.nombre}</strong>» (expediente <strong>{errorDuplicado.codigo}</strong>).
              </p>
              <div>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<FileText size={15} />}
                  onClick={() => navigate(`/pacientes/${errorDuplicado.id}`)}
                >
                  Ver expediente existente
                </Button>
              </div>
            </div>
          </Alert>
        </div>
      )}

      {/* Error de validación regular */}
      {errorValidacion && (
        <div style={{ marginBottom: '24px' }}>
          <Alert variant="danger" title="Atención">
            {errorValidacion}
          </Alert>
        </div>
      )}

      {esApi && (errorValidacion?.includes('documento ya está registrado') || duplicadoResponsable) && numeroIdentificacion.trim() && (
        <Button variant="secondary" onClick={() => navigate(`/pacientes?q=${encodeURIComponent(numeroIdentificacion.trim())}`)}>Buscar paciente existente</Button>
      )}
      {duplicadoResponsable && <Button type="button" variant="secondary" onClick={() => { setUsarResponsableExistente(true); setResponsableSeleccionado(null); }}>Seleccionar responsable registrado</Button>}
      {resultadoIncierto && <Alert variant="warning" title="Resultado pendiente de confirmar">Conservamos los datos y la misma solicitud. Reintenta el envío para confirmar su resultado antes de cambiar los datos.</Alert>}
      {cargaFallida && <Button onClick={() => window.location.reload()}>Recargar perfil</Button>}

      <form onSubmit={handleSubmit}>
        <fieldset disabled={guardando || resultadoIncierto || cargaFallida} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {/* Panel 1: Datos Personales */}
        <Panel
          title="1. Datos de Identidad y Demográficos"
          subtitle="Información civil básica del paciente"
          style={{ marginBottom: '20px' }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px'
            }}
          >
            <Input
              label="Nombres del paciente *"
              maxLength={80}
              value={nombres}
              onChange={(e) => setNombres(e.target.value)}
              placeholder="Ej. Roberto Alexander"
              required
            />
            <Input
              label="Apellidos del paciente *"
              maxLength={80}
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              placeholder="Ej. Estrada Morales"
              required
            />
            <Input
              label="Fecha de nacimiento *"
              type="date"
              value={fechaNacimiento}
              max={toClinicDateTimeInput().slice(0, 10)}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              required={!isEditing || Boolean(original.current?.fechaNacimiento)}
            />
            {institucionId === 'HOSPITAL_GENERAL' && <Select label="Grupo sanguíneo" value={grupoSanguineo} onChange={e => setGrupoSanguineo(e.target.value)} options={[{ value: '', label: 'No registrado' }, ...['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(value => ({ value, label: value }))]} />}
            <Select
              label="Sexo / Género administrativo *"
              value={sexo}
              onChange={(e) => setSexo(e.target.value as SexoAdministrativo)}
              options={[
                ...(sexo === '' ? [{ value: '', label: original.current?.sexoLegado || 'Sin dato registrado' }] : []),
                { value: 'MASCULINO', label: 'Masculino' },
                { value: 'FEMENINO', label: 'Femenino' },
                { value: 'OTRO', label: 'Otro / No especificado' }
              ]}
            />
          </div>
        </Panel>

        {/* Panel 2: Documento y Contacto */}
        <Panel
          title="2. Documento y Contacto Institucional"
          subtitle="Datos para verificación y comunicación oficial"
          style={{ marginBottom: '20px' }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px'
            }}
          >
            <Select
              label="Tipo de documento *"
              value={tipoIdentificacion}
              onChange={(e) => { setTipoIdentificacion(e.target.value as TipoIdentificacion); if (esApi && e.target.value.startsWith('SIN_DOCUMENTO')) setNumeroIdentificacion(''); }}
              options={[
                { value: 'CUI', label: 'CUI (DPI de Guatemala)' },
                { value: 'PASAPORTE', label: 'Pasaporte extranjero' },
                ...(tipoIdentificacion === 'LEGADO' ? [{ value: 'LEGADO', label: original.current?.tipoIdentificacionLegado || 'Documento legado' }] : []),
                ...(documentoOpcional ? [{ value: institucionId === 'CENTRO_PEDIATRICO' ? 'SIN_DOCUMENTO_MENOR' : 'SIN_DOCUMENTO', label: 'Sin documento' }] : [])
              ]}
            />
            <Input
              label={documentoOpcional ? "Número de documento (opcional)" : "Número de documento / Identificación *"}
              value={numeroIdentificacion}
              maxLength={tipoIdentificacion === 'CUI' ? 20 : 40}
              onChange={(e) => setNumeroIdentificacion(e.target.value)}
              placeholder="Ej. 9900-10101-0101"
              required={!documentoOpcional}
            />
            <Input
              label={esApi ? 'Teléfono principal de contacto' : 'Teléfono principal de contacto *'}
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej. 5555-0104"
              maxLength={30}
              required={!esApi}
            />
            <Input
              label="Correo electrónico"
              maxLength={254}
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="ejemplo@correo.com"
            />
            <div style={{ gridColumn: '1 / -1' }}>
              <Input
                label="Dirección de residencia"
                maxLength={500}
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Dirección completa de domicilio"
              />
            </div>
          </div>
        </Panel>

        {/* Panel 3: Variantes Especializadas por Institución */}
        {institucionId === 'HOSPITAL_GENERAL' && (
          <Panel
            title="3. Contacto de Emergencia Hospitalario"
            subtitle="Contacto opcional para situaciones de emergencia"
            style={{ marginBottom: '20px' }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '16px'
              }}
            >
              <Input
                label={esApi ? 'Nombres del contacto' : 'Nombre completo del contacto'}
                value={contactoNombre}
                onChange={(e) => setContactoNombre(e.target.value)}
                placeholder="Ej. Marta Estrada"
              />
              {esApi && <Input label="Apellidos del contacto" value={contactoApellidos} maxLength={80} onChange={(e) => setContactoApellidos(e.target.value)} />}
              <Input
                label="Parentesco con el paciente"
                value={contactoParentesco}
                onChange={(e) => setContactoParentesco(e.target.value)}
                placeholder="Ej. Esposa, Hermano, Hija"
              />
              <Input
                label="Teléfono de emergencia"
                value={contactoTelefono}
                onChange={(e) => setContactoTelefono(e.target.value)}
                placeholder="Ej. 5555-1001"
              />
            </div>
          </Panel>
        )}

        {institucionId === 'CENTRO_PEDIATRICO' && !(esApi && isEditing) && (
          <Panel
            title="3. Responsable Legal / Tutor Pediátrico"
            subtitle="Responsable principal del menor; la autorización de atención se registra por separado"
            style={{ marginBottom: '20px' }}
          >
            {esApi && <Select label="Origen del responsable" value={usarResponsableExistente ? 'EXISTENTE' : 'NUEVO'} onChange={(e) => { setUsarResponsableExistente(e.target.value === 'EXISTENTE'); setResponsableSeleccionado(null); }} options={[{ value: 'NUEVO', label: 'Registrar nuevo responsable' }, { value: 'EXISTENTE', label: 'Vincular responsable registrado' }]} />}
            {esApi && usarResponsableExistente ? <>
              <ExistingGuardianSelector seleccionado={responsableSeleccionado} onSelect={setResponsableSeleccionado} />
              <Select label="Parentesco con el nuevo menor" value={respParentesco} onChange={(e) => setRespParentesco(e.target.value)} options={['Madre', 'Padre', 'Tutor Legal', 'Abuelo/a'].map((value) => ({ value, label: value }))} />
            </> : <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '16px',
                marginBottom: '16px'
              }}
            >
              <Input
                label={esApi ? 'Nombres del responsable *' : 'Nombre completo del tutor/a *'}
                value={respNombre}
                onChange={(e) => setRespNombre(e.target.value)}
                placeholder="Ej. Andrea Arrecis"
                required
              />
              {esApi && <Input label="Apellidos del responsable *" value={respApellidos} maxLength={200} required onChange={(e) => setRespApellidos(e.target.value)} />}
              <Select
                label="Parentesco *"
                value={respParentesco}
                onChange={(e) => setRespParentesco(e.target.value)}
                options={[
                  { value: 'Madre', label: 'Madre' },
                  { value: 'Padre', label: 'Padre' },
                  { value: 'Tutor Legal', label: 'Tutor Legal' },
                  { value: 'Abuelo/a', label: 'Abuelo/a' }
                ]}
              />
              <Input
                label={esApi ? 'Documento del responsable *' : 'DPI / CUI del responsable'}
                value={respDocumento}
                required={esApi}
                maxLength={respTipoDocumento === 'CUI' ? 20 : 40}
                onChange={(e) => setRespDocumento(e.target.value)}
                placeholder="Ej. 9900-40901-0101"
              />
              {esApi && <Select label="Tipo de documento del responsable" value={respTipoDocumento} onChange={(e) => setRespTipoDocumento(e.target.value as 'CUI' | 'PASAPORTE')} options={[{ value: 'CUI', label: 'CUI' }, { value: 'PASAPORTE', label: 'Pasaporte' }]} />}
              <Input
                label="Teléfono del tutor"
                value={respTelefono}
                required={esApi}
                maxLength={30}
                onChange={(e) => setRespTelefono(e.target.value)}
                placeholder="Ej. 5555-9401"
              />
            </div>
            </>}

            <div
              style={{
                backgroundColor: 'var(--color-panel)',
                padding: '14px 16px',
                borderRadius: 'var(--radius-input)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-strong)',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={respEsPrincipal}
                  onChange={(e) => setRespEsPrincipal(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
                />
                Responsable principal del menor
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={respAutoriza}
                  onChange={(e) => setRespAutoriza(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
                />
                Autoriza la atención clínica del menor
              </label>
            </div>
          </Panel>
        )}
        {esApi && isEditing && institucionId === 'CENTRO_PEDIATRICO' && <Panel title="Responsables vinculados"><p>La edición del perfil conserva los vínculos y autorizaciones existentes.</p>{responsablesExistentes.map((r) => <p key={r.id}>{r.nombre} · {r.parentesco}{r.esPrincipal ? ' · Principal' : ''}</p>)}</Panel>}
        </fieldset>

        {/* Botones de Acción */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '24px'
          }}
        >
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/pacientes')}
            disabled={guardando || cargaFallida || Boolean(toastMensaje)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            leftIcon={<Save size={18} />}
            disabled={guardando || cargaFallida || Boolean(toastMensaje)}
            aria-label={isEditing ? 'Guardar cambios de paciente' : 'Registrar paciente'}
          >
            {guardando
              ? 'Guardando datos...'
              : isEditing
              ? 'Guardar modificaciones'
              : 'Registrar paciente'}
          </Button>
        </div>
      </form>
    </div>
  );
};
