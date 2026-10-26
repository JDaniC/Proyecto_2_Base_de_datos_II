import { solicitudInvalida } from './error-dominio.js';

export type Moneda = 'GTQ';
export interface Dinero { readonly centavos: number; readonly moneda: Moneda; }
export const CENTAVOS_MAXIMOS = Number.MAX_SAFE_INTEGER;

export function dinero(centavos: unknown, moneda: unknown = 'GTQ'): Dinero {
  if (moneda !== 'GTQ') throw solicitudInvalida('La moneda no está admitida por el contrato v1.', 'moneda');
  if (typeof centavos !== 'number' || !Number.isSafeInteger(centavos) || centavos < 0) {
    throw solicitudInvalida('El monto debe ser un entero no negativo de centavos dentro del rango seguro.', 'centavos');
  }
  return Object.freeze({ centavos, moneda });
}

export function sumarDinero(izquierdo: Dinero, derecho: Dinero): Dinero {
  if (izquierdo.moneda !== derecho.moneda) throw solicitudInvalida('No se pueden sumar monedas distintas.', 'moneda');
  const total = izquierdo.centavos + derecho.centavos;
  if (!Number.isSafeInteger(total)) throw solicitudInvalida('La suma excede el rango entero seguro.', 'centavos');
  return dinero(total, izquierdo.moneda);
}
