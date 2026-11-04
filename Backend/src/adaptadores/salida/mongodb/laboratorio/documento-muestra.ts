import type {Document} from 'mongodb';
import type {Muestra} from '../../../../dominio/laboratorio/muestras.js';
import {uuidPublico} from '../../../../dominio/compartido/uuid.js';
import {versionPositiva} from '../../../../dominio/compartido/version.js';
import {instanteUtc} from '../../../../dominio/compartido/instante-utc.js';
import {ErrorDominio} from '../../../../dominio/compartido/error-dominio.js';
const fecha=(s:string)=>new Date(instanteUtc(s));
/** Los eventos se insertan solo si son nuevos; nunca reemplazar ni borrar historia. */
export function documentosMuestra(muestra:Muestra): {muestra:Document;eventos:readonly Document[]} {
 if(!muestra.tipoMuestraId||!muestra.recipiente) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','La muestra requiere conciliación de su procedencia.');
 const doc:Document={_id:uuidPublico(muestra.id),revision:versionPositiva(muestra.version),codigo_barras:muestra.codigo,
  orden_id:uuidPublico(muestra.ordenId),item_ids:muestra.itemIds.map(id=>uuidPublico(id)),tipo_muestra_id:uuidPublico(muestra.tipoMuestraId),
  recipiente:muestra.recipiente,fecha_toma:fecha(muestra.fechaToma),tomada_por_id:uuidPublico(muestra.tomadaPorId),estado:muestra.estado};
 if(muestra.fechaRecepcion!==undefined){
  if(!muestra.recibidaPorId||!muestra.condicionRecepcion)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','La recepción de muestra está incompleta.');
  Object.assign(doc,{fecha_recepcion:fecha(muestra.fechaRecepcion),recibida_por_id:uuidPublico(muestra.recibidaPorId),condicion_recepcion:muestra.condicionRecepcion});
 }
 if(muestra.motivoRechazo!==undefined)doc.motivo_rechazo=muestra.motivoRechazo;
 if(muestra.origenId!==undefined)doc.muestra_origen_id=uuidPublico(muestra.origenId);
 if(muestra.retomaId!==undefined)doc.retoma_id=uuidPublico(muestra.retomaId);
 const eventos=muestra.eventos.map((e,i)=>{
  const evento:Document={_id:uuidPublico(e.id),revision:1,orden_evento:i+1,muestra_id:doc._id,fecha_hora:fecha(e.instante),tipo_evento:e.tipo,usuario_id:uuidPublico(e.actorId),detalle:e.detalle};
  if(e.rectificacion)evento.rectificacion={campo:e.rectificacion.campo,valor_anterior:e.rectificacion.anterior,valor_nuevo:e.rectificacion.nuevo,motivo:e.detalle};
  if(e.tipo==='RECTIFICACION'&&!e.rectificacion)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','La rectificación carece de procedencia.');
  if(e.tipo==='RETOMA'){
   if(!muestra.retomaId)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','La retoma carece de vínculo verificable.');
   evento.muestra_relacionada_id=uuidPublico(muestra.retomaId);
  }
  return evento;
 });
 return {muestra:doc,eventos};
}

/** Ordinales explícitos evitan ordenar por UUID eventos con igual instante. */
export function mapearMuestra(doc:Document, documentos:readonly Document[]):Muestra {
 try{
  const id=uuidPublico(doc._id);
  const ordenados=[...documentos].sort((a,b)=>a.orden_evento-b.orden_evento);
  if(!ordenados.length||ordenados.length!==doc.revision||new Set(ordenados.map(e=>e._id)).size!==ordenados.length)throw new Error('HISTORIA_INCOMPLETA');
  const eventos=ordenados.map((e,i)=>{
   if(e.muestra_id!==id||e.orden_evento!==i+1||!['TOMA','RECEPCION','ACEPTACION','RECHAZO','TRASLADO','PROCESAMIENTO','RECTIFICACION','RETOMA'].includes(e.tipo_evento))throw new Error('EVENTO_INCOMPATIBLE');
   const instante=instanteUtc(e.fecha_hora.toISOString());
   if(i>0&&e.fecha_hora<ordenados[i-1]!.fecha_hora)throw new Error('CRONOLOGIA_INVALIDA');
   if(e.tipo_evento==='RETOMA'&&e.muestra_relacionada_id!==doc.retoma_id)throw new Error('RETOMA_INCOMPATIBLE');
   return Object.freeze({id:uuidPublico(e._id),actorId:uuidPublico(e.usuario_id),instante,tipo:e.tipo_evento,detalle:e.detalle,
    ...(e.rectificacion?{rectificacion:Object.freeze({campo:e.rectificacion.campo,anterior:e.rectificacion.valor_anterior,nuevo:e.rectificacion.valor_nuevo})}:{})});
  });
  if(eventos[0]!.tipo!=='TOMA'||eventos[0]!.instante!==doc.fecha_toma.toISOString()||eventos[0]!.actorId!==doc.tomada_por_id||!['TOMADA','RECIBIDA','ACEPTADA','RECHAZADA','PROCESADA'].includes(doc.estado))throw new Error('TOMA_INCOMPATIBLE');
  const muestra:Muestra={id,ordenId:uuidPublico(doc.orden_id),codigo:doc.codigo_barras,version:versionPositiva(doc.revision),estado:doc.estado,
   itemIds:Object.freeze(doc.item_ids.map((v:string)=>uuidPublico(v))),tipoMuestraId:uuidPublico(doc.tipo_muestra_id),recipiente:doc.recipiente,
   fechaToma:doc.fecha_toma.toISOString(),tomadaPorId:uuidPublico(doc.tomada_por_id),eventos:Object.freeze(eventos),
   ...(doc.fecha_recepcion?{fechaRecepcion:doc.fecha_recepcion.toISOString(),recibidaPorId:uuidPublico(doc.recibida_por_id),condicionRecepcion:doc.condicion_recepcion}:{}),
   ...(doc.motivo_rechazo?{motivoRechazo:doc.motivo_rechazo}:{}),...(doc.muestra_origen_id?{origenId:uuidPublico(doc.muestra_origen_id)}:{}),...(doc.retoma_id?{retomaId:uuidPublico(doc.retoma_id)}:{})};
  documentosMuestra(muestra);
  return Object.freeze(muestra);
 }catch{throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','La muestra requiere conciliación de su historia de custodia.');}
}
