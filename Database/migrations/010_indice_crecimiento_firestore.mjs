import {obtenerPlan} from '../centro_pediatrico_firestore.mjs';
import {CONTRATO_CLINICA_FIRESTORE} from './006_clinica_firestore.mjs';
export const HUELLA_ORIGEN = 'a39fdac43acefecf82145f3dfde06c89a3adbfe96240f637cf79c0a1a6073e08';
export const HUELLA_OBJETIVO = '34517ff024a5d455a8579571f66b881ccaa58b7657e5101a14eeab6755d64de3';
/** Con escritores detenidos. Solo actualiza manifiestos, con respaldo atómico; no altera datos clínicos. */
export async function prepararIndiceCrecimientoFirestore(db, {antesDeConfirmar} = {}) {
 const plan=await obtenerPlan();
 if(plan.hash_modelo!==HUELLA_OBJETIVO) throw new Error('HUELLA_OBJETIVO_INCOMPATIBLE');
 return db.runTransaction(async t=>{
  const modelo=db.doc('configuracion/modelo'),clinica=db.doc('clinica_configuracion/modelo'),respaldo=db.doc('clinica_migracion_010_respaldo/modelo');
  const [m,c,r]=await Promise.all([t.get(modelo),t.get(clinica),t.get(respaldo)]);
  if(m.get('version_esquema')!==2||m.get('institucion_id')!==plan.institucion_id||c.get('version')!==1||c.get('contrato')!==CONTRATO_CLINICA_FIRESTORE||!['LISTO','RECONCILIAR'].includes(c.get('estado'))) throw new Error('MANIFIESTO_CLINICO_INCOMPATIBLE');
  if(m.get('hash_modelo')===HUELLA_OBJETIVO&&c.get('huella')===HUELLA_OBJETIVO) return {estado:c.get('estado'),actualizado:false};
  if(m.get('hash_modelo')!==HUELLA_ORIGEN||c.get('huella')!==HUELLA_ORIGEN||r.exists) throw new Error('MANIFIESTO_CLINICO_INCOMPATIBLE');
  t.create(respaldo,{modelo:m.data(),clinica:c.data()});
  t.update(modelo,{hash_modelo:HUELLA_OBJETIVO,revision:Number(m.get('revision'))+1});
  t.update(clinica,{huella:HUELLA_OBJETIVO});
  antesDeConfirmar?.();
  return {estado:c.get('estado'),actualizado:true};
 });
}
