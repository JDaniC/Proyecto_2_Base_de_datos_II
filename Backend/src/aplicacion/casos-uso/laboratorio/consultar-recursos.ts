import {objetoCerrado} from '../../../dominio/clinica/consulta.js';
import {uuidPublico} from '../../../dominio/compartido/uuid.js';
import {ErrorDominio,solicitudInvalida} from '../../../dominio/compartido/error-dominio.js';
import {crearContextoAutenticado,type ContextoAutenticado} from '../../puertos/contexto-autenticado.js';
import type {BundleInstitucional} from '../../puertos/bundle-institucional.js';
import type {TipoCatalogoLaboratorio} from '../../puertos/laboratorio.js';
import type {Permiso} from '../../../dominio/compartido/autorizacion.js';
type Parametros={contexto:ContextoAutenticado;bundle:BundleInstitucional};
export class ConsultarRecursosLaboratorio{
 private async contexto(p:Parametros,permisos:readonly Permiso[]){
  if(p.contexto.cuenta.institucion!=='LABORATORIO_CLINICO'||p.bundle.institucion!=='LABORATORIO_CLINICO')throw new ErrorDominio('SIN_PERMISO','Capacidad exclusiva de laboratorio.');
  if(!p.bundle.cuenta||!p.bundle.consultasLaboratorio)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Laboratorio no preparado.');
  const cuenta=await p.bundle.cuenta.porUid(p.contexto.identidad.uid);
  if(!cuenta)throw new ErrorDominio('CUENTA_NO_HABILITADA','Cuenta no habilitada.');
  if(cuenta.id!==p.contexto.cuenta.id)throw new ErrorDominio('SIN_PERMISO','La cuenta cambió.');
  const contexto=crearContextoAutenticado(p.contexto.identidad,cuenta,p.contexto.correlacion);
  if(!permisos.some(v=>cuenta.permisos.includes(v)))throw new ErrorDominio('SIN_PERMISO','No puede consultar este recurso.');
  return contexto;
 }
 async detalle(recurso:'ordenes'|'muestras'|'resultados',p:Parametros&{id:unknown}){
  if(!['ordenes','muestras','resultados'].includes(recurso))throw solicitudInvalida('Recurso inválido.');
  const contexto=await this.contexto(p,recurso==='ordenes'?['ordenes.administrar']:recurso==='muestras'?['muestras.administrar']:['resultados.analizar','resultados.validar']);
  const id=uuidPublico(p.id),repo=p.bundle.consultasLaboratorio!;
  const dato=recurso==='ordenes'?await repo.ordenPorId(contexto,id):recurso==='muestras'?await repo.muestraPorId(contexto,id):await repo.resultadoPorId(contexto,id);
  if(!dato)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Recurso no encontrado.');return dato;
 }
 async catalogo(tipo:TipoCatalogoLaboratorio,p:Parametros&{entrada:unknown}){
  if(!['solicitantes','tiposMuestra','metodos','pruebas','proveedores'].includes(tipo))throw solicitudInvalida('Catálogo inválido.');
  const contexto=await this.contexto(p,tipo==='solicitantes'||tipo==='proveedores'?['ordenes.administrar']:['ordenes.administrar','muestras.administrar','resultados.analizar','resultados.validar']);
  const e=objetoCerrado(p.entrada,['q','activo','limite','orden','cursor']);
  const limite=e.limite===undefined?20:e.limite,orden=e.orden===undefined?'ASC':e.orden;
  if(typeof limite!=='number'||!Number.isInteger(limite)||limite<1||limite>100||!['ASC','DESC'].includes(orden as string)||(e.activo!==undefined&&typeof e.activo!=='boolean')||(e.q!==undefined&&typeof e.q!=='string')||(e.cursor!==undefined&&typeof e.cursor!=='string'))throw solicitudInvalida('Consulta inválida.');
  return p.bundle.consultasLaboratorio!.listarCatalogo(contexto,tipo,{...(e.activo===undefined?{}:{activo:e.activo as boolean}),...(e.q===undefined?{}:{q:e.q as string})},{limite,orden:orden as 'ASC'|'DESC',...(e.cursor===undefined?{}:{cursor:e.cursor as string})});
 }
}
