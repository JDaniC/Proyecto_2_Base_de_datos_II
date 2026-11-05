import type {Db,ClientSession,Document} from 'mongodb';
import type {UUID} from '../../../../dominio/compartido/uuid.js';
import type {Muestra} from '../../../../dominio/laboratorio/muestras.js';
import {uuidPublico} from '../../../../dominio/compartido/uuid.js';
import {mapearMuestra} from './documento-muestra.js';
export function crearLectorMuestraMongodb(db:Db,session:ClientSession):{porId(id:UUID):Promise<Muestra|null>}{
 return {async porId(id){
  const muestra=await db.collection<{_id:string}&Document>('muestras').findOne({_id:uuidPublico(id)},{session});
  if(!muestra)return null;
  const eventos=await db.collection('eventos_muestra').find({muestra_id:id},{session}).sort({orden_evento:1}).toArray();
  return mapearMuestra(muestra,eventos);
 }};
}
