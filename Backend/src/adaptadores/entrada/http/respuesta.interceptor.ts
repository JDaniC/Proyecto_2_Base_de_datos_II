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
      map((data: unknown) => ({ data, meta: { correlacion } })),
    );
  }
}
