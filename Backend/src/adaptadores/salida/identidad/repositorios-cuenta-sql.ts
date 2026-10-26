import type { CuentaAutorizada } from '../../../aplicacion/puertos/contexto-autenticado.js';
import type { RepositorioCuenta } from '../../../aplicacion/puertos/repositorio-cuenta.js';
import type { Version } from '../../../dominio/compartido/version.js';
import type { ConexionSql, PoolSql } from '../sql/tipos-sql.js';
import { crearRepositorioCuentaPostgresql } from '../postgresql/repositorio-cuenta-postgresql.js';
import { crearRepositorioCuentaMysql } from '../mysql/repositorio-cuenta-mysql.js';

interface FilaEstadoCuenta extends Record<string, unknown> {
  readonly estado: unknown;
  readonly revision: unknown;
}

export function crearRepositorioCuentaInstitucionalPostgresql(pool: PoolSql): RepositorioCuenta {
  return crearRepositorioSql(pool, crearRepositorioCuentaPostgresql, async (conexion, uid, revisionEsperada) => {
    const actual = await conexion.consultar<FilaEstadoCuenta>(
      'SELECT estado, revision FROM usuario WHERE auth_uid = $1 AND institucion_id = $2 FOR UPDATE',
      [uid, 'HOSPITAL_GENERAL'],
    );
    const fila = actual.filas[0];
    if (!fila) return false;
    if (fila.estado === 'ACTIVO') return true;
    if (fila.estado !== 'PENDIENTE' || numeroRevision(fila.revision) !== revisionEsperada) return false;
    const actualizada = await conexion.consultar<FilaEstadoCuenta>(
      `UPDATE usuario SET estado = 'ACTIVO', revision = revision + 1
        WHERE auth_uid = $1 AND institucion_id = $2 AND estado = 'PENDIENTE' AND revision = $3
        RETURNING estado, revision`,
      [uid, 'HOSPITAL_GENERAL', revisionEsperada],
    );
    return actualizada.filas.length === 1;
  });
}

export function crearRepositorioCuentaInstitucionalMysql(pool: PoolSql): RepositorioCuenta {
  return crearRepositorioSql(pool, crearRepositorioCuentaMysql, async (conexion, uid, revisionEsperada) => {
    const actual = await conexion.consultar<FilaEstadoCuenta>(
      'SELECT estado, revision FROM usuario WHERE auth_uid = ? AND institucion_id = ? FOR UPDATE',
      [uid, 'CLINICA_ODONTOLOGICA'],
    );
    const fila = actual.filas[0];
    if (!fila) return false;
    if (fila.estado === 'ACTIVO') return true;
    if (fila.estado !== 'PENDIENTE' || numeroRevision(fila.revision) !== revisionEsperada) return false;
    await conexion.consultar(
      `UPDATE usuario SET estado = 'ACTIVO', revision = revision + 1
        WHERE auth_uid = ? AND institucion_id = ? AND estado = 'PENDIENTE' AND revision = ?`,
      [uid, 'CLINICA_ODONTOLOGICA', revisionEsperada],
    );
    const confirmada = await conexion.consultar<FilaEstadoCuenta>(
      'SELECT estado, revision FROM usuario WHERE auth_uid = ? AND institucion_id = ?',
      [uid, 'CLINICA_ODONTOLOGICA'],
    );
    return confirmada.filas[0]?.estado === 'ACTIVO' && numeroRevision(confirmada.filas[0]?.revision) === revisionEsperada + 1;
  });
}

function crearRepositorioSql(
  pool: PoolSql,
  crearLector: (conexion: ConexionSql) => { porUid(uid: string): Promise<CuentaAutorizada | null> },
  activar: (conexion: ConexionSql, uid: string, version: Version) => Promise<boolean>,
): RepositorioCuenta {
  return Object.freeze({
    async porUid(uid: string): Promise<CuentaAutorizada | null> {
      return enTransaccion(pool, (conexion) => crearLector(conexion).porUid(uid));
    },
    async activarPendiente(uid: string, versionEsperada: Version): Promise<boolean> {
      if (!Number.isSafeInteger(Number(versionEsperada) + 1)) return false;
      return enTransaccion(pool, (conexion) => activar(conexion, uid, versionEsperada));
    },
  });
}

async function enTransaccion<T>(pool: PoolSql, accion: (conexion: ConexionSql) => Promise<T>): Promise<T> {
  const conexion = await pool.adquirir();
  let iniciada = false;
  let descartar = false;
  try {
    await conexion.iniciar();
    iniciada = true;
    const resultado = await accion(conexion);
    await conexion.confirmar();
    iniciada = false;
    return resultado;
  } catch (error: unknown) {
    if (iniciada) {
      try { await conexion.revertir(); } catch { descartar = true; }
    }
    throw error;
  } finally {
    conexion.liberar(descartar);
  }
}

function numeroRevision(valor: unknown): number {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && /^\d+$/.test(valor)) return Number(valor);
  return Number.NaN;
}
