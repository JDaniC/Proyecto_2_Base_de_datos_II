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
  escaparLikeSql,
} from '../../sql/cursor-paginacion-sql.js';
import {
  type FilaPacientePostgresql,
  mapearFilaPacientePostgresql,
} from './mapear-paciente-postgresql.js';

const DIACRITICOS_CON = 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿāăąćĉċčďēĕėęěĝğġģĥĩīĭįĵķĺļľńņňōŏőŕŗřśŝşšţťũūŭůűųŵŷźżž';
const DIACRITICOS_SIN = 'aaaaaaceeeeiiiinooooouuuuyyaaaccccdeeeeegggghiiiijklllnnnooorrrssssttuuuuuuwyzzz';

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
    TO_CHAR(p.fecha_registro AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS fecha_registro,
    h.numero_historial,
    h.estado_historial,
    h.causa_baja,
    h.motivo_baja,
    TO_CHAR(h.fecha_baja AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS fecha_baja,
    h.actor_baja,
    ce.primer_nombre AS ce_primer_nombre,
    ce.segundo_nombre AS ce_segundo_nombre,
    ce.primer_apellido AS ce_primer_apellido,
    ce.segundo_apellido AS ce_segundo_apellido,
    ce.parentesco AS ce_parentesco,
    ce.telefono AS ce_telefono,
    p.clave_identidad_activa,
    p.id_contacto_emergencia_activo,
    ip.tipo_documento,
    ip.numero_documento
  FROM paciente p
  LEFT JOIN historial_clinico h ON p.id_paciente = h.id_paciente
  LEFT JOIN contacto_emergencia ce ON p.id_contacto_emergencia_activo = ce.id_contacto
  LEFT JOIN identidades_paciente ip ON p.clave_identidad_activa = ip.clave
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
    const tipoNorm = identificacion.tipo.trim().toUpperCase();
    const cuiDigitos = tipoNorm === 'CUI' ? identificacion.numero.replace(/[^0-9]/g, '') : '';
    const sql = `
      SELECT p.id_publico
      FROM paciente p
      LEFT JOIN identidades_paciente ip ON ip.id_paciente = p.id_paciente
      WHERE ip.clave = $1
         OR ($2 = 'CUI' AND regexp_replace(COALESCE(p.cui, ''), '[^0-9]', '', 'g') = $3 AND LENGTH($3) = 13)
      LIMIT 1
    `;
    const resultado = await this.ejecutor.consultar<{ id_publico: string }>(sql, [clave, tipoNorm, cuiDigitos]);
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

    // Búsqueda por documento exacto (normalizado para CUIs preexistentes y claves de identidad)
    if (qDocCui) {
      clausulasBusqueda.push(
        `(regexp_replace(COALESCE(p.cui, ''), '[^0-9]', '', 'g') = $${paramIdx} OR EXISTS (
          SELECT 1 FROM identidades_paciente ip_busq
          WHERE ip_busq.id_paciente = p.id_paciente AND ip_busq.clave = $${paramIdx + 1}
        ))`,
      );
      parametros.push(qDocCui, claveDocCui);
      paramIdx += 2;
    }
    if (qDocPasaporte) {
      clausulasBusqueda.push(
        `EXISTS (
          SELECT 1 FROM identidades_paciente ip_busq
          WHERE ip_busq.id_paciente = p.id_paciente AND ip_busq.clave = $${paramIdx}
        )`,
      );
      parametros.push(claveDocPasaporte);
      paramIdx++;
    }

    // Búsqueda por prefijo normalizado de nombre en límites de palabra (sin coincidencia infija)
    // Utiliza translate() para eliminar diacríticos de forma determinista y exhaustiva en PostgreSQL
    const qEscapado = escaparLikeSql(qNormNombre);
    const nombreCompletoExpr = `translate(LOWER(CONCAT_WS(' ', p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido)), '${DIACRITICOS_CON}', '${DIACRITICOS_SIN}')`;

    clausulasBusqueda.push(
      `(${nombreCompletoExpr} LIKE $${paramIdx} || '%' ESCAPE '\\' OR ${nombreCompletoExpr} LIKE '% ' || $${paramIdx + 1} || '%' ESCAPE '\\')`,
    );
    parametros.push(qEscapado, qEscapado);
    paramIdx += 2;

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
        'HOSPITAL_GENERAL',
        qNormNombre,
        criterios.orden,
        criterios.estado,
      );
      const operador = criterios.orden === 'ASC' ? '>' : '<';
      condiciones.push(
        `(p.fecha_registro ${operador} $${paramIdx}::timestamp OR (p.fecha_registro = $${paramIdx}::timestamp AND p.id_publico ${operador} $${paramIdx + 1}))`,
      );
      parametros.push(decoded.fecha, decoded.id);
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
        recurso: 'pacientes',
        institucion: 'HOSPITAL_GENERAL',
        q: qNormNombre,
        orden: criterios.orden,
        ...(criterios.estado ? { estado: criterios.estado } : {}),
        f: String(ultimaFila.fecha_registro),
        id: String(ultimaFila.id_publico),
      });
    }

    return Object.freeze({
      elementos: Object.freeze(elementos),
      ...(siguienteCursor ? { siguienteCursor } : {}),
    });
  }
}
