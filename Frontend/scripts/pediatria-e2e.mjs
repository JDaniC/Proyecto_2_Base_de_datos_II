import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
export async function recorrerPediatria({page,url,paciente,headers,pass,reiniciarBackend}){
 const go=async()=>{await page.goto(`${url}/pacientes/${paciente.id}`);await page.getByText('Crecimiento desde consultas',{exact:true}).waitFor();};
 const post=async(suffix,accion)=>{const espera=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith(suffix));await accion();const r=await espera;assert.ok([200,201].includes(r.status()),await r.text());return (await r.json()).data;};
 await go();await page.getByText('No calculable',{exact:true}).waitFor();pass('crecimiento HTTP desde consulta sin talla muestra IMC no calculable');
 await page.getByLabel('Motivo del cambio clínico').fill('Verificación sintética');
 await post('/sin-alergias',()=>page.getByRole('button',{name:'Confirmar Sin Alergias Conocidas'}).click());
 await page.getByText(/Sin Alergias Conocidas/i).first().waitFor();pass('verificación de alergias se confirma por HTTP y persiste');
 await page.getByLabel('Motivo del cambio clínico').fill('Historia sintética');
 await page.getByRole('button',{name:'Actualizar historia clínica'}).click();await page.getByLabel('Patológicos',{exact:true}).fill('Asma sintética de ensayo');
 await page.getByRole('button',{name:'Cancelar',exact:true}).click();
 const antes=await page.request.get(`${url}/api/v1/pacientes/${paciente.id}/antecedentes-pediatricos`,{headers});assert.equal((await antes.json()).data.historia,undefined);pass('cancelar historia no escribe datos');
 await page.getByRole('button',{name:'Actualizar historia clínica'}).click();
 const historia=await post('/historia',()=>page.getByRole('button',{name:'Guardar historia'}).click());assert.equal(historia.historia.patologicos[0],'Asma sintética de ensayo');
 await page.getByText('Asma sintética de ensayo',{exact:true}).waitFor();pass('historia clínica UI se conserva tras escritura real');
 const principal=paciente.responsables[0].responsable;
 await page.getByRole('button',{name:`Editar contacto de ${principal.nombre}`}).click();await page.getByLabel('Teléfono del responsable').fill('55551111');
 await post('/contacto',()=>page.getByRole('button',{name:'Guardar responsable'}).click());await page.getByText(/55551111/).first().waitFor();
 const menor2=await page.request.post(`${url}/api/v1/pacientes`,{headers:{...headers,'Idempotency-Key':randomUUID()},data:{nombres:'Hermano',apellidos:'Sintético',fecha_nacimiento:'2023-01-01',sexo:'MASCULINO',responsables:[{responsable_id:principal.id,version_responsable:principal.version+1,parentesco:'MADRE',es_principal:true,autoriza_atencion:false}]}});assert.equal(menor2.status(),201,await menor2.text());const segundo=(await menor2.json()).data;
 assert.equal(segundo.responsables[0].responsable.telefono,'55551111');assert.equal(segundo.responsables[0].vinculo.autoriza_atencion,false);pass('contacto compartido en dos menores y autorización independiente');
 await page.getByRole('button',{name:`Dar de baja a ${principal.nombre}`}).click();await page.getByLabel('Motivo de baja').fill('Baja imposible');
 const rechazo=page.waitForResponse(r=>r.url().endsWith('/baja')&&r.request().method()==='POST');await page.getByRole('button',{name:'Guardar responsable'}).click();assert.equal((await rechazo).status(),409);await page.getByRole('button',{name:'Cancelar',exact:true}).click();pass('último principal rechazado también por API desde el formulario');
 await reiniciarBackend();await go();await page.getByText('Asma sintética de ensayo',{exact:true}).waitFor();await page.getByText(/55551111/).first().waitFor();pass('historia y contacto persisten tras reinicio y recarga');
 await page.setViewportSize({width:390,height:844});await page.getByText('Crecimiento desde consultas',{exact:true}).waitFor();await page.setViewportSize({width:1280,height:720});pass('ficha pediátrica disponible en móvil y escritorio');
}
