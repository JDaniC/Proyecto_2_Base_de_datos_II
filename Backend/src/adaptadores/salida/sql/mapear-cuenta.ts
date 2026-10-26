import type { CuentaAutorizada, Permiso, Rol } from '../../../aplicacion/puertos/contexto-autenticado.js';
import { esInstitucion } from '../../../dominio/compartido/institucion.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../dominio/compartido/version.js';

export interface FilaCuentaSql extends Record<string, unknown> {
  readonly id_publico: unknown;
  readonly auth_uid: unknown;
  readonly institucion_id: unknown;
  readonly estado: unknown;
  readonly revision: unknown;
  readonly profesional_id: unknown;
  readonly profesional_activo: unknown;
}

export interface FilaRolSql extends Record<string, unknown> {
  readonly nombre: unknown;
  readonly permisos: unknown;
}

export function mapearCuentaSql(fila: FilaCuentaSql, filasRol: readonly FilaRolSql[]): CuentaAutorizada | null {
  if (typeof fila.id_publico !== 'string' || typeof fila.auth_uid !== 'string' ||
      typeof fila.institucion_id !== 'string' || !esInstitucion(fila.institucion_id) ||
      (fila.estado !== 'ACTIVO' && fila.estado !== 'INACTIVO' && fila.estado !== 'PENDIENTE')) return null;
  const estadoCuenta = fila.estado === 'ACTIVO' ? 'ACTIVA' : fila.estado === 'INACTIVO' ? 'INACTIVA' : 'PENDIENTE';
  const roles: Rol[] = [];
  const permisos = new Set<Permiso>();
  for (const rol of filasRol) {
    if (typeof rol.nombre !== 'string') return null;
    roles.push(rol.nombre as Rol);
    const valores = leerJsonLista(rol.permisos);
    if (valores === null) return null;
    for (const permiso of valores) permisos.add(permiso as Permiso);
  }
  const profesional = fila.profesional_id === null || fila.profesional_id === undefined
    ? undefined
    : { id: uuidPublico(fila.profesional_id), activo: booleano(fila.profesional_activo) };
  return Object.freeze({
    id: uuidPublico(fila.id_publico),
    uid: fila.auth_uid,
    institucion: fila.institucion_id,
    estado: estadoCuenta,
    roles: Object.freeze(roles),
    permisos: Object.freeze([...permisos]),
    version: versionPositiva(numero(fila.revision)),
    ...(profesional === undefined ? {} : { profesional: Object.freeze(profesional) }),
  });
}

function leerJsonLista(valor: unknown): readonly string[] | null {
  let lista: unknown = valor;
  if (typeof lista === 'string') {
    try { lista = JSON.parse(lista) as unknown; } catch { return null; }
  }
  return Array.isArray(lista) && lista.every((item): item is string => typeof item === 'string') ? lista : null;
}

function booleano(valor: unknown): boolean {
  return valor === true || valor === 1 || valor === '1' || valor === 'ACTIVO';
}

function numero(valor: unknown): number {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && /^\d+$/.test(valor)) return Number(valor);
  return Number.NaN;
}
