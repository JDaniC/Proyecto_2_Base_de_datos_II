export const INSTITUCIONES_CANONICAS = Object.freeze([
  'HOSPITAL_GENERAL',
  'CLINICA_ODONTOLOGICA',
  'LABORATORIO_CLINICO',
  'CENTRO_MEDICO_PEDIATRICO',
] as const);

export type Institucion = (typeof INSTITUCIONES_CANONICAS)[number];

export function esInstitucion(valor: string): valor is Institucion {
  return (INSTITUCIONES_CANONICAS as readonly string[]).includes(valor);
}
