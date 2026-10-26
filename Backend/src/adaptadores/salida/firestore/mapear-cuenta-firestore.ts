import type { CuentaAutorizada, Permiso, Rol } from '../../../aplicacion/puertos/contexto-autenticado.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../dominio/compartido/version.js';

export interface DocumentoUsuarioFirestore {
  readonly auth_uid: unknown;
  readonly proveedor_identidad: unknown;
  readonly institucion_id: unknown;
  readonly estado: unknown;
  readonly rol_ids: readonly unknown[];
  readonly revision: unknown;
  readonly pediatra_id?: unknown;
  readonly nombre_usuario?: unknown;
}

export interface DocumentoRolFirestore {
  readonly nombre: unknown;
  readonly permisos: readonly unknown[];
}

export interface DocumentoPediatraFirestore {
  readonly estado: unknown;
}

const PERMISOS_APLICACION: readonly Permiso[] = [
  'pacientes.administrar', 'historial.leer', 'historial.archivar', 'citas.administrar',
  'consultas.registrar', 'diagnosticos.registrar', 'tratamientos.registrar', 'recetas.emitir',
  'usuarios.administrar', 'auditoria.leer', 'resultados.analizar', 'resultados.validar',
  'informes.emitir', 'cobros.administrar', 'inventario.administrar', 'ordenes.administrar',
  'muestras.administrar',
];

export function mapearCuentaFirestore(
  usuarioId: string,
  usuario: DocumentoUsuarioFirestore,
  roles: readonly DocumentoRolFirestore[],
  pediatra?: DocumentoPediatraFirestore | null,
): CuentaAutorizada | null {
  if (
    typeof usuario.auth_uid !== 'string' ||
    usuario.proveedor_identidad !== 'FIREBASE' ||
    usuario.institucion_id !== 'CENTRO_MEDICO_PEDIATRICO' ||
    (usuario.estado !== 'ACTIVO' && usuario.estado !== 'INACTIVO' && usuario.estado !== 'PENDIENTE')
  ) {
    return null;
  }

  const estado = usuario.estado === 'ACTIVO' ? 'ACTIVA' : usuario.estado === 'INACTIVO' ? 'INACTIVA' : 'PENDIENTE';
  const rolesMapeados: Rol[] = [];
  const permisos = new Set<Permiso>();

  for (const rol of roles) {
    if (typeof rol.nombre === 'string') {
      // Compatibilidad con el nombre que ya siembra el inicializador pediátrico.
      rolesMapeados.push(rol.nombre === 'ADMINISTRADOR_INSTITUCIONAL'
        ? 'ADMIN_INSTITUCIONAL'
        : rol.nombre as Rol);
    }
    if (Array.isArray(rol.permisos)) {
      for (const p of rol.permisos) {
        // Permisos aún no reconocidos por el contrato de aplicación no conceden autoridad.
        if (typeof p === 'string' && PERMISOS_APLICACION.includes(p as Permiso)) {
          permisos.add(p as Permiso);
        }
      }
    }
  }

  const profesional = typeof usuario.pediatra_id === 'string'
    ? {
        id: uuidPublico(usuario.pediatra_id),
        activo: pediatra?.estado === 'ACTIVO',
      }
    : undefined;

  const revNumero = typeof usuario.revision === 'number'
    ? usuario.revision
    : Number(usuario.revision);

  return Object.freeze({
    id: uuidPublico(usuarioId),
    uid: usuario.auth_uid,
    institucion: 'CENTRO_MEDICO_PEDIATRICO',
    estado,
    roles: Object.freeze(rolesMapeados),
    permisos: Object.freeze([...permisos]),
    version: versionPositiva(revNumero),
    ...(profesional === undefined ? {} : { profesional: Object.freeze(profesional) }),
  });
}
