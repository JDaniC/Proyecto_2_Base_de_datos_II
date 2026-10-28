import type { Db, Filter } from 'mongodb';
import { tiposInstitucion, type RepositorioHistorialLectura } from '../../../aplicacion/puertos/historial.js';
import { leerProyeccion, verificarManifiestoHistorial } from './proyeccion-historial.js';
export function crearHistorialMongodb(db: Db): RepositorioHistorialLectura {
  return {
    async verificarPreparacion() {
      verificarManifiestoHistorial(await db.collection('historial_modelo').findOne({ id: 1 }, { projection: { version: 1, estado: 1 }, maxTimeMS: 3000 }));
      const indices = await db.collection('historial_eventos').listIndexes().toArray();
      if (!indices.some((i) => JSON.stringify(i.key) === JSON.stringify({ paciente_id: 1, tipo: 1, fecha_hora: 1, _id: 1 }))) throw new Error('INDICE_HISTORIAL_FALTANTE');
    },
    fuentes: tiposInstitucion('LABORATORIO_CLINICO').map((tipo) => ({ tipo, fuente: {
      async leer({ pacienteId, desde, hasta, despues, orden, cantidad }) {
        const filtro: Filter<{ _id: string; paciente_id: string; tipo: string; fecha_hora: string; contenido: unknown }> = { paciente_id: pacienteId, tipo };
        if (desde !== undefined || hasta !== undefined) filtro.fecha_hora = { ...(desde === undefined ? {} : { $gte: desde }), ...(hasta === undefined ? {} : { $lt: hasta }) };
        if (despues) filtro.$or = orden === 'ASC'
          ? [{ fecha_hora: { $gt: despues.fechaHora } }, { fecha_hora: despues.fechaHora, _id: { $gt: despues.id } }]
          : [{ fecha_hora: { $lt: despues.fechaHora } }, { fecha_hora: despues.fechaHora, _id: { $lt: despues.id } }];
        const dir = orden === 'DESC' ? -1 : 1;
        const filas = await db.collection<{ _id: string; paciente_id: string; tipo: string; fecha_hora: string; contenido: unknown }>('historial_eventos')
          .find(filtro, { projection: { contenido: 1, tipo: 1, fecha_hora: 1 }, maxTimeMS: 3000 }).sort({ fecha_hora: dir, _id: dir }).limit(cantidad).toArray();
        return filas.map((f) => leerProyeccion(f.contenido, 'LABORATORIO_CLINICO', { id: f._id, tipo: f.tipo, fecha_hora: f.fecha_hora }));
      },
    } })),
  };
}
