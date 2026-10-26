import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import type { Institucion } from '../../../dominio/compartido/institucion.js';
import { instanteUtc, type InstanteUTC } from '../../../dominio/compartido/instante-utc.js';
import type {
  IdentidadVerificada,
  VerificadorIdentidad,
} from '../../../aplicacion/puertos/verificador-identidad.js';

export interface TokenSinteticoConfig {
  readonly token: string;
  readonly uid: string;
  readonly institucion: Institucion;
  readonly emitidoEn?: InstanteUTC;
  readonly expirado?: boolean;
}

export class VerificadorIdentidadMemoria implements VerificadorIdentidad {
  private readonly tokens = new Map<string, TokenSinteticoConfig>();
  private readonly revocadosPorUid = new Set<string>();
  private servicioDisponible = true;

  constructor(tokensIniciales: readonly TokenSinteticoConfig[] = []) {
    for (const t of tokensIniciales) {
      this.registrarToken(t);
    }
  }

  registrarToken(config: TokenSinteticoConfig): void {
    this.tokens.set(config.token, Object.freeze({
      ...config,
      emitidoEn: config.emitidoEn ? instanteUtc(config.emitidoEn) : instanteUtc(new Date().toISOString()),
    }));
  }

  establecerDisponibilidad(disponible: boolean): void {
    this.servicioDisponible = disponible;
  }

  async verificar(token: string): Promise<IdentidadVerificada> {
    if (!this.servicioDisponible) {
      throw new ErrorDominio('IDENTIDAD_NO_DISPONIBLE', 'El servicio de identidad no está disponible.');
    }

    if (typeof token !== 'string' || token.trim().length === 0) {
      throw new ErrorDominio('NO_AUTENTICADO', 'Token ausente, inválido, vencido o revocado.');
    }

    const registrado = this.tokens.get(token);
    if (!registrado) {
      throw new ErrorDominio('NO_AUTENTICADO', 'Token ausente, inválido, vencido o revocado.');
    }

    if (registrado.expirado) {
      throw new ErrorDominio('NO_AUTENTICADO', 'Token ausente, inválido, vencido o revocado.');
    }

    if (this.revocadosPorUid.has(registrado.uid)) {
      throw new ErrorDominio('NO_AUTENTICADO', 'Token ausente, inválido, vencido o revocado.');
    }

    return Object.freeze({
      uid: registrado.uid,
      institucion: registrado.institucion,
      emitidoEn: registrado.emitidoEn ?? instanteUtc(new Date().toISOString()),
    });
  }

  async revocarSesiones(uidVerificado: string): Promise<void> {
    if (!this.servicioDisponible) {
      throw new ErrorDominio('IDENTIDAD_NO_DISPONIBLE', 'El servicio de identidad no está disponible.');
    }
    this.revocadosPorUid.add(uidVerificado);
  }
}
