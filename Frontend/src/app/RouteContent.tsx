import React, { Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { ErrorState } from '../design-system/components/ErrorState';
import { useServices } from './ServiceContext';
import { useAuthSession } from './AuthSessionContext';
import { isRouteDeliveredInApi } from './productScope';

type Props = { children: React.ReactNode };

class PageErrorBoundary extends React.Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <ErrorState
          title="No se pudo abrir esta pantalla"
          message="Compruebe su conexión y vuelva a cargar la página. Si estaba completando un formulario, los cambios sin guardar podrían perderse."
          retryText="Volver a cargar"
          onRetry={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}

export const RouteContent: React.FC<Props> = ({ children }) => {
  const location = useLocation();
  const { mode } = useServices();
  const { sesion } = useAuthSession();
  if (mode === 'api' && sesion && !isRouteDeliveredInApi(location.pathname, sesion.institucionId)) {
    return <ErrorState title="Función fuera de esta entrega" message="Esta pantalla no forma parte del circuito técnico disponible en modo API." />;
  }
  return (
    <PageErrorBoundary key={location.key}>
      <Suspense fallback={<p role="status" aria-live="polite">Cargando pantalla…</p>}>
        {children}
      </Suspense>
    </PageErrorBoundary>
  );
};
