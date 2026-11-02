import type { Firestore, Transaction, DocumentReference } from 'firebase-admin/firestore';
import type { PuertoAntecedentesPediatricos, AntecedentesPediatricos } from '../../../../aplicacion/puertos/pediatria.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { validarAlergia, validarPerinatales } from '../../../../dominio/pediatria/antecedentes.js';
import { instanteUtc } from '../../../../dominio/compartido/instante-utc.js';

export function validarSnapshotAntecedentes(valor:unknown):AntecedentesPediatricos {
  const r=valor as AntecedentesPediatricos;
  if(!r||!Number.isSafeInteger(r.version)||r.version<1||!Array.isArray(r.alergias)||r.alergias.length>100)throw new Error('ANTECEDENTES_INCOMPATIBLES');
  if(new Set(r.alergias.map(a=>uuidPublico(a.id))).size!==r.alergias.length)throw new Error('ALERGIA_DUPLICADA');
  for(const a of r.alergias){validarAlergia({sustancia:a.sustancia,severidad:a.severidad,reaccion:a.reaccion});uuidPublico(a.actorId);instanteUtc(a.fechaHora);if(typeof a.activa!=='boolean')throw new Error('ESTADO_ALERGIA_INVALIDO');}
  if(r.perinatales)validarPerinatales(r.perinatales);
  uuidPublico(r.actorId);instanteUtc(r.fechaHora);
  if(r.verificacionSinAlergias){uuidPublico(r.verificacionSinAlergias.actorId);instanteUtc(r.verificacionSinAlergias.fechaHora);if(r.alergias.some(a=>a.activa))throw new Error('VERIFICACION_INCOMPATIBLE');}
  return r;
}
export function crearAntecedentesFirestore(db:Firestore,t?:Transaction):PuertoAntecedentesPediatricos {
  const get=(ref:DocumentReference)=>t?t.get(ref):ref.get();
  return {async porPaciente(pacienteId){
    try {
      const [config,snapshot]=await Promise.all([get(db.doc('pediatria_configuracion/antecedentes')),get(db.doc(`pediatria_antecedentes/${uuidPublico(pacienteId)}`))]);
      if(config.get('version')!==1||config.get('contrato')!=='antecedentes-pediatricos-v1-2026-11-01'||config.get('estado')!=='LISTO')throw new Error('REQUIERE_MIGRACION_009');
      return snapshot.exists?validarSnapshotAntecedentes(snapshot.data()):{version:0,alergias:[]};
    }catch {throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Los antecedentes requieren preparación y procedencia verificables.');}
  }};
}
