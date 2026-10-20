import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Users,
  Clock,
  ShieldAlert,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Panel } from '../../design-system/components/Panel';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { EmptyState } from '../../design-system/components/EmptyState';
import { SkeletonLoader } from '../../design-system/components/SkeletonLoader';
import { useAuthSession } from '../../app/AuthSessionContext';

export const DashboardPlaceholder: React.FC = () => {
  const navigate = useNavigate();
  const { sesion } = useAuthSession();
  const [simularCarga, setSimularCarga] = useState<boolean>(false);

  if (!sesion) return null;

  // Fecha actual formateada en zona horaria America/Guatemala
  const fechaHoy = new Intl.DateTimeFormat('es-GT', {
    dateStyle: 'full',
    timeZone: 'America/Guatemala',
  }).format(new Date());

  const handleProbarCarga = () => {
    setSimularCarga(true);
    setTimeout(() => setSimularCarga(false), 1200);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Encabezado del Panel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
              {fechaHoy}
            </span>
            <span>•</span>
            <Badge variant="primary">{sesion.institucionNombre}</Badge>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-strong)' }}>
            Bienvenido, {sesion.nombre}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            {sesion.rolEtiqueta} · Espacio operativo institucional
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleProbarCarga}
            leftIcon={<RefreshCw size={15} />}
          >
            Probar Skeleton (V19)
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate('/acceso-restringido', {
                state: {
                  codigo: '403 SIN_PERMISO',
                  motivo: 'Demostración de estado de acceso restringido para funciones no asignadas al rol.',
                  permisoRequerido: 'auditoria.leer',
                },
              })
            }
            leftIcon={<ShieldAlert size={15} />}
          >
            Ver pantalla V02
          </Button>
        </div>
      </div>

      {/* Grid de Métricas y Resumen Operativo */}
      {simularCarga ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <SkeletonLoader variant="card" height="120px" />
          <SkeletonLoader variant="card" height="120px" />
          <SkeletonLoader variant="card" height="120px" />
        </div>
      ) : (
        <Panel variant="white" padding="md">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-selection)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Calendar size={22} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>Citas para hoy</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-strong)' }}>6 programadas</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-info-bg)',
                  color: 'var(--color-info-text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={22} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>Pacientes asignados</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-strong)' }}>14 en seguimiento</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-success-bg)',
                  color: 'var(--color-success-text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock size={22} />
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>Turno clínico</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-strong)' }}>Matutino (Activo)</span>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* Demostración de componentes EmptyState (V19) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '20px', alignItems: 'start' }}>
        
        <Panel
          variant="white"
          title="Atenciones del turno actual"
          subtitle="Listado cronológico de pacientes citados"
          padding="md"
        >
          <EmptyState
            title="Sin atenciones en espera"
            description="No hay pacientes en cola de espera en este momento. Los nuevos ingresos se reflejarán automáticamente."
            actionText="Consultar agenda completa"
            onAction={() => navigate('/agenda')}
          />
        </Panel>

        <Panel
          variant="subtle"
          title="Navegación e Infraestructura (U02)"
          subtitle="Progreso del sistema de interfaz"
          padding="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'var(--color-text)', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="var(--color-primary)" />
              <strong>Shell completado:</strong>
            </div>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              - <strong>Sidebar</strong> dinámico con navegación adaptada a <em>{sesion.institucionNombre}</em>.
              <br />
              - <strong>Header</strong> con perfil, institución y cierre seguro de sesión.
              <br />
              - <strong>Componentes V19:</strong> <code>SkeletonLoader</code>, <code>EmptyState</code> y <code>ErrorState</code> listos para uso transversal.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
};
