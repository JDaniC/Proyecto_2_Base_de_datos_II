import type {PatientRepository} from '../../contracts';
import type {PolizaSeguroPaciente,ProcedimientoHospitalarioItem,PaginaServiciosHospital} from '../../types';
import {HttpClient} from '../httpClient';
import {stableCommandKeys} from '../stableCommand';

type PolizaWire=Omit<PolizaSeguroPaciente,'copagoConsultaGTQ'|'limiteMaximoAnualGTQ'>&{copagoCentavos:number;limiteMaximoAnualCentavos:number|null};
const poliza=(p:PolizaWire):PolizaSeguroPaciente=>({...p,copagoConsultaGTQ:p.copagoCentavos/100,...(p.limiteMaximoAnualCentavos===null?{}:{limiteMaximoAnualGTQ:p.limiteMaximoAnualCentavos/100})});
export function patientHospitalMethods(http:HttpClient):Pick<PatientRepository,'obtenerPolizasSeguro'|'afiliarPolizaSeguro'|'cambiarEstadoPoliza'|'obtenerProcedimientosPaciente'|'registrarProcedimientoPaciente'>{
  const key=stableCommandKeys(),path=(id:string)=>`/hospital/pacientes/${encodeURIComponent(id)}`;
  return {
    async obtenerPolizasSeguro(_i,id,pagina={pagina:1,limite:25}){const r=(await http.get<PaginaServiciosHospital<PolizaWire>>(`${path(id)}/polizas`,{query:{...pagina}})).data;return {...r,items:r.items.map(poliza)};},
    async afiliarPolizaSeguro(_i,id,d){
      const body={versionPaciente:d.versionPaciente,aseguradoraId:d.aseguradoraId,planId:d.planId,numeroPoliza:d.numeroPoliza,numeroCertificado:d.numeroCertificado,
        vigenciaDesde:d.vigenciaDesde,vigenciaHasta:d.vigenciaHasta,copagoCentavos:Math.round((d.copagoConsultaGTQ??0)*100),
        titular:{nombres:d.titular.nombres,apellidos:d.titular.apellidos,numeroIdentificacion:d.titular.numeroIdentificacion,telefonoContacto:d.titular.telefonoContacto,parentesco:d.titular.parentesco},...(d.observaciones?{observaciones:d.observaciones}:{})};
      const url=`${path(id)}/polizas`;return poliza((await http.post<PolizaWire>(url,body,{idempotencyKey:d.idempotencyKey??key(url,body)})).data);
    },
    async cambiarEstadoPoliza(_i,id,pid,estado,versionEsperada,motivo){const body={estado,versionEsperada,motivo},url=`${path(id)}/polizas/${encodeURIComponent(pid)}/estado`;return poliza((await http.post<PolizaWire>(url,body,{idempotencyKey:key(url,body)})).data);},
    async obtenerProcedimientosPaciente(_i,id,pagina={pagina:1,limite:25}){return (await http.get<PaginaServiciosHospital<ProcedimientoHospitalarioItem>>(`${path(id)}/procedimientos`,{query:{...pagina}})).data;},
    async registrarProcedimientoPaciente(_i,id,d){const body={consultaId:d.consultaId,versionConsulta:d.versionConsulta,versionPaciente:d.versionPaciente,procedimientoId:d.procedimientoId,resultado:d.resultado,...(d.observaciones?{observaciones:d.observaciones}:{})},url=`${path(id)}/procedimientos`;return (await http.post<ProcedimientoHospitalarioItem>(url,body,{idempotencyKey:key(url,body)})).data;},
  };
}
