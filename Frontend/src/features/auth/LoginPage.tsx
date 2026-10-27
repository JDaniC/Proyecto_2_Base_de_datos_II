import { getErrorMessage } from '../../services/errors';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
} from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { Alert } from '../../design-system/components/Alert';
import { Input } from '../../design-system/components/Input';
import { Panel } from '../../design-system/components/Panel';
import { Toast, ToastMessage } from '../../design-system/components/Toast';
import { ProgressBar } from '../../design-system/components/ProgressBar';
import { useAuthSession } from '../../app/AuthSessionContext';
import { AppError } from '../../services/types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { sesion, iniciarSesion } = useAuthSession();

  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [mostrarPassword, setMostrarPassword] = useState<boolean>(false);


  const [enviando, setEnviando] = useState<boolean>(false);
  const [errorGlobal, setErrorGlobal] = useState<AppError | null>(null);
  const [campoError, setCampoError] = useState<string | null>(null);
  const [campoPasswordError, setCampoPasswordError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Redirigir a /sesion-activa si ya existe sesión
  useEffect(() => {
    if (sesion) {
      navigate('/sesion-activa');
    }
  }, [sesion, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGlobal(null);
    setCampoError(null);
    setCampoPasswordError(null);
    setEnviando(true);

    try {
      const nuevaSesion = await iniciarSesion({
        email: emailInput,
        password: passwordInput,
        escenario: 'NORMAL',
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
      setErrorGlobal({ ...appErr, mensaje: getErrorMessage(err, 'No se pudo iniciar sesión. Inténtalo de nuevo.') });
      if (appErr.campos?.email) {
        setCampoError(appErr.campos.email);
      }
      if (appErr.campos?.password) {
        setCampoPasswordError(appErr.campos.password);
      }
    } finally {
      setEnviando(false);
    }
  };

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
            Acceso para personal de la institución
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
              <Alert variant="danger" title="No se pudo iniciar sesión" onClose={() => setErrorGlobal(null)}>
                <div>{errorGlobal.mensaje}</div>
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
              onChange={(e) => {
                setPasswordInput(e.target.value);
                if (campoPasswordError) setCampoPasswordError(null);
              }}
              error={campoPasswordError || undefined}
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

        </Panel>

      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};
