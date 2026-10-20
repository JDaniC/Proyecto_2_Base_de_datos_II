import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, FileText } from 'lucide-react';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import {
  TipoIdentificacion,
  SexoAdministrativo,
  PacienteDuplicadoException
} from '../../services/types';
import { Button } from '../../design-system/components/Button';
import { Input } from '../../design-system/components/Input';
import { Select } from '../../design-system/components/Select';
import { Panel } from '../../design-system/components/Panel';
import { Alert } from '../../design-system/components/Alert';
import { Toast } from '../../design-system/components/Toast';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';

export const PatientFormPage: React.FC = () => {
  const { pacienteId } = useParams<{ pacienteId: string }>();
  const isEditing = Boolean(pacienteId);
  const navigate = useNavigate();
  const { sesion } = useAuthSession();
  const { patientRepository } = useServices();

  const institucionId = sesion?.institucionId || 'HOSPITAL_GENERAL';

  // Datos generales
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [sexo, setSexo] = useState<SexoAdministrativo>('MASCULINO');
  const [tipoIdentificacion, setTipoIdentificacion] = useState<TipoIdentificacion>('CUI');
  const [numeroIdentificacion, setNumeroIdentificacion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [direccion, setDireccion] = useState('');

  // Hospital: Contacto de emergencia
  const [contactoNombre, setContactoNombre] = useState('');
  const [contactoParentesco, setContactoParentesco] = useState('');
  const [contactoTelefono, setContactoTelefono] = useState('');

  // Pediatría: Responsable legal
  const [respNombre, setRespNombre] = useState('');
  const [respParentesco, setRespParentesco] = useState('Madre');
  const [respDocumento, setRespDocumento] = useState('');
  const [respTelefono, setRespTelefono] = useState('');
  const [respEsPrincipal, setRespEsPrincipal] = useState(true);
  const [respAutoriza, setRespAutoriza] = useState(true);

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
        if (!paciente) {
          setErrorValidacion('El expediente solicitado no existe o no pertenece a esta institución.');
          return;
        }
        if (mounted) {
          setNombres(paciente.nombres);
          setApellidos(paciente.apellidos);
          setFechaNacimiento(paciente.fechaNacimiento);
          setSexo(paciente.sexo);
          setTipoIdentificacion(paciente.tipoIdentificacion);
          setNumeroIdentificacion(paciente.numeroIdentificacion);
          setTelefono(paciente.telefono);
          setCorreo(paciente.correo);
          setDireccion(paciente.direccion);

          if (paciente.contactoEmergencia) {
            setContactoNombre(paciente.contactoEmergencia.nombre);
            setContactoParentesco(paciente.contactoEmergencia.parentesco);
            setContactoTelefono(paciente.contactoEmergencia.telefono);
          }

          if (paciente.responsables && paciente.responsables.length > 0) {
            const resp = paciente.responsables[0];
            setRespNombre(resp.nombre);
            setRespParentesco(resp.parentesco);
            setRespDocumento(resp.documento || '');
            setRespTelefono(resp.telefono);
            setRespEsPrincipal(resp.esPrincipal);
            setRespAutoriza(resp.autorizaAtencion);
          }
        }
      } catch (err) {
        console.error('Error cargando paciente:', err);
      } finally {
        if (mounted) setCargandoInicial(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [institucionId, isEditing, pacienteId, patientRepository]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);
    setErrorDuplicado(null);

    // Validaciones base
    if (!nombres.trim() || !apellidos.trim()) {
      setErrorValidacion('Por favor ingrese nombres y apellidos del paciente.');
      return;
    }

    if (!fechaNacimiento) {
      setErrorValidacion('La fecha civil de nacimiento es obligatoria.');
      return;
    }

    const fechaNac = new Date(fechaNacimiento);
    const hoy = new Date();
    if (fechaNac > hoy) {
      setErrorValidacion('La fecha de nacimiento no puede ser futura.');
      return;
    }

    if (!numeroIdentificacion.trim()) {
      setErrorValidacion('El número de identificación o código de menor es obligatorio.');
      return;
    }

    if (!telefono.trim()) {
      setErrorValidacion('Debe ingresar un número telefónico de contacto.');
      return;
    }

    // Validación Pediatría: Responsable principal y autorización
    if (institucionId === 'CENTRO_PEDIATRICO') {
      if (!respNombre.trim()) {
        setErrorValidacion('En Pediatría es obligatorio registrar los datos del responsable legal / tutor.');
        return;
      }
      if (!respEsPrincipal) {
        setErrorValidacion('Debe marcar al menos un responsable como principal (es_principal = true).');
        return;
      }
      if (!respAutoriza) {
        setErrorValidacion('Se requiere confirmación explícita de autorización de atención clínica por parte del tutor.');
        return;
      }
    }

    setGuardando(true);

    try {
      const idempotencyKey = `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      const contactoEmergencia =
        institucionId === 'HOSPITAL_GENERAL' && contactoNombre.trim()
          ? {
              nombre: contactoNombre.trim(),
              parentesco: contactoParentesco.trim() || 'Familiar',
              telefono: contactoTelefono.trim() || telefono.trim()
            }
          : undefined;

      const responsables =
        institucionId === 'CENTRO_PEDIATRICO' && respNombre.trim()
          ? [
              {
                id: `resp-${Date.now()}`,
                nombre: respNombre.trim(),
                parentesco: respParentesco,
                telefono: respTelefono.trim() || telefono.trim(),
                documento: respDocumento.trim(),
                esPrincipal: respEsPrincipal,
                autorizaAtencion: respAutoriza
              }
            ]
          : undefined;

      if (isEditing && pacienteId) {
        await patientRepository.actualizar(institucionId, pacienteId, {
          nombres,
          apellidos,
          fechaNacimiento,
          sexo,
          tipoIdentificacion,
          numeroIdentificacion,
          telefono,
          correo,
          direccion,
          contactoEmergencia,
          responsables,
          idempotencyKey
        });
        setToastMensaje('Expediente actualizado exitosamente.');
      } else {
        const nuevo = await patientRepository.crear(institucionId, {
          nombres,
          apellidos,
          fechaNacimiento,
          sexo,
          tipoIdentificacion,
          numeroIdentificacion,
          telefono,
          correo,
          direccion,
          contactoEmergencia,
          responsables,
          idempotencyKey
        });
        setToastMensaje(`Paciente registrado exitosamente con código ${nuevo.codigoLegible}.`);
      }

      setTimeout(() => {
        navigate('/pacientes');
      }, 1200);
    } catch (err) {
      if (err instanceof PacienteDuplicadoException) {
        setErrorDuplicado({
          id: err.pacienteExistenteId,
          nombre: err.pacienteExistenteNombre,
          codigo: err.pacienteExistenteCodigo,
          documento: err.numeroIdentificacion
        });
      } else {
        setErrorValidacion(
          err instanceof Error ? err.message : 'Ocurrió un error inesperado al procesar el expediente.'
        );
      }
    } finally {
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
            Institución activa:{' '}
            <strong style={{ color: 'var(--color-strong)' }}>{sesion?.institucionNombre}</strong>.
            Los datos registrados quedan vinculados al centro médico institucional.
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

      {/* Banner de Control de Duplicados 409 PACIENTE_DUPLICADO */}
      {errorDuplicado && (
        <div style={{ marginBottom: '24px' }}>
          <Alert
            variant="warning"
            title="Control de duplicados institucional (409 PACIENTE_DUPLICADO)"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ margin: 0 }}>
                El documento «<strong>{errorDuplicado.documento}</strong>» ya se encuentra registrado en este centro para el paciente «<strong>{errorDuplicado.nombre}</strong>» con expediente «<strong>{errorDuplicado.codigo}</strong>». Para garantizar la integridad del historial clínico, no se permite crear expedientes duplicados.
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

      <form onSubmit={handleSubmit}>
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
              value={nombres}
              onChange={(e) => setNombres(e.target.value)}
              placeholder="Ej. Roberto Alexander"
              required
            />
            <Input
              label="Apellidos del paciente *"
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              placeholder="Ej. Estrada Morales"
              required
            />
            <Input
              label="Fecha de nacimiento *"
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              required
            />
            <Select
              label="Sexo / Género administrativo *"
              value={sexo}
              onChange={(e) => setSexo(e.target.value as SexoAdministrativo)}
              options={[
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
              onChange={(e) => setTipoIdentificacion(e.target.value as TipoIdentificacion)}
              options={[
                { value: 'CUI', label: 'CUI (DPI de Guatemala)' },
                { value: 'PASAPORTE', label: 'Pasaporte extranjero' },
                { value: 'SIN_DOCUMENTO_MENOR', label: 'Sin documento / Menor (identificador provisional)' }
              ]}
            />
            <Input
              label="Número de documento / Identificación *"
              value={numeroIdentificacion}
              onChange={(e) => setNumeroIdentificacion(e.target.value)}
              placeholder="Ej. 9900-10101-0101"
              required
            />
            <Input
              label="Teléfono principal de contacto *"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej. 5555-0104"
              required
            />
            <Input
              label="Correo electrónico"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="ejemplo@correo.com"
            />
            <div style={{ gridColumn: '1 / -1' }}>
              <Input
                label="Dirección de residencia"
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
            title="3. Contacto de Emergencia Hospitalario (RF-H01)"
            subtitle="Requerido para admisiones y procedimientos de urgencia"
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
                label="Nombre completo del contacto"
                value={contactoNombre}
                onChange={(e) => setContactoNombre(e.target.value)}
                placeholder="Ej. Marta Estrada"
              />
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

        {institucionId === 'CENTRO_PEDIATRICO' && (
          <Panel
            title="3. Responsable Legal / Tutor Pediátrico (RF-P03, P01)"
            subtitle="Obligatorio en pediatría: vínculo y autorización de atención"
            style={{ marginBottom: '20px' }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '16px',
                marginBottom: '16px'
              }}
            >
              <Input
                label="Nombre completo del tutor/a *"
                value={respNombre}
                onChange={(e) => setRespNombre(e.target.value)}
                placeholder="Ej. Andrea Arrecis"
                required
              />
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
                label="DPI / CUI del responsable"
                value={respDocumento}
                onChange={(e) => setRespDocumento(e.target.value)}
                placeholder="Ej. 9900-40901-0101"
              />
              <Input
                label="Teléfono del tutor"
                value={respTelefono}
                onChange={(e) => setRespTelefono(e.target.value)}
                placeholder="Ej. 5555-9401"
              />
            </div>

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
                Responsable principal del menor (es_principal = true)
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
                Autoriza expresamente procedimientos y consultas clínicas (autoriza_atencion = true)
              </label>
            </div>
          </Panel>
        )}

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
            disabled={guardando}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            leftIcon={<Save size={18} />}
            disabled={guardando}
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
