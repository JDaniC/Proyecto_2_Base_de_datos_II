import { InstitucionId, InstitucionIdCanonica, ModoServiciosFrontend } from '../services/types';

export const CANONICAL_PEDIATRIC_INSTITUTION_ID: InstitucionIdCanonica = 'CENTRO_MEDICO_PEDIATRICO';
export const UI_PEDIATRIC_INSTITUTION_ALIAS: InstitucionId = 'CENTRO_PEDIATRICO';

/**
 * Convierte el identificador de institución de la UI al valor canónico de servidor/persistencia (DEC06).
 * Rechaza alias libres o valores no reconocidos.
 */
export function toCanonicalInstitutionId(
  institution: InstitucionId | InstitucionIdCanonica
): InstitucionIdCanonica {
  switch (institution) {
    case 'HOSPITAL_GENERAL':
    case 'CLINICA_ODONTOLOGICA':
    case 'LABORATORIO_CLINICO':
    case 'CENTRO_MEDICO_PEDIATRICO':
      return institution;
    case 'CENTRO_PEDIATRICO':
      return CANONICAL_PEDIATRIC_INSTITUTION_ID;
    default:
      throw new Error(`Institución no reconocida para mapeo canónico: ${String(institution)}`);
  }
}

/**
 * Convierte el identificador canónico del servidor al alias usado por la capa de presentación React (DEC06).
 */
export function fromCanonicalInstitutionId(
  institution: InstitucionIdCanonica | InstitucionId
): InstitucionId {
  switch (institution) {
    case 'HOSPITAL_GENERAL':
    case 'CLINICA_ODONTOLOGICA':
    case 'LABORATORIO_CLINICO':
    case 'CENTRO_PEDIATRICO':
      return institution;
    case 'CENTRO_MEDICO_PEDIATRICO':
      return UI_PEDIATRIC_INSTITUTION_ALIAS;
    default:
      throw new Error(`Institución canónica no reconocida: ${String(institution)}`);
  }
}

/**
 * Resuelve el modo de servicios ('mock' | 'api') de forma explícita.
 * En modo 'api' se prohíbe el fallback silencioso a simuladores (plan/02 §7, E00-P2-02).
 */
export function resolveServiceMode(
  explicitMode?: ModoServiciosFrontend,
  envMode: string | undefined = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SERVICE_MODE : undefined
): ModoServiciosFrontend {
  if (explicitMode === 'api' || explicitMode === 'mock') {
    return explicitMode;
  }
  if (envMode?.trim().toLowerCase() === 'api') {
    return 'api';
  }
  return 'mock';
}

/**
 * Contratos presentes en contracts.ts que quedan excluidos del alcance HTTP/OpenAPI
 * por corresponder a pantallas retiradas, helpers demo o acciones prohibidas desde cliente (DEC11).
 */
export const EXCLUDED_CONTRACT_METHODS = [
  'AuthRepository.obtenerCuentasDemo',
  'DashboardRepository.obtenerDashboard',
  'UserRepository.obtenerRolesInstitucionales',
  'UserRepository.obtenerCatalogoPermisos',
  'UserRepository.actualizarPermisosRol',
  'CatalogRepository.crearMedico',
  'CatalogRepository.cambiarEstadoMedico',
  'CatalogRepository.crearProcedimientoOdontologico',
  'AuditRepository.registrarEvento',
  'HospitalizationRepository.cambiarEstadoCama'
] as const;

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
