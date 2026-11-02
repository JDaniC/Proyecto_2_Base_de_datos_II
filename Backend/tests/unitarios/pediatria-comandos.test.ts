import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escenarioClinico, nuevoId } from '../fixtures/clinica-comun.js';
import { GestionarResponsable } from '../../src/aplicacion/casos-uso/pediatria/gestionar-responsable.js';
import { dependenciasComandoPorDefecto } from '../../src/adaptadores/salida/sistema/servicios-sistema.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';

test('baja del último principal se rechaza sin operación ni auditoría', async () => {
  const e=escenarioClinico('CENTRO_MEDICO_PEDIATRICO');
  e.cuenta={...e.cuenta,permisos:[...e.cuenta.permisos,'pacientes.administrar']};
  const paciente={...e.paciente,responsables:[{responsable:{id:e.responsableId,nombres:'Ana',apellidos:'Sintética',nombre:'Ana Sintética',telefono:'55555555',version:versionPositiva(1)},vinculo:{responsableId:e.responsableId,versionResponsable:versionPositiva(1),parentesco:'MADRE',esPrincipal:true,autorizaAtencion:false},versionVinculo:versionPositiva(1)}]};
  e.pacientes.set(paciente.id,paciente);
  const contexto={...e.contexto,cuenta:e.cuenta};
  await assert.rejects(new GestionarResponsable(dependenciasComandoPorDefecto).ejecutar('baja',{contexto,bundle:e.bundle,id:paciente.id,claveIdempotencia:nuevoId(),entrada:{version_paciente:1,version_vinculo:1,motivo:'Baja sintética'}},e.responsableId),{codigo:'ESTADO_INVALIDO'});
  assert.equal(e.operaciones.size,0);assert.equal(e.auditoria.length,0);assert.equal(e.pacientes.get(paciente.id)!.version,1);
});
