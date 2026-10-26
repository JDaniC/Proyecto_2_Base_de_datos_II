import type { Institucion } from '../../dominio/compartido/institucion.js';
import type { Permiso, Rol } from '../../dominio/compartido/autorizacion.js';
import { esInstitucion } from '../../dominio/compartido/institucion.js';
import { ErrorDominio } from '../../dominio/compartido/error-dominio.js';
import { uuidPublico, type UUID } from '../../dominio/compartido/uuid.js';
import { versionPositiva, type Version } from '../../dominio/compartido/version.js';
import { instanteUtc, type InstanteUTC } from '../../dominio/compartido/instante-utc.js';

export type { Permiso, Rol } from '../../dominio/compartido/autorizacion.js';

export interface IdentidadVerificada {
  readonly uid: string;
  readonly institucion: Institucion;
  readonly emitidoEn: InstanteUTC;
}

export interface CuentaAutorizada {
  readonly id: UUID;
  readonly uid: string;
  readonly institucion: Institucion;
  readonly estado: 'PENDIENTE' | 'ACTIVA' | 'INACTIVA';
  readonly roles: readonly Rol[];
  readonly permisos: readonly Permiso[];
  readonly version: Version;
  readonly profesional?: { readonly id: UUID; readonly activo: boolean };
}

const contextoMarca: unique symbol = Symbol('ContextoAutenticado');
/** Lo construye el adaptador de identidad tras verificar token y cuenta local vigentes. */
export interface ContextoAutenticado {
  readonly identidad: IdentidadVerificada;
  readonly cuenta: CuentaAutorizada;
  readonly correlacion: UUID;
  readonly [contextoMarca]: true;
}

export function crearContextoAutenticado(
  identidad: IdentidadVerificada,
  cuenta: CuentaAutorizada,
  correlacion: UUID,
): ContextoAutenticado {
  if (identidad.uid.trim().length === 0 || identidad.uid !== cuenta.uid ||
      !esInstitucion(identidad.institucion) || !esInstitucion(cuenta.institucion) ||
      identidad.institucion !== cuenta.institucion) {
    throw new ErrorDominio('SIN_PERMISO', 'La identidad verificada no corresponde a la cuenta institucional.');
  }
  if (cuenta.estado !== 'ACTIVA') throw new ErrorDominio('SIN_PERMISO', 'La cuenta no está activa.');
  const rolesValidos: readonly Rol[] = ['ADMIN_INSTITUCIONAL', 'SECRETARIA', 'MEDICO', 'ODONTOLOGO', 'PEDIATRA', 'MEDICO_LABORATORIO', 'ANALISTA_LABORATORIO', 'VALIDADOR_LABORATORIO'];
  const permisosValidos: readonly Permiso[] = ['pacientes.administrar', 'historial.leer', 'historial.archivar', 'citas.administrar', 'consultas.registrar', 'diagnosticos.registrar', 'tratamientos.registrar', 'recetas.emitir', 'usuarios.administrar', 'auditoria.leer', 'resultados.analizar', 'resultados.validar', 'informes.emitir', 'cobros.administrar', 'inventario.administrar', 'ordenes.administrar', 'muestras.administrar'];
  if (!Array.isArray(cuenta.roles) || !cuenta.roles.every((rol) => rolesValidos.includes(rol)) ||
      !Array.isArray(cuenta.permisos) || !cuenta.permisos.every((permiso) => permisosValidos.includes(permiso))) {
    throw new ErrorDominio('SIN_PERMISO', 'La cuenta contiene roles o permisos no reconocidos.');
  }
  const identidadSegura = Object.freeze({
    uid: identidad.uid,
    institucion: identidad.institucion,
    emitidoEn: instanteUtc(identidad.emitidoEn),
  });
  const cuentaSegura = Object.freeze({
    ...cuenta,
    id: uuidPublico(cuenta.id, 'cuenta_id'),
    version: versionPositiva(cuenta.version, 'version'),
    roles: Object.freeze([...new Set(cuenta.roles)]),
    permisos: Object.freeze([...new Set(cuenta.permisos)]),
    ...(cuenta.profesional === undefined ? {} : { profesional: Object.freeze({
      ...cuenta.profesional,
      id: uuidPublico(cuenta.profesional.id, 'profesional_id'),
    }) }),
  });
  return Object.freeze({
    identidad: identidadSegura,
    cuenta: cuentaSegura,
    correlacion: uuidPublico(correlacion, 'correlacion'),
    [contextoMarca]: true as const,
  });
}
