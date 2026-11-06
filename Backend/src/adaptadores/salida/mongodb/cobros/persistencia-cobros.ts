import {BSON,Long,type Db,type ClientSession,type Document} from 'mongodb';
import type {PuertoCobros} from '../../../../aplicacion/puertos/cobros.js';
import type {CambioPlanificado} from '../../../../aplicacion/puertos/nucleo.js';
import {ErrorDominio} from '../../../../dominio/compartido/error-dominio.js';
import {uuidPublico} from '../../../../dominio/compartido/uuid.js';
import {versionPositiva} from '../../../../dominio/compartido/version.js';
import {instanteUtc} from '../../../../dominio/compartido/instante-utc.js';
import {receptorFactura,totalFactura,type Factura,type Pago} from '../../../../dominio/laboratorio/cobros/factura.js';
export type DocumentoCobro={_id:string}&Document;
const fallo=()=>new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Los datos de cobros requieren conciliación verificable.');
function entero(v:unknown){const n=Long.isLong(v)?v.toNumber():v;if(typeof n!=='number'||!Number.isSafeInteger(n)||n<0)throw fallo();return n;}
function fecha(v:unknown){if(!(v instanceof Date))throw fallo();return instanteUtc(v.toISOString());}
export function documentoFactura(f:Factura):DocumentoCobro {
 totalFactura(f);
 const d={_id:f.id,revision:1,revision_cobro:f.version,numero_factura:f.numero,orden_id:f.ordenId,moneda:f.moneda,estado:f.estado,fecha_emision:new Date(f.fecha),emitido_por_id:f.actorId,receptor:{nombre:f.receptor.nombre,tipo_identificacion:f.receptor.tipoIdentificacion,numero_identificacion:f.receptor.numeroIdentificacion,...(f.receptor.direccion?{direccion:f.receptor.direccion}:{})},lineas:f.lineas.map(l=>({linea_id:l.id,item_id:l.itemId,descripcion_historica:l.descripcion,cantidad:l.cantidad,precio_unitario:Long.fromNumber(l.precioUnitario),descuento_importe:Long.fromNumber(l.descuento),impuesto_importe:Long.fromNumber(l.impuesto)})),...(f.motivoAnulacion?{motivo_anulacion:f.motivoAnulacion}:{})};
 if(BSON.calculateObjectSize(d)>262144)throw new ErrorDominio('LIMITE_AGREGADO','La factura supera el tamaño máximo.');return d;
}
export function mapearFactura(d:DocumentoCobro):Factura {
 try{
  if(!['EMITIDA','ANULADA'].includes(d.estado)||d.moneda!=='GTQ'||!Array.isArray(d.lineas))throw fallo();
  const f:Factura={id:uuidPublico(d._id),numero:d.numero_factura,ordenId:uuidPublico(d.orden_id),version:versionPositiva(entero(d.revision_cobro)),fecha:fecha(d.fecha_emision),actorId:uuidPublico(d.emitido_por_id),estado:d.estado,moneda:'GTQ',receptor:receptorFactura({nombre:d.receptor.nombre,tipoIdentificacion:d.receptor.tipo_identificacion,numeroIdentificacion:d.receptor.numero_identificacion,...(d.receptor.direccion===undefined?{}:{direccion:d.receptor.direccion})}),lineas:d.lineas.map((l:Document)=>({id:uuidPublico(l.linea_id),itemId:uuidPublico(l.item_id),descripcion:l.descripcion_historica,cantidad:entero(l.cantidad),precioUnitario:entero(l.precio_unitario),descuento:entero(l.descuento_importe),impuesto:entero(l.impuesto_importe)})),...(d.motivo_anulacion?{motivoAnulacion:d.motivo_anulacion}:{})};
  if(typeof f.numero!=='string'||!f.numero.trim()||f.numero.length>60||(f.estado==='ANULADA'&&!f.motivoAnulacion))throw fallo();totalFactura(f);return f;
 }catch{throw fallo();}
}
export function documentoPago(p:Pago):DocumentoCobro {
 return {_id:p.id,revision:1,factura_id:p.facturaId,importe:Long.fromNumber(p.importe),moneda:p.moneda,metodo:p.metodo,fecha_hora:new Date(p.fecha),registrado_por_id:p.actorId,clave_idempotencia:p.clave,estado:p.estado,...(p.reversion?{reversion:{fecha_hora:new Date(p.reversion.fecha),usuario_id:p.reversion.actorId,motivo:p.reversion.motivo}}:{})};
}
export function mapearPago(d:DocumentoCobro):Pago {
 try{
  if(!['CONFIRMADO','ANULADO'].includes(d.estado)||d.moneda!=='GTQ'||!['EFECTIVO','TARJETA','TRANSFERENCIA','OTRO'].includes(d.metodo))throw fallo();
  const p:Pago={id:uuidPublico(d._id),facturaId:uuidPublico(d.factura_id),importe:entero(d.importe),moneda:'GTQ',metodo:d.metodo,fecha:fecha(d.fecha_hora),actorId:uuidPublico(d.registrado_por_id),clave:uuidPublico(d.clave_idempotencia),estado:d.estado,...(d.reversion?{reversion:{fecha:fecha(d.reversion.fecha_hora),actorId:uuidPublico(d.reversion.usuario_id),motivo:d.reversion.motivo}}:{})};
  if(p.importe===0||(p.estado==='ANULADO')!==!!p.reversion||(p.reversion&&(typeof p.reversion.motivo!=='string'||!p.reversion.motivo.trim()||Date.parse(p.reversion.fecha)<Date.parse(p.fecha))))throw fallo();return p;
 }catch{throw fallo();}
}
export function crearLectorCobros(db:Db,session:ClientSession):PuertoCobros {
 return {
  async facturaPorId(id){const d=await db.collection<DocumentoCobro>('facturas').findOne({_id:id},{session});return d?mapearFactura(d):null;},
  async facturaPorOrden(id){const ds=await db.collection<DocumentoCobro>('facturas').find({orden_id:id},{session}).limit(2).toArray();if(ds.length>1)throw fallo();return ds[0]?mapearFactura(ds[0]):null;},
  async pagoPorId(id){const d=await db.collection<DocumentoCobro>('pagos').findOne({_id:id},{session});return d?mapearPago(d):null;},
  async totalPagado(id){
   const ds=await db.collection('pagos').aggregate([{$match:{factura_id:id,estado:'CONFIRMADO'}},{$group:{_id:null,total:{$sum:{$toDecimal:'$importe'}},invalidos:{$sum:{$cond:[{$and:[{$eq:['$moneda','GTQ']},{$eq:[{$type:'$importe'},'long']},{$gt:['$importe',0]}]},0,1]}}}}],{session,maxTimeMS:3000}).toArray();
   if(!ds.length)return 0;if(ds[0]!.invalidos!==0)throw fallo();const n=Number(ds[0]!.total.toString());return entero(n);
  },
 };
}
/** Solo escrituras: las referencias y el saldo se leen antes, dentro del planificador. */
export async function aplicarCambiosCobros(db:Db,session:ClientSession,cambios:readonly CambioPlanificado[]):Promise<void>{
 for(const c of cambios){
  if(c.agregado==='ordenes'&&c.tipo==='RESERVAR_FACTURA'){
   if(!cambios.some(v=>v.agregado==='facturas'&&v.tipo==='EMITIR_FACTURA'&&(v.nuevoEstado as Factura).ordenId===c.recursoId))throw new ErrorDominio('ESTADO_INVALIDO','Reserva sin factura.');
   const r=await db.collection<DocumentoCobro>('ordenes').updateOne({_id:c.recursoId,revision:c.versionAnterior},{$inc:{revision:1}},{session});if(r.matchedCount!==1)throw new ErrorDominio('VERSION_DESACTUALIZADA','La orden cambió.');
  }else if(c.agregado==='facturas'&&c.tipo==='EMITIR_FACTURA'){
   const f=c.nuevoEstado as Factura;if(f.id!==c.recursoId||f.version!==1||f.estado!=='EMITIDA')throw new ErrorDominio('ESTADO_INVALIDO','Plan de factura incompatible.');
   await db.collection<DocumentoCobro>('facturas').insertOne(documentoFactura(f),{session});
  }else if(c.agregado==='facturas'&&c.tipo==='ACTUALIZAR_COBRO'){
   const f=c.nuevoEstado as Factura;if(c.versionAnterior===null||f.id!==c.recursoId||f.version!==c.versionAnterior+1)throw new ErrorDominio('ESTADO_INVALIDO','Plan de cobro incompatible.');
   const r=await db.collection<DocumentoCobro>('facturas').updateOne({_id:c.recursoId,revision_cobro:c.versionAnterior,estado:'EMITIDA'},{$set:{revision_cobro:f.version,estado:f.estado,...(f.motivoAnulacion?{motivo_anulacion:f.motivoAnulacion}:{})},$inc:{revision:1}},{session});if(r.matchedCount!==1)throw new ErrorDominio('VERSION_DESACTUALIZADA','La factura cambió.');
  }else if(c.agregado==='pagos'&&(c.tipo==='REGISTRAR_PAGO'||c.tipo==='REVERTIR_PAGO')){
   const p=c.nuevoEstado as Pago;if(p.id!==c.recursoId||!cambios.some(v=>v.agregado==='facturas'&&v.tipo==='ACTUALIZAR_COBRO'&&v.recursoId===p.facturaId))throw new ErrorDominio('ESTADO_INVALIDO','Pago sin revisión de factura.');
   if(c.tipo==='REGISTRAR_PAGO')await db.collection<DocumentoCobro>('pagos').insertOne(documentoPago(p),{session});
   else{const d=documentoPago(p);if(!p.reversion||p.estado!=='ANULADO')throw new ErrorDominio('ESTADO_INVALIDO','Reversión incompleta.');const r=await db.collection<DocumentoCobro>('pagos').updateOne({_id:p.id,factura_id:p.facturaId,estado:'CONFIRMADO'},{$set:{estado:'ANULADO',reversion:d.reversion},$inc:{revision:1}},{session});if(r.matchedCount!==1)throw new ErrorDominio('ESTADO_INVALIDO','El pago ya fue revertido.');}
  }else throw new ErrorDominio('ESTADO_INVALIDO','Cambio de cobro incompatible.');
 }
}
