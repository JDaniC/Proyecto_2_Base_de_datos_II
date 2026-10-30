import type { UUID } from '../../../../dominio/compartido/uuid.js';
import type { Pagina } from '../../../../aplicacion/puertos/nucleo.js';
import type { FiltrosCitas, PuertosClinicos } from '../../../../aplicacion/puertos/clinica.js';
import type { Cita } from '../../../../dominio/clinica/cita.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import type { EjecutorSql } from '../../sql/tipos-sql.js';
import { codificarCursorSql, decodificarCursorSql, escaparLikeSql } from '../../sql/cursor-paginacion-sql.js';
import { mapearCitaSql, type FilaCitaSql } from '../../sql/mapear-clinica-sql.js';

type PuertoCitas = PuertosClinicos['citas'];

const INSTITUCION = 'HOSPITAL_GENERAL';
const SELECT_CITA = `
  SELECT c.id_publico, c.revision, p.id_publico AS paciente_id, pm.id_publico AS profesional_id,
         TO_CHAR(c.fecha_hora_inicio, 'YYYY-MM-DD') AS fecha,
         TO_CHAR(c.fecha_hora_inicio, 'HH24:MI') AS hora_inicio,
         TO_CHAR(c.fecha_hora_fin, 'HH24:MI') AS hora_fin,
         c.duracion_minutos, c.motivo_solicitud AS motivo, c.consultorio,
         c.estado_cita AS estado, c.motivo_cancelacion,
         TO_CHAR(c.fecha_creacion, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS fecha_creacion,
         TO_CHAR(c.fecha_hora_inicio, 'YYYY-MM-DD HH24:MI:SS.US') AS orden_fecha,
         EXISTS(SELECT 1 FROM consulta x WHERE x.id_cita = c.id_cita AND x.estado = 'ABIERTA') AS consulta_abierta
    FROM cita c
    JOIN paciente p ON p.id_paciente = c.id_paciente
    JOIN personal_medico pm ON pm.id_personal = c.id_personal_programado
`;

const indisponible = (msg = 'No fue posible consultar la agenda.') =>
  new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', msg);

export class RepositorioCitasPostgresql implements PuertoCitas {
  constructor(private readonly ejecutor: EjecutorSql) {}

  async porId(id: UUID): Promise<Cita | null> {
    try {
      const resultado = await this.ejecutor.consultar<FilaCitaSql>(`${SELECT_CITA} WHERE c.id_publico = $1`, [id]);
      const fila = resultado.filas[0];
      return fila ? mapearCitaSql(fila) : null;
    } catch (error) {
      if (error instanceof ErrorDominio) throw error;
      throw indisponible();
    }
  }

  async listar(filtros: FiltrosCitas, pagina: Parameters<PuertosClinicos['citas']['listar']>[1], ambitoCursor = ''): Promise<Pagina<Cita>> {
    try {
      const condiciones: string[] = ['c.fecha_hora_inicio >= $1::date', 'c.fecha_hora_inicio < $2::date'];
      const parametros: unknown[] = [filtros.fecha_desde, filtros.fecha_hasta];
      let indice = 3;
      if (filtros.profesional_id) {
        condiciones.push(`pm.id_publico = $${indice}`);
        parametros.push(filtros.profesional_id);
        indice += 1;
      }
      const abierta = `EXISTS(SELECT 1 FROM consulta x WHERE x.id_cita = c.id_cita AND x.estado = 'ABIERTA')`;
      if (filtros.estado === 'EN_CURSO') {
        condiciones.push(abierta);
      } else if (filtros.estado) {
        condiciones.push(`c.estado_cita = $${indice} AND NOT ${abierta}`);
        parametros.push(filtros.estado);
        indice += 1;
      }
      if (filtros.q) {
        const q = `%${escaparLikeSql(filtros.q.toLocaleLowerCase())}%`;
        condiciones.push(`(LOWER(CONCAT_WS(' ', p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido)) LIKE $${indice} ESCAPE '\\' OR LOWER(c.motivo_solicitud) LIKE $${indice + 1} ESCAPE '\\')`);
        parametros.push(q, q);
        indice += 2;
      }
      if (pagina.cursor) {
        const cursor = decodificarCursorSql(pagina.cursor, INSTITUCION, JSON.stringify([ambitoCursor, this.huellaFiltros(filtros)]), pagina.orden, undefined, 'citas');
        const operador = pagina.orden === 'ASC' ? '>' : '<';
        condiciones.push(`(c.fecha_hora_inicio ${operador} $${indice}::timestamp OR (c.fecha_hora_inicio = $${indice}::timestamp AND c.id_publico ${operador} $${indice + 1}))`);
        parametros.push(cursor.fecha, cursor.id);
        indice += 2;
      }
      const sql = `${SELECT_CITA} WHERE ${condiciones.join(' AND ')} ORDER BY c.fecha_hora_inicio ${pagina.orden}, c.id_publico ${pagina.orden} LIMIT $${indice}`;
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
      await this.ejecutor.consultar('SELECT id_publico FROM personal_medico WHERE id_publico = $1 FOR UPDATE', [profesional]);
      const resultado = await this.ejecutor.consultar<FilaCitaSql>(
        `${SELECT_CITA} WHERE pm.id_publico = $1 AND c.fecha_hora_inicio < $2::timestamp AND COALESCE(c.fecha_hora_fin, date_trunc('day', c.fecha_hora_inicio) + interval '1 day') > $3::timestamp ORDER BY c.fecha_hora_inicio`,
        [profesional, `${fecha} ${fin}`, `${fecha} ${inicio}`],
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
