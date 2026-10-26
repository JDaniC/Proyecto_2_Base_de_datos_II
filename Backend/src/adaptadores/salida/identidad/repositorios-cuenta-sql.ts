import type { CuentaAutorizada } from '../../../aplicacion/puertos/contexto-autenticado.js';
import type { RepositorioCuenta } from '../../../aplicacion/puertos/repositorio-cuenta.js';
import type { Version } from '../../../dominio/compartido/version.js';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import type { AuditoriaActivacionCuenta } from '../../../aplicacion/puertos/repositorio-cuenta.js';
import type { EventoAuditoria } from '../../../aplicacion/puertos/nucleo.js';
import { marcadorJson, placeholder } from '../sql/tipos-sql.js';
import type { ConexionSql, PoolSql } from '../sql/tipos-sql.js';
import { crearRepositorioCuentaPostgresql } from '../postgresql/repositorio-cuenta-postgresql.js';
import { crearRepositorioCuentaMysql } from '../mysql/repositorio-cuenta-mysql.js';

interface FilaEstadoCuenta extends Record<string, unknown> {
  readonly id_publico: unknown;
  readonly estado: unknown;
  readonly revision: unknown;
}

export function crearRepositorioCuentaInstitucionalPostgresql(pool: PoolSql): RepositorioCuenta {
  return crearRepositorioSql(pool, crearRepositorioCuentaPostgresql, async (conexion, uid, revisionEsperada, auditoria) => {
    const actual = await conexion.consultar<FilaEstadoCuenta>(
      'SELECT id_publico, estado, revision FROM usuario WHERE auth_uid = $1 AND institucion_id = $2 FOR UPDATE',
      [uid, 'HOSPITAL_GENERAL'],
    );
    const fila = actual.filas[0];
    if (!fila) return false;
    if (fila.estado === 'ACTIVO') return true;
    if (fila.estado !== 'PENDIENTE' || numeroRevision(fila.revision) !== revisionEsperada) return false;
    const cuentaPublica = typeof fila.id_publico === 'string' ? fila.id_publico : '';
    const actor = await crearRepositorioCuentaPostgresql(conexion).porUid(auditoria.actorUid);
    validarActorProvision(actor, auditoria, 'HOSPITAL_GENERAL');
    const actorSql = await conexion.consultar<{ actor_id: unknown }>(
      "SELECT id_usuario AS actor_id FROM usuario WHERE id_publico = $1 AND auth_uid = $2 AND institucion_id = $3 AND estado = 'ACTIVO' FOR SHARE",
      [actor.id, auditoria.actorUid, 'HOSPITAL_GENERAL'],
    );
    const idActor = numeroRevision(actorSql.filas[0]?.actor_id);
    if (!Number.isSafeInteger(idActor) || idActor < 1 || cuentaPublica !== auditoria.evento.recursoId) {
      throw new ErrorDominio('SIN_PERMISO', 'La cuenta administrativa no está vigente para esta operación.');
    }
    const actualizada = await conexion.consultar<FilaEstadoCuenta>(
      `UPDATE usuario SET estado = 'ACTIVO', revision = revision + 1
        WHERE auth_uid = $1 AND institucion_id = $2 AND estado = 'PENDIENTE' AND revision = $3
        RETURNING estado, revision`,
      [uid, 'HOSPITAL_GENERAL', revisionEsperada],
    );
    if (actualizada.filas.length !== 1) return false;
    await guardarAuditoriaProvision(conexion, 'postgresql', idActor, auditoria.evento);
    return true;
  });
}

export function crearRepositorioCuentaInstitucionalMysql(pool: PoolSql): RepositorioCuenta {
  return crearRepositorioSql(pool, crearRepositorioCuentaMysql, async (conexion, uid, revisionEsperada, auditoria) => {
    const actual = await conexion.consultar<FilaEstadoCuenta>(
      'SELECT id_publico, estado, revision FROM usuario WHERE auth_uid = ? AND institucion_id = ? FOR UPDATE',
      [uid, 'CLINICA_ODONTOLOGICA'],
    );
    const fila = actual.filas[0];
    if (!fila) return false;
    if (fila.estado === 'ACTIVO') return true;
    if (fila.estado !== 'PENDIENTE' || numeroRevision(fila.revision) !== revisionEsperada) return false;
    const cuentaPublica = typeof fila.id_publico === 'string' ? fila.id_publico : '';
    const actor = await crearRepositorioCuentaMysql(conexion).porUid(auditoria.actorUid);
    validarActorProvision(actor, auditoria, 'CLINICA_ODONTOLOGICA');
    const actorSql = await conexion.consultar<{ actor_id: unknown }>(
      "SELECT id_usuario AS actor_id FROM usuario WHERE id_publico = ? AND auth_uid = ? AND institucion_id = ? AND estado = 'ACTIVO' FOR SHARE",
      [actor.id, auditoria.actorUid, 'CLINICA_ODONTOLOGICA'],
    );
    const idActor = numeroRevision(actorSql.filas[0]?.actor_id);
    if (!Number.isSafeInteger(idActor) || idActor < 1 || cuentaPublica !== auditoria.evento.recursoId) {
      throw new ErrorDominio('SIN_PERMISO', 'La cuenta administrativa no está vigente para esta operación.');
    }
    await conexion.consultar(
      `UPDATE usuario SET estado = 'ACTIVO', revision = revision + 1
        WHERE auth_uid = ? AND institucion_id = ? AND estado = 'PENDIENTE' AND revision = ?`,
      [uid, 'CLINICA_ODONTOLOGICA', revisionEsperada],
    );
    const confirmada = await conexion.consultar<FilaEstadoCuenta>(
      'SELECT estado, revision FROM usuario WHERE auth_uid = ? AND institucion_id = ?',
      [uid, 'CLINICA_ODONTOLOGICA'],
    );
    const activada = confirmada.filas[0]?.estado === 'ACTIVO' && numeroRevision(confirmada.filas[0]?.revision) === revisionEsperada + 1;
    if (!activada) return false;
    await guardarAuditoriaProvision(conexion, 'mysql', idActor, auditoria.evento);
    return true;
  });
}

function crearRepositorioSql(
  pool: PoolSql,
  crearLector: (conexion: ConexionSql) => { porUid(uid: string): Promise<CuentaAutorizada | null> },
  activar: (conexion: ConexionSql, uid: string, version: Version, auditoria: AuditoriaActivacionCuenta) => Promise<boolean>,
): RepositorioCuenta {
  return Object.freeze({
    async porUid(uid: string): Promise<CuentaAutorizada | null> {
      return enTransaccion(pool, (conexion) => crearLector(conexion).porUid(uid));
    },
    async activarPendiente(uid: string, versionEsperada: Version, auditoria: AuditoriaActivacionCuenta): Promise<boolean> {
      if (!Number.isSafeInteger(Number(versionEsperada) + 1)) return false;
      return enTransaccion(pool, (conexion) => activar(conexion, uid, versionEsperada, auditoria));
    },
  });
}

function validarActorProvision(
  actor: CuentaAutorizada | null,
  auditoria: AuditoriaActivacionCuenta,
  institucion: 'HOSPITAL_GENERAL' | 'CLINICA_ODONTOLOGICA',
): asserts actor is CuentaAutorizada {
  if (!actor || actor.id !== auditoria.evento.actorId || actor.uid !== auditoria.actorUid ||
      actor.institucion !== institucion || actor.estado !== 'ACTIVA' ||
      !actor.roles.includes('ADMIN_INSTITUCIONAL') || !actor.permisos.includes('usuarios.administrar') ||
      auditoria.evento.caso !== 'CUENTA_PROVISIONADA') {
    throw new ErrorDominio('SIN_PERMISO', 'La cuenta administrativa no está vigente para esta operación.');
  }
}

async function guardarAuditoriaProvision(
  conexion: ConexionSql,
  dialecto: 'postgresql' | 'mysql',
  idActor: number,
  evento: EventoAuditoria,
): Promise<void> {
  const p = (indice: number) => placeholder(dialecto, indice);
  const detalle = JSON.stringify({ correlacion: evento.correlacion });
  await conexion.consultar(
    `INSERT INTO auditoria (id_publico, id_usuario, accion, tabla_afectada, registro_afectado, fecha_hora, detalle) VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}, ${marcadorJson(dialecto, 7)})`,
    [evento.id, idActor, evento.caso, 'usuario', evento.recursoId, fechaDb(evento.fechaHora), detalle],
  );
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

function fechaDb(isoUtc: string): string {
  const fecha = new Date(isoUtc);
  if (!Number.isFinite(fecha.getTime())) throw new Error('INSTANTE_UTC_INVALIDO');
  return fecha.toISOString().replace('T', ' ').replace('Z', '');
}
