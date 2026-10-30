import type { UUID } from '../../../../dominio/compartido/uuid.js';
import type { FiltrosPagina, Pagina } from '../../../../aplicacion/puertos/nucleo.js';
import type { FiltrosCitas, PuertosClinicos } from '../../../../aplicacion/puertos/clinica.js';
import type { Cita } from '../../../../dominio/clinica/cita.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import type { EjecutorSql } from '../../sql/tipos-sql.js';
import { codificarCursorSql, decodificarCursorSql, escaparLikeSql } from '../../sql/cursor-paginacion-sql.js';
import { mapearCitaSql, type FilaCitaSql } from '../../sql/mapear-clinica-sql.js';

type PuertoCitas = PuertosClinicos['citas'];

const INSTITUCION = 'CLINICA_ODONTOLOGICA';
const SELECT_CITA = `
  SELECT c.id_publico, c.revision, p.id_publico AS paciente_id, o.id_publico AS profesional_id,
         DATE_FORMAT(c.fecha_hora, '%Y-%m-%d') AS fecha,
         DATE_FORMAT(c.fecha_hora, '%H:%i') AS hora_inicio,
         TIME_FORMAT(c.hora_fin, '%H:%i') AS hora_fin,
         c.duracion_minutos, c.motivo, c.consultorio, c.estado, c.motivo_cancelacion,
         DATE_FORMAT(c.fecha_creacion, '%Y-%m-%dT%H:%i:%s.%fZ') AS fecha_creacion,
         DATE_FORMAT(c.fecha_hora, '%Y-%m-%d %H:%i:%s.%f') AS orden_fecha,
         EXISTS(SELECT 1 FROM consulta_odontologica x WHERE x.id_cita = c.id_cita AND x.estado = 'ABIERTA') AS consulta_abierta
    FROM cita c
    JOIN paciente p ON p.id_paciente = c.id_paciente
    JOIN odontologo o ON o.id_odontologo = c.id_odontologo
`;

const indisponible = () => new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible consultar la agenda.');

export class RepositorioCitasMysql implements PuertoCitas {
  constructor(private readonly ejecutor: EjecutorSql) {}

  async porId(id: UUID): Promise<Cita | null> {
    try {
      const resultado = await this.ejecutor.consultar<FilaCitaSql>(`${SELECT_CITA} WHERE c.id_publico = ?`, [id]);
      const fila = resultado.filas[0];
      return fila ? mapearCitaSql(fila) : null;
    } catch (error) {
      if (error instanceof ErrorDominio) throw error;
      throw indisponible();
    }
  }

  async listar(filtros: FiltrosCitas, pagina: FiltrosPagina, ambitoCursor = ''): Promise<Pagina<Cita>> {
    try {
      const condiciones: string[] = ['c.fecha_hora >= ?', 'c.fecha_hora < ?'];
      const parametros: unknown[] = [`${filtros.fecha_desde} 00:00:00`, `${filtros.fecha_hasta} 00:00:00`];
      if (filtros.profesional_id) {
        condiciones.push('o.id_publico = ?');
        parametros.push(filtros.profesional_id);
      }
      const abierta = "EXISTS(SELECT 1 FROM consulta_odontologica x WHERE x.id_cita = c.id_cita AND x.estado = 'ABIERTA')";
      if (filtros.estado === 'EN_CURSO') {
        condiciones.push(abierta);
      } else if (filtros.estado) {
        condiciones.push(`c.estado = ? AND NOT ${abierta}`);
        parametros.push(filtros.estado);
      }
      if (filtros.q) {
        const q = `%${escaparLikeSql(filtros.q.toLocaleLowerCase())}%`;
        condiciones.push(`(LOWER(CONCAT_WS(' ', p.nombres, p.apellidos)) LIKE ? ESCAPE '\\\\' OR LOWER(c.motivo) LIKE ? ESCAPE '\\\\')`);
        parametros.push(q, q);
      }
      if (pagina.cursor) {
        const cursor = decodificarCursorSql(pagina.cursor, INSTITUCION, JSON.stringify([ambitoCursor, this.huellaFiltros(filtros)]), pagina.orden, undefined, 'citas');
        const operador = pagina.orden === 'ASC' ? '>' : '<';
        condiciones.push(`(c.fecha_hora ${operador} ? OR (c.fecha_hora = ? AND c.id_publico ${operador} ?))`);
        parametros.push(cursor.fecha, cursor.fecha, cursor.id);
      }
      const sql = `${SELECT_CITA} WHERE ${condiciones.join(' AND ')} ORDER BY c.fecha_hora ${pagina.orden}, c.id_publico ${pagina.orden} LIMIT ?`;
      parametros.push(pagina.limite + 1);
      const resultado = await this.ejecutor.consultar<FilaCitaSql & { orden_fecha: string }>(sql, parametros);
      const haySiguiente = resultado.filas.length > pagina.limite;
      const filas = haySiguiente ? resultado.filas.slice(0, pagina.limite) : resultado.filas;
      const elementos = filas.map(mapearCitaSql);
      const ultima = filas[filas.length - 1];
      return Object.freeze({
        elementos: Object.freeze(elementos),
        ...(haySiguiente && ultima ? {
          siguienteCursor: codificarCursorSql({
            v: 1, recurso: 'citas', institucion: INSTITUCION, q: JSON.stringify([ambitoCursor, this.huellaFiltros(filtros)]),
            orden: pagina.orden, f: String(ultima.orden_fecha), id: String(ultima.id_publico),
          }),
        } : {}),
      });
    } catch (error) {
      if (error instanceof ErrorDominio) throw error;
      throw indisponible();
    }
  }

  async solapamientos(profesional: UUID, fecha: string, inicio: string, fin: string): Promise<readonly Cita[]> {
    try {
      const resultado = await this.ejecutor.consultar<FilaCitaSql>(
        `${SELECT_CITA} WHERE o.id_publico = ? AND DATE(c.fecha_hora) = ? AND TIME(c.fecha_hora) < ?
           AND COALESCE(c.hora_fin, '23:59:59') > ? ORDER BY c.fecha_hora`,
        [profesional, fecha, `${fin}:00`, `${inicio}:00`],
      );
      return Object.freeze(resultado.filas.map(mapearCitaSql));
    } catch (error) {
      if (error instanceof ErrorDominio) throw error;
      throw indisponible();
    }
  }

  private huellaFiltros(filtros: FiltrosCitas): string {
    return [filtros.fecha_desde, filtros.fecha_hasta, filtros.profesional_id ?? '',
      filtros.estado ?? '', filtros.q ?? ''].join('|');
  }
}
