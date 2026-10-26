import { solicitudInvalida } from './error-dominio.js';

declare const versionMarca: unique symbol;
export type Version = number & { readonly [versionMarca]: true };
export const VERSION_MAXIMA = Number.MAX_SAFE_INTEGER;

export function versionPositiva(valor: unknown, campo = 'version'): Version {
  if (typeof valor !== 'number' || !Number.isSafeInteger(valor) || valor < 1) {
    throw solicitudInvalida('La versión debe ser un entero positivo dentro del rango seguro.', campo);
  }
  return valor as Version;
}
