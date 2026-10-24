import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  className = '',
  style,
  ...rest
}) => {
  const isActionDisabled = disabled || loading;

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { minHeight: '36px', padding: '7px 14px', fontSize: '14px' },
    md: { minHeight: '40px', padding: '8px 18px', fontSize: '15px' },
    lg: { minHeight: '48px', padding: '10px 24px', fontSize: '16px' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--color-primary)',
      color: 'var(--color-text-inverse)',
      border: '1px solid transparent',
    },
    secondary: {
      backgroundColor: 'var(--color-control)',
      color: 'var(--color-text)',
      border: '1px solid var(--color-border)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--color-primary)',
      border: '1px solid transparent',
    },
    danger: {
      backgroundColor: 'var(--color-danger-text)',
      color: 'var(--color-text-inverse)',
      border: '1px solid transparent',
    },
  };

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    borderRadius: 'var(--radius-button)', // 16px exacto
    fontWeight: 600,
    cursor: isActionDisabled ? 'not-allowed' : 'pointer',
    opacity: isActionDisabled ? 0.65 : 1,
    transition: 'all var(--transition-fast)',
    userSelect: 'none',
    textDecoration: 'none',
    lineHeight: 1.35,
    height: 'auto',
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style,
  };

  return (
    <button
      {...rest}
      disabled={isActionDisabled}
      aria-busy={loading}
      style={baseStyle}
      className={`btn btn-${variant} btn-${size} ${className}`}
    >
      {loading && (
        <span
          style={{
            display: 'inline-block',
            width: '16px',
            height: '16px',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            animation: 'btn-spin 0.6s linear infinite',
          }}
          aria-hidden="true"
        />
      )}
      {!loading && leftIcon && <span style={{ display: 'inline-flex', flexShrink: 0 }}>{leftIcon}</span>}
      <span style={{ minWidth: 0 }}>{children}</span>
      {!loading && rightIcon && <span style={{ display: 'inline-flex', flexShrink: 0 }}>{rightIcon}</span>}

    </button>
  );
};
