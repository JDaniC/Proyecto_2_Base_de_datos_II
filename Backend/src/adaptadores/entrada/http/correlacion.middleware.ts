import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

export function middlewareCorrelacion(
  solicitud: Request,
  respuesta: Response,
  siguiente: NextFunction,
): void {
  const solicitada = solicitud.get('x-correlation-id')?.trim();
  const correlacion = solicitada && UUID.test(solicitada)
    ? solicitada.toLowerCase()
    : randomUUID();

  respuesta.locals.correlacion = correlacion;
  respuesta.setHeader('X-Correlation-ID', correlacion);
  siguiente();
}
