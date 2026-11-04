import {objetoCerrado,textoClinico} from '../../../dominio/clinica/consulta.js';
import {validarReferenciaAdministrativa,type TipoReferenciaAdministrativa} from '../../../dominio/laboratorio/referencias.js';
import {uuidPublico} from '../../../dominio/compartido/uuid.js';
import {versionPositiva} from '../../../dominio/compartido/version.js';
import {ErrorDominio,solicitudInvalida} from '../../../dominio/compartido/error-dominio.js';
import {validarPermiso} from '../../../dominio/clinica/politicas-institucionales.js';
import {contextoVigente,siguienteVersion,type DependenciasClinicas,type ParametrosClinicos} from '../consultas/atencion-clinica.js';
import {prepararComandoEstable} from '../../servicios/preparar-comando-estable.js';
const agregados={solicitante:'solicitantes',tipoMuestra:'tipos_muestra',proveedor:'proveedores'} as const;
export class GuardarReferenciaLaboratorio{
 constructor(private readonly deps:DependenciasClinicas){}
 async ejecutar(tipo:TipoReferenciaAdministrativa,p:ParametrosClinicos){
  const autorizar=(c:typeof p.contexto)=>{if(c.cuenta.institucion!=='LABORATORIO_CLINICO'||p.bundle.institucion!=='LABORATORIO_CLINICO'||!c.cuenta.roles.includes('ADMIN_INSTITUCIONAL'))throw new ErrorDominio('SIN_PERMISO','No puede mantener referencias administrativas.');validarPermiso(c.cuenta,'ordenes.administrar');};
  autorizar(p.contexto);const e=objetoCerrado(p.entrada,['datos','versionEsperada','motivo']);
  const datos=validarReferenciaAdministrativa(tipo,e.datos),id=p.id?uuidPublico(p.id):null;
  const versionEsperada=id?versionPositiva(e.versionEsperada):null;
  if(!id&&e.versionEsperada!==undefined)throw solicitudInvalida('Un alta no tiene revisión anterior.');
  const motivo=textoClinico(e.motivo,'motivo',1000).trim();
  const comando=await prepararComandoEstable(p.claveIdempotencia,`laboratorio.${tipo}.guardar`,{id,datos,versionEsperada,motivo},['revision','auditoria'],this.deps);
  if(!p.bundle.uow)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Persistencia no disponible.');
  return p.bundle.uow.ejecutar(p.contexto,comando,async lector=>{
   const contexto=await contextoVigente(lector,p.contexto);autorizar(contexto);const refs=lector.laboratorio;
   if(!refs)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Laboratorio no preparado.');
   const anterior=id?(tipo==='solicitante'?await refs.solicitantePorId(id):tipo==='tipoMuestra'?await refs.tipoMuestraPorId(id):await refs.proveedorPorId(id)):null;
   if(id&&!anterior)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Referencia no encontrada.');
   if(anterior&&anterior.version!==versionEsperada)throw new ErrorDominio('VERSION_DESACTUALIZADA','La referencia cambió.');
   if(tipo==='solicitante'&&anterior&&'tipo' in anterior&&anterior.tipo!==datos.tipo)throw new ErrorDominio('REFERENCIA_INCOMPATIBLE','No puede convertir un solicitante médico en institución.');
   const respuesta={id:id??comando.id,version:anterior?siguienteVersion(anterior.version):versionPositiva(1),datos};
   return {tipo:'CONFIRMAR',cambios:[{agregado:agregados[tipo],tipo:'GUARDAR_REFERENCIA',recursoId:respuesta.id,versionAnterior:versionEsperada,nuevoEstado:{...respuesta,tipoReferencia:tipo}}],revisiones:anterior?[{id:comando.ids.revision!,agregado:agregados[tipo],recursoId:respuesta.id,versionAnterior:anterior.version,snapshotAnterior:anterior}]:[],auditoria:[{id:comando.ids.auditoria!,actorId:contexto.cuenta.id,caso:comando.caso,recursoId:respuesta.id,fechaHora:comando.instante,correlacion:contexto.correlacion,motivo}],resultado:{httpStatus:id?200:201,respuesta,correlacionOriginal:contexto.correlacion}};
  });
 }
}
