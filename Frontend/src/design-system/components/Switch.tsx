import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  id,
  className = '',
}) => {
  const switchId = id || (label ? `switch-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const labelId = label ? `${switchId}-label` : undefined;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        userSelect: 'none',
      }}
      className={`switch-wrapper ${className}`}
      onClick={() => !disabled && onChange(!checked)}
    >
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onChange(!checked);
        }}
        style={{
          width: '50px',
          height: '29px',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: checked ? 'var(--color-primary)' : '#D5E2DE',
          position: 'relative',
          border: 'none',
          padding: '2px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'backgroundColor var(--transition-fast)',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: 'block',
            width: '23px',
            height: '23px',
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
            transform: checked ? 'translateX(21px)' : 'translateX(2px)',
            transition: 'transform var(--transition-fast)',
          }}
          aria-hidden="true"
        />
      </button>
      {label && (
        <span id={labelId} style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
          {label}
        </span>
      )}
    </div>
  );
};
