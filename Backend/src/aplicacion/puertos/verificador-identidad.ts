import type { Institucion } from '../../dominio/compartido/institucion.js';
import type { InstanteUTC } from '../../dominio/compartido/instante-utc.js';

export interface IdentidadVerificada {
  readonly uid: string;
  readonly institucion: Institucion;
  readonly emitidoEn: InstanteUTC;
}

export interface VerificadorIdentidad {
  /**
   * Verifica firma, emisor, audiencia, vencimiento y revocación del token Bearer.
   * Rechaza tokens vacíos, vencidos o revocados con NO_AUTENTICADO.
   * Falla con IDENTIDAD_NO_DISPONIBLE si el proveedor de identidad es inaccesible.
   */
  verificar(token: string): Promise<IdentidadVerificada>;

  /**
   * Revoca los refresh tokens del UID verificado fuera de la transacción clínica.
   * Falla con IDENTIDAD_NO_DISPONIBLE si el proveedor de identidad no responde.
   */
  revocarSesiones(uidVerificado: string): Promise<void>;
}
