import type { CuentaAutorizada, Permiso, Rol } from '../../../aplicacion/puertos/contexto-autenticado.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../dominio/compartido/version.js';

export interface DocumentoUsuarioMongo {
  readonly _id: string;
  readonly auth_uid: unknown;
  readonly institucion_id: unknown;
  readonly estado: unknown;
  readonly activo: unknown;
  readonly rol_ids: readonly unknown[];
  readonly revision: unknown;
  readonly personal_id?: string;
  readonly solicitante_medico_id?: unknown;
  readonly nombre_usuario?: unknown;
}

export interface DocumentoRolMongo {
  readonly _id: string;
  readonly nombre: unknown;
  readonly permisos: readonly unknown[];
}

export interface DocumentoPersonalMongo {
  readonly _id: string;
  readonly activo: unknown;
  readonly cargo?: unknown;
}

export function mapearCuentaMongodb(
  usuario: DocumentoUsuarioMongo,
  roles: readonly DocumentoRolMongo[],
  personal?: DocumentoPersonalMongo | null,
): CuentaAutorizada | null {
  if (
    typeof usuario._id !== 'string' ||
    typeof usuario.auth_uid !== 'string' ||
    usuario.institucion_id !== 'LABORATORIO_CLINICO' ||
    (usuario.estado !== 'ACTIVO' && usuario.estado !== 'INACTIVO' && usuario.estado !== 'PENDIENTE')
  ) {
    return null;
  }

  const estado = usuario.estado === 'ACTIVO' ? 'ACTIVA' : usuario.estado === 'INACTIVO' ? 'INACTIVA' : 'PENDIENTE';
  const rolesMapeados: Rol[] = [];
  const permisos = new Set<Permiso>();

  for (const rol of roles) {
    if (typeof rol.nombre === 'string') {
      rolesMapeados.push(rol.nombre as Rol);
    }
    if (Array.isArray(rol.permisos)) {
      for (const p of rol.permisos) {
        if (typeof p === 'string') permisos.add(p as Permiso);
      }
    }
  }

  const profesional = typeof usuario.personal_id === 'string'
    ? {
        id: uuidPublico(usuario.personal_id),
        activo: personal?.activo === true,
      }
    : undefined;

  const revNumero = typeof usuario.revision === 'number'
    ? usuario.revision
    : Number(usuario.revision);

  return Object.freeze({
    id: uuidPublico(usuario._id),
    uid: usuario.auth_uid,
    institucion: 'LABORATORIO_CLINICO',
    estado,
    roles: Object.freeze(rolesMapeados),
    permisos: Object.freeze([...permisos]),
    version: versionPositiva(revNumero),
    ...(profesional === undefined ? {} : { profesional: Object.freeze(profesional) }),
  });
}
