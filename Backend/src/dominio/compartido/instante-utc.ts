import { solicitudInvalida } from './error-dominio.js';
import { fechaCivil } from './fecha-civil.js';

declare const instanteMarca: unique symbol;
export type InstanteUTC = string & { readonly [instanteMarca]: true };
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;

export function instanteUtc(valor: unknown, campo = 'fecha_hora'): InstanteUTC {
  if (typeof valor !== 'string' || !ISO_UTC.test(valor) || !Number.isFinite(Date.parse(valor))) {
    throw solicitudInvalida('El instante debe ser una fecha ISO 8601 válida terminada en Z.', campo);
  }
  fechaCivil(valor.slice(0, 10), campo);
  const hora = valor.slice(11, 19).split(':').map(Number);
  if ((hora[0] ?? 24) > 23 || (hora[1] ?? 60) > 59 || (hora[2] ?? 60) > 59) {
    throw solicitudInvalida('El instante UTC contiene una hora fuera de rango.', campo);
  }
  return valor as InstanteUTC;
}
