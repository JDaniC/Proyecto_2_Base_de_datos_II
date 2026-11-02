import type { UUID } from '../../dominio/compartido/uuid.js';
import type {
  VacunaCatalogo,
  VersionEsquemaVacuna,
  EsquemaPaciente,
  AplicacionVacuna,
} from '../../dominio/pediatria/vacunas.js';

export interface PuertoVacunasCatalogo {
  obtenerCatalogo(): Promise<readonly VacunaCatalogo[]>;
  obtenerVersionEsquema(vacunaId: UUID, versionId: UUID): Promise<VersionEsquemaVacuna | null>;
}

export interface PuertoEsquemaPaciente {
  obtenerEsquemas(pacienteId: UUID): Promise<readonly EsquemaPaciente[]>;

}

export interface PuertoAplicacionesVacuna {
  obtenerAplicaciones(pacienteId: UUID): Promise<readonly AplicacionVacuna[]>;
  obtenerPorId(aplicacionId: string): Promise<AplicacionVacuna | null>;
}
