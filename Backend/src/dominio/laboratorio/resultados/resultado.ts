import { ErrorDominio, solicitudInvalida } from '../../compartido/error-dominio.js';
import { instanteUtc } from '../../compartido/instante-utc.js';
import { uuidPublico } from '../../compartido/uuid.js';
import type { Muestra } from '../muestras.js';
import type { ItemOrden, OrdenLaboratorio, ParametroPrueba } from '../ordenes.js';

export type IndicadorResultado = 'NORMAL' | 'BAJO' | 'ALTO' | 'CRITICO' | 'NO_APLICA';

export interface ComponenteResultado {
  readonly parametroId: string;
  readonly valorNumerico?: number;
  readonly valorTexto?: string;
  readonly unidadAplicada?: string;
  readonly referenciaInferior?: number;
  readonly referenciaSuperior?: number;
  readonly referenciaTexto?: string;
  readonly indicador: IndicadorResultado;
  readonly observaciones?: string;
}

export interface ProcedenciaResultado {
  readonly muestraId: string;
  readonly codigo: string;
  readonly tipoMuestraId: string;
  readonly tipoMuestraNombre: string;
  readonly fechaToma: string;
  readonly fechaRecepcion: string;
  readonly fechaAceptacion: string;
}

export interface ResultadoLaboratorio {
  readonly id: string;
  /** Revisión optimista del documento; es distinta de la versión clínica. */
  readonly revision: number;
  readonly serieId: string;
  readonly version: number;
  readonly ordenId: string;
  readonly itemId: string;
  readonly pruebaId: string;
  readonly pacienteId: string;
  readonly procedencia: readonly ProcedenciaResultado[];
  readonly equipoId?: string;
  readonly analistaId: string;
  readonly fechaAnalisis: string;
  readonly estado: 'BORRADOR' | 'VALIDADO';
  readonly componentes: readonly ComponenteResultado[];
  readonly observaciones?: string;
  readonly validadorId?: string;
  readonly fechaValidacion?: string;
  readonly resultadoAnteriorId?: string;
  readonly motivoCorreccion?: string;
  readonly resultadoRepetidoDeId?: string;
}

export interface EntradaComponenteResultado {
  readonly parametroId: string;
  readonly valorNumerico?: number;
  readonly valorTexto?: string;
  readonly unidadAplicada?: string;
  readonly referenciaInferior?: number;
  readonly referenciaSuperior?: number;
  readonly referenciaTexto?: string;
  readonly indicador: IndicadorResultado;
  readonly observaciones?: string;
}

export interface EntradaCapturaResultado {
  readonly id: string;
  readonly serieId: string;
  readonly itemId: string;
  readonly equipoId?: string;
  readonly analistaId: string;
  readonly instante: string;
  readonly componentes: readonly EntradaComponenteResultado[];
  readonly observaciones?: string;
}

function textoOpcional(valor: string | undefined, limite: number, campo: string): string | undefined {
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string' || valor.length > limite) throw solicitudInvalida(`El campo ${campo} es inválido.`, campo);
  const limpio = valor.trim();
  return limpio || undefined;
}

function numeroFinito(valor: number | undefined, campo: string): number | undefined {
  if (valor === undefined) return undefined;
  if (typeof valor !== 'number' || !Number.isFinite(valor)) throw solicitudInvalida(`El campo ${campo} debe ser numérico y finito.`, campo);
  return valor;
}

function validarValor(parametro: ParametroPrueba, entrada: EntradaComponenteResultado): Pick<ComponenteResultado, 'valorNumerico' | 'valorTexto'> {
  const numerico = numeroFinito(entrada.valorNumerico, 'valorNumerico');
  const texto = textoOpcional(entrada.valorTexto, 2000, 'valorTexto');
  if ((numerico === undefined) === (texto === undefined)) throw solicitudInvalida('Cada componente requiere exactamente un valor.', 'componentes');
  if (parametro.tipo === 'NUMERICO' && numerico === undefined) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'El parámetro requiere un valor numérico.');
  if (parametro.tipo !== 'NUMERICO' && texto === undefined) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'El parámetro requiere un valor textual.');
  if (parametro.tipo === 'CATEGORICO' && !parametro.opciones?.includes(texto!)) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'El valor no pertenece a las opciones congeladas de la prueba.');
  if (numerico !== undefined) return { valorNumerico: numerico };
  return { valorTexto: texto! };
}

function normalizarComponente(parametro: ParametroPrueba, entrada: EntradaComponenteResultado): ComponenteResultado {
  if (!['NORMAL', 'BAJO', 'ALTO', 'CRITICO', 'NO_APLICA'].includes(entrada.indicador)) throw solicitudInvalida('Indicador de resultado inválido.', 'indicador');
  const unidad = textoOpcional(entrada.unidadAplicada, 60, 'unidadAplicada');
  if (parametro.unidad !== undefined && unidad !== parametro.unidad) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'La unidad no coincide con la versión congelada de la prueba.');
  if (parametro.unidad === undefined && unidad !== undefined) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'El parámetro no admite unidad.');
  const inferior = numeroFinito(entrada.referenciaInferior, 'referenciaInferior');
  const superior = numeroFinito(entrada.referenciaSuperior, 'referenciaSuperior');
  const referenciaTexto = textoOpcional(entrada.referenciaTexto, 500, 'referenciaTexto');
  if (referenciaTexto !== undefined && (inferior !== undefined || superior !== undefined)) throw solicitudInvalida('La referencia textual no puede mezclarse con límites numéricos.', 'componentes');
  if ((inferior !== undefined || superior !== undefined) && parametro.tipo !== 'NUMERICO') throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'Solo un parámetro numérico admite límites numéricos.');
  if (inferior !== undefined && superior !== undefined && inferior > superior) throw solicitudInvalida('El límite inferior no puede superar al superior.', 'componentes');
  const observaciones = textoOpcional(entrada.observaciones, 2000, 'observaciones');
  return Object.freeze({ parametroId: uuidPublico(entrada.parametroId, 'parametroId'), ...validarValor(parametro, entrada),
    ...(unidad === undefined ? {} : { unidadAplicada: unidad }), ...(inferior === undefined ? {} : { referenciaInferior: inferior }),
    ...(superior === undefined ? {} : { referenciaSuperior: superior }), ...(referenciaTexto === undefined ? {} : { referenciaTexto }),
    indicador: entrada.indicador, ...(observaciones === undefined ? {} : { observaciones }) });
}

function itemDeOrden(orden: OrdenLaboratorio, itemId: string): ItemOrden {
  const id = uuidPublico(itemId, 'itemId');
  const item = orden.items.find(v => v.id === id);
  if (!item) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'El ítem no pertenece a la orden.');
  if (item.estado === 'CANCELADO') throw new ErrorDominio('ESTADO_INVALIDO', 'No se admiten resultados para un ítem cancelado.');
  return item;
}

function normalizarProcedencia(orden: OrdenLaboratorio, item: ItemOrden, muestras: readonly Muestra[], tiposMuestra:ReadonlyMap<string,string>): readonly ProcedenciaResultado[] {
  if (!Array.isArray(muestras) || muestras.length < 1 || muestras.length > 100) throw solicitudInvalida('El resultado requiere de 1 a 100 muestras.', 'muestraIds');
  const ids = muestras.map(v => uuidPublico(v.id, 'muestraIds'));
  if (new Set(ids).size !== ids.length) throw solicitudInvalida('No se admiten muestras duplicadas.', 'muestraIds');
  return Object.freeze(muestras.map(muestra => {
    if (muestra.ordenId !== orden.id || !muestra.itemIds.includes(item.id)) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'La muestra no corresponde a la orden y al ítem.');
    if (muestra.estado !== 'ACEPTADA' && muestra.estado !== 'PROCESADA') throw new ErrorDominio('ESTADO_INVALIDO', 'La muestra no está apta para análisis.');
    if (!muestra.tipoMuestraId || !item.prueba.tiposMuestraIds.includes(muestra.tipoMuestraId)) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'El tipo de muestra no es compatible con la prueba congelada.');
    const nombreTipo=tiposMuestra.get(muestra.tipoMuestraId),aceptacion=[...muestra.eventos].reverse().find(v=>v.tipo==='ACEPTACION');
    if (!muestra.fechaRecepcion || !aceptacion || !nombreTipo?.trim()) throw new ErrorDominio('ESTADO_INVALIDO', 'La muestra apta carece de recepción, aceptación o tipo histórico verificable.');
    return Object.freeze({ muestraId: uuidPublico(muestra.id), codigo: muestra.codigo, tipoMuestraId: uuidPublico(muestra.tipoMuestraId),tipoMuestraNombre:nombreTipo.trim(),
      fechaToma: instanteUtc(muestra.fechaToma), fechaRecepcion: instanteUtc(muestra.fechaRecepcion),fechaAceptacion:instanteUtc(aceptacion.instante) });
  }));
}

/** Revalida dentro de la UoW que la procedencia guardada siga siendo la misma y apta. */
export function verificarProcedenciaResultado(resultado: ResultadoLaboratorio, orden: OrdenLaboratorio, muestras: readonly Muestra[],tiposMuestra:ReadonlyMap<string,string>): void {
  if (orden.id !== resultado.ordenId || orden.pacienteId !== resultado.pacienteId) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'La orden o el paciente no corresponden al resultado.');
  const item = itemDeOrden(orden, resultado.itemId);
  if (item.prueba.id !== resultado.pruebaId) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'La prueba no corresponde al resultado.');
  const procedencia = normalizarProcedencia(orden, item, muestras,tiposMuestra);
  if (procedencia.length !== resultado.procedencia.length || procedencia.some((p, i) => {
    const guardada = resultado.procedencia[i];
    return !guardada || p.muestraId !== guardada.muestraId || p.codigo !== guardada.codigo || p.tipoMuestraId !== guardada.tipoMuestraId ||
      p.tipoMuestraNombre!==guardada.tipoMuestraNombre||p.fechaToma !== guardada.fechaToma || p.fechaRecepcion !== guardada.fechaRecepcion||p.fechaAceptacion!==guardada.fechaAceptacion;
  })) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'La procedencia de muestras cambió o no coincide con el resultado.');
}

/** Completa el ítem al validar por primera vez y deriva el estado global sin tocar cancelados. */
export function completarOrdenPorResultado(orden: OrdenLaboratorio, resultado: ResultadoLaboratorio): OrdenLaboratorio {
  if (resultado.estado !== 'VALIDADO' || resultado.ordenId !== orden.id) throw new ErrorDominio('ESTADO_INVALIDO', 'La orden solo puede completarse con un resultado validado propio.');
  const item = itemDeOrden(orden, resultado.itemId);
  if (item.estado === 'COMPLETADO') return orden;
  const items = orden.items.map(v => v.id === item.id ? Object.freeze({ ...v, estado: 'COMPLETADO' as const }) : v);
  const estado = items.every(v => v.estado === 'COMPLETADO' || v.estado === 'CANCELADO') ? 'COMPLETADA' as const : 'EN_PROCESO' as const;
  return Object.freeze({ ...orden, version: orden.version + 1, estado, items: Object.freeze(items) });
}

function componentesDe(item: ItemOrden, entradas: readonly EntradaComponenteResultado[]): readonly ComponenteResultado[] {
  if (!Array.isArray(entradas) || entradas.length < 1 || entradas.length > 100) throw solicitudInvalida('El resultado requiere de 1 a 100 componentes.', 'componentes');
  const porId = new Map(item.prueba.parametros.map(v => [v.id, v]));
  const ids: readonly string[] = entradas.map(v => uuidPublico(v.parametroId, 'parametroId'));
  if (new Set(ids).size !== ids.length) throw solicitudInvalida('No se admiten componentes duplicados.', 'componentes');
  const componentes = entradas.map(entrada => {
    const parametro = porId.get(uuidPublico(entrada.parametroId, 'parametroId'));
    if (!parametro) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'El componente no pertenece a la versión congelada de la prueba.');
    return normalizarComponente(parametro, entrada);
  });
  if (item.prueba.parametros.some(v => v.obligatorio && !ids.includes(v.id))) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'Falta un componente obligatorio de la prueba.');
  return Object.freeze(componentes);
}

function crearBase(entrada: EntradaCapturaResultado, orden: OrdenLaboratorio, muestras: readonly Muestra[],tiposMuestra:ReadonlyMap<string,string>): ResultadoLaboratorio {
  const item = itemDeOrden(orden, entrada.itemId);
  const observaciones = textoOpcional(entrada.observaciones, 4000, 'observaciones');
  const fechaAnalisis=instanteUtc(entrada.instante),procedencia=normalizarProcedencia(orden, item, muestras,tiposMuestra);
  if(procedencia.some(v=>Date.parse(v.fechaAceptacion)>Date.parse(fechaAnalisis)))throw solicitudInvalida('El análisis no puede preceder a la aceptación de la muestra.','instante');
  return Object.freeze({ id: uuidPublico(entrada.id), revision: 1, serieId: uuidPublico(entrada.serieId, 'serieId'), version: 1,
    ordenId: uuidPublico(orden.id), itemId: item.id, pruebaId: item.prueba.id, pacienteId: uuidPublico(orden.pacienteId),
    procedencia, ...(entrada.equipoId === undefined ? {} : { equipoId: uuidPublico(entrada.equipoId, 'equipoId') }),
    analistaId: uuidPublico(entrada.analistaId, 'analistaId'), fechaAnalisis, estado: 'BORRADOR' as const,
    componentes: componentesDe(item, entrada.componentes), ...(observaciones === undefined ? {} : { observaciones }) });
}

/** Primera captura: la identidad de serie se fija fuera de la UoW y nunca viene del catálogo. */
export function crearBorradorResultado(entrada: EntradaCapturaResultado, orden: OrdenLaboratorio, muestras: readonly Muestra[],tiposMuestra:ReadonlyMap<string,string>): ResultadoLaboratorio {
  return crearBase(entrada, orden, muestras,tiposMuestra);
}

/** Edita únicamente un BORRADOR y conserva identidad, serie y versión clínica. */
export function guardarBorradorResultado(actual: ResultadoLaboratorio, revisionEsperada: number, entrada: Omit<EntradaCapturaResultado, 'id' | 'serieId' | 'itemId'>,
  orden: OrdenLaboratorio, muestras: readonly Muestra[],tiposMuestra:ReadonlyMap<string,string>): ResultadoLaboratorio {
  if (actual.estado !== 'BORRADOR') throw new ErrorDominio('ESTADO_INVALIDO', 'Un resultado validado no puede sobrescribirse.');
  if (!Number.isSafeInteger(revisionEsperada) || revisionEsperada !== actual.revision) throw new ErrorDominio('VERSION_DESACTUALIZADA', 'El resultado cambió; recargue antes de continuar.');
  const base = crearBase({ ...entrada, id: actual.id, serieId: actual.serieId, itemId: actual.itemId }, orden, muestras,tiposMuestra);
  if (base.ordenId !== actual.ordenId || base.pruebaId !== actual.pruebaId || base.pacienteId !== actual.pacienteId) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'La edición no puede cambiar la procedencia clínica del resultado.');
  return Object.freeze({ ...base, revision: actual.revision + 1, version: actual.version });
}

export function validarResultado(actual: ResultadoLaboratorio, revisionEsperada: number, validadorId: string, instante: string): ResultadoLaboratorio {
  if (actual.estado !== 'BORRADOR') throw new ErrorDominio('ESTADO_INVALIDO', 'El resultado ya está validado.');
  if (!Number.isSafeInteger(revisionEsperada) || revisionEsperada !== actual.revision) throw new ErrorDominio('VERSION_DESACTUALIZADA', 'El resultado cambió; recargue antes de validar.');
  const fechaValidacion = instanteUtc(instante);
  if (Date.parse(fechaValidacion) < Date.parse(actual.fechaAnalisis)) throw solicitudInvalida('La validación no puede preceder al análisis.', 'instante');
  return Object.freeze({ ...actual, revision: actual.revision + 1, estado: 'VALIDADO', validadorId: uuidPublico(validadorId, 'validadorId'), fechaValidacion });
}

export function crearCorreccionResultado(anterior: ResultadoLaboratorio, entrada: EntradaCapturaResultado, motivo: string,
  orden: OrdenLaboratorio, muestras: readonly Muestra[],tiposMuestra:ReadonlyMap<string,string>): ResultadoLaboratorio {
  if (anterior.estado !== 'VALIDADO') throw new ErrorDominio('ESTADO_INVALIDO', 'Solo un resultado validado puede corregirse.');
  const razon = textoOpcional(motivo, 2000, 'motivoCorreccion');
  if (!razon) throw solicitudInvalida('La corrección requiere motivo.', 'motivoCorreccion');
  const base = crearBase({ ...entrada, serieId: anterior.serieId, itemId: anterior.itemId }, orden, muestras,tiposMuestra);
  if (base.id === anterior.id || base.ordenId !== anterior.ordenId || base.pruebaId !== anterior.pruebaId || base.pacienteId !== anterior.pacienteId) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'La corrección debe conservar la procedencia clínica y usar nueva identidad.');
  return Object.freeze({ ...base, version: anterior.version + 1, resultadoAnteriorId: anterior.id, motivoCorreccion: razon });
}

export function crearRepeticionResultado(anterior: ResultadoLaboratorio, entrada: EntradaCapturaResultado,
  orden: OrdenLaboratorio, muestras: readonly Muestra[],tiposMuestra:ReadonlyMap<string,string>): ResultadoLaboratorio {
  if (anterior.estado !== 'VALIDADO') throw new ErrorDominio('ESTADO_INVALIDO', 'Solo un resultado validado puede repetirse.');
  const base = crearBase({ ...entrada, itemId: anterior.itemId }, orden, muestras,tiposMuestra);
  if (base.id === anterior.id || base.serieId === anterior.serieId || base.ordenId !== anterior.ordenId || base.pruebaId !== anterior.pruebaId || base.pacienteId !== anterior.pacienteId) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'La repetición requiere identidades nuevas y la misma procedencia clínica.');
  return Object.freeze({ ...base, resultadoRepetidoDeId: anterior.id });
}
