import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Building2,
  Stethoscope,
  FlaskConical,
  Baby,
  HelpCircle,
  LogIn,
  KeyRound,
} from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { Alert } from '../../design-system/components/Alert';
import { Input } from '../../design-system/components/Input';
import { Select } from '../../design-system/components/Select';
import { Badge } from '../../design-system/components/Badge';
import { Switch } from '../../design-system/components/Switch';
import { Radio } from '../../design-system/components/Radio';
import { Panel } from '../../design-system/components/Panel';
import { Modal } from '../../design-system/components/Modal';
import { Tabs, TabItem } from '../../design-system/components/Tabs';
import { Toast, ToastMessage } from '../../design-system/components/Toast';
import { ProgressBar } from '../../design-system/components/ProgressBar';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { CuentaDemo, InstitucionId, SimulacionEscenario, AppError } from '../../services/types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { sesion, iniciarSesion } = useAuthSession();
  const { authRepository } = useServices();

  const [cuentas, setCuentas] = useState<CuentaDemo[]>([]);
  const [cuentaSeleccionadaId, setCuentaSeleccionadaId] = useState<string>('usr-hosp-med-01');
  const [filtroInstitucion, setFiltroInstitucion] = useState<string>('TODAS');
  const [emailInput, setEmailInput] = useState<string>('');
  const [escenario, setEscenario] = useState<SimulacionEscenario>('NORMAL');
  const [simularLatencia, setSimularLatencia] = useState<boolean>(true);
  const [enviando, setEnviando] = useState<boolean>(false);
  const [errorGlobal, setErrorGlobal] = useState<AppError | null>(null);
  const [campoError, setCampoError] = useState<string | null>(null);
  const [modalAyudaAbierto, setModalAyudaAbierto] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Redirigir a /sesion-activa si ya existe una sesión
  useEffect(() => {
    if (sesion) {
      navigate('/sesion-activa');
    }
  }, [sesion, navigate]);

  // Cargar catálogo de cuentas demo
  useEffect(() => {
    authRepository.obtenerCuentasDemo().then((lista) => {
      setCuentas(lista);
      const predeterminada = lista.find((c) => c.id === 'usr-hosp-med-01') || lista[0];
      if (predeterminada) {
        setCuentaSeleccionadaId(predeterminada.id);
        setEmailInput(predeterminada.email);
      }
    });
  }, [authRepository]);

  // Sincronizar input de correo al cambiar de cuenta
  const handleSeleccionarCuenta = (cuenta: CuentaDemo) => {
    setCuentaSeleccionadaId(cuenta.id);
    setEmailInput(cuenta.email);
    setErrorGlobal(null);
    setCampoError(null);
  };

  const cuentaActiva = cuentas.find((c) => c.id === cuentaSeleccionadaId);

  // Filtro de cuentas por institución
  const cuentasFiltradas = cuentas.filter((c) => {
    if (filtroInstitucion === 'TODAS') return true;
    return c.institucionId === filtroInstitucion;
  });

  const tabs: TabItem[] = [
    { id: 'TODAS', label: `Todas (${cuentas.length})` },
    {
      id: 'HOSPITAL_GENERAL',
      label: 'Hospital General',
      badge: <Badge variant="neutral">PostgreSQL</Badge>,
    },
    {
      id: 'CLINICA_ODONTOLOGICA',
      label: 'Clínica Odontológica',
      badge: <Badge variant="neutral">MySQL</Badge>,
    },
    {
      id: 'LABORATORIO_CLINICO',
      label: 'Laboratorio Clínico',
      badge: <Badge variant="neutral">MongoDB</Badge>,
    },
    {
      id: 'CENTRO_PEDIATRICO',
      label: 'Centro Pediátrico',
      badge: <Badge variant="neutral">Firestore</Badge>,
    },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuentaActiva) return;

    setErrorGlobal(null);
    setCampoError(null);
    setEnviando(true);

    try {
      const nuevaSesion = await iniciarSesion({
        cuentaId: cuentaActiva.id,
        email: emailInput,
        escenario,
        simularLatencia,
      });

      setToast({
        id: `login-${Date.now()}`,
        type: 'success',
        message: `Bienvenido, ${nuevaSesion.nombre}. Acceso autenticado en ${nuevaSesion.institucionNombre}.`,
      });

      navigate('/sesion-activa');
    } catch (err: unknown) {
      const appErr = err as AppError;
      setErrorGlobal(appErr);
      if (appErr.campos?.email) {
        setCampoError(appErr.campos.email);
      }
      setToast({
        id: `err-${Date.now()}`,
        type: 'danger',
        message: appErr.mensaje || 'Error al iniciar sesión',
      });
    } finally {
      setEnviando(false);
    }
  };

  const getInstitucionIcon = (instId: InstitucionId) => {
    switch (instId) {
      case 'HOSPITAL_GENERAL':
        return <Building2 size={16} aria-hidden="true" />;
      case 'CLINICA_ODONTOLOGICA':
        return <Stethoscope size={16} aria-hidden="true" />;
      case 'LABORATORIO_CLINICO':
        return <FlaskConical size={16} aria-hidden="true" />;
      case 'CENTRO_PEDIATRICO':
        return <Baby size={16} aria-hidden="true" />;
    }
  };

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'ACTIVO':
        return 'success';
      case 'INACTIVO':
        return 'danger';
      case 'PENDIENTE':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background-alt)', padding: '24px 16px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Banner permanente de Modo Demostración */}
        <Alert
          variant="info"
          title="Modo demostración — sin autenticación real · Datos clínicos ficticios"
          icon={<ShieldAlert size={22} />}
        >
          Esta aplicación frontend simula honestamente la autenticación clínica con repositorios en memoria desacoplados.
          La institución y los permisos quedan determinados por la identidad seleccionada. No requiere contraseñas reales ni expone selector manual de motor de base de datos.
        </Alert>

        {/* Encabezado principal */}
        <header style={{ padding: '8px 4px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-strong)' }}>
            Plataforma Unificada de Historiales Clínicos
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Acceso institucional y catálogo sintético de evaluación · Bases de Datos II (URL)
          </p>
        </header>

        {/* Layout en dos columnas: Catálogo de Cuentas (Principal) y Panel de Acceso (Lateral) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px', gap: '24px', alignItems: 'start' }}>
          
          {/* COLUMNA 1: Catálogo interactivo de identidades sintéticas */}
          <Panel
            variant="white"
            title="Seleccionar cuenta institucional de evaluación"
            subtitle="Elija un perfil sintético para explorar la aplicación según el rol y motor correspondiente"
            padding="md"
          >
            {/* Tabs de Instituciones */}
            <Tabs
              tabs={tabs}
              activeTab={filtroInstitucion}
              onChange={setFiltroInstitucion}
              className="mb-4"
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
              {cuentasFiltradas.map((cuenta) => {
                const isSelected = cuenta.id === cuentaSeleccionadaId;
                return (
                  <div
                    key={cuenta.id}
                    onClick={() => handleSeleccionarCuenta(cuenta)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSeleccionarCuenta(cuenta);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    style={{
                      borderRadius: 'var(--radius-panel)',
                      border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      backgroundColor: isSelected ? 'var(--color-selection)' : 'var(--color-background)',
                      padding: '14px 16px',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                    }}
                  >
                    <div style={{ marginTop: '2px' }}>
                      <Radio
                        checked={isSelected}
                        onChange={() => handleSeleccionarCuenta(cuenta)}
                        aria-label={`Seleccionar cuenta de ${cuenta.nombre}`}
                        style={{ minHeight: 'auto', padding: 0, border: 'none', backgroundColor: 'transparent' }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-strong)' }}>
                          {cuenta.nombre}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Badge variant={getEstadoBadgeVariant(cuenta.estado)} withDot>
                            {cuenta.estado}
                          </Badge>
                          <Badge variant="neutral">
                            {cuenta.motorObjetivo}
                          </Badge>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {getInstitucionIcon(cuenta.institucionId)}
                          {cuenta.institucionNombre}
                        </span>
                        <span>•</span>
                        <span style={{ fontWeight: 600 }}>{cuenta.rolEtiqueta}</span>
                        {cuenta.colegiado && (
                          <>
                            <span>•</span>
                            <span>Col. {cuenta.colegiado}</span>
                          </>
                        )}
                      </div>

                      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '6px' }}>
                        {cuenta.descripcion}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* COLUMNA 2: Formulario de Verificación y Simulación */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Panel
              variant="subtle"
              title="Verificación de identidad"
              subtitle="Confirme los datos de la cuenta sintética para emitir la sesión simulada"
              padding="md"
            >
              {enviando && (
                <div style={{ marginBottom: '16px' }}>
                  <ProgressBar indeterminate label="Verificando identidad institucional..." />
                </div>
              )}

              {errorGlobal && (
                <div style={{ marginBottom: '16px' }}>
                  <Alert
                    variant="danger"
                    title={errorGlobal.codigo}
                    onClose={() => setErrorGlobal(null)}
                  >
                    <div>{errorGlobal.mensaje}</div>
                    <div style={{ fontSize: '12px', marginTop: '6px', opacity: 0.85 }}>
                      ID de correlación: <code>{errorGlobal.correlacion}</code>
                    </div>
                  </Alert>
                </div>
              )}

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {cuentaActiva && (
                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: 'var(--color-background)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-input)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                      Perfil seleccionado:
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-strong)' }}>
                      {cuentaActiva.nombre}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--color-primary)' }}>
                      {cuentaActiva.institucionNombre}
                    </span>
                  </div>
                )}

                <Input
                  label="Identificador / Correo sintético"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (campoError) setCampoError(null);
                  }}
                  error={campoError || undefined}
                  helperText="Para la demostración, el correo debe coincidir con la cuenta seleccionada"
                  placeholder="usuario@institucion.salud.gt"
                  leftIcon={<KeyRound size={16} />}
                  required
                />

                <Select
                  label="Simulación de respuesta de backend"
                  value={escenario}
                  onChange={(e) => setEscenario(e.target.value as SimulacionEscenario)}
                  options={[
                    { value: 'NORMAL', label: 'Respuesta normal (Éxito 200)' },
                    { value: '401_NO_AUTENTICADO', label: 'Simular 401 NO_AUTENTICADO' },
                    { value: '403_CUENTA_NO_HABILITADA', label: 'Simular 403 CUENTA_NO_HABILITADA' },
                    { value: '503_PERSISTENCIA_NO_DISPONIBLE', label: 'Simular 503 PERSISTENCIA_NO_DISPONIBLE' },
                  ]}
                  helperText="Permite auditar el comportamiento ante rechazos HTTP y fallos transaccionales"
                />

                <div style={{ paddingTop: '4px' }}>
                  <Switch
                    checked={simularLatencia}
                    onChange={setSimularLatencia}
                    label="Simular latencia de red (600 ms)"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={enviando}
                    leftIcon={<LogIn size={18} />}
                    style={{ width: '100%' }}
                  >
                    Iniciar sesión demo
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setModalAyudaAbierto(true)}
                    leftIcon={<HelpCircle size={16} />}
                  >
                    ¿Problemas de acceso o información de cuentas?
                  </Button>
                </div>
              </form>
            </Panel>

            {/* Tarjeta de permisos otorgados en la cuenta seleccionada */}
            {cuentaActiva && (
              <Panel variant="white" title="Permisos efectivos simulados" padding="sm">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {cuentaActiva.permisos.length > 0 ? (
                    cuentaActiva.permisos.map((p) => (
                      <Badge key={p} variant="neutral">
                        {p}
                      </Badge>
                    ))
                  ) : (
                    <span style={{ fontSize: '13px', color: 'var(--color-danger-text)', fontWeight: 500 }}>
                      Sin permisos (Cuenta no habilitada / inactiva)
                    </span>
                  )}
                </div>
              </Panel>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Ayuda e Información de Acceso */}
      <Modal
        isOpen={modalAyudaAbierto}
        onClose={() => setModalAyudaAbierto(false)}
        title="Instrucciones de Acceso Institucional (Demo)"
        description="Información para el evaluador del Proyecto Final de Bases de Datos II"
        footer={
          <Button variant="primary" onClick={() => setModalAyudaAbierto(false)}>
            Entendido
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', lineHeight: 1.5 }}>
          <p>
            <strong>Arquitectura de identidad:</strong> En un entorno de producción, la aplicación cliente intercambia
            credenciales con Firebase Authentication para recibir un JWT ID Token, el cual es verificado en el backend
            NestJS.
          </p>
          <p>
            <strong>Aislamiento de persistencia:</strong> Cada usuario clínico está vinculado a una única institución médica.
            La aplicación no permite al médico ni a la secretaría escoger el motor de base de datos; el enrutamiento se produce en el backend:
          </p>
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li><strong>Hospital General:</strong> PostgreSQL (transaccional, integridad referencial).</li>
            <li><strong>Clínica Odontológica:</strong> MySQL (agenda y consultas odontológicas).</li>
            <li><strong>Laboratorio Clínico:</strong> MongoDB (documentos semiestructurados de pruebas y muestras).</li>
            <li><strong>Centro Médico Pediátrico:</strong> Firebase / Cloud Firestore (pacientes menores y vacunas).</li>
          </ul>
          <p>
            <strong>Cuentas para comprobación de fallos:</strong>
            <br />
            - Use <em>Dr. Mateo Solares</em> para verificar el rechazo automático de cuentas en estado <code>INACTIVO</code>.
            <br />
            - Use <em>Lic. Diego Arévalo</em> para verificar el rechazo de cuentas en estado <code>PENDIENTE</code>.
            <br />
            - Use el selector de simulación para provocar respuestas <code>401</code> o <code>503</code>.
          </p>
        </div>
      </Modal>

      {/* Notificación flotante Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};
