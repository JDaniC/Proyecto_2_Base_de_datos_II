import { uuidPublico } from '../compartido/uuid.js';
import { instanteUtc } from '../compartido/instante-utc.js';
import { dinero, sumarDinero, type Dinero } from '../compartido/dinero.js';
import { ErrorDominio, solicitudInvalida } from '../compartido/error-dominio.js';

export interface ParametroPrueba {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly tipo: 'NUMERICO' | 'TEXTO' | 'CATEGORICO';
  readonly obligatorio: boolean;
  readonly unidad?: string;
  readonly opciones?: readonly string[];
}
export interface PruebaVersionada {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly version: number;
  readonly activo: boolean;
  readonly metodoId: string;
  readonly tiposMuestraIds: readonly string[];
  readonly parametros: readonly ParametroPrueba[];
}
export interface ItemOrden {
  readonly id: string;
  readonly prueba: PruebaVersionada;
  readonly precio: Dinero;
  readonly estado: 'SOLICITADO' | 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO';
}
export interface OrdenLaboratorio {
  readonly id: string;
  readonly pacienteId: string;
  readonly solicitanteId: string;
  readonly registradoPorId: string;
  readonly instante: string;
  readonly prioridad: 'RUTINA' | 'URGENTE' | 'EMERGENCIA';
  readonly indicaciones: string;
  readonly estado: 'CREADA' | 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA';
  readonly version: number;
  readonly items: readonly ItemOrden[];
  readonly total: Dinero;
}
function texto(valor: string, limite: number): string {
  if (typeof valor !== 'string' || !valor.trim() || valor.length > limite) throw solicitudInvalida('Texto de catálogo inválido.');
  return valor.trim();
}
/** Copia profunda: una edición futura del catálogo no modifica una orden emitida. */
export function congelarPrueba(prueba: PruebaVersionada): PruebaVersionada {
  if (!prueba.activo) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'La prueba está inactiva.');
  if (!Number.isSafeInteger(prueba.version) || prueba.version < 1) throw solicitudInvalida('Versión de prueba inválida.');
  if (prueba.parametros.length < 1 || prueba.parametros.length > 100 || prueba.tiposMuestraIds.length < 1 || prueba.tiposMuestraIds.length > 100) throw new ErrorDominio('LIMITE_AGREGADO', 'La prueba excede los límites o está incompleta.');
  const parametros = prueba.parametros.map(p => {
    if (!['NUMERICO','TEXTO','CATEGORICO'].includes(p.tipo) || typeof p.obligatorio !== 'boolean') throw solicitudInvalida('Tipo de parámetro inválido.');
    const opciones = p.opciones?.map(o => texto(o, 200));
    if (p.tipo === 'CATEGORICO' && (!opciones?.length || new Set(opciones).size !== opciones.length)) throw solicitudInvalida('El parámetro categórico requiere opciones únicas.');
    return Object.freeze({ ...p, id: uuidPublico(p.id), codigo: texto(p.codigo,40), nombre: texto(p.nombre,200),
      ...(p.unidad === undefined ? {} : {unidad:texto(p.unidad,60)}), ...(opciones === undefined ? {} : {opciones:Object.freeze(opciones)}) });
  });
  if (new Set(parametros.map(p => p.id)).size !== parametros.length || new Set(parametros.map(p => p.codigo)).size !== parametros.length) throw solicitudInvalida('Parámetros duplicados.');
  const tipos = prueba.tiposMuestraIds.map(id => uuidPublico(id));
  if (new Set(tipos).size !== tipos.length) throw solicitudInvalida('Tipos de muestra duplicados.');
  return Object.freeze({ ...prueba, id:uuidPublico(prueba.id), metodoId:uuidPublico(prueba.metodoId), codigo:texto(prueba.codigo,40), nombre:texto(prueba.nombre,200),
    tiposMuestraIds:Object.freeze(tipos), parametros:Object.freeze(parametros) });
}

/** Referencias y estado del paciente se revalidan en aplicación dentro de la UoW. */
export function crearOrdenLaboratorio(entrada: Omit<OrdenLaboratorio, 'estado' | 'version' | 'items' | 'total'>,
  seleccion: readonly { readonly id: string; readonly prueba: PruebaVersionada; readonly centavos: number }[]): OrdenLaboratorio {
  if (seleccion.length < 1 || seleccion.length > 100) throw new ErrorDominio('LIMITE_AGREGADO', 'La orden requiere de 1 a 100 ítems.');
  if (!['RUTINA','URGENTE','EMERGENCIA'].includes(entrada.prioridad)) throw solicitudInvalida('Prioridad inválida.');
  if (typeof entrada.indicaciones !== 'string' || entrada.indicaciones.length > 2000) throw solicitudInvalida('Indicaciones inválidas.');
  const items = seleccion.map(i => Object.freeze({id:uuidPublico(i.id),prueba:congelarPrueba(i.prueba),precio:dinero(i.centavos),estado:'SOLICITADO' as const}));
  if (new Set(items.map(i=>i.id)).size !== items.length || new Set(items.map(i=>i.prueba.id)).size !== items.length) throw solicitudInvalida('Ítems o pruebas duplicados.');
  const total = items.reduce((s,i)=>sumarDinero(s,i.precio),dinero(0));
  return Object.freeze({ ...entrada, id:uuidPublico(entrada.id),pacienteId:uuidPublico(entrada.pacienteId),solicitanteId:uuidPublico(entrada.solicitanteId),
    registradoPorId:uuidPublico(entrada.registradoPorId),instante:instanteUtc(entrada.instante),estado:'CREADA',version:1,items:Object.freeze(items),total });
}
