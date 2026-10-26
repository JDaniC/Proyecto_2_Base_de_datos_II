/** Serializa operaciones administrativas de provisión para un UID entre procesos. */
export interface BloqueoProvision {
  ejecutar<T>(uid: string, trabajo: () => Promise<T>): Promise<T>;
}
