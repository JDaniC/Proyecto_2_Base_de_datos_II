import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '../design-system/components/Sidebar';
import { Header } from '../design-system/components/Header';
import { Modal } from '../design-system/components/Modal';
import { Button } from '../design-system/components/Button';
import { Toast, ToastMessage } from '../design-system/components/Toast';
import { useAuthSession } from '../app/AuthSessionContext';

export const AuthenticatedLayout: React.FC = () => {
  const navigate = useNavigate();
  const { sesion, cerrarSesion } = useAuthSession();
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [modalLogoutAbierto, setModalLogoutAbierto] = useState<boolean>(false);
  const [cerrando, setCerrando] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  if (!sesion) {
    return null;
  }

  const handleCerrarSesion = async () => {
    setCerrando(true);
    try {
      await cerrarSesion();
      setModalLogoutAbierto(false);
      navigate('/acceso');
    } finally {
      setCerrando(false);
    }
  };

  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-background-alt)' }}>
      {/* Barra lateral de navegación adaptada a la institución */}
      <Sidebar
        sesion={sesion}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onNavigate={() => setMobileNavOpen(false)}
        className={mobileNavOpen ? 'mobile-open' : ''}
      />
      {mobileNavOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Cerrar navegación"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Contenedor principal con Header y contenido de vista */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header
          sesion={sesion}
          onLogoutClick={() => setModalLogoutAbierto(true)}
          onToggleSidebar={() => {
            if (window.matchMedia('(max-width: 1023px)').matches) {
              setMobileNavOpen((open) => !open);
              return;
            }
            setSidebarCollapsed((collapsed) => !collapsed);
          }}
        />

        <main className="app-main" style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>

      {/* Diálogo modal de confirmación de salida */}
      <Modal
        isOpen={modalLogoutAbierto}
        onClose={() => setModalLogoutAbierto(false)}
        title="¿Desea cerrar su sesión de trabajo?"
        description="Asegúrese de haber completado las acciones clínicas pendientes antes de desconectarse."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalLogoutAbierto(false)} disabled={cerrando}>
              Continuar en el sistema
            </Button>
            <Button variant="danger" onClick={handleCerrarSesion} loading={cerrando}>
              Cerrar sesión
            </Button>
          </>
        }
      >
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          Se finalizará el acceso de <strong>{sesion.nombre}</strong> en <strong>{sesion.institucionNombre}</strong>.
        </p>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};
