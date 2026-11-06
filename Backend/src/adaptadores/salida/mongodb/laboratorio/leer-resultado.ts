import type { ClientSession, Db } from 'mongodb';
import type { UUID } from '../../../../dominio/compartido/uuid.js';
import type { ResultadoLaboratorio } from '../../../../dominio/laboratorio/resultados/resultado.js';
import { mapearResultadoLaboratorio, type DocumentoResultadoLaboratorio } from './documento-resultado.js';

export function crearLectorResultadoMongodb(db:Db,session:ClientSession):{
  porId(id:UUID):Promise<ResultadoLaboratorio|null>;
  ultimoPorSerie(serieId:UUID):Promise<ResultadoLaboratorio|null>;
}{
 const coleccion=db.collection<DocumentoResultadoLaboratorio>('resultados');
 return Object.freeze({
  async porId(id){const doc=await coleccion.findOne({_id:id},{session});return doc?mapearResultadoLaboratorio(doc):null;},
  async ultimoPorSerie(serieId){const doc=await coleccion.findOne({serie_resultado_id:serieId},{session,sort:{version:-1}});return doc?mapearResultadoLaboratorio(doc):null;},
 });
}
