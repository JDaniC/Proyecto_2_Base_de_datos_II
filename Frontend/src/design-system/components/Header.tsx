import React from 'react';
import { Menu, LogOut, Building2 } from 'lucide-react';
import { SesionUsuario } from '../../services/types';
import { Button } from './Button';

export interface HeaderProps {
  sesion: SesionUsuario;
  onLogoutClick: () => void;
  onToggleSidebar?: () => void;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  sesion,
  onLogoutClick,
  onToggleSidebar,
  className = '',
}) => {
  // Iniciales del profesional
  const iniciales = sesion.nombre
    .replace(/^(Dr\.|Dra\.|Lic\.|Licda\.|MSc\.|Ing\.)\s+/i, '')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <header
      className={`header-container ${className}`}
      style={{
        height: 'var(--height-header)', // 64px exacto
        backgroundColor: 'var(--color-background)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Lado izquierdo: Botón de alternancia y Sede institucional */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Alternar navegación"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Menu size={20} />
          </button>
        )}

        <div className="header-institution" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={18} color="var(--color-primary)" />
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-strong)' }}>
            {sesion.institucionNombre}
          </span>
        </div>
      </div>

      {/* Lado derecho: Notificaciones y Perfil de usuario */}
      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>

        {/* Perfil del profesional */}
        <div className="header-profile" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-selection)',
              color: 'var(--color-primary)',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {iniciales}
          </div>

          <div className="header-user-info" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-strong)', lineHeight: 1.2 }}>
              {sesion.nombre}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {sesion.rolEtiqueta}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogoutClick}
            aria-label="Cerrar sesión"
            leftIcon={<LogOut size={16} />}
            style={{ padding: '0 8px', color: 'var(--color-text-secondary)' }}
          >
            Salir
          </Button>
        </div>
      </div>
    </header>
  );
};
