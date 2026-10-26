import type { UUID } from '../../../dominio/compartido/uuid.js';
import type { Institucion } from '../../../dominio/compartido/institucion.js';
import type { Rol, Permiso } from '../../../dominio/compartido/autorizacion.js';
import type { Version } from '../../../dominio/compartido/version.js';
import type { ContextoAutenticado } from '../../puertos/contexto-autenticado.js';

export interface SesionDto {
  readonly cuenta_id: UUID;
  readonly institucion: Institucion;
  readonly roles: readonly Rol[];
  readonly permisos: readonly Permiso[];
  readonly version: Version;
}

export interface CierreSesionDto {
  readonly cerrada: true;
}

export function crearSesionDto(contexto: ContextoAutenticado): SesionDto {
  return Object.freeze({
    cuenta_id: contexto.cuenta.id,
    institucion: contexto.cuenta.institucion,
    roles: contexto.cuenta.roles,
    permisos: contexto.cuenta.permisos,
    version: contexto.cuenta.version,
  });
}
