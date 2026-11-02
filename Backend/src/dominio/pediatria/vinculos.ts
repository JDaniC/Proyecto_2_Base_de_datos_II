import { ErrorDominio, solicitudInvalida } from '../compartido/error-dominio.js';
import { uuidPublico } from '../compartido/uuid.js';

export interface VinculoPediatrico {
  readonly responsableId: string;
  readonly estado: 'ACTIVO' | 'INACTIVO';
  readonly esPrincipal: boolean;
  readonly autorizaAtencion: boolean;
}

/** Validar el conjunto final dentro de la UoW, nunca solo el vínculo editado. */
export function validarPrincipalidad(vinculos: readonly VinculoPediatrico[]): void {
  if (vinculos.length > 100) throw solicitudInvalida('El paciente excede el límite de vínculos.');
  const ids = vinculos.map(v => uuidPublico(v.responsableId));
  if (new Set(ids).size !== ids.length) throw solicitudInvalida('Responsable duplicado.');
  if (!vinculos.some(v => v.estado === 'ACTIVO' && v.esPrincipal)) {
    throw new ErrorDominio('ESTADO_INVALIDO', 'El menor debe conservar un responsable principal activo.');
  }
  // Principalidad no concede autorización: son decisiones independientes.
}
