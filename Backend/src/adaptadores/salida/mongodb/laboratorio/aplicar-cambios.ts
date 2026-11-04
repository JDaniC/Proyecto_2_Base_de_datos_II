import {validarMuestraEnOrden} from '../../../../dominio/laboratorio/compatibilidad-muestra.js';
import type {DocumentoPacienteMongo} from '../pacientes/mapear-paciente-mongodb.js';
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
 cambios:readonly CambioPlanificado[],originales:ReadonlyMap<string,Muestra>,pacientes:ReadonlyMap<string,DocumentoPacienteMongo>,ordenes:ReadonlyMap<string,OrdenLaboratorio>):Promise<void>{
 if(contexto.cuenta.institucion!=='LABORATORIO_CLINICO'||!comando.caso.startsWith('laboratorio.'))throw new ErrorDominio('SIN_PERMISO','Operación fuera del ámbito de laboratorio.');
 const ordenesNuevas=cambios.filter(c=>c.agregado==='ordenes'&&c.tipo==='CREAR_ORDEN');
 for(const cambio of ordenesNuevas){
  const orden=cambio.nuevoEstado as OrdenLaboratorio;
  const reservas=cambios.filter(c=>c.agregado==='pacientes'&&c.tipo==='RESERVAR_ORDEN'&&c.recursoId===orden.pacienteId);
  if(reservas.length!==1||ordenesNuevas.length!==1)throw new ErrorDominio('ESTADO_INVALIDO','La orden requiere reserva de revisión del paciente.');
 }
 const cambiosMuestra=cambios.filter(c=>c.agregado==='muestras'&&c.tipo==='GUARDAR_MUESTRA');
 for(const cambio of cambiosMuestra){
  const m=cambio.nuevoEstado as Muestra;const o=ordenes.get(m.ordenId);
  if(!o)throw new ErrorDominio('REFERENCIA_INCOMPATIBLE','La orden debe leerse en la transacción.');
  validarMuestraEnOrden(m,o);
  if(cambios.filter(c=>c.agregado==='ordenes'&&c.tipo==='RESERVAR_MUESTRA'&&c.recursoId===o.id).length!==1)throw new ErrorDominio('ESTADO_INVALIDO','La muestra requiere reserva de revisión de orden.');
 }
 for(const cambio of cambios){
  if(cambio.agregado==='ordenes'&&cambio.tipo==='RESERVAR_MUESTRA'){
   const o=ordenes.get(cambio.recursoId);const nuevo=cambio.nuevoEstado as {id:string;version:number};
   if(!contexto.cuenta.permisos.includes('muestras.administrar')||!cambiosMuestra.some(c=>(c.nuevoEstado as Muestra).ordenId===cambio.recursoId))throw new ErrorDominio('SIN_PERMISO','Reserva de orden fuera de ámbito.');
   if(!o||cambio.versionAnterior!==o.version||nuevo.id!==o.id||nuevo.version!==o.version+1)throw new ErrorDominio('VERSION_DESACTUALIZADA','La orden cambió.');
   const r=await db.collection<import('./documento-orden.js').DocumentoOrdenLaboratorio>('ordenes').updateOne({_id:o.id,revision:o.version},{$set:{revision:nuevo.version}},{session});
   if(r.matchedCount!==1)throw new ErrorDominio('VERSION_DESACTUALIZADA','La orden cambió.');
   continue;
  }

  if(cambio.agregado==='pacientes'&&cambio.tipo==='RESERVAR_ORDEN'){
   if(!contexto.cuenta.permisos.includes('ordenes.administrar')||!ordenesNuevas.some(c=>(c.nuevoEstado as OrdenLaboratorio).pacienteId===cambio.recursoId))throw new ErrorDominio('SIN_PERMISO','Reserva fuera del comando de orden.');
   const p=pacientes.get(cambio.recursoId);const nuevo=cambio.nuevoEstado as {id:string;version:number};
   if(!p||Number(p.revision)!==cambio.versionAnterior||nuevo.id!==p._id||nuevo.version!==Number(p.revision)+1)throw new ErrorDominio('VERSION_DESACTUALIZADA','El paciente cambió.');
   if(!p.activo||p.historial.estado!=='ACTIVO')throw new ErrorDominio('ESTADO_INVALIDO','El expediente archivado no admite órdenes nuevas.');
   const r=await db.collection<DocumentoPacienteMongo>('pacientes').updateOne({_id:p._id,revision:p.revision,activo:true,'historial.estado':'ACTIVO'},{$set:{revision:nuevo.version}},{session});
   if(r.matchedCount!==1)throw new ErrorDominio('VERSION_DESACTUALIZADA','El paciente cambió.');
   continue;
  }

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
