import {
  Catch,
  HttpException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import {
  ErrorValidacionSolicitud,
  type CampoInvalido,
} from './errores-validacion.js';
import { ErrorDominio, type CodigoErrorDominio } from '../../../dominio/compartido/error-dominio.js';

export type CodigoError = CodigoErrorDominio | 'NO_AUTENTICADO' | 'ERROR_INTERNO';

interface RespuestaError {
  readonly error: {
    readonly codigo: CodigoError;
    readonly mensaje: string;
    readonly campos?: readonly CampoInvalido[];
  };
  readonly meta: { readonly correlacion: string };
}

const ERRORES_HTTP: Readonly<
  Record<number, { readonly codigo: CodigoError; readonly mensaje: string }>
> = {
  400: { codigo: 'SOLICITUD_INVALIDA', mensaje: 'La solicitud no es válida.' },
  401: { codigo: 'NO_AUTENTICADO', mensaje: 'Se requiere autenticación.' },
  403: { codigo: 'SIN_PERMISO', mensaje: 'La operación no está permitida.' },
  404: { codigo: 'RECURSO_NO_ENCONTRADO', mensaje: 'No se encontró el recurso.' },
  409: { codigo: 'ESTADO_INVALIDO', mensaje: 'El estado no permite la operación.' },
  413: { codigo: 'LIMITE_AGREGADO', mensaje: 'La solicitud supera el límite permitido.' },
  503: {
    codigo: 'PERSISTENCIA_NO_DISPONIBLE',
    mensaje: 'El servicio requerido no está disponible.',
  },
};

export function responderErrorHttp(
  respuesta: Response,
  status: number,
  codigo: CodigoError,
  mensaje: string,
  campos?: readonly CampoInvalido[],
): void {
  const locales = respuesta.locals as { correlacion?: unknown };
  const correlacion = typeof locales.correlacion === 'string'
    ? locales.correlacion
    : randomUUID();
  respuesta.setHeader('X-Correlation-ID', correlacion);
  respuesta.status(status).json({
    error: {
      codigo,
      mensaje,
      ...(campos === undefined ? {} : { campos }),
    },
    meta: { correlacion },
  } satisfies RespuestaError);
}

@Catch()
export class FiltroErroresHttp implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const respuesta = context.getResponse<Response>();

    if (error instanceof ErrorValidacionSolicitud) {
      responderErrorHttp(
        respuesta,
        400,
        'SOLICITUD_INVALIDA',
        'La solicitud no cumple el contrato.',
        error.campos,
      );
      return;
    }

    if (error instanceof ErrorDominio) {
      const status = estadoHttpDominio(error.codigo);
      const definido = ERRORES_HTTP[status] ?? ERRORES_HTTP[409]!;
      responderErrorHttp(respuesta, status, error.codigo, definido.mensaje);
      return;
    }

    if (error instanceof HttpException) {
      const definido = ERRORES_HTTP[error.getStatus()];
      if (definido) {
        responderErrorHttp(
          respuesta,
          error.getStatus(),
          definido.codigo,
          definido.mensaje,
        );
        return;
      }
    }

    responderErrorHttp(
      respuesta,
      500,
      'ERROR_INTERNO',
      'Ocurrió un error interno.',
    );
  }
}

function estadoHttpDominio(codigo: CodigoErrorDominio): number {
  switch (codigo) {
    case 'SOLICITUD_INVALIDA': return 400;
    case 'NO_AUTENTICADO': return 401;
    case 'SIN_PERMISO':
    case 'CUENTA_NO_HABILITADA': return 403;
    case 'RECURSO_NO_ENCONTRADO': return 404;
    case 'LIMITE_AGREGADO': return 413;
    case 'PERSISTENCIA_NO_DISPONIBLE':
    case 'IDENTIDAD_NO_DISPONIBLE': return 503;
    default: return 409;
  }
}
