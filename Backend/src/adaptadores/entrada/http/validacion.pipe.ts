import { ValidationPipe } from '@nestjs/common';
import { extraerCamposInvalidos, ErrorValidacionSolicitud } from './errores-validacion.js';

export function crearPipeValidacion(): ValidationPipe {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    exceptionFactory: (errores) =>
      new ErrorValidacionSolicitud(extraerCamposInvalidos(errores)),
  });
}
