import { createHmac } from 'node:crypto';
import { ErrorDominio, solicitudInvalida } from '../../../dominio/compartido/error-dominio.js';

const SECRETO_CURSOR = process.env.CURSOR_SIGNING_SECRET || 'bdii_cursor_deterministic_salt_secret_v1';

export type RecursoCursorSql = 'pacientes' | 'eventos_auditoria';

export interface DatosCursorSql {
  readonly v: 1;
  readonly recurso: RecursoCursorSql;
  readonly institucion: string;
  readonly q: string;
  readonly orden: 'ASC' | 'DESC';
  readonly estado?: string;
  readonly f: string;
  readonly id: string;
}

export function escaparLikeSql(texto: string): string {
  return texto.replace(/([\\%_])/g, '\\$1');
}

export function codificarCursorSql(datos: DatosCursorSql): string {
  const carga = {
    v: datos.v,
    recurso: datos.recurso,
    institucion: datos.institucion,
    q: datos.q,
    orden: datos.orden,
    ...(datos.estado ? { estado: datos.estado } : {}),
    f: datos.f,
    id: datos.id,
  };
  const payloadStr = JSON.stringify(carga);
  const firma = createHmac('sha256', SECRETO_CURSOR).update(payloadStr).digest('base64url');
  return Buffer.from(JSON.stringify({ c: payloadStr, s: firma }), 'utf8').toString('base64url');
}

export function decodificarCursorSql(
  cursor: string,
  institucionEsperada: string,
  qEsperado: string,
  ordenEsperado: 'ASC' | 'DESC',
  estadoEsperado?: string,
  recursoEsperado: RecursoCursorSql = 'pacientes',
): { fecha: string; id: string } {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const sobre = JSON.parse(raw) as { c?: unknown; s?: unknown };
    if (typeof sobre !== 'object' || sobre === null || typeof sobre.c !== 'string' || typeof sobre.s !== 'string') {
      throw solicitudInvalida('El cursor es inválido o está corrupto.', 'cursor');
    }
    const firmaCalculada = createHmac('sha256', SECRETO_CURSOR).update(sobre.c).digest('base64url');
    if (sobre.s !== firmaCalculada) {
      throw solicitudInvalida('El cursor es inválido o está corrupto.', 'cursor');
    }
    const parsed = JSON.parse(sobre.c) as Partial<DatosCursorSql>;
    if (
      parsed.v !== 1 ||
      parsed.recurso !== recursoEsperado ||
      parsed.institucion !== institucionEsperada ||
      parsed.q !== qEsperado ||
      parsed.orden !== ordenEsperado ||
      (parsed.estado ?? undefined) !== (estadoEsperado ?? undefined)
    ) {
      throw solicitudInvalida('El cursor no corresponde a la búsqueda solicitada.', 'cursor');
    }
    if (typeof parsed.f !== 'string' || typeof parsed.id !== 'string') {
      throw solicitudInvalida('El cursor tiene un formato inválido.', 'cursor');
    }
    return { fecha: parsed.f, id: parsed.id };
  } catch (error: unknown) {
    if (error instanceof ErrorDominio) throw error;
    throw solicitudInvalida('El cursor es inválido o está corrupto.', 'cursor');
  }
}
