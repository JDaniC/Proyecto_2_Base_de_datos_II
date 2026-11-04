import {createHash} from 'node:crypto';
import type {Db} from 'mongodb';
import {ErrorDominio} from '../../../../dominio/compartido/error-dominio.js';
import {preparacionLaboratorio} from './preparacion-modelo.js';
const ordenar=(v:unknown):unknown=>Array.isArray(v)?v.map(ordenar):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordenar((v as Record<string,unknown>)[k])])):v;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(ordenar(v))).digest('hex');
export async function verificarLaboratorioMongodb(db:Db):Promise<void>{
 try{
  const historial=await db.collection('historial_modelo').findOne({id:1});
  if(!historial||historial.version!==1||historial.estado!=='LISTO')throw new Error('HISTORIAL_NO_LISTO');
  const m=await db.collection('historial_modelo').findOne({id:11});
  if(!m||m.version!==1||m.estado!=='LISTO'||m.huella!==preparacionLaboratorio.huella)throw new Error('MANIFIESTO_NO_LISTO');
  for(const contrato of preparacionLaboratorio.colecciones){
   const info=(await db.listCollections({name:contrato.nombre},{nameOnly:false}).toArray())[0];
   if(!info||info.options?.validationLevel!=='strict'||info.options?.validationAction!=='error'||hash(info.options.validator)!==contrato.huellaValidador)throw new Error('VALIDADOR_INCOMPATIBLE');
   const indices=await db.collection(contrato.nombre).listIndexes().toArray();
   for(const esperado of contrato.indices){
    const actual=indices.find(i=>i.name===esperado.name);
    const e=esperado as {key:unknown;unique?:boolean;partialFilterExpression?:unknown};
    if(!actual||JSON.stringify(actual.key)!==JSON.stringify(e.key)||Boolean(actual.unique)!==Boolean(e.unique)||hash(actual.partialFilterExpression??null)!==hash(e.partialFilterExpression??null))throw new Error('INDICE_INCOMPATIBLE');
   }
  }
 }catch{throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Laboratorio requiere migración011 LISTO y esquema compatible.');}
}
