import type { PoolSql } from '../../sql/tipos-sql.js';
import type { LectorTransaccional, UnidadDeTrabajo } from '../../../../aplicacion/puertos/nucleo.js';
import type { RepositorioPacienteLectura } from '../../../../aplicacion/puertos/repositorio-paciente.js';
import { crearRepositorioCuentaPostgresql } from '../repositorio-cuenta-postgresql.js';
import { crearUnidadDeTrabajoSql } from '../../sql/unidad-de-trabajo-sql.js';
import { crearConsultaHistorialSql } from '../../sql/consulta-historial-sql.js';
import { RepositorioPacientesPostgresql } from './repositorio-pacientes-postgresql.js';
import { aplicarCambiosClinicosPostgresql } from '../clinica/aplicar-cambios-clinicos-postgresql.js';
import { crearPuertosClinicosPostgresql } from '../clinica/crear-puertos-clinicos-postgresql.js';

export function crearRepositorioPacientesPostgresql(pool: PoolSql): RepositorioPacienteLectura {
  return new RepositorioPacientesPostgresql(pool);
}

/** Puertos clínicos del hospital, ligados al pool institucional. */
export function crearClinicaPostgresql(pool: PoolSql) {
  return crearPuertosClinicosPostgresql(pool);
}

export function crearUnidadDeTrabajoPacientesPostgresql(pool: PoolSql): UnidadDeTrabajo {
  return crearUnidadDeTrabajoSql({
    dialecto: 'postgresql',
    pool,
    crearLector: (executor) => {
      const repoPacientes = new RepositorioPacientesPostgresql(executor);
      const clinica = crearPuertosClinicosPostgresql(executor);
      return {
        clinica,
        cuentas: crearRepositorioCuentaPostgresql(executor),
        pacientes: repoPacientes,
        identidades: {
          titular: (ident: { tipo: string; numero: string }) => repoPacientes.titularIdentidad(ident),
        },
        historial: crearConsultaHistorialSql(executor, 'postgresql', 'HOSPITAL_GENERAL'),
        citas: clinica.citas,
        consultas: clinica.consultas,
        responsables: { porId: async () => null, porPaciente: async () => Object.freeze({ elementos: [] }) },
        profesionales: clinica.profesionales,
      } as unknown as LectorTransaccional;
    },
    aplicarCambios: aplicarCambiosClinicosPostgresql,
  });
}
