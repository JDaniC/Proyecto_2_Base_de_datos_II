/** Use domain messages while keeping browser and transport diagnostics out of the interface. */
export const getErrorMessage = (error: unknown, fallback: string): string => {
  const detail = error && typeof error === 'object' ? error as { mensaje?: unknown; message?: unknown } : null;
  const message = detail?.mensaje ?? detail?.message;
  if (typeof message !== 'string' || !message.trim()) return fallback;
  if (/failed to fetch|network\s?error|load failed|fetch failed|network request failed/i.test(message)) {
    return 'No se pudo conectar con el servicio. Comprueba la conexión e inténtalo de nuevo.';
  }
  if (/cannot (read|set)|undefined|null is not|not a function|unexpected token|[A-Z]+Error:|^[A-Z0-9_ -]+$/.test(message)) {
    return fallback;
  }
  return message;
};
