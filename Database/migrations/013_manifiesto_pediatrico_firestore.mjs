import {obtenerPlan} from '../centro_pediatrico_firestore.mjs';
import {CONTRATO_CLINICA_FIRESTORE} from './006_clinica_firestore.mjs';
export const HUELLA_ORIGEN = '5b3c97d9b34ae5f86b273ef65e42e1431473a0c901bb07a0e8da470a9ab73c67';
export const HUELLA_ORIGEN_CRLF_COMPLETO = 'ffb6203ec787bad4ba80cf061f293b5eeda020014a71c688c5f10a410adfb988';
export const HUELLA_OBJETIVO = '34517ff024a5d455a8579571f66b881ccaa58b7657e5101a14eeab6755d64de3';

/** Normaliza los manifiestos con la huella CRLF conocida a la huella canónica LF. */
export async function prepararManifiestoPediatricoFirestore(db,{antesDeConfirmar}={}){
 const plan=await obtenerPlan();
 if(plan.hash_modelo!==HUELLA_OBJETIVO)throw new Error('HUELLA_OBJETIVO_INCOMPATIBLE');
 return db.runTransaction(async t=>{
  const modelo=db.doc('configuracion/modelo'),clinica=db.doc('clinica_configuracion/modelo'),respaldo=db.doc('clinica_migracion_013_respaldo/modelo');
  const [m,c,r]=await Promise.all([t.get(modelo),t.get(clinica),t.get(respaldo)]);
  if(m.get('version_esquema')!==2||m.get('institucion_id')!==plan.institucion_id||c.get('version')!==1||c.get('contrato')!==CONTRATO_CLINICA_FIRESTORE||!['LISTO','RECONCILIAR'].includes(c.get('estado')))throw new Error('MANIFIESTO_CLINICO_INCOMPATIBLE');
  const rutas=m.get('rutas');
  if(!Array.isArray(rutas)||JSON.stringify([...rutas].sort())!==JSON.stringify([...plan.rutas].sort()))throw new Error('RUTAS_MODELO_INCOMPATIBLES');
  if(m.get('hash_modelo')===HUELLA_OBJETIVO&&c.get('huella')===HUELLA_OBJETIVO)return {estado:c.get('estado'),actualizado:false};
  const huellaOrigen=m.get('hash_modelo');
  if(![HUELLA_ORIGEN,HUELLA_ORIGEN_CRLF_COMPLETO].includes(huellaOrigen)||c.get('huella')!==huellaOrigen||r.exists||!Number.isSafeInteger(m.get('revision'))||m.get('revision')<1||m.get('revision')>=Number.MAX_SAFE_INTEGER)throw new Error('MANIFIESTO_CLINICO_INCOMPATIBLE');
  t.create(respaldo,{modelo:m.data(),clinica:c.data()});
  t.update(modelo,{hash_modelo:HUELLA_OBJETIVO,revision:Number(m.get('revision'))+1});
  t.update(clinica,{huella:HUELLA_OBJETIVO});
  antesDeConfirmar?.();
  return {estado:c.get('estado'),actualizado:true};
 });
}
