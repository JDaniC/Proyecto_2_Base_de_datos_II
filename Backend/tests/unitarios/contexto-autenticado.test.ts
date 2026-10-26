import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { crearContextoAutenticado } from '../../src/aplicacion/puertos/contexto-autenticado.js';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';
import { instanteUtc } from '../../src/dominio/compartido/instante-utc.js';
import { uuidPublico } from '../../src/dominio/compartido/uuid.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';

describe('contexto autenticado inmutable', () => {
  it('copia y congela identidad, cuenta, roles y permisos desde la capa de identidad', () => {
    const roles = ['MEDICO'] as const;
    const permisos = ['consultas.registrar'] as const;
    const contexto = crearContextoAutenticado(
      { uid: 'firebase-uid', institucion: 'HOSPITAL_GENERAL', emitidoEn: instanteUtc('2026-10-25T12:00:00Z') },
      { id: uuidPublico('550e8400-e29b-41d4-a716-446655440000'), uid: 'firebase-uid', institucion: 'HOSPITAL_GENERAL', estado: 'ACTIVA', roles, permisos, version: versionPositiva(1), profesional: { id: uuidPublico('550e8400-e29b-41d4-a716-446655440002'), activo: true } },
      uuidPublico('550e8400-e29b-41d4-a716-446655440001'),
    );
    assert.equal(Object.isFrozen(contexto), true);
    assert.equal(Object.isFrozen(contexto.cuenta), true);
    assert.equal(Object.isFrozen(contexto.cuenta.roles), true);
    assert.equal(Object.isFrozen(contexto.cuenta.permisos), true);
    assert.equal(Object.isFrozen(contexto.identidad), true);
    assert.equal(contexto.identidad.emitidoEn, '2026-10-25T12:00:00Z');
  });

  it('rechaza cuenta inactiva, UID o institución discordante', () => {
    const identidad = { uid: 'u1', institucion: 'HOSPITAL_GENERAL' as const, emitidoEn: instanteUtc('2026-10-25T12:00:00Z') };
    const base = { id: uuidPublico('550e8400-e29b-41d4-a716-446655440000'), uid: 'u1', institucion: 'HOSPITAL_GENERAL' as const, estado: 'ACTIVA' as const, roles: ['MEDICO'] as const, permisos: ['consultas.registrar'] as const, version: versionPositiva(1) };
    assert.throws(() => crearContextoAutenticado(identidad, { ...base, uid: 'u2' }, uuidPublico('550e8400-e29b-41d4-a716-446655440001')), ErrorDominio);
    assert.throws(() => crearContextoAutenticado(identidad, { ...base, institucion: 'LABORATORIO_CLINICO' }, uuidPublico('550e8400-e29b-41d4-a716-446655440001')), ErrorDominio);
    assert.throws(() => crearContextoAutenticado(identidad, { ...base, estado: 'INACTIVA' }, uuidPublico('550e8400-e29b-41d4-a716-446655440001')), ErrorDominio);
    assert.throws(() => crearContextoAutenticado(identidad, { ...base, roles: ['ROOT'] as never }, uuidPublico('550e8400-e29b-41d4-a716-446655440001')), ErrorDominio);
  });
});
