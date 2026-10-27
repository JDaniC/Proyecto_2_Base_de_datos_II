import type { UUID } from '../../dominio/compartido/uuid.js';
import type { Pagina, FiltrosPagina } from './nucleo.js';
import type { Paciente, EstadoPaciente } from '../../dominio/clinica/paciente.js';

export interface CriteriosBusquedaPacientes extends FiltrosPagina {
  readonly q: string;
  readonly estado?: EstadoPaciente | 'TODOS';
}

export interface RepositorioPacienteLectura {
  porId(id: UUID): Promise<Paciente | null>;
  buscar(criterios: CriteriosBusquedaPacientes): Promise<Pagina<Paciente>>;
}
