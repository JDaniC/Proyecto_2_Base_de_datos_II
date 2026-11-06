import {dinero} from '../../compartido/dinero.js';
import {uuidPublico} from '../../compartido/uuid.js';
import {instanteUtc} from '../../compartido/instante-utc.js';
import {versionPositiva} from '../../compartido/version.js';
import {ErrorDominio,solicitudInvalida} from '../../compartido/error-dominio.js';
import {objetoCerrado,textoClinico} from '../../clinica/consulta.js';
import type {OrdenLaboratorio} from '../ordenes.js';

export interface ReceptorFactura {readonly nombre:string;readonly tipoIdentificacion:string;readonly numeroIdentificacion:string;readonly direccion?:string;}
export interface LineaFactura {readonly id:string;readonly itemId:string;readonly descripcion:string;readonly cantidad:number;readonly precioUnitario:number;readonly descuento:number;readonly impuesto:number;}
export interface Factura {readonly id:string;readonly numero:string;readonly ordenId:string;readonly moneda:'GTQ';readonly estado:'EMITIDA'|'ANULADA';readonly version:number;readonly fecha:string;readonly actorId:string;readonly receptor:ReceptorFactura;readonly lineas:readonly LineaFactura[];readonly motivoAnulacion?:string;}
export interface Pago {readonly id:string;readonly facturaId:string;readonly importe:number;readonly moneda:'GTQ';readonly metodo:'EFECTIVO'|'TARJETA'|'TRANSFERENCIA'|'OTRO';readonly fecha:string;readonly actorId:string;readonly clave:string;readonly estado:'CONFIRMADO'|'ANULADO';readonly reversion?:{readonly fecha:string;readonly actorId:string;readonly motivo:string};}
/** Valida los datos del receptor y devuelve su snapshot inmutable. */
export function receptorFactura(entrada:unknown):ReceptorFactura {
 const e=objetoCerrado(entrada,['nombre','tipoIdentificacion','numeroIdentificacion','direccion']);
 return Object.freeze({nombre:textoClinico(e.nombre,'nombre',200),tipoIdentificacion:textoClinico(e.tipoIdentificacion,'tipoIdentificacion',40),numeroIdentificacion:textoClinico(e.numeroIdentificacion,'numeroIdentificacion',80),...(e.direccion===undefined?{}:{direccion:textoClinico(e.direccion,'direccion',4000)})});
}
/** Importes enteros por línea; no hay conversión decimal ni redondeo implícito. */
export function totalFactura(f:Factura):number {
 if(f.moneda!=='GTQ'||f.lineas.length<1||f.lineas.length>100)throw solicitudInvalida('Factura inválida.');
 let total=0;const ids=new Set<string>(),items=new Set<string>();
 for(const l of f.lineas){
  uuidPublico(l.id);uuidPublico(l.itemId);
  if(ids.has(l.id)||items.has(l.itemId)||!Number.isSafeInteger(l.cantidad)||l.cantidad<1)throw solicitudInvalida('Líneas inválidas.');ids.add(l.id);items.add(l.itemId);
  textoClinico(l.descripcion,'descripcion',500);
  for(const n of [l.precioUnitario,l.descuento,l.impuesto])dinero(n,f.moneda);
  const bruto=l.cantidad*l.precioUnitario;if(!Number.isSafeInteger(bruto)||l.descuento>bruto)throw solicitudInvalida('Importe de línea inválido.');
  const neto=bruto-l.descuento+l.impuesto;total+=neto;
  if(!Number.isSafeInteger(neto)||!Number.isSafeInteger(total))throw solicitudInvalida('Total fuera del rango seguro.');
 }
 return total;
}
/** Congela las líneas no canceladas y los precios históricos de la orden. */
export function emitirFactura(orden:OrdenLaboratorio,entrada:{id:string;numero:string;receptor:ReceptorFactura;fecha:string;actorId:string;lineaIds:readonly string[]}):Factura {
 if(orden.estado==='CANCELADA')throw new ErrorDominio('ESTADO_INVALIDO','La orden está cancelada.');
 const items=orden.items.filter(i=>i.estado!=='CANCELADO');
 if(items.length!==entrada.lineaIds.length)throw solicitudInvalida('Identidades de líneas incompletas.');
 const f:Factura=Object.freeze({id:uuidPublico(entrada.id),numero:textoClinico(entrada.numero,'numero',60),ordenId:uuidPublico(orden.id),moneda:'GTQ',estado:'EMITIDA',version:1,fecha:instanteUtc(entrada.fecha),actorId:uuidPublico(entrada.actorId),receptor:receptorFactura(entrada.receptor),lineas:Object.freeze(items.map((i,n)=>Object.freeze({id:uuidPublico(entrada.lineaIds[n]),itemId:uuidPublico(i.id),descripcion:i.prueba.nombre,cantidad:1,precioUnitario:dinero(i.precio.centavos,i.precio.moneda).centavos,descuento:0,impuesto:0})))});
 totalFactura(f);return f;
}
/** Calcula deuda exigible; una anulada debe conservar cero pagos confirmados. */
export function saldoFactura(f:Factura,pagado:number):number {
 const total=totalFactura(f);dinero(pagado,f.moneda);
 if(f.estado==='ANULADA'){if(pagado!==0)throw new ErrorDominio('ESTADO_INVALIDO','Una factura anulada conserva pagos confirmados.');return 0;}
 if(pagado>total)throw new ErrorDominio('ESTADO_INVALIDO','Saldo de factura inconsistente.');return total-pagado;
}
/** Rechaza revisiones antiguas o facturas que ya no admiten movimientos. */
export function exigirRevisionFactura(f:Factura,version:unknown):void {
 if(f.version!==versionPositiva(version))throw new ErrorDominio('VERSION_DESACTUALIZADA','La factura cambió.');
 if(f.estado!=='EMITIDA')throw new ErrorDominio('ESTADO_INVALIDO','La factura no admite movimientos.');
}
/** Construye un pago positivo que no excede el saldo confirmado. */
export function registrarPago(f:Factura,pagado:number,entrada:Omit<Pago,'estado'|'facturaId'|'moneda'>&{moneda:unknown}):Pago {
 if(f.estado!=='EMITIDA')throw new ErrorDominio('ESTADO_INVALIDO','La factura no admite pagos.');
 if(entrada.moneda!=='GTQ')throw solicitudInvalida('Moneda GTQ obligatoria.');
 const importe=dinero(entrada.importe,entrada.moneda).centavos;
 if(importe===0||!['EFECTIVO','TARJETA','TRANSFERENCIA','OTRO'].includes(entrada.metodo))throw solicitudInvalida('Pago inválido.');
 if(importe>saldoFactura(f,pagado))throw new ErrorDominio('SALDO_INSUFICIENTE','El importe supera el saldo disponible.');
 return Object.freeze({id:uuidPublico(entrada.id),facturaId:f.id,importe,moneda:'GTQ',metodo:entrada.metodo,fecha:instanteUtc(entrada.fecha),actorId:uuidPublico(entrada.actorId),clave:uuidPublico(entrada.clave),estado:'CONFIRMADO'});
}
/** Conserva el pago original y agrega una única reversión trazable. */
export function revertirPago(f:Factura,p:Pago,entrada:{fecha:string;actorId:string;motivo:unknown}):Pago {
 if(f.estado!=='EMITIDA'||p.facturaId!==f.id||p.estado!=='CONFIRMADO'||p.reversion)throw new ErrorDominio('ESTADO_INVALIDO','El pago no admite reversión.');
 if(Date.parse(entrada.fecha)<Date.parse(p.fecha))throw solicitudInvalida('La reversión precede al pago.');
 return Object.freeze({...p,estado:'ANULADO',reversion:Object.freeze({fecha:instanteUtc(entrada.fecha),actorId:uuidPublico(entrada.actorId),motivo:textoClinico(entrada.motivo,'motivo',4000)})});
}
/** Anula solo sin pagos confirmados, conservando el contenido emitido. */
export function anularFactura(f:Factura,pagado:number,motivo:unknown):Factura {
 if(f.estado!=='EMITIDA'||pagado!==0)throw new ErrorDominio('ESTADO_INVALIDO','La factura requiere revertir todos los pagos antes de anular.');
 return Object.freeze({...f,estado:'ANULADA',version:versionPositiva(f.version+1),motivoAnulacion:textoClinico(motivo,'motivo',4000)});
}
