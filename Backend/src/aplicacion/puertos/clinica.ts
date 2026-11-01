import type { Consulta, ProfesionalClinico } from '../../dominio/clinica/consulta.js';
import type { Cita } from '../../dominio/clinica/cita.js';
import type { Paciente } from '../../dominio/clinica/paciente.js';
import type { UUID } from '../../dominio/compartido/uuid.js';
import type { Version } from '../../dominio/compartido/version.js';
import type { FiltrosPagina, Pagina } from './nucleo.js';

export interface FiltrosCitas {
  readonly fecha_desde: string; readonly fecha_hasta: string; readonly profesional_id?: UUID;
  readonly estado?: Cita['estado']; readonly q?: string;
}
export interface RangoRevisiones { readonly desde?: string; readonly hasta?: string; }
export interface RevisionClinica<T> {
  readonly id: UUID; readonly version: Version; readonly fecha_hora: string;
  readonly actor_id: UUID; readonly motivo: string; readonly anterior: T; readonly actual: T;
}
export interface RevisionCita {
  readonly id: UUID; readonly version: Version; readonly fecha_hora: string;
  readonly actor_id: UUID; readonly motivo_cambio: string; readonly anterior: Cita; readonly actual: Cita;
}
export interface AlergiaAntecedente {
  readonly sustancia: string;
  readonly severidad: 'LEVE' | 'MODERADA' | 'SEVERA';
  readonly reaccion: string;
  readonly fechaRegistro?: string;
}
export interface RegistroAntecedente {
  readonly id: UUID;
  readonly tipo: string;
  readonly descripcion: string;
  readonly fecha_registro: string;
}
export interface AntecedentesClinicos {
  readonly patologicos: readonly string[];
  readonly quirurgicos: readonly string[];
  readonly familiares: readonly string[];
  readonly alergias: readonly AlergiaAntecedente[];
  readonly medicamentos_actuales: readonly string[];
  readonly registros: readonly RegistroAntecedente[];
}
export interface ItemCatalogoDiagnosticoOdontologico {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion?: string;
}
export interface ItemCatalogoProcedimientoOdontologico {
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion: string;
  readonly tarifaQuetzales: number;
  readonly duracionMinutos: number;
  readonly requiereAnestesia: boolean;
}
export interface ItemCatalogoMedicamentoOdontologico {
  readonly id: string;
  readonly nombre: string;
  readonly principio_activo?: string;
  readonly presentacion?: string;
  readonly concentracion?: string;
  readonly dosis_sugerida: string;
  readonly frecuencia_sugerida: string;
  readonly duracion_sugerida: string;
  readonly via_administracion: string;
}
export interface CatalogoOdontologico {
  readonly diagnosticos: readonly ItemCatalogoDiagnosticoOdontologico[];
  readonly procedimientos: readonly ItemCatalogoProcedimientoOdontologico[];
  readonly medicamentos: readonly ItemCatalogoMedicamentoOdontologico[];
}
/** Toda implementación transaccional debe leer estos puertos desde la misma conexión/sesión. */
export interface PuertosClinicos {
  readonly pacientes: { porId(id: UUID): Promise<Paciente | null> };
  readonly profesionales: {
    porId(id: UUID): Promise<ProfesionalClinico | null>;
    listar?(): Promise<readonly ProfesionalClinico[]>;
  };
  readonly consultas: {
    porId(id: UUID): Promise<Consulta | null>;
    porVersion(id: UUID, version: Version): Promise<Consulta | null>;
    porCita(id: UUID): Promise<Consulta | null>;
  };
  readonly citas: {
    porId(id: UUID): Promise<Cita | null>;
    listar(filtros: FiltrosCitas, pagina: FiltrosPagina, ambitoCursor?: string): Promise<Pagina<Cita>>;
    /** El adaptador serializa/reserva intervalos concurrentes en la UoW. */
    solapamientos(profesional: UUID, fecha: string, inicio: string, fin: string): Promise<readonly Cita[]>;
    revisiones(id: UUID, rango: RangoRevisiones, pagina: FiltrosPagina, ambitoCursor?: string): Promise<Pagina<RevisionCita>>;
  };
  readonly responsables: {
    autorizacion(pacienteId: UUID, responsableId: UUID): Promise<{
      readonly activo: boolean; readonly autorizaAtencion: boolean; readonly version: Version;
      readonly documento: { readonly tipo: string; readonly numero: string }; readonly nombre: string;
    } | null>;
  };
  readonly antecedentes?: {
    porPaciente(pacienteId: UUID): Promise<AntecedentesClinicos>;
  };
  readonly catalogos?: {
    odontologia(): Promise<CatalogoOdontologico>;
  };
  readonly secretariaGestoraActor?: (actorId: UUID) => Promise<string | null>;
}
