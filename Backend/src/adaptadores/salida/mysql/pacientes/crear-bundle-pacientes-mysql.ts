import type { PoolSql } from '../../sql/tipos-sql.js';
import type { LectorTransaccional, UnidadDeTrabajo } from '../../../../aplicacion/puertos/nucleo.js';
import type { RepositorioPacienteLectura } from '../../../../aplicacion/puertos/repositorio-paciente.js';
import { crearRepositorioCuentaMysql } from '../repositorio-cuenta-mysql.js';
import { crearUnidadDeTrabajoSql } from '../../sql/unidad-de-trabajo-sql.js';
import { crearConsultaHistorialSql } from '../../sql/consulta-historial-sql.js';
import { RepositorioPacientesMysql } from './repositorio-pacientes-mysql.js';
import { aplicarCambiosPacientesMysql } from './aplicar-cambios-pacientes-mysql.js';

export function crearRepositorioPacientesMysql(pool: PoolSql): RepositorioPacienteLectura {
  return new RepositorioPacientesMysql(pool);
}

export function crearUnidadDeTrabajoPacientesMysql(pool: PoolSql): UnidadDeTrabajo {
  return crearUnidadDeTrabajoSql({
    dialecto: 'mysql',
    pool,
    crearLector: (executor) => {
      const repoPacientes = new RepositorioPacientesMysql(executor);
      return {
        cuentas: crearRepositorioCuentaMysql(executor),
        pacientes: repoPacientes,
        identidades: {
          titular: (ident: { tipo: string; numero: string }) => repoPacientes.titularIdentidad(ident),
        },
        historial: crearConsultaHistorialSql(executor, 'mysql', 'CLINICA_ODONTOLOGICA'),
        citas: { porId: async () => null },
        consultas: { porId: async () => null, porVersion: async () => null },
        responsables: { porId: async () => null, porPaciente: async () => Object.freeze({ elementos: [] }) },
        profesionales: { porId: async () => null },
      } as unknown as LectorTransaccional;
    },
    aplicarCambios: aplicarCambiosPacientesMysql,
  });
}
