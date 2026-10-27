import { solicitudInvalida } from './error-dominio.js';

export const VERSION_NORMALIZACION = 1 as const;

/** Normaliza texto eliminando diacríticos, colapsando espacios y a minúsculas sin límite de longitud para coincidencia. */
export function normalizarTextoBusqueda(valor: string): string {
  return valor.normalize('NFD').replace(/\p{M}/gu, '').trim().replace(/\s+/gu, ' ').toLowerCase();
}

/** Clave de búsqueda para nombres; no sustituye ni reescribe el texto clínico almacenado. */
export function normalizarNombreBusqueda(valor: unknown): string {
  if (typeof valor !== 'string') throw solicitudInvalida('El nombre debe ser texto.', 'nombre');
  const clave = normalizarTextoBusqueda(valor);
  if (clave.length === 0) throw solicitudInvalida('El término de nombre no puede estar vacío.', 'nombre');
  if ([...clave].length > 120) throw solicitudInvalida('El término de nombre excede 120 caracteres.', 'nombre');
  return clave;
}

/** Clave comparable de identificación personal; conserva tipo y no se usa para fusionar por nombre. */
export function normalizarIdentificacion(tipo: string, numero: unknown): string {
  if (tipo !== 'CUI' && tipo !== 'PASAPORTE') throw solicitudInvalida('El tipo de identificación no está admitido.', 'identificacion.tipo');
  if (typeof numero !== 'string') throw solicitudInvalida('El número de identificación debe ser texto.', 'identificacion.numero');
  const limite = tipo === 'CUI' ? 20 : 40;
  if (numero.length > limite) throw solicitudInvalida('El número excede el límite de captura.', 'identificacion.numero');
  const canonico = numero.normalize('NFC').trim().replace(/[\s-]+/gu, '').toUpperCase();
  if (canonico.length === 0) throw solicitudInvalida('El número de identificación no puede estar vacío.', 'identificacion.numero');
  if (canonico.length > limite) throw solicitudInvalida('El número excede el límite de captura.', 'identificacion.numero');
  return `${tipo}:${canonico}`;
}
