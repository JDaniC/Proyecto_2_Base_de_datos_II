export type CodigoErrorDominio =
  | 'SOLICITUD_INVALIDA'
  | 'RECURSO_NO_ENCONTRADO'
  | 'SIN_PERMISO'
  | 'PACIENTE_DUPLICADO'
  | 'CLAVE_REUTILIZADA'
  | 'VERSION_DESACTUALIZADA'
  | 'ESTADO_INVALIDO'
  | 'REFERENCIA_INCOMPATIBLE'
  | 'RECETA_EXISTENTE'
  | 'CITA_SOLAPADA'
  | 'CAMA_NO_DISPONIBLE'
  | 'STOCK_INSUFICIENTE'
  | 'SALDO_INSUFICIENTE'
  | 'DOSIS_DUPLICADA'
  | 'LIMITE_AGREGADO'
  | 'PERSISTENCIA_NO_DISPONIBLE';

/** Error público de reglas del dominio; nunca incluye valores enviados ni detalles físicos. */
export class ErrorDominio extends Error {
  readonly codigo: CodigoErrorDominio;
  readonly campos?: readonly string[];

  constructor(codigo: CodigoErrorDominio, mensaje: string, campos?: readonly string[]) {
    super(mensaje);
    this.name = 'ErrorDominio';
    this.codigo = codigo;
    if (campos !== undefined) this.campos = Object.freeze([...campos]);
  }
}

export function solicitudInvalida(mensaje: string, campo?: string): ErrorDominio {
  return new ErrorDominio('SOLICITUD_INVALIDA', mensaje, campo === undefined ? undefined : [campo]);
}
