import { BSON, type Document } from 'mongodb';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import { instanteUtc } from '../../../../dominio/compartido/instante-utc.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../../dominio/compartido/version.js';
import type { ComponenteResultado, ResultadoLaboratorio } from '../../../../dominio/laboratorio/resultados/resultado.js';

export interface DocumentoResultadoLaboratorio extends Document {
  _id: string;
  revision: number;
  serie_resultado_id: string;
  version: number;
  orden_id: string;
  item_id: string;
  prueba_id: string;
  paciente_id: string;
  procedencia_muestras: Document[];
  analista_id: string;
  fecha_analisis: Date;
  estado: ResultadoLaboratorio['estado'];
  componentes: Document[];
}

export function documentoResultadoLaboratorio(resultado: ResultadoLaboratorio): DocumentoResultadoLaboratorio {
  const doc:DocumentoResultadoLaboratorio={_id:uuidPublico(resultado.id),revision:versionPositiva(resultado.revision),serie_resultado_id:uuidPublico(resultado.serieId),
    version:versionPositiva(resultado.version),orden_id:uuidPublico(resultado.ordenId),item_id:uuidPublico(resultado.itemId),prueba_id:uuidPublico(resultado.pruebaId),
    paciente_id:uuidPublico(resultado.pacienteId),procedencia_muestras:resultado.procedencia.map(v=>({muestra_id:uuidPublico(v.muestraId),codigo_barras_historico:v.codigo,
      tipo_muestra_id:uuidPublico(v.tipoMuestraId),tipo_muestra_nombre_historico:v.tipoMuestraNombre,fecha_toma:new Date(instanteUtc(v.fechaToma)),fecha_recepcion:new Date(instanteUtc(v.fechaRecepcion)),fecha_aceptacion:new Date(instanteUtc(v.fechaAceptacion))})),
    analista_id:uuidPublico(resultado.analistaId),fecha_analisis:new Date(instanteUtc(resultado.fechaAnalisis)),estado:resultado.estado,
    componentes:resultado.componentes.map(v=>({parametro_id:uuidPublico(v.parametroId),...(v.valorNumerico===undefined?{}:{valor_numerico:v.valorNumerico}),
      ...(v.valorTexto===undefined?{}:{valor_texto:v.valorTexto}),...(v.unidadAplicada===undefined?{}:{unidad_aplicada:v.unidadAplicada}),
      ...(v.referenciaInferior===undefined?{}:{referencia_inferior:v.referenciaInferior}),...(v.referenciaSuperior===undefined?{}:{referencia_superior:v.referenciaSuperior}),
      ...(v.referenciaTexto===undefined?{}:{referencia_texto:v.referenciaTexto}),indicador_anormal:v.indicador,...(v.observaciones===undefined?{}:{observaciones:v.observaciones})}))};
  if(resultado.equipoId!==undefined)doc.equipo_id=uuidPublico(resultado.equipoId);
  if(resultado.observaciones!==undefined)doc.observaciones=resultado.observaciones;
  if(resultado.validadorId!==undefined)doc.validador_id=uuidPublico(resultado.validadorId);
  if(resultado.fechaValidacion!==undefined)doc.fecha_validacion=new Date(instanteUtc(resultado.fechaValidacion));
  if(resultado.resultadoAnteriorId!==undefined)doc.resultado_anterior_id=uuidPublico(resultado.resultadoAnteriorId);
  if(resultado.motivoCorreccion!==undefined)doc.motivo_correccion=resultado.motivoCorreccion;
  if(resultado.resultadoRepetidoDeId!==undefined)doc.resultado_repetido_de_id=uuidPublico(resultado.resultadoRepetidoDeId);
  validarTamanoDocumentoResultado(doc);
  return doc;
}

export function validarTamanoDocumentoResultado(doc: DocumentoResultadoLaboratorio):void {
  if(BSON.calculateObjectSize(doc)>262144)throw new ErrorDominio('LIMITE_AGREGADO','El resultado excede el límite de tamaño.');
}

function texto(valor:unknown,limite:number):string{
  if(typeof valor!=='string'||!valor.trim()||valor.length>limite)throw new Error('TEXTO_INVALIDO');
  return valor;
}
function numero(valor:unknown):number{
  if(typeof valor!=='number'||!Number.isFinite(valor))throw new Error('NUMERO_INVALIDO');
  return valor;
}
function componente(doc:Document):ComponenteResultado{
  const tieneNumero=doc.valor_numerico!==undefined,tieneTexto=doc.valor_texto!==undefined;
  if(tieneNumero===tieneTexto||!['NORMAL','BAJO','ALTO','CRITICO','NO_APLICA'].includes(doc.indicador_anormal))throw new Error('COMPONENTE_INVALIDO');
  const inferior=doc.referencia_inferior===undefined?undefined:numero(doc.referencia_inferior),superior=doc.referencia_superior===undefined?undefined:numero(doc.referencia_superior);
  if(inferior!==undefined&&superior!==undefined&&inferior>superior)throw new Error('REFERENCIA_INVALIDA');
  return Object.freeze({parametroId:uuidPublico(doc.parametro_id),...(tieneNumero?{valorNumerico:numero(doc.valor_numerico)}:{valorTexto:texto(doc.valor_texto,2000)}),
    ...(doc.unidad_aplicada===undefined?{}:{unidadAplicada:texto(doc.unidad_aplicada,60)}),...(inferior===undefined?{}:{referenciaInferior:inferior}),
    ...(superior===undefined?{}:{referenciaSuperior:superior}),...(doc.referencia_texto===undefined?{}:{referenciaTexto:texto(doc.referencia_texto,500)}),
    indicador:doc.indicador_anormal,...(doc.observaciones===undefined?{}:{observaciones:texto(doc.observaciones,2000)})});
}

/** No consulta catálogo vigente: reconstruye únicamente la historia almacenada. */
export function mapearResultadoLaboratorio(doc:DocumentoResultadoLaboratorio):ResultadoLaboratorio{
 try{
  if(!['BORRADOR','VALIDADO'].includes(doc.estado)||!Array.isArray(doc.componentes)||!doc.componentes.length||!Array.isArray(doc.procedencia_muestras)||!doc.procedencia_muestras.length)throw new Error('RESULTADO_INVALIDO');
  const componentes=doc.componentes.map(componente);if(new Set(componentes.map(v=>v.parametroId)).size!==componentes.length)throw new Error('COMPONENTES_DUPLICADOS');
  const procedencia=doc.procedencia_muestras.map(v=>Object.freeze({muestraId:uuidPublico(v.muestra_id),codigo:texto(v.codigo_barras_historico,80),tipoMuestraId:uuidPublico(v.tipo_muestra_id),tipoMuestraNombre:texto(v.tipo_muestra_nombre_historico,200),
    fechaToma:instanteUtc(v.fecha_toma.toISOString()),fechaRecepcion:instanteUtc(v.fecha_recepcion.toISOString()),fechaAceptacion:instanteUtc(v.fecha_aceptacion.toISOString())}));
  if(new Set(procedencia.map(v=>v.muestraId)).size!==procedencia.length)throw new Error('MUESTRAS_DUPLICADAS');
  const fechaAnalisis=instanteUtc(doc.fecha_analisis.toISOString()),fechaValidacion=doc.fecha_validacion===undefined?undefined:instanteUtc(doc.fecha_validacion.toISOString());
  if(doc.estado==='VALIDADO'&&(!doc.validador_id||!fechaValidacion))throw new Error('VALIDACION_INCOMPLETA');
  if(doc.estado==='BORRADOR'&&(doc.validador_id!==undefined||fechaValidacion!==undefined))throw new Error('BORRADOR_VALIDADO');
  if(fechaValidacion&&Date.parse(fechaValidacion)<Date.parse(fechaAnalisis))throw new Error('CRONOLOGIA_INVALIDA');
  const version=versionPositiva(doc.version);if(version>1&&(!doc.resultado_anterior_id||!doc.motivo_correccion))throw new Error('CORRECCION_INCOMPLETA');
  const resultado:ResultadoLaboratorio={id:uuidPublico(doc._id),revision:versionPositiva(doc.revision),serieId:uuidPublico(doc.serie_resultado_id),version,
   ordenId:uuidPublico(doc.orden_id),itemId:uuidPublico(doc.item_id),pruebaId:uuidPublico(doc.prueba_id),pacienteId:uuidPublico(doc.paciente_id),
   procedencia:Object.freeze(procedencia),analistaId:uuidPublico(doc.analista_id),fechaAnalisis,estado:doc.estado,componentes:Object.freeze(componentes),
   ...(doc.equipo_id===undefined?{}:{equipoId:uuidPublico(doc.equipo_id)}),...(doc.observaciones===undefined?{}:{observaciones:texto(doc.observaciones,4000)}),
   ...(doc.validador_id===undefined?{}:{validadorId:uuidPublico(doc.validador_id)}),...(fechaValidacion===undefined?{}:{fechaValidacion}),
   ...(doc.resultado_anterior_id===undefined?{}:{resultadoAnteriorId:uuidPublico(doc.resultado_anterior_id)}),
   ...(doc.motivo_correccion===undefined?{}:{motivoCorreccion:texto(doc.motivo_correccion,2000)}),
   ...(doc.resultado_repetido_de_id===undefined?{}:{resultadoRepetidoDeId:uuidPublico(doc.resultado_repetido_de_id)})};
  documentoResultadoLaboratorio(resultado);return Object.freeze(resultado);
 }catch{throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','El resultado requiere conciliación de su historia analítica.');}
}
