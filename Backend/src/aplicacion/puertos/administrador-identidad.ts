import type { Institucion } from '../../dominio/compartido/institucion.js';

/** Operación administrativa contra Firebase Auth, separada de la validación de tokens. */
export interface AdministradorIdentidad {
  asegurarClaimInstitucion(uid: string, institucion: Institucion): Promise<void>;
}
