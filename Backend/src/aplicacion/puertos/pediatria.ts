import type { UUID } from '../../dominio/compartido/uuid.js';
import type { Perinatales } from '../../dominio/pediatria/antecedentes.js';
export interface AlergiaPediatrica {
  readonly id: UUID; readonly sustancia:string; readonly severidad:'LEVE'|'MODERADA'|'SEVERA';
  readonly reaccion:string; readonly activa:boolean; readonly actorId:UUID; readonly fechaHora:string;
}
export interface AntecedentesPediatricos {
  readonly version:number;
  readonly alergias:readonly AlergiaPediatrica[];
  readonly perinatales?:Perinatales;
  readonly verificacionSinAlergias?:{readonly actorId:UUID;readonly fechaHora:string};
  readonly actorId?:UUID;readonly fechaHora?:string;
}
export interface PuertoAntecedentesPediatricos {
  /** Exige preparación 009 LISTO, no transforma legado sin procedencia. */
  porPaciente(pacienteId:UUID):Promise<AntecedentesPediatricos>;
}
