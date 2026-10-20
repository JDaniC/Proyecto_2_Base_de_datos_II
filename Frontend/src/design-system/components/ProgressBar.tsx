import React from 'react';

export interface ProgressBarProps {
  value?: number; // 0 to 100
  indeterminate?: boolean;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value = 0,
  indeterminate = false,
  label,
  className = '',
  style,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-label={label || 'Barra de progreso'}
      aria-valuenow={indeterminate ? undefined : clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`progress-bar-container ${className}`}
      style={{
        width: '100%',
        height: '6px',
        backgroundColor: 'var(--color-progress-track)', // #DCEBE6
        borderRadius: 'var(--radius-pill)',
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      <div
        style={{
          height: '100%',
          backgroundColor: 'var(--color-progress-bar)', // #20666B
          borderRadius: 'var(--radius-pill)',
          width: indeterminate ? '40%' : `${clampedValue}%`,
          transition: indeterminate ? 'none' : 'width 250ms ease-in-out',
          animation: indeterminate ? 'progress-indeterminate 1.4s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite' : 'none',
        }}
      />
      <style>{`
        @keyframes progress-indeterminate {
          0% { left: -40%; width: 40%; }
          50% { left: 40%; width: 50%; }
          100% { left: 100%; width: 40%; }
        }
      `}</style>
    </div>
  );
};
