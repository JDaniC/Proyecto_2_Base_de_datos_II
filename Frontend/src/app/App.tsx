import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ServiceProvider } from './ServiceContext';
import { AuthSessionProvider } from './AuthSessionContext';
import { AuthGuard } from './AuthGuard';
import { AuthenticatedLayout } from '../layouts/AuthenticatedLayout';
import { LoginPage } from '../features/auth/LoginPage';
import { AccessRestrictedPage } from '../features/auth/AccessRestrictedPage';
const DashboardPage = React.lazy(() => import('../features/dashboard/DashboardPage').then((page) => ({ default: page.DashboardPage })));
const PatientsListPage = React.lazy(() => import('../features/patients/PatientsListPage').then((page) => ({ default: page.PatientsListPage })));
const PatientFormPage = React.lazy(() => import('../features/patients/PatientFormPage').then((page) => ({ default: page.PatientFormPage })));
const PatientRecordPage = React.lazy(() => import('../features/patients/PatientRecordPage').then((page) => ({ default: page.PatientRecordPage })));
const AppointmentsCalendarPage = React.lazy(() => import('../features/appointments/AppointmentsCalendarPage').then((page) => ({ default: page.AppointmentsCalendarPage })));
const NewConsultationWizardPage = React.lazy(() => import('../features/consultations/NewConsultationWizardPage').then((page) => ({ default: page.NewConsultationWizardPage })));
const ConsultationDetailPage = React.lazy(() => import('../features/consultations/ConsultationDetailPage').then((page) => ({ default: page.ConsultationDetailPage })));
const UsersManagementPage = React.lazy(() => import('../features/admin/UsersManagementPage').then((page) => ({ default: page.UsersManagementPage })));
const CatalogosManagementPage = React.lazy(() => import('../features/admin/CatalogosManagementPage').then((page) => ({ default: page.CatalogosManagementPage })));
const AuditSearchPage = React.lazy(() => import('../features/admin/AuditSearchPage').then((page) => ({ default: page.AuditSearchPage })));
const HospitalizationsListPage = React.lazy(() => import('../features/hospital/HospitalizationsListPage').then((page) => ({ default: page.HospitalizationsListPage })));
const HospitalizationAdmissionPage = React.lazy(() => import('../features/hospital/HospitalizationAdmissionPage').then((page) => ({ default: page.HospitalizationAdmissionPage })));
const HospitalizationDetailPage = React.lazy(() => import('../features/hospital/HospitalizationDetailPage').then((page) => ({ default: page.HospitalizationDetailPage })));
const HospitalBedsMapPage = React.lazy(() => import('../features/hospital/HospitalBedsMapPage').then((page) => ({ default: page.HospitalBedsMapPage })));
const HospitalExamOrdersPage = React.lazy(() => import('../features/hospital/HospitalExamOrdersPage').then((page) => ({ default: page.HospitalExamOrdersPage })));
const WorklistPage = React.lazy(() => import('../features/laboratory/WorklistPage').then((page) => ({ default: page.WorklistPage })));
const NewOrderPage = React.lazy(() => import('../features/laboratory/NewOrderPage').then((page) => ({ default: page.NewOrderPage })));
const OrderDetailPage = React.lazy(() => import('../features/laboratory/OrderDetailPage').then((page) => ({ default: page.OrderDetailPage })));
const SamplesManagementPage = React.lazy(() => import('../features/laboratory/SamplesManagementPage').then((page) => ({ default: page.SamplesManagementPage })));
const ResultsCapturePage = React.lazy(() => import('../features/laboratory/ResultsCapturePage').then((page) => ({ default: page.ResultsCapturePage })));
const ResultsValidationPage = React.lazy(() => import('../features/laboratory/ResultsValidationPage').then((page) => ({ default: page.ResultsValidationPage })));
const LabReportPage = React.lazy(() => import('../features/laboratory/LabReportPage').then((page) => ({ default: page.LabReportPage })));
const QualityControlPage = React.lazy(() => import('../features/laboratory/QualityControlPage').then((page) => ({ default: page.QualityControlPage })));
const InventoryPage = React.lazy(() => import('../features/laboratory/InventoryPage').then((page) => ({ default: page.InventoryPage })));
const BillingPaymentsPage = React.lazy(() => import('../features/laboratory/BillingPaymentsPage').then((page) => ({ default: page.BillingPaymentsPage })));

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
              <Route path="/pacientes/:pacienteId/consultas/nueva" element={<AuthGuard requierePermiso="consultas.registrar"><NewConsultationWizardPage /></AuthGuard>} />
              <Route path="/pacientes/:pacienteId/consultas/:consultaId" element={<AuthGuard requierePermiso="historial.leer"><ConsultationDetailPage /></AuthGuard>} />
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
              <Route
                path="/laboratorio/resultados/validacion"
                element={
                  <AuthGuard requierePermiso={['resultados.analizar', 'resultados.validar', 'usuarios.administrar']}>
                    <ResultsValidationPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/laboratorio/informes/:ordenId"
                element={
                  <AuthGuard requierePermiso={['resultados.analizar', 'resultados.validar', 'usuarios.administrar', 'pacientes.administrar']}>
                    <LabReportPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/laboratorio/catalogo"
                element={
                  <AuthGuard>
                    <Navigate to="/administracion/catalogos?tab=laboratorio" replace />
                  </AuthGuard>
                }
              />
              <Route
                path="/laboratorio/calidad"
                element={
                  <AuthGuard requierePermiso={['resultados.analizar', 'resultados.validar', 'usuarios.administrar']}>
                    <QualityControlPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/laboratorio/personal"
                element={
                  <AuthGuard>
                    <Navigate to="/administracion/usuarios?tab=personal-laboratorio" replace />
                  </AuthGuard>
                }
              />
              <Route
                path="/laboratorio/inventario"
                element={
                  <AuthGuard requierePermiso={['resultados.analizar', 'usuarios.administrar', 'inventario.administrar']}>
                    <InventoryPage />
                  </AuthGuard>
                }
              />
              <Route
                path="/laboratorio/cobros"
                element={
                  <AuthGuard requierePermiso={['cobros.administrar', 'usuarios.administrar']}>
                    <BillingPaymentsPage />
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
