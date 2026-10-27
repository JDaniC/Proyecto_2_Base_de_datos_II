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
  VaccineRepository,
} from '../contracts';
import { ModoServiciosFrontend } from '../types';
import { createApiAdapterUnavailableError, requireApiAdapter } from '../../app/ServiceContext';
import { HttpClient } from './httpClient';
import { TokenProvider } from './types';
import { TrialAuthProvider } from './authProvider';
import { HttpAuthRepository } from './httpAuthRepository';

export interface HttpServiceFactoryOptions {
  baseUrl?: string;
  tokenProvider?: TokenProvider;
  httpClient?: HttpClient;
  customAuthRepository?: AuthRepository;
}

export interface HttpServicesContainer {
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
  httpClient: HttpClient;
  tokenProvider: TokenProvider;
}

export function createHttpAuthRepository(options: HttpServiceFactoryOptions = {}): HttpAuthRepository {
  const tokenProvider = options.tokenProvider || new TrialAuthProvider();
  const httpClient = options.httpClient || new HttpClient({ baseUrl: options.baseUrl, tokenProvider });
  return new HttpAuthRepository(httpClient, tokenProvider);
}

export function createHttpServices(options: HttpServiceFactoryOptions = {}): HttpServicesContainer {
  const tokenProvider = options.tokenProvider || new TrialAuthProvider();
  const httpClient = options.httpClient || new HttpClient({ baseUrl: options.baseUrl, tokenProvider });
  const authRepository = options.customAuthRepository || new HttpAuthRepository(httpClient, tokenProvider);

  return {
    mode: 'api',
    authRepository,
    httpClient,
    tokenProvider,
    dashboardRepository: {
      obtenerDashboard: async () => {
        throw createApiAdapterUnavailableError(
          'dashboardRepository',
          'obtenerDashboard',
          501,
          'NOT_IMPLEMENTED'
        );
      },
    },
    patientRepository: requireApiAdapter<PatientRepository>(undefined, 'patientRepository'),
    appointmentRepository: requireApiAdapter<AppointmentRepository>(undefined, 'appointmentRepository'),
    consultationRepository: requireApiAdapter<ConsultationRepository>(undefined, 'consultationRepository'),
    userRepository: requireApiAdapter<UserRepository>(undefined, 'userRepository'),
    catalogRepository: requireApiAdapter<CatalogRepository>(undefined, 'catalogRepository'),
    auditRepository: requireApiAdapter<AuditRepository>(undefined, 'auditRepository'),
    hospitalizationRepository: requireApiAdapter<HospitalizationRepository>(undefined, 'hospitalizationRepository'),
    examRepository: requireApiAdapter<HospitalExamRepository>(undefined, 'examRepository'),
    laboratoryRepository: requireApiAdapter<LaboratoryRepository>(undefined, 'laboratoryRepository'),
    vaccineRepository: requireApiAdapter<VaccineRepository>(undefined, 'vaccineRepository'),
  };
}
