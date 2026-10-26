import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import type { Institucion } from '../../../dominio/compartido/institucion.js';
import type { UUID } from '../../../dominio/compartido/uuid.js';
import {
  crearContextoAutenticado,
  type ContextoAutenticado,
} from '../../puertos/contexto-autenticado.js';
import type { VerificadorIdentidad } from '../../puertos/verificador-identidad.js';
import type { BundleInstitucional } from '../../puertos/bundle-institucional.js';
import { crearSesionDto, type SesionDto } from './dtos-sesion.js';

export interface EntradaEstablecerSesion {
  readonly token: string;
  readonly correlacion: UUID;
}

export interface SalidaEstablecerSesion {
  readonly contexto: ContextoAutenticado;
  readonly sesion: SesionDto;
  readonly bundle: BundleInstitucional;
}

export type ResolverBundle = (institucion: Institucion) => BundleInstitucional | undefined;

export class EstablecerSesion {
  constructor(
    private readonly verificadorIdentidad: VerificadorIdentidad,
    private readonly resolverBundle: ResolverBundle,
  ) {}

  async ejecutar(entrada: EntradaEstablecerSesion): Promise<SalidaEstablecerSesion> {
    if (typeof entrada.token !== 'string' || entrada.token.trim().length === 0) {
      throw new ErrorDominio('NO_AUTENTICADO', 'Token ausente o inválido.');
    }

    const identidad = await this.verificadorIdentidad.verificar(entrada.token);
    const bundle = this.resolverBundle(identidad.institucion);
    if (!bundle || !bundle.cuenta || bundle.estadoPersistencia !== 'DISPONIBLE') {
      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'El servicio institucional no está disponible.');
    }

    let cuenta: Awaited<ReturnType<NonNullable<typeof bundle.cuenta>['porUid']>>;
    try {
      cuenta = await bundle.cuenta.porUid(identidad.uid);
    } catch (error: unknown) {
      if (error instanceof ErrorDominio) throw error;
      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible consultar la cuenta institucional.');
    }
    if (!cuenta) {
      throw new ErrorDominio('CUENTA_NO_HABILITADA', 'Cuenta no encontrada para la institución.');
    }
    if (cuenta.estado !== 'ACTIVA') {
      throw new ErrorDominio('CUENTA_NO_HABILITADA', 'La cuenta institucional no está activa.');
    }
    if (cuenta.institucion !== identidad.institucion) {
      throw new ErrorDominio('SIN_PERMISO', 'La institución de la cuenta no coincide con el token.');
    }

    const contexto = crearContextoAutenticado(identidad, cuenta, entrada.correlacion);
    const sesion = crearSesionDto(contexto);

    return Object.freeze({
      contexto,
      sesion,
      bundle,
    });
  }
}
