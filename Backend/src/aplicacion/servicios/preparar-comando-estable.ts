import { serializarJCS } from '../../dominio/compartido/json-canonico.js';
import { solicitudInvalida } from '../../dominio/compartido/error-dominio.js';
import { instanteUtc, type InstanteUTC } from '../../dominio/compartido/instante-utc.js';
import { uuidPublico, type UUID } from '../../dominio/compartido/uuid.js';
import type { ComandoEstable, GeneradorIds, HashIntencion, Reloj } from '../puertos/nucleo.js';

const HASH_SHA256 = /^[0-9a-f]{64}$/;

/** Congela intención e IDs antes de que un adaptador pueda repetir su callback. */
export async function prepararComandoEstable<T extends object>(
  claveIdempotencia: UUID,
  caso: string,
  dtoValidado: T,
  nombresIds: readonly string[],
  dependencias: { readonly ids: GeneradorIds; readonly reloj: Reloj; readonly hash: HashIntencion },
): Promise<ComandoEstable> {
  const casoCanonico = caso.trim();
  if (casoCanonico.length === 0 || casoCanonico.length > 120) {
    throw solicitudInvalida('El identificador del caso de uso debe tener entre 1 y 120 caracteres.', 'caso');
  }
  const nombres = nombresIds.map((nombre) => nombre.trim());
  if (nombres.some((nombre) => nombre.trim().length === 0 || nombre.length > 80) || new Set(nombres).size !== nombres.length) {
    throw solicitudInvalida('Los nombres de IDs deben ser únicos y tener entre 1 y 80 caracteres.', 'ids');
  }

  const dtoPlano = (JSON.parse(JSON.stringify(dtoValidado)) ?? {}) as object;
  const serializado = serializarJCS(dtoPlano);
  const hashEntrada = await dependencias.hash.sha256(serializado);
  if (!HASH_SHA256.test(hashEntrada)) throw solicitudInvalida('El proveedor de hash devolvió un SHA-256 inválido.');

  const comandoId = uuidPublico(dependencias.ids.nuevo(), 'comando_id');
  const ids: Record<string, UUID> = Object.create(null) as Record<string, UUID>;
  const generados = new Set<string>([comandoId]);
  for (const nombre of nombres) {
    const id = uuidPublico(dependencias.ids.nuevo(), nombre);
    if (generados.has(id)) throw solicitudInvalida('El generador produjo IDs repetidos.');
    generados.add(id);
    ids[nombre] = id;
  }
  const instante: InstanteUTC = instanteUtc(dependencias.reloj.ahora());
  return Object.freeze({
    id: comandoId,
    claveIdempotencia: uuidPublico(claveIdempotencia, 'Idempotency-Key'),
    caso: casoCanonico,
    hashEntrada,
    instante,
    ids: Object.freeze(ids),
  });
}
