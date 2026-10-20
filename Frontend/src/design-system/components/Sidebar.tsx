import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  BedDouble,
  DoorClosed,
  FileText,
  FlaskConical,
  TestTube2,
  Activity,
  Package,
  CreditCard,
  Baby,
  Syringe,
  Settings,
  ShieldCheck,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SesionUsuario } from '../../services/types';

export interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: React.ReactNode;
}

export interface SidebarProps {
  sesion: SesionUsuario;
  collapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sesion,
  collapsed,
  onToggleCollapse,
  className = '',
}) => {
  const getNavItems = (): NavItem[] => {
    const items: NavItem[] = [
      {
        id: 'panel',
        path: '/panel',
        label: 'Panel inicial',
        icon: <LayoutDashboard size={20} />,
      },
      {
        id: 'pacientes',
        path: '/pacientes',
        label: sesion.institucionId === 'CENTRO_PEDIATRICO' ? 'Pacientes pediátricos' : 'Pacientes',
        icon: sesion.institucionId === 'CENTRO_PEDIATRICO' ? <Baby size={20} /> : <Users size={20} />,
      },
      {
        id: 'agenda',
        path: '/agenda',
        label: 'Agenda de citas',
        icon: <Calendar size={20} />,
      },
    ];

    // Módulos institucionales específicos
    if (sesion.institucionId === 'HOSPITAL_GENERAL') {
      items.push(
        {
          id: 'hospitalizaciones',
          path: '/hospital/hospitalizaciones',
          label: 'Hospitalizaciones',
          icon: <BedDouble size={20} />,
        },
        {
          id: 'camas',
          path: '/hospital/camas',
          label: 'Habitaciones y camas',
          icon: <DoorClosed size={20} />,
        },
        {
          id: 'examenes',
          path: '/hospital/examenes',
          label: 'Órdenes de examen',
          icon: <FileText size={20} />,
        }
      );
    } else if (sesion.institucionId === 'CLINICA_ODONTOLOGICA') {
      items.push({
        id: 'catalogos-odon',
        path: '/administracion/catalogos',
        label: 'Catálogos odontológicos',
        icon: <BookOpen size={20} />,
      });
    } else if (sesion.institucionId === 'LABORATORIO_CLINICO') {
      items.push(
        {
          id: 'bandeja-lab',
          path: '/laboratorio/bandeja',
          label: 'Bandeja de trabajo',
          icon: <FlaskConical size={20} />,
        },
        {
          id: 'muestras-lab',
          path: '/laboratorio/muestras',
          label: 'Muestras y tomas',
          icon: <TestTube2 size={20} />,
        },
        {
          id: 'calidad-lab',
          path: '/laboratorio/calidad',
          label: 'Control de calidad',
          icon: <Activity size={20} />,
        },
        {
          id: 'inventario-lab',
          path: '/laboratorio/inventario',
          label: 'Reactivos e insumos',
          icon: <Package size={20} />,
        },
        {
          id: 'cobros-lab',
          path: '/laboratorio/cobros',
          label: 'Cobros y órdenes',
          icon: <CreditCard size={20} />,
        }
      );
    } else if (sesion.institucionId === 'CENTRO_PEDIATRICO') {
      items.push({
        id: 'vacunas-ped',
        path: '/pediatria/vacunas',
        label: 'Control de vacunas',
        icon: <Syringe size={20} />,
      });
    }

    // Módulos administrativos según permisos
    if (sesion.permisos.includes('usuarios.administrar')) {
      items.push({
        id: 'admin-usuarios',
        path: '/administracion/usuarios',
        label: 'Gestión de usuarios',
        icon: <Settings size={20} />,
      });
    }

    if (sesion.permisos.includes('auditoria.leer')) {
      items.push({
        id: 'auditoria',
        path: '/administracion/auditoria',
        label: 'Auditoría del sistema',
        icon: <ShieldCheck size={20} />,
      });
    }

    return items;
  };

  const navItems = getNavItems();

  return (
    <aside
      aria-label="Navegación principal"
      className={`sidebar-container ${className}`}
      style={{
        width: collapsed ? 'var(--width-sidebar-compact)' : 'var(--width-sidebar-expanded)', // 72px vs 240px
        backgroundColor: 'var(--color-background)',
        borderRight: '1px solid var(--color-border)',
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width var(--transition-normal)',
        flexShrink: 0,
        zIndex: 50,
      }}
    >
      {/* Encabezado del Sidebar */}
      <div
        style={{
          height: 'var(--height-header)',
          display: 'flex',
          alignItems: 'center',
          padding: collapsed ? '0 16px' : '0 20px',
          borderBottom: '1px solid var(--color-divider)',
          gap: '12px',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
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
            flexShrink: 0,
          }}
        >
          <Activity size={22} />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-strong)', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              Portal Clínico
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {sesion.institucionNombre}
            </span>
          </div>
        )}
      </div>

      {/* Lista de navegación */}
      <nav
        style={{
          flex: 1,
          padding: '16px 10px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            title={collapsed ? item.label : undefined}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: collapsed ? '10px 14px' : '10px 14px',
              borderRadius: 'var(--radius-input)',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: isActive ? 600 : 500,
              backgroundColor: isActive ? 'var(--color-selection)' : 'transparent',
              color: isActive ? 'var(--color-strong)' : 'var(--color-text-secondary)',
              borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
              transition: 'all var(--transition-fast)',
              justifyContent: collapsed ? 'center' : 'flex-start',
            })}
          >
            <span style={{ display: 'inline-flex', flexShrink: 0 }}>{item.icon}</span>
            {!collapsed && <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Botón inferior de colapso */}
      <div
        style={{
          padding: '12px',
          borderTop: '1px solid var(--color-divider)',
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-end',
        }}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
          }}
        >
          {collapsed ? <ChevronRight size={18} /> : (
            <>
              <span>Colapsar</span>
              <ChevronLeft size={18} />
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
