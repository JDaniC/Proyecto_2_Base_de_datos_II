import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  validarDocumento,
  claveOperacion,
  claveUnica,
  idAplicacion,
  tamanoDocumento,
  ErrorModelo,
  INSTITUCION,
  MAX_DOCUMENTO,
} from '../../src/adaptadores/salida/firestore/validador-firestore.js';

const UUID_1 = '11111111-1111-4111-8111-111111111111';
const UUID_2 = '22222222-2222-4222-8222-222222222222';
const UUID_3 = '33333333-3333-4333-8333-333333333333';
const UUID_4 = '44444444-4444-4444-8444-444444444444';

test('validador Firestore: valida paciente activo con documento y responsable', () => {
  const ruta = `pacientes/${UUID_1}`;
  const paciente = {
    revision: 1,
    nombres: 'Carlos',
    apellidos: 'Gómez',
    nombre_busqueda: 'carlos gomez',
    fecha_nacimiento: '2020-05-15',
    sexo: 'MASCULINO',
    tipo_documento: 'CUI',
    numero_documento: '1234567890101',
    estado: 'ACTIVO',
    fecha_apertura: new Date('2026-01-01T10:00:00Z'),
  };
  const validado = validarDocumento(ruta, paciente);
  assert.equal((validado as typeof paciente).nombres, 'Carlos');
});

test('validador Firestore: rechaza paciente archivado sin baja', () => {
  const ruta = `pacientes/${UUID_1}`;
  const paciente = {
    revision: 1,
    nombres: 'Carlos',
    apellidos: 'Gómez',
    nombre_busqueda: 'carlos gomez',
    fecha_nacimiento: '2020-05-15',
    estado: 'ARCHIVADO',
    fecha_apertura: new Date('2026-01-01T10:00:00Z'),
  };
  assert.throws(() => validarDocumento(ruta, paciente), (err: unknown) => {
    assert.ok(err instanceof ErrorModelo);
    assert.equal(err.codigo, 'DOCUMENTO_INVALIDO');
    return true;
  });
});

test('validador Firestore: valida operación idempotente con clave determinista', () => {
  const clave = claveOperacion(INSTITUCION, UUID_1, 'CONSULTA_CREAR', UUID_2);
  const ruta = `operaciones/${clave}`;
  const operacion = {
    revision: 1,
    institucion_id: INSTITUCION,
    usuario_id: UUID_1,
    caso_uso: 'CONSULTA_CREAR',
    clave: UUID_2,
    hash_entrada: 'a'.repeat(64),
    recurso_tipo: 'consultas',
    recurso_id: UUID_3,
    fecha_hora: new Date('2026-10-26T12:00:00Z'),
    codigo_respuesta: 201,
    estado: 'CONFIRMADA',
    respuesta: {
      data: { id: UUID_3 },
      meta: { correlacion: UUID_4 },
    },
  };
  const validada = validarDocumento(ruta, operacion);
  assert.equal((validada as typeof operacion).codigo_respuesta, 201);
});

test('validador Firestore: rechaza clave de operación incompatible con sus campos', () => {
  const claveIncompatible = 'f'.repeat(64);
  const ruta = `operaciones/${claveIncompatible}`;
  const operacion = {
    revision: 1,
    institucion_id: INSTITUCION,
    usuario_id: UUID_1,
    caso_uso: 'CONSULTA_CREAR',
    clave: UUID_2,
    hash_entrada: 'a'.repeat(64),
    recurso_tipo: 'consultas',
    recurso_id: UUID_3,
    fecha_hora: new Date('2026-10-26T12:00:00Z'),
    codigo_respuesta: 201,
    estado: 'CONFIRMADA',
    respuesta: {
      data: { id: UUID_3 },
      meta: { correlacion: UUID_4 },
    },
  };
  assert.throws(() => validarDocumento(ruta, operacion), (err: unknown) => {
    assert.ok(err instanceof ErrorModelo);
    assert.equal(err.codigo, 'OPERACION_INCOMPATIBLE');
    return true;
  });
});

test('validador Firestore: calcula tamaño y rechaza documento que excede 256 KB', () => {
  const ruta = `pacientes/${UUID_1}`;
  const textoGigante = 'X'.repeat(MAX_DOCUMENTO + 100);
  const datos = {
    revision: 1,
    nombres: 'Prueba',
    apellidos: 'Exceso',
    nombre_busqueda: 'prueba exceso',
    fecha_nacimiento: '2021-01-01',
    direccion: textoGigante,
    estado: 'ACTIVO',
    fecha_apertura: new Date(),
  };
  const tamano = tamanoDocumento(ruta, datos);
  assert.ok(tamano > MAX_DOCUMENTO);
  assert.throws(() => validarDocumento(ruta, datos), (err: unknown) => {
    assert.ok(err instanceof ErrorModelo);
    return true;
  });
});

test('validador Firestore: idAplicacion genera clave compuesta determinista', () => {
  const idCompuesto = idAplicacion(UUID_1, UUID_2, UUID_3);
  assert.equal(idCompuesto, `${UUID_1}__${UUID_2}__${UUID_3}`);
  assert.throws(() => idAplicacion('no-uuid', UUID_2, UUID_3), ErrorModelo);
});

test('validador Firestore: claveUnica normaliza NFKC y espacios', () => {
  const c1 = claveUnica('CUI', '1234 5678');
  const c2 = claveUnica('cui', '1234 5678  ');
  assert.equal(c1, c2);
});

test('validador Firestore: rechaza fechas de nacimiento inexistentes en el calendario (2020-02-31)', () => {
  const ruta = `pacientes/${UUID_1}`;
  const pacienteInvalido = {
    revision: 1,
    nombres: 'Prueba',
    apellidos: 'Fecha',
    nombre_busqueda: 'prueba fecha',
    fecha_nacimiento: '2020-02-31',
    estado: 'ACTIVO',
    fecha_apertura: new Date('2026-01-01T10:00:00Z'),
  };
  assert.throws(() => validarDocumento(ruta, pacienteInvalido), (err: unknown) => {
    assert.ok(err instanceof ErrorModelo);
    assert.equal(err.codigo, 'DOCUMENTO_INVALIDO');
    return true;
  });

  const pacienteMesInvalido = {
    ...pacienteInvalido,
    fecha_nacimiento: '2026-13-01',
  };
  assert.throws(() => validarDocumento(ruta, pacienteMesInvalido), ErrorModelo);

  const pacienteBisiestoValido = {
    ...pacienteInvalido,
    fecha_nacimiento: '2020-02-29',
  };
  const validado = validarDocumento(ruta, pacienteBisiestoValido);
  assert.equal((validado as typeof pacienteBisiestoValido).fecha_nacimiento, '2020-02-29');
});

test('validador Firestore: admite rutas de versiones históricas para pacientes y citas', () => {
  const versionDoc = {
    revision: 1,
    version: 1,
    actor_id: UUID_1,
    fecha_hora: new Date('2026-10-26T12:00:00Z'),
    motivo: 'CAMBIO_DEMOGRAFICO',
    contenido_anterior: { nombres: 'Nombre Anterior', apellidos: 'Apellido Anterior' },
  };

  const rutaPacienteVersion = `pacientes/${UUID_1}/versiones/${UUID_2}`;
  const validadoPaciente = validarDocumento(rutaPacienteVersion, versionDoc);
  assert.equal((validadoPaciente as typeof versionDoc).version, 1);

  const versionCitaDoc = {
    revision: 1,
    version: 1,
    actor_id: UUID_1,
    fecha_hora: new Date('2026-10-26T12:00:00Z'),
    motivo: 'REPROGRAMACION',
    contenido_anterior: { estado: 'PROGRAMADA', fecha_hora: new Date('2026-10-25T10:00:00Z') },
  };

  const rutaCitaVersion = `citas/${UUID_1}/versiones/${UUID_2}`;
  const validadoCita = validarDocumento(rutaCitaVersion, versionCitaDoc);
  assert.equal((validadoCita as typeof versionCitaDoc).version, 1);
});
