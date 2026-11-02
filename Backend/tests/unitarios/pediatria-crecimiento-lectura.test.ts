import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ConsultarCrecimiento} from '../../src/aplicacion/casos-uso/pediatria/consultar-crecimiento.js';
import {escenarioClinico,nuevoId} from '../fixtures/clinica-comun.js';
import type {Consulta} from '../../src/dominio/clinica/consulta.js';
import {fechaCivil} from '../../src/dominio/compartido/fecha-civil.js';
test('crecimiento usa fecha civil clínica, no inventa IMC y conserva cursor',async()=>{
 const e=escenarioClinico('CENTRO_MEDICO_PEDIATRICO');
 const paciente={...e.paciente,fechaNacimiento:fechaCivil('2024-02-29')};
 const consulta={id:nuevoId(),version:1,fecha_hora:'2025-03-01T04:00:00Z',profesional:{nombre:'Pediatra'},signos_vitales:{peso_kg:10,talla_cm:null}} as Consulta;
 const bundle={...e.bundle,pacientes:{porId:async()=>paciente,buscar:async()=>({elementos:[]})},clinica:{...e.bundle.clinica!,consultas:{...e.bundle.clinica!.consultas,listarPorPaciente:async()=>({elementos:[consulta],siguienteCursor:'cursor'})}}};
 const r=await new ConsultarCrecimiento().ejecutar(e.contexto,bundle,paciente.id,{});
 assert.equal(r.data[0]!.fecha,'2025-02-28');assert.equal(r.data[0]!.edad_meses,11);assert.equal(r.data[0]!.imc,null);assert.equal(r.meta.siguiente_cursor,'cursor');
 await assert.rejects(new ConsultarCrecimiento().ejecutar(e.contexto,bundle,paciente.id,{limite:101}),{codigo:'SOLICITUD_INVALIDA'});
 await assert.rejects(new ConsultarCrecimiento().ejecutar(e.contexto,bundle,paciente.id,{desde:'2026-01-02T00:00:00Z',hasta:'2026-01-01T00:00:00Z'}),{codigo:'SOLICITUD_INVALIDA'});
});
