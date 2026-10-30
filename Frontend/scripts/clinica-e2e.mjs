import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
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
   let cita;
   if(cuenta.institucion==='CLINICA_ODONTOLOGICA') {
    const r=await page.request.post(`${url}/api/v1/citas`,{headers:{...headers,'Idempotency-Key':randomUUID()},data:{paciente_id:paciente.id,version_paciente:paciente.version,profesional_id:cuenta.profesionalId,fecha:'2026-10-30',hora_inicio:'09:00',duracion_minutos:30,motivo:'Control dental'}}); assert.equal(r.status(),201); cita=(await r.json()).data;
   }
   await page.goto(`${url}/pacientes/${paciente.id}/consultas/nueva${cita?`?citaId=${cita.id}`:''}`);
   await page.locator('#motivo-input').fill('Control clínico sintético'); await page.getByRole('button',{name:'Siguiente paso'}).click();
   await page.locator('#peso-input').fill('25'); await page.getByRole('button',{name:'Siguiente paso'}).click();
   await page.locator('#cie-search').fill('J00'); await page.getByRole('button',{name:'Agregar',exact:true}).click();
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
