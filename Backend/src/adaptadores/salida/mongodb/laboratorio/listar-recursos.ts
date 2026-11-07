import type {Db,Document,Filter,ClientSession} from 'mongodb';
import type {ContextoAutenticado} from '../../../../aplicacion/puertos/contexto-autenticado.js';
import type {FiltrosPagina,Pagina} from '../../../../aplicacion/puertos/nucleo.js';
import type {FiltrosOrdenesLaboratorio,FiltrosMuestrasLaboratorio,FiltrosResultadosLaboratorio,TrabajoAnaliticoLaboratorio} from '../../../../aplicacion/puertos/laboratorio.js';
import type {CodecCursorHistorial} from '../../../../aplicacion/puertos/historial.js';
import type {OrdenLaboratorio} from '../../../../dominio/laboratorio/ordenes.js';
import type {Muestra} from '../../../../dominio/laboratorio/muestras.js';
import type {ResultadoLaboratorio} from '../../../../dominio/laboratorio/resultados/resultado.js';
import {uuidPublico} from '../../../../dominio/compartido/uuid.js';
import {versionPositiva} from '../../../../dominio/compartido/version.js';
import {instanteUtc} from '../../../../dominio/compartido/instante-utc.js';
import {solicitudInvalida,ErrorDominio} from '../../../../dominio/compartido/error-dominio.js';
import {normalizarInstante} from '../../../../aplicacion/casos-uso/historiales/consultar-historial.js';
import {CursorHistorialCifrado} from '../../historial/cursor-historial.js';
import {verificarLaboratorioMongodb} from './verificar-preparacion.js';
import {mapearOrdenLaboratorio,type DocumentoOrdenLaboratorio} from './documento-orden.js';
import {mapearMuestra} from './documento-muestra.js';
import {mapearResultadoLaboratorio,type DocumentoResultadoLaboratorio} from './documento-resultado.js';
/** Mongo guarda milisegundos: ceil conserva límites [desde,hasta) con fracciones más precisas. */
function limiteFecha(valor:string):Date{
 instanteUtc(valor);const fecha=new Date(valor);const fraccion=valor.split('.')[1]?.slice(0,-1)??'';
 if(/[1-9]/.test(fraccion.slice(3)))fecha.setTime(fecha.getTime()+1);
 return fecha;
}
export function crearListadosLaboratorioMongodb(db:Db,codec:CodecCursorHistorial=new CursorHistorialCifrado(),ensayo:{despuesDeLeerDocumentos?:()=>Promise<void>}={}){
 async function listar<T>(recurso:'ordenes'|'muestras'|'resultados',contexto:ContextoAutenticado,f:{pacienteId?:string;ordenId?:string;itemId?:string;serieId?:string;estado?:string;desde?:string;hasta?:string},p:FiltrosPagina,mapear:(d:Document,session:ClientSession)=>Promise<T>):Promise<Pagina<T>>{
  const autorizado=recurso==='ordenes'?contexto.cuenta.permisos.includes('ordenes.administrar'):recurso==='muestras'?contexto.cuenta.permisos.includes('muestras.administrar'):contexto.cuenta.permisos.some(v=>v==='resultados.analizar'||v==='resultados.validar');
  if(contexto.cuenta.institucion!=='LABORATORIO_CLINICO'||!autorizado)throw new ErrorDominio('SIN_PERMISO','No puede consultar este recurso de laboratorio.');
  if(!Number.isInteger(p.limite)||p.limite<1||p.limite>100||!['ASC','DESC'].includes(p.orden))throw solicitudInvalida('Paginación inválida.');
  const estados=recurso==='ordenes'?['CREADA','EN_PROCESO','COMPLETADA','CANCELADA']:recurso==='muestras'?['TOMADA','RECIBIDA','ACEPTADA','RECHAZADA','PROCESADA']:['BORRADOR','VALIDADO'];
  if(f.estado!==undefined&&!estados.includes(f.estado))throw solicitudInvalida('Estado inválido.');
  const permitidos=recurso==='ordenes'?['pacienteId','estado','desde','hasta']:recurso==='muestras'?['pacienteId','ordenId','estado','desde','hasta']:['pacienteId','ordenId','itemId','serieId','estado','desde','hasta'];
  if(Object.keys(f).some(k=>!permitidos.includes(k)))throw solicitudInvalida('Filtro no admitido.');
  if(f.desde!==undefined&&f.hasta!==undefined&&normalizarInstante(f.desde)>=normalizarInstante(f.hasta))throw solicitudInvalida('Rango inválido.');
  const campoFecha=recurso==='ordenes'?'fecha_orden':recurso==='muestras'?'fecha_toma':'fecha_analisis';const filtro:Filter<Document>={};
  const filtros={...(f.pacienteId!==undefined?{pacienteId:uuidPublico(f.pacienteId)}:{}),...(f.ordenId!==undefined?{ordenId:uuidPublico(f.ordenId)}:{}),...(f.itemId!==undefined?{itemId:uuidPublico(f.itemId)}:{}),...(f.serieId!==undefined?{serieId:uuidPublico(f.serieId)}:{}),...(f.estado?{estado:f.estado}:{}),...(f.desde!==undefined?{desde:normalizarInstante(f.desde)}:{}),...(f.hasta!==undefined?{hasta:normalizarInstante(f.hasta)}:{})};
  if(filtros.pacienteId&&(recurso==='ordenes'||recurso==='resultados'))filtro.paciente_id=filtros.pacienteId;if(filtros.ordenId)filtro.orden_id=filtros.ordenId;if(filtros.itemId)filtro.item_id=filtros.itemId;if(filtros.serieId)filtro.serie_resultado_id=filtros.serieId;if(filtros.estado)filtro.estado=filtros.estado;
  if(f.desde!==undefined||f.hasta!==undefined)filtro[campoFecha]={...(f.desde!==undefined?{$gte:limiteFecha(f.desde)}:{}),...(f.hasta!==undefined?{$lt:limiteFecha(f.hasta)}:{})};
  const ambito=JSON.stringify(['LABORATORIO_CLINICO',contexto.cuenta.id,contexto.cuenta.version,[...contexto.cuenta.permisos].sort(),recurso,p.orden,filtros]);
  if(p.cursor!==undefined){const ultima=codec.decodificar(p.cursor,ambito);const comparador=p.orden==='ASC'?'$gt':'$lt';filtro.$and=[{$or:[{[campoFecha]:{[comparador]:new Date(ultima.fechaHora)}},{[campoFecha]:new Date(ultima.fechaHora),_id:{[comparador]:ultima.id}}]}];}
  try{
  await verificarLaboratorioMongodb(db);
  const session=db.client.startSession();
  try{
  session.startTransaction({readConcern:{level:'snapshot'}});
  const direccion=p.orden==='ASC'?1:-1;
  const docs=recurso==='muestras'&&filtros.pacienteId
   ?await db.collection(recurso).aggregate<Document>([{$match:filtro},{$lookup:{from:'ordenes',localField:'orden_id',foreignField:'_id',pipeline:[{$project:{paciente_id:1,_id:0}}],as:'_orden'}},{$match:{'_orden.paciente_id':filtros.pacienteId}},{$unset:'_orden'},{$sort:{[campoFecha]:direccion,_id:direccion}},{$limit:p.limite+1}],{maxTimeMS:3000,session}).toArray()
   :await db.collection(recurso).find(filtro,{maxTimeMS:3000,session}).sort({[campoFecha]:direccion,_id:direccion}).limit(p.limite+1).toArray();
  await ensayo.despuesDeLeerDocumentos?.();
  const pagina=docs.slice(0,p.limite);const ultimo=pagina.at(-1);
  const elementos:T[]=[];for(const d of pagina)elementos.push(await mapear(d,session));
  await session.commitTransaction();
  return {elementos,...(docs.length>p.limite&&ultimo?{siguienteCursor:codec.codificar(ambito,{id:ultimo._id as unknown as string,fechaHora:(ultimo[campoFecha] as Date).toISOString()})}:{})};
  }catch(e){if(session.inTransaction())await session.abortTransaction();throw e;}finally{await session.endSession();}
  }catch(e){if(e instanceof ErrorDominio)throw e;throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','No fue posible consultar los recursos de laboratorio.');}
 }
 return {
  listarOrdenes:(c:ContextoAutenticado,f:FiltrosOrdenesLaboratorio,p:FiltrosPagina)=>listar<OrdenLaboratorio>('ordenes',c,f,p,async d=>mapearOrdenLaboratorio(d as DocumentoOrdenLaboratorio)),
  listarMuestras:(c:ContextoAutenticado,f:FiltrosMuestrasLaboratorio,p:FiltrosPagina)=>listar<Muestra>('muestras',c,f,p,async(d,session)=>mapearMuestra(d,await db.collection('eventos_muestra').find({muestra_id:d._id},{maxTimeMS:3000,session}).sort({orden_evento:1}).toArray())),
  listarResultados:(c:ContextoAutenticado,f:FiltrosResultadosLaboratorio,p:FiltrosPagina)=>listar<ResultadoLaboratorio>('resultados',c,f,p,async d=>mapearResultadoLaboratorio(d as DocumentoResultadoLaboratorio)),
  async listarTrabajoAnalitico(c:ContextoAutenticado,ordenId:string|undefined,p:FiltrosPagina):Promise<Pagina<TrabajoAnaliticoLaboratorio>>{
   if(c.cuenta.institucion!=='LABORATORIO_CLINICO'||!c.cuenta.permisos.some(v=>v==='resultados.analizar'||v==='resultados.validar'))throw new ErrorDominio('SIN_PERMISO','No puede consultar trabajo analitico.');
   if(!Number.isInteger(p.limite)||p.limite<1||p.limite>100||p.orden!=='ASC')throw solicitudInvalida('Paginación inválida.');
   try{
    await verificarLaboratorioMongodb(db);const session=db.client.startSession();
    try{
     session.startTransaction({readConcern:{level:'snapshot'}});
     const ambito=JSON.stringify(['LABORATORIO_CLINICO',c.cuenta.id,c.cuenta.version,[...c.cuenta.permisos].sort(),'trabajo-analitico',ordenId??null]);
     const filtro:Filter<Document & {_id:string}>={...(ordenId?{_id:uuidPublico(ordenId)}:{})};
     if(p.cursor!==undefined){
      const ultima=codec.decodificar(p.cursor,ambito);
      filtro.$or=[{fecha_orden:{$gt:new Date(ultima.fechaHora)}},{fecha_orden:new Date(ultima.fechaHora),_id:{$gt:ultima.id}}];
     }
     const estadosAptos={$in:['ACEPTADA','PROCESADA']};
     // Paginamos por orden, de modo que todas sus muestras se lean en la misma página.
     const documentosOrden=await db.collection('ordenes').aggregate<Document>([
      {$match:filtro},{$sort:{fecha_orden:1,_id:1}},
      {$lookup:{from:'muestras',localField:'_id',foreignField:'orden_id',pipeline:[{$match:{estado:estadosAptos}},{$limit:1},{$project:{_id:1}}],as:'aptas'}},
      {$match:{'aptas.0':{$exists:true}}},{$limit:p.limite+1},{$unset:'aptas'},
     ],{session,maxTimeMS:3000}).toArray();
     const pagina=documentosOrden.slice(0,p.limite);
     const salida:TrabajoAnaliticoLaboratorio[]=[];
     for(const documentoOrden of pagina){
      const orden=mapearOrdenLaboratorio(documentoOrden as DocumentoOrdenLaboratorio);
      const muestrasOrden=await db.collection('muestras').find({orden_id:orden.id,estado:estadosAptos},{session,maxTimeMS:3000}).sort({fecha_toma:1,_id:1}).toArray();
      const idsItems=new Set<string>(muestrasOrden.flatMap(m=>(m.item_ids as string[]).map(v=>uuidPublico(v))));
      salida.push(Object.freeze({ordenId:uuidPublico(orden.id),pacienteId:uuidPublico(orden.pacienteId),prioridad:orden.prioridad,estado:orden.estado,version:versionPositiva(orden.version),
       items:Object.freeze(orden.items.filter(i=>idsItems.has(i.id)&&i.estado!=='CANCELADO').map(i=>Object.freeze({id:i.id,prueba:i.prueba,estado:i.estado}))),
       muestras:Object.freeze(muestrasOrden.map(m=>Object.freeze({id:uuidPublico(String(m._id)),codigo:String(m.codigo_barras),itemIds:Object.freeze((m.item_ids as string[]).map(v=>uuidPublico(v))),estado:m.estado as Muestra['estado'],version:versionPositiva(Number(m.revision)),tipoMuestraId:uuidPublico(m.tipo_muestra_id as string),recipiente:String(m.recipiente)})))}));
     }
     await session.commitTransaction();
     const ultimo=pagina.at(-1);
     return {elementos:Object.freeze(salida),...(documentosOrden.length>p.limite&&ultimo?{siguienteCursor:codec.codificar(ambito,{id:String(ultimo._id),fechaHora:(ultimo.fecha_orden as Date).toISOString()})}:{})};
    }catch(e){if(session.inTransaction())await session.abortTransaction();throw e;}finally{await session.endSession();}
   }catch(e){if(e instanceof ErrorDominio)throw e;throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','No fue posible consultar el trabajo analitico.');}
  },
 };
}
