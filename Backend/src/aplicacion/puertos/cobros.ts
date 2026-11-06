import type {Factura,Pago} from '../../dominio/laboratorio/cobros/factura.js';
import type {UUID} from '../../dominio/compartido/uuid.js';
/** Lecturas ligadas a la misma transacción que modifica revision_cobro. */
export interface PuertoCobros {
 facturaPorId(id:UUID):Promise<Factura|null>;
 facturaPorOrden(id:UUID):Promise<Factura|null>;
 pagoPorId(id:UUID):Promise<Pago|null>;
 totalPagado(id:UUID):Promise<number>;
}
export interface FiltrosCobros {readonly ordenId?:UUID;readonly pacienteId?:UUID;readonly estado?:string;readonly desde?:string;readonly hasta?:string;}
export interface ConsultasCobros {
 detalle(id:UUID):Promise<{factura:Factura;pagado:number;saldo:number;total:number}|null>;
 listar(contexto:import('./contexto-autenticado.js').ContextoAutenticado,recurso:'facturas'|'pagos',filtros:FiltrosCobros,pagina:import('./nucleo.js').FiltrosPagina,facturaId?:UUID):Promise<import('./nucleo.js').Pagina<Factura|Pago>>;
}
