import type {Db,Document,Filter} from 'mongodb';
import type {ContextoAutenticado} from '../../../../aplicacion/puertos/contexto-autenticado.js';
import type {FiltrosPagina,Pagina} from '../../../../aplicacion/puertos/nucleo.js';
import type {FiltrosOrdenesLaboratorio,FiltrosMuestrasLaboratorio} from '../../../../aplicacion/puertos/laboratorio.js';
import type {CodecCursorHistorial} from '../../../../aplicacion/puertos/historial.js';
import type {OrdenLaboratorio} from '../../../../dominio/laboratorio/ordenes.js';
import type {Muestra} from '../../../../dominio/laboratorio/muestras.js';
import {uuidPublico} from '../../../../dominio/compartido/uuid.js';
import {instanteUtc} from '../../../../dominio/compartido/instante-utc.js';
import {solicitudInvalida,ErrorDominio} from '../../../../dominio/compartido/error-dominio.js';
import {normalizarInstante} from '../../../../aplicacion/casos-uso/historiales/consultar-historial.js';
import {CursorHistorialCifrado} from '../../historial/cursor-historial.js';
import {verificarLaboratorioMongodb} from './verificar-preparacion.js';
import {mapearOrdenLaboratorio,type DocumentoOrdenLaboratorio} from './documento-orden.js';
import {mapearMuestra} from './documento-muestra.js';
/** Mongo guarda milisegundos: ceil conserva límites [desde,hasta) con fracciones más precisas. */
function limiteFecha(valor:string):Date{
 instanteUtc(valor);const fecha=new Date(valor);const fraccion=valor.split('.')[1]?.slice(0,-1)??'';
 if(/[1-9]/.test(fraccion.slice(3)))fecha.setTime(fecha.getTime()+1);
 return fecha;
}
export function crearListadosLaboratorioMongodb(db:Db,codec:CodecCursorHistorial=new CursorHistorialCifrado()){
 async function listar<T>(recurso:'ordenes'|'muestras',contexto:ContextoAutenticado,f:{pacienteId?:string;ordenId?:string;estado?:string;desde?:string;hasta?:string},p:FiltrosPagina,mapear:(d:Document)=>Promise<T>):Promise<Pagina<T>>{
  const permiso=recurso==='ordenes'?'ordenes.administrar':'muestras.administrar';
  if(contexto.cuenta.institucion!=='LABORATORIO_CLINICO'||!contexto.cuenta.permisos.includes(permiso))throw new ErrorDominio('SIN_PERMISO','No puede consultar este recurso de laboratorio.');
  if(!Number.isInteger(p.limite)||p.limite<1||p.limite>100||!['ASC','DESC'].includes(p.orden))throw solicitudInvalida('Paginación inválida.');
  const estados=recurso==='ordenes'?['CREADA','EN_PROCESO','COMPLETADA','CANCELADA']:['TOMADA','RECIBIDA','ACEPTADA','RECHAZADA','PROCESADA'];
  if(f.estado!==undefined&&!estados.includes(f.estado))throw solicitudInvalida('Estado inválido.');
  if(Object.keys(f).some(k=>!(recurso==='ordenes'?['pacienteId','estado','desde','hasta']:['ordenId','estado','desde','hasta']).includes(k)))throw solicitudInvalida('Filtro no admitido.');
  if(f.desde!==undefined&&f.hasta!==undefined&&normalizarInstante(f.desde)>=normalizarInstante(f.hasta))throw solicitudInvalida('Rango inválido.');
  const campoFecha=recurso==='ordenes'?'fecha_orden':'fecha_toma';const filtro:Filter<Document>={};
  const filtros={...(f.pacienteId!==undefined?{pacienteId:uuidPublico(f.pacienteId)}:{}),...(f.ordenId!==undefined?{ordenId:uuidPublico(f.ordenId)}:{}),...(f.estado?{estado:f.estado}:{}),...(f.desde!==undefined?{desde:normalizarInstante(f.desde)}:{}),...(f.hasta!==undefined?{hasta:normalizarInstante(f.hasta)}:{})};
  if(filtros.pacienteId)filtro.paciente_id=filtros.pacienteId;if(filtros.ordenId)filtro.orden_id=filtros.ordenId;if(filtros.estado)filtro.estado=filtros.estado;
  if(f.desde!==undefined||f.hasta!==undefined)filtro[campoFecha]={...(f.desde!==undefined?{$gte:limiteFecha(f.desde)}:{}),...(f.hasta!==undefined?{$lt:limiteFecha(f.hasta)}:{})};
  const ambito=JSON.stringify(['LABORATORIO_CLINICO',contexto.cuenta.id,contexto.cuenta.version,[...contexto.cuenta.permisos].sort(),recurso,p.orden,filtros]);
  if(p.cursor!==undefined){const ultima=codec.decodificar(p.cursor,ambito);const comparador=p.orden==='ASC'?'$gt':'$lt';filtro.$and=[{$or:[{[campoFecha]:{[comparador]:new Date(ultima.fechaHora)}},{[campoFecha]:new Date(ultima.fechaHora),_id:{[comparador]:ultima.id}}]}];}
  try{
  await verificarLaboratorioMongodb(db);
  const direccion=p.orden==='ASC'?1:-1;
  const docs=await db.collection(recurso).find(filtro,{maxTimeMS:3000}).sort({[campoFecha]:direccion,_id:direccion}).limit(p.limite+1).toArray();
  const pagina=docs.slice(0,p.limite);const ultimo=pagina.at(-1);
  const elementos:T[]=[];for(const d of pagina)elementos.push(await mapear(d));
  return {elementos,...(docs.length>p.limite&&ultimo?{siguienteCursor:codec.codificar(ambito,{id:ultimo._id as unknown as string,fechaHora:(ultimo[campoFecha] as Date).toISOString()})}:{})};
  }catch(e){if(e instanceof ErrorDominio)throw e;throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','No fue posible consultar los recursos de laboratorio.');}
 }
 return {
  listarOrdenes:(c:ContextoAutenticado,f:FiltrosOrdenesLaboratorio,p:FiltrosPagina)=>listar<OrdenLaboratorio>('ordenes',c,f,p,async d=>mapearOrdenLaboratorio(d as DocumentoOrdenLaboratorio)),
  listarMuestras:(c:ContextoAutenticado,f:FiltrosMuestrasLaboratorio,p:FiltrosPagina)=>listar<Muestra>('muestras',c,f,p,async d=>mapearMuestra(d,await db.collection('eventos_muestra').find({muestra_id:d._id},{maxTimeMS:3000}).sort({orden_evento:1}).toArray())),
 };
}
