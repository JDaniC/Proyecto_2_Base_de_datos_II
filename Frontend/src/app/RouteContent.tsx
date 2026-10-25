import React, { Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { ErrorState } from '../design-system/components/ErrorState';

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
  return (
    <PageErrorBoundary key={location.key}>
      <Suspense fallback={<p role="status" aria-live="polite">Cargando pantalla…</p>}>
        {children}
      </Suspense>
    </PageErrorBoundary>
  );
};
