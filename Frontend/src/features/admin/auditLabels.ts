export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREACION: 'Creación',
  MODIFICACION: 'Modificación',
  RECTIFICACION_CA10: 'Corrección clínica',
  ARCHIVADO_EXPEDIENTE: 'Expediente archivado',
  REACTIVACION_EXPEDIENTE: 'Expediente reactivado',
  CAMBIO_ESTADO_CUENTA: 'Cambio de cuenta',
  ASIGNACION_PERMISOS: 'Cambio de permisos',
  EMISION_RECETA: 'Receta emitida',
  ACCESO_CLINICO: 'Acceso clínico',
};

export const AUDIT_RESOURCE_LABELS: Record<string, string> = {
  PACIENTE: 'Paciente',
  EXPEDIENTE: 'Expediente',
  CONSULTA: 'Consulta',
  RECETA: 'Receta',
  USUARIO: 'Usuario',
  ROL: 'Rol',
  CATALOGO_MEDICO: 'Catálogo médico',
  PRUEBA_LAB: 'Prueba de laboratorio',
};

export const AUDIT_SEVERITY_LABELS: Record<string, string> = {
  INFO: 'Información',
  ADVERTENCIA: 'Advertencia',
  CRITICO: 'Crítica',
};
