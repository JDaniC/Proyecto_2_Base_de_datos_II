import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthSession } from './AuthSessionContext';
import { isRouteInInstitution } from './productScope';
import { PermisoId } from '../services/types';
import { AccessRestrictedPage } from '../features/auth/AccessRestrictedPage';
import { SkeletonLoader } from '../design-system/components/SkeletonLoader';

export interface AuthGuardProps {
  children: React.ReactNode;
  requierePermiso?: PermisoId | PermisoId[];
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requierePermiso }) => {
  const { sesion, cargando } = useAuthSession();
  const { pathname } = useLocation();

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

  if (!isRouteInInstitution(pathname, sesion.institucionId)) return <AccessRestrictedPage />;

  if (requierePermiso) {
    const permitidos = Array.isArray(requierePermiso) ? requierePermiso : [requierePermiso];
    const tienePermiso = permitidos.some((p) => sesion.permisos.includes(p));
    if (!tienePermiso) {
      return (
        <AccessRestrictedPage
          codigo="403 SIN_PERMISO"
          motivo={`La función que intenta acceder requiere al menos uno de los permisos clínicos: ${permitidos.join(', ')}.`}
          permisoRequerido={permitidos[0]}
        />
      );
    }
  }

  return <React.Fragment key={`${sesion.cuentaId}:${sesion.institucionId}:${sesion.fechaInicio}`}>{children}</React.Fragment>;
};
