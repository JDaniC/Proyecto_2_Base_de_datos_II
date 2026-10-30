import type { PoolSql } from '../../sql/tipos-sql.js';
import type { LectorTransaccional, UnidadDeTrabajo } from '../../../../aplicacion/puertos/nucleo.js';
import type { RepositorioPacienteLectura } from '../../../../aplicacion/puertos/repositorio-paciente.js';
import { crearRepositorioCuentaMysql } from '../repositorio-cuenta-mysql.js';
import { crearUnidadDeTrabajoSql } from '../../sql/unidad-de-trabajo-sql.js';
import { crearConsultaHistorialSql } from '../../sql/consulta-historial-sql.js';
import { RepositorioPacientesMysql } from './repositorio-pacientes-mysql.js';
import { aplicarCambiosClinicosMysql } from '../clinica/aplicar-cambios-clinicos-mysql.js';
import { crearPuertosClinicosMysql } from '../clinica/crear-puertos-clinicos-mysql.js';

export function crearRepositorioPacientesMysql(pool: PoolSql): RepositorioPacienteLectura {
  return new RepositorioPacientesMysql(pool);
}

/** Puertos clínicos de odontología, ligados al pool institucional. */
export function crearClinicaMysql(pool: PoolSql) {
  return crearPuertosClinicosMysql(pool);
}

export function crearUnidadDeTrabajoPacientesMysql(pool: PoolSql): UnidadDeTrabajo {
  return crearUnidadDeTrabajoSql({
    dialecto: 'mysql',
    pool,
    crearLector: (executor) => {
      const repoPacientes = new RepositorioPacientesMysql(executor);
      const clinica = crearPuertosClinicosMysql(executor);
      return {
        clinica,
        cuentas: crearRepositorioCuentaMysql(executor),
        pacientes: repoPacientes,
        identidades: {
          titular: (ident: { tipo: string; numero: string }) => repoPacientes.titularIdentidad(ident),
        },
        historial: crearConsultaHistorialSql(executor, 'mysql', 'CLINICA_ODONTOLOGICA'),
        citas: clinica.citas,
        consultas: clinica.consultas,
        responsables: { porId: async () => null, porPaciente: async () => Object.freeze({ elementos: [] }) },
        profesionales: clinica.profesionales,
      } as unknown as LectorTransaccional;
    },
    aplicarCambios: aplicarCambiosClinicosMysql,
  });
}
