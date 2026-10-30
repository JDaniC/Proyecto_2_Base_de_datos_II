import { CambiarEstadoHistorial } from '../../src/aplicacion/casos-uso/historiales/cambiar-estado-historial.js';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash, randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {MongoClient, type Document} from 'mongodb';
import {crearClienteMongodb} from '../../src/adaptadores/salida/mongodb/crear-cliente-mongodb.js';
import {crearBundlePacientesMongodb} from '../../src/adaptadores/salida/mongodb/pacientes/crear-bundle-pacientes-mongodb.js';
import {crearContextoAutenticado, type ContextoAutenticado} from '../../src/aplicacion/puertos/contexto-autenticado.js';
import {AtencionClinica, type AccionConsulta} from '../../src/aplicacion/casos-uso/consultas/atencion-clinica.js';
import {RegistrarPaciente} from '../../src/aplicacion/casos-uso/pacientes/registrar-paciente.js';
import {uuidPublico} from '../../src/dominio/compartido/uuid.js';
import {instanteUtc} from '../../src/dominio/compartido/instante-utc.js';
import {ErrorDominio} from '../../src/dominio/compartido/error-dominio.js';
import type {Consulta} from '../../src/dominio/clinica/consulta.js';

const id = () => uuidPublico(randomUUID());
const deps = {reloj: {ahora: () => instanteUtc('2026-10-29T19:00:00.000Z')}, ids: {nuevo: id},
  hash: {sha256: async (s: string) => createHash('sha256').update(s).digest('hex')}};
const fallo = (codigo: string) => (e: unknown) => e instanceof ErrorDominio && e.codigo === codigo;
const port = process.env.MONGO_TEST_PORT;
test('E03-P2-01 MongoDB real: CA04/05, migración, versiones, límites y rollback', {skip: !port}, async t => {
  assert.match(process.env.MONGO_TEST_CONTAINER!, /^bdii-e03-p2-01-[a-f0-9]{10}-mongodb-1$/);
  const cliente = await crearClienteMongodb({host: '127.0.0.1', puerto: Number(port), baseDatos: 'laboratorio_clinico', usuario: 'laboratorio_app',
    archivoContrasena: process.env.MONGO_TEST_SECRET_FILE!, replicaSet: 'rs0', conexionDirecta: true, timeoutMs: 5000});
  const admin = new MongoClient(`mongodb://127.0.0.1:${port}/?directConnection=true`, {auth: {username: 'mongo_admin',
    password: readFileSync(process.env.MONGO_ADMIN_TEST_SECRET_FILE!, 'utf8').trim()}, authSource: 'admin'});
  await admin.connect(); t.after(async () => {await cliente.cerrar(); await admin.close();});
  const db = cliente.db; const adb = admin.db('laboratorio_clinico');
  const base = resolve('..','Database');
  const {prepararHistorialMongodb} = await import(pathToFileURL(resolve(base,'migrations/004_historial_documental.mjs')).href);
  const {migrarClinicaMongodb} = await import(pathToFileURL(resolve(base,'migrations/005_clinica_mongodb.mjs')).href);
  await prepararHistorialMongodb(adb);
  const sinMigrar = await crearBundlePacientesMongodb(cliente);
  await assert.rejects(sinMigrar.clinica!.consultas.porId(id()),fallo('PERSISTENCIA_NO_DISPONIBLE'));
  await migrarClinicaMongodb(adb);
  let bundle = await crearBundlePacientesMongodb(cliente);
  const clinica = new AtencionClinica(deps);
  const colecciones = ['consultas_clinicas','revisiones','historial_eventos','operaciones','auditoria'];
  const conteos = () => Promise.all(colecciones.map(c => db.collection(c).countDocuments()));
  const doc = (coleccion: string) => adb.collection<{_id: string} & Document>(coleccion);
  async function actor(rol: string, tipo = 'MEDICO', activo = true): Promise<ContextoAutenticado> {
    const rolId = id(); const actorId = id(); const proId = id(); const uid = `sintetico-${id()}`;
    let r = await doc('roles').findOne({nombre: rol});
    if (!r) {await doc('roles').insertOne({_id: rolId, revision: 1, nombre: rol,
      permisos: rol === 'MEDICO_LABORATORIO' ? ['historial.archivar','historial.leer','consultas.registrar','diagnosticos.registrar','tratamientos.registrar','recetas.emitir'] : rol === 'SECRETARIA' ? ['pacientes.administrar'] : ['historial.leer','resultados.analizar']}); r = {_id: rolId};}
    await doc('solicitantes').insertOne({_id: proId, revision: 1, nombre_completo: 'Profesional Sintético', tipo, activo,
      ...(tipo === 'MEDICO' ? {numero_colegiado: proId, entidad_colegiacion: 'Entidad sintética'} : {})});
    await doc('usuarios').insertOne({_id: actorId, revision: 1, auth_uid: uid, proveedor_identidad: 'FIREBASE', institucion_id: 'LABORATORIO_CLINICO',
      rol_ids: [r._id], solicitante_medico_id: proId, estado: 'ACTIVO', activo: true, nombre_usuario: uid});
    const cuenta = await bundle.cuenta.porUid(uid); assert.ok(cuenta);
    return crearContextoAutenticado({uid, institucion: 'LABORATORIO_CLINICO', emitidoEn: deps.reloj.ahora()}, cuenta, id());
  }
  const secretaria = await actor('SECRETARIA'); const medico = await actor('MEDICO_LABORATORIO');
  const alta = new RegistrarPaciente(deps);
  const paciente = async () => (await alta.ejecutar({contexto: secretaria, bundle, claveIdempotencia: id(), entrada: {
    nombres: 'Paciente', apellidos: 'Sintético', fecha_nacimiento: '2000-01-01', sexo: 'FEMENINO'}})).respuesta;
  const medicamento = {nombre: 'Medicamento sintético', presentacion: 'Tableta', concentracion: '10 mg', dosis: '1 tableta', frecuencia: 'cada 24 horas', duracion: '3 días', via: 'Oral', indicaciones: 'Solo fixture sintético'};
  const entrada = (p: {id: string; version: number}) => ({paciente_id: p.id, version_paciente: p.version, motivo: 'Atención sintética', sintomas: '',
    signos_vitales: {peso_kg: 35.123, presion_sistolica: 120, temperatura_c: 36.1, saturacion_oxigeno_pct: null},
    diagnosticos: [{codigo_cie: 'SINT', nombre: 'Diagnóstico sintético', es_principal: true}],
    tratamientos: [{descripcion: 'Tratamiento sintético', indicaciones: 'Solo fixture'}], receta: {medicamentos: [medicamento]}});
  const ejecutar = (accion: AccionConsulta, datos: unknown, clave = id(), contexto = medico, consultaId?: Consulta['id']) => clinica.ejecutar(accion,
    {contexto, bundle, claveIdempotencia: clave, entrada: datos, ...(consultaId ? {id: consultaId} : {})});

  await t.test('instalación nueva: mapeo físico, snapshot exacto, historial y replay sin duplicados', async () => {
    const p = await paciente(); const datos = entrada(p); const clave = id();
    const antes = await conteos(); const resultado = await ejecutar('completa', datos, clave); const c = resultado.respuesta;
    assert.deepEqual(await bundle.clinica!.consultas.porId(c.id), c);
    const trasConfirmar = await conteos();
    assert.deepEqual((await ejecutar('completa', datos, clave)).respuesta, c);
    assert.deepEqual(await conteos(),trasConfirmar);
    assert.equal((await conteos())[0], antes[0]! + 1);
    assert.equal(await db.collection('historial_eventos').countDocuments({paciente_id: p.id}), 4);
    const fisico = await doc('consultas_clinicas').findOne({_id: c.id});
    assert.equal(fisico!.historial_id, (await doc('pacientes').findOne({_id: p.id}))!.historial.id_historial);
    assert.equal(String(fisico!.signos_vitales.peso_kg), '35.123');
    assert.equal(await db.collection('resultados').countDocuments(), 0, 'diagnóstico clínico separado de resultado analítico');
    await doc('solicitantes').updateOne({_id: medico.cuenta.profesional!.id}, {$set: {nombre_completo: 'Nombre cambiado', numero_colegiado: 'CAMBIO'}});
    assert.deepEqual((await bundle.clinica!.consultas.porId(c.id))!.receta, c.receta);
    await assert.rejects(ejecutar('completa', {...datos,motivo: 'Otra intención'}, clave), fallo('CLAVE_REUTILIZADA'));
    assert.equal(await bundle.clinica!.consultas.porVersion(c.id, 99 as Consulta['version']), null);
    bundle = await crearBundlePacientesMongodb(cliente);
    assert.deepEqual(await bundle.clinica!.consultas.porVersion(c.id,c.version), c);
  });
  await t.test('reintentos concurrentes de la misma intención producen un solo éxito durable', async () => {
    const p = await paciente(); const datos = entrada(p); const clave = id(); const antes = await conteos();
    const resultados = await Promise.all([ejecutar('completa',datos,clave),ejecutar('completa',datos,clave)]);
    assert.deepEqual(resultados[0],resultados[1]);
    assert.deepEqual(await conteos(),[antes[0]!+1,antes[1]!,antes[2]!+4,antes[3]!+1,antes[4]!+1]);
  });
  await t.test('adiciones, segunda receta, versiones antiguas y conflicto concurrente', async () => {
    const p = await paciente(); const datos = entrada(p);
    const abierta = {paciente_id: datos.paciente_id, version_paciente: datos.version_paciente, motivo: datos.motivo, sintomas: datos.sintomas, signos_vitales: datos.signos_vitales};
    const c = (await ejecutar('abrir',abierta)).respuesta;
    const d = (await ejecutar('diagnostico',{version_esperada: 1,diagnostico: datos.diagnosticos[0]},id(),medico,c.id)).respuesta;
    assert.deepEqual(await bundle.clinica!.consultas.porVersion(c.id,c.version),c);
    const r = (await ejecutar('receta',{version_esperada: d.version,receta: datos.receta},id(),medico,c.id)).respuesta;
    await assert.rejects(ejecutar('receta',{version_esperada: r.version,receta: datos.receta},id(),medico,c.id), fallo('RECETA_EXISTENTE'));
    const carreras = await Promise.allSettled([1,2].map(() => ejecutar('tratamiento',{version_esperada: r.version,tratamiento: datos.tratamientos[0]},id(),medico,c.id)));
    assert.equal(carreras.filter(x => x.status === 'fulfilled').length,1);
    assert.equal(carreras.filter(x => x.status === 'rejected' && fallo('VERSION_DESACTUALIZADA')(x.reason)).length,1);
    const actual = await bundle.clinica!.consultas.porId(c.id); assert.equal(actual!.version,4);
    await ejecutar('finalizar',{version_esperada: 4},id(),medico,c.id);
    assert.deepEqual(await bundle.clinica!.consultas.porVersion(c.id,d.version), d);
    for (const e of await db.collection('historial_eventos').find({paciente_id: p.id}).toArray()) {
      const historica = await bundle.clinica!.consultas.porVersion(c.id,e.contenido.versionConsulta); assert.ok(historica);
    }
  });
  await t.test('analista, médico inactivo/institucional y agenda rechazan sin escritura', async () => {
    const p = await paciente(); const datos = entrada(p);
    for (const a of [await actor('ANALISTA_LABORATORIO')]) {
      const antes = await conteos(); await assert.rejects(ejecutar('completa',datos,id(),a)); assert.deepEqual(await conteos(),antes);
    }
    await assert.rejects(actor('MEDICO_LABORATORIO','MEDICO',false),fallo('CUENTA_NO_HABILITADA'));
    await assert.rejects(actor('MEDICO_LABORATORIO','INSTITUCION'),fallo('CUENTA_NO_HABILITADA'));
    await assert.rejects(ejecutar('completa',{...datos,cita_id: id(),version_cita: 1}),fallo('SIN_PERMISO'));
    await assert.rejects(bundle.clinica!.citas.listar({fecha_desde: '2026-10-29',fecha_hasta: '2026-10-30'}, {limite: 20,orden: 'ASC'}),fallo('SIN_PERMISO'));
  });
  await t.test('archivo, referencias ajenas, 100 elementos/256 KiB y precisión se rechazan sin parcialidad', async () => {
    const p = await paciente(); const datos = entrada(p); const antes = await conteos();
    await assert.rejects(ejecutar('completa',{...datos,paciente_id: id()}),fallo('RECURSO_NO_ENCONTRADO'));
    await assert.rejects(ejecutar('completa',{...datos,diagnosticos: Array(101).fill(datos.diagnosticos[0])}),fallo('LIMITE_AGREGADO'));
    const grande = {descripcion: 'x'.repeat(200),indicaciones: 'x'.repeat(2000)};
    await assert.rejects(ejecutar('completa',{...datos,tratamientos: Array(100).fill(grande),observaciones: '🙂'.repeat(1000), receta: {medicamentos: Array(100).fill({...medicamento,indicaciones: '🙂'.repeat(125)})}}),fallo('LIMITE_AGREGADO'));
    for (const signos of [{presion_sistolica: 120.5},{peso_kg: 35.1234}]) await assert.rejects(ejecutar('completa',{...datos,signos_vitales: signos}),fallo('SOLICITUD_INVALIDA'));
    await doc('pacientes').updateOne({_id: p.id}, {$set: {activo: false, 'historial.estado': 'ARCHIVADO','historial.baja': {causa: 'TRASLADO',motivo: 'Fixture',fecha: new Date(),actor_id: secretaria.cuenta.id}}});
    await assert.rejects(ejecutar('completa',datos),fallo('ESTADO_INVALIDO')); assert.deepEqual(await conteos(),antes);
  });
  await t.test('fallo de auditoría y de receta revierte consulta/revisión/paciente/eventos/operación', async () => {
    const p = await paciente(); const datos = entrada(p);
    for (const coleccion of ['auditoria']) {
      const info = (await adb.listCollections({name: coleccion},{nameOnly: false}).toArray())[0]!;
      const original = info.options!.validator;
      await adb.command({collMod: coleccion,validator: {$and: [original, {$expr: {$eq: [1,2]}}]}});
      const antes = await conteos(); const previo = await doc('pacientes').findOne({_id: p.id});
      await assert.rejects(ejecutar('completa',datos));
      assert.deepEqual(await conteos(),antes); assert.deepEqual(await doc('pacientes').findOne({_id: p.id}),previo);
      await adb.command({collMod: coleccion,validator: original});
    }
    const antesReceta = await conteos();
    const uow = bundle.uow!;
    const malformada = {...bundle, uow: {ejecutar: (async (contexto, comando, planificar) => uow.ejecutar(contexto,comando,async lector => {
      const plan = await planificar(lector);
      if (plan.tipo === 'CONFIRMAR') {
        const cambio = plan.cambios.find(c => c.agregado === 'consultas')!;
        const copia = structuredClone(cambio.nuevoEstado) as {receta: {medicamentos: Record<string,unknown>[]}};
        delete copia.receta.medicamentos[0]!.concentracion;
        return {...plan, cambios: plan.cambios.map(c => c === cambio ? {...c,nuevoEstado: copia} : c)} as typeof plan;
      }
      return plan;
    })) as typeof uow.ejecutar}};
    await assert.rejects(clinica.ejecutar('completa',{contexto: medico,bundle: malformada,claveIdempotencia:id(),entrada:datos}));
    assert.deepEqual(await conteos(),antesReceta);
    const c = (await ejecutar('completa',datos)).respuesta; assert.equal(c.version,1);
  });
  await t.test('validador físico mantiene M01–M09, precisión, cierre de objetos y límites', async () => {
    const original = (await doc('consultas_clinicas').findOne({}))!;
    const rechazar = async (cambio: Record<string, unknown>) => {
      await assert.rejects(doc('consultas_clinicas').updateOne({_id: original._id}, {$set: cambio}),
        (e: unknown) => typeof e === 'object' && e !== null && 'code' in e && e.code === 121);
      assert.deepEqual(await doc('consultas_clinicas').findOne({_id: original._id}),original);
    };
    await rechazar({'signos_vitales.presion_sistolica': 120.5});
    await rechazar({'signos_vitales.peso_kg': 35.1234});
    await rechazar({'signos_vitales.campo_libre': 'No permitido'});
    await rechazar({diagnosticos: Array(101).fill(original.diagnosticos[0])});
    const segundo = {...original.diagnosticos[0],diagnostico_id: id()};
    await rechazar({diagnosticos: [original.diagnosticos[0],segundo]});
    await rechazar({'receta.prescriptor_id': id()});
    const cuentaSinDdl = cliente.db;
    await assert.rejects(cuentaSinDdl.command({collMod:'consultas_clinicas',validator: {}}));
    await assert.rejects(cuentaSinDdl.collection('auditoria').deleteOne({}));
  });
  await t.test('migración existente: preflight, fallo tardío, reanudación y conservación de documentos/índices', async () => {
    const old = JSON.parse(readFileSync(resolve(base,'migrations/esquemas/005_consultas_mongodb_v1.json'),'utf8'));
    const target = JSON.parse(readFileSync(resolve(base,'migrations/esquemas/005_consultas_mongodb_v2.json'),'utf8'));
    const before = await doc('consultas_clinicas').find().toArray();
    await doc('consultas_clinicas').createIndex({estado: 1},{name: 'ix_adicional_conservado'});
    // Volumen antiguo vacío: el migrador no borra ni reescribe consultas del volumen nuevo.
    await adb.createCollection('respaldo_clinico',{validator: target.validador});
    for (const c of before) await doc('respaldo_clinico').insertOne(c);
    const otra = admin.db(`laboratorio_migracion_${randomUUID().replaceAll('-','')}`);
    await otra.createCollection('consultas_clinicas',{validator: old.validador,validationLevel: 'strict',validationAction: 'error'});
    for (const ix of old.indices) {const {key,...opciones} = ix; await otra.collection('consultas_clinicas').createIndex(key,opciones);}
    await otra.collection('revisiones').createIndex({tipo_recurso: 1,recurso_id: 1,version: 1},{unique:true});
    await otra.collection('historial_modelo').insertOne({id: 1,version: 1,estado: 'LISTO'});
    await assert.rejects(migrarClinicaMongodb(otra,{despuesDeCollMod: () => {throw new Error('FALLO_INYECTADO');}}));
    assert.equal((await otra.collection('historial_modelo').findOne({id: 5}))!.estado,'MIGRANDO');
    assert.equal((await otra.listCollections({name: 'consultas_clinicas'}, {nameOnly: false}).toArray())[0]!.options!.validator.$and[0].$jsonSchema.properties.signos_vitales.bsonType,'object');
    assert.equal((await migrarClinicaMongodb(otra)).estado,'LISTO');
    assert.equal((await migrarClinicaMongodb(otra)).estado,'LISTO');
    await migrarClinicaMongodb(adb);
    assert.deepEqual(await doc('consultas_clinicas').find().toArray(),before);
    assert.deepEqual(await doc('respaldo_clinico').find().toArray(),before);
    assert.ok((await doc('consultas_clinicas').listIndexes().toArray()).some(i=>i.name==='ix_adicional_conservado'));
    const legado = structuredClone(before[0]!);
    legado._id = id(); delete legado.profesional_historico; delete legado.signos_vitales;
    delete legado.receta; delete legado.cita_id;
    legado.diagnosticos = []; legado.tratamientos = [];
    await otra.collection<{_id: string} & Document>('consultas_clinicas').insertOne(legado);
    assert.equal((await migrarClinicaMongodb(otra)).estado,'RECONCILIAR');
    assert.equal((await migrarClinicaMongodb(otra)).estado,'RECONCILIAR');
    assert.deepEqual(await otra.collection<{_id: string} & Document>('consultas_clinicas').findOne({_id: legado._id}),legado);
    await otra.command({collMod:'consultas_clinicas',validator: {$jsonSchema:{bsonType:'object'}}});
    await assert.rejects(migrarClinicaMongodb(otra),/MODELO_CLINICO_DESCONOCIDO/);
  });
  await t.test('archivo, corrección, retiro de receta e historia anteriores en Mongo real', async () => {
    const p = await paciente();
    const original = await ejecutar('completa', entrada(p));
    const estado = new CambiarEstadoHistorial(deps);
    const archivado = await estado.ejecutar('archivar', {contexto: medico, bundle, id: uuidPublico(p.id), claveIdempotencia: id(),
      entrada: {version_esperada: 2, causa: 'TRASLADO', motivo: 'Caso sintético'}});
    assert.equal((await bundle.pacientes!.porId(uuidPublico(p.id)))?.estado, 'ARCHIVADO');
    await assert.rejects(ejecutar('completa', {...entrada(p), version_paciente: archivado.respuesta.version}), fallo('ESTADO_INVALIDO'));
    const corregida = await ejecutar('corregir', {version_esperada: 1, motivo_correccion: 'Corrección sintética', contenido: {
      motivo: 'Corregido', sintomas: '', signos_vitales: {}, diagnosticos: [], tratamientos: []}}, id(), medico, original.respuesta.id);
    assert.equal(corregida.respuesta.version, 2);
    assert.deepEqual(await bundle.clinica!.consultas.porId(original.respuesta.id), corregida.respuesta);
    assert.deepEqual(await bundle.clinica!.consultas.porVersion(original.respuesta.id, original.respuesta.version), original.respuesta);
  });

  await t.test('archivo compite con nueva atención sobre una única revisión Mongo', async () => {
    const p = await paciente(); const estado = new CambiarEstadoHistorial(deps);
    const r = await Promise.allSettled([
      estado.ejecutar('archivar', {contexto: medico, bundle, id: uuidPublico(p.id), claveIdempotencia: id(), entrada: {version_esperada: 1, causa: 'TRASLADO', motivo: 'Carrera sintética'}}),
      ejecutar('completa', entrada(p)),
    ]);
    assert.equal(r.filter(x => x.status === 'fulfilled').length, 1);
    assert.equal((await bundle.pacientes!.porId(uuidPublico(p.id)))?.version, 2);
  });

});
