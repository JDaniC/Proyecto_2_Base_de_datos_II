import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { map } from 'rxjs';

@Injectable()
export class RespuestaInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, siguiente: CallHandler) {
    const respuesta = context.switchToHttp().getResponse<Response>();
    const locales = respuesta.locals as { correlacion?: string };
    const correlacion = locales.correlacion ?? randomUUID();
    respuesta.setHeader('X-Correlation-ID', correlacion);

    return siguiente.handle().pipe(
      map((resultado: unknown) => {
        if (
          resultado !== null &&
          typeof resultado === 'object' &&
          'data' in resultado &&
          'meta' in resultado
        ) {
          const r = resultado as { data: unknown; meta: Record<string, unknown> };
          const correlacionEfectiva = typeof r.meta?.correlacion === 'string'
            ? r.meta.correlacion
            : correlacion;
          respuesta.setHeader('X-Correlation-ID', correlacionEfectiva);
          return {
            data: r.data,
            meta: {
              ...r.meta,
              correlacion: correlacionEfectiva,
            },
          };
        }
        return { data: resultado, meta: { correlacion } };
      }),
    );
  }
}
