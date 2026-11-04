import type {Muestra} from './muestras.js';
import type {OrdenLaboratorio} from './ordenes.js';
import {ErrorDominio} from '../compartido/error-dominio.js';
/** Usa el snapshot acordado de la orden, nunca el catálogo vigente. */
export function validarMuestraEnOrden(muestra:Muestra,orden:OrdenLaboratorio):void{
 const rectificacion=muestra.eventos.at(-1)?.tipo==='RECTIFICACION';
 if(muestra.ordenId!==orden.id||!muestra.itemIds.length||new Set(muestra.itemIds).size!==muestra.itemIds.length)throw new ErrorDominio('REFERENCIA_INCOMPATIBLE','La muestra no pertenece a esta orden.');
 if(!rectificacion&&['CANCELADA','COMPLETADA'].includes(orden.estado))throw new ErrorDominio('ESTADO_INVALIDO','La orden terminada no admite nuevas operaciones de muestra.');
 for(const id of muestra.itemIds){
  const item=orden.items.find(i=>i.id===id);
  if(!item||!muestra.tipoMuestraId||!item.prueba.tiposMuestraIds.includes(muestra.tipoMuestraId))throw new ErrorDominio('REFERENCIA_INCOMPATIBLE','Los ítems o tipo de muestra no corresponden a la orden.');
  if(!rectificacion&&item.estado==='CANCELADO')throw new ErrorDominio('ESTADO_INVALIDO','El ítem cancelado no admite muestras.');
 }
}
