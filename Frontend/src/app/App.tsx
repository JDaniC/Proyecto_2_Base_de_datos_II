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
import { AuditSearchPage } from '../features/admin/AuditSearchPage';
import { HospitalizationsListPage } from '../features/hospital/HospitalizationsListPage';
import { HospitalizationAdmissionPage } from '../features/hospital/HospitalizationAdmissionPage';
import { HospitalizationDetailPage } from '../features/hospital/HospitalizationDetailPage';
import { HospitalBedsMapPage } from '../features/hospital/HospitalBedsMapPage';
import { HospitalExamOrdersPage } from '../features/hospital/HospitalExamOrdersPage';
import { WorklistPage } from '../features/laboratory/WorklistPage';
import { NewOrderPage } from '../features/laboratory/NewOrderPage';
import { OrderDetailPage } from '../features/laboratory/OrderDetailPage';
import { SamplesManagementPage } from '../features/laboratory/SamplesManagementPage';
import { ResultsCapturePage } from '../features/laboratory/ResultsCapturePage';

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
              <Route path="/hospital/hospitalizaciones" element={<HospitalizationsListPage />} />
              <Route path="/hospital/hospitalizaciones/nueva" element={<HospitalizationAdmissionPage />} />
              <Route path="/hospital/hospitalizaciones/:ingresoId" element={<HospitalizationDetailPage />} />
              <Route path="/hospital/camas" element={<HospitalBedsMapPage />} />
              <Route path="/hospital/examenes" element={<HospitalExamOrdersPage />} />
              <Route path="/acceso-restringido" element={<AccessRestrictedPage />} />
              <Route path="/sesion-activa" element={<Navigate to="/panel" replace />} />
              
              {/* Rutas con verificación de permisos específicos para probar V02 */}
              <Route
                path="/administracion/auditoria"
                element={
                  <AuthGuard requierePermiso="auditoria.leer">
                    <AuditSearchPage />
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
                  <AuthGuard requierePermiso={['usuarios.administrar', 'historial.leer', 'consultas.registrar']}>
                    <CatalogosManagementPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/laboratorio/bandeja"
                element={
                  <AuthGuard requierePermiso={['resultados.analizar', 'resultados.validar', 'pacientes.administrar', 'usuarios.administrar', 'historial.leer']}>
                    <WorklistPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/laboratorio/ordenes/nueva"
                element={
                  <AuthGuard requierePermiso={['pacientes.administrar', 'resultados.analizar', 'usuarios.administrar', 'citas.administrar', 'historial.leer']}>
                    <NewOrderPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/laboratorio/ordenes/:ordenId"
                element={
                  <AuthGuard requierePermiso={['resultados.analizar', 'resultados.validar', 'pacientes.administrar', 'usuarios.administrar', 'historial.leer']}>
                    <OrderDetailPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/laboratorio/muestras"
                element={
                  <AuthGuard requierePermiso={['resultados.analizar', 'resultados.validar', 'pacientes.administrar', 'usuarios.administrar', 'historial.leer']}>
                    <SamplesManagementPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/laboratorio/resultados/captura/:ordenId"
                element={
                  <AuthGuard requierePermiso={['resultados.analizar', 'resultados.validar', 'usuarios.administrar']}>
                    <ResultsCapturePage />
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
