import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Panel } from '../../design-system/components/Panel';
import { useAuthSession } from '../../app/AuthSessionContext';

export const DashboardPage: React.FC = () => {
  const { sesion } = useAuthSession();
  if (!sesion) return null;
  const links = [
    { path: '/pacientes', title: 'Buscar paciente', description: 'Abrir un historial existente y consultar sus registros.' },
    ...(sesion.permisos.includes('pacientes.administrar') ? [{ path: '/pacientes/nuevo', title: 'Registrar paciente', description: 'Crear un paciente y su historial.' }] : []),
    ...(sesion.institucionId !== 'LABORATORIO_CLINICO' ? [{ path: '/agenda', title: 'Agenda de citas', description: 'Consultar y gestionar las citas de atención.' }] : []),
    ...(sesion.institucionId === 'LABORATORIO_CLINICO' ? [{ path: '/laboratorio/bandeja', title: 'Órdenes de laboratorio', description: 'Consultar órdenes, muestras, resultados e informes.' }] : []),
    ...(sesion.institucionId === 'HOSPITAL_GENERAL' ? [{ path: '/hospital/hospitalizaciones', title: 'Hospitalizaciones', description: 'Consultar ingresos, asignaciones de cama y egresos por paciente.' }] : [])
  ];
  return <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
    <div><h1>Inicio</h1><p style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>{sesion.institucionNombre}</p></div>
    <Panel title="Atención de pacientes" padding="none">
      <div style={{ padding: '0 20px' }}>
        {links.map((link, index) => <Link key={link.path} to={link.path} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 0', textDecoration: 'none', color: 'var(--color-strong)', borderBottom: index < links.length - 1 ? '1px solid var(--color-divider)' : undefined }}>
          <span style={{ flex: 1, minWidth: 0 }}><strong>{link.title}</strong><span style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 6 }}>{link.description}</span></span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>)}
      </div>
    </Panel>
  </div>;
};
