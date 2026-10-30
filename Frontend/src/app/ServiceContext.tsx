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
  HospitalExamRepository,
  LaboratoryRepository,
  VaccineRepository
} from '../services/contracts';
import { ModoServiciosFrontend } from '../services/types';
import { resolveServiceMode } from './productScope';
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
import { MockLaboratoryRepository } from '../mocks/mockLaboratoryRepository';
import { MockVaccineRepository } from '../mocks/mockVaccineRepository';
import { createHttpServices } from '../services/http/serviceFactory';

interface ServiceContainer {
  mode: ModoServiciosFrontend;
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
  laboratoryRepository: LaboratoryRepository;
  vaccineRepository: VaccineRepository;
}

const ServiceContext = createContext<ServiceContainer | null>(null);

export interface ServiceProviderProps {
  children: React.ReactNode;
  mode?: ModoServiciosFrontend;
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
  customLaboratoryRepository?: LaboratoryRepository;
  customVaccineRepository?: VaccineRepository;
}

export interface ApiAdapterUnavailableError extends Error {
  readonly code: 'PERSISTENCIA_NO_DISPONIBLE' | 'NOT_IMPLEMENTED';
  readonly status: 503 | 501;
  readonly repository: string;
  readonly method?: string;
}

export function createApiAdapterUnavailableError(
  repository: string,
  method?: string,
  status: 503 | 501 = 503,
  code: 'PERSISTENCIA_NO_DISPONIBLE' | 'NOT_IMPLEMENTED' = 'PERSISTENCIA_NO_DISPONIBLE'
): ApiAdapterUnavailableError {
  const target = method ? `${repository}.${method}` : repository;
  const err = new Error(
    `${status} ${code}: Modo API activo sin adaptador HTTP configurado para ${target}. Prohibido el fallback automático a simuladores.`
  ) as ApiAdapterUnavailableError;
  Object.defineProperties(err, {
    code: { value: code, enumerable: true },
    status: { value: status, enumerable: true },
    repository: { value: repository, enumerable: true },
    method: { value: method, enumerable: true },
  });
  return err;
}

export function requireApiAdapter<T extends object>(adapter: T | undefined, name: string): T {
  if (adapter) {
    return adapter;
  }
  return new Proxy({} as T, {
    get(_target, prop) {
      if (typeof prop === 'symbol' || prop === 'then') {
        return undefined;
      }
      return async () => {
        throw createApiAdapterUnavailableError(name, String(prop), 503, 'PERSISTENCIA_NO_DISPONIBLE');
      };
    },
  });
}

export const ServiceProvider: React.FC<ServiceProviderProps> = ({
  children,
  mode,
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
  customLaboratoryRepository,
  customVaccineRepository,
}) => {
  const resolvedMode = resolveServiceMode(mode);

  const services = useMemo<ServiceContainer>(() => {
    if (resolvedMode === 'api') {
      const httpServices = createHttpServices({ customAuthRepository });
      return {
        mode: 'api',
        authRepository: httpServices.authRepository,
        dashboardRepository: customDashboardRepository || {
          obtenerDashboard: async () => {
            throw createApiAdapterUnavailableError(
              'dashboardRepository',
              'obtenerDashboard',
              501,
              'NOT_IMPLEMENTED'
            );
          }
        },
        patientRepository: customPatientRepository || httpServices.patientRepository,
        appointmentRepository: customAppointmentRepository || httpServices.appointmentRepository,
        consultationRepository: customConsultationRepository || httpServices.consultationRepository,
        userRepository: requireApiAdapter(customUserRepository, 'userRepository'),
        catalogRepository: requireApiAdapter(customCatalogRepository, 'catalogRepository'),
        auditRepository: requireApiAdapter(customAuditRepository, 'auditRepository'),
        hospitalizationRepository: requireApiAdapter(customHospitalizationRepository, 'hospitalizationRepository'),
        examRepository: requireApiAdapter(customExamRepository, 'examRepository'),
        laboratoryRepository: requireApiAdapter(customLaboratoryRepository, 'laboratoryRepository'),
        vaccineRepository: requireApiAdapter(customVaccineRepository, 'vaccineRepository'),
      };
    }

    return {
      mode: 'mock',
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
      laboratoryRepository: customLaboratoryRepository || new MockLaboratoryRepository(),
      vaccineRepository: customVaccineRepository || new MockVaccineRepository(),
    };
  }, [
    resolvedMode,
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
    customLaboratoryRepository,
    customVaccineRepository,
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
