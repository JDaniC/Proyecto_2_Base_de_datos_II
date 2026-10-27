import type {
  ConsultaHistorial,
  EventoAuditoria,
  FiltrosPagina,
  Pagina,
} from '../../../aplicacion/puertos/nucleo.js';
import { instanteUtc } from '../../../dominio/compartido/instante-utc.js';
import { uuidPublico, type UUID } from '../../../dominio/compartido/uuid.js';
import type { DialectoSql, EjecutorSql } from './tipos-sql.js';

interface FilaAuditoriaSql extends Record<string, unknown> {
  id_publico: string;
  actor_id: string;
  caso: string;
  recurso_id: string;
  fecha_hora: string;
  detalle: unknown;
}

export function crearConsultaHistorialSql(
  ejecutor: EjecutorSql,
  dialecto: DialectoSql,
): ConsultaHistorial<EventoAuditoria> {
  return {
    async eventos(pacienteId: UUID, pagina: FiltrosPagina): Promise<Pagina<EventoAuditoria>> {
      const limite = pagina.limite ?? 20;
      const orden = pagina.orden === 'DESC' ? 'DESC' : 'ASC';
      const operador = orden === 'ASC' ? '>' : '<';

      let cursorFecha: string | null = null;
      let cursorId: string | null = null;
      if (pagina.cursor) {
        try {
          const raw = Buffer.from(pagina.cursor, 'base64url').toString('utf8');
          const parsed = JSON.parse(raw) as { f: string; id: string };
          cursorFecha = parsed.f;
          cursorId = parsed.id;
        } catch { /* ignorar cursor malformado */ }
      }

      const p = dialecto === 'postgresql'
        ? (n: number) => `$${n}`
        : () => '?';

      const condiciones: string[] = [];
      const parametros: unknown[] = [];
      let idx = 1;

      condiciones.push(`a.registro_afectado = ${p(idx++)}`);
      parametros.push(pacienteId);

      if (cursorFecha && cursorId) {
        if (dialecto === 'postgresql') {
          condiciones.push(`(a.fecha_hora ${operador} $${idx}::timestamp OR (a.fecha_hora = $${idx}::timestamp AND a.id_publico ${operador} $${idx + 1}))`);
          parametros.push(cursorFecha, cursorId);
          idx += 2;
        } else {
          condiciones.push(`(a.fecha_hora ${operador} ? OR (a.fecha_hora = ? AND a.id_publico ${operador} ?))`);
          parametros.push(cursorFecha, cursorFecha, cursorId);
        }
      }

      const fechaCol = dialecto === 'postgresql'
        ? 'TO_CHAR(a.fecha_hora AT TIME ZONE \'UTC\', \'YYYY-MM-DD"T"HH24:MI:SS.US"Z"\') AS fecha_hora'
        : "DATE_FORMAT(a.fecha_hora, '%Y-%m-%dT%H:%i:%s.%fZ') AS fecha_hora";

      const sql = `
        SELECT
          a.id_publico,
          u.id_publico AS actor_id,
          a.accion AS caso,
          a.registro_afectado AS recurso_id,
          ${fechaCol},
          a.detalle
        FROM auditoria a
        JOIN usuario u ON a.id_usuario = u.id_usuario
        WHERE ${condiciones.join(' AND ')}
        ORDER BY a.fecha_hora ${orden}, a.id_publico ${orden}
        LIMIT ${p(idx++)}
      `;
      parametros.push(limite + 1);

      const resultado = await ejecutor.consultar<FilaAuditoriaSql>(sql, parametros);
      const haySiguiente = resultado.filas.length > limite;
      const filasRetorno = haySiguiente ? resultado.filas.slice(0, limite) : resultado.filas;

      const elementos: EventoAuditoria[] = filasRetorno.map((fila) => {
        let correlacion = uuidPublico(fila.id_publico);
        let motivo: string | undefined;
        try {
          const parsed = typeof fila.detalle === 'string'
            ? JSON.parse(fila.detalle) as Record<string, unknown>
            : (fila.detalle as Record<string, unknown> | null);
          if (typeof parsed?.correlacion === 'string') {
            correlacion = uuidPublico(parsed.correlacion);
          }
          if (typeof parsed?.motivo === 'string') {
            motivo = parsed.motivo;
          }
        } catch { /* detalle no es JSON */ }

        return Object.freeze({
          id: uuidPublico(fila.id_publico),
          actorId: uuidPublico(fila.actor_id),
          caso: fila.caso,
          recursoId: uuidPublico(fila.recurso_id),
          fechaHora: instanteUtc(
            typeof fila.fecha_hora === 'string'
              ? fila.fecha_hora
              : (fila.fecha_hora as Date).toISOString(),
          ),
          correlacion,
          ...(motivo ? { motivo } : {}),
        });
      });

      let siguienteCursor: string | undefined;
      if (haySiguiente && filasRetorno.length > 0) {
        const ultima = filasRetorno[filasRetorno.length - 1]!;
        siguienteCursor = Buffer.from(JSON.stringify({
          f: String(ultima.fecha_hora),
          id: String(ultima.id_publico),
        })).toString('base64url');
      }

      return Object.freeze({
        elementos: Object.freeze(elementos),
        ...(siguienteCursor ? { siguienteCursor } : {}),
      });
    },
  };
}
