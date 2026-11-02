import type { HospitalExamRepository } from '../../contracts';
import type { OrdenExamenHospital,ResultadoExamenHospital,PaginaServiciosHospital,ConsultaPaginaHospital } from '../../types';
import {HttpClient} from '../httpClient';
import {HttpError} from '../errors';
import {stableCommandKeys} from '../stableCommand';

export function createHttpExamRepository(http:HttpClient):HospitalExamRepository {
  const key=stableCommandKeys(),p=(id:string)=>`/hospital/pacientes/${encodeURIComponent(id)}`;
  async function pagina<T>(path:string,q:Record<string,string>={},pag:ConsultaPaginaHospital={pagina:1,limite:25}):Promise<PaginaServiciosHospital<T>>{
    return (await http.get<PaginaServiciosHospital<T>>(path,{query:{...q,pagina:pag.pagina,limite:pag.limite}})).data;
  }
  async function porId<T>(path:string):Promise<T|null>{try{return (await http.get<T>(path)).data;}catch(e){if(e instanceof HttpError&&e.status===404)return null;throw e;}}
  return {
    listarOrdenes:(_i,estado,pag)=>pagina<OrdenExamenHospital>('/hospital/examenes/ordenes',estado&&estado!=='TODAS'?{estado}:{},pag),
    obtenerOrdenPorId:(_i,id)=>porId<OrdenExamenHospital>(`/hospital/examenes/ordenes/${encodeURIComponent(id)}`),
    obtenerOrdenesPorPaciente:(_i,id,pag)=>pagina<OrdenExamenHospital>('/hospital/examenes/ordenes',{pacienteId:id},pag),
    obtenerResultadosPorOrden:(_i,id,pag)=>pagina<ResultadoExamenHospital>(`/hospital/examenes/ordenes/${encodeURIComponent(id)}/resultados`,{},pag),
    obtenerResultadoPorId:(_i,id)=>porId<ResultadoExamenHospital>(`/hospital/examenes/resultados/${encodeURIComponent(id)}`),
    obtenerResultadosPorPaciente:(_i,id,pag)=>pagina<ResultadoExamenHospital>(`${p(id)}/resultados`,{},pag),
    async crearOrden(_i,d){
      const body={consultaId:d.consultaId,versionConsulta:d.versionConsulta,versionPaciente:d.versionPaciente,pruebasIds:d.pruebasIds,prioridad:d.prioridad,motivoClinico:d.motivoClinico,...(d.diagnosticoPresuntivoCIE10?{diagnosticoPresuntivoCIE10:d.diagnosticoPresuntivoCIE10}:{})};
      const path=`${p(d.pacienteId)}/examenes/ordenes`;return (await http.post<OrdenExamenHospital>(path,body,{idempotencyKey:key(path,body)})).data;
    },
    async cancelarOrden(_i,id,motivo,versionEsperada){
      // El recurso se carga para conocer su paciente; la versión de intención viene de la UI.
      const orden=await porId<OrdenExamenHospital>(`/hospital/examenes/ordenes/${encodeURIComponent(id)}`);
      if(!orden)throw new HttpError({status:404,codigo:'RECURSO_NO_ENCONTRADO',mensaje:'Orden no encontrada.'});
      const body={versionEsperada,motivo},path=`${p(orden.pacienteId)}/examenes/ordenes/${encodeURIComponent(id)}/cancelacion`;
      return (await http.post<OrdenExamenHospital>(path,body,{idempotencyKey:key(path,body)})).data;
    },
    async registrarResultado(_i,d){
      if(!d.pacienteId)throw new HttpError({status:400,codigo:'SOLICITUD_INVALIDA',mensaje:'Falta el paciente de la orden.'});
      const body={versionEsperada:d.versionEsperada,pruebaId:d.pruebaId,parametros:d.parametros,interpretacionClinica:d.interpretacionClinica,
        ...(d.observacionesTecnicas?{observacionesTecnicas:d.observacionesTecnicas}:{}),...(d.motivoCorreccion?{motivoCorreccion:d.motivoCorreccion,versionResultado:d.versionResultado}:{})};
      const path=`${p(d.pacienteId)}/examenes/ordenes/${encodeURIComponent(d.ordenId)}/resultados`;
      return (await http.post<ResultadoExamenHospital>(path,body,{idempotencyKey:key(path,body)})).data;
    },
  };
}
