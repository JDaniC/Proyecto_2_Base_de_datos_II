export interface Liberable { liberar(): void; }

/** Limita cola y espera; si una conexión llega tarde se devuelve al pool. */
export function crearAdquiridorLimitado<T extends Liberable>(
  adquirir: () => Promise<T>,
  opciones: { readonly timeoutMs: number; readonly maxEspera: number },
): () => Promise<T> {
  let pendientes = 0;
  return async () => {
    if (pendientes >= opciones.maxEspera) throw new Error('POOL_AGOTADO');
    pendientes += 1;
    let vencida = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const solicitud = adquirir().then((conexion) => {
      pendientes -= 1;
      if (vencida) {
        conexion.liberar();
        throw new Error('POOL_AGOTADO');
      }
      return conexion;
    }, (error: unknown) => {
      pendientes -= 1;
      throw error;
    });
    try {
      return await Promise.race([
        solicitud,
        new Promise<T>((_resolve, reject) => {
          timer = setTimeout(() => {
            vencida = true;
            reject(new Error('POOL_AGOTADO'));
          }, opciones.timeoutMs);
        }),
      ]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  };
}
