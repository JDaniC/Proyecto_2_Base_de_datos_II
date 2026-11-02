import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConsultarAntecedentes } from '../../src/aplicacion/casos-uso/pediatria/consultar-antecedentes.js';
import { escenarioClinico, nuevoId } from '../fixtures/clinica-comun.js';

test('lectura de antecedentes no concede clínica a una cuenta administrativa',async()=>{
  const e=escenarioClinico('CENTRO_MEDICO_PEDIATRICO');let lecturas=0;
  const bundle={...e.bundle,antecedentesPediatricos:{porPaciente:async()=>{lecturas++;return {version:0,alergias:[]};}}};
  const contexto={...e.contexto,cuenta:{...e.cuenta,permisos:['pacientes.administrar'] as const}};
  await assert.rejects(new ConsultarAntecedentes().ejecutar(contexto,bundle,e.paciente.id),{codigo:'SIN_PERMISO'});
  assert.equal(lecturas,0);
});
test('lectura clínica respeta institución y existencia de paciente',async()=>{
  const e=escenarioClinico('CENTRO_MEDICO_PEDIATRICO');
  const bundle={...e.bundle,pacientes:{porId:async(id:unknown)=>id===e.paciente.id?e.paciente:null,buscar:async()=>({elementos:[]})},antecedentesPediatricos:{porPaciente:async()=>({version:0,alergias:[]})}};
  assert.deepEqual(await new ConsultarAntecedentes().ejecutar(e.contexto,bundle,e.paciente.id),{version:0,alergias:[]});
  await assert.rejects(new ConsultarAntecedentes().ejecutar(e.contexto,bundle,nuevoId()),{codigo:'RECURSO_NO_ENCONTRADO'});
  const hospital=escenarioClinico('HOSPITAL_GENERAL');
  await assert.rejects(new ConsultarAntecedentes().ejecutar(hospital.contexto,bundle,e.paciente.id),{codigo:'SIN_PERMISO'});
});
