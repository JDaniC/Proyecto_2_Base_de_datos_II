import type { UUID } from '../compartido/uuid.js';
import type { Version } from '../compartido/version.js';

export type EstadoHospitalizacion = 'ACTIVA' | 'FINALIZADA' | 'ANULADA';
export type EstadoCama = 'DISPONIBLE' | 'OCUPADA' | 'MANTENIMIENTO';
export type TipoEgresoHospitalario = 'ALTA_MEDICA' | 'TRASLADO' | 'VOLUNTARIA' | 'FALLECIMIENTO';

export interface CamaHospitalaria {
  readonly id: UUID;
  readonly habitacionId: UUID;
  readonly numeroHabitacion: string;
  readonly piso: number;
  readonly salaServicio: string;
  readonly codigoCama: string;
  readonly estado: EstadoCama;
  readonly hospitalizacionActivaId?: UUID | undefined;
  readonly pacienteActual?: string | undefined;
  readonly version: Version;
}

export interface AsignacionCamaItem {
  readonly id: UUID;
  readonly camaId: UUID;
  readonly codigoCama: string;
  readonly habitacion: string;
  readonly servicio: string;
  readonly fechaInicio: string;
  readonly fechaFin?: string | undefined;
  readonly motivoCambio?: string | undefined;
  readonly version: Version;
}

export interface NotaEvolucionItem {
  readonly medicoId?: UUID | undefined;
  readonly id: UUID;
  readonly fechaHora: string;
  readonly medicoNombre: string;
  readonly medicoColegiado: string;
  readonly notaClinica: string;
  readonly planTerapeutico?: string | undefined;
}

export interface ProcedimientoHospitalarioItem {
  readonly profesionalId?: UUID | undefined;
  readonly id: UUID;
  readonly nombre: string;
  readonly codigo?: string | undefined;
  readonly fechaHora: string;
  readonly profesionalNombre: string;
  readonly resultado: string;
  readonly observaciones?: string | undefined;
}

export interface Hospitalizacion {
  readonly id: UUID;
  readonly codigoIngreso: string;
  readonly pacienteId: UUID;
  readonly pacienteNombre: string;
  readonly pacienteExpediente: string;
  readonly medicoTratanteId: UUID;
  readonly medicoTratanteNombre: string;
  readonly medicoTratanteColegiado: string;
  readonly fechaIngreso: string;
  readonly fechaEgreso?: string | undefined;
  readonly estado: EstadoHospitalizacion;
  readonly diagnosticoIngresoCIE: string;
  readonly diagnosticoIngresoNombre: string;
  readonly diagnosticoEgresoCIE?: string | undefined;
  readonly diagnosticoEgresoNombre?: string | undefined;
  readonly motivoIngreso: string;
  readonly resumenEgreso?: string | undefined;
  readonly tipoEgreso?: TipoEgresoHospitalario | undefined;
  readonly camaActual?: {
    readonly camaId: UUID;
    readonly codigoCama: string;
    readonly habitacion: string;
    readonly servicio: string;
  } | undefined;
  readonly asignacionesCama: readonly AsignacionCamaItem[];
  readonly consultasEnlazadasIds: readonly UUID[];
  readonly notasEvolucion: readonly NotaEvolucionItem[];
  readonly procedimientos: readonly ProcedimientoHospitalarioItem[];
  readonly version: Version;
}
