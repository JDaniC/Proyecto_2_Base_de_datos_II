import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  Building2,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../../design-system/components/Button';
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
        <Panel variant="white" padding="lg" style={{ maxWidth: '440px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', color: 'var(--color-strong)', marginBottom: '8px' }}>
            Sesión no iniciada
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
            Ingrese con sus credenciales institucionales para acceder a su portal clínico.
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
        message: 'Sesión finalizada correctamente.',
      });
      setModalConfirmarSalida(false);
      navigate('/acceso');
    } finally {
      setCerrando(false);
    }
  };

  // Nombres legibles para el usuario clínico sin jerga de bases de datos
  const formatearPermisoLegible = (permiso: string): string => {
    const mapa: Record<string, string> = {
      'pacientes.administrar': 'Expedientes y registro de pacientes',
      'historial.leer': 'Consulta de historial clínico integral',
      'historial.archivar': 'Archivo administrativo de expedientes',
      'citas.administrar': 'Control y asignación de agenda médica',
      'consultas.registrar': 'Registro de consultas y evolución médica',
      'diagnosticos.registrar': 'Diagnósticos clínicos y codificación',
      'tratamientos.registrar': 'Tratamientos y procedimientos',
      'recetas.emitir': 'Emisión de recetas y prescripción médica',
      'resultados.analizar': 'Captura y análisis de exámenes clínicos',
      'resultados.validar': 'Validación técnica de resultados',
      'informes.emitir': 'Emisión y firma de informes médicos',
      'cobros.administrar': 'Gestión de cobros y facturación institucional',
      'inventario.administrar': 'Control de insumos y reactivos',
      'usuarios.administrar': 'Gestión de usuarios y accesos',
      'auditoria.leer': 'Bitácora y trazabilidad de operaciones',
    };
    return mapa[permiso] || permiso;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background-alt)' }}>
      {/* Barra superior de navegación institucional */}
      <header
        style={{
          height: 'var(--height-header)',
          backgroundColor: 'var(--color-background)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-selection)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Building2 size={20} />
          </div>
          <div>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-strong)', display: 'block', lineHeight: 1.2 }}>
              {sesion.institucionNombre}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Portal Clínico Autorizado
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-strong)' }}>
              {sesion.nombre}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-primary)' }}>
              {sesion.rolEtiqueta}
            </span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setModalConfirmarSalida(true)}
            leftIcon={<LogOut size={15} />}
          >
            Cerrar sesión
          </Button>
        </div>
      </header>

      {/* Contenido principal de la bienvenida */}
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Tarjeta de perfil y bienvenida */}
        <Panel variant="white" padding="lg">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-strong)' }}>
                Bienvenido, {sesion.nombre}
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                {sesion.rolEtiqueta} {sesion.colegiado && `· Colegiado profesional: ${sesion.colegiado}`}
              </p>
            </div>
            <Badge variant="success" withDot>
              Acceso Activo
            </Badge>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid var(--color-divider)',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>Sede institucional:</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-strong)' }}>{sesion.institucionNombre}</span>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>Correo institucional:</span>
              <span style={{ fontSize: '14px', color: 'var(--color-text)' }}>{sesion.email}</span>
            </div>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>Estado de cuenta:</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-success-text)' }}>Habilitado / Activo</span>
            </div>
          </div>
        </Panel>

        {/* Módulos y permisos clínicos autorizados */}
        <Panel
          variant="white"
          title="Módulos y funciones clínicas habilitadas"
          subtitle="Capacidades operativas autorizadas para su perfil profesional en esta sede"
          padding="md"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px', marginTop: '12px' }}>
            {sesion.permisos.map((permiso) => (
              <div
                key={permiso}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  backgroundColor: 'var(--color-background-alt)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-input)',
                  fontSize: '13px',
                  color: 'var(--color-strong)',
                }}
              >
                <CheckCircle2 size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                <span>{formatearPermisoLegible(permiso)}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Tarjeta de transición limpia */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--color-background)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-panel)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <ShieldCheck size={22} color="var(--color-primary)" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
            Sesión clínica autenticada en entorno institucional protegido. Los registros clínicos administrados
            en este módulo están regulados por la normativa de confidencialidad del centro de salud.
          </p>
        </div>
      </main>

      {/* Modal de confirmación para salir */}
      <Modal
        isOpen={modalConfirmarSalida}
        onClose={() => setModalConfirmarSalida(false)}
        title="¿Desea cerrar su sesión clínica?"
        description="Asegúrese de haber guardado cualquier cambio pendiente antes de salir del sistema."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalConfirmarSalida(false)} disabled={cerrando}>
              Continuar en el sistema
            </Button>
            <Button variant="danger" onClick={handleCerrarSesion} loading={cerrando}>
              Cerrar sesión
            </Button>
          </>
        }
      >
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          Al salir se cerrará el acceso de <strong>{sesion.nombre}</strong> en <strong>{sesion.institucionNombre}</strong>.
        </p>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};
