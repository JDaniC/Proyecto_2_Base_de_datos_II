import { INSTITUCIONES_CANONICAS, type Institucion } from './institucion.js';

export type Rol = 'ADMIN_INSTITUCIONAL' | 'SECRETARIA' | 'MEDICO' | 'ODONTOLOGO' | 'PEDIATRA'
  | 'MEDICO_LABORATORIO' | 'ANALISTA_LABORATORIO' | 'VALIDADOR_LABORATORIO';
export type Permiso = 'pacientes.administrar' | 'historial.leer' | 'historial.archivar' | 'citas.administrar'
  | 'consultas.registrar' | 'diagnosticos.registrar' | 'tratamientos.registrar' | 'recetas.emitir'
  | 'usuarios.administrar' | 'auditoria.leer' | 'resultados.analizar' | 'resultados.validar'
  | 'informes.emitir' | 'cobros.administrar' | 'inventario.administrar' | 'ordenes.administrar'
  | 'muestras.administrar';

export type CapacidadInstitucional =
  | 'PACIENTES'
  | 'HISTORIAL_CLINICO'
  | 'CONSULTAS'
  | 'AGENDA'
  | 'LABORATORIO'
  | 'PEDIATRIA';

const INSTITUCIONES_POR_CAPACIDAD: Readonly<Record<CapacidadInstitucional, readonly Institucion[]>> = Object.freeze({
  PACIENTES: INSTITUCIONES_CANONICAS,
  HISTORIAL_CLINICO: INSTITUCIONES_CANONICAS,
  CONSULTAS: INSTITUCIONES_CANONICAS,
  AGENDA: ['HOSPITAL_GENERAL', 'CLINICA_ODONTOLOGICA', 'CENTRO_MEDICO_PEDIATRICO'],
  LABORATORIO: ['LABORATORIO_CLINICO'],
  PEDIATRIA: ['CENTRO_MEDICO_PEDIATRICO'],
});

export function institucionAdmiteCapacidad(
  institucion: Institucion,
  capacidad: CapacidadInstitucional,
): boolean {
  return INSTITUCIONES_POR_CAPACIDAD[capacidad].includes(institucion);
}
