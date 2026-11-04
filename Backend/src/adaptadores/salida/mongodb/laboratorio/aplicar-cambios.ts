import type {Db,ClientSession} from 'mongodb';
import type {Muestra} from '../../../../dominio/laboratorio/muestras.js';
import type {OrdenLaboratorio} from '../../../../dominio/laboratorio/ordenes.js';
import type {CambioPlanificado,ComandoEstable} from '../../../../aplicacion/puertos/nucleo.js';
import type {ContextoAutenticado} from '../../../../aplicacion/puertos/contexto-autenticado.js';
import {ErrorDominio} from '../../../../dominio/compartido/error-dominio.js';
import {guardarMuestraMongodb} from './guardar-muestra.js';
import {documentoOrdenLaboratorio,mapearOrdenLaboratorio} from './documento-orden.js';

/** Llamado exclusivamente desde UoW después de todas las lecturas y validaciones. */
export async function aplicarCambiosLaboratorio(db:Db,session:ClientSession,contexto:ContextoAutenticado,comando:ComandoEstable,
 cambios:readonly CambioPlanificado[],originales:ReadonlyMap<string,Muestra>):Promise<void>{
 if(contexto.cuenta.institucion!=='LABORATORIO_CLINICO'||!comando.caso.startsWith('laboratorio.'))throw new ErrorDominio('SIN_PERMISO','Operación fuera del ámbito de laboratorio.');
 for(const cambio of cambios){
  if(cambio.agregado==='ordenes'&&cambio.tipo==='CREAR_ORDEN'&&cambio.versionAnterior===null){
   if(!contexto.cuenta.permisos.includes('ordenes.administrar'))throw new ErrorDominio('SIN_PERMISO','No puede crear órdenes.');
   const orden=cambio.nuevoEstado as OrdenLaboratorio;
   if(orden.id!==cambio.recursoId||orden.version!==1||orden.estado!=='CREADA'||orden.registradoPorId!==contexto.cuenta.id)throw new ErrorDominio('ESTADO_INVALIDO','Plan de orden incompatible.');
   const doc=documentoOrdenLaboratorio(orden,orden.id);mapearOrdenLaboratorio(doc);
   await db.collection<import('./documento-orden.js').DocumentoOrdenLaboratorio>('ordenes').insertOne(doc,{session});
  }else if(cambio.agregado==='muestras'&&cambio.tipo==='GUARDAR_MUESTRA'){
   if(!contexto.cuenta.permisos.includes('muestras.administrar'))throw new ErrorDominio('SIN_PERMISO','No puede administrar muestras.');
   const muestra=cambio.nuevoEstado as Muestra;const anterior=originales.get(cambio.recursoId)??null;
   if(muestra.id!==cambio.recursoId||(anterior?.version??null)!==cambio.versionAnterior||muestra.eventos.at(-1)?.actorId!==contexto.cuenta.id)throw new ErrorDominio('ESTADO_INVALIDO','Plan de muestra incompatible.');
   await guardarMuestraMongodb(db,session,anterior,muestra);
  }else throw new ErrorDominio('ESTADO_INVALIDO','Cambio de laboratorio no implementado.');
 }
}
