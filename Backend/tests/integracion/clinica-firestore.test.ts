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
  const inicializador = await import(new URL('../../../../Database/centro_pediatrico_firestore.mjs',import.meta.url).href) as {inicializarFirestore(db:unknown):Promise<unknown>};
  await inicializador.inicializarFirestore(db);
  const actor = id(), rol = id(), profesional = id(), uid = `clinica-${randomUUID()}`;
  await db.doc(`pediatras/${profesional}`).set({revision:1,nombres:'Ana',apellidos:'Sintética',colegiado:'SINT-1',entidad_colegiacion:'Colegio sintético',especialidad:'Pediatría',estado:'ACTIVO'});
  await db.doc(`roles/${rol}`).set({revision:1,nombre:'PEDIATRA',descripcion:'Ensayo',permisos:['pacientes.administrar','historial.leer','consultas.registrar','diagnosticos.registrar','tratamientos.registrar','recetas.emitir','citas.administrar']});
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
});
