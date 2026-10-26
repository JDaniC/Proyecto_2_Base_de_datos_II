import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { exigirCitaOdontologica, validarArchivoHistorial, validarAutorizacionPediatrica, validarOperacionHistorial, validarPermiso, validarPrescriptorClinico, validarReactivacionHistorial, validarResponsablePrincipalPediatrico } from '../../src/dominio/clinica/politicas-institucionales.js';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';
import type { Institucion } from '../../src/dominio/compartido/institucion.js';
import type { Rol } from '../../src/dominio/compartido/autorizacion.js';
import { uuidPublico } from '../../src/dominio/compartido/uuid.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';

const profesionalId = uuidPublico('550e8400-e29b-41d4-a716-446655440000');

function error(codigo: string, accion: () => void): void {
  assert.throws(accion, (resultado: unknown) => resultado instanceof ErrorDominio && resultado.codigo === codigo);
}

describe('políticas clínicas por institución', () => {
  it('exige rol clínico institucional y vínculo de profesional activo para prescribir', () => {
    const casos: readonly [Institucion, Rol][] = [
      ['HOSPITAL_GENERAL', 'MEDICO'],
      ['CLINICA_ODONTOLOGICA', 'ODONTOLOGO'],
      ['LABORATORIO_CLINICO', 'MEDICO_LABORATORIO'],
      ['CENTRO_MEDICO_PEDIATRICO', 'PEDIATRA'],
    ];
    for (const [institucion, rol] of casos) {
      validarPrescriptorClinico({ institucion, roles: [rol], profesionalVinculado: { id: profesionalId, activo: true } }, { id: profesionalId, activo: true });
      error('SIN_PERMISO', () => validarPrescriptorClinico({ institucion, roles: ['ADMIN_INSTITUCIONAL'] }, { id: profesionalId, activo: true }));
      error('SIN_PERMISO', () => validarPrescriptorClinico({ institucion, roles: [rol], profesionalVinculado: { id: profesionalId, activo: false } }, { id: profesionalId, activo: true }));
      error('SIN_PERMISO', () => validarPrescriptorClinico({ institucion, roles: [rol], profesionalVinculado: { id: profesionalId, activo: true } }, { id: profesionalId, activo: false }));
    }
  });

  it('requiere cita dental, pero no la inventa para otras instituciones', () => {
    assert.throws(() => exigirCitaOdontologica('CLINICA_ODONTOLOGICA'));
    exigirCitaOdontologica('HOSPITAL_GENERAL');
    exigirCitaOdontologica('CLINICA_ODONTOLOGICA', profesionalId);
  });

  it('exige permiso de comando y no infiere autoridad por rol', () => {
    validarPermiso({ permisos: ['consultas.registrar'] }, 'consultas.registrar');
    error('SIN_PERMISO', () => validarPermiso({ permisos: ['pacientes.administrar'] }, 'consultas.registrar'));
  });

  it('exige autorización vigente pediátrica y distingue principal de autorizador', () => {
    validarAutorizacionPediatrica('HOSPITAL_GENERAL', null);
    validarAutorizacionPediatrica('CENTRO_MEDICO_PEDIATRICO', { activo: true, autorizaAtencion: true, version: versionPositiva(1) });
    error('SIN_PERMISO', () => validarAutorizacionPediatrica('CENTRO_MEDICO_PEDIATRICO', null));
    error('SIN_PERMISO', () => validarAutorizacionPediatrica('CENTRO_MEDICO_PEDIATRICO', { activo: true, autorizaAtencion: false, version: versionPositiva(1) }));
    error('SIN_PERMISO', () => validarAutorizacionPediatrica('CENTRO_MEDICO_PEDIATRICO', { activo: false, autorizaAtencion: true, version: versionPositiva(1) }));
  });

  it('requiere responsable principal al crear paciente pediátrico, separado de autorizar atención', () => {
    validarResponsablePrincipalPediatrico('HOSPITAL_GENERAL', []);
    validarResponsablePrincipalPediatrico('CENTRO_MEDICO_PEDIATRICO', [{ esPrincipal: true }]);
    error('SOLICITUD_INVALIDA', () => validarResponsablePrincipalPediatrico('CENTRO_MEDICO_PEDIATRICO', []));
    validarAutorizacionPediatrica('CENTRO_MEDICO_PEDIATRICO', { activo: true, autorizaAtencion: true, version: versionPositiva(1) });
    error('SIN_PERMISO', () => validarAutorizacionPediatrica('CENTRO_MEDICO_PEDIATRICO', { activo: true, autorizaAtencion: false, version: versionPositiva(1) }));
  });

  it('rechaza nueva atención archivada y permite terminar/corregir un proceso previo', () => {
    error('ESTADO_INVALIDO', () => validarOperacionHistorial('ARCHIVADO', 'NUEVA_ATENCION'));
    validarOperacionHistorial('ARCHIVADO', 'FINALIZAR_PROCESO_EXISTENTE');
    validarOperacionHistorial('ARCHIVADO', 'CORREGIR_HISTORICO');
    validarOperacionHistorial('ACTIVO', 'NUEVA_ATENCION');
  });

  it('archiva solo historial activo con permiso, causa y motivo dentro del límite', () => {
    validarArchivoHistorial('ACTIVO', true, 'TRASLADO', 'Traslado confirmado');
    validarArchivoHistorial('ACTIVO', true, 'FALLECIMIENTO', 'á'.repeat(2000));
    error('SIN_PERMISO', () => validarArchivoHistorial('ACTIVO', false, 'TRASLADO', 'motivo'));
    error('ESTADO_INVALIDO', () => validarArchivoHistorial('ARCHIVADO', true, 'TRASLADO', 'motivo'));
    error('SOLICITUD_INVALIDA', () => validarArchivoHistorial('ACTIVO', true, 'OTRA_ADMINISTRATIVA', '  '));
    error('SOLICITUD_INVALIDA', () => validarArchivoHistorial('ACTIVO', true, 'TRASLADO', 'á'.repeat(2001)));
  });

  it('limita reactivación a pediatría, permiso, motivo y corrección de fallecimiento', () => {
    validarReactivacionHistorial('ARCHIVADO', 'CENTRO_MEDICO_PEDIATRICO', true, 'corrección revisada', 'FALLECIMIENTO', true);
    error('SIN_PERMISO', () => validarReactivacionHistorial('ARCHIVADO', 'HOSPITAL_GENERAL', true, 'motivo', 'TRASLADO'));
    error('SIN_PERMISO', () => validarReactivacionHistorial('ARCHIVADO', 'CENTRO_MEDICO_PEDIATRICO', false, 'motivo', 'TRASLADO'));
    error('ESTADO_INVALIDO', () => validarReactivacionHistorial('ACTIVO', 'CENTRO_MEDICO_PEDIATRICO', true, 'motivo', 'TRASLADO'));
    error('SOLICITUD_INVALIDA', () => validarReactivacionHistorial('ARCHIVADO', 'CENTRO_MEDICO_PEDIATRICO', true, '  ', 'TRASLADO'));
    error('ESTADO_INVALIDO', () => validarReactivacionHistorial('ARCHIVADO', 'CENTRO_MEDICO_PEDIATRICO', true, 'motivo', 'FALLECIMIENTO'));
    validarReactivacionHistorial('ARCHIVADO', 'CENTRO_MEDICO_PEDIATRICO', true, 'á'.repeat(2000), 'TRASLADO');
    error('SOLICITUD_INVALIDA', () => validarReactivacionHistorial('ARCHIVADO', 'CENTRO_MEDICO_PEDIATRICO', true, 'á'.repeat(2001), 'TRASLADO'));
  });
});
