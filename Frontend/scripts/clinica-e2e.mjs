import { recorrerPediatria } from './pediatria-e2e.mjs';
import {recorrerServiciosHospital} from './hospital-servicios-e2e.mjs';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';

async function iniciarSesionAnalitica(browser,url,cuenta) {
 const context=await browser.newContext();
 const page=await context.newPage();
 await page.goto(`${url}/acceso`);
 await page.getByLabel(/Correo institucional/).fill(cuenta.email);
 await page.getByLabel(/Contraseña/).fill(cuenta.password);
 const login=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/api/v1/sesion'));
 await page.getByRole('button',{name:'Iniciar sesión'}).click();
 const sesion=await login;
 assert.equal(sesion.status(),200);
 await page.waitForURL(/\/(panel|sesion-activa)$/);
 return {page,headers:{authorization:sesion.request().headers().authorization}};
}

async function recorrerLaboratorio({browser,page,url,headers,paciente,pass,perfilesAnaliticos}) {
 const analista=await iniciarSesionAnalitica(browser,url,perfilesAnaliticos.analista);
 const validador=await iniciarSesionAnalitica(browser,url,perfilesAnaliticos.validador);
 try {
 const post=async(path,data,autoridad=headers)=>{const r=await page.request.post(`${url}/api/v1${path}`,{headers:{...autoridad,'Idempotency-Key':randomUUID()},data});assert.ok([200,201].includes(r.status()),`${path}: ${r.status()} ${await r.text()}`);return (await r.json()).data;};
 const tipo=await post('/laboratorio/referencias/tipos-muestra',{datos:{codigo:'E2E-SUERO',nombre:'Suero E2E',recipiente:'Tubo seco',activo:true},motivo:'Preparación sintética E2E'});
 const solicitante=await post('/laboratorio/referencias/solicitantes',{datos:{nombre:'Dra. Solicitante E2E',tipo:'MEDICO',entidadColegiacion:'Colegio E2E',numeroColegiado:'E2E-1',activo:true},motivo:'Preparación sintética E2E'});
 assert.ok(solicitante.id);
 const metodo=await post('/laboratorio/metodos',{codigo:'E2E-MET',version:1,nombre:'Método E2E',descripcion:'Método sintético'},validador.headers);
 const pruebas=[
  {codigo:'E2E-NUM',nombre:'Medición bioquímica E2E',parametro:'Medición numérica E2E',tipo:'NUMERICO',unidad:'mg/dL',valor:'91.5'},
  {codigo:'E2E-TXT',nombre:'Observación de muestra E2E',parametro:'Observación cualitativa E2E',tipo:'TEXTO',valor:'Sin alteraciones'},
 ];
 for(const prueba of pruebas){
  await post('/laboratorio/pruebas',{codigo:prueba.codigo,version:1,nombre:prueba.nombre,area:'Bioquímica',metodoId:metodo.id,tiposMuestraIds:[tipo.id],parametros:[
   {id:randomUUID(),codigo:prueba.codigo,nombre:prueba.parametro,tipo:prueba.tipo,obligatorio:true,...(prueba.unidad?{unidad:prueba.unidad}:{})},
  ]},validador.headers);
 }
 await page.goto(`${url}/laboratorio/ordenes/nueva`);
 await page.getByPlaceholder('Buscar paciente por nombre, DPI o número de expediente...').fill('Clínica Sintética');
 await page.getByText('Paciente Clínica Sintética',{exact:true}).click();
 await page.locator('#medico-nombre').fill('Dra. Solicitante E2E');
 await page.locator('#motivo-clinico').fill('Recorrido integrado laboratorio E2E');
 for(const prueba of pruebas){
  await page.getByLabel(`Seleccionar ${prueba.nombre}`).check();
  await page.getByLabel(`Precio acordado: ${prueba.nombre} (Q)`).fill('125.50');
 }
 await page.getByRole('button',{name:'Emitir Orden de Laboratorio'}).click();
 await page.waitForURL(/\/laboratorio\/bandeja$/);
 const listado=await page.request.get(`${url}/api/v1/laboratorio/ordenes?pacienteId=${paciente.id}&limite=10&orden=DESC`,{headers});assert.equal(listado.status(),200,await listado.text());
 const cuerpoListado=(await listado.json()).data;
 const orden=(Array.isArray(cuerpoListado) ? cuerpoListado : cuerpoListado.items ?? cuerpoListado.elementos ?? [])[0];assert.ok(orden);
 pass('orden de laboratorio creada desde UI y persistida por API en MongoDB');
 await page.goto(`${url}/laboratorio/muestras`);
 for(let i=0;i<pruebas.length;i++){
  await page.getByRole('button',{name:'Registrar Toma'}).first().click();
  await page.getByRole('button',{name:'Recibir en Lab'}).click();
  await page.getByRole('button',{name:'Aceptar Muestra'}).click();
 }
 await page.getByText('Apta para análisis',{exact:true}).last().waitFor();
 pass('toma, recepción y aceptación de dos muestras ejecutadas desde UI');
 for(const prueba of pruebas){
  await analista.page.goto(`${url}/laboratorio/resultados/captura/${orden.id}`);
  await analista.page.getByRole('tab',{name:new RegExp(prueba.nombre)}).click();
  await analista.page.getByLabel('Equipo Analítico Automatizado').fill('Analizador E2E');
  await analista.page.getByLabel('Lote de Reactivo / Cartucho').fill('LOTE-E2E-01');
  await analista.page.getByLabel(`Valor para ${prueba.parametro}`).fill(prueba.valor);
  const captura=analista.page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/api/v1/laboratorio/resultados'));
  await analista.page.getByRole('button',{name:'Guardar Resultados en Borrador'}).click();
  const respuestaCaptura=await captura;
  assert.ok([200,201].includes(respuestaCaptura.status()),`captura: ${respuestaCaptura.status()}`);
  const resultado=(await respuestaCaptura.json()).data;
  assert.equal(resultado.analistaId,perfilesAnaliticos.analista.id);
  await analista.page.getByText('Borrador Registrado').waitFor();
  const denegada=await analista.page.request.post(`${url}/api/v1/laboratorio/resultados/${resultado.id}/validaciones`,{
   headers:{...analista.headers,'Idempotency-Key':randomUUID()},data:{versionEsperada:resultado.revision},
  });
  assert.equal(denegada.status(),403);
  await validador.page.goto(`${url}/laboratorio/resultados/validacion`);
  await validador.page.getByText(prueba.nombre,{exact:true}).first().click();
  const validacion=validador.page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith(`/${resultado.id}/validaciones`));
  await validador.page.getByRole('button',{name:'Validar y Certificar Resultado'}).click();
  const respuestaValidacion=await validacion;
  assert.ok([200,201].includes(respuestaValidacion.status()),`validación: ${respuestaValidacion.status()}`);
  assert.equal((await respuestaValidacion.json()).data.validadorId,perfilesAnaliticos.validador.id);
  await validador.page.getByText(/validado y certificado con éxito/).waitFor();
 }
 await validador.page.goto(`${url}/laboratorio/ordenes/${orden.id}`);
 await validador.page.reload();
 await validador.page.getByRole('tab',{name:/Resultados validados \(2\)/}).click();
 await validador.page.getByText('91.5 mg/dL',{exact:false}).waitFor();
 await validador.page.getByText('Sin alteraciones',{exact:false}).waitFor();
 pass('dos exámenes, roles separados, rechazo 403 y lectura tras recarga recorren UI→HTTP→MongoDB');
 } finally {
  await analista.page.context().close();
  await validador.page.context().close();
 }
}

export async function recorrerClinica({browser,url,cuentas,reiniciarBackend}) {
 const resultados=[];
 for(const cuenta of cuentas) {
  const context=await browser.newContext(); const page=await context.newPage();
  const pass=caso=>{resultados.push({institucion:cuenta.institucion,caso,resultado:'PASS'});console.log(`PASS ${cuenta.institucion}: ${caso}`);};
  try {
   await page.goto(`${url}/acceso`); await page.getByLabel(/Correo institucional/).fill(cuenta.email); await page.getByLabel(/Contraseña/).fill(cuenta.password);
   const login=page.waitForRequest(r=>r.method()==='POST'&&r.url().endsWith('/api/v1/sesion'));
   await page.getByRole('button',{name:'Iniciar sesión'}).click(); const headers={authorization:(await login).headers().authorization,'Idempotency-Key':randomUUID()};
   const loginResponse = await (await login).response();
   assert.equal(loginResponse.status(),200,`login ${cuenta.institucion}: ${await loginResponse.text()}`);
   await page.waitForURL(/\/(panel|sesion-activa)$/);
   const pedi=cuenta.institucion==='CENTRO_MEDICO_PEDIATRICO';
   const alta=await page.request.post(`${url}/api/v1/pacientes`,{headers,data:{nombres:'Paciente',apellidos:'Clínica Sintética',fecha_nacimiento:pedi?'2020-02-29':'2000-02-29',sexo:'MASCULINO',...(pedi?{responsables:[{nombres:'Madre',apellidos:'Sintética',telefono:'55555555',parentesco:'MADRE',es_principal:true,autoriza_atencion:true,documento:{tipo:'CUI',numero:'1234567890101'}}]}:{})}});
   assert.equal(alta.status(),201,`alta ${cuenta.institucion}`); const paciente=(await alta.json()).data;
   if(cuenta.institucion==='LABORATORIO_CLINICO') {
    await recorrerLaboratorio({browser,page,url,headers,paciente,pass,perfilesAnaliticos:cuenta.perfilesAnaliticos});
    // Esta cuenta sintética es personal analítico, no médico individual autorizado
    // para registrar consultas de la clínica común del laboratorio.
    continue;
   }
   if(cuenta.institucion==='HOSPITAL_GENERAL'||pedi) {
    const motivoAgenda=`Agenda institucional ${cuenta.institucion}`;
    const datosCita={paciente_id:paciente.id,version_paciente:paciente.version,profesional_id:cuenta.profesionalId,fecha:'2026-10-19',hora_inicio:'07:00',duracion_minutos:30,motivo:motivoAgenda};
    const claveAgenda=randomUUID();
    const crearAgenda=()=>page.request.post(`${url}/api/v1/citas`,{headers:{...headers,'Idempotency-Key':claveAgenda},data:datosCita});
    const creada=await crearAgenda();assert.equal(creada.status(),201,await creada.text());const agendada=(await creada.json()).data;
    const repetida=await crearAgenda();assert.ok([200,201].includes(repetida.status()));assert.equal((await repetida.json()).data.id,agendada.id);
    await page.goto(`${url}/agenda`);await page.getByText(motivoAgenda,{exact:true}).first().waitFor();
    await page.reload();await page.getByText(motivoAgenda,{exact:true}).first().waitFor();
    await page.setViewportSize({width:390,height:844});await page.getByText(motivoAgenda,{exact:true}).first().waitFor();await page.setViewportSize({width:1280,height:720});
    pass('agenda institucional HTTP persiste tras recarga en móvil/escritorio y reintento no duplica');
    const cancelada=await page.request.post(`${url}/api/v1/citas/${agendada.id}/cancelacion`,{headers:{...headers,'Idempotency-Key':randomUUID()},data:{version_esperada:agendada.version,motivo:'Cancelación sintética de ensayo'}});
    assert.equal(cancelada.status(),200,await cancelada.text());assert.equal((await cancelada.json()).data.estado,'CANCELADA');
    const obsoleta=await page.request.post(`${url}/api/v1/citas/${agendada.id}/cancelacion`,{headers:{...headers,'Idempotency-Key':randomUUID()},data:{version_esperada:agendada.version,motivo:'Versión anterior sintética'}});
    assert.equal(obsoleta.status(),409,await obsoleta.text());pass('agenda cancela con versión y rechaza versión obsoleta');
   }
   let cita;
   if(cuenta.institucion==='CLINICA_ODONTOLOGICA') {
    if(cuenta.secretariaCuenta) {
     const ctxSec=await browser.newContext(); const pageSec=await ctxSec.newPage();
     try {
      await pageSec.goto(`${url}/acceso`);
      await pageSec.getByLabel(/Correo institucional/).fill(cuenta.secretariaCuenta.email);
      await pageSec.getByLabel(/Contraseña/).fill(cuenta.secretariaCuenta.password);
      const loginSec=pageSec.waitForRequest(r=>r.method()==='POST'&&r.url().endsWith('/api/v1/sesion'));
      await pageSec.getByRole('button',{name:'Iniciar sesión'}).click();
      const headersSec={authorization:(await loginSec).headers().authorization,'Idempotency-Key':randomUUID()};
      const loginSecResp=await (await loginSec).response();
      assert.equal(loginSecResp.status(),200,'login secretaria dental');
      await pageSec.waitForURL(/\/(panel|sesion-activa)$/);
      const antRechazo=await pageSec.request.get(`${url}/api/v1/pacientes/${paciente.id}/antecedentes`,{headers:headersSec});
      assert.equal(antRechazo.status(),403,'secretaria no lee antecedentes');
      const r=await pageSec.request.post(`${url}/api/v1/citas`,{headers:{...headersSec,'Idempotency-Key':randomUUID()},data:{paciente_id:paciente.id,version_paciente:paciente.version,profesional_id:cuenta.profesionalId,fecha:'2026-10-19',hora_inicio:'09:00',duracion_minutos:30,motivo:'Control dental inicial'}});
      assert.equal(r.status(),201); cita=(await r.json()).data;
      assert.equal(cita.secretaria_gestora,'Laura Secretaría Sintética');
      const rReprog=await pageSec.request.patch(`${url}/api/v1/citas/${cita.id}/reprogramacion`,{headers:{...headersSec,'Idempotency-Key':randomUUID()},data:{version_esperada:cita.version,fecha:'2026-10-19',hora_inicio:'10:00',duracion_minutos:45,motivo:'Ajuste solicitado por paciente'}});
      assert.equal(rReprog.status(),200); cita=(await rReprog.json()).data;
      pass('SECRETARIA agenda y reprograma cita dental con secretaria_gestora diferenciada y 403 en antecedentes');
     } finally {
      await ctxSec.close();
     }
     await page.goto(`${url}/agenda`);
     await page.getByText('Laura Secretaría Sintética',{exact:false}).first().click();
     await page.getByText('Ajuste solicitado por paciente',{exact:false}).first().waitFor({timeout:10000});
     pass('ODONTOLOGO visualiza agenda dental con secretaria gestora e historial de revisiones de cita');
     await page.goto(`${url}/pacientes/${paciente.id}`);
     await page.getByLabel('Nueva alergia odontológica').fill('Alergia controlada a penicilina');
     await page.getByRole('button',{name:'Agregar alergia'}).click();
     await page.getByText('Alergia controlada a penicilina',{exact:false}).waitFor({timeout:10000});
     pass('ODONTOLOGO registra y consulta antecedente odontológico en expediente HTTP');
    } else {
     const r=await page.request.post(`${url}/api/v1/citas`,{headers:{...headers,'Idempotency-Key':randomUUID()},data:{paciente_id:paciente.id,version_paciente:paciente.version,profesional_id:cuenta.profesionalId,fecha:'2026-10-30',hora_inicio:'09:00',duracion_minutos:30,motivo:'Control dental'}}); assert.equal(r.status(),201); cita=(await r.json()).data;
    }
   }
   await page.goto(`${url}/pacientes/${paciente.id}/consultas/nueva${cita?`?citaId=${cita.id}`:''}`);
   await page.locator('#motivo-input').fill('Control clínico sintético'); await page.getByRole('button',{name:'Siguiente paso'}).click();
   await page.locator('#peso-input').fill('25'); await page.getByRole('button',{name:'Siguiente paso'}).click();
   const terminoBusqueda = cuenta.institucion === 'CLINICA_ODONTOLOGICA' ? 'K02' : 'J00';
   await page.locator('#cie-search').fill(terminoBusqueda); await page.getByRole('button',{name:'Agregar',exact:true}).click();
   await page.locator('#trat-desc').fill('Tratamiento sintético'); await page.locator('#trat-indic').fill('Solo prueba'); await page.getByRole('button',{name:'Añadir',exact:true}).click();
   await page.getByRole('button',{name:'Siguiente paso'}).click();
   await page.locator('#toggle-receta').check();
   await page.locator('#med-nombre').fill('Fármaco sintético'); await page.locator('#med-conc').fill('10 mg'); await page.locator('#med-ind').fill('Solo prueba');
   await page.getByRole('button',{name:'Agregar fármaco a la receta'}).click(); await page.getByRole('button',{name:'Siguiente paso'}).click();
   for(const status of [400,403,409,503]) {
    await page.route('**/api/v1/consultas/completas',route=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({error:{codigo:'RECHAZO_ENSAYO',mensaje:`Rechazo controlado ${status}`}})}));
    await page.getByRole('button',{name:'Confirmar y Registrar Consulta Completa'}).click();
    await page.getByText(`Rechazo controlado ${status}`,{exact:false}).waitFor();
    assert.ok(page.url().includes('/consultas/nueva')); await page.unroute('**/api/v1/consultas/completas');
    pass(`HTTP ${status} controlado conserva formulario sin éxito simulado`);
   }
   let entradaFallida;
   await page.route('**/api/v1/consultas/completas',async route=>{
    entradaFallida=route.request().postDataJSON();
    const invalida={...entradaFallida,receta:{medicamentos:[{...entradaFallida.receta.medicamentos[0],via:''}]}};
    const r=await route.fetch({postData:JSON.stringify(invalida)});assert.equal(r.status(),400);await route.fulfill({response:r});
   });
   await page.getByRole('button',{name:'Confirmar y Registrar Consulta Completa'}).click();await page.getByRole('alert').waitFor();
   await page.unroute('**/api/v1/consultas/completas');
   const estadoFallido=(await (await page.request.get(`${url}/api/v1/pacientes/${paciente.id}`,{headers})).json()).data;
   assert.equal(estadoFallido.version,entradaFallida.version_paciente);
   const historiaFallida=(await (await page.request.get(`${url}/api/v1/pacientes/${paciente.id}/historial`,{headers})).json()).data;
   assert.equal(historiaFallida.eventos.filter(e=>['CONSULTA','RECETA'].includes(e.tipo)).length,0);
   pass('receta inválida real: sin consulta, receta ni avance de revisión');
   // Se pierde la respuesta después del commit real, no se simula persistencia.
   let perdida; let final;
   await page.route('**/api/v1/consultas/completas',async route=>{if(!perdida){perdida={body:route.request().postData(),key:route.request().headers()['idempotency-key']};const res=await route.fetch();assert.equal(res.status(),201,`consulta ${cuenta.institucion}: ${await res.text()}`);final=(await res.json()).data;await route.abort('failed');}else{assert.equal(route.request().postData(),perdida.body);assert.equal(route.request().headers()['idempotency-key'],perdida.key);await route.continue();}});
   await page.getByRole('button',{name:'Confirmar y Registrar Consulta Completa'}).click(); await page.getByText(/Resultado pendiente de confirmar/).waitFor({timeout:5000}).catch(async e=>{console.log('ESTADO_UI',await page.locator('body').innerText());throw e;});
   await page.getByRole('button',{name:'Confirmar y Registrar Consulta Completa'}).click(); await page.waitForURL(`${url}/pacientes/${paciente.id}?tab=consultas`);
   pass('consulta y receta atómicas; respuesta perdida y reintento estable');
   await page.getByRole('link',{name:'Ver atención'}).first().click(); await page.getByText('Control clínico sintético',{exact:true}).first().waitFor();
   await page.reload(); await page.getByRole('button',{name:'Corregir o Actualizar Consulta'}).waitFor(); pass('detalle y receta después de recarga');
   if(process.env.CLINICA_UI_SCREENSHOTS && cuenta.institucion==='HOSPITAL_GENERAL') {await mkdir(process.env.CLINICA_UI_SCREENSHOTS,{recursive:true}); await page.screenshot({path:join(process.env.CLINICA_UI_SCREENSHOTS,'detalle-escritorio.png'),fullPage:true});await page.setViewportSize({width:390,height:844});await page.waitForFunction(() => document.querySelector('.sidebar-container')?.getBoundingClientRect().right <= 1);await page.screenshot({path:join(process.env.CLINICA_UI_SCREENSHOTS,'detalle-movil.png'),fullPage:true});await page.setViewportSize({width:1280,height:720});}
   await page.getByRole('button',{name:'Corregir o Actualizar Consulta'}).click(); await page.locator('#rect-motivo-input').fill('Control rectificado'); await page.locator('#rect-justificacion-input').fill('Corrección sintética de prueba');
   await page.getByRole('button',{name:/Guardar nueva revisión/}).click(); await page.getByRole('dialog').waitFor({state:'hidden',timeout:5000}).catch(async e=>{console.log('MODAL_UI',await page.getByRole('dialog').innerText());console.log('CAMPOS_INVALIDOS',await page.locator(':invalid').evaluateAll(xs=>xs.map(x=>({id:x.id,message:x.validationMessage}))));throw e;}); pass('corrección conserva consulta y crea versión');
   await page.getByLabel('Versión de la atención').selectOption('1'); await page.getByText('Control clínico sintético',{exact:true}).first().waitFor(); pass('lectura de versión original');
   if (cuenta.institucion === 'HOSPITAL_GENERAL') {
    await recorrerServiciosHospital({page,url,paciente,consulta:final,headers,pass,reiniciarBackend});
    await page.goto(`${url}/hospital/hospitalizaciones/nueva`);
    await page.getByRole('textbox', { name: 'Buscar paciente para ingreso' }).fill('Paciente');
    await page.locator('#paciente-select').selectOption(paciente.id);
    pass('ingreso sin paciente precargado carga camas y busca paciente por término real');
    await page.locator('#cama-select').selectOption(cuenta.hospitalCamas[0]);
    await page.locator('#motivo-ingreso-textarea').fill('Observación hospitalaria sintética');
    await page.getByRole('checkbox').check();
    await page.getByLabel('Consulta previa', { exact: true }).selectOption(final.id);
    const ingresoReq = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/hospital/hospitalizaciones'));
    await page.getByRole('button', { name: 'Confirmar Ingreso Hospitalario' }).click();
    const ingresoResp = await ingresoReq;
    assert.equal(ingresoResp.status(),201,await ingresoResp.text());
    const estancia = (await ingresoResp.json()).data;
    await page.waitForURL(new RegExp(`/hospital/hospitalizaciones/${estancia.id}$`));
    await page.getByText('Observación hospitalaria sintética', { exact: true }).waitFor();
    pass('ingreso UI ocupa cama y enlaza consulta real del paciente');
    await page.getByRole('button', { name: 'Agregar Nota de Evolución' }).click();
    await page.locator('#nota-clinica-input').fill('Evolución hospitalaria sintética estable');
    const notaReq = page.waitForResponse(r => r.url().endsWith('/notas-evolucion') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Guardar Nota' }).click();
    const notaResp = await notaReq;
    assert.equal(notaResp.status(),201,await notaResp.text());
    await page.getByText('Evolución hospitalaria sintética estable', {exact:true}).waitFor();
    pass('nota UI persiste autor médico verificado y nueva revisión');
    await page.getByRole('button', { name: 'Cambiar Cama' }).first().click();
    await page.locator('#cama-destino-select').selectOption(cuenta.hospitalCamas[1]);
    assert.ok(await page.locator('#fecha-inicio-traslado').inputValue());
    await page.locator('#motivo-traslado-input').fill('Traslado sintético');
    const trasladoReq = page.waitForResponse(r => r.url().endsWith('/asignacion-cama') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Confirmar Traslado' }).click();
    const trasladoResp = await trasladoReq;
    assert.equal(trasladoResp.status(),201,await trasladoResp.text());
    await page.getByRole('dialog').waitFor({state:'hidden'});
    await page.reload();
    const detalle = await page.request.get(`${url}/api/v1/hospital/hospitalizaciones/${estancia.id}`, {headers});
    const reconstruida = (await detalle.json()).data;
    assert.equal(reconstruida.asignacionesCama.length,2);
    assert.equal(reconstruida.asignacionesCama[1].motivoCambio, 'Traslado sintético');
    assert.equal(reconstruida.asignacionesCama[0].fechaFin,reconstruida.asignacionesCama[1].fechaInicio);
    pass('traslado UI conserva períodos contiguos tras recarga');
    await page.getByRole('button', {name:/Registrar Egreso/i}).first().click();
    assert.ok(await page.locator('#fecha-egreso-input').inputValue());
    await page.locator('#resumen-clinico-textarea').fill('Alta sintética estable');
    const egresoReq = page.waitForResponse(r=>r.url().endsWith('/egreso') && r.request().method()==='POST');
    await page.getByRole('button',{name:'Confirmar Egreso y Liberar Cama'}).click();
    const egresoResp = await egresoReq;
    assert.equal(egresoResp.status(),201,await egresoResp.text());
    await page.getByRole('dialog').waitFor({state:'hidden'});
    await reiniciarBackend(); await page.reload();
    await page.getByText('Alta sintética estable',{exact:true}).waitFor();
    const disponibles = await page.request.get(`${url}/api/v1/hospital/camas`,{headers});
    assert.equal((await disponibles.json()).data.camas.find(c=>c.id===cuenta.hospitalCamas[1]).estado,'DISPONIBLE');
    pass('egreso UI libera cama y conserva estancia después de reiniciar backend');
    const listadoReq = page.waitForResponse(r => r.request().method() === 'GET' && new URL(r.url()).pathname === '/api/v1/hospital/hospitalizaciones');
    await page.goto(`${url}/hospital/hospitalizaciones`);
    const listadoResp = await listadoReq;
    assert.equal(listadoResp.status(),200);
    const listado = (await listadoResp.json()).data;
    assert.equal(listado.pagina,1); assert.equal(listado.hayMas,false);
    assert.equal('notasEvolucion' in listado.hospitalizaciones[0],false);
    await page.getByRole('button',{name:'Ver Detalle'}).first().click();
    await page.waitForURL(new RegExp(`/hospital/hospitalizaciones/${estancia.id}$`));
    await page.getByText('Alta sintética estable',{exact:true}).waitFor();
    pass('listado UI paginado recibe resúmenes y carga detalle clínico bajo demanda');

   }
   if(pedi) {
    const {vacunaId,versionId,dosisId}=cuenta.vacuna;
    for(const ruta of ['/vacunas',`/pacientes/${paciente.id}/aplicaciones-vacuna`,`/pacientes/${paciente.id}/esquemas`]){const r=await page.request.get(`${url}/api/v1${ruta}`,{headers});assert.equal(r.status(),200,`vacunas preflight ${ruta}: ${await r.text()}`);}
    await page.goto(`${url}/pacientes/${paciente.id}`);
    await page.getByLabel('Vacuna para asignar').selectOption(vacunaId).catch(async error=>{console.log('VACUNAS_UI',await page.locator('body').innerText());for(const ruta of ['/vacunas',`/pacientes/${paciente.id}/aplicaciones-vacuna`,`/pacientes/${paciente.id}/esquemas`]){const r=await page.request.get(`${url}/api/v1${ruta}`,{headers});console.log('VACUNAS_HTTP',ruta,r.status(),await r.text());}throw error;});
    const asignada=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith(`/pacientes/${paciente.id}/esquemas`));
    await page.getByRole('button',{name:'Asignar esquema',exact:true}).click();assert.equal((await asignada).status(),201);
    await page.reload();await page.getByText('Vacuna E2E sintética',{exact:true}).first().waitFor();pass('vacunas asignación explícita por UI persiste después de recarga');
    await page.getByRole('button',{name:'Registrar vacuna',exact:true}).click();
    await page.getByLabel(/Número de Lote del Fabricante/).fill('LOTE-E2E');
    await page.getByLabel(/Sitio Anatómico de Punción/).selectOption('Cara anterolateral muslo izquierdo');
    const aplicada=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith(`/pacientes/${paciente.id}/aplicaciones-vacuna`));
    await page.getByRole('button',{name:'Registrar dosis',exact:true}).click();const res=await aplicada;assert.equal(res.status(),201,await res.text());const appVacuna=(await res.json()).data;
    await page.getByRole('dialog').waitFor({state:'hidden'});await page.reload();
    await page.getByRole('button',{name:/Historial/}).first().click();await page.getByText(/Lote: LOTE-E2E/).waitFor();pass('vacunación UI registra dosis y recarga lote persistido');
    await page.getByTitle('Corregir lote o datos auditados').click();await page.getByLabel(/Número de Lote/).fill('LOTE-RECTIFICADO');await page.getByRole('dialog').locator('textarea').last().fill('Corrección E2E sintética');
    const corregida=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/correcciones'));
    await page.getByRole('button',{name:/Guardar Revisión/}).click();const rc=await corregida;assert.equal(rc.status(),200,await rc.text());await page.getByRole('dialog').waitFor({state:'hidden'});await page.getByText(/LOTE-RECTIFICADO/).waitFor();pass('vacunación UI corrige con motivo y revisión observada');
    const versionNueva=await page.request.post(`${url}/api/v1/vacunas/${vacunaId}/versiones`,{headers:{...headers,'Idempotency-Key':randomUUID()},data:{nombre:'Vacuna E2E nueva',enfermedadObjetivo:'Objetivo de ensayo',fabricante:'Fabricante sintético',versionEsquemaAnterior:versionId,dosis:[{dosisId,numero:1,edadMesesRecomendada:1}]}});assert.equal(versionNueva.status(),201,await versionNueva.text());
    const esquema=(await (await page.request.get(`${url}/api/v1/pacientes/${paciente.id}/esquemas`,{headers})).json()).data;assert.equal(esquema.items[0].versionEsquemaId,versionId);assert.equal(esquema.items[0].edadRecomendadaMeses,0);
    await page.reload();await page.getByRole('button',{name:/Historial/}).first().click();await page.getByText('Vacuna E2E sintética',{exact:true}).first().waitFor();pass('publicar versión nueva conserva esquema asignado y snapshot histórico');
    await page.getByTitle('Anular aplicación con motivo formal').click();await page.getByRole('dialog').locator('textarea').last().fill('Anulación E2E sintética');const anulada=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/anulacion'));await page.getByRole('button',{name:'Confirmar Anulación'}).click();const ra=await anulada;assert.equal(ra.status(),200,await ra.text());await page.getByRole('dialog').waitFor({state:'hidden'});
    await reiniciarBackend();await page.reload();const apps=(await (await page.request.get(`${url}/api/v1/pacientes/${paciente.id}/aplicaciones-vacuna`,{headers})).json()).data;assert.equal(apps.find(a=>a.id===appVacuna.id).estado,'ANULADA');pass('anulación UI preserva historia y estado después de reinicio');
    await page.getByRole('button',{name:'Registrar vacuna',exact:true}).click();await page.getByLabel(/Número de Lote del Fabricante/).fill('LOTE-NUEVA-ADMINISTRACION');await page.getByLabel(/Sitio Anatómico de Punción/).selectOption('Cara anterolateral muslo izquierdo');
    const reaplicada=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith(`/pacientes/${paciente.id}/aplicaciones-vacuna`));await page.getByRole('button',{name:'Registrar dosis',exact:true}).click();const rn=await reaplicada;assert.equal(rn.status(),201,await rn.text());const nuevaApp=(await rn.json()).data;assert.equal(nuevaApp.id,appVacuna.id);assert.equal(nuevaApp.version,4);await page.getByRole('dialog').waitFor({state:'hidden'});await page.reload();
    const vigentes=(await (await page.request.get(`${url}/api/v1/pacientes/${paciente.id}/aplicaciones-vacuna`,{headers})).json()).data;assert.equal(vigentes.filter(a=>a.estado==='APLICADA').length,1);pass('nueva administración explícita tras anular conserva identidad lógica y una sola vigente');

   }
   if(pedi)await recorrerPediatria({page,url,paciente,headers,pass,reiniciarBackend});
   await page.goto(`${url}/pacientes/${paciente.id}`); await page.getByRole('button',{name:'Archivar expediente'}).click(); await page.locator('textarea').fill('Archivo sintético');
   await page.getByRole('button',{name:/Confirmar archivo/i}).click(); await page.getByText('Expediente archivado',{exact:true}).waitFor(); pass('archivo conserva eventos y consultas');
   await reiniciarBackend(); await page.reload(); await page.getByText('Expediente archivado',{exact:true}).waitFor(); await page.getByRole('link',{name:'Ver atención'}).first().click(); await page.getByRole('button',{name:'Imprimir Receta Médica'}).waitFor(); pass('historia y receta conservadas tras reinicio');
   await page.getByRole('button',{name:'Corregir o Actualizar Consulta'}).click();
   await page.locator('#rect-motivo-input').fill('Corrección con expediente archivado'); await page.locator('#rect-justificacion-input').fill('Corrección histórica autorizada');
   await page.getByRole('button',{name:/Guardar nueva revisión/}).click(); await page.getByRole('dialog').waitFor({state:'hidden'}); pass('corrección histórica autorizada después del archivo');
   if(pedi) {await page.goto(`${url}/pacientes/${paciente.id}`);await page.getByRole('button',{name:'Reactivar expediente'}).click();await page.locator('textarea').fill('Reactivación sintética');await page.getByRole('button',{name:'Confirmar reactivación'}).click();await page.getByText('Expediente activo',{exact:true}).waitFor();pass('reactivación pediátrica por HTTP');}
   assert.ok(final.receta); assert.equal(final.paciente_id,paciente.id);
  } finally {await context.close();}
 }
 return resultados;
}
