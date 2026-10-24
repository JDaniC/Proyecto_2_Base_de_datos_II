import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, Home } from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { Panel } from '../../design-system/components/Panel';
import { useAuthSession } from '../../app/AuthSessionContext';

export interface AccessRestrictedProps {
  codigo?: string;
  motivo?: string;
  permisoRequerido?: string;
  correlacion?: string;
}

export const AccessRestrictedPage: React.FC<AccessRestrictedProps> = () => {
  const navigate = useNavigate();
  const { cerrarSesion } = useAuthSession();

  const handleCambiarCuenta = async () => {
    await cerrarSesion();
    navigate('/acceso');
  };

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <Panel
        variant="white"
        padding="lg"
        style={{
          maxWidth: '540px',
          width: '100%',
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            backgroundColor: 'var(--color-danger-bg)',
            color: 'var(--color-danger-text)',
            border: '1px solid var(--color-danger-border)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '18px',
          }}
        >
          <ShieldAlert size={34} aria-hidden="true" />
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-strong)', marginBottom: '8px' }}>
          No tienes acceso a esta sección
        </h1>

        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
          Tu perfil no tiene acceso a esta sección. Si lo necesitas, solicita acceso a una persona administradora.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            onClick={() => navigate('/panel')}
            leftIcon={<Home size={16} />}
          >
            Volver al panel principal
          </Button>

          <Button
            variant="ghost"
            onClick={handleCambiarCuenta}
            leftIcon={<LogOut size={16} />}
          >
            Cambiar de cuenta
          </Button>
        </div>
      </Panel>
    </div>
  );
};
