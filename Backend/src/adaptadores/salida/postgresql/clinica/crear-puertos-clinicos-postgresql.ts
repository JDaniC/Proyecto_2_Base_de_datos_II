import type { PuertosClinicos } from '../../../../aplicacion/puertos/clinica.js';
import type { UUID } from '../../../../dominio/compartido/uuid.js';
import type { ProfesionalClinico } from '../../../../dominio/clinica/consulta.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import type { EjecutorSql } from '../../sql/tipos-sql.js';
import { RepositorioPacientesPostgresql } from '../pacientes/repositorio-pacientes-postgresql.js';
import { profesionalClinicoSql } from '../../sql/mapear-clinica-sql.js';
import { RepositorioCitasPostgresql } from './repositorio-citas-postgresql.js';
import { RepositorioConsultasPostgresql } from './repositorio-consultas-postgresql.js';

export function crearRepositorioProfesionalesPostgresql(ejecutor: EjecutorSql): { porId(id: UUID): Promise<ProfesionalClinico | null> } {
  return {
    async porId(id) {
      try {
        const resultado = await ejecutor.consultar<Record<string, unknown>>(
          `SELECT id_publico,
                  CONCAT_WS(' ', primer_nombre, segundo_nombre, primer_apellido, segundo_apellido) AS nombre,
                  numero_colegiado AS colegiado, entidad_colegiacion, (estado = 'ACTIVO') AS activo
             FROM personal_medico WHERE id_publico = $1`,
          [id],
        );
        const fila = resultado.filas[0];
        return fila ? profesionalClinicoSql(fila, 'MEDICO') : null;
      } catch (error) {
        if (error instanceof ErrorDominio) throw error;
        throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible consultar el profesional.');
      }
    },
  };
}

/** Puertos clínicos ligados a una conexión: la misma sesión/UoW para todas las lecturas. */
export function crearPuertosClinicosPostgresql(ejecutor: EjecutorSql): PuertosClinicos {
  return {
    pacientes: new RepositorioPacientesPostgresql(ejecutor),
    profesionales: crearRepositorioProfesionalesPostgresql(ejecutor),
    consultas: new RepositorioConsultasPostgresql(ejecutor),
    citas: new RepositorioCitasPostgresql(ejecutor),
    responsables: {
      async autorizacion() {
        // La autorización pediátrica vive en Firestore; el hospital no admite responsables.
        return null;
      },
    },
  };
}
