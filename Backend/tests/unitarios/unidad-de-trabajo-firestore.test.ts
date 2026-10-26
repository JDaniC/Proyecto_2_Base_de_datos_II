import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';
import { instanteUtc } from '../../src/dominio/compartido/instante-utc.js';
import { uuidPublico } from '../../src/dominio/compartido/uuid.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';
import { crearUnidadDeTrabajoFirestore } from '../../src/adaptadores/salida/firestore/unidad-de-trabajo-firestore.js';
import type { ClienteFirestore } from '../../src/adaptadores/salida/firestore/tipos-firestore.js';
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
    uid: 'firebase_uid_pediatra',
    institucion: 'CENTRO_MEDICO_PEDIATRICO' as const,
    estado: 'ACTIVA' as const,
    roles: Object.freeze(['PEDIATRA' as const]),
    permisos: Object.freeze(['consultas.registrar' as const]),
    version: versionPositiva(1),
    profesional: Object.freeze({ id: UUID_ACTOR, activo: true }),
    ...sobreescritura,
  });
}

function crearContextoPrueba(sobreescritura: Partial<CuentaAutorizada> = {}): ContextoAutenticado {
  const cuenta = crearCuentaBase(sobreescritura);
  return crearContextoAutenticado(
    {
      uid: 'firebase_uid_pediatra',
      institucion: 'CENTRO_MEDICO_PEDIATRICO',
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
    caso: 'citas',
    hashEntrada,
    instante: instanteUtc('2026-10-26T12:00:00Z'),
    ids: Object.freeze({ citaId: UUID_RECURSO }),
  });
}

function crearMockFirestore(opciones: {
  operacionExistente?: Record<string, unknown> | null;
  fallarConcurrenciaVeces?: number;
  fallarCommit?: Error;
} = {}) {
  const store = new Map<string, unknown>();
  let intentos = 0;

  const firestore = {
    doc: (path: string) => ({ path }),
    runTransaction: async <T>(fn: (t: {
      get: (ref: { path: string }) => Promise<{ exists: boolean; data: () => unknown }>;
      set: (ref: { path: string }, data: unknown) => unknown;
      create: (ref: { path: string }, data: unknown) => unknown;
    }) => Promise<T>): Promise<T> => {
      intentos += 1;
      if (opciones.fallarConcurrenciaVeces && intentos <= opciones.fallarConcurrenciaVeces) {
        const error = Object.assign(new Error('Concurrency conflict'), { code: 10 });
        throw error;
      }

      // Buffer transaccional (staging de escrituras aisladas hasta commit)
      const buffer = new Map<string, { tipo: 'set' | 'create'; data: unknown }>();

      const mockTransaction = {
        get: async (ref: { path: string }) => {
          if (store.has(ref.path)) {
            return { exists: true, data: () => store.get(ref.path) };
          }
          if (ref.path.startsWith('operaciones/')) {
            const existe = opciones.operacionExistente;
            if (existe) {
              return { exists: true, data: () => existe };
            }
            return { exists: false, data: () => undefined };
          }
          return { exists: false, data: () => undefined };
        },
        set: (ref: { path: string }, data: unknown) => {
          buffer.set(ref.path, { tipo: 'set', data });
          return mockTransaction;
        },
        create: (ref: { path: string }, data: unknown) => {
          buffer.set(ref.path, { tipo: 'create', data });
          return mockTransaction;
        },
      };

      const resultado = await fn(mockTransaction);

      // Fase de commit atómico: precondiciones y aplicación indivisible al store
      if (opciones.fallarCommit) {
        throw opciones.fallarCommit;
      }
      for (const [path, op] of buffer) {
        if (op.tipo === 'create' && store.has(path)) {
          const err = Object.assign(new Error('Document already exists'), { code: 6 });
          throw err;
        }
      }
      for (const [path, op] of buffer) {
        store.set(path, op.data);
      }

      return resultado;
    },
  };

  const cliente: ClienteFirestore = Object.freeze({
    firestore: firestore as unknown as import('firebase-admin/firestore').Firestore,
    projectId: 'demo-test',
    databaseId: '(default)',
    cerrar: async () => {},
  });

  return { cliente, store, getIntentos: () => intentos };
}

test('UoW Firestore: ejecuta confirmación atómica y guarda revisiones, auditoría y operación', async () => {
  const { cliente, store } = crearMockFirestore();
  let cambiosAplicados = false;

  const uow = crearUnidadDeTrabajoFirestore({
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
      revisiones: [],
      auditoria: [
        {
          id: uuidPublico('88888888-8888-4888-8888-888888888888'),
          actorId: contexto.cuenta.id,
          caso: 'citas',
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
  assert.equal(store.size, 2); // 1 auditoria + 1 operacion
});

test('UoW Firestore: repite operación previa si hash y permisos coinciden', async () => {
  const hashEntrada = 'b'.repeat(64);
  const operacionPrevia = {
    revision: 1,
    institucion_id: 'CENTRO_MEDICO_PEDIATRICO',
    usuario_id: UUID_ACTOR,
    caso_uso: 'citas',
    clave: UUID_CLAVE,
    hash_entrada: hashEntrada,
    recurso_tipo: 'citas',
    recurso_id: UUID_RECURSO,
    fecha_hora: new Date('2026-10-26T12:00:00Z'),
    codigo_respuesta: 200,
    estado: 'CONFIRMADA',
    respuesta: {
      data: { id: UUID_RECURSO },
      meta: { correlacion: UUID_CORRELACION },
    },
  };

  const { cliente } = crearMockFirestore({ operacionExistente: operacionPrevia });
  const uow = crearUnidadDeTrabajoFirestore({
    cliente,
    crearLector: () => ({
      cuentas: { porUid: async () => crearCuentaBase() },
    } as unknown as LectorTransaccional),
    aplicarCambios: async () => {},
  });

  const contexto = crearContextoPrueba();
  const comando = crearComandoPrueba(hashEntrada);

  const respuesta = await uow.ejecutar(contexto, comando, async () => {
    throw new Error('No debe planificar en repetición');
  });

  assert.equal(respuesta.httpStatus, 200);
  assert.equal(respuesta.correlacionOriginal, UUID_CORRELACION);
});

test('UoW Firestore: rechaza repetición si hash de entrada no coincide (CLAVE_REUTILIZADA)', async () => {
  const operacionPrevia = {
    revision: 1,
    institucion_id: 'CENTRO_MEDICO_PEDIATRICO',
    usuario_id: UUID_ACTOR,
    caso_uso: 'citas',
    clave: UUID_CLAVE,
    hash_entrada: 'b'.repeat(64),
    codigo_respuesta: 200,
    estado: 'CONFIRMADA',
    respuesta: {
      data: {},
      meta: { correlacion: UUID_CORRELACION },
    },
  };

  const { cliente } = crearMockFirestore({ operacionExistente: operacionPrevia });
  const uow = crearUnidadDeTrabajoFirestore({
    cliente,
    crearLector: () => ({
      cuentas: { porUid: async () => crearCuentaBase() },
    } as unknown as LectorTransaccional),
    aplicarCambios: async () => {},
  });

  const contexto = crearContextoPrueba();
  const comando = crearComandoPrueba('c'.repeat(64)); // Diferente hash!

  await assert.rejects(
    () => uow.ejecutar(contexto, comando, async () => { throw new Error('no'); }),
    (err: unknown) => {
      assert.ok(err instanceof ErrorDominio);
      assert.equal(err.codigo, 'CLAVE_REUTILIZADA');
      return true;
    },
  );
});

test('UoW Firestore: bloquea replay si cuenta perdió permisos o fue desactivada', async () => {
  const hashEntrada = 'd'.repeat(64);
  const operacionPrevia = {
    revision: 1,
    institucion_id: 'CENTRO_MEDICO_PEDIATRICO',
    usuario_id: UUID_ACTOR,
    caso_uso: 'citas',
    clave: UUID_CLAVE,
    hash_entrada: hashEntrada,
    codigo_respuesta: 200,
    estado: 'CONFIRMADA',
    respuesta: {
      data: {},
      meta: { correlacion: UUID_CORRELACION },
    },
  };

  const { cliente } = crearMockFirestore({ operacionExistente: operacionPrevia });
  const uow = crearUnidadDeTrabajoFirestore({
    cliente,
    crearLector: () => ({
      // Cuenta ahora está INACTIVA en la base de datos
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

test('UoW Firestore: reintenta ante conflicto concurrente (código 10 ABORTED)', async () => {
  const { cliente, getIntentos } = crearMockFirestore({ fallarConcurrenciaVeces: 1 });
  const uow = crearUnidadDeTrabajoFirestore({
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
  assert.equal(getIntentos(), 2); // 1 fallo + 1 éxito
});

test('UoW Firestore: asocia cada evento de auditoría a su tipo_recurso respectivo por recursoId en multi-agregado', async () => {
  const { cliente, store } = crearMockFirestore();
  const uow = crearUnidadDeTrabajoFirestore({
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
        { agregado: 'consultas', tipo: 'ALTA', recursoId: idConsulta, versionAnterior: null, nuevoEstado: {} },
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

  const docAudit1 = store.get(`auditoria/${audit1}`) as { tipo_recurso: string; recurso_id: string };
  const docAudit2 = store.get(`auditoria/${audit2}`) as { tipo_recurso: string; recurso_id: string };
  assert.ok(docAudit1);
  assert.ok(docAudit2);
  assert.equal(docAudit1.tipo_recurso, 'pacientes');
  assert.equal(docAudit1.recurso_id, idPaciente);
  assert.equal(docAudit2.tipo_recurso, 'consultas');
  assert.equal(docAudit2.recurso_id, idConsulta);
});

test('UoW Firestore: persiste revisiones históricas para pacientes y citas sin RUTA_NO_ADMITIDA', async () => {
  const { cliente, store } = crearMockFirestore();
  const uow = crearUnidadDeTrabajoFirestore({
    cliente,
    crearLector: () => ({
      cuentas: { porUid: async () => crearCuentaBase() },
    } as unknown as LectorTransaccional),
    aplicarCambios: async () => {},
  });

  const contexto = crearContextoPrueba();
  const comando = crearComandoPrueba();
  const idPaciente = uuidPublico('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  const idCita = uuidPublico('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  const revPaciente = uuidPublico('11111111-2222-4333-8444-555555555555');
  const revCita = uuidPublico('66666666-7777-4888-8999-000000000000');

  await uow.ejecutar(contexto, comando, async () => {
    const plan: PlanDeEscrituras<unknown, unknown, Record<string, unknown>> = {
      tipo: 'CONFIRMAR',
      cambios: [],
      revisiones: [
        {
          id: revPaciente,
          agregado: 'pacientes',
          recursoId: idPaciente,
          versionAnterior: versionPositiva(1),
          snapshotAnterior: { nombres: 'Sofía Anterior' },
        },
        {
          id: revCita,
          agregado: 'citas',
          recursoId: idCita,
          versionAnterior: versionPositiva(2),
          snapshotAnterior: { estado: 'PROGRAMADA' },
        },
      ],
      auditoria: [],
      resultado: {
        httpStatus: 200,
        respuesta: { data: {}, meta: { correlacion: UUID_CORRELACION } },
        correlacionOriginal: UUID_CORRELACION,
      },
    };
    return plan;
  });

  const docRevPaciente = store.get(`pacientes/${idPaciente}/versiones/${revPaciente}`) as { version: number };
  const docRevCita = store.get(`citas/${idCita}/versiones/${revCita}`) as { version: number };
  assert.ok(docRevPaciente);
  assert.ok(docRevCita);
  assert.equal(docRevPaciente.version, 1);
  assert.equal(docRevCita.version, 2);
});

test('UoW Firestore: preserva y reconstruye la forma original de la respuesta en replay (respuesta plana no envuelta)', async () => {
  const { cliente } = crearMockFirestore();
  const uow = crearUnidadDeTrabajoFirestore({
    cliente,
    crearLector: () => ({
      cuentas: { porUid: async () => crearCuentaBase() },
    } as unknown as LectorTransaccional),
    aplicarCambios: async () => {},
  });

  const contexto = crearContextoPrueba();
  const comando = crearComandoPrueba('e'.repeat(64));
  const respuestaPlana = Object.freeze({ id: 'paciente-pediatrico-123', estado: 'ACTIVO' });

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

test('UoW Firestore: atomicidad y rollback — si falla el commit, ninguna mutación encolada (datos, revisiones, auditoría, operación) persiste', async () => {
  const { cliente, store } = crearMockFirestore({
    fallarCommit: Object.assign(new Error('Commit rejected'), { code: 6 }),
  });

  const idPaciente = uuidPublico('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa');
  const idRevision = uuidPublico('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb');
  const idAuditoria = uuidPublico('cccccccc-cccc-4ccc-cccc-cccccccccccc');

  const uow = crearUnidadDeTrabajoFirestore({
    cliente,
    crearLector: () => ({
      cuentas: { porUid: async () => crearCuentaBase() },
    } as unknown as LectorTransaccional),
    aplicarCambios: async (transaction) => {
      // Encolar escritura válida en datos durante la transacción
      (transaction as { create: (ref: unknown, d: unknown) => void }).create(
        cliente.firestore.doc(`pacientes/${idPaciente}`),
        { revision: 1, nombres: 'Test', apellidos: 'Rollback' },
      );
    },
  });

  const contexto = crearContextoPrueba();
  const comando = crearComandoPrueba('f'.repeat(64));

  await assert.rejects(
    () => uow.ejecutar(contexto, comando, async () => ({
      tipo: 'CONFIRMAR',
      cambios: [],
      revisiones: [
        {
          id: idRevision,
          agregado: 'pacientes',
          recursoId: idPaciente,
          versionAnterior: versionPositiva(1),
          snapshotAnterior: { revision: 1 },
        },
      ],
      auditoria: [
        {
          id: idAuditoria,
          actorId: UUID_ACTOR,
          caso: 'PACIENTE_REGISTRADO',
          recursoId: idPaciente,
          fechaHora: comando.instante,
          correlacion: UUID_CORRELACION,
        },
      ],
      resultado: {
        httpStatus: 201,
        respuesta: { data: { id: idPaciente }, meta: { correlacion: UUID_CORRELACION } },
        correlacionOriginal: UUID_CORRELACION,
      },
    })),
    (err: unknown) => err instanceof ErrorDominio,
  );

  // Verificar que NINGUNA mutación encolada persistió en el almacén (rollback indivisible)
  assert.equal(store.has(`pacientes/${idPaciente}`), false);
  assert.equal(store.has(`pacientes/${idPaciente}/versiones/${idRevision}`), false);
  assert.equal(store.has(`auditoria/${idAuditoria}`), false);
  assert.equal(store.size, 0);
});
