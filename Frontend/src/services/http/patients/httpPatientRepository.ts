import { mapearAntecedentesPediatricos, type AntecedentesPediatricosDto } from '../pediatrics/antecedentes';
import type { ContextoCambioPediatrico } from '../../contracts';
import type { AlergiaRegistro, AntecedentesPerinatales } from '../../types';
import { leerAntecedentesPediatricos } from '../pediatrics/antecedentes';
import { patientHospitalMethods } from '../hospital/patientHospitalMethods';
import { stableCommandKeys } from '../stableCommand';
import type { PatientRepository } from '../../contracts';
import type {
  ActualizarPacienteDTO,
  AntecedentesClinicos,
  BuscarPacientesQuery,
  CrearPacienteDTO,
  FiltrosHistorial,
  InstitucionId,
} from '../../types';
import { HttpClient } from '../httpClient';
import { HttpError } from '../errors';
import type { ExpedienteDto, HistorialDto, PacienteDto } from './patientDtos';
import { mapearAlta, mapearCambio, mapearEvento, mapearPaciente } from './patientMapper';

interface AntecedentesDto {
  patologicos: string[];
  quirurgicos: string[];
  familiares: string[];
  alergias: AntecedentesClinicos['alergias'];
  medicamentos_actuales: string[];
  version_paciente?: number;
}

export function createHttpPatientRepository(http: HttpClient): PatientRepository {
  const path = (id: string) => `/pacientes/${encodeURIComponent(id)}`;
  const key = stableCommandKeys();
  const mutarPediatria = async (i:InstitucionId,id:string,accion:string,datos:object,version:number|undefined,cambio:ContextoCambioPediatrico|undefined) => {
    if(i!=='CENTRO_PEDIATRICO'||!Number.isSafeInteger(version)||!cambio||!Number.isSafeInteger(cambio.versionAntecedentes)||!cambio.motivo.trim())throw new HttpError({status:400,codigo:'SOLICITUD_INVALIDA',mensaje:'Recarga antecedentes y completa el motivo antes de enviar.'});
    const body={version_paciente:version,version_antecedentes:cambio.versionAntecedentes,motivo:cambio.motivo.trim(),...datos};
    const r=await http.post<AntecedentesPediatricosDto>(`${path(id)}/antecedentes-pediatricos/${accion}`,body,{idempotencyKey:key(`${id}/pediatria/${accion}`,body)});
    const paciente=mapearPaciente((await http.get<PacienteDto>(path(id))).data);
    return {paciente,antecedentes:mapearAntecedentesPediatricos(r.data)};
  };
  const methods = {
    ...patientHospitalMethods(http),
    confirmarSinAlergias:(i:InstitucionId,id:string,_autor:string,v?:number,c?:ContextoCambioPediatrico)=>mutarPediatria(i,id,'sin-alergias',{},v,c),
    registrarAlergia:(i:InstitucionId,id:string,a:AlergiaRegistro,_autor?:string,v?:number,c?:ContextoCambioPediatrico)=>mutarPediatria(i,id,'alergias',{alergia:{sustancia:a.sustancia,severidad:a.severidad,reaccion:a.reaccion}},v,c),
    eliminarAlergia:(i:InstitucionId,id:string,_sustancia:string,v?:number,c?:ContextoCambioPediatrico)=>mutarPediatria(i,id,'alergias/baja',{alergia_id:c?.alergiaId},v,c),
    async actualizarPerinatales(i:InstitucionId,id:string,p:AntecedentesPerinatales,v?:number,c?:ContextoCambioPediatrico){return (await mutarPediatria(i,id,'perinatales',{perinatales:p},v,c)).antecedentes;},
    async archivar(_i: InstitucionId, id: string, causa: string, motivo: string, versionEsperada?: number) {
      const body = {causa, motivo, version_esperada: versionEsperada};
      return mapearPaciente((await http.post<PacienteDto>(`${path(id)}/archivo`, body, {idempotencyKey: key(`${id}/archivo`, body)})).data);
    },
    async reactivar(_i: InstitucionId, id: string, motivo: string, correccionFallecimiento?: boolean, versionEsperada?: number) {
      const body = {motivo, correccion_fallecimiento: correccionFallecimiento, version_esperada: versionEsperada};
      return mapearPaciente((await http.post<PacienteDto>(`${path(id)}/reactivacion`, body, {idempotencyKey: key(`${id}/reactivacion`, body)})).data);
    },
    async buscar(_institucion: InstitucionId, q: BuscarPacientesQuery) {
      if (!q.q?.trim()) return { items: [], hayMas: false, paginaActual: 1 };
      if (q.sexo && q.sexo !== 'TODOS') throw new HttpError({ status: 400, codigo: '400 SOLICITUD_INVALIDA', mensaje: 'La búsqueda no admite filtro por sexo.' });
      if (q.orden && q.orden !== 'ASC' && q.orden !== 'DESC') throw new HttpError({ status: 400, codigo: '400 SOLICITUD_INVALIDA', mensaje: 'Selecciona orden de registro ascendente o descendente.' });
      const res = await http.get<PacienteDto[]>('/pacientes', { query: { q: q.q.trim(), estado: q.estado, orden: q.orden ?? 'ASC', cursor: q.cursor, limite: q.limite ?? 10 } });
      return { items: res.data.map((p) => mapearPaciente(p)), siguienteCursor: res.meta.siguiente_cursor, hayMas: Boolean(res.meta.siguiente_cursor), paginaActual: 1 };
    },
    async obtenerPorId(_institucion: InstitucionId, id: string) {
      try { return mapearPaciente((await http.get<PacienteDto>(path(id))).data); }
      catch (error) { if (error instanceof HttpError && error.status === 404) return null; throw error; }
    },
    async crear(_institucion: InstitucionId, dto: CrearPacienteDTO) {
      return mapearPaciente((await http.post<PacienteDto>('/pacientes', mapearAlta(dto), { idempotencyKey: dto.idempotencyKey })).data);
    },
    async actualizar(_institucion: InstitucionId, id: string, dto: ActualizarPacienteDTO) {
      return mapearPaciente((await http.patch<PacienteDto>(path(id), mapearCambio(dto), { idempotencyKey: dto.idempotencyKey })).data);
    },
    async obtenerExpedienteCompleto(_institucion: InstitucionId, id: string, filtros: FiltrosHistorial = {}) {
      try {
        const res = await http.get<ExpedienteDto>(`${path(id)}/expediente`, { query: { ...filtros, orden: filtros.orden ?? 'ASC', limite: filtros.limite ?? 20 } });
        return { paciente: mapearPaciente(res.data.paciente), eventos: res.data.historial.eventos.map(mapearEvento), siguienteCursor: res.meta.siguiente_cursor, soloProyeccion: true,
          antecedentes: { patologicos: [], quirurgicos: [], familiares: [], alergias: [], medicamentosActuales: [] }, consultas: [], diagnosticos: [], recetas: [] };
      } catch (error) { if (error instanceof HttpError && error.status === 404) return null; throw error; }
    },
    async obtenerHistorial(_institucion: InstitucionId, id: string, filtros: FiltrosHistorial) {
      const res = await http.get<HistorialDto>(`${path(id)}/historial`, { query: { ...filtros, orden: filtros.orden ?? 'ASC', limite: filtros.limite ?? 20 } });
      return { eventos: res.data.eventos.map(mapearEvento), siguienteCursor: res.meta.siguiente_cursor };
    },
    async obtenerAntecedentes(_institucion: InstitucionId, id: string): Promise<AntecedentesClinicos> {
      if(_institucion==='CENTRO_PEDIATRICO')return leerAntecedentesPediatricos(http,id);
      const res = await http.get<AntecedentesDto>(`${path(id)}/antecedentes`);
      return {
        patologicos: res.data.patologicos ?? [],
        quirurgicos: res.data.quirurgicos ?? [],
        familiares: res.data.familiares ?? [],
        alergias: res.data.alergias ?? [],
        medicamentosActuales: res.data.medicamentos_actuales ?? [],
        versionPaciente: res.data.version_paciente,
      };
    },
    async actualizarAntecedentes(
      _institucion: InstitucionId,
      id: string,
      antecedentes: AntecedentesClinicos,
      versionEsperada?: number
    ): Promise<AntecedentesClinicos> {
      let version = versionEsperada ?? antecedentes.versionPaciente;
      if (version === undefined) {
        const pac = await http.get<PacienteDto>(path(id));
        version = pac.data.version;
      }
      const body = {
        version_esperada: version,
        patologicos: antecedentes.patologicos,
        quirurgicos: antecedentes.quirurgicos,
        familiares: antecedentes.familiares,
        alergias: antecedentes.alergias.map((a) => ({
          sustancia: a.sustancia,
          severidad: a.severidad,
          reaccion: a.reaccion,
        })),
        medicamentos_actuales: antecedentes.medicamentosActuales,
      };
      const res = await http.put<AntecedentesDto>(`${path(id)}/antecedentes`, body, {
        idempotencyKey: key(`${id}/antecedentes`, body),
      });
      return {
        patologicos: res.data.patologicos ?? [],
        quirurgicos: res.data.quirurgicos ?? [],
        familiares: res.data.familiares ?? [],
        alergias: res.data.alergias ?? [],
        medicamentosActuales: res.data.medicamentos_actuales ?? [],
        versionPaciente: res.data.version_paciente,
      };
    },
  };
  // Las capacidades E03–E05 conservan un rechazo explícito hasta integrar su adaptador.
  return new Proxy(methods as unknown as PatientRepository, {
    get(target, prop, receiver) {
      if (prop in target) return Reflect.get(target, prop, receiver);
      if (typeof prop !== 'string' || prop === 'then') return undefined;
      return async () => { throw new HttpError({ status: 501, codigo: '501 NOT_IMPLEMENTED', mensaje: 'Esta operación todavía no está disponible.' }); };
    },
  });
}
