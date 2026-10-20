import React, { createContext, useContext, useMemo } from 'react';
import {
  AuthRepository,
  DashboardRepository,
  PatientRepository,
  AppointmentRepository
} from '../services/contracts';
import { MockAuthRepository } from '../mocks/mockAuthRepository';
import { MockDashboardRepository } from '../mocks/mockDashboardRepository';
import { MockPatientRepository } from '../mocks/mockPatientRepository';
import { MockAppointmentRepository } from '../mocks/mockAppointmentRepository';

interface ServiceContainer {
  authRepository: AuthRepository;
  dashboardRepository: DashboardRepository;
  patientRepository: PatientRepository;
  appointmentRepository: AppointmentRepository;
}

const ServiceContext = createContext<ServiceContainer | null>(null);

export interface ServiceProviderProps {
  children: React.ReactNode;
  customAuthRepository?: AuthRepository;
  customDashboardRepository?: DashboardRepository;
  customPatientRepository?: PatientRepository;
  customAppointmentRepository?: AppointmentRepository;
}

export const ServiceProvider: React.FC<ServiceProviderProps> = ({
  children,
  customAuthRepository,
  customDashboardRepository,
  customPatientRepository,
  customAppointmentRepository,
}) => {
  const services = useMemo<ServiceContainer>(() => {
    return {
      authRepository: customAuthRepository || new MockAuthRepository(),
      dashboardRepository: customDashboardRepository || new MockDashboardRepository(),
      patientRepository: customPatientRepository || new MockPatientRepository(),
      appointmentRepository: customAppointmentRepository || new MockAppointmentRepository(),
    };
  }, [
    customAuthRepository,
    customDashboardRepository,
    customPatientRepository,
    customAppointmentRepository,
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
