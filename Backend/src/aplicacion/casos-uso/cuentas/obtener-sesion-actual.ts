import type { ContextoAutenticado } from '../../puertos/contexto-autenticado.js';
import { crearSesionDto, type SesionDto } from './dtos-sesion.js';

export interface EntradaObtenerSesionActual {
  readonly contexto: ContextoAutenticado;
}

/** Proyecta el perfil que el guard acaba de verificar con token y cuenta vigentes. */
export class ObtenerSesionActual {
  async ejecutar(entrada: EntradaObtenerSesionActual): Promise<SesionDto> {
    return crearSesionDto(entrada.contexto);
  }
}
