export interface ResultadoConsultaSql<TRow> {
  readonly filas: readonly TRow[];
}

export interface EjecutorSql {
  consultar<TRow extends Record<string, unknown> = Record<string, unknown>>(
    sentencia: string,
    parametros?: readonly unknown[],
  ): Promise<ResultadoConsultaSql<TRow>>;
}

export interface ConexionSql extends EjecutorSql {
  iniciar(): Promise<void>;
  confirmar(): Promise<void>;
  revertir(): Promise<void>;
  /** `descartar` evita devolver al pool una conexión cuyo protocolo quedó incierto. */
  liberar(descartar?: boolean): void;
}

export interface PoolSql extends EjecutorSql {
  adquirir(): Promise<ConexionSql>;
  cerrar(): Promise<void>;
}

export type DialectoSql = 'postgresql' | 'mysql';

export function placeholder(dialecto: DialectoSql, indice: number): string {
  return dialecto === 'postgresql' ? `$${indice}` : '?';
}

export function marcadorJson(dialecto: DialectoSql, indice: number): string {
  const parametro = placeholder(dialecto, indice);
  return dialecto === 'postgresql' ? `${parametro}::jsonb` : `${parametro}`;
}
