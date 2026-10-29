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
/** Toda implementación transaccional debe leer estos puertos desde la misma conexión/sesión. */
export interface PuertosClinicos {
  readonly pacientes: { porId(id: UUID): Promise<Paciente | null> };
  readonly profesionales: { porId(id: UUID): Promise<ProfesionalClinico | null> };
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
  };
  readonly responsables: {
    autorizacion(pacienteId: UUID, responsableId: UUID): Promise<{
      readonly activo: boolean; readonly autorizaAtencion: boolean; readonly version: Version;
      readonly documento: { readonly tipo: string; readonly numero: string }; readonly nombre: string;
    } | null>;
  };
}
