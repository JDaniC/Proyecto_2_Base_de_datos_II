import type { Firestore, Query } from 'firebase-admin/firestore';
import { tiposInstitucion, type RepositorioHistorialLectura } from '../../../aplicacion/puertos/historial.js';
import { leerProyeccion, verificarManifiestoHistorial } from './proyeccion-historial.js';
export function crearHistorialFirestore(db: Firestore): RepositorioHistorialLectura {
  return {
    async verificarPreparacion() { verificarManifiestoHistorial((await db.doc('historial_configuracion/modelo').get()).data()); },
    fuentes: tiposInstitucion('CENTRO_MEDICO_PEDIATRICO').map((tipo) => ({ tipo, fuente: {
      async leer({ pacienteId, desde, hasta, despues, orden, cantidad }) {
        let q: Query = db.collection('historial_eventos').where('paciente_id', '==', pacienteId).where('tipo', '==', tipo);
        if (desde !== undefined) q = q.where('fecha_hora', '>=', desde);
        if (hasta !== undefined) q = q.where('fecha_hora', '<', hasta);
        const dir = orden === 'DESC' ? 'desc' : 'asc';
        q = q.orderBy('fecha_hora', dir).orderBy('id', dir);
        if (despues) q = q.startAfter(despues.fechaHora, despues.id);
        const pagina = await q.limit(cantidad).select('contenido','id','tipo','fecha_hora').get();
        return pagina.docs.map((d) => leerProyeccion(d.get('contenido'), 'CENTRO_MEDICO_PEDIATRICO', { id: d.id, tipo: d.get('tipo'), fecha_hora: d.get('fecha_hora') }));
      },
    } })),
  };
}
