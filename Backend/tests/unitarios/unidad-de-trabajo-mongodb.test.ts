import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';
import { instanteUtc } from '../../src/dominio/compartido/instante-utc.js';
import { uuidPublico } from '../../src/dominio/compartido/uuid.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';
import { crearUnidadDeTrabajoMongodb } from '../../src/adaptadores/salida/mongodb/unidad-de-trabajo-mongodb.js';
import { mapearCuentaMongodb } from '../../src/adaptadores/salida/mongodb/mapear-cuenta-mongodb.js';
import type { ClienteMongodb } from '../../src/adaptadores/salida/mongodb/tipos-mongodb.js';
import {
  crearContextoAutenticado,
  type ContextoAutenticado,
  type CuentaAutorizada,
} from '../../src/aplicacion/puertos/contexto-autenticado.js';
import type { ComandoEstable, LectorTransaccional, PlanDeEscrituras } from '../../src/aplicacion/puertos/nucleo.js';

const UUID_ACTOR = uuidPublico('11111111-1111-4111-8111-111111111111');
const UUID_COMANDO = uuidPublico('22222222-2222-4222-8222-222222222222');
const UUID_CLAVE = uuidPublico('33333333-3333-4333-8333-333333333333');
const UUID_RECURSO = uuidPublico('44444444-4444-4444-8444-444444444444');
const UUID_CORRELACION = uuidPublico('55555555-5555-4555-8555-555555555555');

function crearCuentaBase(sobreescritura: Partial<CuentaAutorizada> = {}): CuentaAutorizada {
  return Object.freeze({
    id: UUID_ACTOR,
    uid: 'firebase_uid_lab',
    institucion: 'LABORATORIO_CLINICO' as const,
    estado: 'ACTIVA' as const,
    roles: Object.freeze(['ANALISTA_LABORATORIO' as const]),
    permisos: Object.freeze(['muestras.administrar' as const]),
    version: versionPositiva(1),
    profesional: Object.freeze({ id: UUID_ACTOR, activo: true }),
    ...sobreescritura,
  });
}

function crearContextoPrueba(sobreescritura: Partial<CuentaAutorizada> = {}): ContextoAutenticado {
  const cuenta = crearCuentaBase(sobreescritura);
  return crearContextoAutenticado(
    {
      uid: 'firebase_uid_lab',
      institucion: 'LABORATORIO_CLINICO',
      emitidoEn: instanteUtc('2026-10-26T12:00:00Z'),
    },
    cuenta,
    UUID_CORRELACION,
  );
}

function crearComandoPrueba(hashEntrada = 'a'.repeat(64)): ComandoEstable {
  return Object.freeze({
    id: UUID_COMANDO,
    claveIdempotencia: UUID_CLAVE,
    caso: 'muestras',
    hashEntrada,
    instante: instanteUtc('2026-10-26T12:00:00Z'),
    ids: Object.freeze({ muestraId: UUID_RECURSO }),
  });
}

function crearMockMongodb(opciones: {
  operacionExistente?: Record<string, unknown> | null;
  fallarTransitorioVeces?: number;
} = {}) {
  const collections = new Map<string, unknown[]>();
  let intentos = 0;
  let commits = 0;
  let aborts = 0;
  let sessionsEnded = 0;

  const getCollection = (name: string) => {
    if (!collections.has(name)) collections.set(name, []);
    return collections.get(name)!;
  };

  const mockDb = {
    collection: (name: string) => ({
      findOne: async (query: Record<string, unknown>) => {
        if (name === 'operaciones' && opciones.operacionExistente) {
          return opciones.operacionExistente;
        }
        const items = getCollection(name);
        return items.find((item) => {
          const rec = item as Record<string, unknown>;
          return Object.keys(query).every((k) => rec[k] === query[k]);
        }) ?? null;
      },
      insertOne: async (doc: unknown) => {
        if (opciones.fallarTransitorioVeces && intentos <= opciones.fallarTransitorioVeces) {
          const err = Object.assign(new Error('WriteConflict'), { code: 112 });
          throw err;
        }
        getCollection(name).push(doc);
        return { acknowledged: true, insertedId: (doc as { _id: unknown })._id };
      },
    }),
  };

  const cliente: ClienteMongodb = Object.freeze({
    client: {} as unknown as import('mongodb').MongoClient,
    db: mockDb as unknown as import('mongodb').Db,
    verificarReplicaSet: async () => {},
    iniciarSesion: () => {
      intentos += 1;
      return {
        startTransaction: () => {},
        commitTransaction: async () => { commits += 1; },
        abortTransaction: async () => { aborts += 1; },
        endSession: async () => { sessionsEnded += 1; },
      } as unknown as import('mongodb').ClientSession;
    },
    cerrar: async () => {},
  });

  return {
    cliente,
    collections,
    getIntentos: () => intentos,
    getCommits: () => commits,
    getAborts: () => aborts,
    getSessionsEnded: () => sessionsEnded,
  };
}

test('UoW MongoDB: ejecuta transacción completa con datos, revisiones, auditoría y operación', async () => {
  const { cliente, collections, getCommits, getSessionsEnded } = crearMockMongodb();
  let cambiosAplicados = false;

  const uow = crearUnidadDeTrabajoMongodb({
    cliente,
    crearLector: () => ({
      cuentas: { porUid: async () => crearCuentaBase() },
    } as unknown as LectorTransaccional),
    aplicarCambios: async () => {
      cambiosAplicados = true;
    },
  });

  const contexto = crearContextoPrueba();
  const comando = crearComandoPrueba();

  const resultado = await uow.ejecutar(contexto, comando, async () => {
    const plan: PlanDeEscrituras<unknown> = {
      tipo: 'CONFIRMAR',
      cambios: [],
      revisiones: [
        {
          id: uuidPublico('77777777-7777-4777-8777-777777777777'),
          agregado: 'muestras',
          recursoId: UUID_RECURSO,
          versionAnterior: versionPositiva(1),
          snapshotAnterior: { estado: 'RECOLECTADA' },
        },
      ],
      auditoria: [
        {
          id: uuidPublico('88888888-8888-4888-8888-888888888888'),
          actorId: contexto.cuenta.id,
          caso: 'muestras',
          recursoId: UUID_RECURSO,
          fechaHora: comando.instante,
          correlacion: UUID_CORRELACION,
        },
      ],
      resultado: {
        httpStatus: 201,
        respuesta: { data: { id: UUID_RECURSO }, meta: { correlacion: UUID_CORRELACION } },
        correlacionOriginal: UUID_CORRELACION,
      },
    };
    return plan;
  });

  assert.equal(resultado.httpStatus, 201);
  assert.equal(cambiosAplicados, true);
  assert.equal(getCommits(), 1);
  assert.equal(getSessionsEnded(), 1);
  assert.equal(collections.get('revisiones')?.length, 1);
  assert.equal(collections.get('auditoria')?.length, 1);
  assert.equal(collections.get('operaciones')?.length, 1);
});

test('UoW MongoDB: resuelve idempotencia y no duplica escrituras', async () => {
  const hashEntrada = 'a'.repeat(64);
  const operacionPrevia = {
    _id: `${UUID_ACTOR}__muestras__${UUID_CLAVE}`,
    revision: 1,
    institucion_id: 'LABORATORIO_CLINICO',
    usuario_id: UUID_ACTOR,
    caso_uso: 'muestras',
    clave: UUID_CLAVE,
    hash_entrada: hashEntrada,
    codigo_respuesta: 200,
    estado: 'CONFIRMADA',
    respuesta: {
      data: { id: UUID_RECURSO },
      meta: { correlacion: UUID_CORRELACION },
    },
  };

  const { cliente, getAborts, getSessionsEnded } = crearMockMongodb({ operacionExistente: operacionPrevia });
  const uow = crearUnidadDeTrabajoMongodb({
    cliente,
    crearLector: () => ({
      cuentas: { porUid: async () => crearCuentaBase() },
    } as unknown as LectorTransaccional),
    aplicarCambios: async () => {},
  });

  const contexto = crearContextoPrueba();
  const comando = crearComandoPrueba(hashEntrada);

  const respuesta = await uow.ejecutar(contexto, comando, async () => {
    throw new Error('No debe planificar en replay');
  });

  assert.equal(respuesta.httpStatus, 200);
  assert.equal(respuesta.correlacionOriginal, UUID_CORRELACION);
  assert.equal(getAborts(), 1);
  assert.equal(getSessionsEnded(), 1);
});

test('UoW MongoDB: rechaza repetición con hash distinto (CLAVE_REUTILIZADA)', async () => {
  const operacionPrevia = {
    _id: `${UUID_ACTOR}__muestras__${UUID_CLAVE}`,
    revision: 1,
    institucion_id: 'LABORATORIO_CLINICO',
    usuario_id: UUID_ACTOR,
    caso_uso: 'muestras',
    clave: UUID_CLAVE,
    hash_entrada: 'a'.repeat(64),
    codigo_respuesta: 200,
    estado: 'CONFIRMADA',
    respuesta: { data: {}, meta: { correlacion: UUID_CORRELACION } },
  };

  const { cliente } = crearMockMongodb({ operacionExistente: operacionPrevia });
  const uow = crearUnidadDeTrabajoMongodb({
    cliente,
    crearLector: () => ({
      cuentas: { porUid: async () => crearCuentaBase() },
    } as unknown as LectorTransaccional),
    aplicarCambios: async () => {},
  });

  const contexto = crearContextoPrueba();
  const comando = crearComandoPrueba('b'.repeat(64));

  await assert.rejects(
    () => uow.ejecutar(contexto, comando, async () => { throw new Error('no'); }),
    (err: unknown) => {
      assert.ok(err instanceof ErrorDominio);
      assert.equal(err.codigo, 'CLAVE_REUTILIZADA');
      return true;
    },
  );
});

test('UoW MongoDB: bloquea replay si cuenta perdió permisos', async () => {
  const hashEntrada = 'c'.repeat(64);
  const operacionPrevia = {
    _id: `${UUID_ACTOR}__muestras__${UUID_CLAVE}`,
    revision: 1,
    institucion_id: 'LABORATORIO_CLINICO',
    usuario_id: UUID_ACTOR,
    caso_uso: 'muestras',
    clave: UUID_CLAVE,
    hash_entrada: hashEntrada,
    codigo_respuesta: 200,
    estado: 'CONFIRMADA',
    respuesta: { data: {}, meta: { correlacion: UUID_CORRELACION } },
  };

  const { cliente } = crearMockMongodb({ operacionExistente: operacionPrevia });
  const uow = crearUnidadDeTrabajoMongodb({
    cliente,
    crearLector: () => ({
      cuentas: { porUid: async () => crearCuentaBase({ estado: 'INACTIVA' }) },
    } as unknown as LectorTransaccional),
    aplicarCambios: async () => {},
  });

  const contexto = crearContextoPrueba();
  const comando = crearComandoPrueba(hashEntrada);

  await assert.rejects(
    () => uow.ejecutar(contexto, comando, async () => { throw new Error('no'); }),
    (err: unknown) => {
      assert.ok(err instanceof ErrorDominio);
      assert.equal(err.codigo, 'SIN_PERMISO');
      return true;
    },
  );
});

test('UoW MongoDB: reintenta ante WriteConflict transitorio', async () => {
  const { cliente, getIntentos, getCommits } = crearMockMongodb({ fallarTransitorioVeces: 1 });
  const uow = crearUnidadDeTrabajoMongodb({
    cliente,
    reintentosMaximos: 3,
    esperarReintento: async () => {},
    crearLector: () => ({
      cuentas: { porUid: async () => crearCuentaBase() },
    } as unknown as LectorTransaccional),
    aplicarCambios: async () => {},
  });

  const contexto = crearContextoPrueba();
  const comando = crearComandoPrueba();

  const resultado = await uow.ejecutar(contexto, comando, async () => {
    return {
      tipo: 'CONFIRMAR',
      cambios: [],
      revisiones: [],
      auditoria: [],
      resultado: {
        httpStatus: 200,
        respuesta: { data: {}, meta: { correlacion: UUID_CORRELACION } },
        correlacionOriginal: UUID_CORRELACION,
      },
    };
  });

  assert.equal(resultado.httpStatus, 200);
  assert.equal(getIntentos(), 2);
  assert.equal(getCommits(), 1);
});

test('UoW MongoDB: asocia cada evento de auditoría a su colección respectiva por recursoId en multi-agregado', async () => {
  const { cliente, collections } = crearMockMongodb();
  const uow = crearUnidadDeTrabajoMongodb({
    cliente,
    crearLector: () => ({
      cuentas: { porUid: async () => crearCuentaBase() },
    } as unknown as LectorTransaccional),
    aplicarCambios: async () => {},
  });

  const contexto = crearContextoPrueba();
  const comando = crearComandoPrueba();
  const idPaciente = uuidPublico('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  const idConsulta = uuidPublico('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  const audit1 = uuidPublico('11111111-2222-4333-8444-555555555555');
  const audit2 = uuidPublico('66666666-7777-4888-8999-000000000000');

  await uow.ejecutar(contexto, comando, async () => {
    return {
      tipo: 'CONFIRMAR',
      cambios: [
        { agregado: 'pacientes', tipo: 'ALTA', recursoId: idPaciente, versionAnterior: null, nuevoEstado: {} },
        { agregado: 'consultas_clinicas', tipo: 'ALTA', recursoId: idConsulta, versionAnterior: null, nuevoEstado: {} },
      ],
      revisiones: [],
      auditoria: [
        { id: audit1, actorId: UUID_ACTOR, caso: 'PACIENTE_REGISTRADO', recursoId: idPaciente, fechaHora: comando.instante, correlacion: UUID_CORRELACION },
        { id: audit2, actorId: UUID_ACTOR, caso: 'CONSULTA_CREADA', recursoId: idConsulta, fechaHora: comando.instante, correlacion: UUID_CORRELACION },
      ],
      resultado: {
        httpStatus: 201,
        respuesta: { data: {}, meta: { correlacion: UUID_CORRELACION } },
        correlacionOriginal: UUID_CORRELACION,
      },
    };
  });

  const auditorias = collections.get('auditoria') as Array<{ coleccion: string; documento_id: string }>;
  assert.equal(auditorias.length, 2);
  assert.equal(auditorias[0]?.coleccion, 'pacientes');
  assert.equal(auditorias[0]?.documento_id, idPaciente);
  assert.equal(auditorias[1]?.coleccion, 'consultas_clinicas');
  assert.equal(auditorias[1]?.documento_id, idConsulta);
});

test('UoW MongoDB: reconciliación ante conflicto revalida autorización y rechaza si la cuenta se desactivó', async () => {
  const hashEntrada = 'e'.repeat(64);
  const operacionPrevia = {
    _id: `${UUID_ACTOR}__muestras__${UUID_CLAVE}`,
    institucion_id: 'LABORATORIO_CLINICO',
    usuario_id: UUID_ACTOR,
    caso_uso: 'muestras',
    clave: UUID_CLAVE,
    hash_entrada: hashEntrada,
    codigo_respuesta: 200,
    respuesta: { data: { secreto: 'clinico' }, meta: { correlacion: UUID_CORRELACION } },
  };

  const { cliente, collections } = crearMockMongodb({ operacionExistente: operacionPrevia });
  // Simular cuenta desactivada en la colección de usuarios
  collections.set('usuarios', [{
    _id: UUID_ACTOR,
    auth_uid: 'firebase_uid_lab',
    institucion_id: 'LABORATORIO_CLINICO',
    estado: 'INACTIVO',
    activo: false,
    rol_ids: [],
    revision: 1,
  }]);

  const uow = crearUnidadDeTrabajoMongodb({
    cliente,
    crearLector: () => ({
      cuentas: { porUid: async () => null },
    } as unknown as LectorTransaccional),
    aplicarCambios: async () => {
      // Simular error de clave duplicada E11000 durante la inserción
      const err = Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });
      throw err;
    },
  });

  const contexto = crearContextoPrueba();
  const comando = crearComandoPrueba(hashEntrada);

  await assert.rejects(
    () => uow.ejecutar(contexto, comando, async () => ({
      tipo: 'CONFIRMAR',
      cambios: [],
      revisiones: [],
      auditoria: [],
      resultado: { httpStatus: 200, respuesta: {}, correlacionOriginal: UUID_CORRELACION },
    })),
    (err: unknown) => {
      assert.ok(err instanceof ErrorDominio);
      assert.equal(err.codigo, 'SIN_PERMISO');
      return true;
    },
  );
});

test('mapearCuentaMongodb: resuelve médico clínico desde solicitante_medico_id y verifica tipo y estado', () => {
  const usuarioDoc = {
    _id: UUID_ACTOR,
    auth_uid: 'uid_doc',
    institucion_id: 'LABORATORIO_CLINICO',
    estado: 'ACTIVO',
    activo: true,
    rol_ids: ['ROL_MEDICO'],
    revision: 1,
    solicitante_medico_id: '77777777-7777-4777-8777-777777777777',
  };
  const rolesDocs = [{ _id: 'ROL_MEDICO', nombre: 'MEDICO_LABORATORIO', permisos: ['muestras.validar'] }];

  // Solicitante médico activo
  const cuentaValida = mapearCuentaMongodb(usuarioDoc, rolesDocs, {
    _id: '77777777-7777-4777-8777-777777777777',
    tipo: 'MEDICO',
    activo: true,
  });
  assert.ok(cuentaValida !== null);
  assert.equal(cuentaValida.profesional?.id, '77777777-7777-4777-8777-777777777777');
  assert.equal(cuentaValida.profesional?.activo, true);

  // Solicitante institucional (no médico individual)
  const cuentaInstitucional = mapearCuentaMongodb(usuarioDoc, rolesDocs, {
    _id: '77777777-7777-4777-8777-777777777777',
    tipo: 'INSTITUCION',
    activo: true,
  });
  assert.ok(cuentaInstitucional !== null);
  assert.equal(cuentaInstitucional.profesional?.activo, false);

  // Solicitante médico inactivo
  const cuentaInactiva = mapearCuentaMongodb(usuarioDoc, rolesDocs, {
    _id: '77777777-7777-4777-8777-777777777777',
    tipo: 'MEDICO',
    activo: false,
  });
  assert.ok(cuentaInactiva !== null);
  assert.equal(cuentaInactiva.profesional?.activo, false);

  // Sin solicitante_medico_id (usuario analista sin rol prescriptor)
  const cuentaSinSolicitante = mapearCuentaMongodb({
    ...usuarioDoc,
    solicitante_medico_id: undefined,
  }, rolesDocs, null);
  assert.ok(cuentaSinSolicitante !== null);
  assert.equal(cuentaSinSolicitante.profesional, undefined);
});

test('UoW MongoDB: preserva y reconstruye la forma original de la respuesta en replay (respuesta plana no envuelta)', async () => {
  const { cliente } = crearMockMongodb();
  const uow = crearUnidadDeTrabajoMongodb({
    cliente,
    crearLector: () => ({
      cuentas: { porUid: async () => crearCuentaBase() },
    } as unknown as LectorTransaccional),
    aplicarCambios: async () => {},
  });

  const contexto = crearContextoPrueba();
  const comando = crearComandoPrueba('d'.repeat(64));
  const respuestaPlana = Object.freeze({ id: 'recurso-abc-123', codigo: 'BAR-123' });

  // 1. Primera ejecución: devuelve la respuesta plana devuelta por el plan
  const res1 = await uow.ejecutar(contexto, comando, async () => ({
    tipo: 'CONFIRMAR',
    cambios: [],
    revisiones: [],
    auditoria: [],
    resultado: {
      httpStatus: 201,
      respuesta: respuestaPlana,
      correlacionOriginal: UUID_CORRELACION,
    },
  }));

  assert.equal(res1.httpStatus, 201);
  assert.deepEqual(res1.respuesta, respuestaPlana);

  // 2. Replay idempotente: la UoW debe recuperar la operación y reconstruir la respuesta plana original
  const resReplay = await uow.ejecutar(contexto, comando, async () => {
    throw new Error('No debe llamar planificar en replay');
  });

  assert.equal(resReplay.httpStatus, 201);
  assert.equal(resReplay.correlacionOriginal, UUID_CORRELACION);
  // Asertar igualdad estricta entre primera ejecución y repetición
  assert.deepEqual(resReplay.respuesta, res1.respuesta);
  assert.deepEqual(resReplay.respuesta, respuestaPlana);
});
