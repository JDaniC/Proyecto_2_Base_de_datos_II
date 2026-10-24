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
  const headerPadding = padding === 'none' ? paddingMap.md : paddingMap[padding];

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
          className="panel-header"
          style={{
            padding: `${headerPadding} ${headerPadding} 16px`,
            borderBottom: '1px solid var(--color-divider)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            {title && (
              <h3 style={{ margin: 0, fontSize: '18px', lineHeight: 1.35, fontWeight: 700, color: 'var(--color-strong)', overflowWrap: 'anywhere' }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="panel-header-action" style={{ flexShrink: 0 }}>{action}</div>}
        </div>
      )}
      <div className="panel-body" style={{ minWidth: 0, padding: paddingMap[padding] }}>{children}</div>
    </div>
  );
};
