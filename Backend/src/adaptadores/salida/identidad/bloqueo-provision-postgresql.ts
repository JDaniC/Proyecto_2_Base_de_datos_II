import { createHash } from 'node:crypto';
import type { BloqueoProvision } from '../../../aplicacion/puertos/bloqueo-provision.js';
import type { PoolSql } from '../sql/tipos-sql.js';

/** Usa un advisory lock de sesión para coordinar provisiones entre procesos que comparten PostgreSQL. */
export class BloqueoProvisionPostgresql implements BloqueoProvision {
  constructor(private readonly pool: PoolSql) {}

  async ejecutar<T>(uid: string, trabajo: () => Promise<T>): Promise<T> {
    const conexion = await this.pool.adquirir();
    const clave = claveAdvisory(uid);
    let bloqueoSolicitado = false;
    let bloqueado = false;
    let descartar = false;

    try {
      bloqueoSolicitado = true;
      await conexion.consultar(
        'SELECT pg_advisory_lock($1::bigint) AS bloqueado',
        [clave],
      );
      bloqueado = true;
      return await trabajo();
    } catch (error: unknown) {
      // Si se perdió el acuse del lock, cerrar la sesión libera cualquier lock que alcanzó a tomar.
      if (bloqueoSolicitado && !bloqueado) descartar = true;
      throw error;
    } finally {
      if (bloqueado) {
        try {
          const resultado = await conexion.consultar<{ liberado: unknown }>(
            'SELECT pg_advisory_unlock($1::bigint) AS liberado',
            [clave],
          );
          if (resultado.filas[0]?.liberado !== true) descartar = true;
        } catch {
          // Descartar la sesión libera el advisory lock aunque falle la confirmación explícita.
          descartar = true;
        }
      }
      conexion.liberar(descartar);
    }
  }
}

function claveAdvisory(uid: string): string {
  const digest = createHash('sha256').update(uid, 'utf8').digest();
  return digest.readBigInt64BE(0).toString();
}
