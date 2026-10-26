import { solicitudInvalida } from './error-dominio.js';

declare const uuidMarca: unique symbol;
export type UUID = string & { readonly [uuidMarca]: true };

const UUID_CANONICO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esUUID(valor: unknown): valor is string {
  return typeof valor === 'string' && UUID_CANONICO.test(valor);
}

export function uuidPublico(valor: unknown, campo = 'id'): UUID {
  if (!esUUID(valor)) throw solicitudInvalida('Debe ser un UUID público válido.', campo);
  return valor.toLowerCase() as UUID;
}
