import type { ContextoAutenticado } from './contexto-autenticado.js';
import type { UUID } from '../../dominio/compartido/uuid.js';
import type { Version } from '../../dominio/compartido/version.js';
import type {
  CamaHospitalaria,
  Hospitalizacion,
  ResumenHospitalizacion,
  TipoEgresoHospitalario,
} from '../../dominio/hospital/hospitalizacion.js';

export interface ParametrosIngresoHospitalario {
  readonly comando: ComandoHospital;
  readonly pacienteId: UUID;
  readonly camaId: UUID;
  readonly motivoIngreso: string;
  readonly diagnosticoIngresoCIE: string;
  readonly diagnosticoIngresoNombre: string;
  readonly consultasEnlazadasIds?: readonly UUID[] | undefined;
  readonly versionEsperadaCama?: Version | undefined;
}

export interface ParametrosEgresoHospitalario {
  readonly comando: ComandoHospital;
  readonly hospitalizacionId: UUID;
  readonly fechaEgreso: string;
  readonly tipoEgreso: TipoEgresoHospitalario;
  readonly diagnosticoEgresoCIE: string;
  readonly diagnosticoEgresoNombre: string;
  readonly resumenClinico: string;
  readonly versionEsperada?: Version | undefined;
}

export interface ParametrosAsignarCama {
  readonly comando: ComandoHospital;
  readonly hospitalizacionId: UUID;
  readonly nuevaCamaId: UUID;
  readonly fechaInicio: string;
  readonly motivo?: string | undefined;
  readonly versionEsperada?: Version | undefined;
}

export interface ParametrosLiberarCama {
  readonly comando: ComandoHospital;
  readonly hospitalizacionId: UUID;
  readonly fechaFin: string;
  readonly versionEsperada?: Version | undefined;
}

export interface ParametrosNotaEvolucion {
  readonly comando: ComandoHospital;
  readonly hospitalizacionId: UUID;
  readonly notaClinica: string;
  readonly planTerapeutico?: string | undefined;
  readonly versionEsperada?: Version | undefined;
}

export interface ParametrosProcedimientoHospitalario {
  readonly comando: ComandoHospital;
  readonly hospitalizacionId: UUID;
  readonly nombre: string;
  readonly resultado: string;
  readonly codigo?: string | undefined;
  readonly observaciones?: string | undefined;
  readonly versionEsperada?: Version | undefined;
}

export interface PuertosHospital {
  readonly hospitalizaciones: {
    porId(id: UUID): Promise<Hospitalizacion | null>;
    listar(filtroEstado?: string, pagina?: PaginaHospital): Promise<readonly ResumenHospitalizacion[]>;
    porPaciente(pacienteId: UUID, pagina?: PaginaHospital, estado?: string): Promise<readonly ResumenHospitalizacion[]>;
    ingresar(params: ParametrosIngresoHospitalario, medicoResponsableId: UUID): Promise<Hospitalizacion>;
    egresar(params: ParametrosEgresoHospitalario, medicoResponsableId: UUID): Promise<Hospitalizacion>;
    asignarCama(params: ParametrosAsignarCama, actorId: UUID): Promise<Hospitalizacion>;
    liberarCama(params: ParametrosLiberarCama, actorId: UUID): Promise<Hospitalizacion>;
    agregarNotaEvolucion(
      params: ParametrosNotaEvolucion,
      medico: { readonly id: UUID; readonly nombre: string; readonly colegiado: string },
    ): Promise<Hospitalizacion>;
    agregarProcedimiento(
      params: ParametrosProcedimientoHospitalario,
      profesional: { readonly id: UUID; readonly nombre: string },
    ): Promise<Hospitalizacion>;
  };
  readonly camas: {
    listar(): Promise<readonly CamaHospitalaria[]>;
    porId(id: UUID): Promise<CamaHospitalaria | null>;
  };
}

export interface ComandoHospital {
  readonly contexto: ContextoAutenticado;
  readonly clave: string;
}

export interface PaginaHospital { readonly pagina: number; readonly limite: number; }
