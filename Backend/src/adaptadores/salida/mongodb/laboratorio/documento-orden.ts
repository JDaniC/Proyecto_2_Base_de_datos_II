import {Long, type Document} from 'mongodb';
import type {OrdenLaboratorio} from '../../../../dominio/laboratorio/ordenes.js';
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
