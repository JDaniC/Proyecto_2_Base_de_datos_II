import React from 'react';
import { Info, CheckCircle2, AlertTriangle, AlertOctagon, X } from 'lucide-react';

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  icon,
  onClose,
  className = '',
  style,
}) => {
  const variantStyles = {
    info: {
      bg: 'var(--color-info-bg)',
      color: 'var(--color-info-text)',
      border: '1px solid var(--color-info-border)',
      defaultIcon: <Info size={20} aria-hidden="true" />,
    },
    success: {
      bg: 'var(--color-success-bg)',
      color: 'var(--color-success-text)',
      border: '1px solid var(--color-success-border)',
      defaultIcon: <CheckCircle2 size={20} aria-hidden="true" />,
    },
    warning: {
      bg: 'var(--color-warning-bg)',
      color: 'var(--color-warning-text)',
      border: '1px solid var(--color-warning-border)',
      defaultIcon: <AlertTriangle size={20} aria-hidden="true" />,
    },
    danger: {
      bg: 'var(--color-danger-bg)',
      color: 'var(--color-danger-text)',
      border: '1px solid var(--color-danger-border)',
      defaultIcon: <AlertOctagon size={20} aria-hidden="true" />,
    },
    neutral: {
      bg: 'var(--color-neutral-bg)',
      color: 'var(--color-neutral-text)',
      border: '1px solid var(--color-neutral-border)',
      defaultIcon: <Info size={20} aria-hidden="true" />,
    },
  }[variant];

  const role = variant === 'danger' || variant === 'warning' ? 'alert' : 'status';

  return (
    <div
      role={role}
      aria-atomic="true"
      className={`alert alert-${variant} ${className}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: variantStyles.bg,
        color: variantStyles.color,
        border: variantStyles.border,
        borderRadius: 'var(--radius-panel)',
        fontSize: '14px',
        lineHeight: 1.45,
        minWidth: 0,
        ...style,
      }}
    >
      <div style={{ flexShrink: 0, marginTop: '2px' }}>
        {icon ?? variantStyles.defaultIcon}
      </div>
      <div style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
        {title && (
          <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '15px' }}>
            {title}
          </div>
        )}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar notificación"
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'inline-flex',
            flexShrink: 0,
            opacity: 0.8,
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
