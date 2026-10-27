import { ErrorDominio, solicitudInvalida } from '../../../dominio/compartido/error-dominio.js';

export interface DatosCursorSql {
  readonly v: 1;
  readonly q: string;
  readonly orden: 'ASC' | 'DESC';
  readonly estado?: string;
  readonly f: string;
  readonly id: string;
}

export function codificarCursorSql(datos: DatosCursorSql): string {
  return Buffer.from(JSON.stringify(datos)).toString('base64url');
}

export function decodificarCursorSql(
  cursor: string,
  qEsperado: string,
  ordenEsperado: 'ASC' | 'DESC',
  estadoEsperado?: string,
): { fecha: string; id: string } {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as Partial<DatosCursorSql>;
    if (parsed.v !== 1 || parsed.q !== qEsperado || parsed.orden !== ordenEsperado) {
      throw solicitudInvalida('El cursor no corresponde a la búsqueda solicitada.', 'cursor');
    }
    if (estadoEsperado && parsed.estado !== estadoEsperado) {
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
