import {isDeepStrictEqual} from 'node:util';
import type {Db,ClientSession,Document} from 'mongodb';
import type {Muestra} from '../../../../dominio/laboratorio/muestras.js';
import {ErrorDominio} from '../../../../dominio/compartido/error-dominio.js';
import {documentosMuestra,mapearMuestra} from './documento-muestra.js';
const incompatible=()=>new ErrorDominio('ESTADO_INVALIDO','El cambio de custodia no preserva su historia.');

/** Solo aplica plan ya autorizado; caller confirma revisión/operación/auditoría en esta session. */
export async function guardarMuestraMongodb(db:Db,session:ClientSession,anterior:Muestra|null,nueva:Muestra):Promise<void>{
 if(!session.inTransaction())throw incompatible();
 const documentos=documentosMuestra(nueva);
 mapearMuestra(documentos.muestra,documentos.eventos);
 let desde=0;
 if(anterior){
  if(nueva.version!==anterior.version+1||nueva.eventos.length!==anterior.eventos.length+1)throw incompatible();
  for(const campo of ['id','ordenId','codigo','itemIds','fechaToma','tomadaPorId','origenId'] as const){
   if(!isDeepStrictEqual(nueva[campo],anterior[campo]))throw incompatible();
  }
  const previos=documentosMuestra(anterior).eventos;
  if(!isDeepStrictEqual(documentos.eventos.slice(0,previos.length),previos))throw incompatible();
  desde=previos.length;
  const r=await db.collection<{_id:string}&Document>('muestras').replaceOne({_id:anterior.id,revision:anterior.version},documentos.muestra as {_id:string}&Document,{session});
  if(r.matchedCount!==1)throw new ErrorDominio('VERSION_DESACTUALIZADA','La muestra cambió; recargue antes de continuar.');
 }else{
  if(nueva.version!==1||nueva.eventos.length!==1)throw incompatible();
  await db.collection('muestras').insertOne(documentos.muestra,{session});
 }
 // Cada evento es una inserción inmutable. No upsert, delete ni reemplazo de eventos previos.
 await db.collection('eventos_muestra').insertMany([...documentos.eventos.slice(desde)],{session});
}
