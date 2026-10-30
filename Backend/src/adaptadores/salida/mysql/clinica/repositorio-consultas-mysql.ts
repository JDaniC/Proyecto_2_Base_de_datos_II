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
} from '../../sql/mapear-clinica-sql.js';

type PuertoConsultas = PuertosClinicos['consultas'];

const SELECT_CONSULTA = `
  SELECT co.id_publico, co.revision, p.id_publico AS paciente_id, ci.id_publico AS cita_id,
         DATE_FORMAT(co.fecha_hora, '%Y-%m-%dT%H:%i:%s.%fZ') AS fecha_hora,
         co.snapshot_actual, co.estado, co.motivo, co.sintomas, co.observaciones, co.profesional_historico, co.campos_signos,
         o.id_publico AS profesional_id,
         CONCAT_WS(' ', o.nombres, o.apellidos) AS profesional_nombre,
         o.colegiado AS profesional_colegiado,
         o.entidad_colegiacion AS profesional_entidad,
         (SELECT u.estado FROM usuario u WHERE u.id_odontologo = o.id_odontologo LIMIT 1) AS profesional_estado
    FROM consulta_odontologica co
    JOIN historial_clinico h ON h.id_historial = co.id_historial
    JOIN paciente p ON p.id_paciente = h.id_paciente
    JOIN cita ci ON ci.id_cita = co.id_cita
    JOIN odontologo o ON o.id_odontologo = co.id_odontologo
`;

const indefinido = () => new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible consultar la atención clínica.');

export class RepositorioConsultasMysql implements PuertoConsultas {
  constructor(private readonly ejecutor: EjecutorSql) {}

  async porId(id: UUID, intentos = 0): Promise<Consulta | null> {
    try {
      const resultado = await this.ejecutor.consultar<FilaConsultaSql>(`${SELECT_CONSULTA} WHERE co.id_publico = ?`, [id]);
      const fila = resultado.filas[0];
      if (!fila) return null;
      const corregida = consultaCorregidaSql(fila.snapshot_actual, fila);
      if (corregida) return corregida;
      const signos = await this.signos(id);
      const diagnosticos = await this.diagnosticos(id);
      const tratamientos = await this.tratamientos(id);
      const receta = await this.receta(id);
      const revision = await this.ejecutor.consultar<{ revision: number | string }>(
        'SELECT revision FROM consulta_odontologica WHERE id_publico = ?', [id]);
      if (Number(revision.filas[0]?.revision) !== Number(fila.revision)) {
        if (intentos >= 2) throw indefinido();
        return this.porId(id, intentos + 1);
      }
      return componentesDeConsulta(fila, signos, diagnosticos, tratamientos, receta, 'ODONTOLOGO');
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
        "SELECT contenido_anterior FROM revisiones WHERE tipo_recurso = 'consultas' AND recurso_id = ? AND version = ?",
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
        'SELECT co.id_publico FROM consulta_odontologica co JOIN cita c ON c.id_cita = co.id_cita WHERE c.id_publico = ?',
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
      `SELECT s.peso_kg, s.talla_cm AS altura_cm, s.temperatura_c,
              s.presion_sistolica AS presion_sistolica_mmhg, s.presion_diastolica AS presion_diastolica_mmhg,
              s.frecuencia_cardiaca_lpm, s.frecuencia_respiratoria_rpm, s.saturacion_oxigeno_pct
         FROM signos_vitales_consulta s JOIN consulta_odontologica co ON co.id_consulta = s.id_consulta
        WHERE co.id_publico = ?`,
      [id],
    );
    return signosDeFila(resultado.filas[0]);
  }

  private async diagnosticos(id: UUID): Promise<readonly FilaDiagnosticoSql[]> {
    const resultado = await this.ejecutor.consultar<FilaDiagnosticoSql>(
      `SELECT cd.id_publico, d.codigo, d.nombre, cd.nombre_historico, cd.es_principal,
              cd.observaciones AS observacion,
              DATE_FORMAT(cd.fecha_registro, '%Y-%m-%dT%H:%i:%s.%fZ') AS fecha_registro, cd.autor_historico
         FROM consulta_diagnostico cd
         JOIN diagnostico d ON d.id_diagnostico = cd.id_diagnostico
         JOIN consulta_odontologica co ON co.id_consulta = cd.id_consulta
        WHERE co.id_publico = ? ORDER BY cd.orden_registro, cd.id_diagnostico`,
      [id],
    );
    return resultado.filas;
  }

  private async tratamientos(id: UUID): Promise<readonly FilaTratamientoSql[]> {
    const resultado = await this.ejecutor.consultar<FilaTratamientoSql>(
      `SELECT ct.id_publico, COALESCE(ct.nombre_historico, t.nombre) AS descripcion,
              ct.observaciones AS indicaciones,
              DATE_FORMAT(ct.fecha_registro, '%Y-%m-%dT%H:%i:%s.%fZ') AS fecha_registro, ct.autor_historico
         FROM consulta_tratamiento ct
         JOIN tratamiento t ON t.id_tratamiento = ct.id_tratamiento
         JOIN consulta_odontologica co ON co.id_consulta = ct.id_consulta
        WHERE co.id_publico = ? ORDER BY ct.orden_registro, ct.id_tratamiento`,
      [id],
    );
    return resultado.filas;
  }

  private async receta(id: UUID): Promise<Consulta['receta']> {
    const resultado = await this.ejecutor.consultar<FilaRecetaSql>(
      `SELECT r.contenido_historico, DATE_FORMAT(r.fecha_emision, '%Y-%m-%dT%H:%i:%s.%fZ') AS fecha_emision
         FROM receta r JOIN consulta_odontologica co ON co.id_consulta = r.id_consulta
        WHERE co.id_publico = ? AND r.estado <> 'ANULADA'`,
      [id],
    );
    const fila = resultado.filas[0]; if (!fila) return undefined;
    const receta = recetaDeJson(fila.contenido_historico); if (!receta) throw indefinido(); return receta;
  }
}
