import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const leer=v=>JSON.parse(readFileSync(new URL(`./esquemas/011_laboratorio_mongodb_${v}.json`,import.meta.url),'utf8'));
const origen=leer('v1');const destino=leer('v2');
const ordenar=v=>Array.isArray(v)?v.map(ordenar):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordenar(v[k])])):v;
const hash=v=>createHash('sha256').update(JSON.stringify(ordenar(v))).digest('hex');
export const manifiestoLaboratorioMongodb=Object.freeze({id:11,version:1,huella:hash(destino)});

/** ADMIN con escritores detenidos y respaldo externo verificado. Reanudable, sin backfill clínico. */
export async function migrarLaboratorioMongodb(db,{escritoresDetenidos=false,despuesDeColeccion}={}) {
 if(!escritoresDetenidos) throw new Error('DETENER_ESCRITORES_LABORATORIO');
 const modelos=db.collection('historial_modelo');
 const historial=await modelos.findOne({id:1});
 if(!historial||historial.version!==1||!['LISTO','RECONCILIAR'].includes(historial.estado)) throw new Error('HISTORIAL_LABORATORIO_NO_PREPARADO');
 const previo=await modelos.findOne({id:11});
 if(previo&&(previo.huella!==manifiestoLaboratorioMongodb.huella||previo.version!==1||!['MIGRANDO','LISTO','RECONCILIAR'].includes(previo.estado))) throw new Error('MANIFIESTO_LABORATORIO_INCOMPATIBLE');
 const respaldo=[];
 // Completar preflight de las tres colecciones antes de modificar ninguna.
 for(const anterior of origen){
  const objetivo=destino.find(d=>d.nombre===anterior.nombre);
  const info=(await db.listCollections({name:anterior.nombre},{nameOnly:false}).toArray())[0];
  if(!info||info.options?.validationLevel!=='strict'||info.options?.validationAction!=='error'||![hash(anterior.validador),hash(objetivo.validador)].includes(hash(info.options.validator))) throw new Error('ESQUEMA_LABORATORIO_DESCONOCIDO');
  const indices=await db.collection(anterior.nombre).listIndexes().toArray();
  for(const ix of anterior.indices){
   const actual=indices.find(i=>i.name===ix.name);
   if(!actual||JSON.stringify(actual.key)!==JSON.stringify(ix.key)||Boolean(actual.unique)!==Boolean(ix.unique)||hash(actual.partialFilterExpression??null)!==hash(ix.partialFilterExpression??null)) throw new Error('INDICE_LABORATORIO_INCOMPATIBLE');
  }
  if(await db.collection(anterior.nombre).countDocuments({$nor:[objetivo.validador]})) throw new Error('DOCUMENTOS_LABORATORIO_INCOMPATIBLES');
  respaldo.push({nombre:anterior.nombre,validator:info.options.validator,indices:anterior.indices});
 }
 const legadoOrden=await db.collection('ordenes').findOne({items:{$elemMatch:{prueba_historica:{$exists:false}}}},{projection:{_id:1}});
 const legadoMuestra=await db.collection('muestras').findOne({recipiente:{$exists:false}},{projection:{_id:1}});
 const reconciliar=Boolean(legadoOrden||legadoMuestra||historial.estado==='RECONCILIAR'||previo?.estado==='RECONCILIAR');
 // El respaldo de configuración se conserva en el manifiesto con índice único id existente.
 await modelos.updateOne({id:11},{$setOnInsert:{respaldo,manifiestoAnterior:previo??null},$set:{...manifiestoLaboratorioMongodb,estado:'MIGRANDO'}},{upsert:true});
 for(const objetivo of destino){
  await db.command({collMod:objetivo.nombre,validator:objetivo.validador,validationLevel:'strict',validationAction:'error'});
  await despuesDeColeccion?.(objetivo.nombre);
 }
 const estado=reconciliar?'RECONCILIAR':'LISTO';
 await modelos.updateOne({id:11,huella:manifiestoLaboratorioMongodb.huella},{$set:{estado}});
 return {...manifiestoLaboratorioMongodb,estado};
}
