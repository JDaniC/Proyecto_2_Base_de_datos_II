import { randomUUID } from 'node:crypto';
import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { EstablecerSesion } from '../../../aplicacion/casos-uso/cuentas/establecer-sesion.js';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { METADATA_ACCESO, type PoliticaAcceso, type RequestAutenticada } from './decoradores-auth.js';

@Injectable()
export class GuardiaAutenticacion implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly establecerSesion: EstablecerSesion,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const politica = this.reflector.getAllAndOverride<PoliticaAcceso>(METADATA_ACCESO, [
      contexto.getHandler(), contexto.getClass(),
    ]);
    if (!politica) {
      throw new ErrorDominio('SIN_PERMISO', 'La ruta no declara una política de acceso.');
    }
    if (politica.tipo === 'PUBLICO') return true;

    const http = contexto.switchToHttp();
    const solicitud = http.getRequest<RequestAutenticada>();
    const token = extraerBearer(solicitud.headers.authorization);
    if (token === null) {
      throw new ErrorDominio('NO_AUTENTICADO', 'Se requiere un token Bearer válido.');
    }

    const respuesta = http.getResponse<Response>();
    const correlacionCruda = (respuesta.locals as { correlacion?: unknown }).correlacion;
    const correlacion = typeof correlacionCruda === 'string'
      ? uuidPublico(correlacionCruda, 'correlacion')
      : uuidPublico(randomUUID(), 'correlacion');
    const resultado = await this.establecerSesion.ejecutar({ token, correlacion });
    solicitud.contextoAutenticado = resultado.contexto;
    solicitud.bundleInstitucional = resultado.bundle;
    solicitud.sesionAutenticada = resultado.sesion;
    return true;
  }
}

function extraerBearer(cabecera: string | string[] | undefined): string | null {
  if (typeof cabecera !== 'string') return null;
  const coincidencia = /^Bearer ([^\s,]+)$/i.exec(cabecera);
  return coincidencia?.[1] ?? null;
}
