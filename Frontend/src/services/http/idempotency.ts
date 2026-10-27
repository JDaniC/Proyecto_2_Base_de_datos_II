/**
 * Manejo de claves idempotentes estables en el cliente HTTP (DEC08, RNF-034).
 * Un mismo formulario/intención debe conservar la clave ante reintentos (503 / caída de red)
 * y renovarla únicamente al iniciar un comando nuevo o resetear el formulario.
 */

export function generarClaveIdempotencia(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Generador UUID v4 estándar RFC 4122
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class IdempotencyTracker {
  private claveActual: string | null = null;

  /** Obtiene la clave actual o genera una nueva si no existe una activa para esta intención. */
  obtenerClave(): string {
    if (!this.claveActual) {
      this.claveActual = generarClaveIdempotencia();
    }
    return this.claveActual;
  }

  /**
   * Restablece la clave para un comando nuevo después de completarse con éxito
   * o cuando el usuario descarta intencionalmente el formulario.
   */
  renovar(): string {
    this.claveActual = generarClaveIdempotencia();
    return this.claveActual;
  }

  /** Limpia la clave activa. */
  limpiar(): void {
    this.claveActual = null;
  }
}
