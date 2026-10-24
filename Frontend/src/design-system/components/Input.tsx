import React, { useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      id: customId,
      className = '',
      style,
      disabled,
      ...rest
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = customId || generatedId;
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {label}
            {rest.required && <span style={{ color: 'var(--color-danger-text)' }}>*</span>}
          </label>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--color-control)',
            border: `1px solid ${error ? 'var(--color-danger-text)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-input)', // 12px exacto
            height: 'var(--height-input)', // 48px exacto
            padding: '0 14px',
            gap: '10px',
            transition: 'border-color var(--transition-fast), background-color var(--transition-fast)',
            opacity: disabled ? 0.6 : 1,
          }}
        >
          {leftIcon && <span style={{ color: 'var(--color-text-secondary)', display: 'inline-flex' }}>{leftIcon}</span>}
          <input
            {...rest}
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--color-text)',
              fontSize: '15px',
              width: '100%',
              ...style,
            }}
            className={className}
          />
          {rightIcon && <span style={{ color: 'var(--color-text-secondary)', display: 'inline-flex' }}>{rightIcon}</span>}
        </div>

        {error ? (
          <span
            id={errorId}
            role="alert"
            style={{
              fontSize: '13px',
              color: 'var(--color-danger-text)',
              fontWeight: 500,
            }}
          >
            {error}
          </span>
        ) : helperText ? (
          <span
            id={helperId}
            style={{
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
            }}
          >
            {helperText}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
