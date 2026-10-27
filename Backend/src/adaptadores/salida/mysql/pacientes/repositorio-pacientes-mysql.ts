import { createHash } from 'node:crypto';
import type { UUID } from '../../../../dominio/compartido/uuid.js';
import type { Version } from '../../../../dominio/compartido/version.js';
import type { Pagina } from '../../../../aplicacion/puertos/nucleo.js';
import type {
  CriteriosBusquedaPacientes,
  RepositorioPacienteLectura,
} from '../../../../aplicacion/puertos/repositorio-paciente.js';
import type { Paciente } from '../../../../dominio/clinica/paciente.js';
import {
  derivarClaveIdentificacion,
  normalizarIdentificacion,
  normalizarNombreBusqueda,
  normalizarTextoBusqueda,
} from '../../../../dominio/compartido/normalizacion.js';
import type { EjecutorSql, PoolSql } from '../../sql/tipos-sql.js';
import {
  codificarCursorSql,
  decodificarCursorSql,
} from '../../sql/cursor-paginacion-sql.js';
import {
  type FilaPacienteMysql,
  mapearFilaPacienteMysql,
} from './mapear-paciente-mysql.js';

const SELECT_PACIENTE_BASE_MYSQL = `
  SELECT
    p.id_paciente,
    p.id_publico,
    p.revision,
    p.nombres,
    p.apellidos,
    DATE_FORMAT(p.fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento,
    p.telefono,
    p.correo,
    p.estado,
    h.estado AS historial_estado,
    DATE_FORMAT(h.fecha_apertura, '%Y-%m-%dT00:00:00.000Z') AS fecha_apertura,
    h.causa_baja,
    h.motivo_baja,
    DATE_FORMAT(h.fecha_baja, '%Y-%m-%dT%H:%i:%s.000Z') AS fecha_baja,
    h.actor_baja,
    ip.tipo_documento,
    ip.numero_documento
  FROM paciente p
  LEFT JOIN historial_clinico h ON p.id_paciente = h.id_paciente
  LEFT JOIN identidades_paciente ip ON p.id_paciente = ip.id_paciente
`;

export class RepositorioPacientesMysql implements RepositorioPacienteLectura {
  constructor(private readonly ejecutor: EjecutorSql | PoolSql) {}

  async porId(id: UUID): Promise<Paciente | null> {
    const sql = `${SELECT_PACIENTE_BASE_MYSQL} WHERE p.id_publico = ?`;
    const resultado = await this.ejecutor.consultar<FilaPacienteMysql>(sql, [id]);
    const fila = resultado.filas[0];
    return fila ? mapearFilaPacienteMysql(fila) : null;
  }

  async porVersion(id: UUID, version: Version): Promise<Paciente | null> {
    const actual = await this.porId(id);
    if (!actual) return null;
    if (actual.version === version) return actual;
    if (version > actual.version) return null;

    const sqlRevision = `
      SELECT contenido_anterior
      FROM revisiones
      WHERE tipo_recurso = 'pacientes' AND recurso_id = ? AND version = ?
    `;
    const resultado = await this.ejecutor.consultar<{ contenido_anterior: unknown }>(sqlRevision, [id, version]);
    const fila = resultado.filas[0];
    if (!fila || !fila.contenido_anterior) return null;
    let data = fila.contenido_anterior;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { return null; }
    }
    return data as Paciente;
  }

  async titularIdentidad(identificacion: { tipo: string; numero: string }): Promise<UUID | null> {
    let clave = '';
    try {
      clave = createHash('sha256')
        .update(derivarClaveIdentificacion(identificacion.tipo, identificacion.numero))
        .digest('hex');
    } catch {
      return null;
    }
    const sql = `
      SELECT p.id_publico
      FROM identidades_paciente ip
      JOIN paciente p ON ip.id_paciente = p.id_paciente
      WHERE ip.clave = ?
    `;
    const resultado = await this.ejecutor.consultar<{ id_publico: string }>(sql, [clave]);
    const fila = resultado.filas[0];
    return fila ? (fila.id_publico as UUID) : null;
  }

  async buscar(criterios: CriteriosBusquedaPacientes): Promise<Pagina<Paciente>> {
    const qRaw = criterios.q.trim();
    let qNormNombre: string;
    try {
      qNormNombre = normalizarNombreBusqueda(qRaw);
    } catch {
      qNormNombre = normalizarTextoBusqueda(qRaw);
    }

    let qDocCui: string | null = null;
    let qDocPasaporte: string | null = null;
    let claveDocCui: string | null = null;
    let claveDocPasaporte: string | null = null;

    try {
      const cuiNorm = normalizarIdentificacion('CUI', qRaw);
      qDocCui = cuiNorm.slice('CUI:'.length);
      claveDocCui = createHash('sha256').update(cuiNorm).digest('hex');
    } catch { /* no es CUI */ }

    try {
      const pasNorm = normalizarIdentificacion('PASAPORTE', qRaw);
      qDocPasaporte = pasNorm.slice('PASAPORTE:'.length);
      claveDocPasaporte = createHash('sha256').update(pasNorm).digest('hex');
    } catch { /* no es PASAPORTE */ }

    const condiciones: string[] = [];
    const parametros: unknown[] = [];

    // Búsqueda por documento o prefijo de nombre
    const clausulasBusqueda: string[] = [];

    if (qDocCui) {
      clausulasBusqueda.push('ip.clave = ?');
      parametros.push(claveDocCui);
      clausulasBusqueda.push('ip.numero_documento = ?');
      parametros.push(qDocCui);
    }
    if (qDocPasaporte) {
      clausulasBusqueda.push('ip.clave = ?');
      parametros.push(claveDocPasaporte);
      clausulasBusqueda.push('ip.numero_documento = ?');
      parametros.push(qDocPasaporte);
    }

    clausulasBusqueda.push('LOWER(p.nombres) LIKE CONCAT(?, \'%\')');
    parametros.push(qNormNombre);

    clausulasBusqueda.push('LOWER(p.apellidos) LIKE CONCAT(?, \'%\')');
    parametros.push(qNormNombre);

    clausulasBusqueda.push('LOWER(CONCAT(p.nombres, \' \', p.apellidos)) LIKE CONCAT(?, \'%\')');
    parametros.push(qNormNombre);

    condiciones.push(`(${clausulasBusqueda.join(' OR ')})`);

    // Filtro por estado
    if (criterios.estado === 'ACTIVO') {
      condiciones.push("p.estado = 'ACTIVO' AND COALESCE(h.estado, 'ACTIVO') = 'ACTIVO'");
    } else if (criterios.estado === 'ARCHIVADO') {
      condiciones.push("(p.estado = 'INACTIVO' OR h.estado = 'ARCHIVADO')");
    }

    // Cursor
    if (criterios.cursor) {
      const decoded = decodificarCursorSql(
        criterios.cursor,
        qNormNombre,
        criterios.orden,
        criterios.estado,
      );
      const operador = criterios.orden === 'ASC' ? '>' : '<';
      condiciones.push(
        `(h.fecha_apertura ${operador} ? OR (h.fecha_apertura = ? AND p.id_publico ${operador} ?))`,
      );
      parametros.push(decoded.fecha.slice(0, 10), decoded.fecha.slice(0, 10), decoded.id);
    }

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
    const limite = criterios.limite ?? 20;
    const orden = criterios.orden;

    const sql = `
      ${SELECT_PACIENTE_BASE_MYSQL}
      ${whereClause}
      ORDER BY h.fecha_apertura ${orden}, p.id_publico ${orden}
      LIMIT ?
    `;
    parametros.push(limite + 1);

    const resultado = await this.ejecutor.consultar<FilaPacienteMysql>(sql, parametros);
    const haySiguiente = resultado.filas.length > limite;
    const filasRetorno = haySiguiente ? resultado.filas.slice(0, limite) : resultado.filas;
    const elementos = filasRetorno.map(mapearFilaPacienteMysql);

    let siguienteCursor: string | undefined;
    if (haySiguiente && filasRetorno.length > 0) {
      const ultimaFila = filasRetorno[filasRetorno.length - 1]!;
      siguienteCursor = codificarCursorSql({
        v: 1,
        q: qNormNombre,
        orden: criterios.orden,
        ...(criterios.estado ? { estado: criterios.estado } : {}),
        f: ultimaFila.fecha_apertura ?? new Date().toISOString(),
        id: String(ultimaFila.id_publico),
      });
    }

    return Object.freeze({
      elementos: Object.freeze(elementos),
      ...(siguienteCursor ? { siguienteCursor } : {}),
    });
  }
}
