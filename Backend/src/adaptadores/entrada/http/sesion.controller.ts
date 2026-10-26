import { Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { CerrarSesion } from '../../../aplicacion/casos-uso/cuentas/cerrar-sesion.js';
import { ObtenerSesionActual } from '../../../aplicacion/casos-uso/cuentas/obtener-sesion-actual.js';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import { Contexto, SoloAutenticado, type RequestAutenticada } from './decoradores-auth.js';
import type { ContextoAutenticado } from '../../../aplicacion/puertos/contexto-autenticado.js';
import type { CierreSesionDto, SesionDto } from '../../../aplicacion/casos-uso/cuentas/dtos-sesion.js';

@Controller('sesion')
export class SesionController {
  constructor(
    private readonly obtenerSesionActual: ObtenerSesionActual,
    private readonly cerrarSesion: CerrarSesion,
  ) {}

  @Post()
  @HttpCode(200)
  @SoloAutenticado()
  establecer(
    @Req() solicitud: RequestAutenticada,
    @Contexto() contexto: ContextoAutenticado,
  ): Promise<SesionDto> {
    exigirSinCuerpo(solicitud.body);
    return this.obtenerSesionActual.ejecutar({ contexto });
  }

  @Get()
  @SoloAutenticado()
  obtener(
    @Contexto() contexto: ContextoAutenticado,
  ): Promise<SesionDto> {
    return this.obtenerSesionActual.ejecutar({ contexto });
  }

  @Post('cierre')
  @HttpCode(200)
  @SoloAutenticado()
  cerrar(
    @Req() solicitud: RequestAutenticada,
    @Contexto() contexto: ContextoAutenticado,
  ): Promise<CierreSesionDto> {
    exigirSinCuerpo(solicitud.body);
    return this.cerrarSesion.ejecutar({ contexto });
  }
}

function exigirSinCuerpo(cuerpo: unknown): void {
  if (cuerpo !== undefined) {
    throw new ErrorDominio('SOLICITUD_INVALIDA', 'Esta operación no acepta cuerpo.');
  }
}
