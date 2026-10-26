import type { NextFunction, Request, Response } from 'express';
import { responderErrorHttp } from './filtro-errores.js';

interface ErrorParser {
  readonly type?: unknown;
}

export function middlewareErroresParser(
  error: unknown,
  _solicitud: Request,
  respuesta: Response,
  siguiente: NextFunction,
): void {
  if (respuesta.headersSent) {
    siguiente(error);
    return;
  }

  const tipo =
    typeof error === 'object' && error !== null && 'type' in error
      ? (error as ErrorParser).type
      : undefined;

  if (tipo === 'entity.too.large') {
    responderErrorHttp(
      respuesta,
      413,
      'LIMITE_AGREGADO',
      'La solicitud supera el límite permitido.',
    );
    return;
  }

  responderErrorHttp(
    respuesta,
    400,
    'SOLICITUD_INVALIDA',
    tipo === 'entity.parse.failed'
      ? 'El cuerpo JSON no es válido.'
      : 'No se pudo procesar el cuerpo de la solicitud.',
  );
}
