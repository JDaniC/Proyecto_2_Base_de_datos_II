import type { FuenteHistorial, LimiteHistorial } from '../casos-uso/historiales/mezclar-eventos.js';
import type { Institucion } from '../../dominio/compartido/institucion.js';
export const TIPOS_EVENTO = ['CONSULTA', 'DIAGNOSTICO', 'TRATAMIENTO', 'RECETA', 'ARCHIVO', 'REACTIVACION',
  'HOSPITALIZACION', 'EXAMEN', 'ORDEN_LAB', 'RESULTADO_LAB', 'INFORME_LAB', 'VACUNA', 'CRECIMIENTO'] as const;
export type TipoEventoHistorial = typeof TIPOS_EVENTO[number];
export interface EventoHistorial {
  readonly id: string;
  readonly fechaHora: string;
  readonly tipo: TipoEventoHistorial;
  readonly recursoId: string;
  readonly titulo: string;
  readonly consultaId?: string;
  readonly versionConsulta?: number;
  readonly profesional?: { readonly id: string; readonly nombre: string; readonly rol: string; readonly activo: true };
}
export interface FiltrosHistorial {
  readonly limite?: number;
  readonly orden?: 'ASC' | 'DESC';
  readonly desde?: string;
  readonly hasta?: string;
  readonly tipo?: TipoEventoHistorial;
  readonly cursor?: string;
}
export interface RepositorioHistorialLectura {
  /** Verifica manifiesto/migración. Nunca sustituye una dependencia caída por una lista vacía. */
  verificarPreparacion(): Promise<void>;
  readonly fuentes: readonly { readonly tipo: TipoEventoHistorial; readonly fuente: FuenteHistorial<EventoHistorial> }[];
}
export interface CodecCursorHistorial {
  codificar(ambito: string, ultima: LimiteHistorial): string;
  decodificar(cursor: string, ambito: string): LimiteHistorial;
}
export function tiposInstitucion(institucion: Institucion): readonly TipoEventoHistorial[] {
  const comunes: TipoEventoHistorial[] = ['CONSULTA', 'DIAGNOSTICO', 'TRATAMIENTO', 'RECETA', 'ARCHIVO'];
  if (institucion === 'HOSPITAL_GENERAL') return [...comunes, 'HOSPITALIZACION', 'EXAMEN'];
  if (institucion === 'LABORATORIO_CLINICO') return [...comunes, 'ORDEN_LAB', 'RESULTADO_LAB', 'INFORME_LAB'];
  if (institucion === 'CENTRO_MEDICO_PEDIATRICO') return [...comunes, 'REACTIVACION', 'VACUNA', 'CRECIMIENTO'];
  return comunes;
}
