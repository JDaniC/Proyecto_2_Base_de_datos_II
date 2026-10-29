import assert from 'node:assert/strict';
import {test} from 'node:test';
import {AtencionClinica} from '../../src/aplicacion/casos-uso/consultas/atencion-clinica.js';
import {dependenciasComandoPorDefecto as deps} from '../../src/adaptadores/salida/sistema/servicios-sistema.js';
import {documentoConsultaFirestore,mapearConsultaFirestore} from '../../src/adaptadores/salida/firestore/consultas/mapear-consulta-firestore.js';
import {escenarioClinico,nuevoId} from '../fixtures/clinica-comun.js';

test('mapper Firestore preserva snapshot y rechaza proyección divergente o legado incompleto',async()=>{
  const e = escenarioClinico('CENTRO_MEDICO_PEDIATRICO');
  const r = await new AtencionClinica(deps).ejecutar('completa',{contexto:e.contexto,bundle:e.bundle,claveIdempotencia:nuevoId(),entrada:{paciente_id:e.paciente.id,version_paciente:1,responsable_id:e.responsableId,version_vinculo:1,motivo:'Control',sintomas:'',signos_vitales:{peso_kg:12.345,presion_sistolica:100,temperatura_c:null},diagnosticos:[],tratamientos:[]}});
  const c = r.respuesta, doc = documentoConsultaFirestore(c);
  assert.deepEqual(mapearConsultaFirestore(c.id,doc),c);
  assert.throws(()=>mapearConsultaFirestore(c.id,{...doc,motivo:'Texto divergente'}),{codigo:'PERSISTENCIA_NO_DISPONIBLE'});
  const {snapshot_v1,...legado} = doc; assert.ok(snapshot_v1);
  assert.throws(()=>mapearConsultaFirestore(c.id,legado),{codigo:'PERSISTENCIA_NO_DISPONIBLE'});
  assert.throws(()=>documentoConsultaFirestore({...c,signos_vitales:{peso_kg:12.3456}}),{codigo:'SOLICITUD_INVALIDA'});
  const grande = {...c,diagnosticos:Array.from({length:100},(_,i)=>({id:nuevoId(),fecha_registro:c.fecha_hora,registrado_por:c.profesional,codigo_cie:'SINT',nombre:'Caso sintético',es_principal:i === 0,observacion:'á'.repeat(2000)}))};
  assert.throws(()=>documentoConsultaFirestore(grande),{codigo:'LIMITE_AGREGADO'});
});
