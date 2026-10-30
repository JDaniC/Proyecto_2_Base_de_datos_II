import { consultaCorregidaSql } from '../../sql/corregir-consulta-sql.js';
import type { UUID } from '../../../../dominio/compartido/uuid.js';
import type { Version } from '../../../../dominio/compartido/version.js';
import type { PuertosClinicos } from '../../../../aplicacion/puertos/clinica.js';
import type { Consulta } from '../../../../dominio/clinica/consulta.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import type { EjecutorSql } from '../../sql/tipos-sql.js';
import {
  componentesDeConsulta,
  recetaDeJson,
  signosDeFila,
  type FilaConsultaSql,
  type FilaDiagnosticoSql,
  type FilaRecetaSql,
  type FilaSignosSql,
  type FilaTratamientoSql,
  numero,
} from '../../sql/mapear-clinica-sql.js';

const SELECT_CONSULTA = `
  SELECT c.id_publico, c.revision, p.id_publico AS paciente_id, ci.id_publico AS cita_id,
         TO_CHAR(c.fecha_hora, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS fecha_hora,
         c.snapshot_actual, c.estado, c.motivo_consulta AS motivo, c.sintomas, c.observaciones, c.profesional_historico, c.campos_signos,
         pm.id_publico AS profesional_id,
         COALESCE(pm.primer_nombre, '') AS profesional_nombre,
         pm.numero_colegiado AS profesional_colegiado,
         pm.entidad_colegiacion AS profesional_entidad,
         pm.estado AS profesional_estado
    FROM consulta c
    JOIN historial_clinico h ON h.id_historial = c.id_historial
    JOIN paciente p ON p.id_paciente = h.id_paciente
    JOIN personal_medico pm ON pm.id_personal = c.id_personal_atendio
    LEFT JOIN cita ci ON ci.id_cita = c.id_cita
`;

type PuertoConsultas = PuertosClinicos['consultas'];

const indefinido = (msg = 'No fue posible consultar la atención clínica.') =>
  new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', msg);

export class RepositorioConsultasPostgresql implements PuertoConsultas {
  constructor(private readonly ejecutor: EjecutorSql) {}

  async porId(id: UUID, intentos = 0): Promise<Consulta | null> {
    try {
      const resultado = await this.ejecutor.consultar<FilaConsultaSql>(
        `${SELECT_CONSULTA} WHERE c.id_publico = $1`, [id],
      );
      const fila = resultado.filas[0];
      if (!fila) return null;
      const corregida = consultaCorregidaSql(fila.snapshot_actual, fila);
      if (corregida) return corregida;
      const signos = await this.signos(id);
      const diagnosticos = await this.diagnosticos(id);
      const tratamientos = await this.tratamientos(id);
      const receta = await this.receta(id);
      const revision = await this.ejecutor.consultar<{ revision: number | string }>(
        'SELECT revision FROM consulta WHERE id_publico = $1', [id]);
      if (Number(revision.filas[0]?.revision) !== Number(fila.revision)) {
        if (intentos >= 2) throw indefinido();
        return this.porId(id, intentos + 1);
      }
      return componentesDeConsulta(fila, signos, diagnosticos, tratamientos, receta);
    } catch (error) {
      if (error instanceof ErrorDominio) throw error;
      throw indefinido();
    }
  }

  async porVersion(id: UUID, version: Version): Promise<Consulta | null> {
    try {
      const actual = await this.porId(id);
      if (!actual) return null;
      if (actual.version === version) return actual;
      if (version > actual.version) return null;
      const resultado = await this.ejecutor.consultar<{ contenido_anterior: unknown }>(
        "SELECT contenido_anterior FROM revisiones WHERE tipo_recurso = 'consultas' AND recurso_id = $1 AND version = $2",
        [id, version],
      );
      const snapshot = resultado.filas[0]?.contenido_anterior;
      if (!snapshot || typeof snapshot !== 'object') return null;
      const c = snapshot as Consulta;
      if (c.id !== id || c.version !== version || c.paciente_id !== actual.paciente_id) throw indefinido();
      return c;
    } catch (error) {
      if (error instanceof ErrorDominio) throw error;
      throw indefinido();
    }
  }

  async porCita(id: UUID): Promise<Consulta | null> {
    try {
      const resultado = await this.ejecutor.consultar<{ id_publico: string }>(
        'SELECT c.id_publico FROM consulta c JOIN cita ci ON ci.id_cita = c.id_cita WHERE ci.id_publico = $1',
        [id],
      );
      const consultaId = resultado.filas[0]?.id_publico;
      return consultaId ? await this.porId(consultaId as UUID) : null;
    } catch (error) {
      if (error instanceof ErrorDominio) throw error;
      throw indefinido();
    }
  }

  private async signos(id: UUID): Promise<ReturnType<typeof signosDeFila>> {
    const resultado = await this.ejecutor.consultar<FilaSignosSql>(
      `SELECT s.peso_kg, s.altura_cm, s.temperatura_c, s.presion_sistolica_mmhg, s.presion_diastolica_mmhg,
              s.frecuencia_cardiaca_lpm, s.frecuencia_respiratoria_rpm, s.saturacion_oxigeno_pct
         FROM signos_vitales s JOIN consulta c ON c.id_consulta = s.id_consulta
        WHERE c.id_publico = $1 ORDER BY s.fecha_hora_medicion DESC, s.id_signos_vitales DESC LIMIT 1`,
      [id],
    );
    return signosDeFila(resultado.filas[0]);
  }

  private async diagnosticos(id: UUID): Promise<readonly FilaDiagnosticoSql[]> {
    const resultado = await this.ejecutor.consultar<FilaDiagnosticoSql>(
      `SELECT d.id_publico, cat.codigo, cat.nombre, d.nombre_historico, d.es_principal, d.observacion,
              TO_CHAR(d.fecha_registro, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS fecha_registro, d.autor_historico
         FROM diagnostico d
         JOIN catalogo_diagnostico cat ON cat.id_catalogo_diagnostico = d.id_catalogo_diagnostico
         JOIN consulta c ON c.id_consulta = d.id_consulta
        WHERE c.id_publico = $1 ORDER BY d.id_diagnostico`,
      [id],
    );
    return resultado.filas;
  }

  private async tratamientos(id: UUID): Promise<readonly FilaTratamientoSql[]> {
    const resultado = await this.ejecutor.consultar<FilaTratamientoSql>(
      `SELECT t.id_publico, t.descripcion, t.indicaciones,
              TO_CHAR(t.fecha_registro, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS fecha_registro, t.autor_historico
         FROM tratamiento t JOIN consulta c ON c.id_consulta = t.id_consulta
        WHERE c.id_publico = $1 ORDER BY t.id_tratamiento`,
      [id],
    );
    return resultado.filas;
  }

  private async receta(id: UUID): Promise<Consulta['receta']> {
    const resultado = await this.ejecutor.consultar<FilaRecetaSql>(
      `SELECT r.contenido_historico, TO_CHAR(r.fecha_hora, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS fecha_hora
         FROM receta r JOIN consulta c ON c.id_consulta = r.id_consulta
        WHERE c.id_publico = $1 AND r.estado <> 'ANULADA'`,
      [id],
    );
    const fila = resultado.filas[0];
    if (!fila) return undefined;
    const receta = recetaDeJson(fila.contenido_historico);
    if (receta) return receta;
    throw indefinido('La receta histórica requiere reconciliación.');
  }

  /** Conservado para pruebas: evita depender de un contador interno. */
  static versionDeFila(fila: FilaConsultaSql): number {
    return numero(fila.revision);
  }
}
