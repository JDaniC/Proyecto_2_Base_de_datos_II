import type { VaccineRepository } from '../../contracts';
import type { AplicacionVacuna, VacunaCatalogo } from '../../types';
import { HttpClient } from '../httpClient';
import { stableCommandKeys } from '../stableCommand';
export interface VaccineDto { id:string; fabricante:string; nombre:string; enfermedadObjetivo:string; versionVigente:string; dosis:Array<{dosisId:string;numero:number;etiquetaDosis?:string;edadMesesRecomendada:number}> }
interface ApplicationDto {id:string;claveLogica:string;pacienteId:string;vacunaId:string;dosisId:string;fechaAplicacion:string;lote:string;sitioAplicacion:string;pediatraId:string;observaciones?:string;estado:'APLICADA'|'ANULADA';version:number;motivoAnulacion?:string;versionEsquemaId:string;esquema?:{nombre:string;dosis:Array<{dosisId:string;numero:number;etiquetaDosis?:string}>}}
export function mapVaccine(v:VaccineDto):VacunaCatalogo {return {id:v.id,fabricante:v.fabricante,nombreVacuna:v.nombre,enfermedadPrevenida:v.enfermedadObjetivo,viaAdministracion:'SIN_DATO',esquemaVersion:v.versionVigente,dosis:v.dosis.map(d=>({dosisId:d.dosisId,numeroDosis:d.numero,etiquetaDosis:d.etiquetaDosis??`Dosis ${d.numero}`,edadRecomendadaMeses:d.edadMesesRecomendada})),estado:'ACTIVO'};}
function application(a:ApplicationDto):AplicacionVacuna {return {...a,nombreVacuna:a.esquema?.nombre??a.vacunaId,numeroDosis:a.esquema?.dosis.find(d=>d.dosisId===a.dosisId)?.numero??0,etiquetaDosis:a.esquema?.dosis.find(d=>d.dosisId===a.dosisId)?.etiquetaDosis??`Dosis ${a.esquema?.dosis.find(d=>d.dosisId===a.dosisId)?.numero??'sin dato'}`,sitioAnatomico:a.sitioAplicacion,viaAdministracion:'Sin dato',profesionalAplicador:a.pediatraId,estadoRegistro:a.estado==='ANULADA'?'ANULADO':'VIGENTE',versionRegistro:a.version,motivoCorreccion:a.motivoAnulacion};}
export function createHttpVaccineRepository(http:HttpClient):VaccineRepository {
 const generaciones = new Map<string, number>();
 const key=stableCommandKeys(); const path=(id:string)=>encodeURIComponent(id);
 async function command(route:string,body:unknown,explicit?:string,resource=route){return application((await http.post<ApplicationDto>(route,body,{idempotencyKey:explicit??key(resource,body)})).data);}
 return {
  async asignarEsquema(id,vacunaId,versionId){const route=`/pacientes/${path(id)}/esquemas`,body={vacunaId,versionId};await http.post(route,body,{idempotencyKey:key(route,body)});},
  async obtenerAplicaciones(_i,id){return (await http.get<ApplicationDto[]>(`/pacientes/${path(id)}/aplicaciones-vacuna`)).data.map(application);},
  async obtenerEsquemaCompletoPaciente(_i,id){
   const r=(await http.get<{items:Array<{vacunaId:string;versionEsquemaId:string;nombreVacuna:string;enfermedadObjetivo:string;dosisId:string;numeroDosis:number;etiquetaDosis:string;edadRecomendadaMeses:number;estado:'APLICADA'|'PENDIENTE'|'FUTURA';diasRetraso?:number;aplicacionVigente?:ApplicationDto}>}>(`/pacientes/${path(id)}/esquemas`)).data;
   return r.items.map(x=>({...x,vacuna:{id:x.vacunaId,nombreVacuna:x.nombreVacuna,enfermedadPrevenida:x.enfermedadObjetivo,viaAdministracion:'SIN_DATO',esquemaVersion:x.versionEsquemaId,dosis:[],estado:'ACTIVO'},aplicacionVigente:x.aplicacionVigente?application(x.aplicacionVigente):undefined}));
  },
  registrarAplicacion(_i,id,dto){const {vacunaId,dosisId,fechaAplicacion,lote,sitioAnatomico,observaciones}=dto;return command(`/pacientes/${path(id)}/aplicaciones-vacuna`,{vacunaId,dosisId,fechaAplicacion,lote,sitioAnatomico,observaciones},dto.idempotencyKey,`${id}/${vacunaId}/${dosisId}/${generaciones.get(`${id}/${vacunaId}/${dosisId}`)??0}`);},
  corregirAplicacion(_i,id,dto,_p,version){const {lote,sitioAnatomico,observaciones,motivo}=dto;return command(`/aplicaciones-vacuna/${path(id)}/correcciones`,{lote,sitioAnatomico,observaciones,motivo,versionEsperada:version??dto.versionEsperada},dto.idempotencyKey);},
  async anularAplicacion(_i,id,motivo,_p,version){const anulada=await command(`/aplicaciones-vacuna/${path(id)}/anulacion`,{motivo,versionEsperada:version});const recurso=`${anulada.pacienteId}/${anulada.vacunaId}/${anulada.dosisId}`;generaciones.set(recurso,anulada.versionRegistro??0);return anulada;}
 };
}
