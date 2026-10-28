import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  codificarCursorSql,
  decodificarCursorSql,
  obtenerSecretoCursor,
  type DatosCursorSql,
} from '../../src/adaptadores/salida/sql/cursor-paginacion-sql.js';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';

test('cursor SQL: exige secreto privado de al menos 16 caracteres en el entorno', () => {
  const original = process.env.CURSOR_SIGNING_SECRET;
  try {
    delete process.env.CURSOR_SIGNING_SECRET;
    assert.throws(
      () => obtenerSecretoCursor(),
      (err: ErrorDominio) => err.codigo === 'PERSISTENCIA_NO_DISPONIBLE',
    );

    process.env.CURSOR_SIGNING_SECRET = 'corto_15_chars_';
    assert.throws(
      () => obtenerSecretoCursor(),
      (err: ErrorDominio) => err.codigo === 'PERSISTENCIA_NO_DISPONIBLE',
    );

    process.env.CURSOR_SIGNING_SECRET = 'secreto_valido_de_mas_de_16_caracteres';
    assert.equal(obtenerSecretoCursor(), 'secreto_valido_de_mas_de_16_caracteres');
  } finally {
    if (original !== undefined) {
      process.env.CURSOR_SIGNING_SECRET = original;
    } else {
      delete process.env.CURSOR_SIGNING_SECRET;
    }
  }
});

test('cursor SQL: codifica y decodifica cursores auténticos y rechaza claves o firmas discordantes', () => {
  const secretoValido = 'clave_secreta_de_prueba_de_mas_de_16_chars';
  const claveAjena = 'otra_clave_secreta_distinta_de_16_caracteres';
  const datos: DatosCursorSql = {
    v: 1,
    recurso: 'pacientes',
    institucion: 'HOSPITAL_GENERAL',
    q: 'ramirez',
    orden: 'ASC',
    estado: 'ACTIVO',
    f: '2026-10-27 10:00:00.000000',
    id: 'f876307e-07be-4fe4-a7fc-1cf64560a9e7',
  };

  const cursor = codificarCursorSql(datos, secretoValido);
  const decodificado = decodificarCursorSql(
    cursor,
    'HOSPITAL_GENERAL',
    'ramirez',
    'ASC',
    'ACTIVO',
    'pacientes',
    secretoValido,
  );
  assert.equal(decodificado.fecha, datos.f);
  assert.equal(decodificado.id, datos.id);

  // Rechaza firma con clave ajena
  assert.throws(
    () => decodificarCursorSql(cursor, 'HOSPITAL_GENERAL', 'ramirez', 'ASC', 'ACTIVO', 'pacientes', claveAjena),
    (err: ErrorDominio) => err.codigo === 'SOLICITUD_INVALIDA',
  );

  // Rechaza parámetros no coincidentes
  assert.throws(
    () => decodificarCursorSql(cursor, 'CLINICA_ODONTOLOGICA', 'ramirez', 'ASC', 'ACTIVO', 'pacientes', secretoValido),
    (err: ErrorDominio) => err.codigo === 'SOLICITUD_INVALIDA',
  );
  assert.throws(
    () => decodificarCursorSql(cursor, 'HOSPITAL_GENERAL', 'lopez', 'ASC', 'ACTIVO', 'pacientes', secretoValido),
    (err: ErrorDominio) => err.codigo === 'SOLICITUD_INVALIDA',
  );
  assert.throws(
    () => decodificarCursorSql(cursor, 'HOSPITAL_GENERAL', 'ramirez', 'DESC', 'ACTIVO', 'pacientes', secretoValido),
    (err: ErrorDominio) => err.codigo === 'SOLICITUD_INVALIDA',
  );
  assert.throws(
    () => decodificarCursorSql(cursor, 'HOSPITAL_GENERAL', 'ramirez', 'ASC', 'INACTIVO', 'pacientes', secretoValido),
    (err: ErrorDominio) => err.codigo === 'SOLICITUD_INVALIDA',
  );
  assert.throws(
    () => decodificarCursorSql(cursor, 'HOSPITAL_GENERAL', 'ramirez', 'ASC', 'ACTIVO', 'eventos_auditoria', secretoValido),
    (err: ErrorDominio) => err.codigo === 'SOLICITUD_INVALIDA',
  );
});
