import type { Auth } from 'firebase-admin/auth';
import type { AdministradorIdentidad } from '../../../aplicacion/puertos/administrador-identidad.js';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import type { Institucion } from '../../../dominio/compartido/institucion.js';

/** Administra solo el claim canónico de institución; nunca publica roles o permisos como autoridad. */
export class AdministradorCuentasFirebase implements AdministradorIdentidad {
  constructor(private readonly auth: Auth) {}

  async asegurarClaimInstitucion(uid: string, institucion: Institucion): Promise<void> {
    if (typeof uid !== 'string' || uid.trim().length === 0) {
      throw new ErrorDominio('SOLICITUD_INVALIDA', 'Se requiere un UID válido.');
    }
    try {
      const usuario = await this.auth.getUser(uid);
      const claims = usuario.customClaims ?? {};
      const institucionActual = claims.institucion;
      if (institucionActual !== undefined && institucionActual !== institucion) {
        throw new ErrorDominio('SIN_PERMISO', 'El UID ya está vinculado a otra institución.');
      }
      if (institucionActual !== institucion) {
        await this.auth.setCustomUserClaims(uid, { ...claims, institucion });
      }
      const verificado = await this.auth.getUser(uid);
      if (verificado.customClaims?.institucion !== institucion) {
        throw new ErrorDominio('IDENTIDAD_NO_DISPONIBLE', 'No fue posible confirmar el claim institucional.');
      }
    } catch (error: unknown) {
      if (error instanceof ErrorDominio) throw error;
      const codigo = typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code?: unknown }).code
        : undefined;
      if (codigo === 'auth/user-not-found') {
        throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'El UID no existe en Firebase Auth.');
      }
      if (codigo === 'auth/invalid-uid') {
        throw new ErrorDominio('SOLICITUD_INVALIDA', 'El UID no tiene un formato válido.');
      }
      throw new ErrorDominio('IDENTIDAD_NO_DISPONIBLE', 'No fue posible administrar el claim de institución.');
    }
  }
}
