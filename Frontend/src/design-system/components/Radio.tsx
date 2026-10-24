import React from 'react';

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ label, description, id, checked, disabled, className = '', style, ...rest }, ref) => {
    const radioId = id || (typeof label === 'string' ? `radio-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <label
        htmlFor={radioId}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: '8px 12px',
          borderRadius: 'var(--radius-input)',
          backgroundColor: checked ? 'var(--color-selection)' : 'transparent',
          border: `1px solid ${checked ? 'var(--color-primary)' : 'var(--color-divider)'}`,
          transition: 'all var(--transition-fast)',
          opacity: disabled ? 0.6 : 1,
          minHeight: '44px',
          ...style,
        }}
        className={`radio-label ${className}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', height: '24px', flexShrink: 0 }}>
          <input
            {...rest}
            ref={ref}
            type="radio"
            id={radioId}
            checked={checked}
            disabled={disabled}
            style={{
              width: '20px',
              height: '20px',
              accentColor: 'var(--color-primary)',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          {label && (
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-strong)' }}>
              {label}
            </div>
          )}
          {description && (
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              {description}
            </div>
          )}
        </div>
      </label>
    );
  }
);

Radio.displayName = 'Radio';
