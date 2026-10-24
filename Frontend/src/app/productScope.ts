import { InstitucionId } from '../services/types';

export function isRouteInInstitution(path: string, institution: InstitucionId): boolean {
  if (path.startsWith('/hospital/')) return institution === 'HOSPITAL_GENERAL';
  if (path.startsWith('/laboratorio/')) return institution === 'LABORATORIO_CLINICO';
  if (path === '/agenda') return institution !== 'LABORATORIO_CLINICO';
  if (path === '/administracion/usuarios') return institution === 'LABORATORIO_CLINICO';
  if (path === '/administracion/catalogos') return institution === 'LABORATORIO_CLINICO' || institution === 'CENTRO_PEDIATRICO';
  if (path === '/administracion/auditoria') return institution === 'CENTRO_PEDIATRICO' || institution === 'LABORATORIO_CLINICO';
  return true;
}

export function patientTabs(institution: InstitucionId): string[] {
  return ['GENERAL', ...(institution === 'CENTRO_PEDIATRICO' ? ['RESPONSABLES', 'CRECIMIENTO', 'ANTECEDENTES', 'VACUNACION'] : []),
    'CONSULTAS', 'DIAGNOSTICOS', 'RECETAS',
    ...(institution === 'HOSPITAL_GENERAL' ? ['SEGUROS', 'EXAMENES', 'PROCEDIMIENTOS'] : []), 'TIMELINE'];
}
