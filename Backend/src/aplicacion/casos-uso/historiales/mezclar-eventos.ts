import { ErrorDominio, solicitudInvalida } from '../../../dominio/compartido/error-dominio.js';
import { instanteUtc } from '../../../dominio/compartido/instante-utc.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';

/** Una fuente aplica paciente, rango y tipo antes del límite; jamás devuelve más de limite + 1. */
export interface EventoOrdenable {
  readonly id: string;
  readonly fechaHora: string;
}
export interface LimiteHistorial {
  readonly fechaHora: string;
  readonly id: string;
}
export interface FuenteHistorial<T extends EventoOrdenable> {
  leer(parametros: {
    readonly pacienteId: string;
    readonly desde?: string;
    readonly hasta?: string;
    readonly tipo?: string;
    readonly orden: 'ASC' | 'DESC';
    readonly despues?: LimiteHistorial;
    readonly cantidad: number;
  }): Promise<readonly T[]>;
}

/** Compara fracciones hasta nanosegundos sin redondear a milisegundos. */
function claveFecha(fecha: string): string {
  const valor = instanteUtc(fecha);
  const [parte, fraccion = ''] = valor.slice(0, -1).split('.');
  return `${parte}.${fraccion.padEnd(9, '0')}`;
}

function comparar(a: EventoOrdenable, b: EventoOrdenable, orden: 'ASC' | 'DESC'): number {
  const fechaA = claveFecha(a.fechaHora);
  const fechaB = claveFecha(b.fechaHora);
  const idA = uuidPublico(a.id);
  const idB = uuidPublico(b.id);
  const resultado = fechaA < fechaB ? -1 : fechaA > fechaB ? 1 : idA < idB ? -1 : idA > idB ? 1 : 0;
  return orden === 'ASC' ? resultado : -resultado;
}

export async function mezclarEventos<T extends EventoOrdenable>(parametros: {
  readonly fuentes: readonly FuenteHistorial<T>[];
  readonly pacienteId: string;
  readonly desde?: string;
  readonly hasta?: string;
  readonly tipo?: string;
  readonly orden: 'ASC' | 'DESC';
  readonly limite: number;
  readonly despues?: LimiteHistorial;
}): Promise<{ readonly elementos: readonly T[]; readonly hayMas: boolean }> {
  uuidPublico(parametros.pacienteId, 'paciente_id');
  if (!Number.isInteger(parametros.limite) || parametros.limite < 1 || parametros.limite > 100) {
    throw solicitudInvalida('El límite debe estar entre 1 y 100.', 'limite');
  }
  if (parametros.orden !== 'ASC' && parametros.orden !== 'DESC') {
    throw solicitudInvalida('El orden no es válido.', 'orden');
  }
  const desde = parametros.desde === undefined ? undefined : claveFecha(parametros.desde);
  const hasta = parametros.hasta === undefined ? undefined : claveFecha(parametros.hasta);
  if (desde !== undefined && hasta !== undefined && desde >= hasta) {
    throw solicitudInvalida('El rango debe ser no vacío.', 'hasta');
  }
  if (parametros.despues) {
    uuidPublico(parametros.despues.id, 'cursor');
    claveFecha(parametros.despues.fechaHora);
  }
  const { fuentes, limite, ...filtros } = parametros;
  const resultados = await Promise.allSettled(fuentes.map((fuente) => fuente.leer({ ...filtros, cantidad: limite + 1 })));
  const fallo = resultados.find((r) => r.status === 'rejected');
  if (fallo?.status === 'rejected') throw fallo.reason;
  const paginas = resultados.map((r) => r.status === 'fulfilled' ? r.value : []);
  const posiciones = paginas.map(() => 0);
  for (const pagina of paginas) {
    if (pagina.length > limite + 1) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'La fuente excedió el límite de lectura.');
    for (let i = 0; i < pagina.length; i++) {
      const evento = pagina[i]!;
      uuidPublico(evento.id);
      const fecha = claveFecha(evento.fechaHora);
      if ((desde !== undefined && fecha < desde) || (hasta !== undefined && fecha >= hasta) ||
          (parametros.despues && comparar(evento, parametros.despues, parametros.orden) <= 0) ||
          (i > 0 && comparar(pagina[i - 1]!, evento, parametros.orden) >= 0)) {
        throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'La fuente devolvió eventos fuera del orden o rango solicitado.');
      }
    }
  }
  const resultado: T[] = [];
  while (resultado.length < limite + 1) {
    let elegida = -1;
    for (let i = 0; i < paginas.length; i++) {
      const candidato = paginas[i]![posiciones[i]!];
      if (candidato && (elegida < 0 || comparar(candidato, paginas[elegida]![posiciones[elegida]!]!, parametros.orden) < 0)) elegida = i;
    }
    if (elegida < 0) break;
    const evento = paginas[elegida]![posiciones[elegida]!]!;
    if (resultado.length && comparar(resultado[resultado.length - 1]!, evento, parametros.orden) === 0) {
      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'Las fuentes devolvieron un evento duplicado.');
    }
    resultado.push(evento);
    posiciones[elegida] = posiciones[elegida]! + 1;
  }
  return Object.freeze({ elementos: Object.freeze(resultado.slice(0, limite)), hayMas: resultado.length > limite });
}
