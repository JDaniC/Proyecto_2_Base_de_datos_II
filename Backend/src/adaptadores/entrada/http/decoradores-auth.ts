import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type { ContextoAutenticado } from '../../../aplicacion/puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../../aplicacion/puertos/bundle-institucional.js';
import type { SesionDto } from '../../../aplicacion/casos-uso/cuentas/dtos-sesion.js';
import type { CapacidadInstitucional, Permiso } from '../../../dominio/compartido/autorizacion.js';
import type { Institucion } from '../../../dominio/compartido/institucion.js';

export const METADATA_ACCESO = 'POLITICA_ACCESO';

export type PoliticaAcceso =
  | { readonly tipo: 'PUBLICO' }
  | { readonly tipo: 'AUTENTICADO'; readonly instituciones?: readonly Institucion[] }
  | {
      readonly tipo: 'PERMISO';
      readonly permisos: readonly Permiso[];
      readonly modo: 'TODOS' | 'ALGUNO';
      readonly capacidad?: CapacidadInstitucional;
      readonly instituciones?: readonly Institucion[];
    };

export const Publico = () => SetMetadata(METADATA_ACCESO, { tipo: 'PUBLICO' } satisfies PoliticaAcceso);

export const SoloAutenticado = (instituciones?: readonly Institucion[]) =>
  SetMetadata(METADATA_ACCESO, {
    tipo: 'AUTENTICADO',
    ...(instituciones === undefined ? {} : { instituciones: Object.freeze([...instituciones]) }),
  } satisfies PoliticaAcceso);

export const PermisosRequeridos = (
  ...permisos: readonly Permiso[]
) => RequiereAcceso({ permisos, modo: 'TODOS' });

export function RequiereAcceso(opciones: {
  readonly permisos: readonly Permiso[];
  readonly modo?: 'TODOS' | 'ALGUNO';
  readonly capacidad?: CapacidadInstitucional;
  readonly instituciones?: readonly Institucion[];
}) {
  return SetMetadata(METADATA_ACCESO, {
    tipo: 'PERMISO',
    permisos: Object.freeze([...opciones.permisos]),
    modo: opciones.modo ?? 'TODOS',
    ...(opciones.capacidad === undefined ? {} : { capacidad: opciones.capacidad }),
    ...(opciones.instituciones === undefined ? {} : { instituciones: Object.freeze([...opciones.instituciones]) }),
  } satisfies PoliticaAcceso);
}

export interface RequestAutenticada extends Request {
  contextoAutenticado?: ContextoAutenticado;
  bundleInstitucional?: BundleInstitucional;
  sesionAutenticada?: SesionDto;
}

export const Contexto = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ContextoAutenticado => {
    const request = ctx.switchToHttp().getRequest<RequestAutenticada>();
    return request.contextoAutenticado as ContextoAutenticado;
  },
);

export const Bundle = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): BundleInstitucional => {
    const request = ctx.switchToHttp().getRequest<RequestAutenticada>();
    return request.bundleInstitucional as BundleInstitucional;
  },
);
