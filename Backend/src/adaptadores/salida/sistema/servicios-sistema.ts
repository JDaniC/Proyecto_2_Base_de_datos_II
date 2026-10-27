import { createHash, randomUUID } from 'node:crypto';
import type { GeneradorIds, HashIntencion, Reloj } from '../../../aplicacion/puertos/nucleo.js';
import { instanteUtc, type InstanteUTC } from '../../../dominio/compartido/instante-utc.js';
import { uuidPublico, type UUID } from '../../../dominio/compartido/uuid.js';

export const generadorIdsCrypto: GeneradorIds = Object.freeze({
  nuevo(): UUID {
    return uuidPublico(randomUUID());
  },
});

export const relojSistema: Reloj = Object.freeze({
  ahora(): InstanteUTC {
    return instanteUtc(new Date().toISOString());
  },
});

export const hasherSha256Node: HashIntencion = Object.freeze({
  async sha256(textoCanonicoJcs: string): Promise<string> {
    return createHash('sha256').update(textoCanonicoJcs).digest('hex');
  },
});

export const dependenciasComandoPorDefecto = Object.freeze({
  ids: generadorIdsCrypto,
  reloj: relojSistema,
  hash: hasherSha256Node,
});
