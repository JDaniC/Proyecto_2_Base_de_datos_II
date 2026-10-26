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
import { crearRepositorioCuentaInstitucionalMongodb } from '../../src/adaptadores/salida/identidad/repositorio-cuenta-mongodb-institucional.js';
import { crearRepositorioCuentaInstitucionalFirestore } from '../../src/adaptadores/salida/identidad/repositorio-cuenta-firestore-institucional.js';
import { crearUnidadDeTrabajoMongodb } from '../../src/adaptadores/salida/mongodb/unidad-de-trabajo-mongodb.js';
import { COLECCIONES_MONGODB, type DocumentoOperacionMongo } from '../../src/adaptadores/salida/mongodb/tipos-mongodb.js';
import { crearClienteFirestore } from '../../src/adaptadores/salida/firestore/crear-cliente-firestore.js';
import { crearRepositorioCuentaFirestore } from '../../src/adaptadores/salida/firestore/repositorio-cuenta-firestore.js';
import { crearUnidadDeTrabajoFirestore } from '../../src/adaptadores/salida/firestore/unidad-de-trabajo-firestore.js';
import { validarDocumento, MAX_DOCUMENTO, claveOperacion } from '../../src/adaptadores/salida/firestore/validador-firestore.js';
import { AdministradorCuentasFirebase } from '../../src/adaptadores/salida/identidad/administrador-cuentas-firebase.js';
import { VerificadorIdentidadFirebase } from '../../src/adaptadores/salida/identidad/verificador-identidad-firebase.js';
import { getAuth } from 'firebase-admin/auth';
import { deleteApp, initializeApp } from 'firebase-admin/app';

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
  const solicitanteId = uuidPublico(randomUUID());
  await cliente.db.collection<{ _id: string; [key: string]: unknown }>(COLECCIONES_MONGODB.SOLICITANTES).insertOne({
    _id: solicitanteId,
    revision: 1,
    nombre_completo: 'Dra. Ana López',
    tipo: 'MEDICO',
    entidad_colegiacion: 'COLMED',
    numero_colegiado: 'COL-9988',
    institucion: 'Laboratorio Clínico',
    telefono: '+502 1234 5678',
    correo: 'ana.lopez@laboratorio.example.com',
    activo: true,
  });

  await cliente.db.collection<{ _id: string; [key: string]: unknown }>(COLECCIONES_MONGODB.ROLES).insertOne({
    _id: rolId,
    revision: 1,
    nombre: 'ANALISTA_LABORATORIO',
    permisos: ['muestras.administrar'],
  });
  const rolAdminId = uuidPublico(randomUUID());
  const uidAdmin = `test-admin-${randomUUID()}`;
  const idAdmin = uuidPublico(randomUUID());
  await cliente.db.collection<{ _id: string; [key: string]: unknown }>(COLECCIONES_MONGODB.ROLES).insertOne({
    _id: rolAdminId,
    revision: 1,
    nombre: 'ADMIN_INSTITUCIONAL',
    permisos: ['usuarios.administrar'],
  });
  await cliente.db.collection<{ _id: string; [key: string]: unknown }>(COLECCIONES_MONGODB.USUARIOS).insertOne({
    _id: idAdmin,
    revision: 1,
    nombre_usuario: `admin_${randomUUID().slice(0, 8)}`,
    auth_uid: uidAdmin,
    proveedor_identidad: 'FIREBASE',
    institucion_id: 'LABORATORIO_CLINICO',
    rol_ids: [rolAdminId],
    estado: 'ACTIVO',
    activo: true,
  });

  await cliente.db.collection<{ _id: string; [key: string]: unknown }>(COLECCIONES_MONGODB.USUARIOS).insertOne({
    _id: actorId,
    revision: 1,
    nombre_usuario: `usuario_${randomUUID().slice(0, 8)}`,
    auth_uid: uid,
    proveedor_identidad: 'FIREBASE',
    institucion_id: 'LABORATORIO_CLINICO',
    rol_ids: [rolId],
    solicitante_medico_id: solicitanteId,
    estado: 'ACTIVO',
    activo: true,
  });

  const repoCuenta = crearRepositorioCuentaMongodb(cliente.db);
  const cuenta = await repoCuenta.porUid(uid);
  assert.ok(cuenta !== null);
  assert.equal(cuenta.id, actorId);
  assert.equal(cuenta.estado, 'ACTIVA');
  assert.equal(cuenta.profesional?.id, solicitanteId);
  assert.equal(cuenta.profesional?.activo, true);

  const uidPendiente = `test-lab-pendiente-${randomUUID()}`;
  const actorPendiente = uuidPublico(randomUUID());
  const solicitantePendiente = uuidPublico(randomUUID());
  await cliente.db.collection<{ _id: string; [key: string]: unknown }>(COLECCIONES_MONGODB.SOLICITANTES).insertOne({
    _id: solicitantePendiente,
    revision: 1,
    nombre_completo: 'Dr. Mateo Prueba',
    tipo: 'MEDICO',
    entidad_colegiacion: 'COLMED',
    numero_colegiado: `COL-${randomUUID()}`,
    institucion: 'Laboratorio Clínico',
    telefono: '+502 1234 5678',
    correo: 'mateo.prueba@laboratorio.example.com',
    activo: true,
  });
  await cliente.db.collection<{ _id: string; [key: string]: unknown }>(COLECCIONES_MONGODB.USUARIOS).insertOne({
    _id: actorPendiente,
    revision: 1,
    nombre_usuario: `usuario_${randomUUID().slice(0, 8)}`,
    auth_uid: uidPendiente,
    proveedor_identidad: 'FIREBASE',
    institucion_id: 'LABORATORIO_CLINICO',
    rol_ids: [rolId],
    solicitante_medico_id: solicitantePendiente,
    estado: 'PENDIENTE',
    activo: false,
  });
  const repoInstitucional = crearRepositorioCuentaInstitucionalMongodb(cliente);
  const pendiente = await repoInstitucional.porUid(uidPendiente);
  assert.ok(pendiente);
  assert.equal(pendiente.estado, 'PENDIENTE');
  const auditoriaProvision = {
    actorUid: uidAdmin,
    evento: {
      id: uuidPublico(randomUUID()),
      actorId: idAdmin,
      caso: 'CUENTA_PROVISIONADA',
      recursoId: pendiente.id,
      fechaHora: instanteUtc('2026-10-26T18:00:00Z'),
      correlacion: uuidPublico(randomUUID()),
    },
  };
  const activaciones = await Promise.all([
    repoInstitucional.activarPendiente?.(uidPendiente, pendiente.version, auditoriaProvision),
    repoInstitucional.activarPendiente?.(uidPendiente, pendiente.version, auditoriaProvision),
  ]);
  assert.deepEqual(activaciones, [true, true]);
  const activa = await repoInstitucional.porUid(uidPendiente);
  assert.ok(activa);
  assert.equal(activa.estado, 'ACTIVA');
  assert.equal(activa.version, versionPositiva(2));
  const auditMongo = await cliente.db.collection<{ _id: string; accion: string; documento_id: string; usuario_id: string }>(COLECCIONES_MONGODB.AUDITORIA)
    .find({ _id: auditoriaProvision.evento.id }).toArray();
  assert.equal(auditMongo.length, 1);
  assert.equal(auditMongo[0]?.accion, 'CUENTA_PROVISIONADA');
  assert.equal(auditMongo[0]?.documento_id, pendiente.id);
  assert.equal(auditMongo[0]?.usuario_id, idAdmin);
  const uidRollback = `test-lab-audit-rollback-${randomUUID()}`;
  const idRollback = uuidPublico(randomUUID());
  await cliente.db.collection<{ _id: string; [key: string]: unknown }>(COLECCIONES_MONGODB.USUARIOS).insertOne({
    _id: idRollback,
    revision: 1,
    nombre_usuario: `rollback_${randomUUID().slice(0, 8)}`,
    auth_uid: uidRollback,
    proveedor_identidad: 'FIREBASE',
    institucion_id: 'LABORATORIO_CLINICO',
    rol_ids: [rolId],
    estado: 'PENDIENTE',
    activo: false,
  });
  const pendienteRollback = await repoInstitucional.porUid(uidRollback);
  assert.ok(pendienteRollback);
  await assert.rejects(() => repoInstitucional.activarPendiente!(uidRollback, pendienteRollback.version, {
    ...auditoriaProvision,
    evento: { ...auditoriaProvision.evento, recursoId: pendienteRollback.id },
  }));
  const rollbackConservado = await repoInstitucional.porUid(uidRollback);
  assert.ok(rollbackConservado);
  assert.equal(rollbackConservado.estado, 'PENDIENTE', 'el fallo al insertar auditoría revierte la activación');
  assert.equal(await cliente.db.collection(COLECCIONES_MONGODB.AUDITORIA).countDocuments({ _id: auditoriaProvision.evento.id }), 1);

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

  const recursoInvalido = uuidPublico(randomUUID());
  await assert.rejects(
    () => uow.ejecutar(contexto, comandoFallo, async () => {
      const plan: PlanConfirmacion<unknown> = {
        tipo: 'CONFIRMAR',
        cambios: [
          {
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
          },
          {
            agregado: 'muestras',
            tipo: 'REGISTRO',
            recursoId: recursoInvalido,
            versionAnterior: null,
            nuevoEstado: {
              _id: recursoInvalido,
              revision: 1,
              codigo_barras: `BAR-${randomUUID().slice(0, 8)}`,
              orden_id: uuidPublico(randomUUID()),
              item_ids: [uuidPublico(randomUUID())],
              tipo_muestra_id: uuidPublico(randomUUID()),
              fecha_toma: new Date('2026-10-26T12:00:00Z'),
              tomada_por_id: actorId,
              estado: 'ESTADO_INEXISTENTE_ESQUEMA_INVALIDO',
            },
          },
        ],
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
      return plan;
    }),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === 'ESTADO_INVALIDO',
  );

  assert.equal(await cliente.db.collection('muestras').findOne({ _id: recursoFallo }), null);
  assert.equal(await cliente.db.collection('muestras').findOne({ _id: recursoInvalido }), null);
  assert.equal(await cliente.db.collection(COLECCIONES_MONGODB.REVISIONES).findOne({ _id: revFallo }), null);
  assert.equal(await cliente.db.collection(COLECCIONES_MONGODB.AUDITORIA).findOne({ _id: auditFallo }), null);
  const idOpMongoFallo = `${contexto.cuenta.id}__${comandoFallo.caso}__${comandoFallo.claveIdempotencia}`;
  assert.equal(await cliente.db.collection<DocumentoOperacionMongo>(COLECCIONES_MONGODB.OPERACIONES).findOne({ _id: idOpMongoFallo }), null);
  assert.equal(await cliente.db.collection<DocumentoOperacionMongo>(COLECCIONES_MONGODB.OPERACIONES).findOne({ clave: comandoFallo.claveIdempotencia }), null);

  // Repetición idempotente
  const resReplay = await uow.ejecutar(contexto, comando1, async () => {
    throw new Error('No debe llamar planificar en repetición');
  });
  assert.equal(resReplay.httpStatus, 201);
  assert.equal(resReplay.correlacionOriginal, correlacion1);

  // Respuesta plana no envuelta: asegurar igualdad exacta entre primera ejecución y replay
  const clavePlana = uuidPublico(randomUUID());
  const comandoPlano: ComandoEstable = Object.freeze({
    id: uuidPublico(randomUUID()),
    claveIdempotencia: clavePlana,
    caso: 'muestras',
    hashEntrada: '7'.repeat(64),
    instante: instanteUtc('2026-10-26T12:00:00Z'),
    ids: Object.freeze({ muestraId: uuidPublico(randomUUID()) }),
  });
  const respuestaPlana = Object.freeze({ id: comandoPlano.ids.muestraId, estado: 'TOMADA' });

  const resPlano1 = await uow.ejecutar(contexto, comandoPlano, async () => ({
    tipo: 'CONFIRMAR',
    cambios: [],
    revisiones: [],
    auditoria: [],
    resultado: {
      httpStatus: 201,
      respuesta: respuestaPlana,
      correlacionOriginal: uuidPublico(randomUUID()),
    },
  }));
  assert.deepEqual(resPlano1.respuesta, respuestaPlana);

  const resPlanoReplay = await uow.ejecutar(contexto, comandoPlano, async () => {
    throw new Error('No debe llamar planificar en replay');
  });
  assert.deepEqual(resPlanoReplay.respuesta, resPlano1.respuesta);
  assert.deepEqual(resPlanoReplay.respuesta, respuestaPlana);

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
  const rolAdminId = uuidPublico(randomUUID());
  const uidAdmin = `test-admin-${randomUUID()}`;
  const idAdmin = uuidPublico(randomUUID());
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
  await cliente.firestore.doc(`roles/${rolAdminId}`).set({
    revision: 1,
    nombre: 'ADMIN_INSTITUCIONAL',
    descripcion: 'Provisión local de cuentas',
    permisos: ['usuarios.administrar'],
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
  await cliente.firestore.doc(`usuarios/${idAdmin}`).set({
    revision: 1,
    auth_uid: uidAdmin,
    proveedor_identidad: 'FIREBASE',
    institucion_id: 'CENTRO_MEDICO_PEDIATRICO',
    estado: 'ACTIVO',
    rol_ids: [rolAdminId],
    nombre_usuario: `admin_${randomUUID().slice(0, 8)}`,
  });

  const repoCuenta = crearRepositorioCuentaFirestore(cliente.firestore, cliente.firestore);
  const cuenta = await repoCuenta.porUid(uid);
  assert.ok(cuenta !== null);
  assert.equal(cuenta.id, actorId);
  assert.equal(cuenta.estado, 'ACTIVA');
  assert.equal(cuenta.profesional?.activo, true);

  const uidPendiente = `test-ped-pendiente-${randomUUID()}`;
  const actorPendienteId = uuidPublico(randomUUID());
  await cliente.firestore.doc(`usuarios/${actorPendienteId}`).set({
    revision: 1,
    auth_uid: uidPendiente,
    proveedor_identidad: 'FIREBASE',
    institucion_id: 'CENTRO_MEDICO_PEDIATRICO',
    estado: 'PENDIENTE',
    rol_ids: [rolId],
    pediatra_id: pediatraId,
    nombre_usuario: `pediatra_${randomUUID().slice(0, 8)}`,
  });
  const repoInstitucional = crearRepositorioCuentaInstitucionalFirestore(cliente);
  const cuentaPendiente = await repoInstitucional.porUid(uidPendiente);
  assert.ok(cuentaPendiente);
  assert.equal(cuentaPendiente.estado, 'PENDIENTE');
  const auditoriaProvision = {
    actorUid: uidAdmin,
    evento: {
      id: uuidPublico(randomUUID()),
      actorId: idAdmin,
      caso: 'CUENTA_PROVISIONADA',
      recursoId: cuentaPendiente.id,
      fechaHora: instanteUtc('2026-10-26T18:00:00Z'),
      correlacion: uuidPublico(randomUUID()),
    },
  };
  const activaciones = await Promise.all([
    repoInstitucional.activarPendiente?.(uidPendiente, cuentaPendiente.version, auditoriaProvision),
    repoInstitucional.activarPendiente?.(uidPendiente, cuentaPendiente.version, auditoriaProvision),
  ]);
  assert.deepEqual(activaciones, [true, true]);
  const cuentaActivada = await repoInstitucional.porUid(uidPendiente);
  assert.ok(cuentaActivada);
  assert.equal(cuentaActivada.estado, 'ACTIVA');
  assert.equal(cuentaActivada.version, versionPositiva(2));
  const auditFirestore = await cliente.firestore.doc(`auditoria/${auditoriaProvision.evento.id}`).get();
  assert.equal(auditFirestore.exists, true);
  assert.equal(auditFirestore.get('accion'), 'CUENTA_PROVISIONADA');
  assert.equal(auditFirestore.get('recurso_id'), cuentaPendiente.id);
  assert.equal(auditFirestore.get('usuario_id'), idAdmin);
  const uidRollback = `test-ped-audit-rollback-${randomUUID()}`;
  const idRollback = uuidPublico(randomUUID());
  await cliente.firestore.doc(`usuarios/${idRollback}`).set({
    revision: 1,
    auth_uid: uidRollback,
    proveedor_identidad: 'FIREBASE',
    institucion_id: 'CENTRO_MEDICO_PEDIATRICO',
    estado: 'PENDIENTE',
    rol_ids: [rolId],
    pediatra_id: pediatraId,
    nombre_usuario: `rollback_${randomUUID().slice(0, 8)}`,
  });
  const pendienteRollback = await repoInstitucional.porUid(uidRollback);
  assert.ok(pendienteRollback);
  await assert.rejects(() => repoInstitucional.activarPendiente!(uidRollback, pendienteRollback.version, {
    ...auditoriaProvision,
    evento: { ...auditoriaProvision.evento, recursoId: pendienteRollback.id },
  }));
  const rollbackConservado = await repoInstitucional.porUid(uidRollback);
  assert.ok(rollbackConservado);
  assert.equal(rollbackConservado.estado, 'PENDIENTE', 'el fallo al crear auditoría revierte la activación');
  assert.equal((await cliente.firestore.collection('auditoria').get()).size, 1);

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

  // Respuesta plana no envuelta en Firestore: asegurar igualdad exacta entre primera ejecución y replay
  const clavePlanaFs = uuidPublico(randomUUID());
  const comandoPlanoFs: ComandoEstable = Object.freeze({
    id: uuidPublico(randomUUID()),
    claveIdempotencia: clavePlanaFs,
    caso: 'pacientes',
    hashEntrada: '8'.repeat(64),
    instante: instanteUtc('2026-10-26T12:00:00Z'),
    ids: Object.freeze({ pacienteId: uuidPublico(randomUUID()) }),
  });
  const respuestaPlanaFs = Object.freeze({ id: comandoPlanoFs.ids.pacienteId, registrado: true });

  const resPlanoFs1 = await uow.ejecutar(contexto, comandoPlanoFs, async () => ({
    tipo: 'CONFIRMAR',
    cambios: [],
    revisiones: [],
    auditoria: [],
    resultado: {
      httpStatus: 201,
      respuesta: respuestaPlanaFs,
      correlacionOriginal: uuidPublico(randomUUID()),
    },
  }));
  assert.deepEqual(resPlanoFs1.respuesta, respuestaPlanaFs);

  const resPlanoFsReplay = await uow.ejecutar(contexto, comandoPlanoFs, async () => {
    throw new Error('No debe llamar planificar en replay');
  });
  assert.deepEqual(resPlanoFsReplay.respuesta, resPlanoFs1.respuesta);
  assert.deepEqual(resPlanoFsReplay.respuesta, respuestaPlanaFs);

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

  // Rollback real multi-documento en Firestore emulator
  const pacienteRollbackId = uuidPublico(randomUUID());
  const pacienteExistenteId = uuidPublico(randomUUID());
  const revisionRollbackId = uuidPublico(randomUUID());
  const auditoriaRollbackId = uuidPublico(randomUUID());
  const claveRollback = uuidPublico(randomUUID());
  const correlacionRollback = uuidPublico(randomUUID());

  // 1. Pre-crear documento en el emulador para forzar fallo ALREADY_EXISTS en transaction.create durante el commit
  await cliente.firestore.doc(`pacientes/${pacienteExistenteId}`).set({
    revision: 1,
    nombres: 'Existente',
    apellidos: 'Original',
    nombre_busqueda: 'existente original',
    fecha_nacimiento: '2020-01-01',
    sexo: 'MASCULINO',
    estado: 'ACTIVO',
    fecha_apertura: new Date('2026-10-26T12:00:00Z'),
  });

  const comandoRollback: ComandoEstable = Object.freeze({
    id: uuidPublico(randomUUID()),
    claveIdempotencia: claveRollback,
    caso: 'pacientes',
    hashEntrada: '7'.repeat(64),
    instante: instanteUtc('2026-10-26T12:00:00Z'),
    ids: Object.freeze({ pacienteId: pacienteRollbackId }),
  });

  await assert.rejects(
    () => uow.ejecutar(contexto, comandoRollback, async () => ({
      tipo: 'CONFIRMAR',
      cambios: [
        {
          agregado: 'pacientes',
          tipo: 'ALTA',
          recursoId: pacienteRollbackId,
          versionAnterior: null,
          nuevoEstado: {
            revision: 1,
            nombres: 'Carlos',
            apellidos: 'Rollback',
            nombre_busqueda: 'carlos rollback',
            fecha_nacimiento: '2021-05-15',
            sexo: 'MASCULINO',
            tipo_documento: 'CUI',
            numero_documento: '1234567890101',
            estado: 'ACTIVO',
            fecha_apertura: new Date('2026-10-26T12:00:00Z'),
          },
        },
        {
          agregado: 'pacientes',
          tipo: 'ALTA',
          recursoId: pacienteExistenteId, // Forzará ALREADY_EXISTS en transaction.create durante el commit
          versionAnterior: null,
          nuevoEstado: {
            revision: 1,
            nombres: 'Duplicado',
            apellidos: 'Fallido',
            nombre_busqueda: 'duplicado fallido',
            fecha_nacimiento: '2021-05-15',
            sexo: 'MASCULINO',
            tipo_documento: 'CUI',
            numero_documento: '9999999990101',
            estado: 'ACTIVO',
            fecha_apertura: new Date('2026-10-26T12:00:00Z'),
          },
        },
      ],
      revisiones: [
        {
          id: revisionRollbackId,
          agregado: 'pacientes',
          recursoId: pacienteRollbackId,
          versionAnterior: versionPositiva(1),
          snapshotAnterior: { revision: 1, nombres: 'Carlos' },
        },
      ],
      auditoria: [
        {
          id: auditoriaRollbackId,
          actorId,
          caso: 'pacientes',
          recursoId: pacienteRollbackId,
          fechaHora: comandoRollback.instante,
          correlacion: correlacionRollback,
        },
      ],
      resultado: {
        httpStatus: 201,
        respuesta: { data: { id: pacienteRollbackId }, meta: { correlacion: correlacionRollback } },
        correlacionOriginal: correlacionRollback,
      },
    })),
    (err: unknown) => err instanceof ErrorDominio,
  );

  // 2. Verificar en el emulador real que NINGÚN documento encolado persistió tras el rechazo de commit
  const docNuevoCheck = await cliente.firestore.doc(`pacientes/${pacienteRollbackId}`).get();
  assert.equal(docNuevoCheck.exists, false, 'El paciente nuevo no debe persistir tras rollback');

  const docRevCheck = await cliente.firestore.doc(`pacientes/${pacienteRollbackId}/versiones/${revisionRollbackId}`).get();
  assert.equal(docRevCheck.exists, false, 'La versión histórica no debe persistir tras rollback');

  const docAuditCheck = await cliente.firestore.doc(`auditoria/${auditoriaRollbackId}`).get();
  assert.equal(docAuditCheck.exists, false, 'El evento de auditoría no debe persistir tras rollback');

  const claveOpRollback = claveOperacion(
    'CENTRO_MEDICO_PEDIATRICO',
    contexto.cuenta.id,
    comandoRollback.caso,
    claveRollback,
  );
  const docOpCheck = await cliente.firestore.doc(`operaciones/${claveOpRollback}`).get();
  assert.equal(docOpCheck.exists, false, 'El registro de operación no debe persistir tras rollback');

  // El documento preexistente debe conservar su estado original
  const docExistenteCheck = await cliente.firestore.doc(`pacientes/${pacienteExistenteId}`).get();
  assert.ok(docExistenteCheck.exists);
  assert.equal(docExistenteCheck.data()?.nombres, 'Existente');
});

test('Firebase Auth emulator: claim canónico, verificación de revocación y logout', {
  skip: !process.env.FIREBASE_AUTH_EMULATOR_HOST,
}, async (t) => {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST as string;
  const app = initializeApp({ projectId: 'demo-bdii-pediatria' }, `auth-test-${randomUUID()}`);
  const auth = getAuth(app);
  const email = `test-${randomUUID()}@example.invalid`;
  const password = `Test-${randomUUID()}-Aa9!`;
  const user = await auth.createUser({ email, password }).catch(async (error: unknown) => {
    await deleteApp(app);
    throw error;
  });
  t.after(async () => {
    try { await auth.deleteUser(user.uid); } finally { await deleteApp(app); }
  });
  const uid = user.uid;
  const administrador = new AdministradorCuentasFirebase(auth);
  await administrador.asegurarClaimInstitucion(uid, 'HOSPITAL_GENERAL');

  const inicioSesion = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const respuesta = await inicioSesion.json() as { idToken?: unknown; error?: { message?: unknown } };
  assert.equal(inicioSesion.ok, true,
    `el emulador debe autenticar el usuario sintético (${inicioSesion.status}, ${String(respuesta.error?.message ?? 'sin código')})`);
  assert.equal(typeof respuesta.idToken, 'string');
  const token = respuesta.idToken as string;

  const verificador = new VerificadorIdentidadFirebase(auth);
  const identidad = await verificador.verificar(token);
  assert.equal(identidad.uid, uid);
  assert.equal(identidad.institucion, 'HOSPITAL_GENERAL');

  await new Promise((resolve) => setTimeout(resolve, 1100));
  await verificador.revocarSesiones(uid);
  await assert.rejects(
    () => verificador.verificar(token),
    (error: unknown) => error instanceof ErrorDominio && error.codigo === 'NO_AUTENTICADO',
  );
});
