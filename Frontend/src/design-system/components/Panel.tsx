import React from 'react';

export interface PanelProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  variant?: 'subtle' | 'white';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

export const Panel: React.FC<PanelProps> = ({
  children,
  title,
  subtitle,
  action,
  variant = 'subtle',
  padding = 'md',
  className = '',
  style,
}) => {
  const paddingMap = {
    none: '0',
    sm: '12px',
    md: '20px',
    lg: '28px',
  };

  const hasHeader = Boolean(title || subtitle || action);

  return (
    <div
      className={`panel panel-${variant} ${className}`}
      style={{
        backgroundColor: variant === 'white' ? 'var(--color-background)' : 'var(--color-panel)',
        border: '1px solid var(--color-border-panel)',
        borderRadius: 'var(--radius-panel)', // 16px exacto
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
    >
      {hasHeader && (
        <div
          style={{
            padding: `${paddingMap[padding]} ${paddingMap[padding]} 12px`,
            borderBottom: '1px solid var(--color-divider)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            {title && (
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-strong)' }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={{ padding: paddingMap[padding] }}>{children}</div>
    </div>
  );
};
