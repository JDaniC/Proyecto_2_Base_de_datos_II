import {guardarReferenciaMongodb} from './guardar-referencia.js';
import {congelarPrueba,type PruebaVersionada} from '../../../../dominio/laboratorio/ordenes.js';
import {normalizarInstante} from '../../../../aplicacion/casos-uso/historiales/consultar-historial.js';
import {validarEventoHistorial} from '../../historial/proyeccion-historial.js';
import {validarMuestraEnOrden} from '../../../../dominio/laboratorio/compatibilidad-muestra.js';
import type {DocumentoPacienteMongo} from '../pacientes/mapear-paciente-mongodb.js';
import type {Db,ClientSession} from 'mongodb';
import type {Muestra} from '../../../../dominio/laboratorio/muestras.js';
import type {OrdenLaboratorio} from '../../../../dominio/laboratorio/ordenes.js';
import type {ResultadoLaboratorio} from '../../../../dominio/laboratorio/resultados/resultado.js';
import {verificarProcedenciaResultado} from '../../../../dominio/laboratorio/resultados/resultado.js';
import type {CambioPlanificado,ComandoEstable} from '../../../../aplicacion/puertos/nucleo.js';
import type {ContextoAutenticado} from '../../../../aplicacion/puertos/contexto-autenticado.js';
import {ErrorDominio} from '../../../../dominio/compartido/error-dominio.js';
import {guardarMuestraMongodb} from './guardar-muestra.js';
import {documentoOrdenLaboratorio,mapearOrdenLaboratorio,validarTamanoDocumentoOrdenLaboratorio} from './documento-orden.js';
import {documentoResultadoLaboratorio} from './documento-resultado.js';

/** Llamado exclusivamente desde UoW después de todas las lecturas y validaciones. */
export async function aplicarCambiosLaboratorio(db:Db,session:ClientSession,contexto:ContextoAutenticado,comando:ComandoEstable,
 cambios:readonly CambioPlanificado[],originales:ReadonlyMap<string,Muestra>,pacientes:ReadonlyMap<string,DocumentoPacienteMongo>,ordenes:ReadonlyMap<string,OrdenLaboratorio>,resultados:ReadonlyMap<string,ResultadoLaboratorio>=new Map()):Promise<void>{
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
 const cambiosResultado=cambios.filter(c=>c.agregado==='resultados'&&c.tipo==='GUARDAR_RESULTADO');
 for(const cambio of cambiosResultado){
  const resultado=cambio.nuevoEstado as ResultadoLaboratorio,orden=ordenes.get(resultado.ordenId);
  if(!orden)throw new ErrorDominio('REFERENCIA_INCOMPATIBLE','La orden del resultado debe leerse en la transacción.');
  const procedencia=resultado.procedencia.map(v=>originales.get(v.muestraId));
  if(procedencia.some(v=>!v))throw new ErrorDominio('REFERENCIA_INCOMPATIBLE','Las muestras del resultado deben leerse en la transacción.');
  verificarProcedenciaResultado(resultado,orden,procedencia as Muestra[],new Map(resultado.procedencia.map(v=>[v.tipoMuestraId,v.tipoMuestraNombre])));
  const reservas=cambios.filter(c=>c.agregado==='ordenes'&&c.recursoId===orden.id&&(c.tipo==='RESERVAR_RESULTADO'||c.tipo==='ACTUALIZAR_POR_RESULTADO'));
  if(reservas.length!==1)throw new ErrorDominio('ESTADO_INVALIDO','El resultado requiere reserva de revisión de orden.');
 }
 for(const cambio of cambios){
  if(['solicitantes','tipos_muestra','proveedores'].includes(cambio.agregado)&&cambio.tipo==='GUARDAR_REFERENCIA'){
   if(!contexto.cuenta.roles.includes('ADMIN_INSTITUCIONAL')||!contexto.cuenta.permisos.includes('ordenes.administrar'))throw new ErrorDominio('SIN_PERMISO','No puede mantener referencias.');
   await guardarReferenciaMongodb(db,session,cambio);continue;
  }
  if(cambio.agregado==='metodos'&&cambio.tipo==='PUBLICAR_METODO'&&cambio.versionAnterior===null){
   if(!contexto.cuenta.roles.includes('VALIDADOR_LABORATORIO')||!contexto.cuenta.permisos.includes('resultados.validar'))throw new ErrorDominio('SIN_PERMISO','No puede publicar métodos.');
   const m=cambio.nuevoEstado as {id:string;codigo:string;nombre:string;version:number;descripcion:string;activo:boolean};
   if(m.id!==cambio.recursoId||m.activo!==true)throw new ErrorDominio('ESTADO_INVALIDO','Plan de método incompatible.');
   await db.collection<{_id:string}&import('mongodb').Document>('metodos').insertOne({_id:m.id,revision:1,codigo:m.codigo,nombre:m.nombre,version:m.version,activo:true,...(m.descripcion.trim()?{descripcion:m.descripcion}:{})},{session});
   continue;
  }
  if((cambio.agregado==='pruebas'||cambio.agregado==='metodos')&&cambio.tipo==='CAMBIAR_ESTADO'){
   if(!contexto.cuenta.roles.includes('VALIDADOR_LABORATORIO')||!contexto.cuenta.permisos.includes('resultados.validar'))throw new ErrorDominio('SIN_PERMISO','No puede administrar pruebas.');
   const nuevo=cambio.nuevoEstado as {id:string;activo:boolean;revision:number};
   if(nuevo.id!==cambio.recursoId||typeof nuevo.activo!=='boolean'||cambio.versionAnterior===null||nuevo.revision!==cambio.versionAnterior+1)throw new ErrorDominio('ESTADO_INVALIDO','Plan de estado incompatible.');
   const r=await db.collection<{_id:string}&import('mongodb').Document>(cambio.agregado).updateOne({_id:nuevo.id,revision:cambio.versionAnterior},{$set:{revision:nuevo.revision,activo:nuevo.activo}},{session});
   if(r.matchedCount!==1)throw new ErrorDominio('VERSION_DESACTUALIZADA','La versión de catálogo cambió.');
   continue;
  }
  if(cambio.agregado==='pruebas'&&cambio.tipo==='PUBLICAR_PRUEBA'&&cambio.versionAnterior===null){
   if(!contexto.cuenta.roles.includes('VALIDADOR_LABORATORIO')||!contexto.cuenta.permisos.includes('resultados.validar'))throw new ErrorDominio('SIN_PERMISO','No puede publicar pruebas.');
   const {prueba:entrada,area}=cambio.nuevoEstado as {prueba:PruebaVersionada;area:string};const prueba=congelarPrueba(entrada);
   if(prueba.id!==cambio.recursoId||typeof area!=='string'||!area.trim()||area.length>100)throw new ErrorDominio('ESTADO_INVALIDO','Plan de catálogo incompatible.');
   await db.collection<{_id:string}&import('mongodb').Document>('pruebas').insertOne({_id:prueba.id,revision:1,codigo:prueba.codigo,version:prueba.version,nombre:prueba.nombre,area,metodo_id:prueba.metodoId,tipo_muestra_ids:[...prueba.tiposMuestraIds],activo:true,parametros:prueba.parametros.map(v=>({parametro_id:v.id,codigo:v.codigo,nombre:v.nombre,tipo_valor:v.tipo,obligatorio:v.obligatorio,...(v.unidad===undefined?{}:{unidad_sugerida:v.unidad}),...(v.opciones===undefined?{}:{opciones_permitidas:[...v.opciones]})}))},{session});
   continue;
  }
  if(cambio.agregado==='eventosHistorial'&&cambio.tipo==='LABORATORIO'){
   const {pacienteId,...entrada}=cambio.nuevoEstado as {pacienteId:string}&Record<string,unknown>;
   const evento=validarEventoHistorial(entrada,'LABORATORIO_CLINICO');
   const orden=(ordenesNuevas.find(c=>c.recursoId===evento.recursoId)?.nuevoEstado as OrdenLaboratorio|undefined)??ordenes.get(evento.recursoId);
   if(!orden||orden.pacienteId!==pacienteId||evento.tipo!=='ORDEN_LAB'||evento.id!==cambio.recursoId||evento.fechaHora!==normalizarInstante(comando.instante))throw new ErrorDominio('ESTADO_INVALIDO','Proyección fuera de la orden.');
   await db.collection<{_id:string}&import('mongodb').Document>('historial_eventos').insertOne({_id:evento.id,paciente_id:pacienteId,tipo:evento.tipo,fecha_hora:evento.fechaHora,contenido:evento},{session});
   continue;
  }
  if(cambio.agregado==='ordenes'&&cambio.tipo==='RESERVAR_MUESTRA'){
   const o=ordenes.get(cambio.recursoId);const nuevo=cambio.nuevoEstado as {id:string;version:number};
   if(!contexto.cuenta.permisos.includes('muestras.administrar')||!cambiosMuestra.some(c=>(c.nuevoEstado as Muestra).ordenId===cambio.recursoId))throw new ErrorDominio('SIN_PERMISO','Reserva de orden fuera de ámbito.');
   if(!o||cambio.versionAnterior!==o.version||nuevo.id!==o.id||nuevo.version!==o.version+1)throw new ErrorDominio('VERSION_DESACTUALIZADA','La orden cambió.');
   const r=await db.collection<import('./documento-orden.js').DocumentoOrdenLaboratorio>('ordenes').updateOne({_id:o.id,revision:o.version},{$set:{revision:nuevo.version,...(o.estado==='CREADA'&&cambiosMuestra.some(c=>(c.nuevoEstado as Muestra).ordenId===o.id&&c.versionAnterior===null)?{estado:'EN_PROCESO' as const}:{})}},{session});
   if(r.matchedCount!==1)throw new ErrorDominio('VERSION_DESACTUALIZADA','La orden cambió.');
   continue;
  }
  if(cambio.agregado==='resultados'&&cambio.tipo==='GUARDAR_RESULTADO'){
   const resultado=cambio.nuevoEstado as ResultadoLaboratorio,anterior=originalesResultado(resultados,cambio.recursoId);
   const validacion=comando.caso==='laboratorio.resultado.validar';
   if(validacion){if(!contexto.cuenta.roles.includes('VALIDADOR_LABORATORIO')||!contexto.cuenta.permisos.includes('resultados.validar')||resultado.estado!=='VALIDADO'||resultado.validadorId!==contexto.cuenta.id)throw new ErrorDominio('SIN_PERMISO','No puede validar resultados.');}
   else if(!contexto.cuenta.roles.includes('ANALISTA_LABORATORIO')||!contexto.cuenta.permisos.includes('resultados.analizar')||resultado.analistaId!==contexto.cuenta.id)throw new ErrorDominio('SIN_PERMISO','No puede capturar resultados.');
   if(resultado.id!==cambio.recursoId)throw new ErrorDominio('ESTADO_INVALIDO','Plan de resultado incompatible.');
   const doc=documentoResultadoLaboratorio(resultado);
   if(cambio.versionAnterior===null){
    if(anterior||resultado.revision!==1||resultado.estado!=='BORRADOR')throw new ErrorDominio('ESTADO_INVALIDO','El resultado nuevo debe iniciar como borrador.');
    await db.collection<import('./documento-resultado.js').DocumentoResultadoLaboratorio>('resultados').insertOne(doc,{session});
   }else{
    if(!anterior||anterior.revision!==cambio.versionAnterior||resultado.revision!==anterior.revision+1||anterior.estado!=='BORRADOR'||resultado.id!==anterior.id||resultado.serieId!==anterior.serieId||resultado.version!==anterior.version)throw new ErrorDominio('VERSION_DESACTUALIZADA','El resultado cambió.');
    const r=await db.collection<import('./documento-resultado.js').DocumentoResultadoLaboratorio>('resultados').replaceOne({_id:resultado.id,revision:cambio.versionAnterior,estado:'BORRADOR'},doc,{session});
    if(r.matchedCount!==1)throw new ErrorDominio('VERSION_DESACTUALIZADA','El resultado cambió.');
   }
   continue;
  }
  if(cambio.agregado==='ordenes'&&cambio.tipo==='RESERVAR_RESULTADO'){
   const anterior=ordenes.get(cambio.recursoId),nuevo=cambio.nuevoEstado as {id:string;version:number};
   const resultado=cambiosResultado.find(v=>(v.nuevoEstado as ResultadoLaboratorio).ordenId===cambio.recursoId);
   if(!anterior||!resultado||cambio.versionAnterior!==anterior.version||nuevo.id!==anterior.id||nuevo.version!==anterior.version+1)throw new ErrorDominio('VERSION_DESACTUALIZADA','La orden cambió.');
   const r=await db.collection<import('./documento-orden.js').DocumentoOrdenLaboratorio>('ordenes').updateOne({_id:anterior.id,revision:anterior.version},{$set:{revision:nuevo.version}},{session});
   if(r.matchedCount!==1)throw new ErrorDominio('VERSION_DESACTUALIZADA','La orden cambió.');
   continue;
  }
  if(cambio.agregado==='ordenes'&&cambio.tipo==='ACTUALIZAR_POR_RESULTADO'){
   if(!contexto.cuenta.roles.includes('VALIDADOR_LABORATORIO')||!contexto.cuenta.permisos.includes('resultados.validar'))throw new ErrorDominio('SIN_PERMISO','No puede completar ítems por resultado.');
   const anterior=ordenes.get(cambio.recursoId),orden=cambio.nuevoEstado as OrdenLaboratorio;
   const validado=cambiosResultado.some(v=>{const r=v.nuevoEstado as ResultadoLaboratorio;return r.ordenId===orden.id&&r.estado==='VALIDADO';});
   if(!anterior||!validado||cambio.versionAnterior!==anterior.version||orden.version!==anterior.version+1||orden.id!==anterior.id)throw new ErrorDominio('VERSION_DESACTUALIZADA','La orden cambió.');
   const doc=documentoOrdenLaboratorio(orden,orden.id);
   const r=await db.collection<import('./documento-orden.js').DocumentoOrdenLaboratorio>('ordenes').updateOne({_id:orden.id,revision:anterior.version},{$set:{revision:orden.version,estado:orden.estado,items:doc.items}},{session});
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
   validarTamanoDocumentoOrdenLaboratorio(doc);
   await db.collection<import('./documento-orden.js').DocumentoOrdenLaboratorio>('ordenes').insertOne(doc,{session});
  }else if(cambio.agregado==='muestras'&&cambio.tipo==='GUARDAR_MUESTRA'){
   if(!contexto.cuenta.permisos.includes('muestras.administrar'))throw new ErrorDominio('SIN_PERMISO','No puede administrar muestras.');
   const muestra=cambio.nuevoEstado as Muestra;const anterior=originales.get(cambio.recursoId)??null;
   if(muestra.id!==cambio.recursoId||(anterior?.version??null)!==cambio.versionAnterior||muestra.eventos.at(-1)?.actorId!==contexto.cuenta.id)throw new ErrorDominio('ESTADO_INVALIDO','Plan de muestra incompatible.');
   await guardarMuestraMongodb(db,session,anterior,muestra);
  }else throw new ErrorDominio('ESTADO_INVALIDO','Cambio de laboratorio no implementado.');
 }
}

function originalesResultado(resultados:ReadonlyMap<string,ResultadoLaboratorio>,id:string):ResultadoLaboratorio|null{return resultados.get(id)??null;}
