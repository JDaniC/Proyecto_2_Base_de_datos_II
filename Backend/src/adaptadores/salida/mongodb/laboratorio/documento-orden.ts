import {BSON,Long, type Document} from 'mongodb';
import {crearOrdenLaboratorio, type OrdenLaboratorio} from '../../../../dominio/laboratorio/ordenes.js';
import {ErrorDominio} from '../../../../dominio/compartido/error-dominio.js';
import {dinero} from '../../../../dominio/compartido/dinero.js';
import {uuidPublico} from '../../../../dominio/compartido/uuid.js';
import {versionPositiva} from '../../../../dominio/compartido/version.js';

export interface DocumentoOrdenLaboratorio extends Document {
  _id: string;
  revision: number;
  numero_orden: string;
  paciente_id: string;
  solicitante_id: string;
  registrado_por_id: string;
  fecha_orden: Date;
  prioridad: OrdenLaboratorio['prioridad'];
  estado: OrdenLaboratorio['estado'];
  moneda: 'GTQ';
  items: Document[];
}
/** Cada item conserva la prueba exacta, sin consultar el catálogo durante lectura histórica. */
export function documentoOrdenLaboratorio(orden: OrdenLaboratorio, numeroOrden: string): DocumentoOrdenLaboratorio {
  const doc: DocumentoOrdenLaboratorio={
    _id:uuidPublico(orden.id),revision:versionPositiva(orden.version),numero_orden:numeroOrden,
    paciente_id:uuidPublico(orden.pacienteId),solicitante_id:uuidPublico(orden.solicitanteId),registrado_por_id:uuidPublico(orden.registradoPorId),
    fecha_orden:new Date(orden.instante),prioridad:orden.prioridad,estado:orden.estado,moneda:'GTQ',
    items:orden.items.map(item=>({item_id:uuidPublico(item.id),prueba_id:uuidPublico(item.prueba.id),prioridad:orden.prioridad,estado:item.estado,
      precio_acordado:Long.fromNumber(dinero(item.precio.centavos,item.precio.moneda).centavos),
      prueba_historica:{codigo:item.prueba.codigo,nombre:item.prueba.nombre,version:item.prueba.version,metodo_id:item.prueba.metodoId,
        tipo_muestra_ids:[...item.prueba.tiposMuestraIds],parametros:item.prueba.parametros.map(p=>({parametro_id:p.id,codigo:p.codigo,nombre:p.nombre,
          tipo_valor:p.tipo,obligatorio:p.obligatorio,...(p.unidad===undefined?{}:{unidad_sugerida:p.unidad}),...(p.opciones===undefined?{}:{opciones_permitidas:[...p.opciones]})}))}})),
  };
  if(orden.indicaciones.trim()) doc.indicaciones=orden.indicaciones;
  return doc;
}

/** Impide que el snapshot histórico supere el límite físico declarado para órdenes. */
export function validarTamanoDocumentoOrdenLaboratorio(doc: DocumentoOrdenLaboratorio): void {
  if(BSON.calculateObjectSize(doc)>262144) throw new ErrorDominio('LIMITE_AGREGADO','La orden excede el límite de tamaño.');
}

function enteroSeguro(valor: unknown): number {
  if (Long.isLong(valor)) {
    const n=valor.toBigInt();
    if(n<0n||n>BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('ENTERO_FUERA_DE_RANGO');
    return Number(n);
  }
  if(typeof valor!=='number'||!Number.isSafeInteger(valor)||valor<0) throw new Error('ENTERO_INVALIDO');
  return valor;
}

/** No consulta ni mezcla catálogo vigente con una emisión histórica. */
export function mapearOrdenLaboratorio(doc: DocumentoOrdenLaboratorio): OrdenLaboratorio {
  try {
    if(doc.moneda!=='GTQ'||!['CREADA','EN_PROCESO','COMPLETADA','CANCELADA'].includes(doc.estado)) throw new Error('ORDEN_INCOMPATIBLE');
    const seleccion=doc.items.map(item=>{
      const p=item.prueba_historica as Document;
      if(!p) throw new Error('SNAPSHOT_AUSENTE');
      return {id:item.item_id,centavos:enteroSeguro(item.precio_acordado),prueba:{id:item.prueba_id,codigo:p.codigo,nombre:p.nombre,
        version:enteroSeguro(p.version),activo:true,metodoId:p.metodo_id,tiposMuestraIds:p.tipo_muestra_ids,
        parametros:(p.parametros as Document[]).map(v=>({id:v.parametro_id,codigo:v.codigo,nombre:v.nombre,tipo:v.tipo_valor,obligatorio:v.obligatorio,
          ...(v.unidad_sugerida===undefined?{}:{unidad:v.unidad_sugerida}),...(v.opciones_permitidas===undefined?{}:{opciones:v.opciones_permitidas})}))}};
    });
    const base=crearOrdenLaboratorio({id:doc._id,pacienteId:doc.paciente_id,solicitanteId:doc.solicitante_id,registradoPorId:doc.registrado_por_id,
      instante:doc.fecha_orden.toISOString(),prioridad:doc.prioridad,indicaciones:doc.indicaciones??''},seleccion);
    const items=base.items.map((item,i)=>{
      const estado=doc.items[i]!.estado;
      if(!['SOLICITADO','EN_PROCESO','COMPLETADO','CANCELADO'].includes(estado)) throw new Error('ESTADO_ITEM_INVALIDO');
      return Object.freeze({...item,estado}) as typeof item;
    });
    return Object.freeze({...base,version:versionPositiva(enteroSeguro(doc.revision)),estado:doc.estado,items:Object.freeze(items)});
  } catch {
    throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','La orden requiere conciliación de su snapshot histórico.');
  }
}
