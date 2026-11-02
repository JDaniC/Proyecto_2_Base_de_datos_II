import type { UUID } from '../../dominio/compartido/uuid.js';
import type { Version } from '../../dominio/compartido/version.js';
import type { ContextoAutenticado } from './contexto-autenticado.js';

export type TipoServicioHospital = 'orden' | 'resultado' | 'poliza' | 'procedimiento';
export type AccionServicioHospital = 'ordenCrear' | 'ordenCancelar' | 'resultadoRegistrar' | 'polizaAfiliar' | 'polizaEstado' | 'procedimientoRegistrar';
/** DTO de presentación cerrado por acción en aplicación/OpenAPI; nunca recibe SQL, actor o motor. */
export interface SolicitudServicioHospital {
  readonly accion: AccionServicioHospital;
  readonly pacienteId: UUID;
  readonly recursoId?: UUID;
  readonly datos: Readonly<Record<string, unknown>>;
  readonly clave: UUID;
}
export interface RegistroServicioHospital {
  readonly id: UUID;
  readonly pacienteId: UUID;
  readonly version: Version;
  readonly tipo: TipoServicioHospital;
  readonly contenido: Readonly<Record<string, unknown>>;
}
export interface FiltroServiciosHospital {
  readonly pacienteId?: UUID;
  readonly ordenId?: UUID;
  readonly estado?: string;
  readonly pagina: number;
  readonly limite: number;
}
export interface PuertosServiciosHospital {
  catalogos(): Promise<Readonly<Record<string, readonly Readonly<Record<string, unknown>>[]>>>;
  listar(tipo: TipoServicioHospital, filtro: FiltroServiciosHospital): Promise<readonly RegistroServicioHospital[]>;
  porId(tipo: TipoServicioHospital, id: UUID, pacienteId?: UUID): Promise<RegistroServicioHospital | null>;
  ejecutar(contexto: ContextoAutenticado, solicitud: SolicitudServicioHospital): Promise<RegistroServicioHospital>;
}
