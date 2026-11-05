import {objetoCerrado,textoClinico} from '../../../dominio/clinica/consulta.js';
import {uuidPublico} from '../../../dominio/compartido/uuid.js';
import {versionPositiva} from '../../../dominio/compartido/version.js';
import {ErrorDominio,solicitudInvalida} from '../../../dominio/compartido/error-dominio.js';
import {validarPermiso} from '../../../dominio/clinica/politicas-institucionales.js';
import {tomarMuestra,registrarEventoMuestra,rectificarMuestra,retomarMuestra,type Muestra,type TipoEventoMuestra,type CampoRectificable} from '../../../dominio/laboratorio/muestras.js';
import {validarMuestraEnOrden} from '../../../dominio/laboratorio/compatibilidad-muestra.js';
import {prepararComandoEstable} from '../../servicios/preparar-comando-estable.js';
import {contextoVigente,siguienteVersion,type DependenciasClinicas,type ParametrosClinicos} from '../consultas/atencion-clinica.js';
import type {CambioPlanificado,RevisionPlanificada} from '../../puertos/nucleo.js';
export type AccionMuestra='tomar'|'evento'|'rectificar'|'retomar';
const campos:Record<AccionMuestra,readonly string[]>={
 tomar:['ordenId','versionOrden','itemIds','tipoMuestraId','codigo','recipiente'],
 evento:['versionEsperada','versionOrden','tipo','detalle'],
 rectificar:['versionEsperada','versionOrden','campo','nuevo','motivo'],
 retomar:['versionEsperada','versionOrden','tipoMuestraId','codigo','recipiente','motivo'],
};
export class GestionarMuestraLaboratorio{
 constructor(private readonly deps:DependenciasClinicas){}
 async ejecutar(accion:AccionMuestra,p:ParametrosClinicos){
  if(p.contexto.cuenta.institucion!=='LABORATORIO_CLINICO'||p.bundle.institucion!=='LABORATORIO_CLINICO')throw new ErrorDominio('SIN_PERMISO','Capacidad exclusiva de laboratorio.');
  validarPermiso(p.contexto.cuenta,'muestras.administrar');
  const e={...objetoCerrado(p.entrada,campos[accion])};
  const versionOrden=versionPositiva(e.versionOrden);
  const id=accion==='tomar'?null:uuidPublico(p.id);
  if(accion!=='tomar')versionPositiva(e.versionEsperada);
  if(accion==='tomar'||accion==='retomar'){
   e.tipoMuestraId=uuidPublico(e.tipoMuestraId);e.codigo=textoClinico(e.codigo,'codigo',80).trim();e.recipiente=textoClinico(e.recipiente,'recipiente',2000).trim();
  }
  if(accion==='tomar'){
   e.ordenId=uuidPublico(e.ordenId);
   if(!Array.isArray(e.itemIds)||!e.itemIds.length||e.itemIds.length>100)throw solicitudInvalida('Se requieren ítems de orden.');
   e.itemIds=e.itemIds.map(v=>uuidPublico(v));
  }
  if(accion==='evento'){
   if(!['RECEPCION','ACEPTACION','RECHAZO','TRASLADO','PROCESAMIENTO'].includes(e.tipo as string))throw solicitudInvalida('Evento no admitido.');
   e.detalle=textoClinico(e.detalle,'detalle',2000).trim();
  }
  if(accion==='rectificar'){
   if(!['tipoMuestraId','recipiente'].includes(e.campo as string))throw solicitudInvalida('Campo de rectificación inválido.');
   e.nuevo=e.campo==='tipoMuestraId'?uuidPublico(e.nuevo):textoClinico(e.nuevo,'nuevo',2000).trim();
  }
  if(accion==='rectificar'||accion==='retomar')e.motivo=textoClinico(e.motivo,'motivo',2000).trim();
  const comando=await prepararComandoEstable(p.claveIdempotencia,`laboratorio.muestra.${accion}`,{id,entrada:e},['evento','eventoOrigen','revisionOrden','revisionMuestra','auditoria','historial'],this.deps);
  if(!p.bundle.uow)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Persistencia no disponible.');
  return p.bundle.uow.ejecutar<Muestra>(p.contexto,comando,async lector=>{
   const contexto=await contextoVigente(lector,p.contexto);validarPermiso(contexto.cuenta,'muestras.administrar');
   const refs=lector.laboratorio;if(!refs)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Laboratorio no preparado.');
   const anterior=id?await refs.muestraPorId(id):null;
   if(id&&!anterior)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Muestra no encontrada.');
   if(anterior&&anterior.version!==e.versionEsperada)throw new ErrorDominio('VERSION_DESACTUALIZADA','La muestra cambió.');
   const ordenId=uuidPublico(anterior?.ordenId??e.ordenId);
   const orden=await refs.ordenPorId(ordenId);
   if(!orden)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Orden no encontrada.');
   if(orden.version!==versionOrden)throw new ErrorDominio('VERSION_DESACTUALIZADA','La orden cambió.');
   const tipo=e.tipoMuestraId??(accion==='rectificar'&&e.campo==='tipoMuestraId'?e.nuevo:undefined);
   if(tipo!==undefined&&!(await refs.tipoMuestraPorId(uuidPublico(tipo)))?.activo)throw new ErrorDominio('REFERENCIA_INCOMPATIBLE','Tipo de muestra no habilitado.');
   const autor={id:comando.ids.evento!,actorId:contexto.cuenta.id,instante:comando.instante};
   const toma={id:comando.id,ordenId,codigo:e.codigo as string,tipoMuestraId:e.tipoMuestraId as string,recipiente:e.recipiente as string,itemIds:(anterior?.itemIds??e.itemIds) as readonly string[]};
   let resultado:Muestra;const versiones:{anterior:Muestra|null;actual:Muestra}[]=[];
   if(accion==='tomar'){resultado=tomarMuestra(toma,autor);versiones.push({anterior:null,actual:resultado});}
   else if(accion==='retomar'){
    const r=retomarMuestra(anterior!,anterior!.version,toma,e.motivo as string,{...autor,id:comando.ids.eventoOrigen!},autor);
    versiones.push({anterior,actual:r.origen},{anterior:null,actual:r.nueva});resultado=r.nueva;
   }else{
    resultado=accion==='evento'?registrarEventoMuestra(anterior!,anterior!.version,e.tipo as TipoEventoMuestra,e.detalle as string,autor):rectificarMuestra(anterior!,anterior!.version,e.campo as CampoRectificable,e.nuevo as string,e.motivo as string,autor);
    versiones.push({anterior,actual:resultado});
   }
   const cambios:CambioPlanificado[]=[{agregado:'eventosHistorial',tipo:'LABORATORIO',recursoId:comando.ids.historial!,versionAnterior:null,nuevoEstado:{pacienteId:orden.pacienteId,id:comando.ids.historial!,fechaHora:comando.instante,tipo:'ORDEN_LAB',recursoId:orden.id,titulo:accion==='tomar'?'Toma de muestra registrada':accion==='retomar'?'Retoma de muestra registrada':accion==='rectificar'?'Dato de muestra rectificado':'Custodia de muestra actualizada'}},{agregado:'ordenes',tipo:'RESERVAR_MUESTRA',recursoId:ordenId,versionAnterior:versionOrden,nuevoEstado:{id:ordenId,version:siguienteVersion(versionOrden)}}];
   const revisiones:RevisionPlanificada[]=[{id:comando.ids.revisionOrden!,agregado:'ordenes',recursoId:ordenId,versionAnterior:versionOrden,snapshotAnterior:orden}];
   for(const v of versiones){
    validarMuestraEnOrden(v.actual,orden);
    cambios.push({agregado:'muestras',tipo:'GUARDAR_MUESTRA',recursoId:uuidPublico(v.actual.id),versionAnterior:v.anterior?versionPositiva(v.anterior.version):null,nuevoEstado:v.actual});
    if(v.anterior)revisiones.push({id:comando.ids.revisionMuestra!,agregado:'muestras',recursoId:uuidPublico(v.actual.id),versionAnterior:versionPositiva(v.anterior.version),snapshotAnterior:v.anterior});
   }
   return {tipo:'CONFIRMAR',cambios,revisiones,auditoria:[{id:comando.ids.auditoria!,actorId:contexto.cuenta.id,caso:comando.caso,recursoId:uuidPublico(resultado.id),fechaHora:comando.instante,correlacion:contexto.correlacion,...(e.motivo?{motivo:e.motivo as string}:{})}],resultado:{httpStatus:accion==='tomar'||accion==='retomar'?201:200,respuesta:resultado,correlacionOriginal:contexto.correlacion}};
  });
 }
}
