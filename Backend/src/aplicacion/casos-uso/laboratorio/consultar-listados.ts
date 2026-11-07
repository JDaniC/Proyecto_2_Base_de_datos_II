import type {FiltrosOrdenesLaboratorio,FiltrosMuestrasLaboratorio,FiltrosResultadosLaboratorio} from '../../puertos/laboratorio.js';
import {objetoCerrado} from '../../../dominio/clinica/consulta.js';
import {uuidPublico} from '../../../dominio/compartido/uuid.js';
import {ErrorDominio,solicitudInvalida} from '../../../dominio/compartido/error-dominio.js';
import {crearContextoAutenticado,type ContextoAutenticado} from '../../puertos/contexto-autenticado.js';
import type {BundleInstitucional} from '../../puertos/bundle-institucional.js';
import {validarPermiso} from '../../../dominio/clinica/politicas-institucionales.js';
import type {FiltrosPagina} from '../../puertos/nucleo.js';
export class ConsultarListadosLaboratorio{
 async ejecutar(recurso:'ordenes'|'muestras'|'resultados',p:{contexto:ContextoAutenticado;bundle:BundleInstitucional;entrada:unknown}){
  if(p.contexto.cuenta.institucion!=='LABORATORIO_CLINICO'||p.bundle.institucion!=='LABORATORIO_CLINICO')throw new ErrorDominio('SIN_PERMISO','Capacidad exclusiva de laboratorio.');
  const e=objetoCerrado(p.entrada,['pacienteId',...(recurso!=='ordenes'?['ordenId']:[]),...(recurso==='resultados'?['itemId','serieId']:[]),'estado','desde','hasta','limite','orden','cursor']);
  if(!p.bundle.cuenta||!p.bundle.listadosLaboratorio)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Laboratorio no preparado.');
  const cuenta=await p.bundle.cuenta.porUid(p.contexto.identidad.uid);
  if(!cuenta)throw new ErrorDominio('CUENTA_NO_HABILITADA','Cuenta no habilitada.');
  if(cuenta.id!==p.contexto.cuenta.id)throw new ErrorDominio('SIN_PERMISO','La cuenta cambió.');
  const contexto=crearContextoAutenticado(p.contexto.identidad,cuenta,p.contexto.correlacion);
  if(recurso==='resultados'){
   if(!cuenta.permisos.some(v=>v==='resultados.analizar'||v==='resultados.validar'))throw new ErrorDominio('SIN_PERMISO','No puede consultar resultados.');
  }else validarPermiso(cuenta,recurso==='ordenes'?'ordenes.administrar':'muestras.administrar');
  const limite=e.limite===undefined?20:e.limite,orden=e.orden===undefined?'DESC':e.orden;
  if(typeof limite!=='number'||!Number.isInteger(limite)||limite<1||limite>100||!['ASC','DESC'].includes(orden as string))throw solicitudInvalida('Paginación inválida.');
  for(const k of ['estado','desde','hasta','cursor'])if(e[k]!==undefined&&typeof e[k]!=='string')throw solicitudInvalida('Filtro inválido.',k);
  const estados=recurso==='ordenes'?['CREADA','EN_PROCESO','COMPLETADA','CANCELADA']:recurso==='muestras'?['TOMADA','RECIBIDA','ACEPTADA','RECHAZADA','PROCESADA']:['BORRADOR','VALIDADO'];
  if(e.estado!==undefined&&!estados.includes(e.estado as string))throw solicitudInvalida('Estado inválido.');
  const filtros={...(e.pacienteId===undefined?{}:{pacienteId:uuidPublico(e.pacienteId)}),...(e.ordenId===undefined?{}:{ordenId:uuidPublico(e.ordenId)}),...(e.itemId===undefined?{}:{itemId:uuidPublico(e.itemId)}),...(e.serieId===undefined?{}:{serieId:uuidPublico(e.serieId)}),...(e.estado===undefined?{}:{estado:e.estado as string}),...(e.desde===undefined?{}:{desde:e.desde as string}),...(e.hasta===undefined?{}:{hasta:e.hasta as string})};
  const pagina:FiltrosPagina={limite,orden:orden as 'ASC'|'DESC',...(e.cursor===undefined?{}:{cursor:e.cursor as string})};
  if(recurso==='ordenes')return p.bundle.listadosLaboratorio.listarOrdenes(contexto,filtros as FiltrosOrdenesLaboratorio,pagina);
  if(recurso==='muestras')return p.bundle.listadosLaboratorio.listarMuestras(contexto,filtros as FiltrosMuestrasLaboratorio,pagina);
  return p.bundle.listadosLaboratorio.listarResultados(contexto,filtros as FiltrosResultadosLaboratorio,pagina);
 }
}
