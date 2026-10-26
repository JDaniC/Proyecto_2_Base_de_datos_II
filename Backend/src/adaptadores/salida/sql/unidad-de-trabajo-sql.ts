import type {
  CambioPlanificado,
  ComandoEstable,
  EventoAuditoria,
  LectorTransaccional,
  OperacionIdempotente,
  PlanDeEscrituras,
  ResultadoDurable,
  RevisionPlanificada,
  UnidadDeTrabajo,
} from '../../../aplicacion/puertos/nucleo.js';
import type { ContextoAutenticado } from '../../../aplicacion/puertos/contexto-autenticado.js';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import type { DialectoSql, EjecutorSql, PoolSql } from './tipos-sql.js';
import { marcadorJson, placeholder } from './tipos-sql.js';

interface FilaOperacion extends Record<string, unknown> {
  hash_entrada: string;
  codigo_respuesta: number | string;
  respuesta: unknown;
}

interface FilaActor extends Record<string, unknown> {
  actor_id: number | string;
}

export interface DependenciasUnidadDeTrabajoSql<
  TCuenta = unknown,
  TPaciente = unknown,
  TCita = unknown,
  TConsulta = unknown,
  TResponsable = unknown,
  TProfesional = unknown,
  TEvento = unknown,
> {
  readonly dialecto: DialectoSql;
  readonly pool: PoolSql;
  readonly reintentosMaximos?: number;
  /** Implementado por el bundle institucional; todas las consultas usan este executor. */
  readonly crearLector: (
    executor: EjecutorSql,
    idUsuarioInterno: number,
  ) => LectorTransaccional<TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento>;
  /** Mapper tipado por agregado; no recibe SQL ni puede abrir otra conexión. */
  readonly aplicarCambios: (
    executor: EjecutorSql,
    contexto: ContextoAutenticado,
    comando: ComandoEstable,
    cambios: readonly CambioPlanificado[],
  ) => Promise<void>;
  readonly esperarReintento?: (intento: number) => Promise<void>;
}

/** Ejecuta un comando y sus metadatos durables sobre una única conexión SQL. */
export function crearUnidadDeTrabajoSql<
  TCuenta = unknown,
  TPaciente = unknown,
  TCita = unknown,
  TConsulta = unknown,
  TResponsable = unknown,
  TProfesional = unknown,
  TEvento = unknown,
>(
  dependencias: DependenciasUnidadDeTrabajoSql<
    TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento
  >,
): UnidadDeTrabajo<TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento> {
  const intentos = dependencias.reintentosMaximos ?? 3;
  if (!Number.isSafeInteger(intentos) || intentos < 1 || intentos > 3) {
    throw new Error('REINTENTOS_SQL_FUERA_DE_RANGO');
  }

  return Object.freeze({
    async ejecutar<T, TEstado = unknown, TSnapshot = unknown>(
      contexto: ContextoAutenticado,
      comando: ComandoEstable,
      planificar: (lector: LectorTransaccional<
        TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento
      >) => Promise<PlanDeEscrituras<T, TEstado, TSnapshot>>,
    ): Promise<ResultadoDurable<T>> {
      for (let intento = 1; intento <= intentos; intento += 1) {
        try {
          return await ejecutarIntento(dependencias, contexto, comando, planificar);
        } catch (error) {
          if (esConflictoOperacion(error)) {
            const duradera = await leerOperacionPool<T>(dependencias, contexto, comando);
            if (duradera !== null) return resolverRepeticion(duradera, comando);
            throw new ErrorDominio('ESTADO_INVALIDO', 'El cambio entra en conflicto con datos ya existentes.');
          }
          if (esDeadlock(error) && intento < intentos) {
            await (dependencias.esperarReintento?.(intento) ?? esperar(20 * intento));
            continue;
          }
          if (esErrorDominio(error)) throw error;
          const traducido = traducirErrorSql(error);
          if (traducido !== null) throw traducido;
          throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible completar la operación de persistencia.');
        }
      }
      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible completar la operación de persistencia.');
    },
  });
}

async function ejecutarIntento<T, TEstado, TSnapshot, TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento>(
  deps: DependenciasUnidadDeTrabajoSql<TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento>,
  contexto: ContextoAutenticado,
  comando: ComandoEstable,
  planificar: (lector: LectorTransaccional<TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento>) => Promise<PlanDeEscrituras<T, TEstado, TSnapshot>>,
): Promise<ResultadoDurable<T>> {
  const conexion = await deps.pool.adquirir();
  let iniciada = false;
  let confirmando = false;
  let inicioEnCurso = false;
  let liberada = false;
  const liberarConexion = (descartar = false) => {
    if (!liberada) {
      conexion.liberar(descartar);
      liberada = true;
    }
  };
  try {
    inicioEnCurso = true;
    await conexion.iniciar();
    iniciada = true;
    inicioEnCurso = false;
    await establecerUtc(conexion, deps.dialecto);
    const idUsuario = await resolverUsuario(conexion, deps.dialecto, contexto);
    const lector = crearLectorConOperaciones(deps, conexion, idUsuario, contexto.cuenta.id);
    const previa = await lector.operaciones.porClave<T>(
      contexto.cuenta.id, comando.caso, comando.claveIdempotencia,
    );
    if (previa !== null) {
      await verificarCuentaVigente(contexto, lector);
      const respuesta = resolverRepeticion(previa, comando);
      await conexion.confirmar();
      iniciada = false;
      return respuesta;
    }

    const plan = await planificar(lector);
    if (plan.tipo === 'REPETIR') {
      await verificarCuentaVigente(contexto, lector);
      const respuesta = resolverRepeticion(plan.operacion, comando);
      await conexion.confirmar();
      iniciada = false;
      return respuesta;
    }

    await guardarRevisiones(conexion, deps.dialecto, idUsuario, comando, plan.revisiones);
    await deps.aplicarCambios(conexion, contexto, comando, plan.cambios);
    await guardarAuditoria(conexion, deps.dialecto, idUsuario, plan.auditoria, plan.cambios);
    await guardarOperacion(conexion, deps.dialecto, idUsuario, comando, plan.resultado);
    confirmando = true;
    await conexion.confirmar();
    iniciada = false;
    return plan.resultado;
  } catch (error) {
    if (confirmando && !esRechazoSqlDefinitivo(error)) {
      liberarConexion(true);
      const duradera = await leerOperacionPool<T>(deps, contexto, comando);
      if (duradera !== null) return resolverRepeticion(duradera, comando);
      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No se pudo confirmar el resultado; reintente con la misma clave.');
    }
    if (iniciada) {
      try { await conexion.revertir(); } catch { liberarConexion(true); }
      iniciada = false;
    }
    if (inicioEnCurso || esErrorTransporteSql(error)) liberarConexion(true);
    throw error;
  } finally {
    liberarConexion();
  }
}

function crearLectorConOperaciones<TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento>(
  deps: DependenciasUnidadDeTrabajoSql<TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento>,
  executor: EjecutorSql,
  idUsuario: number,
  actorPublico: string,
): LectorTransaccional<TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento> {
  const base = deps.crearLector(executor, idUsuario);
  const operaciones: LectorTransaccional<TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento>['operaciones'] = {
    async porClave<T>(actorId: string, caso: string, claveIdempotencia: string): Promise<OperacionIdempotente<T> | null> {
      if (actorId !== actorPublico) return null;
      const p = (n: number) => placeholder(deps.dialecto, n);
      const result = await executor.consultar<FilaOperacion>(
        `SELECT hash_entrada, codigo_respuesta, respuesta FROM operaciones WHERE id_usuario = ${p(1)} AND caso_uso = ${p(2)} AND clave = ${p(3)}`,
        [idUsuario, caso, claveIdempotencia],
      );
      const row = result.filas[0];
      return row === undefined ? null : deserializarOperacion<T>(row);
    },
  };
  return {
    ...base,
    operaciones,
  };
}

async function resolverUsuario(
  executor: EjecutorSql,
  dialecto: DialectoSql,
  contexto: ContextoAutenticado,
): Promise<number> {
  const p = (n: number) => placeholder(dialecto, n);
  const result = await executor.consultar<FilaActor>(
    `SELECT id_usuario AS actor_id FROM usuario WHERE id_publico = ${p(1)} AND auth_uid = ${p(2)} AND institucion_id = ${p(3)} AND estado = 'ACTIVO' FOR SHARE`,
    [contexto.cuenta.id, contexto.identidad.uid, contexto.identidad.institucion],
  );
  const valor = result.filas[0]?.actor_id;
  const id = typeof valor === 'number' ? valor : typeof valor === 'string' ? Number(valor) : NaN;
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new ErrorDominio('SIN_PERMISO', 'La cuenta local ya no está disponible para este comando.');
  }
  return id;
}

async function verificarCuentaVigente<TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento>(
  contexto: ContextoAutenticado,
  lector: LectorTransaccional<TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento>,
): Promise<void> {
  const cuenta = await lector.cuentas.porUid(contexto.identidad.uid) as ContextoAutenticado['cuenta'] | null;
  const actual = (valores: readonly string[]) => [...valores].sort().join('\u0000');
  if (cuenta === null || cuenta.estado !== 'ACTIVA' || cuenta.id !== contexto.cuenta.id ||
      cuenta.uid !== contexto.identidad.uid || cuenta.institucion !== contexto.identidad.institucion ||
      cuenta.version !== contexto.cuenta.version || actual(cuenta.roles) !== actual(contexto.cuenta.roles) ||
      actual(cuenta.permisos) !== actual(contexto.cuenta.permisos) ||
      cuenta.profesional?.id !== contexto.cuenta.profesional?.id ||
      cuenta.profesional?.activo !== contexto.cuenta.profesional?.activo) {
    throw new ErrorDominio('SIN_PERMISO', 'La autorización actual no permite recuperar este resultado.');
  }
}

async function guardarRevisiones(
  executor: EjecutorSql,
  dialecto: DialectoSql,
  idUsuario: number,
  comando: ComandoEstable,
  revisiones: readonly RevisionPlanificada[],
): Promise<void> {
  const p = (n: number) => placeholder(dialecto, n);
  for (const revision of revisiones) {
    const snapshot = jsonSeguro(revision.snapshotAnterior);
    await executor.consultar(
      `INSERT INTO revisiones (id_revision, tipo_recurso, recurso_id, version, id_usuario, fecha_hora, motivo, contenido_anterior) VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}, ${p(7)}, ${marcadorJson(dialecto, 8)})`,
      [revision.id, revision.agregado, revision.recursoId, revision.versionAnterior, idUsuario,
        fechaDb(comando.instante), comando.caso, snapshot],
    );
  }
}

async function guardarAuditoria(
  executor: EjecutorSql,
  dialecto: DialectoSql,
  idUsuario: number,
  eventos: readonly EventoAuditoria[],
  cambios: readonly CambioPlanificado[],
): Promise<void> {
  const p = (n: number) => placeholder(dialecto, n);
  for (const evento of eventos) {
    const cambio = cambios.find((item) => item.recursoId === evento.recursoId);
    const tabla = cambio?.agregado ?? evento.caso;
    const detalle = JSON.stringify({
      correlacion: evento.correlacion,
      ...(evento.motivo === undefined ? {} : { motivo: evento.motivo }),
    });
    await executor.consultar(
      `INSERT INTO auditoria (id_publico, id_usuario, accion, tabla_afectada, registro_afectado, fecha_hora, detalle) VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}, ${marcadorJson(dialecto, 7)})`,
      [evento.id, idUsuario, evento.caso, tabla, evento.recursoId, fechaDb(evento.fechaHora), detalle],
    );
  }
}

async function guardarOperacion<T>(
  executor: EjecutorSql,
  dialecto: DialectoSql,
  idUsuario: number,
  comando: ComandoEstable,
  resultado: ResultadoDurable<T>,
): Promise<void> {
  const p = (n: number) => placeholder(dialecto, n);
  const payload = JSON.stringify({ respuesta: resultado.respuesta, correlacionOriginal: resultado.correlacionOriginal });
  if (payload === undefined) throw new Error('RESPUESTA_NO_SERIALIZABLE');
  await executor.consultar(
    `INSERT INTO operaciones (id_operacion, id_usuario, caso_uso, clave, hash_entrada, codigo_respuesta, respuesta, fecha_hora) VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}, ${marcadorJson(dialecto, 7)}, ${p(8)})`,
    [comando.id, idUsuario, comando.caso, comando.claveIdempotencia, comando.hashEntrada,
      resultado.httpStatus, payload, fechaDb(comando.instante)],
  );
}

async function leerOperacionPool<T>(
  deps: DependenciasUnidadDeTrabajoSql,
  contexto: ContextoAutenticado,
  comando: ComandoEstable,
): Promise<OperacionIdempotente<T> | null> {
  const conexion = await deps.pool.adquirir();
  let iniciada = false;
  let liberada = false;
  const liberar = (descartar = false) => {
    if (!liberada) {
      conexion.liberar(descartar);
      liberada = true;
    }
  };
  try {
    await conexion.iniciar();
    iniciada = true;
    await establecerUtc(conexion, deps.dialecto);
    const id = await resolverUsuario(conexion, deps.dialecto, contexto);
    const lector = crearLectorConOperaciones(deps, conexion, id, contexto.cuenta.id);
    await verificarCuentaVigente(contexto, lector);
    const result = await lector.operaciones.porClave<T>(
      contexto.cuenta.id, comando.caso, comando.claveIdempotencia,
    );
    await conexion.confirmar();
    iniciada = false;
    return result;
  } catch (error) {
    if (iniciada) {
      try { await conexion.revertir(); } catch { liberar(true); }
      iniciada = false;
    }
    if (esErrorDominio(error)) throw error;
    throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No se pudo reconciliar la clave de operación. Reintente con la misma clave.');
  } finally {
    liberar();
  }
}

function deserializarOperacion<T>(row: FilaOperacion): OperacionIdempotente<T> {
  const valor = typeof row.respuesta === 'string' ? JSON.parse(row.respuesta) as unknown : row.respuesta;
  if (typeof valor !== 'object' || valor === null || !('respuesta' in valor) || !('correlacionOriginal' in valor)) {
    throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'El resultado guardado no tiene el formato esperado.');
  }
  const status = Number(row.codigo_respuesta);
  if (!Number.isInteger(status) || status < 200 || status > 299) {
    throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'El resultado guardado no tiene el formato esperado.');
  }
  const envelope = valor as { respuesta: T; correlacionOriginal: string };
  return {
    hashEntrada: String(row.hash_entrada),
    resultado: {
      httpStatus: status,
      respuesta: envelope.respuesta,
      correlacionOriginal: uuidPublico(envelope.correlacionOriginal, 'correlacion_original'),
    },
  };
}

function resolverRepeticion<T>(operacion: OperacionIdempotente<T>, comando: ComandoEstable): ResultadoDurable<T> {
  if (operacion.hashEntrada !== comando.hashEntrada) {
    throw new ErrorDominio('CLAVE_REUTILIZADA', 'La clave de idempotencia ya se usó con otra solicitud.');
  }
  return operacion.resultado;
}

async function establecerUtc(executor: EjecutorSql, dialecto: DialectoSql): Promise<void> {
  if (dialecto === 'postgresql') await executor.consultar("SET LOCAL TIME ZONE 'UTC'");
  else await executor.consultar("SET time_zone = '+00:00'");
}

function fechaDb(isoUtc: string): string {
  const fecha = new Date(isoUtc);
  if (!Number.isFinite(fecha.getTime())) throw new Error('INSTANTE_UTC_INVALIDO');
  return fecha.toISOString().replace('T', ' ').replace('Z', '');
}

function jsonSeguro(valor: unknown): string {
  const json = JSON.stringify(valor);
  if (json === undefined) throw new Error('SNAPSHOT_NO_SERIALIZABLE');
  return json;
}

function esErrorDominio(error: unknown): error is ErrorDominio {
  return error instanceof ErrorDominio;
}

function esDeadlock(error: unknown): boolean {
  const codigo = codigoSql(error);
  return codigo === '40P01' || codigo === '1213' || codigo === 'ER_LOCK_DEADLOCK' ||
    codigo === '40001' || codigo === '1205' || codigo === 'ER_LOCK_WAIT_TIMEOUT';
}

function esConflictoOperacion(error: unknown): boolean {
  const codigo = codigoSql(error);
  return codigo === '23505' || codigo === '1062' || codigo === 'ER_DUP_ENTRY';
}

function codigoSql(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

function traducirErrorSql(error: unknown): ErrorDominio | null {
  const codigo = codigoSql(error);
  if (codigo === 'ER_SIGNAL_EXCEPTION' || estadoSql(error) === '45000' || codigo === '1644') {
    return new ErrorDominio('ESTADO_INVALIDO', 'El cambio no cumple las reglas de persistencia vigentes.');
  }
  if (codigo === '42501' || codigo === '1142' || codigo === '1227' || codigo === 'ER_TABLEACCESS_DENIED_ERROR') {
    return new ErrorDominio('SIN_PERMISO', 'La cuenta de aplicación no tiene permiso para completar este cambio.');
  }
  if (codigo === '23503' || codigo === '1452' || codigo === 'ER_NO_REFERENCED_ROW_2') {
    return new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'Una referencia requerida ya no está disponible.');
  }
  if (codigo === '23514' || codigo === '3819' || codigo === '4025' || codigo === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return new ErrorDominio('ESTADO_INVALIDO', 'El cambio no cumple las restricciones vigentes.');
  }
  if (codigo === '22001' || codigo === '22003' || codigo === 'ER_DATA_TOO_LONG' || codigo === 'ER_WARN_DATA_OUT_OF_RANGE') {
    return new ErrorDominio('SOLICITUD_INVALIDA', 'Un valor excede los límites de persistencia.');
  }
  return null;
}

function estadoSql(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('sqlState' in error)) return undefined;
  const state = (error as { sqlState?: unknown }).sqlState;
  return typeof state === 'string' ? state : undefined;
}

/** Los rechazos SQL recibidos del servidor son definitivos; errores de conexión pueden tener commit incierto. */
function esRechazoSqlDefinitivo(error: unknown): boolean {
  const codigo = codigoSql(error);
  if (esErrorTransporteSql(error)) return false;
  if (codigo !== undefined && /^[0-9A-Z]{5}$/.test(codigo) && esErrorServidorSql(error)) {
    return !codigo.startsWith('08') && !['57P01', '57P02', '57P03'].includes(codigo);
  }
  if (codigo === 'ER_SIGNAL_EXCEPTION' || codigo?.startsWith('ER_')) return true;
  if (typeof error === 'object' && error !== null && 'errno' in error) {
    const errno = (error as { errno?: unknown }).errno;
    return typeof errno === 'number' && errno > 0 && !['PROTOCOL_SEQUENCE_TIMEOUT', 'PROTOCOL_CONNECTION_LOST'].includes(codigo ?? '');
  }
  return false;
}

function esErrorServidorSql(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  return 'severity' in error || 'sqlState' in error || 'errno' in error;
}

function esErrorTransporteSql(error: unknown): boolean {
  const codigo = codigoSql(error);
  return codigo === 'EPIPE' || codigo === 'ECONNRESET' || codigo === 'ECONNREFUSED' ||
    codigo === 'ETIMEDOUT' || codigo === 'PROTOCOL_SEQUENCE_TIMEOUT' ||
    codigo === 'PROTOCOL_CONNECTION_LOST';
}

async function esperar(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}
