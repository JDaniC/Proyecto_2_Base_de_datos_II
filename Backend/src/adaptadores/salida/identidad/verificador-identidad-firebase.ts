import type { Auth } from 'firebase-admin/auth';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import {
  esInstitucion,
  type Institucion,
} from '../../../dominio/compartido/institucion.js';
import { instanteUtc } from '../../../dominio/compartido/instante-utc.js';
import type {
  IdentidadVerificada,
  VerificadorIdentidad,
} from '../../../aplicacion/puertos/verificador-identidad.js';

export class VerificadorIdentidadFirebase implements VerificadorIdentidad {
  private readonly auth: Auth;

  constructor(auth: Auth) {
    this.auth = auth;
  }

  async verificar(token: string): Promise<IdentidadVerificada> {
    if (typeof token !== 'string' || token.trim().length === 0) {
      throw new ErrorDominio('NO_AUTENTICADO', 'Token ausente, inválido, vencido o revocado.');
    }

    try {
      const decodificado = await this.auth.verifyIdToken(token, true);

      const institucionRaw = typeof decodificado.institucion === 'string'
        ? decodificado.institucion.trim()
        : '';

      if (!esInstitucion(institucionRaw)) {
        throw new ErrorDominio('SIN_PERMISO', 'Claim de institución inválido o ausente en el token.');
      }

      if (typeof decodificado.uid !== 'string' || decodificado.uid.trim().length === 0 ||
          !Number.isSafeInteger(decodificado.iat) || decodificado.iat < 0) {
        throw new ErrorDominio('NO_AUTENTICADO', 'El token no contiene una identidad válida.');
      }

      return Object.freeze({
        uid: decodificado.uid,
        institucion: institucionRaw as Institucion,
        emitidoEn: instanteUtc(new Date(decodificado.iat * 1000).toISOString()),
      });
    } catch (error: unknown) {
      if (error instanceof ErrorDominio) {
        throw error;
      }

      const codigo = (error as { code?: string })?.code;
      if (
        codigo === 'auth/id-token-revoked' ||
        codigo === 'auth/id-token-expired' ||
        codigo === 'auth/argument-error' ||
        codigo === 'auth/invalid-id-token' ||
        codigo === 'auth/user-disabled' ||
        codigo === 'auth/user-not-found'
      ) {
        throw new ErrorDominio('NO_AUTENTICADO', 'Token ausente, inválido, vencido o revocado.');
      }

      throw new ErrorDominio('IDENTIDAD_NO_DISPONIBLE', 'El servicio de identidad no está disponible.');
    }
  }

  async revocarSesiones(uidVerificado: string): Promise<void> {
    if (typeof uidVerificado !== 'string' || uidVerificado.trim().length === 0) {
      throw new ErrorDominio('SOLICITUD_INVALIDA', 'UID verificado requerido para revocación.');
    }

    try {
      await this.auth.revokeRefreshTokens(uidVerificado);
    } catch (error: unknown) {
      if (error instanceof ErrorDominio) {
        throw error;
      }
      throw new ErrorDominio('IDENTIDAD_NO_DISPONIBLE', 'El servicio de identidad no está disponible.');
    }
  }
}
