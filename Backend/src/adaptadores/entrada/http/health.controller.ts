import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { Publico } from './decoradores-auth.js';

@ApiExcludeController()
@Controller('health')
export class HealthController {
  @Get('live')
  @Publico()
  liveness() {
    return { estado: 'disponible' };
  }

  @Get('ready')
  @Publico()
  readiness(@Res({ passthrough: true }) respuesta: Response) {
    respuesta.status(503);
    return {
      estado: 'no_disponible',
      motivo: 'adaptadores_de_persistencia_pendientes',
    };
  }
}
