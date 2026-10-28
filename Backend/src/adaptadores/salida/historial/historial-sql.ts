import type { Institucion } from '../../../dominio/compartido/institucion.js';
import { tiposInstitucion, type RepositorioHistorialLectura } from '../../../aplicacion/puertos/historial.js';
import { placeholder, type DialectoSql, type EjecutorSql } from '../sql/tipos-sql.js';
import { leerProyeccion, verificarManifiestoHistorial } from './proyeccion-historial.js';

export function crearHistorialSql(ejecutor: EjecutorSql, dialecto: DialectoSql): RepositorioHistorialLectura {
  const institucion: Institucion = dialecto === 'postgresql' ? 'HOSPITAL_GENERAL' : 'CLINICA_ODONTOLOGICA';
  const esquema = dialecto === 'postgresql' ? 'hospital_historial' : 'clinica_historial';
  return {
    async verificarPreparacion() {
      const r = await ejecutor.consultar(`SELECT version, estado FROM ${esquema}.modelo WHERE id = 1`);
      verificarManifiestoHistorial(r.filas[0]);
    },
    fuentes: tiposInstitucion(institucion).map((tipo) => ({ tipo, fuente: {
      async leer({ pacienteId, desde, hasta, despues, orden, cantidad }) {
        const valores: unknown[] = [];
        const param = (valor: unknown) => { valores.push(valor); return placeholder(dialecto, valores.length); };
        const condiciones = [`paciente_id = ${param(pacienteId)}`, `tipo = ${param(tipo)}`];
        if (desde !== undefined) condiciones.push(`fecha_hora >= ${param(desde)}`);
        if (hasta !== undefined) condiciones.push(`fecha_hora < ${param(hasta)}`);
        if (despues) {
          const op = orden === 'ASC' ? '>' : '<';
          condiciones.push(`(fecha_hora ${op} ${param(despues.fechaHora)} OR (fecha_hora = ${param(despues.fechaHora)} AND id ${op} ${param(despues.id)}))`);
        }
        const r = await ejecutor.consultar(`SELECT id,tipo,fecha_hora,contenido FROM ${esquema}.eventos WHERE ${condiciones.join(' AND ')} ORDER BY fecha_hora ${orden === 'DESC' ? 'DESC' : 'ASC'}, id ${orden === 'DESC' ? 'DESC' : 'ASC'} LIMIT ${param(cantidad)}`, valores);
        return r.filas.map((f) => leerProyeccion(f.contenido, institucion, { id: f.id, tipo: f.tipo, fecha_hora: f.fecha_hora }));
      },
    } })),
  };
}
