import type {BundleInstitucional} from '../../puertos/bundle-institucional.js';
import {crearContextoAutenticado,type ContextoAutenticado} from '../../puertos/contexto-autenticado.js';
import {ErrorDominio,solicitudInvalida} from '../../../dominio/compartido/error-dominio.js';
import {objetoCerrado} from '../../../dominio/clinica/consulta.js';
import {uuidPublico} from '../../../dominio/compartido/uuid.js';
import {instanteUtc} from '../../../dominio/compartido/instante-utc.js';
import {normalizarInstante} from '../historiales/consultar-historial.js';
import {validarPermiso} from '../../../dominio/clinica/politicas-institucionales.js';
type Parametros={contexto:ContextoAutenticado;bundle:BundleInstitucional};
export class ConsultarCobrosLaboratorio {
 private async contexto(p:Parametros){
  if(p.contexto.cuenta.institucion!=='LABORATORIO_CLINICO'||p.bundle.institucion!=='LABORATORIO_CLINICO')throw new ErrorDominio('SIN_PERMISO','Capacidad exclusiva de laboratorio.');
  if(!p.bundle.cuenta||!p.bundle.cobros)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Cobros no preparados.');
  const cuenta=await p.bundle.cuenta.porUid(p.contexto.identidad.uid);
  if(!cuenta)throw new ErrorDominio('CUENTA_NO_HABILITADA','Cuenta no habilitada.');
  if(cuenta.id!==p.contexto.cuenta.id)throw new ErrorDominio('SIN_PERMISO','La cuenta cambió.');
  const c=crearContextoAutenticado(p.contexto.identidad,cuenta,p.contexto.correlacion);validarPermiso(c.cuenta,'cobros.administrar');return c;
 }
 async detalle(p:Parametros&{id:unknown}){
  await this.contexto(p);const d=await p.bundle.cobros!.detalle(uuidPublico(p.id));if(!d)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Factura no encontrada.');return d;
 }
 async listar(recurso:'facturas'|'pagos',p:Parametros&{entrada:unknown;id?:unknown}){
  const c=await this.contexto(p);
  const e=objetoCerrado(p.entrada,[...(recurso==='facturas'?['ordenId','pacienteId']:[]),'estado','desde','hasta','limite','orden','cursor']);
  const limite=e.limite??20,orden=e.orden??'ASC';
  if(typeof limite!=='number'||!Number.isInteger(limite)||limite<1||limite>100||!['ASC','DESC'].includes(orden as string)||(e.cursor!==undefined&&typeof e.cursor!=='string'))throw solicitudInvalida('Paginación inválida.');
  if(e.estado!==undefined&&!(recurso==='facturas'?['EMITIDA','ANULADA']:['CONFIRMADO','ANULADO']).includes(e.estado as string))throw solicitudInvalida('Estado inválido.');
  const desde=e.desde===undefined?undefined:normalizarInstante(instanteUtc(e.desde)),hasta=e.hasta===undefined?undefined:normalizarInstante(instanteUtc(e.hasta));
  if(desde&&hasta&&desde>=hasta)throw solicitudInvalida('Rango inválido.');
  return p.bundle.cobros!.listar(c,recurso,{...(e.ordenId===undefined?{}:{ordenId:uuidPublico(e.ordenId)}),...(e.pacienteId===undefined?{}:{pacienteId:uuidPublico(e.pacienteId)}),...(e.estado===undefined?{}:{estado:e.estado as string}),...(desde?{desde}:{}),...(hasta?{hasta}:{})},{limite,orden:orden as 'ASC'|'DESC',...(e.cursor===undefined?{}:{cursor:e.cursor as string})},recurso==='pagos'?uuidPublico(p.id):undefined);
 }
}
