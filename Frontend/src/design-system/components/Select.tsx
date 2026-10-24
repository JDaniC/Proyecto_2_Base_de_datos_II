import React, { useId } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  helperText?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, helperText, error, id: customId, disabled, className = '', style, ...rest }, ref) => {
    const generatedId = useId();
    const selectId = customId || generatedId;
    const helperId = helperText ? `${selectId}-helper` : undefined;
    const errorId = error ? `${selectId}-error` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        {label && (
          <label
            htmlFor={selectId}
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-strong)',
            }}
          >
            {label}
          </label>
        )}

        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--color-control)',
            border: `1px solid ${error ? 'var(--color-danger-text)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-input)',
            height: 'var(--height-input)',
            padding: '0 14px',
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <select
            {...rest}
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            style={{
              width: '100%',
              minWidth: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--color-text)',
              fontSize: '15px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              appearance: 'none',
              paddingRight: '24px',
              ...style,
            }}
            className={className}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          {/* Caret icon */}
          <span
            style={{
              position: 'absolute',
              right: '14px',
              pointerEvents: 'none',
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '6px solid var(--color-text-secondary)',
            }}
            aria-hidden="true"
          />
        </div>

        {error ? (
          <span id={errorId} role="alert" style={{ fontSize: '13px', color: 'var(--color-danger-text)', fontWeight: 500 }}>
            {error}
          </span>
        ) : helperText ? (
          <span id={helperId} style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
