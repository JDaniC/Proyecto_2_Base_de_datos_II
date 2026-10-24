import { describe, expect, it } from 'vitest';
import { getErrorMessage } from './errors';

describe('mensajes de error para la interfaz', () => {
  const fallback = 'No se pudo guardar el registro. Inténtalo de nuevo.';

  it('conserva la explicación del servicio en español', () => {
    expect(getErrorMessage({ codigo: 'CUENTA_INACTIVA', mensaje: 'Esta cuenta está inactiva.' }, fallback))
      .toBe('Esta cuenta está inactiva.');
  });

  it('conserva los errores de validación del dominio', () => {
    expect(getErrorMessage(new Error('El monto ingresado supera el saldo pendiente.'), fallback))
      .toBe('El monto ingresado supera el saldo pendiente.');
  });

  it('explica una falla de conexión sin mostrar el mensaje del navegador', () => {
    expect(getErrorMessage(new TypeError('Failed to fetch'), fallback))
      .toBe('No se pudo conectar con el servicio. Comprueba la conexión e inténtalo de nuevo.');
  });

  it.each([
    new TypeError("Cannot read properties of undefined (reading 'id')"),
    new Error('ERROR_PERSISTENCIA_NO_DISPONIBLE'),
    {},
    null,
  ])('usa una explicación de la acción cuando solo recibe detalles internos', (error) => {
    expect(getErrorMessage(error, fallback)).toBe(fallback);
  });
});
