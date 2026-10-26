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
import type { Transaction } from 'firebase-admin/firestore';
import {
  type DependenciasUnidadDeTrabajoFirestore,
  INSTITUCION_PEDIATRIA,
} from './tipos-firestore.js';
import {
  claveOperacion,
  validarDocumento,
  ErrorModelo,
} from './validador-firestore.js';

interface DatosOperacionFirestore {
  readonly hash_entrada: string;
  readonly codigo_respuesta: number;
  readonly respuesta: {
    readonly data: Record<string, unknown>;
    readonly meta: { readonly correlacion: string };
  };
}

export function crearUnidadDeTrabajoFirestore<
  TCuenta = unknown,
  TPaciente = unknown,
  TCita = unknown,
  TConsulta = unknown,
  TResponsable = unknown,
  TProfesional = unknown,
  TEvento = unknown,
>(
  dependencias: DependenciasUnidadDeTrabajoFirestore<
    TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento
  >,
): UnidadDeTrabajo<TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento> {
  const reintentosMaximos = dependencias.reintentosMaximos ?? 3;
  if (!Number.isSafeInteger(reintentosMaximos) || reintentosMaximos < 1 || reintentosMaximos > 5) {
    throw new Error('REINTENTOS_FIRESTORE_FUERA_DE_RANGO');
  }

  const firestore = dependencias.cliente.firestore;

  return Object.freeze({
    async ejecutar<T, TEstado = unknown, TSnapshot = unknown>(
      contexto: ContextoAutenticado,
      comando: ComandoEstable,
      planificar: (
        lector: LectorTransaccional<TCuenta, TPaciente, TCita, TConsulta, TResponsable, TProfesional, TEvento>,
      ) => Promise<PlanDeEscrituras<T, TEstado, TSnapshot>>,
    ): Promise<ResultadoDurable<T>> {
      if (contexto.identidad.institucion !== INSTITUCION_PEDIATRIA) {
        throw new ErrorDominio('SIN_PERMISO', 'La institución del contexto no corresponde a Pediatría.');
      }

      for (let intento = 1; intento <= reintentosMaximos; intento += 1) {
        try {
          return await firestore.runTransaction(async (transaction: Transaction) => {
            const claveOp = claveOperacion(
              INSTITUCION_PEDIATRIA,
              contexto.cuenta.id,
              comando.caso,
              comando.claveIdempotencia,
            );
            const refOp = firestore.doc(`operaciones/${claveOp}`);

            // 1. TODAS LAS LECTURAS PRECEDEN A LAS ESCRITURAS (RNF-022)
            const snapOp = await transaction.get(refOp);
            const lector = dependencias.crearLector(transaction, contexto.cuenta.id);

            if (snapOp.exists) {
              const datosOp = snapOp.data() as DatosOperacionFirestore;
              await verificarCuentaVigente(contexto, lector);
              return resolverRepeticion<T>(
                {
                  hashEntrada: datosOp.hash_entrada,
                  resultado: {
                    httpStatus: datosOp.codigo_respuesta,
                    respuesta: datosOp.respuesta as T,
                    correlacionOriginal: uuidPublico(datosOp.respuesta.meta.correlacion),
                  },
                },
                comando,
              );
            }

            const plan = await planificar(lector);
            if (plan.tipo === 'REPETIR') {
              await verificarCuentaVigente(contexto, lector);
              return resolverRepeticion(plan.operacion, comando);
            }

            // 2. APLICAR ESCRITURAS TRAS FINALIZAR LAS LECTURAS
            await guardarRevisiones(transaction, firestore, contexto, comando, plan.revisiones);
            await dependencias.aplicarCambios(transaction, contexto, comando, plan.cambios);
            await guardarAuditoria(transaction, firestore, contexto, comando, plan.auditoria, plan.cambios);
            await guardarOperacion(transaction, firestore, contexto, comando, claveOp, plan.resultado);

            return plan.resultado;
          }, { maxAttempts: 1 });
        } catch (error) {
          if (esConflictoConcurrente(error) && intento < reintentosMaximos) {
            await (dependencias.esperarReintento?.(intento) ?? esperar(30 * intento));
            continue;
          }
          if (error instanceof ErrorDominio) throw error;
          if (error instanceof ErrorModelo) {
            throw traducirErrorModelo(error);
          }
          const traducido = traducirErrorFirestore(error);
          if (traducido !== null) throw traducido;
          throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible completar la operación de persistencia.');
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
  transaction: Transaction,
  firestore: import('firebase-admin/firestore').Firestore,
  contexto: ContextoAutenticado,
  comando: ComandoEstable,
  revisiones: readonly RevisionPlanificada[],
): Promise<void> {
  for (const revision of revisiones) {
    const ruta = `${revision.agregado}/${revision.recursoId}/versiones/${revision.id}`;
    const datos = {
      revision: 1,
      version: revision.versionAnterior,
      actor_id: contexto.cuenta.id,
      fecha_hora: new Date(comando.instante),
      motivo: comando.caso,
      contenido_anterior: revision.snapshotAnterior,
    };
    const validado = validarDocumento(ruta, datos);
    transaction.create(firestore.doc(ruta), validado as Record<string, unknown>);
  }
}

async function guardarAuditoria(
  transaction: Transaction,
  firestore: import('firebase-admin/firestore').Firestore,
  contexto: ContextoAutenticado,
  _comando: ComandoEstable,
  eventos: readonly EventoAuditoria[],
  cambios: readonly CambioPlanificado[],
): Promise<void> {
  for (const ev of eventos) {
    const cambio = cambios.find((item) => item.recursoId === ev.recursoId);
    const tipoRecurso = cambio?.agregado ?? ev.caso;
    const ruta = `auditoria/${ev.id}`;
    const datos = {
      revision: 1,
      usuario_id: ev.actorId,
      auth_uid: contexto.cuenta.uid,
      institucion_id: INSTITUCION_PEDIATRIA,
      fecha_hora: new Date(ev.fechaHora),
      accion: ev.caso,
      tipo_recurso: tipoRecurso,
      recurso_id: ev.recursoId,
      correlacion: ev.correlacion,
      ...(ev.motivo ? { motivo: ev.motivo } : {}),
    };
    const validado = validarDocumento(ruta, datos);
    transaction.create(firestore.doc(ruta), validado as Record<string, unknown>);
  }
}

async function guardarOperacion<T>(
  transaction: Transaction,
  firestore: import('firebase-admin/firestore').Firestore,
  contexto: ContextoAutenticado,
  comando: ComandoEstable,
  claveOp: string,
  resultado: ResultadoDurable<T>,
): Promise<void> {
  const ruta = `operaciones/${claveOp}`;
  const respuestaSegura = resultado.respuesta as {
    readonly data?: Record<string, unknown>;
    readonly meta?: { readonly correlacion?: string };
  };
  const meta = respuestaSegura.meta ?? { correlacion: resultado.correlacionOriginal };
  const data = respuestaSegura.data ?? (resultado.respuesta as Record<string, unknown>);

  const datos = {
    revision: 1,
    institucion_id: INSTITUCION_PEDIATRIA,
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
  };
  const validado = validarDocumento(ruta, datos);
  transaction.create(firestore.doc(ruta), validado as Record<string, unknown>);
}

function traducirErrorModelo(error: ErrorModelo): ErrorDominio {
  if (error.codigo === 'LIMITE_AGREGADO') {
    return new ErrorDominio('LIMITE_AGREGADO', 'El tamaño del documento excede el límite permitido.');
  }
  if (error.codigo === 'DOSIS_INCOMPATIBLE') {
    return new ErrorDominio('DOSIS_DUPLICADA', 'La dosis no coincide con el identificador compuesto.');
  }
  if (error.codigo === 'CLAVE_INVALIDA' || error.codigo === 'ID_INVALIDO' || error.codigo === 'RUTA_INVALIDA') {
    return new ErrorDominio('SOLICITUD_INVALIDA', 'Identificador o ruta no válidos.');
  }
  return new ErrorDominio('ESTADO_INVALIDO', 'El documento no cumple con las restricciones del modelo pediátrico.');
}

function traducirErrorFirestore(error: unknown): ErrorDominio | null {
  if (typeof error !== 'object' || error === null) return null;
  const codigo = 'code' in error ? String((error as { code: unknown }).code) : '';
  if (codigo === '6' || codigo === 'ALREADY_EXISTS') {
    return new ErrorDominio('ESTADO_INVALIDO', 'El documento ya existe en Firestore.');
  }
  if (codigo === '7' || codigo === 'PERMISSION_DENIED') {
    return new ErrorDominio('SIN_PERMISO', 'Permiso denegado en Firestore.');
  }
  if (codigo === '3' || codigo === 'INVALID_ARGUMENT') {
    return new ErrorDominio('SOLICITUD_INVALIDA', 'Argumento inválido en Firestore.');
  }
  if (codigo === '5' || codigo === 'NOT_FOUND') {
    return new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Documento no encontrado.');
  }
  return null;
}

function esConflictoConcurrente(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const codigo = 'code' in error ? String((error as { code: unknown }).code) : '';
  return codigo === '10' || codigo === 'ABORTED' || codigo === 'failed-precondition';
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
