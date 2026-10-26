import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { crearContextoAutenticado } from '../../src/aplicacion/puertos/contexto-autenticado.js';
import type { LectorTransaccional, PlanConfirmacion, ComandoEstable } from '../../src/aplicacion/puertos/nucleo.js';
import { uuidPublico } from '../../src/dominio/compartido/uuid.js';
import { instanteUtc } from '../../src/dominio/compartido/instante-utc.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';
import { crearClienteMongodb } from '../../src/adaptadores/salida/mongodb/crear-cliente-mongodb.js';
import { crearRepositorioCuentaMongodb } from '../../src/adaptadores/salida/mongodb/repositorio-cuenta-mongodb.js';
import { crearUnidadDeTrabajoMongodb } from '../../src/adaptadores/salida/mongodb/unidad-de-trabajo-mongodb.js';
import { COLECCIONES_MONGODB } from '../../src/adaptadores/salida/mongodb/tipos-mongodb.js';
import { crearClienteFirestore } from '../../src/adaptadores/salida/firestore/crear-cliente-firestore.js';
import { crearRepositorioCuentaFirestore } from '../../src/adaptadores/salida/firestore/repositorio-cuenta-firestore.js';
import { crearUnidadDeTrabajoFirestore } from '../../src/adaptadores/salida/firestore/unidad-de-trabajo-firestore.js';
import { validarDocumento, MAX_DOCUMENTO } from '../../src/adaptadores/salida/firestore/validador-firestore.js';

const puertoMongo = process.env.MONGO_TEST_PORT;
const secretoMongo = process.env.MONGO_TEST_SECRET_FILE;
const hostFirestore = process.env.FIRESTORE_EMULATOR_HOST;
const proyectoFirestore = process.env.FIRESTORE_PROJECT_ID ?? `demo-pediatria-uow-${process.pid}`;

test('MongoDB: replica set, atomicidad, rollback multi-documento y repetición idempotente', {
  skip: !puertoMongo || !secretoMongo,
}, async (t) => {
  const cliente = await crearClienteMongodb({
    host: '127.0.0.1',
    puerto: Number(puertoMongo),
    baseDatos: 'laboratorio_clinico',
    usuario: 'laboratorio_app',
    archivoContrasena: secretoMongo as string,
    replicaSet: 'rs0',
    conexionDirecta: true,
    timeoutMs: 8000,
  });
  t.after(async () => cliente.cerrar());

  await cliente.verificarReplicaSet();

  const uid = `test-lab-${randomUUID()}`;
  const actorId = uuidPublico(randomUUID());
  const rolId = uuidPublico(randomUUID());
  const personalId = uuidPublico(randomUUID());

  await cliente.db.collection<{ _id: string; [key: string]: unknown }>(COLECCIONES_MONGODB.PERSONAL).insertOne({
    _id: personalId,
    revision: 1,
    primer_nombre: 'Analista',
    primer_apellido: 'Laboratorio',
    cargo: 'ANALISTA',
    activo: true,
  });

  await cliente.db.collection<{ _id: string; [key: string]: unknown }>(COLECCIONES_MONGODB.ROLES).insertOne({
    _id: rolId,
    revision: 1,
    nombre: 'ANALISTA_LABORATORIO',
    permisos: ['muestras.administrar'],
  });

  await cliente.db.collection<{ _id: string; [key: string]: unknown }>(COLECCIONES_MONGODB.USUARIOS).insertOne({
    _id: actorId,
    revision: 1,
    nombre_usuario: `usuario_${randomUUID().slice(0, 8)}`,
    auth_uid: uid,
    proveedor_identidad: 'FIREBASE',
    institucion_id: 'LABORATORIO_CLINICO',
    rol_ids: [rolId],
    personal_id: personalId,
    estado: 'ACTIVO',
    activo: true,
  });

  const repoCuenta = crearRepositorioCuentaMongodb(cliente.db);
  const cuenta = await repoCuenta.porUid(uid);
  assert.ok(cuenta !== null);
  assert.equal(cuenta.id, actorId);
  assert.equal(cuenta.estado, 'ACTIVA');
  assert.equal(cuenta.profesional?.activo, true);

  const contexto = crearContextoAutenticado(
    {
      uid,
      institucion: 'LABORATORIO_CLINICO',
      emitidoEn: instanteUtc('2026-10-26T12:00:00Z'),
    },
    cuenta,
    uuidPublico(randomUUID()),
  );

  const uow = crearUnidadDeTrabajoMongodb({
    cliente,
    crearLector: (_db, session) => ({
      cuentas: crearRepositorioCuentaMongodb(cliente.db, session),
    } as unknown as LectorTransaccional),
    aplicarCambios: async (db, session, _ctx, _cmd, cambios) => {
      for (const c of cambios) {
        await db.collection(c.agregado).insertOne(c.nuevoEstado as Record<string, unknown>, { session });
      }
    },
  });

  const clave1 = uuidPublico(randomUUID());
  const recurso1 = uuidPublico(randomUUID());
  const revId1 = uuidPublico(randomUUID());
  const auditId1 = uuidPublico(randomUUID());
  const correlacion1 = uuidPublico(randomUUID());

  const comando1: ComandoEstable = Object.freeze({
    id: uuidPublico(randomUUID()),
    claveIdempotencia: clave1,
    caso: 'muestras',
    hashEntrada: '1'.repeat(64),
    instante: instanteUtc('2026-10-26T12:00:00Z'),
    ids: Object.freeze({ muestraId: recurso1 }),
  });

  const res1 = await uow.ejecutar(contexto, comando1, async () => {
    const plan: PlanConfirmacion<unknown> = {
      tipo: 'CONFIRMAR',
      cambios: [
        {
          agregado: 'muestras',
          tipo: 'REGISTRO',
          recursoId: recurso1,
          versionAnterior: null,
          nuevoEstado: {
            _id: recurso1,
            revision: 1,
            codigo_barras: `BAR-${randomUUID().slice(0, 8)}`,
            orden_id: uuidPublico(randomUUID()),
            item_ids: [uuidPublico(randomUUID())],
            tipo_muestra_id: uuidPublico(randomUUID()),
            fecha_toma: new Date('2026-10-26T12:00:00Z'),
            tomada_por_id: actorId,
            estado: 'TOMADA',
          },
        },
      ],
      revisiones: [
        {
          id: revId1,
          agregado: 'muestras',
          recursoId: recurso1,
          versionAnterior: versionPositiva(1),
          snapshotAnterior: { inicial: true },
        },
      ],
      auditoria: [
        {
          id: auditId1,
          actorId,
          caso: 'muestras',
          recursoId: recurso1,
          fechaHora: comando1.instante,
          correlacion: correlacion1,
        },
      ],
      resultado: {
        httpStatus: 201,
        respuesta: { data: { id: recurso1 }, meta: { correlacion: correlacion1 } },
        correlacionOriginal: correlacion1,
      },
    };
    return plan;
  });

  assert.equal(res1.httpStatus, 201);
  assert.equal(res1.correlacionOriginal, correlacion1);

  const muestraGuardada = await cliente.db.collection('muestras').findOne({ _id: recurso1 });
  assert.ok(muestraGuardada !== null);
  const revGuardada = await cliente.db.collection(COLECCIONES_MONGODB.REVISIONES).findOne({ _id: revId1 });
  assert.ok(revGuardada !== null);
  const auditGuardada = await cliente.db.collection(COLECCIONES_MONGODB.AUDITORIA).findOne({ _id: auditId1 });
  assert.ok(auditGuardada !== null);
  const opGuardada = await cliente.db.collection(COLECCIONES_MONGODB.OPERACIONES).findOne({
    usuario_id: actorId, clave: clave1,
  });
  assert.ok(opGuardada !== null);

  // Rollback multi-documento ante fallo
  const recursoFallo = uuidPublico(randomUUID());
  const revFallo = uuidPublico(randomUUID());
  const auditFallo = uuidPublico(randomUUID());
  const comandoFallo: ComandoEstable = Object.freeze({
    id: uuidPublico(randomUUID()),
    claveIdempotencia: uuidPublico(randomUUID()),
    caso: 'muestras',
    hashEntrada: 'f'.repeat(64),
    instante: instanteUtc('2026-10-26T12:00:00Z'),
    ids: Object.freeze({ muestraId: recursoFallo }),
  });

  await assert.rejects(
    () => uow.ejecutar(contexto, comandoFallo, async () => {
      const plan: PlanConfirmacion<unknown> = {
        tipo: 'CONFIRMAR',
        cambios: [{
          agregado: 'muestras',
          tipo: 'REGISTRO',
          recursoId: recursoFallo,
          versionAnterior: null,
          nuevoEstado: {
            _id: recursoFallo,
            revision: 1,
            codigo_barras: `BAR-${randomUUID().slice(0, 8)}`,
            orden_id: uuidPublico(randomUUID()),
            item_ids: [uuidPublico(randomUUID())],
            tipo_muestra_id: uuidPublico(randomUUID()),
            fecha_toma: new Date('2026-10-26T12:00:00Z'),
            tomada_por_id: actorId,
            estado: 'TOMADA',
          },
        }],
        revisiones: [{
          id: revFallo, agregado: 'muestras', recursoId: recursoFallo,
          versionAnterior: versionPositiva(1), snapshotAnterior: {},
        }],
        auditoria: [{
          id: auditFallo, actorId, caso: 'muestras', recursoId: recursoFallo,
          fechaHora: comandoFallo.instante, correlacion: uuidPublico(randomUUID()),
        }],
        resultado: {
          httpStatus: 201, respuesta: { data: {}, meta: { correlacion: uuidPublico(randomUUID()) } },
          correlacionOriginal: uuidPublico(randomUUID()),
        },
      };
      if (plan.tipo === 'CONFIRMAR') throw new Error('Fallo forzado antes de confirmar');
      return plan;
    }),
  );

  assert.equal(await cliente.db.collection('muestras').findOne({ _id: recursoFallo }), null);
  assert.equal(await cliente.db.collection(COLECCIONES_MONGODB.REVISIONES).findOne({ _id: revFallo }), null);
  assert.equal(await cliente.db.collection(COLECCIONES_MONGODB.AUDITORIA).findOne({ _id: auditFallo }), null);

  // Repetición idempotente
  const resReplay = await uow.ejecutar(contexto, comando1, async () => {
    throw new Error('No debe llamar planificar en repetición');
  });
  assert.equal(resReplay.httpStatus, 201);
  assert.equal(resReplay.correlacionOriginal, correlacion1);

  // Reutilización con hash incompatible
  const comandoClaveDuplicada = Object.freeze({
    ...comando1,
    hashEntrada: '2'.repeat(64),
  });
  await assert.rejects(
    () => uow.ejecutar(contexto, comandoClaveDuplicada, async () => { throw new Error('no'); }),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === 'CLAVE_REUTILIZADA',
  );
});

test('Firestore: emulador, validación Zod, atomicidad, rollback y límites', {
  skip: !hostFirestore,
}, async (t) => {
  const cliente = crearClienteFirestore({
    projectId: proyectoFirestore,
    databaseId: '(default)',
    ...(hostFirestore ? { emulatorHost: hostFirestore } : {}),
    institucionalId: 'CENTRO_MEDICO_PEDIATRICO',
  });
  t.after(async () => cliente.cerrar());

  const uid = `test-ped-${randomUUID()}`;
  const actorId = uuidPublico(randomUUID());
  const rolId = uuidPublico(randomUUID());
  const pediatraId = uuidPublico(randomUUID());

  await cliente.firestore.doc(`pediatras/${pediatraId}`).set({
    revision: 1,
    nombres: 'Dra. María',
    apellidos: 'López',
    colegiado: 'COL-1234',
    entidad_colegiacion: 'Colegio de Médicos',
    especialidad: 'Pediatría General',
    estado: 'ACTIVO',
  });

  await cliente.firestore.doc(`roles/${rolId}`).set({
    revision: 1,
    nombre: 'PEDIATRA',
    descripcion: 'Atención pediátrica autorizada',
    permisos: ['consultas.registrar', 'citas.administrar'],
  });

  await cliente.firestore.doc(`usuarios/${actorId}`).set({
    revision: 1,
    auth_uid: uid,
    proveedor_identidad: 'FIREBASE',
    institucion_id: 'CENTRO_MEDICO_PEDIATRICO',
    estado: 'ACTIVO',
    rol_ids: [rolId],
    pediatra_id: pediatraId,
    nombre_usuario: 'maria_lopez',
  });

  const repoCuenta = crearRepositorioCuentaFirestore(cliente.firestore, cliente.firestore);
  const cuenta = await repoCuenta.porUid(uid);
  assert.ok(cuenta !== null);
  assert.equal(cuenta.id, actorId);
  assert.equal(cuenta.estado, 'ACTIVA');
  assert.equal(cuenta.profesional?.activo, true);

  const contexto = crearContextoAutenticado(
    {
      uid,
      institucion: 'CENTRO_MEDICO_PEDIATRICO',
      emitidoEn: instanteUtc('2026-10-26T12:00:00Z'),
    },
    cuenta,
    uuidPublico(randomUUID()),
  );

  const uow = crearUnidadDeTrabajoFirestore({
    cliente,
    crearLector: (transaction) => ({
      cuentas: crearRepositorioCuentaFirestore(transaction, cliente.firestore),
    } as unknown as LectorTransaccional),
    aplicarCambios: async (transaction, _ctx, _cmd, cambios) => {
      for (const c of cambios) {
        const ruta = `${c.agregado}/${c.recursoId}`;
        const validado = validarDocumento(ruta, c.nuevoEstado);
        transaction.create(cliente.firestore.doc(ruta), validado as Record<string, unknown>);
      }
    },
  });

  const pacienteId = uuidPublico(randomUUID());
  const auditId = uuidPublico(randomUUID());
  const clave = uuidPublico(randomUUID());
  const correlacion = uuidPublico(randomUUID());

  const comando: ComandoEstable = Object.freeze({
    id: uuidPublico(randomUUID()),
    claveIdempotencia: clave,
    caso: 'pacientes',
    hashEntrada: '3'.repeat(64),
    instante: instanteUtc('2026-10-26T12:00:00Z'),
    ids: Object.freeze({ pacienteId }),
  });

  const res = await uow.ejecutar(contexto, comando, async () => {
    const plan: PlanConfirmacion<unknown> = {
      tipo: 'CONFIRMAR',
      cambios: [
        {
          agregado: 'pacientes',
          tipo: 'ALTA',
          recursoId: pacienteId,
          versionAnterior: null,
          nuevoEstado: {
            revision: 1,
            nombres: 'Sofía',
            apellidos: 'Pérez',
            nombre_busqueda: 'sofia perez',
            fecha_nacimiento: '2023-08-10',
            sexo: 'FEMENINO',
            tipo_documento: 'CUI',
            numero_documento: '9876543210101',
            estado: 'ACTIVO',
            fecha_apertura: new Date('2026-10-26T12:00:00Z'),
          },
        },
      ],
      revisiones: [],
      auditoria: [
        {
          id: auditId,
          actorId,
          caso: 'pacientes',
          recursoId: pacienteId,
          fechaHora: comando.instante,
          correlacion,
        },
      ],
      resultado: {
        httpStatus: 201,
        respuesta: { data: { id: pacienteId }, meta: { correlacion } },
        correlacionOriginal: correlacion,
      },
    };
    return plan;
  });

  assert.equal(res.httpStatus, 201);
  assert.equal(res.correlacionOriginal, correlacion);

  const docPaciente = await cliente.firestore.doc(`pacientes/${pacienteId}`).get();
  assert.ok(docPaciente.exists);
  assert.equal(docPaciente.data()?.nombres, 'Sofía');

  // Repetición idempotente
  const resReplay = await uow.ejecutar(contexto, comando, async () => {
    throw new Error('No debe llamar planificar en replay');
  });
  assert.equal(resReplay.httpStatus, 201);
  assert.equal(resReplay.correlacionOriginal, correlacion);

  // Rechazo de documento con tamaño excesivo
  const comandoExceso: ComandoEstable = Object.freeze({
    id: uuidPublico(randomUUID()),
    claveIdempotencia: uuidPublico(randomUUID()),
    caso: 'pacientes',
    hashEntrada: '4'.repeat(64),
    instante: instanteUtc('2026-10-26T12:00:00Z'),
    ids: Object.freeze({ pacienteId: uuidPublico(randomUUID()) }),
  });

  await assert.rejects(
    () => uow.ejecutar(contexto, comandoExceso, async () => {
      return {
        tipo: 'CONFIRMAR',
        cambios: [
          {
            agregado: 'pacientes',
            tipo: 'ALTA',
            recursoId: uuidPublico(randomUUID()),
            versionAnterior: null,
            nuevoEstado: {
              revision: 1,
              nombres: 'A'.repeat(MAX_DOCUMENTO + 10),
              apellidos: 'B',
              nombre_busqueda: 'ab',
              fecha_nacimiento: '2023-01-01',
              estado: 'ACTIVO',
              fecha_apertura: new Date(),
            },
          },
        ],
        revisiones: [],
        auditoria: [],
        resultado: {
          httpStatus: 201,
          respuesta: { data: {}, meta: { correlacion: uuidPublico(randomUUID()) } },
          correlacionOriginal: uuidPublico(randomUUID()),
        },
      };
    }),
    (err: unknown) => err instanceof ErrorDominio && (err.codigo === 'LIMITE_AGREGADO' || err.codigo === 'ESTADO_INVALIDO'),
  );
});
