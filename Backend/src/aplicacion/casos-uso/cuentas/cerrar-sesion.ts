import type { ContextoAutenticado } from '../../puertos/contexto-autenticado.js';
import type { VerificadorIdentidad } from '../../puertos/verificador-identidad.js';
import type { CierreSesionDto } from './dtos-sesion.js';

export interface EntradaCerrarSesion {
  readonly contexto: ContextoAutenticado;
}

export class CerrarSesion {
  constructor(private readonly verificadorIdentidad: VerificadorIdentidad) {}

  async ejecutar(entrada: EntradaCerrarSesion): Promise<CierreSesionDto> {
    await this.verificadorIdentidad.revocarSesiones(entrada.contexto.identidad.uid);
    return Object.freeze({ cerrada: true as const });
  }
}
