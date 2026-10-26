import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { institucionAdmiteCapacidad } from '../../../dominio/compartido/autorizacion.js';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import { METADATA_ACCESO, type PoliticaAcceso, type RequestAutenticada } from './decoradores-auth.js';

@Injectable()
export class GuardiaAutorizacion implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const politica = this.reflector.getAllAndOverride<PoliticaAcceso>(METADATA_ACCESO, [
      contexto.getHandler(), contexto.getClass(),
    ]);
    if (!politica) {
      throw new ErrorDominio('SIN_PERMISO', 'La ruta no declara una política de acceso.');
    }
    if (politica.tipo === 'PUBLICO') return true;

    const solicitud = contexto.switchToHttp().getRequest<RequestAutenticada>();
    const autenticado = solicitud.contextoAutenticado;
    if (!autenticado) {
      throw new ErrorDominio('NO_AUTENTICADO', 'Se requiere una identidad verificada.');
    }

    const institucion = autenticado.identidad.institucion;
    if (politica.instituciones && !politica.instituciones.includes(institucion)) {
      throw new ErrorDominio('SIN_PERMISO', 'La ruta no está disponible en esta institución.');
    }
    if (politica.tipo === 'AUTENTICADO') return true;

    if (politica.permisos.length === 0) {
      throw new ErrorDominio('SIN_PERMISO', 'La ruta requiere al menos un permiso declarado.');
    }
    if (politica.capacidad && !institucionAdmiteCapacidad(institucion, politica.capacidad)) {
      throw new ErrorDominio('SIN_PERMISO', 'La capacidad no está disponible en esta institución.');
    }

    const permisos = autenticado.cuenta.permisos;
    const autorizado = politica.modo === 'TODOS'
      ? politica.permisos.every((permiso) => permisos.includes(permiso))
      : politica.permisos.some((permiso) => permisos.includes(permiso));
    if (!autorizado) {
      throw new ErrorDominio('SIN_PERMISO', 'La cuenta no tiene permiso para esta operación.');
    }
    return true;
  }
}
