import { ErrorDominio, solicitudInvalida } from '../compartido/error-dominio.js';

export type EstadoMuestra = 'TOMADA' | 'RECIBIDA' | 'ACEPTADA' | 'RECHAZADA' | 'PROCESADA';
export type TipoEventoMuestra = 'TOMA' | 'RECEPCION' | 'ACEPTACION' | 'RECHAZO' | 'TRASLADO' | 'PROCESAMIENTO' | 'RECTIFICACION';

/** Metadatos asignados por aplicación desde cuenta verificada, reloj e IDs del comando. */
export interface AutorEventoMuestra {
  readonly id: string;
  readonly actorId: string;
  readonly instante: string;
}
export interface EventoMuestra extends AutorEventoMuestra {
  readonly tipo: TipoEventoMuestra;
  readonly detalle: string;
}
export interface Muestra {
  readonly id: string;
  readonly ordenId: string;
  readonly codigo: string;
  readonly estado: EstadoMuestra;
  readonly version: number;
  readonly eventos: readonly EventoMuestra[];
  readonly origenId?: string;
}

const transiciones: Readonly<Partial<Record<TipoEventoMuestra, readonly [EstadoMuestra, EstadoMuestra]>>> = {
  RECEPCION: ['TOMADA', 'RECIBIDA'],
  ACEPTACION: ['RECIBIDA', 'ACEPTADA'],
  PROCESAMIENTO: ['ACEPTADA', 'PROCESADA'],
};

function detalleObligatorio(detalle: string): string {
  if (typeof detalle !== 'string' || detalle.trim().length === 0 || detalle.length > 2000) {
    throw solicitudInvalida('El evento requiere detalle o motivo de hasta 2000 caracteres.', 'detalle');
  }
  return detalle.trim();
}
function instanteValido(instante: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(instante)) {
    throw solicitudInvalida('El evento requiere un instante UTC.', 'instante');
  }
  const valor = Date.parse(instante);
  if (!Number.isFinite(valor) || new Date(valor).toISOString() !== instante) {
    throw solicitudInvalida('El instante del evento es inválido.', 'instante');
  }
  return valor;
}

/** Devuelve otro agregado; persistencia debe confirmar revisión, evento y auditoría juntos. */
export function registrarEventoMuestra(
  muestra: Muestra, versionEsperada: number, tipo: TipoEventoMuestra,
  detalle: string, autor: AutorEventoMuestra,
): Muestra {
  if (!Number.isSafeInteger(versionEsperada) || versionEsperada < 1) {
    throw solicitudInvalida('La versión esperada debe ser positiva.', 'versionEsperada');
  }
  if (versionEsperada !== muestra.version) {
    throw new ErrorDominio('VERSION_DESACTUALIZADA', 'La muestra cambió; recargue antes de continuar.');
  }
  const texto = detalleObligatorio(detalle);
  const instante = instanteValido(autor.instante);
  if (muestra.eventos.some(e => e.id === autor.id)) {
    throw new ErrorDominio('ESTADO_INVALIDO', 'El evento ya existe.');
  }
  if (muestra.eventos.some(e => instanteValido(e.instante) > instante)) {
    throw solicitudInvalida('El evento no puede preceder a la trazabilidad existente.', 'instante');
  }
  let estado = muestra.estado;
  const transicion = transiciones[tipo];
  if (transicion) {
    if (estado !== transicion[0]) throw new ErrorDominio('ESTADO_INVALIDO', 'La transición de muestra no está permitida.');
    estado = transicion[1];
  } else if (tipo === 'RECHAZO') {
    if (estado !== 'RECIBIDA' && estado !== 'ACEPTADA') throw new ErrorDominio('ESTADO_INVALIDO', 'La muestra no puede rechazarse en este estado.');
    estado = 'RECHAZADA';
  } else if (tipo === 'TRASLADO') {
    if (estado === 'RECHAZADA' || estado === 'PROCESADA') throw new ErrorDominio('ESTADO_INVALIDO', 'No puede trasladarse una muestra terminada.');
  } else if (tipo !== 'RECTIFICACION') {
    throw new ErrorDominio('ESTADO_INVALIDO', 'La toma inicial no puede repetirse como evento.');
  }
  const evento = Object.freeze({ ...autor, tipo, detalle: texto });
  return Object.freeze({ ...muestra, estado, version: muestra.version + 1, eventos: Object.freeze([...muestra.eventos, evento]) });
}
