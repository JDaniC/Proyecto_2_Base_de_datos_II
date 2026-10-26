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
import type { ClientSession, Db, MongoError } from 'mongodb';
import {
  COLECCIONES_MONGODB,
  type DependenciasUnidadDeTrabajoMongodb,
  INSTITUCION_LABORATORIO,
} from './tipos-mongodb.js';

interface DocumentoOperacionMongo {
  readonly _id: string;
  readonly revision: number;
  readonly institucion_id: string;
  readonly usuario_id: string;
  readonly caso_uso: string;
  readonly clave: string;
  readonly hash_entrada: string;
  readonly recurso_tipo: string;
  readonly recurso_id: string;
  readonly fecha_hora: Date;
  readonly codigo_respuesta: number;
  readonly estado: string;
  readonly respuesta: {
    readonly data: Record<string, unknown>;
    readonly meta: { readonly correlacion: string };
  };
}

interface DocumentoRevisionMongo {
  readonly _id: string;
  readonly revision: number;
  readonly tipo_recurso: string;
  readonly recurso_id: string;
  readonly version: number;
  readonly actor_id: string;
  readonly fecha_hora: Date;
  readonly motivo: string;
  readonly contenido_anterior: unknown;
}

interface DocumentoAuditoriaMongo {
  readonly _id: string;
  readonly revision: number;
  readonly usuario_id: string;
  readonly auth_uid: string;
  readonly institucion_id: string;
  readonly fecha_hora: Date;
  readonly accion: string;
  readonly coleccion: string;
  readonly documento_id: string;
  readonly correlacion: string;
  readonly motivo?: string;
}

export function crearUnidadDeTrabajoMongodb<
  TCuenta = unknown,
  TPaciente = unknown,
  TCita = unknown,
  TConsulta = unknown,
  TResponsable = unknown,
  TProfesional = unknown,
  TEvento = unknown,
>(
  dependencias: DependenciasUnidadDeTrabajoMongodb<
    TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento
  >,
): UnidadDeTrabajo<TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento> {
  const reintentosMaximos = dependencias.reintentosMaximos ?? 3;
  if (!Number.isSafeInteger(reintentosMaximos) || reintentosMaximos < 1 || reintentosMaximos > 3) {
    throw new Error('REINTENTOS_MONGODB_FUERA_DE_RANGO');
  }

  const db = dependencias.cliente.db;

  return Object.freeze({
    async ejecutar<T, TEstado = unknown, TSnapshot = unknown>(
      contexto: ContextoAutenticado,
      comando: ComandoEstable,
      planificar: (
        lector: LectorTransaccional<TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento>,
      ) => Promise<PlanDeEscrituras<T, TEstado, TSnapshot>>,
    ): Promise<ResultadoDurable<T>> {
      if (contexto.identidad.institucion !== INSTITUCION_LABORATORIO) {
        throw new ErrorDominio('SIN_PERMISO', 'La institución del contexto no corresponde a Laboratorio.');
      }

      for (let intento = 1; intento <= reintentosMaximos; intento += 1) {
        const session = dependencias.cliente.iniciarSesion();
        let enTransaccion = false;
        let confirmando = false;

        try {
          session.startTransaction({
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' },
          });
          enTransaccion = true;

          const opExistente = await db
            .collection<DocumentoOperacionMongo>(COLECCIONES_MONGODB.OPERACIONES)
            .findOne(
              {
                institucion_id: INSTITUCION_LABORATORIO,
                usuario_id: contexto.cuenta.id,
                caso_uso: comando.caso,
                clave: comando.claveIdempotencia,
              },
              { session },
            );

          const lector = dependencias.crearLector(db, session, contexto.cuenta.id);

          if (opExistente !== null) {
            await verificarCuentaVigente(contexto, lector);
            const respuesta = resolverRepeticion<T>(
              {
                hashEntrada: opExistente.hash_entrada,
                resultado: {
                  httpStatus: opExistente.codigo_respuesta,
                  respuesta: opExistente.respuesta as T,
                  correlacionOriginal: uuidPublico(opExistente.respuesta.meta.correlacion),
                },
              },
              comando,
            );
            await session.abortTransaction();
            enTransaccion = false;
            return respuesta;
          }

          const plan = await planificar(lector);
          if (plan.tipo === 'REPETIR') {
            await verificarCuentaVigente(contexto, lector);
            const respuesta = resolverRepeticion(plan.operacion, comando);
            await session.abortTransaction();
            enTransaccion = false;
            return respuesta;
          }

          await guardarRevisiones(db, session, contexto, comando, plan.revisiones);
          await dependencias.aplicarCambios(db, session, contexto, comando, plan.cambios);
          await guardarAuditoria(db, session, contexto, comando, plan.auditoria, plan.cambios);
          await guardarOperacion(db, session, contexto, comando, plan.resultado);

          confirmando = true;
          await session.commitTransaction();
          enTransaccion = false;
          return plan.resultado;
        } catch (error) {
          if (enTransaccion) {
            try {
              await session.abortTransaction();
            } catch (_abortError) {
              // Ignorar fallo al abortar transacción ya fallida
            }
            enTransaccion = false;
          }

          if (esConflictoOperacion(error)) {
            const reconciliada = await leerOperacionDirecta<T>(db, contexto, comando);
            if (reconciliada !== null) return resolverRepeticion(reconciliada, comando);
            throw new ErrorDominio('ESTADO_INVALIDO', 'El cambio entra en conflicto con datos ya existentes.');
          }

          if (confirmando && tieneEtiqueta(error, 'UnknownTransactionCommitResult')) {
            const reconciliada = await leerOperacionDirecta<T>(db, contexto, comando);
            if (reconciliada !== null) return resolverRepeticion(reconciliada, comando);
            throw new ErrorDominio(
              'PERSISTENCIA_NO_DISPONIBLE',
              'No se pudo confirmar el resultado; reintente con la misma clave.',
            );
          }

          if (esTransitoria(error) && intento < reintentosMaximos) {
            await (dependencias.esperarReintento?.(intento) ?? esperar(25 * intento));
            continue;
          }

          if (error instanceof ErrorDominio) throw error;
          const traducido = traducirErrorMongo(error);
          if (traducido !== null) throw traducido;
          throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible completar la operación de persistencia.');
        } finally {
          await session.endSession();
        }
      }

      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible completar la operación de persistencia.');
    },
  });
}

async function verificarCuentaVigente<TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento>(
  contexto: ContextoAutenticado,
  lector: LectorTransaccional<TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento>,
): Promise<void> {
  const cuenta = (await lector.cuentas.porUid(contexto.identidad.uid)) as ContextoAutenticado['cuenta'] | null;
  const actual = (valores: readonly string[]) => [...valores].sort().join('\u0000');
  if (
    cuenta === null ||
    cuenta.estado !== 'ACTIVA' ||
    cuenta.id !== contexto.cuenta.id ||
    cuenta.uid !== contexto.identidad.uid ||
    cuenta.institucion !== contexto.identidad.institucion ||
    cuenta.version !== contexto.cuenta.version ||
    actual(cuenta.roles) !== actual(contexto.cuenta.roles) ||
    actual(cuenta.permisos) !== actual(contexto.cuenta.permisos) ||
    cuenta.profesional?.id !== contexto.cuenta.profesional?.id ||
    cuenta.profesional?.activo !== contexto.cuenta.profesional?.activo
  ) {
    throw new ErrorDominio('SIN_PERMISO', 'La autorización actual no permite recuperar este resultado.');
  }
}

function resolverRepeticion<T>(operacion: OperacionIdempotente<T>, comando: ComandoEstable): ResultadoDurable<T> {
  if (operacion.hashEntrada !== comando.hashEntrada) {
    throw new ErrorDominio('CLAVE_REUTILIZADA', 'La clave de idempotencia ya se usó con otra solicitud.');
  }
  return operacion.resultado;
}

async function guardarRevisiones(
  db: Db,
  session: ClientSession,
  contexto: ContextoAutenticado,
  comando: ComandoEstable,
  revisiones: readonly RevisionPlanificada[],
): Promise<void> {
  for (const revision of revisiones) {
    await db.collection<DocumentoRevisionMongo>(COLECCIONES_MONGODB.REVISIONES).insertOne(
      {
        _id: revision.id,
        revision: 1,
        tipo_recurso: revision.agregado,
        recurso_id: revision.recursoId,
        version: revision.versionAnterior,
        actor_id: contexto.cuenta.id,
        fecha_hora: new Date(comando.instante),
        motivo: comando.caso,
        contenido_anterior: revision.snapshotAnterior,
      },
      { session },
    );
  }
}

async function guardarAuditoria(
  db: Db,
  session: ClientSession,
  contexto: ContextoAutenticado,
  comando: ComandoEstable,
  eventos: readonly EventoAuditoria[],
  cambios: readonly CambioPlanificado[],
): Promise<void> {
  const coleccionAfectada = cambios[0]?.agregado ?? comando.caso;
  for (const ev of eventos) {
    await db.collection<DocumentoAuditoriaMongo>(COLECCIONES_MONGODB.AUDITORIA).insertOne(
      {
        _id: ev.id,
        revision: 1,
        usuario_id: ev.actorId,
        auth_uid: contexto.cuenta.uid,
        institucion_id: INSTITUCION_LABORATORIO,
        fecha_hora: new Date(ev.fechaHora),
        accion: ev.caso,
        coleccion: coleccionAfectada,
        documento_id: ev.recursoId,
        correlacion: ev.correlacion,
        ...(ev.motivo ? { motivo: ev.motivo } : {}),
      },
      { session },
    );
  }
}

async function guardarOperacion<T>(
  db: Db,
  session: ClientSession,
  contexto: ContextoAutenticado,
  comando: ComandoEstable,
  resultado: ResultadoDurable<T>,
): Promise<void> {
  const respuestaSegura = resultado.respuesta as {
    readonly data?: Record<string, unknown>;
    readonly meta?: { readonly correlacion?: string };
  };
  const meta = respuestaSegura.meta ?? { correlacion: resultado.correlacionOriginal };
  const data = respuestaSegura.data ?? (resultado.respuesta as Record<string, unknown>);

  await db.collection<DocumentoOperacionMongo>(COLECCIONES_MONGODB.OPERACIONES).insertOne(
    {
      _id: `${contexto.cuenta.id}__${comando.caso}__${comando.claveIdempotencia}`,
      revision: 1,
      institucion_id: INSTITUCION_LABORATORIO,
      usuario_id: contexto.cuenta.id,
      caso_uso: comando.caso,
      clave: comando.claveIdempotencia,
      hash_entrada: comando.hashEntrada,
      recurso_tipo: comando.caso,
      recurso_id: comando.id,
      fecha_hora: new Date(comando.instante),
      codigo_respuesta: resultado.httpStatus,
      estado: 'CONFIRMADA',
      respuesta: {
        data,
        meta: { correlacion: meta.correlacion ?? resultado.correlacionOriginal },
      },
    },
    { session },
  );
}

async function leerOperacionDirecta<T>(
  db: Db,
  contexto: ContextoAutenticado,
  comando: ComandoEstable,
): Promise<OperacionIdempotente<T> | null> {
  try {
    const doc = await db
      .collection<DocumentoOperacionMongo>(COLECCIONES_MONGODB.OPERACIONES)
      .findOne({
        institucion_id: INSTITUCION_LABORATORIO,
        usuario_id: contexto.cuenta.id,
        caso_uso: comando.caso,
        clave: comando.claveIdempotencia,
      });

    if (doc === null) return null;

    return {
      hashEntrada: doc.hash_entrada,
      resultado: {
        httpStatus: doc.codigo_respuesta,
        respuesta: doc.respuesta as T,
        correlacionOriginal: uuidPublico(doc.respuesta.meta.correlacion),
      },
    };
  } catch (_error) {
    return null;
  }
}

function traducirErrorMongo(error: unknown): ErrorDominio | null {
  if (typeof error !== 'object' || error === null) return null;
  const codigo = 'code' in error ? Number((error as MongoError).code) : NaN;
  if (codigo === 121) {
    return new ErrorDominio('ESTADO_INVALIDO', 'El documento no cumple las restricciones del esquema de MongoDB.');
  }
  if (codigo === 11000) {
    return new ErrorDominio('ESTADO_INVALIDO', 'El registro ya existe en MongoDB.');
  }
  if (codigo === 13) {
    return new ErrorDominio('SIN_PERMISO', 'Permiso denegado en MongoDB.');
  }
  return null;
}

function esConflictoOperacion(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const codigo = 'code' in error ? Number((error as MongoError).code) : NaN;
  return codigo === 11000;
}

function esTransitoria(error: unknown): boolean {
  if (tieneEtiqueta(error, 'TransientTransactionError')) return true;
  if (typeof error !== 'object' || error === null) return false;
  const codigo = 'code' in error ? Number((error as MongoError).code) : NaN;
  return codigo === 112 || codigo === 251; // 112: WriteConflict, 251: NoSuchTransaction
}

function tieneEtiqueta(error: unknown, etiqueta: string): boolean {
  if (typeof error !== 'object' || error === null) return false;
  return (
    'hasErrorLabel' in error &&
    typeof (error as { hasErrorLabel: (lbl: string) => boolean }).hasErrorLabel === 'function' &&
    (error as { hasErrorLabel: (lbl: string) => boolean }).hasErrorLabel(etiqueta)
  );
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
