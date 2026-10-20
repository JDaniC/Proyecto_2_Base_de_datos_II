import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type?: 'success' | 'warning' | 'danger' | 'info';
  message: string;
  duration?: number;
}

export interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const iconMap = {
    success: <CheckCircle2 size={18} color="var(--color-success-text)" aria-hidden="true" />,
    warning: <AlertTriangle size={18} color="var(--color-warning-text)" aria-hidden="true" />,
    danger: <AlertOctagon size={18} color="var(--color-danger-text)" aria-hidden="true" />,
    info: <Info size={18} color="var(--color-info-text)" aria-hidden="true" />,
  };

  const type = toast.type || 'info';

  return (
    <div
      aria-live="polite"
      role="status"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2000,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'var(--color-background)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-toast)', // 14px exacto
          padding: '12px 20px',
          boxShadow: 'var(--shadow-lg)',
          fontSize: '14px',
          fontWeight: 500,
          animation: 'toast-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <span style={{ display: 'inline-flex', flexShrink: 0 }}>{iconMap[type]}</span>
        <span>{toast.message}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar notificación"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            padding: '2px',
            marginLeft: '8px',
            borderRadius: '4px',
            display: 'inline-flex',
          }}
        >
          <X size={16} />
        </button>
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
