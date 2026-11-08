import { ConsultarCrecimiento } from '../../src/aplicacion/casos-uso/pediatria/consultar-crecimiento.js';
import { GestionarAntecedentes } from '../../src/aplicacion/casos-uso/pediatria/gestionar-antecedentes.js';
import { GestionarResponsable } from '../../src/aplicacion/casos-uso/pediatria/gestionar-responsable.js';
import { CambiarEstadoHistorial } from '../../src/aplicacion/casos-uso/historiales/cambiar-estado-historial.js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { crearClienteFirestore } from '../../src/adaptadores/salida/firestore/crear-cliente-firestore.js';
import { crearBundlePacientesFirestore } from '../../src/adaptadores/salida/firestore/pacientes/crear-bundle-pacientes-firestore.js';
import { crearRepositorioCuentaFirestore } from '../../src/adaptadores/salida/firestore/repositorio-cuenta-firestore.js';
import { crearContextoAutenticado } from '../../src/aplicacion/puertos/contexto-autenticado.js';
import { GestionarCitas } from '../../src/aplicacion/casos-uso/citas/gestionar-citas.js';
import { ConsultarCitas } from '../../src/aplicacion/casos-uso/citas/consultar-citas.js';
import { AtencionClinica } from '../../src/aplicacion/casos-uso/consultas/atencion-clinica.js';
import { RegistrarPaciente } from '../../src/aplicacion/casos-uso/pacientes/registrar-paciente.js';
import { dependenciasComandoPorDefecto as deps } from '../../src/adaptadores/salida/sistema/servicios-sistema.js';
import { uuidPublico } from '../../src/dominio/compartido/uuid.js';
import { instanteUtc } from '../../src/dominio/compartido/instante-utc.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';
import { medicamento } from '../fixtures/clinica-comun.js';
import type { Consulta } from '../../src/dominio/clinica/consulta.js';
import type { BundleInstitucional } from '../../src/aplicacion/puertos/bundle-institucional.js';
const id = () => uuidPublico(randomUUID());
const host = process.env.FIRESTORE_EMULATOR_HOST;
// Toda escritura exige host loopback y proyecto demo, incluso al invocar el test directamente.
if (host && !/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host)) throw new Error('EMULADOR_NO_AISLADO');

test('E03-P2-02 CA05/09/10 clínica Firestore aislada', {skip: !host}, async t => {
  const cliente = crearClienteFirestore({emulatorHost: host!,projectId: `demo-clinica-${process.pid}`,databaseId: '(default)',institucionalId: 'CENTRO_MEDICO_PEDIATRICO'});
  const db = cliente.firestore; t.after(()=>cliente.cerrar());
  // Importación explícita del módulo de migración versionado, sin credenciales externas.
  const migracion = await import(new URL('../../../../Database/migrations/006_clinica_firestore.mjs',import.meta.url).href) as {prepararClinicaFirestore(db: unknown, opciones?: {despuesDePagina?:()=>void}): Promise<unknown>};
  const migracion013 = await import(new URL('../../../../Database/migrations/013_manifiesto_pediatrico_firestore.mjs',import.meta.url).href) as {HUELLA_ORIGEN:string;HUELLA_ORIGEN_CRLF_COMPLETO:string;prepararManifiestoPediatricoFirestore(db:unknown,o?:{antesDeConfirmar?:()=>void}):Promise<{actualizado:boolean}>};
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
  const pacienteId = uuidPublico(menor.id), responsableId = uuidPublico(menor.responsables![0]!.responsable.id);
  const atencion = new AtencionClinica(deps);
  const entrada = async () => ({paciente_id:pacienteId,version_paciente:(await bundle.pacientes!.porId(pacienteId))!.version,responsable_id:responsableId,version_vinculo:1,motivo:'Control sintético',sintomas:'',signos_vitales:{peso_kg:12.345,talla_cm:90.12,temperatura_c:36.5,presion_sistolica:100,presion_diastolica:60,frecuencia_cardiaca_lpm:90,frecuencia_respiratoria_rpm:20,saturacion_oxigeno_pct:98.12,perimetro_cefalico_cm:45},diagnosticos:[{codigo_cie:'SINT',nombre:'Diagnóstico sintético',es_principal:true}],tratamientos:[{descripcion:'Tratamiento sintético',indicaciones:'Sin uso clínico'}],receta:{medicamentos:[medicamento]}});
  await t.test('migración requerida; inicialización nueva y reejecución sin pérdida',async()=>{
    await assert.rejects(atencion.ejecutar('completa',{contexto,bundle,claveIdempotencia:id(),entrada:await entrada()}),{codigo:'PERSISTENCIA_NO_DISPONIBLE'});
    await db.doc('historial_configuracion/modelo').set({version:1,estado:'LISTO'});
    assert.equal((await migracion.prepararClinicaFirestore(db) as {estado:string}).estado,'LISTO');
    assert.equal((await migracion.prepararClinicaFirestore(db) as {estado:string}).estado,'LISTO');
    assert.equal((await migracion013.prepararManifiestoPediatricoFirestore(db)).actualizado,false);
  });
  await t.test('consulta completa, receta histórica, todos los signos y reintento estable',async()=>{
    const e = await entrada(), clave = id(); const r = await atencion.ejecutar('completa',{contexto,bundle,claveIdempotencia:clave,entrada:e});
    assert.equal(r.respuesta.estado,'FINALIZADA');
    assert.deepEqual(await bundle.clinica!.consultas.porId(r.respuesta.id),r.respuesta);
    assert.deepEqual(await atencion.ejecutar('completa',{contexto,bundle,claveIdempotencia:clave,entrada:e}),r);
    await db.doc(`pediatras/${profesional}`).update({nombres:'Nombre cambiado'});
    await db.doc(`responsables/${responsableId}`).update({nombres:'Nombre cambiado'});
    assert.deepEqual(await bundle.clinica!.consultas.porVersion(r.respuesta.id,versionPositiva(1)),r.respuesta);
    assert.equal(await bundle.clinica!.consultas.porVersion(r.respuesta.id,versionPositiva(99)),null);
    const eventos = await db.collection('historial_eventos').where('paciente_id','==',pacienteId).get(); assert.equal(eventos.size,4);
    await assert.rejects(atencion.ejecutar('completa',{contexto,bundle,claveIdempotencia:clave,entrada:{...e,motivo:'Diferente'}}),{codigo:'CLAVE_REUTILIZADA'});
    await db.doc(`roles/${rol}`).update({permisos:['historial.leer']});
    await assert.rejects(atencion.ejecutar('completa',{contexto,bundle,claveIdempotencia:clave,entrada:e}),{codigo:'SIN_PERMISO'});
    await db.doc(`roles/${rol}`).update({permisos:cuenta.permisos});
  });
  await t.test('migración013 nueva/existente, rollback, rechazo de deriva y reejecución sin pérdida',async()=>{
    const m=migracion013;
    const consultasAntes=(await db.collection('consultas').get()).docs.map(d=>({id:d.id,datos:d.data()}));
    assert.ok(consultasAntes.length>0);
    const pacienteAntes=(await db.doc(`pacientes/${pacienteId}`).get()).data();
    assert.equal((await m.prepararManifiestoPediatricoFirestore(db)).actualizado,false);
    const rutas=(await db.doc('configuracion/modelo').get()).get('rutas');
    await db.doc('configuracion/modelo').update({rutas:['ruta/ajena']});
    await assert.rejects(m.prepararManifiestoPediatricoFirestore(db),/RUTAS_MODELO_INCOMPATIBLES/);
    await db.doc('configuracion/modelo').update({rutas});
    await db.doc('configuracion/modelo').update({hash_modelo:m.HUELLA_ORIGEN});
    await db.doc('clinica_configuracion/modelo').update({huella:m.HUELLA_ORIGEN});
    await assert.rejects(m.prepararManifiestoPediatricoFirestore(db,{antesDeConfirmar:()=>{throw new Error('FALLO_INYECTADO');}}),/FALLO_INYECTADO/);
    assert.equal((await db.doc('configuracion/modelo').get()).get('hash_modelo'),m.HUELLA_ORIGEN);
    assert.equal((await db.doc('clinica_configuracion/modelo').get()).get('huella'),m.HUELLA_ORIGEN);
    assert.deepEqual((await db.collection('consultas').get()).docs.map(d=>({id:d.id,datos:d.data()})),consultasAntes);
    assert.equal((await db.doc('clinica_migracion_013_respaldo/modelo').get()).exists,false);
    await db.doc('configuracion/modelo').update({hash_modelo:m.HUELLA_ORIGEN_CRLF_COMPLETO});
    await db.doc('clinica_configuracion/modelo').update({huella:m.HUELLA_ORIGEN_CRLF_COMPLETO});
    assert.equal((await m.prepararManifiestoPediatricoFirestore(db)).actualizado,true);
    assert.equal((await m.prepararManifiestoPediatricoFirestore(db)).actualizado,false);
    assert.deepEqual((await db.doc(`pacientes/${pacienteId}`).get()).data(),pacienteAntes);
    assert.deepEqual((await db.collection('consultas').get()).docs.map(d=>({id:d.id,datos:d.data()})),consultasAntes);
    assert.equal((await db.doc('clinica_migracion_013_respaldo/modelo').get()).get('clinica.huella'),m.HUELLA_ORIGEN_CRLF_COMPLETO);
    const hash=(await db.doc('configuracion/modelo').get()).get('hash_modelo') as string;
    await db.doc('configuracion/modelo').update({hash_modelo:'deriva-desconocida'});
    await assert.rejects(m.prepararManifiestoPediatricoFirestore(db),/MANIFIESTO_CLINICO_INCOMPATIBLE/);
    await db.doc('configuracion/modelo').update({hash_modelo:hash});
  });
  await t.test('principal sin autorización y vínculo inactivo se rechazan sin parcialidad',async()=>{
    const ref = db.doc(`pacientes/${pacienteId}/responsables/${responsableId}`);
    for (const cambio of [{autoriza_atencion:false},{autoriza_atencion:true,estado:'INACTIVO'}]) {
      await ref.update(cambio);
      await assert.rejects(atencion.ejecutar('completa',{contexto,bundle,claveIdempotencia:id(),entrada:await entrada()}),{codigo:'SIN_PERMISO'});
    }
    await ref.update({autoriza_atencion:true,estado:'ACTIVO'});
    assert.equal((await db.collection('consultas').get()).size,1);
  });
  await t.test('apertura, componentes, finalización y versiones exactas',async()=>{
    const {diagnosticos,tratamientos,receta,...e} = await entrada();
    const abierta = await atencion.ejecutar('abrir',{contexto,bundle,claveIdempotencia:id(),entrada:e});
    const consultaId = abierta.respuesta.id;
    const d = await atencion.ejecutar('diagnostico',{contexto,bundle,id:consultaId,claveIdempotencia:id(),entrada:{version_esperada:1,diagnostico:diagnosticos[0]}});
    assert.equal(d.respuesta.version,2);
    assert.deepEqual(await bundle.clinica!.consultas.porVersion(consultaId,versionPositiva(1)),abierta.respuesta);
    await assert.rejects(atencion.ejecutar('finalizar',{contexto,bundle,id:consultaId,claveIdempotencia:id(),entrada:{version_esperada:1}}),{codigo:'VERSION_DESACTUALIZADA'});
    const r = await atencion.ejecutar('receta',{contexto,bundle,id:consultaId,claveIdempotencia:id(),entrada:{version_esperada:2,receta}});
    await assert.rejects(atencion.ejecutar('receta',{contexto,bundle,id:consultaId,claveIdempotencia:id(),entrada:{version_esperada:3,receta}}),{codigo:'RECETA_EXISTENTE'});
    const f = await atencion.ejecutar('finalizar',{contexto,bundle,id:consultaId,claveIdempotencia:id(),entrada:{version_esperada:r.respuesta.version}});
    assert.equal(f.respuesta.estado,'FINALIZADA');
    assert.deepEqual(await bundle.clinica!.consultas.porVersion(consultaId,versionPositiva(3)),r.respuesta);
    await assert.rejects(atencion.ejecutar('tratamiento',{contexto,bundle,id:consultaId,claveIdempotencia:id(),entrada:{version_esperada:4,tratamiento:tratamientos[0]}}),{codigo:'ESTADO_INVALIDO'});
  });
  await t.test('fallos antes de receta y antes de auditoría revierten la transacción entera',async()=>{
    for (const punto of ['receta','auditoria']) {
    const antes = await Promise.all(['consultas','operaciones','auditoria','historial_eventos'].map(async c=>(await db.collection(c).get()).size));
    const versionAntes = (await bundle.pacientes!.porId(pacienteId))!.version;
    const original = bundle.uow!;
    const roto: BundleInstitucional = {...bundle,uow: {ejecutar(ctx,comando,planificar) {
      return original.ejecutar(ctx,comando, async lector => {
        const plan = await planificar(lector);
        // Fallo real de validación al guardar auditoría, después de aplicar los datos.
        if (plan.tipo !== 'CONFIRMAR') return plan;
        if (punto === 'auditoria') return {...plan,auditoria:plan.auditoria.map(a=>({...a,caso:''}))};
        return {...plan,cambios:plan.cambios.map(cambio=>{
          if (cambio.agregado !== 'consultas') return cambio;
          const c = cambio.nuevoEstado as Consulta;
          // Fallo físico de receta: texto requerido inválido, sin alterar el DTO aceptado.
          return {...cambio,nuevoEstado:{...c,receta:{...c.receta!,medicamentos:c.receta!.medicamentos.map(m=>({...m,concentracion:''}))}} as typeof cambio.nuevoEstado};
        })};
      });
    }}};
    await assert.rejects(atencion.ejecutar('completa',{contexto,bundle:roto,claveIdempotencia:id(),entrada:await entrada()}));
    assert.deepEqual(await Promise.all(['consultas','operaciones','auditoria','historial_eventos'].map(async c=>(await db.collection(c).get()).size)),antes);
    assert.equal((await bundle.pacientes!.porId(pacienteId))!.version,versionAntes);
    }
  });
  await t.test('dos atenciones compiten por revisión de paciente: una sola confirma',async()=>{
    const e = await entrada(); const resultados = await Promise.allSettled([1,2].map(()=>atencion.ejecutar('completa',{contexto,bundle,claveIdempotencia:id(),entrada:e})));
    assert.equal(resultados.filter(r=>r.status === 'fulfilled').length,1);
    const fallo = resultados.find(r=>r.status === 'rejected') as PromiseRejectedResult; assert.ok(['VERSION_DESACTUALIZADA','PERSISTENCIA_NO_DISPONIBLE'].includes(fallo.reason.codigo));
    await assert.rejects(atencion.ejecutar('completa',{contexto,bundle,claveIdempotencia:id(),entrada:e}),{codigo:'VERSION_DESACTUALIZADA'});
  });
  await t.test('cita propia atendida en el mismo commit; cita ajena/cancelada sin consulta',async()=>{
    const agenda = new GestionarCitas(deps); const lectura = new ConsultarCitas();
    const version = (await bundle.pacientes!.porId(pacienteId))!.version;
    const cita = (await agenda.ejecutar('crear',{contexto,bundle,claveIdempotencia:id(),entrada:{paciente_id:pacienteId,version_paciente:version,profesional_id:profesional,fecha:'2026-10-30',hora_inicio:'09:00',duracion_minutos:30,motivo:'Control con cita',consultorio:'S1'}})).respuesta;
    const e = {...await entrada(),cita_id:cita.id,version_cita:1};
    const r = await atencion.ejecutar('completa',{contexto,bundle,claveIdempotencia:id(),entrada:e});
    assert.equal((await lectura.porId(contexto,bundle,cita.id)).estado,'ATENDIDA');
    assert.equal(r.respuesta.cita_id,cita.id);
    await assert.rejects(atencion.ejecutar('completa',{contexto,bundle,claveIdempotencia:id(),entrada:{...await entrada(),cita_id:cita.id,version_cita:2}}),{codigo:'REFERENCIA_INCOMPATIBLE'});
    const segunda = (await agenda.ejecutar('crear',{contexto,bundle,claveIdempotencia:id(),entrada:{paciente_id:pacienteId,version_paciente:(await bundle.pacientes!.porId(pacienteId))!.version,profesional_id:profesional,fecha:'2026-10-30',hora_inicio:'09:30',duracion_minutos:30,motivo:'Otra cita'}})).respuesta;
    await agenda.ejecutar('reprogramar',{contexto,bundle,id:segunda.id,claveIdempotencia:id(),entrada:{version_esperada:1,fecha:'2026-10-30',hora_inicio:'10:00',duracion_minutos:30,motivo:'Cambio sintético'}});
    await agenda.ejecutar('cancelar',{contexto,bundle,id:segunda.id,claveIdempotencia:id(),entrada:{version_esperada:2,motivo:'Cancelación sintética'}});
    const cancelada = await lectura.porId(contexto,bundle,segunda.id); assert.equal(cancelada.motivo_cancelacion,'Cancelación sintética');
    await assert.rejects(atencion.ejecutar('completa',{contexto,bundle,claveIdempotencia:id(),entrada:{...await entrada(),cita_id:segunda.id,version_cita:3}}),{codigo:'REFERENCIA_INCOMPATIBLE'});
    const filtrada = await lectura.listar(contexto,bundle,{fecha_desde:'2026-10-30',fecha_hasta:'2026-10-31',estado:'CANCELADA',q:'Otra',orden:'DESC',profesional_id:profesional}); assert.equal(filtrada.elementos.length,1); assert.equal(filtrada.elementos[0]!.id,segunda.id);
    const pagina = await lectura.listar(contexto,bundle,{fecha_desde:'2026-10-30',fecha_hasta:'2026-10-31',limite:'1'}); assert.equal(pagina.elementos.length,1); assert.ok(pagina.siguienteCursor);
    const otra = await lectura.listar(contexto,bundle,{fecha_desde:'2026-10-30',fecha_hasta:'2026-10-31',limite:'1',cursor:pagina.siguienteCursor}); assert.equal(otra.elementos[0]!.id,segunda.id);
    await assert.rejects(lectura.listar({...contexto,cuenta:{...contexto.cuenta,id:id()}},bundle,{fecha_desde:'2026-10-30',fecha_hasta:'2026-10-31',limite:'1',cursor:pagina.siguienteCursor}),{codigo:'SOLICITUD_INVALIDA'});
  });
  await t.test('reservas simultáneas de distintos pacientes no solapan al mismo pediatra',async()=>{
    const segundo = (await new RegistrarPaciente(deps).ejecutar({contexto,bundle,claveIdempotencia:id(),entrada:{nombres:'Otro',apellidos:'Menor',fecha_nacimiento:'2021-01-01',sexo:'MASCULINO',responsables:[{responsable_id:responsableId,version_responsable:1,parentesco:'MADRE',es_principal:true,autoriza_atencion:true}]}})).respuesta;
    const agenda = new GestionarCitas(deps);
    const e = {profesional_id:profesional,fecha:'2026-10-31',hora_inicio:'11:00',duracion_minutos:30,motivo:'Reserva concurrente'};
    const parametros = await Promise.all([pacienteId,uuidPublico(segundo.id)].map(async pid=>({contexto,bundle,claveIdempotencia:id(),entrada:{...e,paciente_id:pid,version_paciente:(await bundle.pacientes!.porId(pid))!.version}})));
    const resultados = await Promise.allSettled(parametros.map(p=>agenda.ejecutar('crear',p)));
    const confirmadas = resultados.filter(r=>r.status === 'fulfilled').length;
    assert.ok(confirmadas <= 1);
    for (const r of resultados) if (r.status === 'rejected') assert.ok(['CITA_SOLAPADA','PERSISTENCIA_NO_DISPONIBLE'].includes(r.reason.codigo));
    if (confirmadas === 0) {
      // Ambos pueden agotar reintentos por contención: recuperar las mismas intenciones sin inventar éxito.
      await agenda.ejecutar('crear',parametros[0]!);
      await assert.rejects(agenda.ejecutar('crear',parametros[1]!),{codigo:'CITA_SOLAPADA'});
    }
    const reservas = await new ConsultarCitas().listar(contexto,bundle,{fecha_desde:'2026-10-31',fecha_hasta:'2026-11-01'}); assert.equal(reservas.elementos.length,1);
  });
  await t.test('migración existente preserva respaldo, reanuda por UUID y bloquea legado sin procedencia',async()=>{
    const otro = crearClienteFirestore({emulatorHost:host!,projectId:`demo-legado-${process.pid}`,databaseId:'(default)',institucionalId:'CENTRO_MEDICO_PEDIATRICO'});
    try {
      await inicializador.inicializarFirestore(otro.firestore);
      await otro.firestore.doc('historial_configuracion/modelo').set({version:1,estado:'LISTO'});
      await otro.firestore.doc('configuracion/modelo').update({version_esquema:2,hash_modelo:'d5f341030fb4740264245a67dc39f04298b0e263f2b6ef28086f38f529562a29'});
      await assert.rejects(migracion.prepararClinicaFirestore(otro.firestore),/MANIFIESTO_CLINICO_INCOMPATIBLE/);
      assert.equal((await otro.firestore.doc('clinica_configuracion/modelo').get()).exists,false);
      await otro.firestore.doc('configuracion/modelo').update({version_esquema:1});
      const primera = (await db.collection('consultas').limit(1).get()).docs[0]!;
      const {snapshot_v1,signos_vitales,...legado} = primera.data();
      assert.ok(snapshot_v1); assert.ok(signos_vitales);
      const ref = otro.firestore.doc(`consultas/${primera.id}`); await ref.set(legado);
      const antes = (await ref.get()).data();
      await assert.rejects(migracion.prepararClinicaFirestore(otro.firestore,{despuesDePagina(){throw new Error('INTERRUPCION_SINTETICA');}}),/INTERRUPCION_SINTETICA/);
      assert.equal((await otro.firestore.doc('clinica_configuracion/modelo').get()).get('estado'),'MIGRANDO');
      assert.equal((await migracion.prepararClinicaFirestore(otro.firestore) as {estado:string}).estado,'RECONCILIAR');
      assert.deepEqual((await otro.firestore.doc(`clinica_migracion_006_respaldo/${primera.id}`).get()).data(),antes);
      assert.deepEqual((await ref.get()).get('control_crecimiento'),antes!.control_crecimiento);
      assert.equal((await ref.get()).get('signos_vitales.peso_kg'),antes!.control_crecimiento.peso_kg);
      assert.equal((await ref.get()).get('signos_vitales.fecha_hora_medicion'),undefined);
      await assert.rejects(crearBundlePacientesFirestore(otro).clinica!.consultas.porId(uuidPublico(primera.id)),{codigo:'PERSISTENCIA_NO_DISPONIBLE'});
      await otro.firestore.doc('configuracion/modelo').update({hash_modelo:'0'.repeat(64)});
      await assert.rejects(migracion.prepararClinicaFirestore(otro.firestore),/MANIFIESTO_CLINICO_INCOMPATIBLE/);
    } finally {await otro.cerrar();}
  });
  await t.test('retirada de autorización concurrente preserva orden y bloquea la siguiente atención',async()=>{
    const e = await entrada(); const ref = db.doc(`pacientes/${pacienteId}/responsables/${responsableId}`);
    const resultados = await Promise.allSettled([atencion.ejecutar('completa',{contexto,bundle,claveIdempotencia:id(),entrada:e}),ref.update({autoriza_atencion:false,revision:2})]);
    assert.equal(resultados[1]!.status,'fulfilled');
    const at = resultados[0]!; if (at.status === 'fulfilled') assert.equal(at.value.respuesta.autorizacion!.version_vinculo,1);
    else assert.ok(['SIN_PERMISO','VERSION_DESACTUALIZADA','PERSISTENCIA_NO_DISPONIBLE'].includes(at.reason.codigo));
    await assert.rejects(atencion.ejecutar('completa',{contexto,bundle,claveIdempotencia:id(),entrada:{...await entrada(),version_vinculo:2}}),{codigo:'SIN_PERMISO'});
    await ref.update({autoriza_atencion:true,revision:1});
  });
  await t.test('límites, precisión y campos extra no consumen clave ni alteran datos',async()=>{
    const e = await entrada();
    for (const cambios of [{diagnosticos:Array(101).fill(e.diagnosticos[0])},{signos_vitales:{peso_kg:12.3456}},{signos_vitales:{control_2:{peso_kg:10}}}]) {
      await assert.rejects(atencion.ejecutar('completa',{contexto,bundle,claveIdempotencia:id(),entrada:{...e,...cambios}}));
    }
    await assert.rejects(atencion.ejecutar('completa',{contexto,bundle,claveIdempotencia:id(),entrada:{...e,sintomas:'a'.repeat(262145)}}));
  });
  await t.test('archivo, corrección y reactivación conservan historia en emulador', async () => {
    const original = await atencion.ejecutar('completa', {contexto, bundle, claveIdempotencia: id(), entrada: await entrada()});
    const estado = new CambiarEstadoHistorial(deps);
    const paciente = (await bundle.pacientes!.porId(pacienteId))!;
    const archivado = await estado.ejecutar('archivar', {contexto, bundle, id: pacienteId, claveIdempotencia: id(), entrada: {
      version_esperada: paciente.version, causa: 'FALLECIMIENTO', motivo: 'Registro sintético'}});
    assert.equal((await bundle.pacientes!.porId(pacienteId))?.estado, 'ARCHIVADO');
    await assert.rejects(atencion.ejecutar('completa', {contexto, bundle, claveIdempotencia: id(), entrada: await entrada()}), {codigo: 'ESTADO_INVALIDO'});
    const corregida = await atencion.ejecutar('corregir', {contexto, bundle, id: original.respuesta.id, claveIdempotencia: id(), entrada: {
      version_esperada: 1, motivo_correccion: 'Corrección sintética', contenido: {motivo: 'Corregido', sintomas: '', signos_vitales: {}, diagnosticos: [], tratamientos: []}}});
    assert.deepEqual(await bundle.clinica!.consultas.porId(original.respuesta.id), corregida.respuesta);
    assert.deepEqual(await bundle.clinica!.consultas.porVersion(original.respuesta.id, versionPositiva(1)), original.respuesta);
    const version = archivado.respuesta.version + 1;
    await assert.rejects(estado.ejecutar('reactivar', {contexto, bundle, id: pacienteId, claveIdempotencia: id(), entrada: {version_esperada: version, motivo: 'Rectificación sintética'}}));
    const activa = await estado.ejecutar('reactivar', {contexto, bundle, id: pacienteId, claveIdempotencia: id(), entrada: {version_esperada: version, motivo: 'Rectificación sintética', correccion_fallecimiento: true}});
    assert.equal(activa.respuesta.estado, 'ACTIVO');
    assert.equal((await bundle.pacientes!.porId(pacienteId))?.baja?.causa, 'FALLECIMIENTO');
  });

  await t.test('archivo compite con atención sobre una única revisión Firestore', async () => {
    const datos = await entrada(); const estado = new CambiarEstadoHistorial(deps);
    const r = await Promise.allSettled([
      estado.ejecutar('archivar', {contexto, bundle, id: pacienteId, claveIdempotencia: id(), entrada: {version_esperada: datos.version_paciente, causa: 'TRASLADO', motivo: 'Carrera sintética'}}),
      atencion.ejecutar('completa', {contexto, bundle, claveIdempotencia: id(), entrada: datos}),
    ]);
    assert.equal(r.filter(x => x.status === 'fulfilled').length, 1);
    assert.equal((await bundle.pacientes!.porId(pacienteId))?.version, datos.version_paciente + 1);
  });

  await t.test('E04: contacto compartido, principalidad, baja y reactivación versionadas',async()=>{
    const segundo=(await new RegistrarPaciente(deps).ejecutar({contexto,bundle,claveIdempotencia:id(),entrada:{nombres:'Hermano',apellidos:'Sintético',fecha_nacimiento:'2023-01-01',sexo:'MASCULINO',responsables:[{responsable_id:responsableId,version_responsable:1,parentesco:'MADRE',es_principal:true,autoriza_atencion:false}]}})).respuesta;
    const pid=uuidPublico(segundo.id),gestor=new GestionarResponsable(deps);
    const cmd=(accion:'contacto'|'vinculo'|'baja'|'vincular',rid:string,entrada:unknown,clave=id())=>gestor.ejecutar(accion,{contexto,bundle,id:pid,entrada,claveIdempotencia:clave},rid);
    const clave=id(),contacto={version_paciente:1,version_responsable:1,telefono:'55550001'};
    await cmd('contacto',responsableId,contacto,clave);await cmd('contacto',responsableId,contacto,clave);
    assert.equal((await bundle.pacientes!.porId(pid))!.version,2);
    assert.equal((await bundle.pacientes!.porId(pid))!.responsables![0]!.responsable.telefono,'55550001');
    assert.equal((await db.doc(`responsables/${responsableId}`).get()).get('revision'),2);
    await assert.rejects(cmd('baja',responsableId,{version_paciente:2,version_vinculo:1,motivo:'Baja imposible'}),{codigo:'ESTADO_INVALIDO'});
    const altaClave=id();
    const altaEntrada={version_paciente:2,nombres:'Tutor',apellidos:'Sintético',telefono:'55555555',documento:{tipo:'CUI',numero:'1234567890102'},parentesco:'TUTOR',es_principal:true,autoriza_atencion:false};
    const alta=await gestor.ejecutar('crear',{contexto,bundle,id:pid,claveIdempotencia:altaClave,entrada:altaEntrada});
    const repetida=await gestor.ejecutar('crear',{contexto,bundle,id:pid,claveIdempotencia:altaClave,entrada:altaEntrada});
    assert.deepEqual(repetida.respuesta,alta.respuesta);
    assert.equal((await db.doc(`responsables/${alta.respuesta.id}`).get()).get('revision'),1);
    await assert.rejects(gestor.ejecutar('crear',{contexto,bundle,id:pid,claveIdempotencia:id(),entrada:{...altaEntrada,version_paciente:3}}),{codigo:'PACIENTE_DUPLICADO'});
    await cmd('baja',responsableId,{version_paciente:3,version_vinculo:1,motivo:'Baja sintética'});
    assert.equal((await db.doc(`pacientes/${pid}/responsables/${responsableId}`).get()).get('estado'),'INACTIVO');
    await cmd('vincular',responsableId,{version_paciente:4,version_responsable:2,version_vinculo:2,parentesco:'MADRE',es_principal:false,autoriza_atencion:true});
    assert.equal((await db.doc(`pacientes/${pid}/responsables/${responsableId}`).get()).get('revision'),3);
    assert.equal((await bundle.pacientes!.porId(pid))!.responsables!.length,2);
    assert.equal((await bundle.pacientes!.porId(pacienteId))!.responsables![0]!.responsable.telefono,'55550001');
    assert.equal((await db.collection(`responsables/${responsableId}/historia_contacto`).get()).size,1);
    await cmd('vinculo',responsableId,{version_paciente:5,version_vinculo:3,parentesco:'MADRE',es_principal:true,autoriza_atencion:true});
    const carrera=await Promise.allSettled([
      cmd('baja',responsableId,{version_paciente:6,version_vinculo:4,motivo:'Carrera uno'}),
      cmd('baja',alta.respuesta.id,{version_paciente:6,version_vinculo:1,motivo:'Carrera dos'})
    ]);
    assert.equal(carrera.filter(r=>r.status==='fulfilled').length,1);
    assert.equal((await bundle.pacientes!.porId(pid))!.responsables!.filter(r=>r.vinculo.esPrincipal).length,1);

  });

  await t.test('E04 migración 009 aditiva: nueva, reinicio y legado conservado',async()=>{
    const {prepararAntecedentesPediatricos}=await import(new URL('../../../../Database/migrations/009_antecedentes_pediatricos.mjs',import.meta.url).href) as {prepararAntecedentesPediatricos:(db:unknown,opciones?:{despuesDePagina?:()=>void})=>Promise<{estado:string}>};
    let interrumpido=false;
    await assert.rejects(prepararAntecedentesPediatricos(db,{despuesDePagina:()=>{interrumpido=true;throw new Error('INTERRUPCION_SINTETICA');}}),/INTERRUPCION_SINTETICA/);
    assert.equal(interrumpido,true);
    assert.equal((await prepararAntecedentesPediatricos(db)).estado,'LISTO');
    assert.deepEqual(await bundle.antecedentesPediatricos!.porPaciente(pacienteId),{version:0,alergias:[]});
    assert.equal((await prepararAntecedentesPediatricos(db)).estado,'LISTO');
    // Un proyecto separado simula instalación existente con historia sin autor verificable.
    const legado=crearClienteFirestore({emulatorHost:host!,projectId:`demo-legado-${process.pid}`,databaseId:'(default)',institucionalId:'CENTRO_MEDICO_PEDIATRICO'});
    try {
      const ldb=legado.firestore,pid=id(),aid=id();
      await ldb.doc('clinica_configuracion/modelo').set({version:1,estado:'LISTO'});
      await ldb.doc(`pacientes/${pid}`).set({revision:1});
      const datos={revision:1,nombre:'Polen',tipo:'ALERGIA',reaccion:'Sintética',severidad:'LEVE',estado:'ACTIVA',fecha_registro:new Date('2026-01-01')};
      await ldb.doc(`pacientes/${pid}/alergias/${aid}`).set(datos);
      assert.equal((await prepararAntecedentesPediatricos(ldb)).estado,'RECONCILIAR');
      await assert.rejects(crearBundlePacientesFirestore(legado).antecedentesPediatricos!.porPaciente(pid),{codigo:'PERSISTENCIA_NO_DISPONIBLE'});
      assert.deepEqual((await ldb.doc(`pacientes/${pid}/alergias/${aid}`).get()).data(),(await ldb.doc(`pediatria_respaldo_009/${pid}/alergias/${aid}`).get()).data());
      assert.equal((await prepararAntecedentesPediatricos(ldb)).estado,'RECONCILIAR');
    }finally{await legado.cerrar();}
  });

  await t.test('E04 antecedentes: alergia histórica, baja y perinatales con replay',async()=>{
    const menor=(await new RegistrarPaciente(deps).ejecutar({contexto,bundle,claveIdempotencia:id(),entrada:{nombres:'Antecedentes',apellidos:'Sintéticos',fecha_nacimiento:'2024-02-29',sexo:'MASCULINO',responsables:[{responsable_id:responsableId,version_responsable:2,parentesco:'MADRE',es_principal:true,autoriza_atencion:true}]}})).respuesta;
    const pid=uuidPublico(menor.id),servicio=new GestionarAntecedentes(deps),clave=id();
    const entrada={version_paciente:1,version_antecedentes:0,motivo:'Registro sintético',alergia:{sustancia:'Polen',severidad:'LEVE',reaccion:'Erupción sintética'}};
    const a=await servicio.ejecutar('alergia',{contexto,bundle,id:pid,claveIdempotencia:clave,entrada});
    assert.deepEqual((await servicio.ejecutar('alergia',{contexto,bundle,id:pid,claveIdempotencia:clave,entrada})).respuesta,a.respuesta);
    await assert.rejects(servicio.ejecutar('sinAlergias',{contexto,bundle,id:pid,claveIdempotencia:id(),entrada:{version_paciente:2,version_antecedentes:1,motivo:'Confirmación imposible'}}),{codigo:'ESTADO_INVALIDO'});
    await servicio.ejecutar('bajaAlergia',{contexto,bundle,id:pid,claveIdempotencia:id(),entrada:{version_paciente:2,version_antecedentes:1,motivo:'Rectificación sintética',alergia_id:a.respuesta.alergias[0]!.id}});
    const p=await servicio.ejecutar('perinatales',{contexto,bundle,id:pid,claveIdempotencia:id(),entrada:{version_paciente:3,version_antecedentes:2,motivo:'Datos perinatales',perinatales:{apgar1Minuto:0,pesoNacimientoGramos:3000}}});
    assert.equal(p.respuesta.version,3);assert.equal(p.respuesta.alergias[0]!.activa,false);
    assert.equal((await db.collection(`pediatria_antecedentes/${pid}/versiones`).get()).size,3);
    assert.equal((await bundle.antecedentesPediatricos!.porPaciente(pid)).perinatales!.apgar1Minuto,0);
    const historia={patologicos:['Antecedente sintético'],quirurgicos:[],familiares:['Registro familiar sintético'],medicamentosActuales:[]};
    const hc=id(),he={version_paciente:4,version_antecedentes:3,motivo:'Historia sintética',historia};
    const h=await servicio.ejecutar('historia',{contexto,bundle,id:pid,claveIdempotencia:hc,entrada:he});
    assert.deepEqual((await servicio.ejecutar('historia',{contexto,bundle,id:pid,claveIdempotencia:hc,entrada:he})).respuesta,h.respuesta);
    assert.deepEqual((await bundle.antecedentesPediatricos!.porPaciente(pid)).historia,historia);
    await assert.rejects(servicio.ejecutar('historia',{contexto,bundle,id:pid,claveIdempotencia:id(),entrada:he}),{codigo:'VERSION_DESACTUALIZADA'});
    const versiones=await db.collection(`pediatria_antecedentes/${pid}/versiones`).get();
    assert.equal(versiones.size,4);
    const ultima=versiones.docs.find(doc=>doc.get('actual.version')===4)!;
    assert.equal(ultima.get('anterior.version'),3);
    assert.equal(ultima.get('anterior.historia'),undefined);
    assert.deepEqual(ultima.get('actual.historia'),historia);
    assert.deepEqual((await bundle.antecedentesPediatricos!.porVersion!(pid,4))!.actual.historia,historia);
    await new CambiarEstadoHistorial(deps).ejecutar('archivar',{contexto,bundle,id:pid,claveIdempotencia:id(),entrada:{version_esperada:5,causa:'TRASLADO',motivo:'Archivo sintético'}});
    await assert.rejects(servicio.ejecutar('historia',{contexto,bundle,id:pid,claveIdempotencia:id(),entrada:{...he,version_paciente:6,version_antecedentes:4}}),{codigo:'ESTADO_INVALIDO'});
    const corregida={...historia,patologicos:['Antecedente rectificado']};
    await servicio.ejecutar('rectificar',{contexto,bundle,id:pid,claveIdempotencia:id(),entrada:{version_paciente:6,version_antecedentes:4,motivo:'Corrección autorizada',historia:corregida}});
    assert.equal((await bundle.pacientes!.porId(pid))!.estado,'ARCHIVADO');
    assert.deepEqual((await bundle.antecedentesPediatricos!.porVersion!(pid,5))!.anterior.historia,historia);


  });

  await t.test('E04 crecimiento: paginación por consulta única y rango vacío real',async()=>{
    const servicio=new ConsultarCrecimiento();
    const primera=await servicio.ejecutar(contexto,bundle,pacienteId,{limite:1});
    assert.equal(primera.data.length,1);
    assert.equal(primera.data[0]!.consulta_id.length,36);
    const ids=new Set(primera.data.map(x=>x.consulta_id));
    let cursor=primera.meta.siguiente_cursor;
    while(cursor){const pagina=await servicio.ejecutar(contexto,bundle,pacienteId,{limite:1,cursor});for(const m of pagina.data){assert.equal(ids.has(m.consulta_id),false);ids.add(m.consulta_id);}cursor=pagina.meta.siguiente_cursor;}
    assert.ok(ids.size>=1);
    const asc=await servicio.ejecutar(contexto,bundle,pacienteId,{limite:100,orden:'ASC'}),desc=await servicio.ejecutar(contexto,bundle,pacienteId,{limite:100,orden:'DESC'});
    assert.deepEqual(desc.data.map(x=>x.consulta_id),asc.data.map(x=>x.consulta_id).reverse());
    assert.deepEqual((await servicio.ejecutar(contexto,bundle,pacienteId,{desde:'2099-01-01T00:00:00Z'})).data,[]);
    if(primera.meta.siguiente_cursor)await assert.rejects(servicio.ejecutar(contexto,bundle,pacienteId,{limite:2,cursor:primera.meta.siguiente_cursor}),{codigo:'SOLICITUD_INVALIDA'});
  });

  await t.test('E04 fallo de auditoría revierte contacto, historia, revisión y clave',async()=>{
    const actual=await bundle.responsablesPediatricos!.porDocumento({tipo:'CUI',numero:'1234567890101'});assert.ok(actual);
    const menor=(await new RegistrarPaciente(deps).ejecutar({contexto,bundle,claveIdempotencia:id(),entrada:{nombres:'Rollback',apellidos:'Sintético',fecha_nacimiento:'2024-01-01',sexo:'MASCULINO',responsables:[{responsable_id:actual.id,version_responsable:actual.version,parentesco:'MADRE',es_principal:true,autoriza_atencion:true}]}})).respuesta;
    const pid=uuidPublico(menor.id),original=bundle.uow!;
    const roto:BundleInstitucional={...bundle,uow:{ejecutar(ctx,comando,planificar){return original.ejecutar(ctx,comando,async lector=>{const plan=await planificar(lector);return plan.tipo==='CONFIRMAR'?{...plan,auditoria:plan.auditoria.map(a=>({...a,caso:''}))}:plan;});}}};
    const antes=(await db.collection(`responsables/${actual.id}/historia_contacto`).get()).size;
    const contacto={version_paciente:1,version_responsable:actual.version,telefono:'55559999'},clave=id();
    await assert.rejects(new GestionarResponsable(deps).ejecutar('contacto',{contexto,bundle:roto,id:pid,claveIdempotencia:clave,entrada:contacto},actual.id));
    assert.equal((await bundle.pacientes!.porId(pid))!.version,1);
    assert.equal((await db.collection(`responsables/${actual.id}/historia_contacto`).get()).size,antes);
    assert.equal((await bundle.responsablesPediatricos!.porDocumento(actual.documento!))!.telefono,actual.telefono);
    await new GestionarResponsable(deps).ejecutar('contacto',{contexto,bundle,id:pid,claveIdempotencia:clave,entrada:contacto},actual.id);
    const entrada={version_paciente:2,version_antecedentes:0,motivo:'Prueba rollback',perinatales:{apgar1Minuto:0}},claveAnt=id();
    await assert.rejects(new GestionarAntecedentes(deps).ejecutar('perinatales',{contexto,bundle:roto,id:pid,claveIdempotencia:claveAnt,entrada}));
    assert.equal((await bundle.pacientes!.porId(pid))!.version,2);
    assert.deepEqual(await bundle.antecedentesPediatricos!.porPaciente(pid),{version:0,alergias:[]});
    assert.equal((await db.collection(`pediatria_antecedentes/${pid}/versiones`).get()).size,0);
    await new GestionarAntecedentes(deps).ejecutar('perinatales',{contexto,bundle,id:pid,claveIdempotencia:claveAnt,entrada});
    assert.equal((await bundle.antecedentesPediatricos!.porPaciente(pid)).version,1);
  });

});
