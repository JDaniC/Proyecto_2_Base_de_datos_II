import { objetoCerrado } from '../../../../dominio/clinica/consulta.js';
import type { Firestore, Transaction, DocumentReference } from 'firebase-admin/firestore';
import type { PuertoAntecedentesPediatricos, AntecedentesPediatricos } from '../../../../aplicacion/puertos/pediatria.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { validarAlergia, validarPerinatales, validarHistoriaPediatrica } from '../../../../dominio/pediatria/antecedentes.js';
import { instanteUtc } from '../../../../dominio/compartido/instante-utc.js';

export function validarSnapshotAntecedentes(valor:unknown):AntecedentesPediatricos {
  const r=objetoCerrado(valor,['version','alergias','perinatales','historia','verificacionSinAlergias','actorId','fechaHora']) as unknown as AntecedentesPediatricos;
  if(JSON.stringify(r).length>60000)throw new Error('ANTECEDENTES_DEMASIADO_GRANDES');
  if(!r||!Number.isSafeInteger(r.version)||r.version<1||!Array.isArray(r.alergias)||r.alergias.length>100)throw new Error('ANTECEDENTES_INCOMPATIBLES');
  if(new Set(r.alergias.map(a=>uuidPublico(a.id))).size!==r.alergias.length)throw new Error('ALERGIA_DUPLICADA');
  for(const a of r.alergias){objetoCerrado(a,['id','sustancia','severidad','reaccion','activa','actorId','fechaHora']);validarAlergia({sustancia:a.sustancia,severidad:a.severidad,reaccion:a.reaccion});uuidPublico(a.actorId);instanteUtc(a.fechaHora);if(typeof a.activa!=='boolean')throw new Error('ESTADO_ALERGIA_INVALIDO');}
  if(r.perinatales)validarPerinatales(r.perinatales);
  if(r.historia)validarHistoriaPediatrica(r.historia);
  uuidPublico(r.actorId);instanteUtc(r.fechaHora);
  if(r.verificacionSinAlergias){uuidPublico(r.verificacionSinAlergias.actorId);instanteUtc(r.verificacionSinAlergias.fechaHora);if(r.alergias.some(a=>a.activa))throw new Error('VERIFICACION_INCOMPATIBLE');}
  return r;
}
export function crearAntecedentesFirestore(db:Firestore,t?:Transaction):PuertoAntecedentesPediatricos {
  const get=(ref:DocumentReference)=>t?t.get(ref):ref.get();
  return {async porVersion(pid,version){
    await this.porPaciente(pid);
    try{const q=db.collection(`pediatria_antecedentes/${uuidPublico(pid)}/versiones`).where('actual.version','==',version).limit(2);const snapshot=await q.get();
      if(snapshot.empty)return null;if(snapshot.size!==1)throw new Error('VERSION_DUPLICADA');const d=snapshot.docs[0]!.data();
      if(d.anterior?.version===0){const inicial=objetoCerrado(d.anterior,['version','alergias']);if(!Array.isArray(inicial.alergias)||inicial.alergias.length!==0)throw new Error('SNAPSHOT_INICIAL_INVALIDO');}
      const actual=validarSnapshotAntecedentes(d.actual),anterior=d.anterior?.version===0?{version:0,alergias:[]}:validarSnapshotAntecedentes(d.anterior);
      if(actual.version!==version||anterior.version!==version-1||actual.actorId!==d.actorId||actual.fechaHora!==d.fechaHora||typeof d.motivo!=='string'||!d.motivo.trim()||d.motivo.length>1000)throw new Error('VERSION_INVALIDA');
      return {anterior,actual,motivo:d.motivo,actorId:uuidPublico(d.actorId),fechaHora:instanteUtc(d.fechaHora)};
    }catch{throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','No se pudo verificar la versión histórica.');}
  },async porPaciente(pacienteId){
    const [config,snapshot]=await Promise.all([get(db.doc('pediatria_configuracion/antecedentes')),get(db.doc(`pediatria_antecedentes/${uuidPublico(pacienteId)}`))]).catch(error=>{if(t)throw error;throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','No se pudieron leer los antecedentes.');});
    try {
      if(config.get('version')!==1||config.get('contrato')!=='antecedentes-pediatricos-v1-2026-11-01'||config.get('estado')!=='LISTO')throw new Error('REQUIERE_MIGRACION_009');
      return snapshot.exists?validarSnapshotAntecedentes(snapshot.data()):{version:0,alergias:[]};
    }catch {throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Los antecedentes requieren preparación y procedencia verificables.');}
  }};
}
