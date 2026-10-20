import React from 'react';

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  borderRadius,
  className = '',
  style,
}) => {
  const getDefaultStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'circular':
        return {
          width: width || '40px',
          height: height || '40px',
          borderRadius: '50%',
        };
      case 'rectangular':
        return {
          width: width || '100%',
          height: height || '80px',
          borderRadius: borderRadius || 'var(--radius-input)',
        };
      case 'card':
        return {
          width: width || '100%',
          height: height || '160px',
          borderRadius: borderRadius || 'var(--radius-panel)',
        };
      case 'text':
      default:
        return {
          width: width || '100%',
          height: height || '16px',
          borderRadius: borderRadius || '6px',
        };
    }
  };

  return (
    <div
      aria-hidden="true"
      className={`skeleton-loader ${className}`}
      style={{
        backgroundColor: 'var(--color-skeleton)', // #E7EFEC
        backgroundImage: 'linear-gradient(90deg, var(--color-skeleton) 0%, var(--color-skeleton-soft) 50%, var(--color-skeleton) 100%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
        display: 'inline-block',
        verticalAlign: 'middle',
        ...getDefaultStyles(),
        ...style,
      }}
    >
      <style>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .skeleton-loader {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};
