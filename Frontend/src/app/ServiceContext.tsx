import React, { createContext, useContext, useMemo } from 'react';
import {
  AuthRepository,
  DashboardRepository,
  PatientRepository,
  AppointmentRepository,
  ConsultationRepository,
  UserRepository,
  CatalogRepository,
  AuditRepository,
  HospitalizationRepository,
  HospitalExamRepository
} from '../services/contracts';
import { MockAuthRepository } from '../mocks/mockAuthRepository';
import { MockDashboardRepository } from '../mocks/mockDashboardRepository';
import { MockPatientRepository } from '../mocks/mockPatientRepository';
import { MockAppointmentRepository } from '../mocks/mockAppointmentRepository';
import { MockConsultationRepository } from '../mocks/mockConsultationRepository';
import { MockUserRepository } from '../mocks/mockUserRepository';
import { MockCatalogRepository } from '../mocks/mockCatalogRepository';
import { MockAuditRepository } from '../mocks/mockAuditRepository';
import { MockHospitalizationRepository } from '../mocks/mockHospitalizationRepository';
import { MockHospitalExamRepository } from '../mocks/mockHospitalExamRepository';

interface ServiceContainer {
  authRepository: AuthRepository;
  dashboardRepository: DashboardRepository;
  patientRepository: PatientRepository;
  appointmentRepository: AppointmentRepository;
  consultationRepository: ConsultationRepository;
  userRepository: UserRepository;
  catalogRepository: CatalogRepository;
  auditRepository: AuditRepository;
  hospitalizationRepository: HospitalizationRepository;
  examRepository: HospitalExamRepository;
}

const ServiceContext = createContext<ServiceContainer | null>(null);

export interface ServiceProviderProps {
  children: React.ReactNode;
  customAuthRepository?: AuthRepository;
  customDashboardRepository?: DashboardRepository;
  customPatientRepository?: PatientRepository;
  customAppointmentRepository?: AppointmentRepository;
  customConsultationRepository?: ConsultationRepository;
  customUserRepository?: UserRepository;
  customCatalogRepository?: CatalogRepository;
  customAuditRepository?: AuditRepository;
  customHospitalizationRepository?: HospitalizationRepository;
  customExamRepository?: HospitalExamRepository;
}

export const ServiceProvider: React.FC<ServiceProviderProps> = ({
  children,
  customAuthRepository,
  customDashboardRepository,
  customPatientRepository,
  customAppointmentRepository,
  customConsultationRepository,
  customUserRepository,
  customCatalogRepository,
  customAuditRepository,
  customHospitalizationRepository,
  customExamRepository,
}) => {
  const services = useMemo<ServiceContainer>(() => {
    return {
      authRepository: customAuthRepository || new MockAuthRepository(),
      dashboardRepository: customDashboardRepository || new MockDashboardRepository(),
      patientRepository: customPatientRepository || new MockPatientRepository(),
      appointmentRepository: customAppointmentRepository || new MockAppointmentRepository(),
      consultationRepository: customConsultationRepository || new MockConsultationRepository(),
      userRepository: customUserRepository || new MockUserRepository(),
      catalogRepository: customCatalogRepository || new MockCatalogRepository(),
      auditRepository: customAuditRepository || new MockAuditRepository(),
      hospitalizationRepository: customHospitalizationRepository || new MockHospitalizationRepository(),
      examRepository: customExamRepository || new MockHospitalExamRepository(),
    };
  }, [
    customAuthRepository,
    customDashboardRepository,
    customPatientRepository,
    customAppointmentRepository,
    customConsultationRepository,
    customUserRepository,
    customCatalogRepository,
    customAuditRepository,
    customHospitalizationRepository,
    customExamRepository,
  ]);

  return <ServiceContext.Provider value={services}>{children}</ServiceContext.Provider>;
};

export const useServices = (): ServiceContainer => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServices debe utilizarse dentro de un ServiceProvider');
  }
  return context;
};
