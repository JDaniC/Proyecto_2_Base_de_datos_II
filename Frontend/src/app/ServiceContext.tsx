import React, { createContext, useContext, useMemo } from 'react';
import {
  AuthRepository,
  DashboardRepository,
  PatientRepository,
  AppointmentRepository,
  ConsultationRepository
} from '../services/contracts';
import { MockAuthRepository } from '../mocks/mockAuthRepository';
import { MockDashboardRepository } from '../mocks/mockDashboardRepository';
import { MockPatientRepository } from '../mocks/mockPatientRepository';
import { MockAppointmentRepository } from '../mocks/mockAppointmentRepository';
import { MockConsultationRepository } from '../mocks/mockConsultationRepository';

interface ServiceContainer {
  authRepository: AuthRepository;
  dashboardRepository: DashboardRepository;
  patientRepository: PatientRepository;
  appointmentRepository: AppointmentRepository;
  consultationRepository: ConsultationRepository;
}

const ServiceContext = createContext<ServiceContainer | null>(null);

export interface ServiceProviderProps {
  children: React.ReactNode;
  customAuthRepository?: AuthRepository;
  customDashboardRepository?: DashboardRepository;
  customPatientRepository?: PatientRepository;
  customAppointmentRepository?: AppointmentRepository;
  customConsultationRepository?: ConsultationRepository;
}

export const ServiceProvider: React.FC<ServiceProviderProps> = ({
  children,
  customAuthRepository,
  customDashboardRepository,
  customPatientRepository,
  customAppointmentRepository,
  customConsultationRepository,
}) => {
  const services = useMemo<ServiceContainer>(() => {
    return {
      authRepository: customAuthRepository || new MockAuthRepository(),
      dashboardRepository: customDashboardRepository || new MockDashboardRepository(),
      patientRepository: customPatientRepository || new MockPatientRepository(),
      appointmentRepository: customAppointmentRepository || new MockAppointmentRepository(),
      consultationRepository: customConsultationRepository || new MockConsultationRepository(),
    };
  }, [
    customAuthRepository,
    customDashboardRepository,
    customPatientRepository,
    customAppointmentRepository,
    customConsultationRepository,
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
