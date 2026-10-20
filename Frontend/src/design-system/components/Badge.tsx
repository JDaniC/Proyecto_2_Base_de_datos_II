import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'primary';
  withDot?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  withDot = false,
  className = '',
  style,
}) => {
  const variantStyles = {
    info: {
      bg: 'var(--color-info-bg)',
      color: 'var(--color-info-text)',
      dot: 'var(--color-info-text)',
      border: 'var(--color-info-border)',
    },
    success: {
      bg: 'var(--color-success-bg)',
      color: 'var(--color-success-text)',
      dot: 'var(--color-success-text)',
      border: 'var(--color-success-border)',
    },
    warning: {
      bg: 'var(--color-warning-bg)',
      color: 'var(--color-warning-text)',
      dot: 'var(--color-warning-text)',
      border: 'var(--color-warning-border)',
    },
    danger: {
      bg: 'var(--color-danger-bg)',
      color: 'var(--color-danger-text)',
      dot: 'var(--color-danger-text)',
      border: 'var(--color-danger-border)',
    },
    neutral: {
      bg: 'var(--color-neutral-bg)',
      color: 'var(--color-neutral-text)',
      dot: 'var(--color-neutral-text)',
      border: 'var(--color-neutral-border)',
    },
    primary: {
      bg: 'var(--color-selection)',
      color: 'var(--color-primary)',
      dot: 'var(--color-primary)',
      border: 'var(--color-primary)',
    },
  }[variant];

  return (
    <span
      className={`badge badge-${variant} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: 'var(--radius-pill)', // Píldora
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: variantStyles.bg,
        color: variantStyles.color,
        border: `1px solid ${variantStyles.border}`,
        lineHeight: 1.25,
        ...style,
      }}
    >
      {withDot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: variantStyles.dot,
            display: 'inline-block',
          }}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};
