import type { AntecedentesClinicos } from '../../types';
import { HttpClient } from '../httpClient';
export interface AntecedentesPediatricosDto {
  version:number;
  alergias:Array<{id:string;sustancia:string;severidad:'LEVE'|'MODERADA'|'SEVERA';reaccion:string;activa:boolean;fechaHora:string;actorId:string}>;
  perinatales?:AntecedentesClinicos['perinatales'];
  historia?:Pick<AntecedentesClinicos,'patologicos'|'quirurgicos'|'familiares'|'medicamentosActuales'>;
  verificacionSinAlergias?:{actorId:string;fechaHora:string};
}
export function mapearAntecedentesPediatricos(dto:AntecedentesPediatricosDto):AntecedentesClinicos {
  return {patologicos:dto.historia?.patologicos??[],quirurgicos:dto.historia?.quirurgicos??[],familiares:dto.historia?.familiares??[],medicamentosActuales:dto.historia?.medicamentosActuales??[],versionAntecedentes:dto.version,historiaRegistrada:dto.historia!==undefined,
    alergias:dto.alergias.filter(a=>a.activa).map(a=>({id:a.id,sustancia:a.sustancia,severidad:a.severidad,reaccion:a.reaccion,fechaRegistro:a.fechaHora})),
    perinatales:dto.perinatales,
    verificacionAlergias:dto.verificacionSinAlergias&&{verificadoPor:dto.verificacionSinAlergias.actorId,fechaVerificacion:dto.verificacionSinAlergias.fechaHora}};
}
export async function leerAntecedentesPediatricos(http:HttpClient,id:string){
  return mapearAntecedentesPediatricos((await http.get<AntecedentesPediatricosDto>(`/pacientes/${encodeURIComponent(id)}/antecedentes-pediatricos`)).data);
}
