import { InstitucionId, InstitucionIdCanonica, MotorBaseDatos, PermisoId, RolId } from '../types';

export interface MetaRespuesta {
  readonly correlacion: string;
  readonly siguiente_cursor?: string;
}

export interface CampoInvalido {
  readonly campo: string;
  readonly mensaje: string;
}

export interface ErrorHttpPayload {
  readonly codigo: string;
  readonly mensaje: string;
  readonly campos?: readonly CampoInvalido[];
}

export interface RespuestaApi<T> {
  readonly data: T;
  readonly meta: MetaRespuesta;
}

export interface RespuestaErrorApi {
  readonly error: ErrorHttpPayload;
  readonly meta: MetaRespuesta;
}

export interface ProfesionalSesionDto {
  readonly id: string;
  readonly activo: boolean;
  readonly nombre?: string;
}

export interface SesionDto {
  readonly cuenta_id: string;
  readonly institucion: InstitucionIdCanonica;
  readonly roles: readonly RolId[];
  readonly permisos: readonly PermisoId[];
  readonly profesional?: ProfesionalSesionDto;
  readonly version: number;
}

export interface CierreSesionDto {
  readonly cerrada: true;
}

export interface HttpRequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly headers?: Record<string, string>;
  readonly query?: Record<string, string | number | boolean | undefined>;
  readonly body?: unknown;
  readonly idempotencyKey?: string;
  readonly correlacionId?: string;
  readonly skipAuth?: boolean;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

export interface TokenProvider {
  obtenerToken(): Promise<string | null>;
  establecerCredenciales(email: string, password?: string): Promise<string>;
  limpiar(): Promise<void>;
  onTokenExpirado?: () => void;
}

export interface HttpClientConfig {
  readonly baseUrl?: string;
  readonly tokenProvider?: TokenProvider;
  readonly defaultTimeoutMs?: number;
}

export const INSTITUCION_METADATA: Record<
  InstitucionId,
  { readonly nombre: string; readonly motor: MotorBaseDatos }
> = {
  HOSPITAL_GENERAL: {
    nombre: 'Hospital General San Juan',
    motor: 'PostgreSQL',
  },
  CLINICA_ODONTOLOGICA: {
    nombre: 'Clínica Odontológica La Esperanza',
    motor: 'MySQL',
  },
  LABORATORIO_CLINICO: {
    nombre: 'Laboratorio Clínico Central',
    motor: 'MongoDB',
  },
  CENTRO_PEDIATRICO: {
    nombre: 'Centro Médico Pediátrico San Gabriel',
    motor: 'Cloud Firestore',
  },
};
