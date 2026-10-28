import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { CodecCursorHistorial } from '../../../aplicacion/puertos/historial.js';
import { ErrorDominio, solicitudInvalida } from '../../../dominio/compartido/error-dominio.js';
import { instanteUtc } from '../../../dominio/compartido/instante-utc.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';

/** AES-GCM autentica ámbito y cifra la tupla; no hay claves ni IDs nativos en el cursor. */
export class CursorHistorialCifrado implements CodecCursorHistorial {
  constructor(private readonly secreto: () => string | undefined = () => process.env.CURSOR_SIGNING_SECRET) {}
  private clave(): Buffer {
    const secreto = this.secreto();
    if (!secreto || secreto.trim().length < 32) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'La configuración de cursores no está disponible.');
    return createHash('sha256').update(secreto.trim()).digest();
  }
  codificar(ambito: string, ultima: { readonly id: string; readonly fechaHora: string }): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.clave(), iv);
    cipher.setAAD(Buffer.from(ambito));
    const cuerpo = Buffer.concat([cipher.update(JSON.stringify({ id: uuidPublico(ultima.id), fechaHora: instanteUtc(ultima.fechaHora) })), cipher.final()]);
    return Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), cuerpo]).toString('base64url');
  }
  decodificar(cursor: string, ambito: string) {
    const clave = this.clave();
    try {
      if (typeof cursor !== 'string' || cursor.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error();
      const raw = Buffer.from(cursor, 'base64url');
      if (raw.toString('base64url') !== cursor || raw.length < 30 || raw[0] !== 1) throw new Error();
      const cipher = createDecipheriv('aes-256-gcm', clave, raw.subarray(1, 13));
      cipher.setAAD(Buffer.from(ambito)); cipher.setAuthTag(raw.subarray(13, 29));
      const datos = JSON.parse(Buffer.concat([cipher.update(raw.subarray(29)), cipher.final()]).toString('utf8')) as { id: unknown; fechaHora: unknown };
      return { id: uuidPublico(datos.id), fechaHora: instanteUtc(datos.fechaHora) };
    } catch { throw solicitudInvalida('El cursor no corresponde a esta consulta.', 'cursor'); }
  }
}
