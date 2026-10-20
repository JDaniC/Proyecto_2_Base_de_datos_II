import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { Alert } from '../../design-system/components/Alert';
import { Input } from '../../design-system/components/Input';
import { Select } from '../../design-system/components/Select';
import { Panel } from '../../design-system/components/Panel';
import { Modal } from '../../design-system/components/Modal';
import { Toast, ToastMessage } from '../../design-system/components/Toast';
import { ProgressBar } from '../../design-system/components/ProgressBar';
import { useAuthSession } from '../../app/AuthSessionContext';
import { useServices } from '../../app/ServiceContext';
import { CuentaDemo, SimulacionEscenario, AppError } from '../../services/types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { sesion, iniciarSesion } = useAuthSession();
  const { authRepository } = useServices();

  const [cuentas, setCuentas] = useState<CuentaDemo[]>([]);
  const [emailInput, setEmailInput] = useState<string>('elena.morales@hospital-general.salud.gt');
  const [passwordInput, setPasswordInput] = useState<string>('Clinica2026!');
  const [mostrarPassword, setMostrarPassword] = useState<boolean>(false);
  const [recordarSesion, setRecordarSesion] = useState<boolean>(true);

  // Selector de prueba discreto para evaluación
  const [cuentaSeleccionadaId, setCuentaSeleccionadaId] = useState<string>('usr-hosp-med-01');
  const [escenario, setEscenario] = useState<SimulacionEscenario>('NORMAL');
  const [mostrarHerramientasEvaluacion, setMostrarHerramientasEvaluacion] = useState<boolean>(false);

  const [enviando, setEnviando] = useState<boolean>(false);
  const [errorGlobal, setErrorGlobal] = useState<AppError | null>(null);
  const [campoError, setCampoError] = useState<string | null>(null);
  const [modalAyudaAbierto, setModalAyudaAbierto] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Redirigir a /sesion-activa si ya existe sesión
  useEffect(() => {
    if (sesion) {
      navigate('/sesion-activa');
    }
  }, [sesion, navigate]);

  // Cargar cuentas sintéticas disponibles para el evaluador
  useEffect(() => {
    authRepository.obtenerCuentasDemo().then((lista) => {
      setCuentas(lista);
    });
  }, [authRepository]);

  const handleSeleccionarCuentaDemo = (cuentaId: string) => {
    setCuentaSeleccionadaId(cuentaId);
    const cuenta = cuentas.find((c) => c.id === cuentaId);
    if (cuenta) {
      setEmailInput(cuenta.email);
      setPasswordInput('Clinica2026!');
      setErrorGlobal(null);
      setCampoError(null);
      setToast({
        id: `demo-${Date.now()}`,
        type: 'info',
        message: `Perfil cargado: ${cuenta.nombre} (${cuenta.institucionNombre})`,
      });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGlobal(null);
    setCampoError(null);
    setEnviando(true);

    try {
      const nuevaSesion = await iniciarSesion({
        email: emailInput,
        password: passwordInput,
        cuentaId: cuentaSeleccionadaId,
        escenario,
        simularLatencia: import.meta.env.MODE !== 'test',
      });

      setToast({
        id: `login-${Date.now()}`,
        type: 'success',
        message: `Bienvenido, ${nuevaSesion.nombre}`,
      });

      navigate('/sesion-activa');
    } catch (err: unknown) {
      const appErr = err as AppError;
      setErrorGlobal(appErr);
      if (appErr.campos?.email) {
        setCampoError(appErr.campos.email);
      }
    } finally {
      setEnviando(false);
    }
  };

  const cuentaActiva = cuentas.find((c) => c.id === cuentaSeleccionadaId);

  // Opciones agrupadas de perfiles de prueba para el evaluador
  const opcionesCuentasDemo = [
    { value: '', label: '— Cargar un perfil de prueba preconfigurado —' },
    ...cuentas.map((c) => ({
      value: c.id,
      label: `[${c.institucionNombre.split(' ')[0]}] ${c.nombre} — ${c.rolEtiqueta} (${c.estado})`,
    })),
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-background-alt)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '32px 16px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Cabecera institucional limpia */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              backgroundColor: 'var(--color-selection)',
              color: 'var(--color-primary)',
              marginBottom: '14px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Stethoscope size={30} aria-hidden="true" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-strong)' }}>
            Plataforma de Historiales Clínicos
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Portal Institucional de Gestión de Expedientes Médicos
          </p>
        </div>

        {/* Tarjeta principal de Inicio de Sesión */}
        <Panel variant="white" padding="lg">
          {enviando && (
            <div style={{ marginBottom: '16px' }}>
              <ProgressBar indeterminate label="Verificando credenciales..." />
            </div>
          )}

          {errorGlobal && (
            <div style={{ marginBottom: '16px' }}>
              <Alert variant="danger" title={errorGlobal.codigo} onClose={() => setErrorGlobal(null)}>
                <div>{errorGlobal.mensaje}</div>
                {errorGlobal.correlacion && (
                  <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
                    Referencia: <code>{errorGlobal.correlacion}</code>
                  </div>
                )}
              </Alert>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <Input
              label="Correo institucional o usuario"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                if (campoError) setCampoError(null);
              }}
              error={campoError || undefined}
              placeholder="profesional@institucion.salud.gt"
              leftIcon={<Mail size={18} />}
              required
            />

            <Input
              label="Contraseña"
              type={mostrarPassword ? 'text' : 'password'}
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="••••••••••••"
              leftIcon={<Lock size={18} />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
              required
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={recordarSesion}
                  onChange={(e) => setRecordarSesion(e.target.checked)}
                  style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px' }}
                />
                <span style={{ color: 'var(--color-text-secondary)' }}>Recordar en este equipo</span>
              </label>

              <button
                type="button"
                onClick={() => setModalAyudaAbierto(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                ¿Olvidó su contraseña?
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={enviando}
              leftIcon={<LogIn size={18} />}
              style={{ width: '100%', marginTop: '4px' }}
            >
              Iniciar sesión
            </Button>
          </form>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid var(--color-divider)',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
            }}
          >
            <ShieldCheck size={16} color="var(--color-primary)" />
            <span>Acceso seguro con cifrado institucional SSL</span>
          </div>
        </Panel>

        {/* Panel plegable para el evaluador: Cuentas de demostración preconfiguradas */}
        <div
          style={{
            backgroundColor: 'var(--color-background)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-panel)',
            padding: '12px 16px',
          }}
        >
          <button
            type="button"
            onClick={() => setMostrarHerramientasEvaluacion(!mostrarHerramientasEvaluacion)}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              color: 'var(--color-strong)',
              fontSize: '13px',
              fontWeight: 600,
              padding: 0,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="var(--color-primary)" />
              Perfiles de prueba para evaluación (Demo)
            </span>
            <ChevronDown
              size={16}
              style={{
                transform: mostrarHerramientasEvaluacion ? 'rotate(180deg)' : 'none',
                transition: 'transform var(--transition-fast)',
              }}
            />
          </button>

          {mostrarHerramientasEvaluacion && (
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-divider)' }}>
              <Select
                label="Cargar cuenta de demostración"
                value={cuentaSeleccionadaId}
                onChange={(e) => handleSeleccionarCuentaDemo(e.target.value)}
                options={opcionesCuentasDemo}
                helperText="Seleccione una cuenta para autocompletar credenciales y probar la institución correspondiente"
              />

              {cuentaActiva && (
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-control)', padding: '8px 12px', borderRadius: '8px' }}>
                  <strong>Perfil activo:</strong> {cuentaActiva.nombre} ({cuentaActiva.rolEtiqueta}) — <em>{cuentaActiva.institucionNombre}</em>
                </div>
              )}

              <Select
                label="Simular respuesta del servidor"
                value={escenario}
                onChange={(e) => setEscenario(e.target.value as SimulacionEscenario)}
                options={[
                  { value: 'NORMAL', label: 'Respuesta normal (Éxito 200)' },
                  { value: '401_NO_AUTENTICADO', label: 'Simular 401 Credenciales inválidas' },
                  { value: '403_CUENTA_NO_HABILITADA', label: 'Simular 403 Cuenta no habilitada' },
                  { value: '503_PERSISTENCIA_NO_DISPONIBLE', label: 'Simular 503 Servicio no disponible' },
                ]}
              />
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          Entorno Clínico · Proyecto de Bases de Datos II · Universidad Rafael Landívar
        </p>
      </div>

      {/* Modal de Asistencia y Recuperación de Acceso */}
      <Modal
        isOpen={modalAyudaAbierto}
        onClose={() => setModalAyudaAbierto(false)}
        title="Asistencia de Acceso Institucional"
        description="Información de soporte para usuarios del sistema clínico"
        footer={
          <Button variant="primary" onClick={() => setModalAyudaAbierto(false)}>
            Cerrar
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', lineHeight: 1.5 }}>
          <p>
            Para restablecer su contraseña institucional o solicitar habilitación de cuenta:
          </p>
          <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>Contacte al Departamento de Informática o Administración de su sede.</li>
            <li>Su cuenta debe encontrarse en estado <strong>ACTIVO</strong> para ingresar al portal.</li>
            <li>En este entorno de evaluación, puede desplegar la sección <em>«Perfiles de prueba para evaluación»</em> en la parte inferior para alternar entre roles médicos y administrativos.</li>
          </ul>
        </div>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};
