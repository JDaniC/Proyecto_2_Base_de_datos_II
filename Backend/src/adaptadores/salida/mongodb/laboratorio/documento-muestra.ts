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
 const eventos=muestra.eventos.map(e=>{
  const evento:Document={_id:uuidPublico(e.id),revision:1,muestra_id:doc._id,fecha_hora:fecha(e.instante),tipo_evento:e.tipo,usuario_id:uuidPublico(e.actorId),detalle:e.detalle};
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
