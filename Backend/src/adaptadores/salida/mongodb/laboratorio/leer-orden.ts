import type {Db, ClientSession} from 'mongodb';
import type {UUID} from '../../../../dominio/compartido/uuid.js';
import {uuidPublico} from '../../../../dominio/compartido/uuid.js';
import type {OrdenLaboratorio} from '../../../../dominio/laboratorio/ordenes.js';
import {mapearOrdenLaboratorio, type DocumentoOrdenLaboratorio} from './documento-orden.js';

/** Uso interno del lector transaccional; no constituye endpoint ni autorización. */
export function crearLectorOrdenMongodb(db: Db, session: ClientSession): {
  porId(id: UUID): Promise<OrdenLaboratorio | null>;
} {
  return {
    async porId(id) {
      const doc=await db.collection<DocumentoOrdenLaboratorio>('ordenes').findOne({_id:uuidPublico(id)},{session});
      return doc===null?null:mapearOrdenLaboratorio(doc);
    },
  };
}
