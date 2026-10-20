import React from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  correlacion?: string;
  onRetry?: () => void;
  onBack?: () => void;
  retryText?: string;
  backText?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'No fue posible completar la operación',
  message,
  correlacion,
  onRetry,
  onBack,
  retryText = 'Reintentar operación',
  backText = 'Volver al inicio',
  className = '',
  style,
}) => {
  return (
    <div
      role="alert"
      className={`error-state-container ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 24px',
        backgroundColor: 'var(--color-danger-bg)', // #FFF0EE
        border: '1px solid var(--color-danger-border)',
        borderRadius: 'var(--radius-panel)',
        minHeight: '280px',
        ...style,
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          backgroundColor: '#FFFFFF',
          color: 'var(--color-danger-text)',
          border: '1px solid var(--color-danger-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <AlertCircle size={30} aria-hidden="true" />
      </div>

      <h3
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--color-danger-text)',
          marginBottom: '8px',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: '14px',
          color: 'var(--color-text)',
          maxWidth: '460px',
          lineHeight: 1.5,
          marginBottom: '12px',
        }}
      >
        {message}
      </p>

      {correlacion && (
        <div
          style={{
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            marginBottom: '20px',
            fontFamily: 'monospace',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1px solid var(--color-danger-border)',
          }}
        >
          Código de referencia para soporte: <strong>{correlacion}</strong>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {onRetry && (
          <Button variant="primary" size="md" onClick={onRetry} leftIcon={<RefreshCw size={16} />}>
            {retryText}
          </Button>
        )}
        {onBack && (
          <Button variant="secondary" size="md" onClick={onBack} leftIcon={<ArrowLeft size={16} />}>
            {backText}
          </Button>
        )}
      </div>
    </div>
  );
};
