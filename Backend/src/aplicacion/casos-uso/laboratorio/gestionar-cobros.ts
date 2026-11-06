import {objetoCerrado,textoClinico} from '../../../dominio/clinica/consulta.js';
import {uuidPublico} from '../../../dominio/compartido/uuid.js';
import {versionPositiva} from '../../../dominio/compartido/version.js';
import {dinero} from '../../../dominio/compartido/dinero.js';
import {ErrorDominio,solicitudInvalida} from '../../../dominio/compartido/error-dominio.js';
import {validarPermiso} from '../../../dominio/clinica/politicas-institucionales.js';
import {emitirFactura,saldoFactura,receptorFactura,registrarPago,revertirPago,anularFactura,exigirRevisionFactura,type Pago,type Factura} from '../../../dominio/laboratorio/cobros/factura.js';
import {prepararComandoEstable} from '../../servicios/preparar-comando-estable.js';
import {contextoVigente,type DependenciasClinicas,type ParametrosClinicos} from '../consultas/atencion-clinica.js';
import type {CambioPlanificado} from '../../puertos/nucleo.js';

export class GestionarCobrosLaboratorio {
 constructor(private readonly deps:DependenciasClinicas){}
 async ejecutar(accion:'emitir'|'pagar'|'revertir'|'anular',p:ParametrosClinicos&{id?:unknown}){
  if(!['emitir','pagar','revertir','anular'].includes(accion))throw solicitudInvalida('Acción inválida.');
  if(p.contexto.cuenta.institucion!=='LABORATORIO_CLINICO'||p.bundle.institucion!=='LABORATORIO_CLINICO')throw new ErrorDominio('SIN_PERMISO','Capacidad exclusiva de laboratorio.');
  validarPermiso(p.contexto.cuenta,'cobros.administrar');
  const campos={emitir:['ordenId','versionOrden','numero','receptor'],pagar:['versionEsperada','importe','moneda','metodo'],revertir:['versionEsperada','pagoId','motivo'],anular:['versionEsperada','motivo']} as const;
  const e=objetoCerrado(p.entrada,campos[accion]);
  const id=accion==='emitir'?uuidPublico(e.ordenId):uuidPublico(p.id);
  const version=versionPositiva(accion==='emitir'?e.versionOrden:e.versionEsperada);
  const datos=accion==='emitir'?{numero:textoClinico(e.numero,'numero',60),receptor:receptorFactura(e.receptor)}:accion==='pagar'?{importe:dinero(e.importe,e.moneda).centavos,moneda:e.moneda,metodo:e.metodo}:accion==='revertir'?{pagoId:uuidPublico(e.pagoId),motivo:textoClinico(e.motivo,'motivo',4000)}:{motivo:textoClinico(e.motivo,'motivo',4000)};
  if(accion==='pagar'&&(e.moneda!=='GTQ'||e.importe===0||!['EFECTIVO','TARJETA','TRANSFERENCIA','OTRO'].includes(e.metodo as string)))throw solicitudInvalida('Pago inválido.');
  const comando=await prepararComandoEstable(p.claveIdempotencia,`laboratorio.cobros.${accion}`,{id,version,...datos},['revision','auditoria','pago',...Array.from({length:100},(_,i)=>`linea${i}`)],this.deps);
  if(!p.bundle.uow)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Persistencia no disponible.');
  return p.bundle.uow.ejecutar(p.contexto,comando,async lector=>{
   const c=await contextoVigente(lector,p.contexto);validarPermiso(c.cuenta,'cobros.administrar');
   const cobros=lector.cobros;if(!cobros)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Cobros no preparados.');
   const cambios:CambioPlanificado[]=[];
   if(accion==='emitir'){
    const orden=await lector.laboratorio?.ordenPorId(id);
    if(!orden)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Orden no encontrada.');
    if(orden.version!==version)throw new ErrorDominio('VERSION_DESACTUALIZADA','La orden cambió.');
    if(await cobros.facturaPorOrden(id))throw new ErrorDominio('ESTADO_INVALIDO','La orden ya tiene una factura.');
    const factura=emitirFactura(orden,{id:comando.id,numero:datos.numero!,receptor:datos.receptor!,fecha:comando.instante,actorId:c.cuenta.id,lineaIds:orden.items.filter(i=>i.estado!=='CANCELADO').map((_,i)=>comando.ids[`linea${i}`]!)});
    cambios.push({agregado:'ordenes',tipo:'RESERVAR_FACTURA',recursoId:id,versionAnterior:version,nuevoEstado:{id,version:versionPositiva(version+1)}},{agregado:'facturas',tipo:'EMITIR_FACTURA',recursoId:comando.id,versionAnterior:null,nuevoEstado:factura});
    return {tipo:'CONFIRMAR' as const,cambios,revisiones:[],auditoria:[{id:comando.ids.auditoria!,actorId:c.cuenta.id,caso:comando.caso,recursoId:comando.id,fechaHora:comando.instante,correlacion:c.correlacion}],resultado:{httpStatus:201,respuesta:{factura},correlacionOriginal:c.correlacion}};
   }
   const anterior=await cobros.facturaPorId(id);
   if(!anterior)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Factura no encontrada.');
   exigirRevisionFactura(anterior,version);
   const pagado=await cobros.totalPagado(id);saldoFactura(anterior,pagado);
   let factura:Factura={...anterior,version:versionPositiva(version+1)};let pago:Pago|undefined;
   if(accion==='pagar'){
    pago=registrarPago(anterior,pagado,{id:comando.ids.pago!,importe:datos.importe!,moneda:datos.moneda,metodo:datos.metodo as Pago['metodo'],fecha:comando.instante,actorId:c.cuenta.id,clave:p.claveIdempotencia});
    cambios.push({agregado:'pagos',tipo:'REGISTRAR_PAGO',recursoId:uuidPublico(pago.id),versionAnterior:null,nuevoEstado:pago});
   }else if(accion==='revertir'){
    const previo=await cobros.pagoPorId(datos.pagoId!);
    if(!previo||previo.facturaId!==id)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Pago no encontrado.');
    pago=revertirPago(anterior,previo,{fecha:comando.instante,actorId:c.cuenta.id,motivo:datos.motivo});
    if(previo.importe>pagado)throw new ErrorDominio('ESTADO_INVALIDO','Saldo inconsistente.');
    cambios.push({agregado:'pagos',tipo:'REVERTIR_PAGO',recursoId:uuidPublico(pago.id),versionAnterior:versionPositiva(1),nuevoEstado:pago});
   }else factura=anularFactura(anterior,pagado,datos.motivo);
   cambios.unshift({agregado:'facturas',tipo:'ACTUALIZAR_COBRO',recursoId:id,versionAnterior:version,nuevoEstado:factura});
   return {tipo:'CONFIRMAR' as const,cambios,revisiones:[{id:comando.ids.revision!,agregado:'facturas',recursoId:id,versionAnterior:version,snapshotAnterior:anterior,...(datos.motivo?{motivo:datos.motivo}:{})}],auditoria:[{id:comando.ids.auditoria!,actorId:c.cuenta.id,caso:comando.caso,recursoId:id,fechaHora:comando.instante,correlacion:c.correlacion,...(datos.motivo?{motivo:datos.motivo}:{})}],resultado:{httpStatus:accion==='pagar'?201:200,respuesta:{factura,...(pago?{pago}:{} )},correlacionOriginal:c.correlacion}};
  });
 }
}
