import type { UUID } from '../../dominio/compartido/uuid.js';
import type { Version } from '../../dominio/compartido/version.js';
import type { OrdenLaboratorio, PruebaVersionada } from '../../dominio/laboratorio/ordenes.js';
import type { Muestra } from '../../dominio/laboratorio/muestras.js';
import type { ResultadoLaboratorio } from '../../dominio/laboratorio/resultados/resultado.js';
import type { FiltrosPagina, Pagina } from './nucleo.js';

export interface SolicitanteLaboratorio {
  readonly id: UUID;
  readonly version: Version;
  readonly nombre: string;
  readonly tipo: 'MEDICO' | 'INSTITUCION';
  readonly activo: boolean;
  readonly institucion?: string; readonly telefono?: string; readonly correo?: string;
  readonly entidadColegiacion?: string;
  readonly numeroColegiado?: string;
}
export interface TipoMuestraLaboratorio {
  readonly descripcion?: string; readonly condicionesConservacion?: string;
  readonly id: UUID; readonly version: Version; readonly codigo: string;
  readonly nombre: string; readonly recipiente: string; readonly activo: boolean;
}
export interface MetodoLaboratorio {
  readonly id: UUID; readonly codigo: string; readonly version: Version;
  readonly nombre: string; readonly activo: boolean;
}
export interface ProveedorLaboratorio {
  readonly tipoIdentificacion: string; readonly numeroIdentificacion: string; readonly telefono?: string; readonly correo?: string; readonly direccion?: string;
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
  readonly pacienteId?: UUID;
  readonly ordenId?: UUID;
  readonly estado?: Muestra['estado'];
  readonly desde?: string;
  readonly hasta?: string;
}
export interface FiltrosResultadosLaboratorio {
  readonly pacienteId?: UUID;
  readonly ordenId?: UUID;
  readonly itemId?: UUID;
  readonly serieId?: UUID;
  readonly estado?: ResultadoLaboratorio['estado'];
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
  resultadoPorId(id: UUID): Promise<ResultadoLaboratorio | null>;
  ultimoResultadoPorSerie(serieId: UUID): Promise<ResultadoLaboratorio | null>;
  listarOrdenes(filtros: FiltrosOrdenesLaboratorio, pagina: FiltrosPagina): Promise<Pagina<OrdenLaboratorio>>;
  listarMuestras(filtros: FiltrosMuestrasLaboratorio, pagina: FiltrosPagina): Promise<Pagina<Muestra>>;
  listarResultados(filtros: FiltrosResultadosLaboratorio, pagina: FiltrosPagina): Promise<Pagina<ResultadoLaboratorio>>;
}

/** Extensión tipada: el adaptador aplica todos los cambios junto a operación y auditoría. */
export type CambioLaboratorio =
  | { readonly tipo: 'CREAR_ORDEN'; readonly orden: OrdenLaboratorio }
  | { readonly tipo: 'GUARDAR_MUESTRA'; readonly versionAnterior: number | null; readonly muestra: Muestra }
  | { readonly tipo: 'GUARDAR_RESULTADO'; readonly versionAnterior: number | null; readonly resultado: ResultadoLaboratorio }
  | { readonly tipo: 'ACTUALIZAR_POR_RESULTADO'; readonly versionAnterior: number; readonly orden: OrdenLaboratorio }
  | { readonly tipo: 'PUBLICAR_PRUEBA'; readonly prueba: PruebaVersionada }
  | { readonly tipo: 'GUARDAR_SOLICITANTE'; readonly versionAnterior: number | null; readonly solicitante: SolicitanteLaboratorio }
  | { readonly tipo: 'GUARDAR_TIPO_MUESTRA'; readonly versionAnterior: number | null; readonly tipoMuestra: TipoMuestraLaboratorio }
  | { readonly tipo: 'GUARDAR_METODO'; readonly versionAnterior: number | null; readonly metodo: MetodoLaboratorio }
  | { readonly tipo: 'GUARDAR_PROVEEDOR'; readonly versionAnterior: number | null; readonly proveedor: ProveedorLaboratorio };

export interface ListadosLaboratorio {
 listarOrdenes(contexto: import('./contexto-autenticado.js').ContextoAutenticado, filtros: FiltrosOrdenesLaboratorio, pagina: FiltrosPagina): Promise<Pagina<OrdenLaboratorio>>;
 listarMuestras(contexto: import('./contexto-autenticado.js').ContextoAutenticado, filtros: FiltrosMuestrasLaboratorio, pagina: FiltrosPagina): Promise<Pagina<Muestra>>;
 listarResultados(contexto: import('./contexto-autenticado.js').ContextoAutenticado, filtros: FiltrosResultadosLaboratorio, pagina: FiltrosPagina): Promise<Pagina<ResultadoLaboratorio>>;
 listarTrabajoAnalitico(contexto: import('./contexto-autenticado.js').ContextoAutenticado, ordenId: UUID | undefined, pagina: FiltrosPagina): Promise<Pagina<TrabajoAnaliticoLaboratorio>>;
}

/** Proyeccion minima para captura/validacion; no expone solicitante, precios, indicaciones ni custodia. */
export interface TrabajoAnaliticoLaboratorio {
 readonly ordenId: UUID;
 readonly pacienteId: UUID;
 readonly prioridad: OrdenLaboratorio['prioridad'];
 readonly estado: OrdenLaboratorio['estado'];
 readonly version: Version;
 readonly items: readonly Pick<OrdenLaboratorio['items'][number], 'id' | 'prueba' | 'estado'>[];
 readonly muestras: readonly Pick<Muestra, 'id' | 'codigo' | 'itemIds' | 'estado' | 'version' | 'tipoMuestraId' | 'recipiente'>[];
}

export type TipoCatalogoLaboratorio='solicitantes'|'tiposMuestra'|'metodos'|'pruebas'|'proveedores';
export type ItemCatalogoLaboratorio=SolicitanteLaboratorio|TipoMuestraLaboratorio|(MetodoLaboratorio&{readonly revision:number;readonly descripcion?:string})|ProveedorLaboratorio|(PruebaVersionada&{readonly area:string;readonly revision:number});
export interface ConsultasLaboratorio {
 ordenPorId(contexto:import('./contexto-autenticado.js').ContextoAutenticado,id:UUID):Promise<OrdenLaboratorio|null>;
 muestraPorId(contexto:import('./contexto-autenticado.js').ContextoAutenticado,id:UUID):Promise<Muestra|null>;
 resultadoPorId(contexto:import('./contexto-autenticado.js').ContextoAutenticado,id:UUID):Promise<ResultadoLaboratorio|null>;
 listarCatalogo(contexto:import('./contexto-autenticado.js').ContextoAutenticado,tipo:TipoCatalogoLaboratorio,filtros:{readonly activo?:boolean;readonly q?:string},pagina:FiltrosPagina):Promise<Pagina<ItemCatalogoLaboratorio>>;
}
