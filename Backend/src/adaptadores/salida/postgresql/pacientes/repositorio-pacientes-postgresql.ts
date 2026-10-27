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
  type FilaPacientePostgresql,
  mapearFilaPacientePostgresql,
} from './mapear-paciente-postgresql.js';

const SELECT_PACIENTE_BASE = `
  SELECT
    p.id_paciente,
    p.id_publico,
    p.revision,
    p.cui,
    p.primer_nombre,
    p.segundo_nombre,
    p.primer_apellido,
    p.segundo_apellido,
    TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento,
    p.sexo,
    p.tipo_sangre,
    p.telefono_principal,
    p.correo_principal,
    p.direccion,
    TO_CHAR(p.fecha_registro AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS fecha_registro,
    h.numero_historial,
    h.estado_historial,
    h.causa_baja,
    h.motivo_baja,
    TO_CHAR(h.fecha_baja AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS fecha_baja,
    h.actor_baja,
    ce.primer_nombre AS ce_primer_nombre,
    ce.segundo_nombre AS ce_segundo_nombre,
    ce.primer_apellido AS ce_primer_apellido,
    ce.segundo_apellido AS ce_segundo_apellido,
    ce.parentesco AS ce_parentesco,
    ce.telefono AS ce_telefono,
    ip.tipo_documento,
    ip.numero_documento
  FROM paciente p
  LEFT JOIN historial_clinico h ON p.id_paciente = h.id_paciente
  LEFT JOIN contacto_emergencia ce ON p.id_paciente = ce.id_paciente
  LEFT JOIN identidades_paciente ip ON p.id_paciente = ip.id_paciente
`;

export class RepositorioPacientesPostgresql implements RepositorioPacienteLectura {
  constructor(private readonly ejecutor: EjecutorSql | PoolSql) {}

  async porId(id: UUID): Promise<Paciente | null> {
    const sql = `${SELECT_PACIENTE_BASE} WHERE p.id_publico = $1`;
    const resultado = await this.ejecutor.consultar<FilaPacientePostgresql>(sql, [id]);
    const fila = resultado.filas[0];
    return fila ? mapearFilaPacientePostgresql(fila) : null;
  }

  async porVersion(id: UUID, version: Version): Promise<Paciente | null> {
    const actual = await this.porId(id);
    if (!actual) return null;
    if (actual.version === version) return actual;
    if (version > actual.version) return null;

    const sqlRevision = `
      SELECT contenido_anterior
      FROM revisiones
      WHERE tipo_recurso = 'pacientes' AND recurso_id = $1 AND version = $2
    `;
    const resultado = await this.ejecutor.consultar<{ contenido_anterior: unknown }>(sqlRevision, [id, version]);
    const fila = resultado.filas[0];
    if (!fila || !fila.contenido_anterior) return null;
    return fila.contenido_anterior as Paciente;
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
      WHERE ip.clave = $1
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
    let paramIdx = 1;

    // Condición de búsqueda (documento exacto o prefijo de nombre)
    const clausulasBusqueda: string[] = [];

    // Búsqueda por documento exacto
    if (qDocCui) {
      clausulasBusqueda.push(`p.cui = $${paramIdx}`);
      parametros.push(qDocCui);
      paramIdx++;

      clausulasBusqueda.push(`ip.clave = $${paramIdx}`);
      parametros.push(claveDocCui);
      paramIdx++;
    }
    if (qDocPasaporte) {
      clausulasBusqueda.push(`ip.clave = $${paramIdx}`);
      parametros.push(claveDocPasaporte);
      paramIdx++;
    }

    // Búsqueda por prefijo normalizado de nombre
    // Utiliza translate() para eliminar diacríticos de forma determinista en PostgreSQL
    const translateExpr = (col: string) => `translate(LOWER(${col}), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')`;
    clausulasBusqueda.push(`${translateExpr('p.primer_nombre')} LIKE $${paramIdx} || '%'`);
    parametros.push(qNormNombre);
    paramIdx++;

    clausulasBusqueda.push(`${translateExpr('p.primer_apellido')} LIKE $${paramIdx} || '%'`);
    parametros.push(qNormNombre);
    paramIdx++;

    clausulasBusqueda.push(
      `${translateExpr("p.primer_nombre || ' ' || COALESCE(p.segundo_nombre || ' ', '') || p.primer_apellido")} LIKE $${paramIdx} || '%'`,
    );
    parametros.push(qNormNombre);
    paramIdx++;

    condiciones.push(`(${clausulasBusqueda.join(' OR ')})`);

    // Filtro por estado
    if (criterios.estado === 'ACTIVO') {
      condiciones.push("COALESCE(h.estado_historial, 'ACTIVO') = 'ACTIVO'");
    } else if (criterios.estado === 'ARCHIVADO') {
      condiciones.push("h.estado_historial = 'ARCHIVADO'");
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
        `(p.fecha_registro ${operador} $${paramIdx} OR (p.fecha_registro = $${paramIdx} AND p.id_publico ${operador} $${paramIdx + 1}))`,
      );
      parametros.push(new Date(decoded.fecha), decoded.id);
      paramIdx += 2;
    }

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
    const limite = criterios.limite ?? 20;
    const orden = criterios.orden;

    const sql = `
      ${SELECT_PACIENTE_BASE}
      ${whereClause}
      ORDER BY p.fecha_registro ${orden}, p.id_publico ${orden}
      LIMIT $${paramIdx}
    `;
    parametros.push(limite + 1);

    const resultado = await this.ejecutor.consultar<FilaPacientePostgresql>(sql, parametros);
    const haySiguiente = resultado.filas.length > limite;
    const filasRetorno = haySiguiente ? resultado.filas.slice(0, limite) : resultado.filas;
    const elementos = filasRetorno.map(mapearFilaPacientePostgresql);

    let siguienteCursor: string | undefined;
    if (haySiguiente && filasRetorno.length > 0) {
      const ultimaFila = filasRetorno[filasRetorno.length - 1]!;
      siguienteCursor = codificarCursorSql({
        v: 1,
        q: qNormNombre,
        orden: criterios.orden,
        ...(criterios.estado ? { estado: criterios.estado } : {}),
        f: new Date(ultimaFila.fecha_registro).toISOString(),
        id: String(ultimaFila.id_publico),
      });
    }

    return Object.freeze({
      elementos: Object.freeze(elementos),
      ...(siguienteCursor ? { siguienteCursor } : {}),
    });
  }
}
