import { createHash } from 'node:crypto';
import type { ClientSession, Db, Filter } from 'mongodb';
import type { CriteriosBusquedaPacientes, RepositorioPacienteLectura } from '../../../../aplicacion/puertos/repositorio-paciente.js';
import type { Paciente } from '../../../../dominio/clinica/paciente.js';
import type { UUID } from '../../../../dominio/compartido/uuid.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { normalizarTextoBusqueda } from '../../../../dominio/compartido/normalizacion.js';
import { ErrorDominio, solicitudInvalida } from '../../../../dominio/compartido/error-dominio.js';
import { mapearPacienteMongodb, type DocumentoPacienteMongo } from './mapear-paciente-mongodb.js';

export const PROYECCION_PACIENTE_MONGO = {
  _id: 1, revision: 1, codigo_paciente: 1, primer_nombre: 1, segundo_nombre: 1, primer_apellido: 1, segundo_apellido: 1,
  nombre_busqueda: 1, claves_nombre: 1, numero_busqueda: 1, tipo_documento: 1, numero_documento: 1,
  fecha_nacimiento: 1, sexo_referencia: 1, direccion: 1, contactos: 1, fecha_registro: 1, activo: 1, historial: 1,
} as const;
const scope = (c: CriteriosBusquedaPacientes) => createHash('sha256').update(JSON.stringify(['LABORATORIO_CLINICO', c.q, c.orden, c.estado ?? 'TODOS'])).digest('hex');
const indisponible = () => new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible consultar los pacientes.');

export function crearRepositorioPacientesMongodb(
  db: Db, session?: ClientSession, originales?: Map<string, DocumentoPacienteMongo>,
): RepositorioPacienteLectura {
  const options = {...(session ? {session} : {}), projection: PROYECCION_PACIENTE_MONGO, maxTimeMS: 3000};
  return Object.freeze({
    async porId(id: UUID): Promise<Paciente | null> {
      try {
        const doc = await db.collection<DocumentoPacienteMongo>('pacientes').findOne({_id: id}, options);
        if (doc) originales?.set(id, doc);
        return doc ? mapearPacienteMongodb(doc) : null;
      } catch (error) { if (error instanceof ErrorDominio) throw error; throw indisponible(); }
    },
    async buscar(c: CriteriosBusquedaPacientes) {
      if (typeof c.q !== 'string' || !c.q.trim() || [...c.q].length > 120 || !Number.isInteger(c.limite) || c.limite < 1 || c.limite > 100 ||
          !['ASC', 'DESC'].includes(c.orden) || (c.estado !== undefined && !['ACTIVO', 'ARCHIVADO', 'TODOS'].includes(c.estado))) throw solicitudInvalida('Los parámetros de búsqueda no son válidos.');
      const q = normalizarTextoBusqueda(c.q);
      if (!q) throw solicitudInvalida('El término de búsqueda no contiene caracteres válidos.', 'q');
      const numero = c.q.normalize('NFC').trim().replace(/[\s-]+/gu, '').toUpperCase();
      const filtro: Filter<DocumentoPacienteMongo> = {$or: [
        {claves_nombre: {$regex: `^${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`}},
        {numero_busqueda: numero},
      ]};
      if (c.estado && c.estado !== 'TODOS') filtro.activo = c.estado === 'ACTIVO';
      if (c.cursor !== undefined) {
        try {
          if (c.cursor.length > 2048 || !/^[\w-]+$/.test(c.cursor)) throw new Error();
          const data = JSON.parse(Buffer.from(c.cursor, 'base64url').toString('utf8')) as {v: number; scope: string; fecha: string; id: string};
          if (Object.keys(data).sort().join(',') !== 'fecha,id,scope,v' || data.v !== 1 || data.scope !== scope(c) ||
              new Date(data.fecha).toISOString() !== data.fecha || uuidPublico(data.id) !== data.id) throw new Error();
          const comparador = c.orden === 'ASC' ? '$gt' : '$lt';
          filtro.$and = [{$or: [
            {fecha_registro: {[comparador]: new Date(data.fecha)}},
            {fecha_registro: new Date(data.fecha), _id: {[comparador]: data.id}},
          ]}];
        } catch { throw solicitudInvalida('El cursor no corresponde a esta búsqueda.', 'cursor'); }
      }
      try {
        const direction = c.orden === 'ASC' ? 1 : -1;
        const docs = await db.collection<DocumentoPacienteMongo>('pacientes').find(filtro, options)
          .sort({fecha_registro: direction, _id: direction}).limit(c.limite + 1).toArray();
        const pagina = docs.slice(0, c.limite);
        const ultimo = pagina.at(-1);
        return Object.freeze({elementos: Object.freeze(pagina.map(mapearPacienteMongodb)),
          ...(docs.length > c.limite && ultimo ? {siguienteCursor: Buffer.from(JSON.stringify({v: 1, scope: scope(c), fecha: ultimo.fecha_registro.toISOString(), id: ultimo._id})).toString('base64url')} : {}),
        });
      } catch (error) { if (error instanceof ErrorDominio) throw error; throw indisponible(); }
    },
  });
}
