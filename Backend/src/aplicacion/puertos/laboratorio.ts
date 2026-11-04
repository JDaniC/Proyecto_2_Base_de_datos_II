import type { UUID } from '../../dominio/compartido/uuid.js';
import type { Version } from '../../dominio/compartido/version.js';
import type { OrdenLaboratorio, PruebaVersionada } from '../../dominio/laboratorio/ordenes.js';
import type { Muestra } from '../../dominio/laboratorio/muestras.js';
import type { FiltrosPagina, Pagina } from './nucleo.js';

export interface SolicitanteLaboratorio {
  readonly id: UUID;
  readonly version: Version;
  readonly nombre: string;
  readonly tipo: 'MEDICO' | 'INSTITUCION';
  readonly activo: boolean;
  readonly entidadColegiacion?: string;
  readonly numeroColegiado?: string;
}
export interface TipoMuestraLaboratorio {
  readonly id: UUID; readonly version: Version; readonly codigo: string;
  readonly nombre: string; readonly recipiente: string; readonly activo: boolean;
}
export interface MetodoLaboratorio {
  readonly id: UUID; readonly codigo: string; readonly version: Version;
  readonly nombre: string; readonly activo: boolean;
}
export interface ProveedorLaboratorio {
  readonly id: UUID; readonly version: Version; readonly nombre: string; readonly activo: boolean;
}
/** Instantes UTC [desde,hasta); cursor ligado a cuenta, institución, recurso y filtros. */
export interface FiltrosOrdenesLaboratorio {
  readonly pacienteId?: UUID;
  readonly desde?: string;
  readonly hasta?: string;
  readonly estado?: OrdenLaboratorio['estado'];
}
export interface FiltrosMuestrasLaboratorio {
  readonly ordenId?: UUID;
  readonly estado?: Muestra['estado'];
  readonly desde?: string;
  readonly hasta?: string;
}
/** Lectores ligados a una única session dentro de la UoW; sin escrituras internas. */
export interface PuertosLaboratorio {
  solicitantePorId(id: UUID): Promise<SolicitanteLaboratorio | null>;
  tipoMuestraPorId(id: UUID): Promise<TipoMuestraLaboratorio | null>;
  metodoPorId(id: UUID): Promise<MetodoLaboratorio | null>;
  proveedorPorId(id: UUID): Promise<ProveedorLaboratorio | null>;
  revisionMetodoPorId(id: UUID): Promise<Version | null>;
  revisionPruebaPorId(id: UUID): Promise<Version | null>;
  pruebaPorId(id: UUID): Promise<PruebaVersionada | null>;
  ordenPorId(id: UUID): Promise<OrdenLaboratorio | null>;
  muestraPorId(id: UUID): Promise<Muestra | null>;
  muestraPorCodigo(codigo: string): Promise<Muestra | null>;
  listarOrdenes(filtros: FiltrosOrdenesLaboratorio, pagina: FiltrosPagina): Promise<Pagina<OrdenLaboratorio>>;
  listarMuestras(filtros: FiltrosMuestrasLaboratorio, pagina: FiltrosPagina): Promise<Pagina<Muestra>>;
}

/** Extensión tipada: el adaptador aplica todos los cambios junto a operación y auditoría. */
export type CambioLaboratorio =
  | { readonly tipo: 'CREAR_ORDEN'; readonly orden: OrdenLaboratorio }
  | { readonly tipo: 'GUARDAR_MUESTRA'; readonly versionAnterior: number | null; readonly muestra: Muestra }
  | { readonly tipo: 'PUBLICAR_PRUEBA'; readonly prueba: PruebaVersionada }
  | { readonly tipo: 'GUARDAR_SOLICITANTE'; readonly versionAnterior: number | null; readonly solicitante: SolicitanteLaboratorio }
  | { readonly tipo: 'GUARDAR_TIPO_MUESTRA'; readonly versionAnterior: number | null; readonly tipoMuestra: TipoMuestraLaboratorio }
  | { readonly tipo: 'GUARDAR_METODO'; readonly versionAnterior: number | null; readonly metodo: MetodoLaboratorio }
  | { readonly tipo: 'GUARDAR_PROVEEDOR'; readonly versionAnterior: number | null; readonly proveedor: ProveedorLaboratorio };
