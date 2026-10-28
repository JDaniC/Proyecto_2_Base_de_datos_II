import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash, randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFile as execFileCallback} from 'node:child_process';
import {promisify} from 'node:util';
import {Long, MongoClient, type ClientSession} from 'mongodb';
import {crearClienteMongodb} from '../../src/adaptadores/salida/mongodb/crear-cliente-mongodb.js';
import {crearBundlePacientesMongodb} from '../../src/adaptadores/salida/mongodb/pacientes/crear-bundle-pacientes-mongodb.js';
import type {DocumentoPacienteMongo} from '../../src/adaptadores/salida/mongodb/pacientes/mapear-paciente-mongodb.js';
import type {ClienteMongodb} from '../../src/adaptadores/salida/mongodb/tipos-mongodb.js';
import {crearContextoAutenticado, type ContextoAutenticado} from '../../src/aplicacion/puertos/contexto-autenticado.js';
import type {BundleInstitucional} from '../../src/aplicacion/puertos/bundle-institucional.js';
import type {AltaPacienteEntrada} from '../../src/aplicacion/casos-uso/pacientes/dtos-pacientes.js';
import {RegistrarPaciente} from '../../src/aplicacion/casos-uso/pacientes/registrar-paciente.js';
import {ActualizarPaciente} from '../../src/aplicacion/casos-uso/pacientes/actualizar-paciente.js';
import {BuscarPacientes} from '../../src/aplicacion/casos-uso/pacientes/buscar-pacientes.js';
import {ConsultarPaciente} from '../../src/aplicacion/casos-uso/pacientes/consultar-paciente.js';
import {uuidPublico} from '../../src/dominio/compartido/uuid.js';
import {instanteUtc} from '../../src/dominio/compartido/instante-utc.js';
import {ErrorDominio} from '../../src/dominio/compartido/error-dominio.js';

const execFile = promisify(execFileCallback);
const port = process.env.MONGO_TEST_PORT;
const secret = process.env.MONGO_TEST_SECRET_FILE;
const adminSecret = process.env.MONGO_ADMIN_TEST_SECRET_FILE;
const container = process.env.MONGO_TEST_CONTAINER;
const id = () => uuidPublico(randomUUID());
const dependencies = {
  reloj: {ahora: () => instanteUtc('2026-10-27T16:00:00.000Z')}, ids: {nuevo: id},
  hash: {sha256: async (text: string) => createHash('sha256').update(text).digest('hex')},
};
const registrar = new RegistrarPaciente(dependencies);
const actualizar = new ActualizarPaciente(dependencies);
const buscar = new BuscarPacientes();
const consultar = new ConsultarPaciente();
const errorCodigo = (codigo: string) => (e: unknown) => e instanceof ErrorDominio && e.codigo === codigo;

test('E02-P2-01 MongoDB real: migración, pacientes, identidad, búsqueda, carreras y rollback', {
  skip: !port || !secret || !adminSecret || !container,
}, async (t) => {
  assert.match(container!, /^bdii-e02-p2-01-[a-f0-9]{10}-mongodb-1$/, 'solo contenedores aleatorios del runner aislado');
  const config = {host: '127.0.0.1', puerto: Number(port), baseDatos: 'laboratorio_clinico', usuario: 'laboratorio_app', archivoContrasena: secret!, replicaSet: 'rs0', conexionDirecta: true, timeoutMs: 5000};
  const cliente = await crearClienteMongodb(config);
  const admin = new MongoClient(`mongodb://127.0.0.1:${port}/?directConnection=true`, {auth: {username: 'mongo_admin', password: readFileSync(adminSecret!, 'utf8').trim()}, authSource: 'admin'});
  await admin.connect();
  t.after(async () => {await cliente.cerrar(); await admin.close();});
  const db = cliente.db;
  const adminDb = admin.db('laboratorio_clinico');
  let bundle = await crearBundlePacientesMongodb(cliente);
  const counts = async () => Promise.all(['pacientes', 'identidades_paciente', 'revisiones', 'auditoria', 'operaciones'].map((c) => db.collection(c).countDocuments()));

  async function actor(permiso = true): Promise<ContextoAutenticado> {
    const actorId = id(); const uid = `sintetico-${randomUUID()}`;
    const nombreRol = permiso ? 'SECRETARIA' : 'ANALISTA_LABORATORIO';
    const existente = await db.collection<{_id: string}>('roles').findOne({nombre: nombreRol});
    const rol = existente?._id ?? id();
    if (!existente) await db.collection<{_id: string; [key: string]: unknown}>('roles').insertOne({_id: rol, revision: 1, nombre: nombreRol, permisos: permiso ? ['pacientes.administrar'] : []});
    await db.collection<{_id: string; [key: string]: unknown}>('usuarios').insertOne({_id: actorId, revision: 1, auth_uid: uid, proveedor_identidad: 'FIREBASE', institucion_id: 'LABORATORIO_CLINICO', rol_ids: [rol], estado: 'ACTIVO', activo: true, nombre_usuario: uid});
    const cuenta = await bundle.cuenta!.porUid(uid);
    assert.ok(cuenta);
    return crearContextoAutenticado({uid, institucion: 'LABORATORIO_CLINICO', emitidoEn: dependencies.reloj.ahora()}, cuenta, id());
  }
  const contexto = await actor();
  const entrada = (extra: Partial<AltaPacienteEntrada> = {}): AltaPacienteEntrada => ({nombres: 'Ana María', apellidos: 'López Prueba', fecha_nacimiento: '2000-02-29', sexo: 'FEMENINO', ...extra});
  const alta = (datos: Partial<AltaPacienteEntrada> = {}, clave = id(), b: BundleInstitucional = bundle) => registrar.ejecutar({contexto, bundle: b, entrada: entrada(datos), claveIdempotencia: clave});
  const pagina = (q: string, extra: {cursor?: string; limite?: number; orden?: 'ASC' | 'DESC'; estado?: 'ACTIVO' | 'ARCHIVADO' | 'TODOS'} = {}) => buscar.ejecutar({contexto, bundle, entrada: {q, ...extra}});

  async function ejecutarScript(relative: string, nombreBase = 'laboratorio_clinico') {
    const target = '/tmp/bdii-e02-script.js';
    await execFile('docker', ['cp', resolve('..', relative), `${container}:${target}`], {timeout: 30_000});
    const js = `const fs=require('node:fs'); db.getSiblingDB('admin').auth('mongo_admin',fs.readFileSync('/run/secrets/mongo_admin_password','utf8').trim()); load('${target}');`;
    return execFile('docker', ['exec', '-e', `MONGO_LAB_DB=${nombreBase}`, container!, 'mongosh', '--norc', '--quiet', '--eval', js], {timeout: 30_000});
  }
  const migration = () => ejecutarScript('Database/migrations/003_pacientes_busqueda_mongodb.js');
  const legado = id();
  const secundario = id();
  const fechaOriginal = new Date('2020-01-02T03:04:05Z');
  const historico = {id_historial: id(), numero_historial: 'LEGADO-001', fecha_apertura: fechaOriginal, estado: 'ACTIVO'};
  const documentoLegado = {
    _id: legado, revision: 3, codigo_paciente: 'CODIGO-HISTORICO-001',
    primer_nombre: 'Á'.repeat(80), segundo_nombre: 'María', primer_apellido: 'L'.repeat(80), segundo_apellido: 'Prueba',
    nombre_busqueda: 'antigua clave preservada', tipo_documento: 'DPI', numero_documento: 'X'.repeat(60),
    sexo_referencia: 'NO_DECLARADO', direccion: 'Dirección heredada '.repeat(40),
    contactos: [{contacto_id: id(), tipo: 'TELEFONO', valor: '55550000', es_principal: true},
      {contacto_id: secundario, tipo: 'TELEFONO', valor: '55559999', es_principal: false}],
    fecha_registro: fechaOriginal, activo: true, historial: historico,
  };

  await t.test('instalación nueva y migración existente: falla tardía, recuperación e idempotencia sin pérdida', async () => {
    assert.ok(bundle.pacientes && bundle.uow, 'el inicializador nuevo permite construir el bundle vacío');
    const info = (await adminDb.listCollections({name: 'pacientes'}, {nameOnly: false}).toArray())[0]!;
    const validator = structuredClone(info.options!.validator!);
    delete validator.$and[0].$jsonSchema.properties.claves_nombre;
    delete validator.$and[0].$jsonSchema.properties.numero_busqueda;
    await adminDb.command({collMod: 'pacientes', validator});
    await adminDb.collection('pacientes').dropIndex('ix_paciente_prefijos');
    await adminDb.collection('pacientes').dropIndex('ix_paciente_numero_busqueda');
    await adminDb.collection<{_id: string; [key: string]: unknown}>('pacientes').insertOne(documentoLegado);
    await adminDb.collection<{_id: string; [key: string]: unknown}>('pacientes').insertOne({...documentoLegado, _id: id(), codigo_paciente: 'LEGADO-002', tipo_documento: 'PASAPORTE', numero_documento: 'ABC-123', historial: {...historico, id_historial: id(), numero_historial: 'LEGADO-002'}});
    await adminDb.collection('pacientes').createIndex({contactos: 1}, {name: 'ix_legado_conservado'});
    await assert.rejects(() => crearBundlePacientesMongodb(cliente), errorCodigo('PERSISTENCIA_NO_DISPONIBLE'));
    await adminDb.collection('pacientes').createIndex({claves_nombre: 1}, {name: 'fallo_inyectado', unique: true, sparse: true});
    await assert.rejects(migration);
    assert.equal((await db.collection('pacientes').findOne({_id: legado as never}))?.claves_nombre, undefined);
    assert.equal(await db.collection('identidades_paciente').countDocuments(), 0, 'rollback total de reservas y backfill');
    await adminDb.collection('pacientes').dropIndex('fallo_inyectado');
    await migration();
    const antes = await adminDb.collection('pacientes').find().sort({_id: 1}).toArray();
    const reservasAntes = await adminDb.collection('identidades_paciente').find().sort({_id: 1}).toArray();
    await migration();
    assert.deepEqual(await adminDb.collection('pacientes').find().sort({_id: 1}).toArray(), antes);
    assert.deepEqual(await adminDb.collection('identidades_paciente').find().sort({_id: 1}).toArray(), reservasAntes);
    const original = await db.collection<DocumentoPacienteMongo>('pacientes').findOne({_id: legado});
    assert.deepEqual(original!.contactos, documentoLegado.contactos);
    assert.deepEqual(original!.historial, historico);
    assert.equal(original!.nombre_busqueda, documentoLegado.nombre_busqueda);
    assert.equal(original!.numero_documento, documentoLegado.numero_documento);
    assert.equal(original!.revision, 3);
    assert.ok((await adminDb.collection('pacientes').listIndexes().toArray()).some((i) => i.name === 'ix_legado_conservado'));
    await ejecutarScript('Database/laboratorio_clinico_mongodb.js');
    bundle = await crearBundlePacientesMongodb(cliente);
  });

  await t.test('preflight rechaza duplicados normalizados antes de modificar una base existente', async () => {
    const otra = admin.db('laboratorio_conflicto');
    const info = (await adminDb.listCollections({name: 'pacientes'}, {nameOnly: false}).toArray())[0]!;
    await otra.createCollection('pacientes', {validator: info.options!.validator!, validationLevel: 'strict', validationAction: 'error'});
    await otra.createCollection('identidades_paciente');
    for (const [i, numero] of ['AB-999', 'AB999'].entries()) await otra.collection<{_id: string; [key: string]: unknown}>('pacientes').insertOne({...documentoLegado, _id: id(), codigo_paciente: `COLISION-${i}`, tipo_documento: 'PASAPORTE', numero_documento: numero, historial: {...historico, id_historial: id()}});
    const before = await otra.collection('pacientes').find().toArray();
    await assert.rejects(() => ejecutarScript('Database/migrations/003_pacientes_busqueda_mongodb.js', 'laboratorio_conflicto'));
    assert.deepEqual(await otra.collection('pacientes').find().toArray(), before);
    assert.equal(await otra.collection('identidades_paciente').countDocuments(), 0);
  });

  await t.test('lectura legada conserva grupos largos, sexo previo, fecha desconocida y código; búsqueda exacta normalizada', async () => {
    const p = await consultar.ejecutar({contexto, bundle, id: legado});
    assert.equal(p.nombres, `${'Á'.repeat(80)} María`);
    assert.equal(p.fecha_nacimiento, null);
    assert.equal(p.sexo, 'NO_DECLARADO');
    assert.equal(p.codigo_legible, documentoLegado.codigo_paciente);
    assert.equal((await pagina('María')).data.some((p) => p.id === legado), true);
    assert.equal((await pagina('X'.repeat(60))).data[0]?.id, legado);
    assert.equal((await pagina('ABC 123')).data.length, 1);
    assert.equal((await pagina('ABC')).data.length, 0, 'el documento requiere coincidencia completa');
    for (const field of ['_id', 'revision', 'contactos', 'historial', 'claves_nombre', 'nombre_busqueda']) assert.equal(field in p, false);
  });

  await t.test('alta, identidad posterior y retiro conservan UUID/código, apertura y revisiones', async () => {
    const nuevo = await alta({telefono: '55551111', correo: 'ejemplo@example.test'});
    const p = nuevo.respuesta;
    const editado = await actualizar.ejecutar({contexto, bundle, id: uuidPublico(p.id), claveIdempotencia: id(), cambios: {version_esperada: 1, identificacion: {tipo: 'CUI', numero: '1234-5678'}}});
    assert.equal(editado.respuesta.id, p.id); assert.equal(editado.respuesta.codigo_legible, p.codigo_legible);
    assert.equal((await pagina('1234 5678')).data[0]?.id, p.id);
    const retirado = await actualizar.ejecutar({contexto, bundle, id: uuidPublico(p.id), claveIdempotencia: id(), cambios: {version_esperada: 2, identificacion: null, correo: null}});
    assert.equal(retirado.respuesta.identificacion, undefined); assert.equal(retirado.respuesta.correo, undefined);
    assert.equal(await db.collection('identidades_paciente').countDocuments({paciente_id: p.id}), 0);
    assert.equal(await db.collection('revisiones').countDocuments({recurso_id: p.id}), 2);
    const doc = await db.collection<DocumentoPacienteMongo>('pacientes').findOne({_id: p.id});
    assert.ok(doc?.historial.id_historial); assert.equal(doc?.revision, 3);
  });

  await t.test('PATCH parcial conserva secundarios, IDs, cabecera y campos legados; retiro de identidad legada', async () => {
    await actualizar.ejecutar({contexto, bundle, id: legado, claveIdempotencia: id(), cambios: {version_esperada: 3, telefono: '55552222', identificacion: null}});
    const doc = (await db.collection<DocumentoPacienteMongo>('pacientes').findOne({_id: legado}))!;
    assert.deepEqual(doc.contactos.find((c) => c.contacto_id === secundario), documentoLegado.contactos[1]);
    assert.equal(doc.contactos.find((c) => c.es_principal)?.contacto_id, documentoLegado.contactos[0]!.contacto_id);
    assert.equal(doc.segundo_nombre, 'María'); assert.deepEqual(doc.historial, historico);
    assert.equal(doc.direccion, documentoLegado.direccion); assert.equal(doc.sexo_referencia, 'NO_DECLARADO');
    assert.equal(doc.fecha_nacimiento, undefined); assert.equal(doc.numero_documento, undefined);
    assert.equal(await db.collection('identidades_paciente').countDocuments({paciente_id: legado}), 0);
    const revision = await db.collection('revisiones').findOne({recurso_id: legado, version: 3});
    assert.equal(revision!.contenido_anterior.fechaNacimiento, null);
    assert.equal(revision!.contenido_anterior.identificacion.numero, documentoLegado.numero_documento);
  });

  await t.test('idempotencia concurrente sin documento: misma respuesta, un paciente y operación', async () => {
    const before = await counts(); const clave = id();
    const [a, b] = await Promise.all([alta({}, clave), alta({}, clave)]);
    assert.deepEqual(a, b);
    const after = await counts();
    assert.deepEqual(after.map((v, i) => v - before[i]!), [1, 0, 0, 1, 1]);
    await assert.rejects(() => alta({nombres: 'Otra intención'}, clave), errorCodigo('CLAVE_REUTILIZADA'));
  });

  await t.test('cambiar solo el formato del documento conserva su reserva canónica y la representación capturada', async () => {
    const p = (await alta({identificacion: {tipo: 'PASAPORTE', numero: 'FORMATO-123'}})).respuesta;
    const antes = await db.collection('identidades_paciente').findOne({paciente_id: p.id});
    const editado = await actualizar.ejecutar({contexto, bundle, id: uuidPublico(p.id), claveIdempotencia: id(), cambios: {version_esperada: 1, identificacion: {tipo: 'PASAPORTE', numero: 'FORMATO 123'}}});
    assert.equal(editado.respuesta.identificacion?.numero, 'FORMATO 123');
    assert.equal((await consultar.ejecutar({contexto, bundle, id: uuidPublico(p.id)})).identificacion?.numero, 'FORMATO 123');
    assert.deepEqual(await db.collection('identidades_paciente').findOne({paciente_id: p.id}), antes);
  });

  await t.test('carrera de identidad en sesiones distintas: un ganador, PACIENTE_DUPLICADO y sin huérfanos', async () => {
    const sesiones = new Set<ClientSession>();
    const instrumentado: ClienteMongodb = {...cliente, iniciarSesion: () => {const s = cliente.iniciarSesion(); sesiones.add(s); return s;}};
    const b = await crearBundlePacientesMongodb(instrumentado);
    const before = await counts();
    const resultados = await Promise.allSettled([alta({identificacion: {tipo: 'PASAPORTE', numero: 'RACE-123'}}, id(), b), alta({identificacion: {tipo: 'PASAPORTE', numero: 'RACE123'}}, id(), b)]);
    assert.equal(resultados.filter((r) => r.status === 'fulfilled').length, 1);
    const fallo = resultados.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    assert.equal(errorCodigo('PACIENTE_DUPLICADO')(fallo.reason), true);
    assert.ok(sesiones.size >= 2);
    const after = await counts(); assert.deepEqual(after.map((v, i) => v - before[i]!), [1, 1, 0, 1, 1]);
    const ganador = resultados.find((r) => r.status === 'fulfilled');
    assert.ok(ganador?.status === 'fulfilled');
    const pacienteId = ganador.value.respuesta.id;
    assert.equal(await db.collection('identidades_paciente').countDocuments({numero_documento: 'RACE123', paciente_id: pacienteId}), 1);
    assert.equal(await db.collection('auditoria').countDocuments({documento_id: pacienteId}), 1);
    assert.equal(await db.collection('operaciones').countDocuments({'respuesta.data.id': pacienteId}), 1);
  });

  await t.test('versiones concurrentes: solo una edición gana; revisión anterior durable', async () => {
    const p = (await alta()).respuesta;
    const change = (telefono: string) => actualizar.ejecutar({contexto, bundle, id: uuidPublico(p.id), claveIdempotencia: id(), cambios: {version_esperada: 1, telefono}});
    const r = await Promise.allSettled([change('11111'), change('22222')]);
    assert.equal(r.filter((x) => x.status === 'fulfilled').length, 1);
    assert.equal(errorCodigo('VERSION_DESACTUALIZADA')((r.find((x) => x.status === 'rejected') as PromiseRejectedResult).reason), true);
    assert.equal(await db.collection('revisiones').countDocuments({recurso_id: p.id, version: 1}), 1);
  });

  await t.test('fallo de esquema tardío revierte paciente, identidad, auditoría y operación; actualización también revierte revisión', async () => {
    const uow = bundle.uow!;
    const defectuoso: BundleInstitucional = {...bundle, uow: {ejecutar: (ctx, cmd, planificar) => uow.ejecutar(ctx, cmd, async (lector) => {
      const plan = await planificar(lector);
      return plan.tipo === 'CONFIRMAR' ? {...plan, resultado: {...plan.resultado, httpStatus: 700}} : plan;
    })}};
    let before = await counts();
    await assert.rejects(() => alta({identificacion: {tipo: 'CUI', numero: 'FALLO-555'}}, id(), defectuoso), errorCodigo('ESTADO_INVALIDO'));
    assert.deepEqual(await counts(), before);
    const p = (await alta()).respuesta;
    before = await counts();
    await assert.rejects(() => actualizar.ejecutar({contexto, bundle: defectuoso, id: uuidPublico(p.id), claveIdempotencia: id(), cambios: {version_esperada: 1, identificacion: {tipo: 'CUI', numero: 'FALLO-666'}}}), errorCodigo('ESTADO_INVALIDO'));
    assert.deepEqual(await counts(), before);
    assert.equal((await consultar.ejecutar({contexto, bundle, id: uuidPublico(p.id)})).version, 1);
  });

  await t.test('búsqueda acentuada por prefijo de cualquier palabra, cursores ASC/DESC y filtros ligados', async () => {
    for (let i = 0; i < 5; i++) await alta({nombres: 'Único María', apellidos: `García ${i}`});
    for (const orden of ['ASC', 'DESC'] as const) {
      const ids: string[] = []; let cursor: string | undefined;
      do {
        const p = await pagina('garc', {limite: 2, orden, ...(cursor ? {cursor} : {})});
        ids.push(...p.data.map((x) => x.id)); cursor = p.meta.siguiente_cursor;
        if (cursor) {
          const siguiente = cursor;
          await assert.rejects(() => pagina('otro', {cursor: siguiente, orden}), errorCodigo('SOLICITUD_INVALIDA'));
          await assert.rejects(() => pagina('garc', {cursor: siguiente, orden: orden === 'ASC' ? 'DESC' : 'ASC'}), errorCodigo('SOLICITUD_INVALIDA'));
        }
      } while (cursor);
      assert.equal(ids.length, 5); assert.equal(new Set(ids).size, 5);
      assert.deepEqual(ids, [...ids].sort((a, b) => orden === 'ASC' ? a.localeCompare(b) : b.localeCompare(a)));
    }
    assert.equal((await pagina('arcía')).data.length, 0);
    await assert.rejects(() => pagina('garc', {cursor: '%%%'}), errorCodigo('SOLICITUD_INVALIDA'));
    assert.equal((await pagina('garc', {estado: 'ARCHIVADO'})).data.length, 0);
    const explain = await db.collection('pacientes').find({$or: [{claves_nombre: /^garc/}, {numero_busqueda: 'GARC'}]}).sort({fecha_registro: 1, _id: 1}).limit(3).explain();
    assert.ok(JSON.stringify(explain.queryPlanner.winningPlan).includes('IXSCAN'));
    assert.equal(JSON.stringify(explain.queryPlanner.winningPlan).includes('COLLSCAN'), false);
  });

  await t.test('permiso actual y desactivación impiden comandos nuevos y replay', async () => {
    const sinPermiso = await actor(false);
    await assert.rejects(() => registrar.ejecutar({contexto: sinPermiso, bundle, claveIdempotencia: id(), entrada: entrada()}), errorCodigo('SIN_PERMISO'));
    const stale = await actor(); const clave = id();
    await registrar.ejecutar({contexto: stale, bundle, claveIdempotencia: clave, entrada: entrada()});
    await db.collection('usuarios').updateOne({_id: stale.cuenta.id as never}, {$set: {estado: 'INACTIVO', activo: false}, $inc: {revision: 1}});
    const before = await counts();
    for (const key of [clave, id()]) await assert.rejects(() => registrar.ejecutar({contexto: stale, bundle, claveIdempotencia: key, entrada: entrada()}), errorCodigo('SIN_PERMISO'));
    assert.deepEqual(await counts(), before);
  });

  await t.test('commit confirmado con acuse perdido se reconcilia sin duplicar', async () => {
    const incierto: ClienteMongodb = {...cliente, iniciarSesion: () => {
      const session = cliente.iniciarSesion(); const commit = session.commitTransaction.bind(session);
      session.commitTransaction = async () => {await commit(); throw Object.assign(new Error('acuse sintético perdido'), {hasErrorLabel: (name: string) => name === 'UnknownTransactionCommitResult'});};
      return session;
    }};
    const b = await crearBundlePacientesMongodb(incierto); const clave = id(); const before = await counts();
    const p = await alta({identificacion: {tipo: 'CUI', numero: 'COMMIT-001'}}, clave, b);
    const replay = await alta({identificacion: {tipo: 'CUI', numero: 'COMMIT-001'}}, clave);
    assert.deepEqual(p, replay);
    assert.deepEqual((await counts()).map((v, i) => v - before[i]!), [1, 1, 0, 1, 1]);
  });

  await t.test('archivo conserva historia y rechaza edición; desconexión devuelve 503', async () => {
    const p = (await alta()).respuesta;
    await adminDb.collection('pacientes').updateOne({_id: p.id as never}, {$set: {activo: false, 'historial.estado': 'ARCHIVADO', 'historial.baja': {causa: 'TRASLADO', motivo: 'Caso sintético', fecha: new Date(), actor_id: contexto.cuenta.id}}});
    const archived = await consultar.ejecutar({contexto, bundle, id: uuidPublico(p.id)});
    assert.equal(archived.baja?.causa, 'TRASLADO'); assert.equal(archived.estado, 'ARCHIVADO');
    await assert.rejects(() => actualizar.ejecutar({contexto, bundle, id: uuidPublico(p.id), claveIdempotencia: id(), cambios: {version_esperada: 1, telefono: '55555'}}), errorCodigo('ESTADO_INVALIDO'));
    const aux = await crearClienteMongodb(config); t.after(() => aux.cerrar());
    const b = await crearBundlePacientesMongodb(aux); await aux.cerrar();
    await assert.rejects(() => b.pacientes!.buscar({q: 'Ana', orden: 'ASC', limite: 10}), errorCodigo('PERSISTENCIA_NO_DISPONIBLE'));
  });

  await t.test('reinicio del contenedor conserva paciente, revisión y operación durable', async () => {
    const clave = id();
    const registrado = await alta({identificacion: {tipo: 'PASAPORTE', numero: 'DURABLE-123'}}, clave);
    await execFile('docker', ['restart', container!], {timeout: 30_000});
    const nuevoCliente = await crearClienteMongodb(config); t.after(() => nuevoCliente.cerrar());
    const nuevoBundle = await crearBundlePacientesMongodb(nuevoCliente);
    const leido = await consultar.ejecutar({contexto, bundle: nuevoBundle, id: uuidPublico(registrado.respuesta.id)});
    assert.deepEqual(leido, registrado.respuesta);
    assert.deepEqual(await alta({identificacion: {tipo: 'PASAPORTE', numero: 'DURABLE-123'}}, clave, nuevoBundle), registrado);
  });

  await t.test('versiones BSON int64 conservan precisión y rechazan desbordamiento sin escrituras parciales', async () => {
    const p = (await alta()).respuesta;
    await adminDb.collection('pacientes').updateOne({_id: p.id as never}, {$set: {revision: Long.fromNumber(2_147_483_647)}});
    for (const version of [2_147_483_647, 2_147_483_648]) {
      const r = await actualizar.ejecutar({contexto, bundle, id: uuidPublico(p.id), claveIdempotencia: id(), cambios: {version_esperada: version, telefono: '55551234'}});
      assert.equal(r.respuesta.version, version + 1);
    }
    await adminDb.collection('pacientes').updateOne({_id: p.id as never}, {$set: {revision: Long.fromNumber(Number.MAX_SAFE_INTEGER)}});
    const antes = await counts();
    await assert.rejects(() => actualizar.ejecutar({contexto, bundle, id: uuidPublico(p.id), claveIdempotencia: id(), cambios: {version_esperada: Number.MAX_SAFE_INTEGER, telefono: '55558888'}}), errorCodigo('ESTADO_INVALIDO'));
    assert.deepEqual(await counts(), antes);
  });
});
