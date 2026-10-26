import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';
import { instanteUtc } from '../../src/dominio/compartido/instante-utc.js';
import { uuidPublico } from '../../src/dominio/compartido/uuid.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';
import { crearUnidadDeTrabajoMongodb } from '../../src/adaptadores/salida/mongodb/unidad-de-trabajo-mongodb.js';
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
