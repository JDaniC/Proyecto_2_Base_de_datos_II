import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ServiceProvider } from './ServiceContext';
import { AuthSessionProvider } from './AuthSessionContext';
import { AuthGuard } from './AuthGuard';
import { AuthenticatedLayout } from '../layouts/AuthenticatedLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { AccessRestrictedPage } from '../features/auth/AccessRestrictedPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { PatientsListPage } from '../features/patients/PatientsListPage';
import { PatientFormPage } from '../features/patients/PatientFormPage';
import { PatientRecordPage } from '../features/patients/PatientRecordPage';
import { AppointmentsCalendarPage } from '../features/appointments/AppointmentsCalendarPage';
import { NewConsultationWizardPage } from '../features/consultations/NewConsultationWizardPage';
import { ConsultationDetailPage } from '../features/consultations/ConsultationDetailPage';
import { UsersManagementPage } from '../features/admin/UsersManagementPage';
import { CatalogosManagementPage } from '../features/admin/CatalogosManagementPage';

export const App: React.FC = () => {
  return (
    <ServiceProvider>
      <AuthSessionProvider>
        <BrowserRouter>
          <Routes>
            {/* Ruta pública de acceso */}
            <Route path="/acceso" element={<LoginPage />} />

            {/* Rutas protegidas bajo el Shell autenticado (U02) */}
            <Route
              element={
                <AuthGuard>
                  <AuthenticatedLayout />
                </AuthGuard>
              }
            >
              <Route path="/panel" element={<DashboardPage />} />
              <Route path="/pacientes" element={<PatientsListPage />} />
              <Route path="/pacientes/nuevo" element={<PatientFormPage />} />
              <Route path="/pacientes/:pacienteId/editar" element={<PatientFormPage />} />
              <Route path="/pacientes/:pacienteId" element={<PatientRecordPage />} />
              <Route path="/pacientes/:pacienteId/consultas/nueva" element={<NewConsultationWizardPage />} />
              <Route path="/pacientes/:pacienteId/consultas/:consultaId" element={<ConsultationDetailPage />} />
              <Route path="/agenda" element={<AppointmentsCalendarPage />} />
              <Route path="/acceso-restringido" element={<AccessRestrictedPage />} />
              <Route path="/sesion-activa" element={<Navigate to="/panel" replace />} />
              
              {/* Rutas con verificación de permisos específicos para probar V02 */}
              <Route
                path="/administracion/auditoria"
                element={
                  <AuthGuard requierePermiso="auditoria.leer">
                    <div style={{ padding: '24px' }}>Auditoría del sistema</div>
                  </AuthGuard>
                }
              />
              <Route
                path="/administracion/usuarios"
                element={
                  <AuthGuard requierePermiso="usuarios.administrar">
                    <UsersManagementPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/administracion/catalogos"
                element={
                  <AuthGuard requierePermiso="usuarios.administrar">
                    <CatalogosManagementPage />
                  </AuthGuard>
                }
              />
            </Route>

            {/* Redirecciones por defecto */}
            <Route path="/" element={<Navigate to="/panel" replace />} />
            <Route path="*" element={<Navigate to="/panel" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthSessionProvider>
    </ServiceProvider>
  );
};

export default App;
