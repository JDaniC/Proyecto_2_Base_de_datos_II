import type {Db,ClientSession,Document} from 'mongodb';
import type {ConsultasCobros} from '../../../../aplicacion/puertos/cobros.js';
import {ErrorDominio,solicitudInvalida} from '../../../../dominio/compartido/error-dominio.js';
import {saldoFactura,totalFactura} from '../../../../dominio/laboratorio/cobros/factura.js';
import {crearLectorCobros,mapearFactura,mapearPago,type DocumentoCobro} from './persistencia-cobros.js';
import {verificarCobros} from './verificar-cobros.js';
import {CursorCatalogoLaboratorio} from '../laboratorio/cursor-catalogo.js';
/** Session propia de lectura: un fallo al abortar no sustituye el error original. */
export async function leerSnapshotCobros<T>(db:Db,leer:(s:ClientSession)=>Promise<T>,verificar=verificarCobros):Promise<T>{
 await verificar(db);const s=db.client.startSession();
 try{s.startTransaction({readConcern:{level:'snapshot'}});const r=await leer(s);await s.commitTransaction();return r;}
 catch(e){if(s.inTransaction()){try{await s.abortTransaction();}catch{/* conservar el error original */}}if(e instanceof ErrorDominio)throw e;throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','No se pudieron consultar cobros.');}finally{await s.endSession();}
}
export function crearConsultasCobros(db:Db,codec=new CursorCatalogoLaboratorio()):ConsultasCobros {
 const snapshot=<T>(leer:(s:ClientSession)=>Promise<T>)=>leerSnapshotCobros(db,leer);
 const limiteFecha=(v:string)=>{const d=new Date(v);const fraccion=v.match(/\.(\d+)Z$/)?.[1]??'';return new Date(d.getTime()+(/[1-9]/.test(fraccion.slice(3))?1:0));};
 return {
  detalle(id){return snapshot(async s=>{const l=crearLectorCobros(db,s),factura=await l.facturaPorId(id);if(!factura)return null;const pagado=await l.totalPagado(id);return {factura,pagado,saldo:saldoFactura(factura,pagado),total:totalFactura(factura)};});},
  listar(c,recurso,f,p,facturaId){return snapshot(async s=>{
   if(c.cuenta.institucion!=='LABORATORIO_CLINICO'||!c.cuenta.permisos.includes('cobros.administrar'))throw new ErrorDominio('SIN_PERMISO','No puede consultar cobros.');
   if(recurso==='pagos'&&(!facturaId||!await crearLectorCobros(db,s).facturaPorId(facturaId)))throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Factura no encontrada.');
   const filtro:Document={};if(f.estado)filtro.estado=f.estado;
   if(f.ordenId)filtro.orden_id=f.ordenId;if(facturaId)filtro.factura_id=facturaId;
   if(f.desde||f.hasta)filtro[recurso==='facturas'?'fecha_emision':'fecha_hora']={...(f.desde?{$gte:limiteFecha(f.desde)}:{}),...(f.hasta?{$lt:limiteFecha(f.hasta)}:{})};
   const ambito=JSON.stringify(['cobros',c.cuenta.institucion,c.cuenta.id,c.cuenta.version,[...c.cuenta.permisos].sort(),recurso,f,facturaId??null,p.orden]);
   if(p.cursor)filtro._id={[p.orden==='ASC'?'$gt':'$lt']:codec.decodificar(p.cursor,ambito)};
   const pipeline:Document[]=[{$match:filtro}];
   if(f.pacienteId)pipeline.push({$lookup:{from:'ordenes',localField:'orden_id',foreignField:'_id',as:'orden_cobro'}},{$match:{'orden_cobro.paciente_id':f.pacienteId}},{$unset:'orden_cobro'});
   pipeline.push({$sort:{_id:p.orden==='ASC'?1:-1}},{$limit:p.limite+1});
   const docs=await db.collection<DocumentoCobro>(recurso).aggregate<DocumentoCobro>(pipeline,{session:s,maxTimeMS:3000}).toArray();
   if(!['facturas','pagos'].includes(recurso))throw solicitudInvalida('Recurso inválido.');
   const pagina=docs.slice(0,p.limite),elementos=pagina.map(d=>recurso==='facturas'?mapearFactura(d):mapearPago(d));
   return {elementos,...(docs.length>p.limite?{siguienteCursor:codec.codificar(ambito,pagina.at(-1)!._id)}:{})};
  });},
 };
}
