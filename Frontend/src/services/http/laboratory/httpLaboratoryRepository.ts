import { createApiAdapterUnavailableError } from '../../../app/ServiceContext';
import type { LaboratoryRepository } from '../../contracts';
import type {
  AlertaParametroLab,
  EstadoMuestraLaboratorio,
  EstadoOrdenLaboratorio,
  GuardarResultadoBorradorDTO,
  MuestraLaboratorio,
  OrdenLaboratorio,
  ParametroResultadoLab,
  ResultadoLaboratorio,
} from '../../types';
import { HttpClient } from '../httpClient';
import { HttpError } from '../errors';
import { stableCommandKeys } from '../stableCommand';

type Pagina<T> = { items?: T[]; elementos?: T[]; siguienteCursor?: string };
type DineroDto = { centavos?: number; moneda?: string } | number;
type PruebaDto = {
  id: string; codigo: string; nombre: string; version: number; metodoId?: string;
  tiposMuestraIds?: string[];
  parametros?: Array<{ id: string; codigo: string; nombre: string; tipo?: string; unidad?: string }>;
};
type ParametroPruebaDto = NonNullable<PruebaDto['parametros']>[number];
type OrdenDto = {
  id: string; pacienteId: string; solicitanteId: string; instante: string;
  prioridad: 'RUTINA' | 'URGENTE' | 'EMERGENCIA'; indicaciones: string;
  estado: 'CREADA' | 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA'; version: number;
  items: Array<{ id: string; prueba: PruebaDto; precio: DineroDto; estado: 'SOLICITADO' | 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO' }>;
  total: DineroDto;
};
type EventoDto = { id: string; tipo: string; instante: string; actorId: string; detalle: string; rectificacion?: { campo: string; anterior: string; nuevo: string } };
type MuestraDto = {
  id: string; ordenId: string; codigo: string; itemIds: string[]; fechaToma: string; tomadaPorId: string;
  fechaRecepcion?: string; recibidaPorId?: string; motivoRechazo?: string;
  estado: 'TOMADA' | 'RECIBIDA' | 'ACEPTADA' | 'RECHAZADA' | 'PROCESADA'; version: number;
  eventos: EventoDto[]; origenId?: string; tipoMuestraId?: string; recipiente?: string;
};
type ComponenteDto = {
  parametroId: string; valorNumerico?: number; valorTexto?: string; unidadAplicada?: string;
  referenciaInferior?: number; referenciaSuperior?: number; referenciaTexto?: string;
  indicador: 'NORMAL' | 'BAJO' | 'ALTO' | 'CRITICO' | 'NO_APLICA'; observaciones?: string;
};
type ResultadoDto = {
  id: string; revision: number; serieId: string; version: number; ordenId: string; itemId: string;
  pruebaId: string; pacienteId: string; equipoId?: string; analistaId: string; fechaAnalisis: string;
  estado: 'BORRADOR' | 'VALIDADO'; componentes: ComponenteDto[]; observaciones?: string;
  validadorId?: string; fechaValidacion?: string; motivoCorreccion?: string;
  procedencia?: Array<{ muestraId: string; codigo?: string; codigoHistorico?: string; codigoBarrasHistorico?: string }>;
};
type TrabajoAnaliticoDto = {
  ordenId: string; pacienteId: string; prioridad: OrdenDto['prioridad']; estado: OrdenDto['estado']; version: number;
  items: Array<Pick<OrdenDto['items'][number], 'id' | 'prueba' | 'estado'>>;
  muestras: Array<Pick<MuestraDto, 'id' | 'codigo' | 'itemIds' | 'estado' | 'version' | 'tipoMuestraId' | 'recipiente'>>;
};

function lista<T>(valor: T[] | Pagina<T>): T[] {
  if (Array.isArray(valor)) return valor;
  return valor.items ?? valor.elementos ?? [];
}
function centavos(valor: DineroDto): number { return typeof valor === 'number' ? valor : Number(valor?.centavos ?? 0); }
function estadoOrden(dto: OrdenDto): EstadoOrdenLaboratorio {
  if (dto.estado === 'COMPLETADA') return 'COMPLETADA';
  if (dto.estado === 'CANCELADA') return 'CANCELADA';
  if (dto.estado === 'CREADA') return 'CREADA';
  return dto.items.some(i => i.estado === 'COMPLETADO') ? 'PARA_VALIDAR' : 'EN_ANALISIS';
}
function prioridad(dto: OrdenDto): OrdenLaboratorio['prioridad'] { return dto.prioridad === 'EMERGENCIA' ? 'STAT' : dto.prioridad; }
function codigo(prefijo: string, id: string): string { return `${prefijo}-${id.slice(0, 8).toUpperCase()}`; }
function mapOrden(dto: OrdenDto, muestras: MuestraLaboratorio[] = []): OrdenLaboratorio {
  return {
    id: dto.id, codigoOrden: codigo('ORD-LAB', dto.id), institucionId: 'LABORATORIO_CLINICO',
    pacienteId: dto.pacienteId, pacienteNombre: dto.pacienteId, pacienteDpi: '', pacienteEdad: 0, pacienteSexo: '',
    medicoSolicitante: dto.solicitanteId, prioridad: prioridad(dto), estado: estadoOrden(dto),
    motivoClinico: dto.indicaciones, fechaCreacion: dto.instante,
    items: dto.items.map(i => ({
      id: i.id, pruebaId: i.prueba.id, codigoPrueba: i.prueba.codigo, nombrePrueba: i.prueba.nombre,
      seccion: 'Laboratorio', tipoMuestra: i.prueba.tiposMuestraIds?.[0] ?? 'Muestra clínica',
      versionPrueba: i.prueba.version, metodoAnalitico: i.prueba.metodoId,
      parametros: i.prueba.parametros?.map(p => ({ parametroId: p.id, nombre: p.nombre, unidadMedida: p.unidad ?? '', rangoReferencia: '' })),
      muestraIds: muestras.filter(m => m.ordenId === dto.id && (m as MuestraLaboratorio & { itemIds?: string[] }).itemIds?.includes(i.id)).map(m => m.id),
      arancelGTQ: centavos(i.precio) / 100,
      estado: i.estado === 'COMPLETADO' ? 'VALIDADO' : i.estado === 'EN_PROCESO' ? 'EN_PROCESO' : 'PENDIENTE',
    })),
    muestras, totalArancelGTQ: centavos(dto.total) / 100, version: dto.version,
  };
}
function mapMuestra(dto: MuestraDto): MuestraLaboratorio & { itemIds?: string[] } {
  return {
    id: dto.id, codigoMuestra: dto.codigo, ordenId: dto.ordenId, codigoOrden: codigo('ORD-LAB', dto.ordenId),
    pacienteId: '', pacienteNombre: '', tipoMuestra: dto.tipoMuestraId ?? 'Muestra clínica', tuboContenedor: dto.recipiente ?? '',
    estado: dto.estado as EstadoMuestraLaboratorio, fechaToma: dto.fechaToma, tomadaPor: dto.tomadaPorId,
    fechaRecepcion: dto.fechaRecepcion, recibidaPor: dto.recibidaPorId, motivoRechazo: dto.motivoRechazo,
    esRetoma: Boolean(dto.origenId), muestraOrigenId: dto.origenId, version: dto.version, itemIds: dto.itemIds,
    eventosTrazabilidad: dto.eventos.map(e => ({
      id: e.id, tipoEvento: e.tipo as MuestraLaboratorio['eventosTrazabilidad'][number]['tipoEvento'],
      fechaHora: e.instante, actor: e.actorId, detalle: e.detalle,
      ...(e.tipo === 'RECHAZO' || e.tipo === 'RECTIFICACION' || e.tipo === 'RETOMA' ? { motivo: e.detalle } : {}),
    })),
  };
}
function alerta(indicador: ComponenteDto['indicador']): AlertaParametroLab {
  return indicador === 'BAJO' ? 'DISMINUIDO' : indicador === 'ALTO' ? 'ELEVADO' : indicador === 'CRITICO' ? 'CRITICO' : 'NORMAL';
}
function mapParametro(c: ComponenteDto, p?: ParametroPruebaDto): ParametroResultadoLab {
  return {
    id: c.parametroId, codigoParametro: p?.codigo ?? c.parametroId.slice(0, 8), nombre: p?.nombre ?? c.parametroId,
    valor: c.valorNumerico === undefined ? String(c.valorTexto ?? '') : String(c.valorNumerico), unidad: c.unidadAplicada ?? p?.unidad ?? '',
    rangoReferenciaMin: c.referenciaInferior, rangoReferenciaMax: c.referenciaSuperior,
    rangoTexto: c.referenciaTexto ?? [c.referenciaInferior, c.referenciaSuperior].filter(v => v !== undefined).join(' – '),
    alerta: alerta(c.indicador),
  };
}
function mapResultado(dto: ResultadoDto, orden?: OrdenDto, muestras: MuestraLaboratorio[] = []): ResultadoLaboratorio {
  const item = orden?.items.find(i => i.id === dto.itemId);
  const muestraIds = dto.procedencia?.map(p => p.muestraId) ?? [];
  const muestraId = muestraIds[0] ?? '';
  const muestra = muestras.find(m => m.id === muestraId);
  return {
    id: dto.id, serieResultadoId: dto.serieId, version: dto.version, revision: dto.revision, ordenId: dto.ordenId,
    codigoOrden: codigo('ORD-LAB', dto.ordenId), pacienteId: dto.pacienteId, pacienteNombre: dto.pacienteId, pacienteDpi: '',
    itemOrdenId: dto.itemId, pruebaId: dto.pruebaId, codigoPrueba: item?.prueba.codigo ?? dto.pruebaId.slice(0, 8),
    nombrePrueba: item?.prueba.nombre ?? 'Prueba no disponible en la proyección', seccion: 'Laboratorio', muestraId, muestraIds,
    codigoMuestra: muestra?.codigoMuestra ?? dto.procedencia?.[0]?.codigo ?? dto.procedencia?.[0]?.codigoHistorico ?? dto.procedencia?.[0]?.codigoBarrasHistorico ?? muestraId,
    equipoAnalitico: dto.equipoId ?? 'No registrado', metodoAnalitico: item?.prueba.metodoId ?? 'Método no disponible en la proyección',
    parametros: dto.componentes.map(c => mapParametro(c, item?.prueba.parametros?.find(p => p.id === c.parametroId))),
    observaciones: dto.observaciones, estado: dto.estado, analistaId: dto.analistaId, analistaNombre: dto.analistaId,
    fechaAnalisis: dto.fechaAnalisis, validadorId: dto.validadorId, validadorNombre: dto.validadorId,
    fechaValidacion: dto.fechaValidacion, motivoModificacion: dto.motivoCorreccion,
  };
}
function mapTrabajo(dto: TrabajoAnaliticoDto): OrdenLaboratorio {
  const muestras = dto.muestras.map(m => ({
    id: m.id, codigoMuestra: m.codigo, ordenId: dto.ordenId, codigoOrden: codigo('ORD-LAB', dto.ordenId),
    pacienteId: dto.pacienteId, pacienteNombre: dto.pacienteId, tipoMuestra: m.tipoMuestraId ?? 'Muestra clinica',
    tuboContenedor: m.recipiente ?? '', estado: m.estado as EstadoMuestraLaboratorio, fechaToma: '', tomadaPor: '',
    version: m.version, eventosTrazabilidad: [], itemIds: m.itemIds,
  })) as Array<MuestraLaboratorio & { itemIds: string[] }>;
  const orden: OrdenDto = { id:dto.ordenId,pacienteId:dto.pacienteId,solicitanteId:'',instante:'',prioridad:dto.prioridad,
    indicaciones:'',estado:dto.estado,version:dto.version,items:dto.items.map(i=>({...i,precio:0})),total:0 };
  return mapOrden(orden, muestras);
}
function ordenDesdeTrabajo(dto: TrabajoAnaliticoDto): OrdenDto {
  return { id:dto.ordenId,pacienteId:dto.pacienteId,solicitanteId:'',instante:'',prioridad:dto.prioridad,indicaciones:'',
    estado:dto.estado,version:dto.version,items:dto.items.map(i=>({...i,precio:0})),total:0 };
}
function indicador(a: AlertaParametroLab): ComponenteDto['indicador'] { return a === 'DISMINUIDO' ? 'BAJO' : a === 'ELEVADO' ? 'ALTO' : a; }
function componentes(dto: GuardarResultadoBorradorDTO): ComponenteDto[] {
  return dto.parametros.map(p => {
    const n = p.valor.trim() !== '' ? Number(p.valor) : Number.NaN;
    return {
      parametroId: p.parametroId,
      ...(Number.isFinite(n) ? { valorNumerico: n } : { valorTexto: p.valor }),
      ...(p.unidad ? { unidadAplicada: p.unidad } : {}),
      ...(p.rangoReferenciaMin === undefined ? {} : { referenciaInferior: p.rangoReferenciaMin }),
      ...(p.rangoReferenciaMax === undefined ? {} : { referenciaSuperior: p.rangoReferenciaMax }),
      ...(p.rangoTexto ? { referenciaTexto: p.rangoTexto } : {}), indicador: indicador(p.alerta),
    };
  });
}

export function createHttpLaboratoryRepository(http: HttpClient): LaboratoryRepository {
  const key = stableCommandKeys();
  const comandosPendientes = new Map<string, { body: Record<string, unknown>; idempotencyKey: string }>();
  const postReintentable = async <T>(intencion: string, path: string, crearBody: () => Promise<Record<string, unknown>>) => {
    let comando = comandosPendientes.get(intencion);
    if (!comando) {
      const body = await crearBody();
      comando = { body, idempotencyKey: key(`reintento:${intencion}`, body) };
      comandosPendientes.set(intencion, comando);
    }
    try {
      const respuesta = await http.post<T>(path, comando.body, { idempotencyKey: comando.idempotencyKey });
      comandosPendientes.delete(intencion);
      return respuesta.data;
    } catch (error) {
      if (!(error instanceof HttpError) || !error.esReintentable) comandosPendientes.delete(intencion);
      throw error;
    }
  };
  const getOrden = async (id: string) => (await http.get<OrdenDto>(`/laboratorio/ordenes/${encodeURIComponent(id)}`)).data;
  const getMuestrasPersistidas = async (ordenId?: string) => lista((await http.get<MuestraDto[] | Pagina<MuestraDto>>('/laboratorio/muestras', { query: { ordenId, limite: 100, orden: 'ASC' } })).data).map(mapMuestra);
  /** Completa la bandeja preanalítica con una fila pendiente por ítem aún sin toma. */
  const getMuestras = async (ordenId?: string) => {
    const persistidas = await getMuestrasPersistidas(ordenId);
    let ordenes: OrdenDto[] = [];
    try {
      ordenes = ordenId ? [await getOrden(ordenId)] : lista((await http.get<OrdenDto[] | Pagina<OrdenDto>>('/laboratorio/ordenes', { query: { limite: 100, orden: 'ASC' } })).data);
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 403) throw error;
    }
    const pendientes = ordenes.flatMap(orden => orden.estado === 'COMPLETADA' || orden.estado === 'CANCELADA' ? [] : orden.items
      .filter(item => item.estado !== 'CANCELADO' && !persistidas.some(m => m.ordenId === orden.id && (m as MuestraLaboratorio & { itemIds?: string[] }).itemIds?.includes(item.id)))
      .map(item => ({
        id: `pendiente:${orden.id}:${item.id}`, codigoMuestra: `PEND-${orden.id.slice(0, 8)}-${item.id.slice(0, 8)}`,
        ordenId: orden.id, codigoOrden: codigo('ORD-LAB', orden.id), pacienteId: orden.pacienteId, pacienteNombre: orden.pacienteId,
        tipoMuestra: item.prueba.tiposMuestraIds?.[0] ?? '', tuboContenedor: 'Contenedor estándar', estado: 'PENDIENTE_TOMA' as const,
        fechaToma: '', tomadaPor: '', version: 1, eventosTrazabilidad: [], itemIds: [item.id], versionOrden: orden.version,
      })));
    return [...pendientes, ...persistidas];
  };
  const getResultados = async (ordenId: string) => lista((await http.get<ResultadoDto[] | Pagina<ResultadoDto>>('/laboratorio/resultados', { query: { ordenId, limite: 100, orden: 'ASC' } })).data);
  const getTrabajo = async (ordenId?: string) => (await http.get<TrabajoAnaliticoDto[]>('/laboratorio/trabajo-analitico', { query: { ordenId } })).data;
  const mapConTrabajo = async (r: ResultadoDto) => { const trabajo=(await getTrabajo(r.ordenId))[0]; return mapResultado(r,trabajo?ordenDesdeTrabajo(trabajo):undefined,trabajo?mapTrabajo(trabajo).muestras:[]); };
  const bodyResultado = (dto: GuardarResultadoBorradorDTO) => ({ muestraIds: dto.muestraIds?.length ? dto.muestraIds : [dto.muestraId], componentes: componentes(dto), ...(dto.observaciones ? { observaciones: dto.observaciones } : {}) });
  const methods: Partial<LaboratoryRepository> = {
    async obtenerBandeja(_i, filtros) {
      const estado = filtros?.estado === 'COMPLETADA' || filtros?.estado === 'CANCELADA' || filtros?.estado === 'CREADA' ? filtros.estado : undefined;
      let data: OrdenLaboratorio[];
      try { data = lista((await http.get<OrdenDto[] | Pagina<OrdenDto>>('/laboratorio/ordenes', { query: { estado, limite: 100, orden: 'DESC' } })).data).map(o => mapOrden(o)); }
      catch (error) { if (!(error instanceof HttpError) || error.status !== 403) throw error; data = (await getTrabajo()).map(mapTrabajo); }
      return data.filter(o => (filtros?.prioridad && filtros.prioridad !== 'TODAS' ? o.prioridad === filtros.prioridad : true))
        .filter(o => !filtros?.busqueda || `${o.codigoOrden} ${o.pacienteNombre}`.toLowerCase().includes(filtros.busqueda.toLowerCase()));
    },
    async obtenerOrdenPorId(_i, id) {
      try { const o = await getOrden(id); return mapOrden(o, await getMuestras(id)); }
      catch (error) { if (!(error instanceof HttpError) || error.status !== 403) throw error; return (await getTrabajo(id)).map(mapTrabajo)[0] ?? null; }
    },
    async crearOrden(_i, dto) {
      if (!dto.versionPaciente || !dto.solicitanteId) throw new Error('Recargue paciente y solicitante antes de crear la orden.');
      const body = { pacienteId: dto.pacienteId, versionPaciente: dto.versionPaciente, solicitanteId: dto.solicitanteId,
        prioridad: dto.prioridad === 'STAT' ? 'EMERGENCIA' : dto.prioridad, indicaciones: dto.motivoClinico, moneda: 'GTQ',
        items: dto.pruebasSeleccionadasIds.map(pruebaId => ({ pruebaId, centavos: Math.round((dto.preciosAcordados?.[pruebaId] ?? 0) * 100) })) };
      return mapOrden((await http.post<OrdenDto>('/laboratorio/ordenes', body, { idempotencyKey: dto.idempotencyKey ?? key('/laboratorio/ordenes', body) })).data);
    },
    async obtenerMuestras(_i, ordenId) { return getMuestras(ordenId); },
    async actualizarEstadoMuestra(_i, id, estado, motivo, _actor, versionEsperada) {
      if (id.startsWith('pendiente:')) {
        if (estado !== 'TOMADA') throw new Error('Registra la toma antes de avanzar la muestra.');
        const [, ordenId, itemId] = id.split(':');
        const orden = await getOrden(ordenId);
        const item = orden.items.find(i => i.id === itemId);
        if (!item?.prueba.tiposMuestraIds?.[0]) throw new Error('La prueba no tiene un tipo de muestra activo.');
        const body = { ordenId, versionOrden: orden.version, itemIds: [itemId], tipoMuestraId: item.prueba.tiposMuestraIds[0], codigo: `MUE-${ordenId.slice(0, 8)}-${itemId.slice(0, 8)}`, recipiente: 'Contenedor estándar' };
        return mapMuestra((await http.post<MuestraDto>('/laboratorio/muestras', body, { idempotencyKey: key('/laboratorio/muestras', body) })).data);
      }
      const tipo = estado === 'RECIBIDA' ? 'RECEPCION' : estado === 'ACEPTADA' ? 'ACEPTACION' : estado === 'RECHAZADA' ? 'RECHAZO' : 'PROCESAMIENTO';
      const path = `/laboratorio/muestras/${encodeURIComponent(id)}/eventos`;
      const data = await postReintentable<MuestraDto>(`${path}:${tipo}:${motivo?.trim() ?? ''}`, path, async () => {
        const actual = mapMuestra((await http.get<MuestraDto>(`/laboratorio/muestras/${encodeURIComponent(id)}`)).data);
        const orden = await getOrden(actual.ordenId);
        return { versionEsperada: versionEsperada ?? actual.version, versionOrden: orden.version, tipo, detalle: motivo?.trim() || `Cambio de estado a ${estado}` };
      });
      return mapMuestra(data);
    },
    async registrarTrasladoMuestra(_i, id, destino, _actor, versionEsperada) {
      const path = `/laboratorio/muestras/${encodeURIComponent(id)}/eventos`;
      const data = await postReintentable<MuestraDto>(`${path}:TRASLADO:${destino}`, path, async () => {
        const actual = mapMuestra((await http.get<MuestraDto>(`/laboratorio/muestras/${encodeURIComponent(id)}`)).data);
        const orden = await getOrden(actual.ordenId);
        return { versionEsperada: versionEsperada ?? actual.version, versionOrden: orden.version, tipo: 'TRASLADO', detalle: destino };
      });
      return mapMuestra(data);
    },
    async rectificarDatoMuestra(_i, id, campo, nuevo, motivo, _actor, versionEsperada) {
      const actual = mapMuestra((await http.get<MuestraDto>(`/laboratorio/muestras/${encodeURIComponent(id)}`)).data); const orden = await getOrden(actual.ordenId);
      const path = `/laboratorio/muestras/${encodeURIComponent(id)}/rectificaciones`, body = { versionEsperada: versionEsperada ?? actual.version, versionOrden: orden.version, campo: campo === 'tuboContenedor' ? 'recipiente' : 'tipoMuestraId', nuevo, motivo };
      return mapMuestra((await http.post<MuestraDto>(path, body, { idempotencyKey: key(path, body) })).data);
    },
    async registrarRetomaMuestra(_i, id, motivo, _actor, versionEsperada) {
      const actual = mapMuestra((await http.get<MuestraDto>(`/laboratorio/muestras/${encodeURIComponent(id)}`)).data); const orden = await getOrden(actual.ordenId);
      const path = `/laboratorio/muestras/${encodeURIComponent(id)}/retomas`, body = { versionEsperada: versionEsperada ?? actual.version, versionOrden: orden.version, tipoMuestraId: actual.tipoMuestra, codigo: `${actual.codigoMuestra}-R`, recipiente: actual.tuboContenedor, motivo };
      return mapMuestra((await http.post<MuestraDto>(path, body, { idempotencyKey: key(path, body) })).data);
    },
    async obtenerResultadosPorOrden(_i, ordenId) {
      const rs = await getResultados(ordenId);
      let trabajo: TrabajoAnaliticoDto[] = [];
      try { trabajo = await getTrabajo(ordenId); }
      catch (error) {
        if (error instanceof HttpError && (error.status === 401 || error.status === 403)) throw error;
      }
      const o=trabajo[0]; const ms=o?mapTrabajo(o).muestras:[];
      return rs.map(r => mapResultado(r, o?ordenDesdeTrabajo(o):undefined, ms));
    },
    async obtenerResultadoPorId(_i, id) { const r = (await http.get<ResultadoDto>(`/laboratorio/resultados/${encodeURIComponent(id)}`)).data; const trabajo=(await getTrabajo(r.ordenId))[0]; return mapResultado(r, trabajo?ordenDesdeTrabajo(trabajo):undefined, trabajo?mapTrabajo(trabajo).muestras:[]); },
    async guardarResultadoBorrador(_i, dto) {
      const previos = await getResultados(dto.ordenId); const previo = previos.find(r => r.itemId === dto.itemOrdenId && r.estado === 'BORRADOR');
      const base = bodyResultado(dto); const path = previo ? `/laboratorio/resultados/${encodeURIComponent(previo.id)}/borrador` : '/laboratorio/resultados';
      const body = previo ? { versionEsperada: dto.versionEsperada ?? previo.revision, ...base } : { ordenId: dto.ordenId, itemId: dto.itemOrdenId, ...base };
      const r = previo ? await http.put<ResultadoDto>(path, body, { idempotencyKey: dto.idempotencyKey ?? key(path, body) }) : await http.post<ResultadoDto>(path, body, { idempotencyKey: dto.idempotencyKey ?? key(path, body) });
      const trabajo=(await getTrabajo(dto.ordenId))[0]; return mapResultado(r.data, trabajo?ordenDesdeTrabajo(trabajo):undefined, trabajo?mapTrabajo(trabajo).muestras:[]);
    },
    async validarResultado(_i, id, _validadorId, _validadorNombre, versionEsperada) {
      if (!Number.isInteger(versionEsperada) || Number(versionEsperada) < 1) throw new Error('Recargue el resultado antes de validarlo.');
      const path = `/laboratorio/resultados/${encodeURIComponent(id)}/validaciones`, body = { versionEsperada };
      const r = (await http.post<ResultadoDto>(path, body, { idempotencyKey: key(path, body) })).data; return mapConTrabajo(r);
    },
    async corregirResultado(_i, id, dto, motivo) { const path = `/laboratorio/resultados/${encodeURIComponent(id)}/correcciones`, body = { ...bodyResultado(dto), motivo }; const r = (await http.post<ResultadoDto>(path, body, { idempotencyKey: dto.idempotencyKey ?? key(path, body) })).data; return mapConTrabajo(r); },
    async repetirAnalisis(_i, ordenId, itemId, _muestraId, dto) { const origen = (await getResultados(ordenId)).filter(r => r.itemId === itemId && r.estado === 'VALIDADO').sort((a, b) => b.version - a.version)[0]; if (!origen) throw new Error('No existe un resultado validado para repetir.'); const path = `/laboratorio/resultados/${encodeURIComponent(origen.id)}/repeticiones`, body = bodyResultado(dto); const r = (await http.post<ResultadoDto>(path, body, { idempotencyKey: dto.idempotencyKey ?? key(path, body) })).data; return mapConTrabajo(r); },
  };
  return new Proxy(methods as LaboratoryRepository, { get(target, prop, receiver) { if (prop in target) return Reflect.get(target, prop, receiver); if (typeof prop !== 'string' || prop === 'then') return undefined; return async () => { throw createApiAdapterUnavailableError('laboratoryRepository', prop, 501, 'NOT_IMPLEMENTED'); }; } });
}
