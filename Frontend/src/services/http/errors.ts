import { AppError } from '../types';
import { CampoInvalido, RespuestaErrorApi } from './types';
import { generarClaveIdempotencia } from './idempotency';

export class HttpError extends Error implements AppError {
  readonly codigo: string;
  readonly mensaje: string;
  readonly status: number;
  readonly correlacion: string;
  readonly campos?: Record<string, string>;
  readonly esReintentable: boolean;

  constructor(params: {
    status: number;
    codigo: string;
    mensaje: string;
    correlacion?: string;
    campos?: Record<string, string>;
    causa?: unknown;
  }) {
    super(params.mensaje);
    this.name = 'HttpError';
    this.status = params.status;
    this.codigo = params.codigo;
    this.mensaje = params.mensaje;
    this.correlacion = params.correlacion || `corr-${generarClaveIdempotencia().substring(0, 8)}`;
    this.campos = params.campos;
    this.esReintentable = params.status === 503 || params.status === 504 || params.status === 0;

    if (params.causa) {
      this.cause = params.causa;
    }
  }
}

export function parsearRespuestaError(
  status: number,
  payload: unknown,
  correlacionCabecera?: string | null
): HttpError {
  const fallbackCorr = correlacionCabecera || `corr-${generarClaveIdempotencia().substring(0, 8)}`;

  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    const errorApi = payload as RespuestaErrorApi;
    const { codigo, mensaje, campos } = errorApi.error || {};
    const correlacion = errorApi.meta?.correlacion || fallbackCorr;

    const camposRecord: Record<string, string> | undefined = Array.isArray(campos)
      ? campos.reduce<Record<string, string>>((acc, item: CampoInvalido) => {
          if (item?.campo) {
            acc[item.campo] = item.mensaje || 'Campo no válido';
          }
          return acc;
        }, {})
      : undefined;

    const codigoNormalizado = codigo ? `${status} ${codigo}` : `${status} ERROR_HTTP`;

    return new HttpError({
      status,
      codigo: codigoNormalizado,
      mensaje: mensaje || obtenerMensajePorDefecto(status),
      correlacion,
      campos: camposRecord,
    });
  }

  return new HttpError({
    status,
    codigo: `${status} ${obtenerCodigoPorDefecto(status)}`,
    mensaje: obtenerMensajePorDefecto(status),
    correlacion: fallbackCorr,
  });
}

export function crearErrorRed(errorOriginal: unknown, correlacion?: string): HttpError {
  return new HttpError({
    status: 503,
    codigo: '503 PERSISTENCIA_NO_DISPONIBLE',
    mensaje: 'No se pudo conectar con el servidor institucional. Comprueba la red e inténtalo de nuevo.',
    correlacion,
    causa: errorOriginal,
  });
}

function obtenerCodigoPorDefecto(status: number): string {
  switch (status) {
    case 400:
      return 'SOLICITUD_INVALIDA';
    case 401:
      return 'NO_AUTENTICADO';
    case 403:
      return 'SIN_PERMISO';
    case 404:
      return 'RECURSO_NO_ENCONTRADO';
    case 409:
      return 'ESTADO_INVALIDO';
    case 413:
      return 'LIMITE_AGREGADO';
    case 503:
      return 'PERSISTENCIA_NO_DISPONIBLE';
    default:
      return 'ERROR_INTERNO';
  }
}

function obtenerMensajePorDefecto(status: number): string {
  switch (status) {
    case 400:
      return 'La solicitud contiene datos incompletos o inválidos.';
    case 401:
      return 'Credenciales inválidas o sesión no autorizada.';
    case 403:
      return 'La cuenta no posee los permisos requeridos para esta operación.';
    case 404:
      return 'El recurso solicitado no fue encontrado.';
    case 409:
      return 'El estado actual del recurso no permite completar la operación.';
    case 413:
      return 'La solicitud supera el límite permitido.';
    case 503:
      return 'El servicio no está disponible temporalmente. Conserva tu información y reintenta la operación.';
    default:
      return 'Ocurrió un error inesperado al procesar la solicitud.';
  }
}
