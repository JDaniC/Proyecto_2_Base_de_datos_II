import {createHash} from 'node:crypto';
import type {Db} from 'mongodb';
import {ErrorDominio} from '../../../../dominio/compartido/error-dominio.js';
import {preparacionCobros} from './preparacion.js';
import {verificarLaboratorioMongodb} from '../laboratorio/verificar-preparacion.js';
const ordenar=(v:unknown):unknown=>Array.isArray(v)?v.map(ordenar):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordenar((v as Record<string,unknown>)[k])])):v;
export async function verificarCobros(db:Db):Promise<void>{
 await verificarLaboratorioMongodb(db);
 try{for(const d of preparacionCobros){
  const c=await db.listCollections({name:d.nombre}).next();
  if(!c||!('options' in c)||createHash('sha256').update(JSON.stringify(ordenar(c.options?.validator))).digest('hex')!==d.huella||c.options?.validationAction!=='error'||c.options?.validationLevel!=='strict')throw new Error();
  const indices=await db.collection(d.nombre).listIndexes().toArray();
  for(const i of d.indices)if(!indices.some(a=>a.name===i.name&&JSON.stringify(a.key)===JSON.stringify(i.key)&&!!a.unique===('unique' in i&&i.unique===true)&&!a.partialFilterExpression&&!a.sparse&&!a.collation))throw new Error();
 }}catch{throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Cobros requiere un esquema compatible.');}
}
