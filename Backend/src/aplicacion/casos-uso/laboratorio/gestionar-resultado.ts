import { objetoCerrado, textoClinico } from '../../../dominio/clinica/consulta.js';
import { ErrorDominio, solicitudInvalida } from '../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../dominio/compartido/version.js';
import { validarPermiso } from '../../../dominio/clinica/politicas-institucionales.js';
import type { Muestra } from '../../../dominio/laboratorio/muestras.js';
import { completarOrdenPorResultado, crearBorradorResultado, crearCorreccionResultado, crearRepeticionResultado, guardarBorradorResultado, validarResultado, verificarProcedenciaResultado,
  type EntradaCapturaResultado, type EntradaComponenteResultado, type ResultadoLaboratorio } from '../../../dominio/laboratorio/resultados/resultado.js';
import { prepararComandoEstable } from '../../servicios/preparar-comando-estable.js';
import type { CambioPlanificado, RevisionPlanificada } from '../../puertos/nucleo.js';
import { contextoVigente, type DependenciasClinicas, type ParametrosClinicos } from '../consultas/atencion-clinica.js';

export type AccionResultado='capturar'|'editar'|'validar'|'corregir'|'repetir';
const campos:Record<AccionResultado,readonly string[]>={
 capturar:['ordenId','itemId','muestraIds','equipoId','componentes','observaciones'],
 editar:['versionEsperada','muestraIds','equipoId','componentes','observaciones'],
 validar:['versionEsperada'],
 corregir:['muestraIds','equipoId','componentes','observaciones','motivo'],
 repetir:['muestraIds','equipoId','componentes','observaciones'],
};

function componentes(valor:unknown):readonly EntradaComponenteResultado[]{
 if(!Array.isArray(valor)||valor.length<1||valor.length>100)throw solicitudInvalida('Se requieren componentes de resultado.','componentes');
 return valor.map(v=>{
  const e=objetoCerrado(v,['parametroId','valorNumerico','valorTexto','unidadAplicada','referenciaInferior','referenciaSuperior','referenciaTexto','indicador','observaciones']);
  return {...e,parametroId:uuidPublico(e.parametroId)} as unknown as EntradaComponenteResultado;
 });
}
function muestras(valor:unknown):readonly string[]{
 if(!Array.isArray(valor)||valor.length<1||valor.length>100)throw solicitudInvalida('Se requieren muestras.','muestraIds');
 const ids=valor.map(v=>uuidPublico(v));if(new Set(ids).size!==ids.length)throw solicitudInvalida('Muestras duplicadas.','muestraIds');return ids;
}
function autorizar(accion:AccionResultado,cuenta:ParametrosClinicos['contexto']['cuenta']):void{
 const validar=accion==='validar';
 validarPermiso(cuenta,validar?'resultados.validar':'resultados.analizar');
 const rol=validar?'VALIDADOR_LABORATORIO':'ANALISTA_LABORATORIO';
 if(!cuenta.roles.includes(rol))throw new ErrorDominio('SIN_PERMISO','El rol actual no permite esta operación analítica.');
}

export class GestionarResultadoLaboratorio{
 constructor(private readonly deps:DependenciasClinicas){}
 async ejecutar(accion:AccionResultado,p:ParametrosClinicos){
  if(p.contexto.cuenta.institucion!=='LABORATORIO_CLINICO'||p.bundle.institucion!=='LABORATORIO_CLINICO')throw new ErrorDominio('SIN_PERMISO','Capacidad exclusiva de laboratorio.');
  autorizar(accion,p.contexto.cuenta);
  const e={...objetoCerrado(p.entrada,campos[accion])};const id=accion==='capturar'?null:uuidPublico(p.id);
  if(accion==='capturar'){e.ordenId=uuidPublico(e.ordenId);e.itemId=uuidPublico(e.itemId);}
  if(accion==='editar'||accion==='validar')e.versionEsperada=versionPositiva(e.versionEsperada);
  if(accion!=='validar'){
   e.muestraIds=muestras(e.muestraIds);e.componentes=componentes(e.componentes);
   if(e.equipoId!==undefined)e.equipoId=uuidPublico(e.equipoId);
   if(e.observaciones!==undefined)e.observaciones=textoClinico(e.observaciones,'observaciones',4000,true).trim();
  }
  if(accion==='corregir')e.motivo=textoClinico(e.motivo,'motivo',2000).trim();
  const ids=['auditoria','revisionResultado','revisionOrden',...(accion==='capturar'||accion==='repetir'?['serie']:[])];
  const comando=await prepararComandoEstable(p.claveIdempotencia,`laboratorio.resultado.${accion}`,{id,entrada:e},ids,this.deps);
  if(!p.bundle.uow)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Persistencia no disponible.');
  return p.bundle.uow.ejecutar<ResultadoLaboratorio>(p.contexto,comando,async lector=>{
   const contexto=await contextoVigente(lector,p.contexto);autorizar(accion,contexto.cuenta);
   const refs=lector.laboratorio;if(!refs)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Laboratorio no preparado.');
   const anterior=id?await refs.resultadoPorId(id):null;
   if(id&&!anterior)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Resultado no encontrado.');
   const ordenId=uuidPublico(anterior?.ordenId??e.ordenId);const orden=await refs.ordenPorId(ordenId);
   if(!orden)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Orden no encontrada.');
   const muestraIds=accion==='validar'?anterior!.procedencia.map(v=>v.muestraId):e.muestraIds as readonly string[];
   const leidas:Muestra[]=[],tiposMuestra=new Map<string,string>(anterior?.procedencia.map(v=>[v.tipoMuestraId,v.tipoMuestraNombre])??[]);for(const muestraId of muestraIds){const muestra=await refs.muestraPorId(uuidPublico(muestraId));if(!muestra)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Muestra no encontrada.');leidas.push(muestra);if(!muestra.tipoMuestraId)throw new ErrorDominio('REFERENCIA_INCOMPATIBLE','La muestra carece de tipo verificable.');if(accion!=='validar'){const tipo=await refs.tipoMuestraPorId(uuidPublico(muestra.tipoMuestraId));if(!tipo)throw new ErrorDominio('REFERENCIA_INCOMPATIBLE','El tipo histórico de muestra no está disponible.');tiposMuestra.set(tipo.id,tipo.nombre);}}
   let resultado:ResultadoLaboratorio;
   if(accion==='validar'){
    verificarProcedenciaResultado(anterior!,orden,leidas,tiposMuestra);resultado=validarResultado(anterior!,e.versionEsperada as number,contexto.cuenta.id,comando.instante);
   }else{
    const captura:EntradaCapturaResultado={id:comando.id,serieId:comando.ids.serie??anterior?.serieId??comando.id,itemId:uuidPublico(anterior?.itemId??e.itemId),
     analistaId:contexto.cuenta.id,instante:comando.instante,componentes:e.componentes as readonly EntradaComponenteResultado[],
     ...(e.equipoId===undefined?{}:{equipoId:e.equipoId as string}),...(e.observaciones?{observaciones:e.observaciones as string}:{})};
    if(accion==='capturar')resultado=crearBorradorResultado(captura,orden,leidas,tiposMuestra);
    else if(accion==='editar')resultado=guardarBorradorResultado(anterior!,e.versionEsperada as number,captura,orden,leidas,tiposMuestra);
    else if(accion==='corregir'){
     const ultimo=await refs.ultimoResultadoPorSerie(uuidPublico(anterior!.serieId));
     if(!ultimo||ultimo.id!==anterior!.id)throw new ErrorDominio('VERSION_DESACTUALIZADA','Ya existe una versión posterior de la serie.');
     resultado=crearCorreccionResultado(anterior!,captura,e.motivo as string,orden,leidas,tiposMuestra);
    }else resultado=crearRepeticionResultado(anterior!,captura,orden,leidas,tiposMuestra);
   }
   const cambios:CambioPlanificado[]=[{agregado:'resultados',tipo:'GUARDAR_RESULTADO',recursoId:uuidPublico(resultado.id),versionAnterior:accion==='editar'||accion==='validar'?versionPositiva(anterior!.revision):null,nuevoEstado:resultado}];
   const revisiones:RevisionPlanificada[]=[];
   if(accion==='editar'||accion==='validar')revisiones.push({id:comando.ids.revisionResultado!,agregado:'resultados',recursoId:uuidPublico(anterior!.id),versionAnterior:versionPositiva(anterior!.revision),snapshotAnterior:anterior!});
   if(accion==='validar'){
    const actualizada=completarOrdenPorResultado(orden,resultado);
    if(actualizada!==orden){cambios.push({agregado:'ordenes',tipo:'ACTUALIZAR_POR_RESULTADO',recursoId:uuidPublico(orden.id),versionAnterior:versionPositiva(orden.version),nuevoEstado:actualizada});revisiones.push({id:comando.ids.revisionOrden!,agregado:'ordenes',recursoId:uuidPublico(orden.id),versionAnterior:versionPositiva(orden.version),snapshotAnterior:orden});}
   }
   return {tipo:'CONFIRMAR',cambios,revisiones,auditoria:[{id:comando.ids.auditoria!,actorId:contexto.cuenta.id,caso:comando.caso,recursoId:uuidPublico(resultado.id),fechaHora:comando.instante,correlacion:contexto.correlacion,...(e.motivo?{motivo:e.motivo as string}:{})}],
    resultado:{httpStatus:accion==='capturar'||accion==='corregir'||accion==='repetir'?201:200,respuesta:resultado,correlacionOriginal:contexto.correlacion}};
  });
 }
}
