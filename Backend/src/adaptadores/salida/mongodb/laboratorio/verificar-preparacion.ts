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
  const resultados=await db.collection('historial_modelo').findOne({id:12});
  if(!resultados||resultados.version!==1||resultados.estado!=='LISTO'||resultados.huella!=='d78acdaf16d4e5eff57a44f3988a2617992c3357f4188a8c6ce8c6fbb51d094e'||typeof resultados.huellaValidador!=='string')throw new Error('RESULTADOS_NO_LISTOS');
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
  const infoResultado=(await db.listCollections({name:'resultados'},{nameOnly:false}).toArray())[0];
  if(!infoResultado||infoResultado.options?.validationLevel!=='strict'||infoResultado.options?.validationAction!=='error'||hash(infoResultado.options.validator)!==resultados.huellaValidador)throw new Error('VALIDADOR_RESULTADOS_INCOMPATIBLE');
  const indicesResultado=await db.collection('resultados').listIndexes().toArray();
  for(const esperado of [
   {name:'uq_resultado_serie_version',key:{serie_resultado_id:1,version:1},unique:true},
   {name:'ix_resultado_fecha',key:{fecha_analisis:1,_id:1}},
   {name:'ix_resultado_orden_fecha',key:{orden_id:1,fecha_analisis:1,_id:1}},
   {name:'ix_resultado_item_fecha',key:{item_id:1,fecha_analisis:1,_id:1}},
   {name:'ix_resultado_serie_fecha',key:{serie_resultado_id:1,fecha_analisis:1,_id:1}},
   {name:'ix_resultado_paciente_fecha',key:{paciente_id:1,fecha_analisis:1,_id:1},partialFilterExpression:{paciente_id:{$type:'string'}}},
   {name:'ix_resultado_repeticion',key:{resultado_repetido_de_id:1,fecha_analisis:1,_id:1},partialFilterExpression:{resultado_repetido_de_id:{$type:'string'}}},
  ]){
   const actual=indicesResultado.find(v=>v.name===esperado.name);
   const collationColeccion=infoResultado.options?.collation??{locale:'simple'};
   if(!actual||JSON.stringify(actual.key)!==JSON.stringify(esperado.key)||Boolean(actual.unique)!==Boolean(esperado.unique)||hash(actual.partialFilterExpression??null)!==hash(esperado.partialFilterExpression??null)||hash(actual.collation??{locale:'simple'})!==hash((esperado as {collation?:unknown}).collation??collationColeccion))throw new Error('INDICE_RESULTADOS_INCOMPATIBLE');
  }
 }catch{throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Laboratorio requiere migraciones 011/012 LISTO y esquema compatible.');}
}
