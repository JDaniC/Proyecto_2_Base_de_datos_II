import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthSession } from './AuthSessionContext';
import { PermisoId } from '../services/types';
import { AccessRestrictedPage } from '../features/auth/AccessRestrictedPage';
import { SkeletonLoader } from '../design-system/components/SkeletonLoader';

export interface AuthGuardProps {
  children: React.ReactNode;
  requierePermiso?: PermisoId;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requierePermiso }) => {
  const { sesion, cargando } = useAuthSession();

  if (cargando) {
    return (
      <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px', margin: '0 auto' }}>
        <SkeletonLoader variant="rectangular" height="40px" width="300px" />
        <SkeletonLoader variant="card" height="180px" />
        <SkeletonLoader variant="card" height="180px" />
      </div>
    );
  }

  if (!sesion) {
    return <Navigate to="/acceso" replace />;
  }

  if (requierePermiso && !sesion.permisos.includes(requierePermiso)) {
    return (
      <AccessRestrictedPage
        codigo="403 SIN_PERMISO"
        motivo={`La función que intenta acceder requiere el permiso clínico "${requierePermiso}".`}
        permisoRequerido={requierePermiso}
      />
    );
  }

  return <>{children}</>;
};
