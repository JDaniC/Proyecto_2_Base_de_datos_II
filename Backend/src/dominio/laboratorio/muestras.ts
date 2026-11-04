import { uuidPublico } from '../compartido/uuid.js';
import { ErrorDominio, solicitudInvalida } from '../compartido/error-dominio.js';

export type EstadoMuestra = 'TOMADA' | 'RECIBIDA' | 'ACEPTADA' | 'RECHAZADA' | 'PROCESADA';
export type TipoEventoMuestra = 'TOMA' | 'RECEPCION' | 'ACEPTACION' | 'RECHAZO' | 'TRASLADO' | 'PROCESAMIENTO' | 'RECTIFICACION' | 'RETOMA';

/** Metadatos asignados por aplicación desde cuenta verificada, reloj e IDs del comando. */
export interface AutorEventoMuestra {
  readonly id: string;
  readonly actorId: string;
  readonly instante: string;
}
export interface EventoMuestra extends AutorEventoMuestra {
  readonly tipo: TipoEventoMuestra;
  readonly detalle: string;
  readonly rectificacion?: { readonly campo: CampoRectificable; readonly anterior: string; readonly nuevo: string };
}
export interface Muestra {
  readonly id: string;
  readonly ordenId: string;
  readonly codigo: string;
  readonly itemIds: readonly string[];
  readonly fechaToma: string;
  readonly tomadaPorId: string;
  readonly fechaRecepcion?: string;
  readonly recibidaPorId?: string;
  readonly condicionRecepcion?: string;
  readonly motivoRechazo?: string;
  readonly estado: EstadoMuestra;
  readonly version: number;
  readonly eventos: readonly EventoMuestra[];
  readonly origenId?: string;
  readonly retomaId?: string;
  readonly tipoMuestraId?: string;
  readonly recipiente?: string;
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
  const texto = detalleObligatorio(detalle);
  validarEventoNuevo(muestra, versionEsperada, detalle, autor);
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
  } else {
    throw new ErrorDominio('ESTADO_INVALIDO', 'La toma, retoma y rectificación requieren su comando específico.');
  }
  const evento = Object.freeze({ ...autor, tipo, detalle: texto });
  return Object.freeze({ ...muestra, estado, version: muestra.version + 1,
    ...(tipo === 'RECEPCION' ? { fechaRecepcion: autor.instante, recibidaPorId: autor.actorId, condicionRecepcion: texto } : {}),
    ...(tipo === 'RECHAZO' ? { motivoRechazo: texto } : {}),
    eventos: Object.freeze([...muestra.eventos, evento]) });
}

export type CampoRectificable = 'tipoMuestraId' | 'recipiente';

export function rectificarMuestra(muestra: Muestra, versionEsperada: number,
  campo: CampoRectificable, nuevo: string, motivo: string, autor: AutorEventoMuestra): Muestra {
  if (campo !== 'tipoMuestraId' && campo !== 'recipiente') throw solicitudInvalida('Campo de rectificación no permitido.', 'campo');
  const anterior = muestra[campo];
  if (anterior === undefined) throw new ErrorDominio('ESTADO_INVALIDO', 'Debe reconciliar el dato anterior antes de rectificar.');
  const valor = campo === 'tipoMuestraId' ? uuidPublico(nuevo, 'tipoMuestraId') : detalleObligatorio(nuevo);
  if (valor === anterior) throw solicitudInvalida('La rectificación debe cambiar el dato.', 'nuevo');
  // Reutiliza controles de revisión/cronología sin permitir rectificación genérica sin snapshot.
  const base = validarEventoNuevo(muestra, versionEsperada, motivo, autor);
  const evento = Object.freeze({ ...autor, tipo: 'RECTIFICACION' as const, detalle: detalleObligatorio(motivo),
    rectificacion: Object.freeze({ campo, anterior, nuevo: valor }) });
  return Object.freeze({ ...base, [campo]: valor, estado: muestra.estado,
    eventos: Object.freeze([...muestra.eventos, evento]) });
}

function validarEventoNuevo(muestra: Muestra, versionEsperada: number, detalle: string, autor: AutorEventoMuestra): Muestra {
  if (!Number.isSafeInteger(versionEsperada) || versionEsperada < 1) {
    throw solicitudInvalida('La versión esperada debe ser positiva.', 'versionEsperada');
  }
  if (versionEsperada !== muestra.version) {
    throw new ErrorDominio('VERSION_DESACTUALIZADA', 'La muestra cambió; recargue antes de continuar.');
  }
  detalleObligatorio(detalle);
  const instante = instanteValido(autor.instante);
  if (instante < instanteValido(muestra.fechaToma)) throw solicitudInvalida('El evento no puede preceder a la toma.', 'instante');
  if (muestra.eventos.some(e => e.id === autor.id)) {
    throw new ErrorDominio('ESTADO_INVALIDO', 'El evento ya existe.');
  }
  if (muestra.eventos.some(e => instanteValido(e.instante) > instante)) {
    throw solicitudInvalida('El evento no puede preceder a la trazabilidad existente.', 'instante');
  }
  return { ...muestra, version: muestra.version + 1 };
}

export interface TomaMuestra {
  readonly id: string;
  readonly ordenId: string;
  readonly codigo: string;
  readonly itemIds: readonly string[];
  readonly tipoMuestraId: string;
  readonly recipiente: string;
}
export function tomarMuestra(entrada: TomaMuestra, autor: AutorEventoMuestra): Muestra {
  const id = uuidPublico(entrada.id);
  const ordenId = uuidPublico(entrada.ordenId, 'ordenId');
  const tipoMuestraId = uuidPublico(entrada.tipoMuestraId, 'tipoMuestraId');
  const codigo = detalleObligatorio(entrada.codigo);
  if (codigo.length > 80) throw solicitudInvalida('El código excede 80 caracteres.', 'codigo');
  const recipiente = detalleObligatorio(entrada.recipiente);
  if (!Array.isArray(entrada.itemIds) || entrada.itemIds.length < 1 || entrada.itemIds.length > 100) throw solicitudInvalida('La muestra requiere de 1 a 100 ítems.', 'itemIds');
  const itemIds = entrada.itemIds.map(id => uuidPublico(id, 'itemIds'));
  if (new Set(itemIds).size !== itemIds.length) throw solicitudInvalida('La muestra no admite ítems duplicados.', 'itemIds');
  uuidPublico(autor.id, 'eventoId'); uuidPublico(autor.actorId, 'actorId'); instanteValido(autor.instante);
  return Object.freeze({ id, ordenId, codigo, itemIds: Object.freeze(itemIds), fechaToma: autor.instante, tomadaPorId: autor.actorId, tipoMuestraId, recipiente, estado: 'TOMADA', version: 1,
    eventos: Object.freeze([Object.freeze({ ...autor, tipo: 'TOMA' as const, detalle: 'Toma de muestra' })]) });
}

/** Aplicación confirma ambos agregados en la misma UoW y reserva el código único. */
export function retomarMuestra(origen: Muestra, versionEsperada: number, entrada: TomaMuestra,
  motivo: string, autorOrigen: AutorEventoMuestra, autorToma: AutorEventoMuestra): { readonly origen: Muestra; readonly nueva: Muestra } {
  const base = validarEventoNuevo(origen, versionEsperada, motivo, autorOrigen);
  if (origen.estado !== 'RECHAZADA' || origen.retomaId !== undefined) {
    throw new ErrorDominio('ESTADO_INVALIDO', 'La retoma requiere una muestra rechazada sin retoma previa.');
  }
  const nueva = tomarMuestra(entrada, autorToma);
  if (nueva.itemIds.length !== origen.itemIds.length || nueva.itemIds.some(id => !origen.itemIds.includes(id))) {
    throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'La retoma debe conservar los ítems del origen.');
  }
  if (nueva.id === origen.id || nueva.codigo === origen.codigo || nueva.ordenId !== origen.ordenId) {
    throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'La retoma requiere nueva identidad y código dentro de la misma orden.');
  }
  if (autorOrigen.actorId !== autorToma.actorId || autorOrigen.id === autorToma.id || instanteValido(autorToma.instante) < instanteValido(autorOrigen.instante)) {
    throw solicitudInvalida('La autoría y cronología de la retoma son incompatibles.');
  }
  const evento = Object.freeze({ ...autorOrigen, tipo: 'RETOMA' as const, detalle: detalleObligatorio(motivo) });
  return Object.freeze({ origen: Object.freeze({ ...base, retomaId: nueva.id, eventos: Object.freeze([...origen.eventos, evento]) }),
    nueva: Object.freeze({ ...nueva, origenId: origen.id }) });
}
