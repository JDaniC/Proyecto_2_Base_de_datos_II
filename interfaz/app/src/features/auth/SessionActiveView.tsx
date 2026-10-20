import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  Building2,
  CheckCircle2,
  Database,
  Info,
} from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { Alert } from '../../design-system/components/Alert';
import { Badge } from '../../design-system/components/Badge';
import { Panel } from '../../design-system/components/Panel';
import { Modal } from '../../design-system/components/Modal';
import { Toast, ToastMessage } from '../../design-system/components/Toast';
import { useAuthSession } from '../../app/AuthSessionContext';

export const SessionActiveView: React.FC = () => {
  const navigate = useNavigate();
  const { sesion, cerrarSesion } = useAuthSession();
  const [modalConfirmarSalida, setModalConfirmarSalida] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  if (!sesion) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <Panel variant="white" padding="lg" style={{ maxWidth: '480px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', color: 'var(--color-strong)', marginBottom: '8px' }}>
            No hay sesión activa
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
            Debe iniciar sesión en el portal de demostración para acceder a este entorno.
          </p>
          <Button variant="primary" onClick={() => navigate('/acceso')}>
            Ir al inicio de sesión
          </Button>
        </Panel>
      </div>
    );
  }

  const handleCerrarSesion = async () => {
    setCerrando(true);
    try {
      await cerrarSesion();
      setToast({
        id: `logout-${Date.now()}`,
        type: 'info',
        message: 'Sesión de demostración finalizada correctamente.',
      });
      setModalConfirmarSalida(false);
      navigate('/acceso');
    } finally {
      setCerrando(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background-alt)', padding: '32px 16px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Banner de estado de sesión activa */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Badge variant="success" withDot>
                SESIÓN ACTIVA
              </Badge>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Autenticado desde: {new Date(sesion.fechaInicio).toLocaleTimeString('es-GT')}
              </span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-strong)' }}>
              Bienvenido, {sesion.nombre}
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)' }}>
              {sesion.rolEtiqueta} {sesion.colegiado && `(Colegiado: ${sesion.colegiado})`}
            </p>
          </div>

          <Button
            variant="secondary"
            onClick={() => setModalConfirmarSalida(true)}
            leftIcon={<LogOut size={16} />}
          >
            Cerrar sesión demo
          </Button>
        </div>

        {/* Panel de Institución Fija y Enrutamiento de Motor */}
        <Alert variant="info" title="Aislamiento Institucional Estricto" icon={<Building2 size={20} />}>
          La sesión está atada exclusivamente a <strong>{sesion.institucionNombre}</strong>.
          En el backend, todas las operaciones de esta identidad se enrutan de forma determinista hacia el motor{' '}
          <strong>{sesion.motorObjetivo}</strong>. Para acceder a otra institución o rol, debe cerrar esta sesión.
        </Alert>

        {/* Resumen de Datos de la Sesión */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          
          <Panel variant="white" title="Institución y Motor" padding="md">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>Institución:</span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-strong)' }}>{sesion.institucionNombre}</span>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>Motor asignado en backend:</span>
                <div style={{ marginTop: '4px' }}>
                  <Badge variant="primary">
                    <Database size={13} style={{ marginRight: '4px' }} />
                    {sesion.motorObjetivo}
                  </Badge>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>Correo institucional:</span>
                <span style={{ fontSize: '14px', color: 'var(--color-text)' }}>{sesion.email}</span>
              </div>
            </div>
          </Panel>

          <Panel variant="white" title="Credenciales y Seguridad" padding="md">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>Identificador de cuenta:</span>
                <code style={{ fontSize: '13px', backgroundColor: 'var(--color-control)', padding: '2px 6px', borderRadius: '4px' }}>
                  {sesion.cuentaId}
                </code>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>Token sintético de sesión:</span>
                <code style={{ fontSize: '12px', backgroundColor: 'var(--color-control)', padding: '2px 6px', borderRadius: '4px', wordBreak: 'break-all' }}>
                  {sesion.tokenSintetico}
                </code>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>Modo de trabajo:</span>
                <Badge variant="neutral">Simulación desacoplada (U01)</Badge>
              </div>
            </div>
          </Panel>
        </div>

        {/* Permisos Efectivos Concedidos */}
        <Panel
          variant="white"
          title={`Permisos clínicos y administrativos activos (${sesion.permisos.length})`}
          subtitle="Lista de capacidades autorizadas para este usuario según la matriz de mínimo privilegio"
          padding="md"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px', marginTop: '8px' }}>
            {sesion.permisos.map((permiso) => (
              <div
                key={permiso}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-background-alt)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--color-strong)',
                }}
              >
                <CheckCircle2 size={16} color="var(--color-primary)" />
                <code>{permiso}</code>
              </div>
            ))}
          </div>
        </Panel>

        {/* Mensaje de transición a U02 y U03 */}
        <Panel variant="subtle" padding="md">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Info size={22} color="var(--color-primary)" />
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-strong)' }}>
                Progreso del Roadmap Frontend
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Esta vista valida la persistencia y aislamiento de la sesión en <strong>U01</strong>. En la siguiente unidad (<strong>U02</strong>) se construirá el Shell completo (Sidebar + Header) y los estados transversales (V02/V19), dando paso al Dashboard interactivo por institución (<strong>U03 / V03</strong>).
              </p>
            </div>
          </div>
        </Panel>
      </div>

      {/* Modal de Confirmación de Cierre de Sesión */}
      <Modal
        isOpen={modalConfirmarSalida}
        onClose={() => setModalConfirmarSalida(false)}
        title="¿Cerrar sesión de demostración?"
        description="Al salir, se limpiará el estado local de sesión y podrá seleccionar otra institución o rol."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalConfirmarSalida(false)} disabled={cerrando}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleCerrarSesion} loading={cerrando}>
              Confirmar y salir
            </Button>
          </>
        }
      >
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          Esta acción finalizará la sesión actual de <strong>{sesion.nombre}</strong> vinculada a <strong>{sesion.institucionNombre}</strong>.
        </p>
      </Modal>

      {/* Notificación Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};
