import { solicitudInvalida } from './error-dominio.js';

declare const fechaCivilMarca: unique symbol;
export type FechaCivil = string & { readonly [fechaCivilMarca]: true };
const FORMATO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

export function fechaCivil(valor: unknown, campo = 'fecha'): FechaCivil {
  if (typeof valor !== 'string') throw solicitudInvalida('La fecha debe usar el formato YYYY-MM-DD.', campo);
  const partes = FORMATO_FECHA.exec(valor);
  if (!partes) throw solicitudInvalida('La fecha debe usar el formato YYYY-MM-DD.', campo);
  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const bisiesto = anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0);
  const diasPorMes = [31, bisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (anio < 1 || mes < 1 || mes > 12 || dia < 1 || dia > (diasPorMes[mes - 1] ?? 0)) {
    throw solicitudInvalida('La fecha civil no existe en el calendario gregoriano.', campo);
  }
  return valor as FechaCivil;
}
