import type { PoolSql } from '../../sql/tipos-sql.js';
import type { LectorTransaccional, UnidadDeTrabajo } from '../../../../aplicacion/puertos/nucleo.js';
import type { RepositorioPacienteLectura } from '../../../../aplicacion/puertos/repositorio-paciente.js';
import { crearRepositorioCuentaPostgresql } from '../repositorio-cuenta-postgresql.js';
import { crearUnidadDeTrabajoSql } from '../../sql/unidad-de-trabajo-sql.js';
import { crearConsultaHistorialSql } from '../../sql/consulta-historial-sql.js';
import { RepositorioPacientesPostgresql } from './repositorio-pacientes-postgresql.js';
import { aplicarCambiosPacientesPostgresql } from './aplicar-cambios-pacientes-postgresql.js';

export function crearRepositorioPacientesPostgresql(pool: PoolSql): RepositorioPacienteLectura {
  return new RepositorioPacientesPostgresql(pool);
}

export function crearUnidadDeTrabajoPacientesPostgresql(pool: PoolSql): UnidadDeTrabajo {
  return crearUnidadDeTrabajoSql({
    dialecto: 'postgresql',
    pool,
    crearLector: (executor) => {
      const repoPacientes = new RepositorioPacientesPostgresql(executor);
      return {
        cuentas: crearRepositorioCuentaPostgresql(executor),
        pacientes: repoPacientes,
        identidades: {
          titular: (ident: { tipo: string; numero: string }) => repoPacientes.titularIdentidad(ident),
        },
        historial: crearConsultaHistorialSql(executor, 'postgresql'),
        citas: { porId: async () => null },
        consultas: { porId: async () => null, porVersion: async () => null },
        responsables: { porId: async () => null, porPaciente: async () => Object.freeze({ elementos: [] }) },
        profesionales: { porId: async () => null },
      } as unknown as LectorTransaccional;
    },
    aplicarCambios: aplicarCambiosPacientesPostgresql,
  });
}
