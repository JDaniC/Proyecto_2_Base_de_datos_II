import { GestionarCatalogoVacunas } from '../../src/aplicacion/casos-uso/pediatria/gestionar-catalogo-vacunas.js';
import { RegistrarAplicacionVacuna } from '../../src/aplicacion/casos-uso/pediatria/registrar-aplicacion.js';
import { CorregirAplicacionVacuna } from '../../src/aplicacion/casos-uso/pediatria/corregir-aplicacion.js';
import { AnularAplicacionVacuna } from '../../src/aplicacion/casos-uso/pediatria/anular-aplicacion.js';
import { AsignarEsquemaVacuna } from '../../src/aplicacion/casos-uso/pediatria/asignar-esquema.js';
import { ConsultarEsquemaVacunas } from '../../src/aplicacion/casos-uso/pediatria/consultar-esquema-vacunas.js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { crearClienteFirestore } from '../../src/adaptadores/salida/firestore/crear-cliente-firestore.js';
import { crearBundlePacientesFirestore } from '../../src/adaptadores/salida/firestore/pacientes/crear-bundle-pacientes-firestore.js';
import { crearRepositorioCuentaFirestore } from '../../src/adaptadores/salida/firestore/repositorio-cuenta-firestore.js';
import { crearContextoAutenticado } from '../../src/aplicacion/puertos/contexto-autenticado.js';
import { RegistrarPaciente } from '../../src/aplicacion/casos-uso/pacientes/registrar-paciente.js';
import { dependenciasComandoPorDefecto as deps } from '../../src/adaptadores/salida/sistema/servicios-sistema.js';
import { uuidPublico } from '../../src/dominio/compartido/uuid.js';
import { instanteUtc } from '../../src/dominio/compartido/instante-utc.js';
const id = () => uuidPublico(randomUUID());
const host = process.env.FIRESTORE_EMULATOR_HOST;
// Toda escritura exige host loopback y proyecto demo, incluso al invocar el test directamente.
if (host && !/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host)) throw new Error('EMULADOR_NO_AISLADO');

test('E04 CA11 vacunas Firestore aislado', {skip: !host}, async t => {
  const cliente = crearClienteFirestore({emulatorHost: host!,projectId: `demo-clinica-${process.pid}`,databaseId: '(default)',institucionalId: 'CENTRO_MEDICO_PEDIATRICO'});
  const db = cliente.firestore; t.after(()=>cliente.cerrar());
  // Importación explícita del módulo de migración versionado, sin credenciales externas.
  const migracion = await import(new URL('../../../../Database/migrations/006_clinica_firestore.mjs',import.meta.url).href) as {prepararClinicaFirestore(db: unknown, opciones?: {despuesDePagina?:()=>void}): Promise<unknown>};
  const inicializador = await import(new URL('../../../../Database/centro_pediatrico_firestore.mjs',import.meta.url).href) as {inicializarFirestore(db:unknown):Promise<unknown>};
  await inicializador.inicializarFirestore(db);
  const actor = id(), rol = id(), profesional = id(), uid = `clinica-${randomUUID()}`;
  await db.doc(`pediatras/${profesional}`).set({revision:1,nombres:'Ana',apellidos:'Sintética',colegiado:'SINT-1',entidad_colegiacion:'Colegio sintético',especialidad:'Pediatría',estado:'ACTIVO'});
  await db.doc(`roles/${rol}`).set({revision:1,nombre:'PEDIATRA',descripcion:'Ensayo',permisos:['historial.archivar','pacientes.administrar','historial.leer','consultas.registrar','diagnosticos.registrar','tratamientos.registrar','recetas.emitir','citas.administrar']});
  await db.doc(`usuarios/${actor}`).set({revision:1,auth_uid:uid,proveedor_identidad:'FIREBASE',institucion_id:'CENTRO_MEDICO_PEDIATRICO',estado:'ACTIVO',rol_ids:[rol],pediatra_id:profesional,nombre_usuario:'ensayo'});
  const cuenta = await crearRepositorioCuentaFirestore(db,db).porUid(uid); assert.ok(cuenta);
  const contexto = crearContextoAutenticado({uid,institucion:'CENTRO_MEDICO_PEDIATRICO',emitidoEn:instanteUtc('2026-10-29T12:00:00Z')},cuenta,id());
  const bundle = crearBundlePacientesFirestore(cliente);
  const menor = (await new RegistrarPaciente(deps).ejecutar({contexto,bundle,claveIdempotencia:id(),entrada:{nombres:'Menor',apellidos:'Sintético',fecha_nacimiento:'2022-01-01',sexo:'MASCULINO',responsables:[{nombres:'Madre',apellidos:'Sintética',telefono:'55555555',parentesco:'MADRE',es_principal:true,autoriza_atencion:true,documento:{tipo:'CUI',numero:'1234567890101'}}]}})).respuesta;
  const pacienteId = uuidPublico(menor.id);

  await db.doc('historial_configuracion/modelo').set({version:1,estado:'LISTO'});
  await migracion.prepararClinicaFirestore(db);
  const vacunaId=id(),versionId=id(),dosisId=id();
  await db.doc(`vacunas/${vacunaId}`).set({revision:1,nombre:'Vacuna sintética',enfermedad_objetivo:'PRUEBA',fabricante:'Sintético',version_vigente:versionId});
  const esquema={revision:1,version:1,nombre:'Esquema original',enfermedad_objetivo:'PRUEBA',fabricante:'Sintético',fecha_creacion:new Date(),dosis:[{dosis_id:dosisId,numero:1,edad_recomendada_meses:2}]};
  await db.doc(`vacunas/${vacunaId}/versiones/${versionId}`).set(esquema);
  const asignar=new AsignarEsquemaVacuna(deps), registrar=new RegistrarAplicacionVacuna(deps),corregir=new CorregirAplicacionVacuna(deps),anular=new AnularAplicacionVacuna(deps);
  const entrada={vacunaId,dosisId,fechaAplicacion:'2026-01-01',lote:'LOTE-1',sitioAnatomico:'Brazo'};
  const p=()=>({contexto,bundle,id:pacienteId,claveIdempotencia:id(),entrada});
  await t.test('rechaza aplicación sin asignación explícita',async()=>{
    await assert.rejects(registrar.ejecutar(p()),{codigo:'SOLICITUD_INVALIDA'});
    assert.equal((await db.collection('aplicaciones_vacuna').get()).size,0);
  });
  await t.test('asignación idempotente; versión exacta resiste catálogo nuevo',async()=>{
    const e={...p(),entrada:{vacunaId,versionId}};
    assert.deepEqual(await asignar.ejecutar(e),await asignar.ejecutar(e));
    const nueva=id();await db.doc(`vacunas/${vacunaId}/versiones/${nueva}`).set({...esquema,version:2,nombre:'Cambio',dosis:[{dosis_id:id(),numero:1,edad_recomendada_meses:99}]});
    await db.doc(`vacunas/${vacunaId}`).update({version_vigente:nueva});
    const vista=await new ConsultarEsquemaVacunas().ejecutar(contexto,bundle,pacienteId);
    assert.equal(vista.items[0]?.dosisId,dosisId);assert.equal(vista.items[0]?.versionEsquemaId,versionId);
  });
  await t.test('fecha futura y anterior al nacimiento se rechazan sin escritura',async()=>{
    await assert.rejects(registrar.ejecutar({...p(),entrada:{...entrada,fechaAplicacion:'2099-01-01'}}),{codigo:'SOLICITUD_INVALIDA'});
    await assert.rejects(registrar.ejecutar({...p(),entrada:{...entrada,fechaAplicacion:'2021-01-01'}}),{codigo:'SOLICITUD_INVALIDA'});
    await assert.rejects(registrar.ejecutar({...p(),entrada:{...entrada,fechaAplicacion:'2022-02-01'}}),{codigo:'SOLICITUD_INVALIDA'});
    assert.equal((await db.collection('aplicaciones_vacuna').get()).size,0);
  });
  await t.test('fallo en cronología revierte aplicación, operación y auditoría completas',async()=>{
    const antes=await Promise.all(['aplicaciones_vacuna','operaciones','auditoria'].map(c=>db.collection(c).get().then(q=>q.size)));
    const uow:import('../../src/aplicacion/puertos/nucleo.js').UnidadDeTrabajo={ejecutar:(ctx,cmd,planificar)=>bundle.uow!.ejecutar(ctx,cmd,async lector=>{
      const plan=await planificar(lector);
      if(plan.tipo==='REPETIR')return plan;
      for(const c of plan.cambios)if(c.agregado==='eventosHistorial')Object.assign(c.nuevoEstado as object,{titulo:''});
      return plan;
    })};
    await assert.rejects(registrar.ejecutar({...p(),bundle:{...bundle,uow}}),{codigo:'PERSISTENCIA_NO_DISPONIBLE'});
    const despues=await Promise.all(['aplicaciones_vacuna','operaciones','auditoria'].map(c=>db.collection(c).get().then(q=>q.size)));
    assert.deepEqual(despues,antes);
  });
  let appId='';
  await t.test('carrera: una aplicación, reintento estable y otra clave duplicada',async()=>{
    const a=p(),b=p();const resultados=await Promise.allSettled([registrar.ejecutar(a),registrar.ejecutar(b)]);
    assert.equal(resultados.filter(r=>r.status==='fulfilled').length,1);
    const ganador=resultados[0]!.status==='fulfilled'?a:b;
    const r=await registrar.ejecutar(ganador);appId=r.respuesta.id;
    assert.equal(r.respuesta.versionEsquemaId,versionId);
    assert.equal((await db.collection('aplicaciones_vacuna').get()).size,1);
    await assert.rejects(registrar.ejecutar(p()),{codigo:'DOSIS_DUPLICADA'});
  });
  await t.test('corrección versionada y anulación preservan historia',async()=>{
    await db.doc(`pacientes/${pacienteId}`).update({estado:'ARCHIVADO'});
    const r=await corregir.ejecutar(appId,{...p(),entrada:{versionEsperada:1,motivo:'Rectificación sintética',lote:'LOTE-2'}});
    assert.equal(r.respuesta.version,2);
    await assert.rejects(corregir.ejecutar(appId,{...p(),entrada:{versionEsperada:1,motivo:'Conflicto',lote:'OTRO'}}),{codigo:'VERSION_DESACTUALIZADA'});
    const anulada=await anular.ejecutar(appId,{...p(),entrada:{versionEsperada:2,motivo:'Registro erróneo'}});assert.equal(anulada.respuesta.estado,'ANULADA');
    assert.equal((await db.collection(`aplicaciones_vacuna/${appId}/versiones`).get()).size,2);
    assert.equal((await new ConsultarEsquemaVacunas().ejecutar(contexto,bundle,pacienteId)).dosisAplicadas,0);
    await db.doc(`pacientes/${pacienteId}`).update({estado:'ACTIVO'});
  });
  await t.test('nueva administración explícita tras anulación conserva historia y compite por misma dosis',async()=>{
    const a=p(),b=p(),resultados=await Promise.allSettled([registrar.ejecutar(a),registrar.ejecutar(b)]);
    assert.equal(resultados.filter(r=>r.status==='fulfilled').length,1);
    const ganador=resultados[0]!.status==='fulfilled'?a:b;
    const r=await registrar.ejecutar(ganador);assert.equal(r.respuesta.id,appId);assert.equal(r.respuesta.version,4);assert.equal(r.respuesta.estado,'APLICADA');
    assert.equal((await db.collection('aplicaciones_vacuna').get()).size,1);
    const historia=await db.collection(`aplicaciones_vacuna/${appId}/versiones`).get();assert.equal(historia.size,3);
    assert.ok(historia.docs.some(d=>d.data().contenido_anterior.estado==='ANULADA'&&d.data().contenido_anterior.fechaAplicacion===entrada.fechaAplicacion));
    await assert.rejects(registrar.ejecutar(p()),{codigo:'DOSIS_DUPLICADA'});
  });
  await t.test('dosis ajena, rol vigente y archivo no escriben',async()=>{
    await assert.rejects(registrar.ejecutar({...p(),entrada:{...entrada,dosisId:id()}}),{codigo:'RECURSO_NO_ENCONTRADO'});
    await db.doc(`roles/${rol}`).update({permisos:['historial.leer']});
    await assert.rejects(registrar.ejecutar(p()),{codigo:'SIN_PERMISO'});
    await db.doc(`roles/${rol}`).update({permisos:cuenta.permisos});
    await db.doc(`pacientes/${pacienteId}`).update({estado:'ARCHIVADO'});
    await assert.rejects(registrar.ejecutar(p()),{codigo:'ESTADO_INVALIDO'});
  });
  await t.test('administración publica versiones inmutables y rechaza carrera/versiones antiguas',async()=>{
    const caso=new GestionarCatalogoVacunas(deps);
    const data={nombre:'Catálogo administrado',enfermedadObjetivo:'Sintética',fabricante:'Ensayo',dosis:[{dosisId:id(),numero:1,edadMesesRecomendada:2}]};
    await assert.rejects(caso.ejecutar({contexto,bundle,claveIdempotencia:id(),entrada:data}),{codigo:'SIN_PERMISO'});
    await db.doc(`roles/${rol}`).update({nombre:'ADMIN_INSTITUCIONAL',permisos:['usuarios.administrar','historial.leer']});
    const admin=await crearRepositorioCuentaFirestore(db,db).porUid(uid);assert.ok(admin);
    const c=crearContextoAutenticado(contexto.identidad,admin,id());
    const creacion={contexto:c,bundle,claveIdempotencia:id(),entrada:data};
    const creada=await caso.ejecutar(creacion);assert.deepEqual(await caso.ejecutar(creacion),creada);
    const vid=uuidPublico(creada.respuesta.id), anterior=creada.respuesta.versionVigente;
    const nueva={contexto:c,bundle,id:vid,claveIdempotencia:id(),entrada:{...data,nombre:'Versión nueva',versionEsquemaAnterior:anterior}};
    const publicada=await caso.ejecutar(nueva);assert.notEqual(publicada.respuesta.versionVigente,anterior);
    const historica=await bundle.vacunasPediatricas!.obtenerVersionEsquema(vid,uuidPublico(anterior));assert.equal(historica?.nombre,data.nombre);
    await assert.rejects(caso.ejecutar({...nueva,claveIdempotencia:id()}),{codigo:'VERSION_DESACTUALIZADA'});
    assert.equal((await db.collection(`vacunas/${vid}/versiones`).get()).size,2);
  });

});
