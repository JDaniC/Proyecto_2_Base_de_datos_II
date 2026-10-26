import type { Institucion } from '../compartido/institucion.js';
import { ErrorDominio, solicitudInvalida } from '../compartido/error-dominio.js';
import type { UUID } from '../compartido/uuid.js';
import type { Version } from '../compartido/version.js';
import type { Permiso, Rol } from '../compartido/autorizacion.js';

export type EstadoHistorial = 'ACTIVO' | 'ARCHIVADO';
export type TipoOperacionHistorial = 'NUEVA_ATENCION' | 'FINALIZAR_PROCESO_EXISTENTE' | 'CORREGIR_HISTORICO';

const rolClinico: Readonly<Record<Institucion, Rol>> = Object.freeze({
  HOSPITAL_GENERAL: 'MEDICO',
  CLINICA_ODONTOLOGICA: 'ODONTOLOGO',
  LABORATORIO_CLINICO: 'MEDICO_LABORATORIO',
  CENTRO_MEDICO_PEDIATRICO: 'PEDIATRA',
});

export function validarPrescriptorClinico(
  contexto: {
    readonly institucion: Institucion;
    readonly roles: readonly Rol[];
    readonly profesionalVinculado?: { readonly id: UUID; readonly activo: boolean };
  },
  profesional: { readonly id: UUID; readonly activo: boolean },
): void {
  const rolRequerido = rolClinico[contexto.institucion];
  if (!profesional.activo || contexto.profesionalVinculado?.activo !== true ||
      contexto.profesionalVinculado.id !== profesional.id || !contexto.roles.includes(rolRequerido)) {
    throw new ErrorDominio('SIN_PERMISO', 'Se requiere un profesional activo autorizado en esta institución.');
  }
}

export function exigirCitaOdontologica(institucion: Institucion, citaId?: UUID): void {
  if (institucion === 'CLINICA_ODONTOLOGICA' && citaId === undefined) {
    throw solicitudInvalida('La atención odontológica requiere una cita.', 'cita_id');
  }
}

export function validarPermiso(
  contexto: { readonly permisos: readonly Permiso[] },
  permiso: Permiso,
): void {
  if (!contexto.permisos.includes(permiso)) {
    throw new ErrorDominio('SIN_PERMISO', 'La cuenta no tiene permiso para esta operación.');
  }
}

export function validarAutorizacionPediatrica(
  institucion: Institucion,
  vinculo: { readonly activo: boolean; readonly autorizaAtencion: boolean; readonly version: Version } | null,
): void {
  if (institucion !== 'CENTRO_MEDICO_PEDIATRICO') return;
  if (!vinculo?.activo || !vinculo.autorizaAtencion || !Number.isSafeInteger(vinculo.version) || vinculo.version < 1) {
    throw new ErrorDominio('SIN_PERMISO', 'Se requiere un vínculo pediátrico vigente con autorización de atención.');
  }
}

/** Principaliza responsables para el alta pediátrica; no otorga permiso de atención. */
export function validarResponsablePrincipalPediatrico(
  institucion: Institucion,
  responsables: readonly { readonly esPrincipal: boolean }[],
): void {
  if (institucion === 'CENTRO_MEDICO_PEDIATRICO' && !responsables.some((responsable) => responsable.esPrincipal)) {
    throw solicitudInvalida('El alta pediátrica requiere al menos un responsable principal.', 'responsables');
  }
}

export function validarOperacionHistorial(
  estado: EstadoHistorial,
  operacion: TipoOperacionHistorial,
): void {
  if (estado === 'ARCHIVADO' && operacion === 'NUEVA_ATENCION') {
    throw new ErrorDominio('ESTADO_INVALIDO', 'Un historial archivado no admite nuevas atenciones.');
  }
}

export function validarArchivoHistorial(
  estado: EstadoHistorial,
  permisoArchivar: boolean,
  causa: 'TRASLADO' | 'FALLECIMIENTO' | 'OTRA_ADMINISTRATIVA',
  motivo: string,
): void {
  if (!permisoArchivar) throw new ErrorDominio('SIN_PERMISO', 'Se requiere permiso para archivar el historial.');
  if (estado !== 'ACTIVO') throw new ErrorDominio('ESTADO_INVALIDO', 'Solo se puede archivar un historial activo.');
  if (!['TRASLADO', 'FALLECIMIENTO', 'OTRA_ADMINISTRATIVA'].includes(causa)) {
    throw solicitudInvalida('La causa de archivo no está admitida.', 'causa');
  }
  if (motivo.trim().length === 0) throw solicitudInvalida('El archivo requiere un motivo.', 'motivo');
  if ([...motivo].length > 2000) throw solicitudInvalida('El motivo excede el máximo de 2000 caracteres.', 'motivo');
}

export function validarReactivacionHistorial(
  estado: EstadoHistorial,
  institucion: Institucion,
  permisoArchivar: boolean,
  motivo: string,
  causaArchivo: 'TRASLADO' | 'FALLECIMIENTO' | 'OTRA_ADMINISTRATIVA',
  correccionFallecimiento = false,
): void {
  if (!permisoArchivar) throw new ErrorDominio('SIN_PERMISO', 'Se requiere permiso para reactivar el historial.');
  if (estado !== 'ARCHIVADO') throw new ErrorDominio('ESTADO_INVALIDO', 'Solo se puede reactivar un historial archivado.');
  if (institucion !== 'CENTRO_MEDICO_PEDIATRICO') {
    throw new ErrorDominio('SIN_PERMISO', 'La reactivación solo está disponible en pediatría.');
  }
  if (motivo.trim().length === 0) throw solicitudInvalida('La reactivación requiere un motivo.', 'motivo');
  if ([...motivo].length > 2000) throw solicitudInvalida('El motivo excede el máximo de 2000 caracteres.', 'motivo');
  if (causaArchivo === 'FALLECIMIENTO' && !correccionFallecimiento) {
    throw new ErrorDominio('ESTADO_INVALIDO', 'La reactivación por fallecimiento requiere una corrección justificada.');
  }
}
