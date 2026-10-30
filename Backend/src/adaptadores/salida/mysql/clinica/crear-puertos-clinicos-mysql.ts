import type { PuertosClinicos } from '../../../../aplicacion/puertos/clinica.js';
import type { UUID } from '../../../../dominio/compartido/uuid.js';
import type { ProfesionalClinico } from '../../../../dominio/clinica/consulta.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import type { EjecutorSql } from '../../sql/tipos-sql.js';
import { profesionalClinicoSql } from '../../sql/mapear-clinica-sql.js';
import { RepositorioPacientesMysql } from '../pacientes/repositorio-pacientes-mysql.js';
import { RepositorioCitasMysql } from './repositorio-citas-mysql.js';
import { RepositorioConsultasMysql } from './repositorio-consultas-mysql.js';

export function crearRepositorioProfesionalesMysql(ejecutor: EjecutorSql): { porId(id: UUID): Promise<ProfesionalClinico | null> } {
  return {
    async porId(id) {
      try {
        const resultado = await ejecutor.consultar<Record<string, unknown>>(
          `SELECT o.id_publico, CONCAT_WS(' ', o.nombres, o.apellidos) AS nombre,
                  o.colegiado, o.entidad_colegiacion,
                  NOT EXISTS(SELECT 1 FROM usuario u WHERE u.id_odontologo = o.id_odontologo AND u.estado <> 'ACTIVO') AS activo
             FROM odontologo o WHERE o.id_publico = ?`,
          [id],
        );
        const fila = resultado.filas[0];
        return fila ? profesionalClinicoSql(fila, 'ODONTOLOGO') : null;
      } catch (error) {
        if (error instanceof ErrorDominio) throw error;
        throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible consultar el profesional.');
      }
    },
  };
}

export function crearPuertosClinicosMysql(ejecutor: EjecutorSql): PuertosClinicos {
  return {
    pacientes: new RepositorioPacientesMysql(ejecutor),
    profesionales: crearRepositorioProfesionalesMysql(ejecutor),
    consultas: new RepositorioConsultasMysql(ejecutor),
    citas: new RepositorioCitasMysql(ejecutor),
    responsables: {
      async autorizacion() {
        // La autorización pediátrica vive en Firestore; odontología no admite responsables.
        return null;
      },
    },
  };
}
