import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut, Home } from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { Panel } from '../../design-system/components/Panel';
import { useAuthSession } from '../../app/AuthSessionContext';

export interface AccessRestrictedProps {
  codigo?: string;
  motivo?: string;
  permisoRequerido?: string;
  correlacion?: string;
}

export const AccessRestrictedPage: React.FC<AccessRestrictedProps> = ({
  codigo: customCodigo,
  motivo: customMotivo,
  permisoRequerido: customPermiso,
  correlacion: customCorr,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sesion, cerrarSesion } = useAuthSession();

  // Obtener estado pasado por enrutador si existe
  const state = (location.state || {}) as {
    codigo?: string;
    motivo?: string;
    permisoRequerido?: string;
    correlacion?: string;
  };

  const codigo = customCodigo || state.codigo || '403 ACCESO_DENEGADO';
  const motivo =
    customMotivo ||
    state.motivo ||
    'Su perfil profesional no cuenta con los permisos necesarios para acceder al módulo solicitado.';
  const permisoRequerido = customPermiso || state.permisoRequerido;
  const correlacion =
    customCorr || state.correlacion || `corr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  const handleCerrarSesion = async () => {
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

        <span
          style={{
            display: 'inline-block',
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--color-danger-text)',
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            padding: '3px 10px',
            borderRadius: 'var(--radius-pill)',
            marginBottom: '10px',
            letterSpacing: '0.5px',
          }}
        >
          {codigo}
        </span>

        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-strong)', marginBottom: '8px' }}>
          Módulo con Acceso Restringido
        </h1>

        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
          {motivo}
        </p>

        {sesion && (
          <div
            style={{
              backgroundColor: 'var(--color-background-alt)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-input)',
              padding: '12px 16px',
              textAlign: 'left',
              marginBottom: '20px',
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>Usuario autenticado: </span>
              <strong>{sesion.nombre}</strong> ({sesion.rolEtiqueta})
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)' }}>Sede asignada: </span>
              <strong>{sesion.institucionNombre}</strong>
            </div>
            {permisoRequerido && (
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Permiso faltante: </span>
                <code style={{ backgroundColor: 'var(--color-control)', padding: '2px 6px', borderRadius: '4px' }}>
                  {permisoRequerido}
                </code>
              </div>
            )}
          </div>
        )}

        <div
          style={{
            fontSize: '11px',
            color: 'var(--color-text-secondary)',
            marginBottom: '24px',
            fontFamily: 'monospace',
          }}
        >
          Referencia de auditoría: <code>{correlacion}</code>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            onClick={() => navigate('/panel')}
            leftIcon={<Home size={16} />}
          >
            Volver al panel principal
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft size={16} />}
          >
            Regresar
          </Button>

          <Button
            variant="ghost"
            onClick={handleCerrarSesion}
            leftIcon={<LogOut size={16} />}
          >
            Cambiar de cuenta
          </Button>
        </div>
      </Panel>
    </div>
  );
};
