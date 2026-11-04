import {objetoCerrado,textoClinico} from '../../../dominio/clinica/consulta.js';
import {uuidPublico} from '../../../dominio/compartido/uuid.js';
import {versionPositiva} from '../../../dominio/compartido/version.js';
import {ErrorDominio,solicitudInvalida} from '../../../dominio/compartido/error-dominio.js';
import {validarPermiso} from '../../../dominio/clinica/politicas-institucionales.js';
import {contextoVigente,type DependenciasClinicas,type ParametrosClinicos} from '../consultas/atencion-clinica.js';
import {prepararComandoEstable} from '../../servicios/preparar-comando-estable.js';
export class PublicarMetodoLaboratorio{
 constructor(private readonly deps:DependenciasClinicas){}
 async ejecutar(p:ParametrosClinicos){
  const autorizar=(c:typeof p.contexto)=>{if(c.cuenta.institucion!=='LABORATORIO_CLINICO'||p.bundle.institucion!=='LABORATORIO_CLINICO'||!c.cuenta.roles.includes('VALIDADOR_LABORATORIO'))throw new ErrorDominio('SIN_PERMISO','No puede publicar métodos de laboratorio.');validarPermiso(c.cuenta,'resultados.validar');};
  autorizar(p.contexto);
  const e=objetoCerrado(p.entrada,['codigo','version','anteriorId','nombre','descripcion']);
  const version=versionPositiva(e.version),anteriorId=e.anteriorId===undefined?null:uuidPublico(e.anteriorId);
  if((version===1&&anteriorId)||(version>1&&!anteriorId))throw solicitudInvalida('La versión requiere predecesora exacta.');
  const codigo=textoClinico(e.codigo,'codigo',40).trim(),nombre=textoClinico(e.nombre,'nombre',200).trim();
  const descripcion=e.descripcion===undefined?'':textoClinico(e.descripcion,'descripcion',2000,true);
  const comando=await prepararComandoEstable(p.claveIdempotencia,'laboratorio.metodo.publicar',{codigo,nombre,descripcion,version,anteriorId},['auditoria'],this.deps);
  if(!p.bundle.uow)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Persistencia no disponible.');
  return p.bundle.uow.ejecutar(p.contexto,comando,async lector=>{
   const contexto=await contextoVigente(lector,p.contexto);autorizar(contexto);const refs=lector.laboratorio;
   if(!refs)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Laboratorio no preparado.');
   if(anteriorId){const anterior=await refs.metodoPorId(anteriorId);if(!anterior||anterior.codigo!==codigo||anterior.version+1!==version)throw new ErrorDominio('REFERENCIA_INCOMPATIBLE','Predecesora incompatible.');}
   const metodo={id:comando.id,codigo,nombre,version,descripcion,activo:true};
   return {tipo:'CONFIRMAR',cambios:[{agregado:'metodos',tipo:'PUBLICAR_METODO',recursoId:comando.id,versionAnterior:null,nuevoEstado:metodo}],revisiones:[],auditoria:[{id:comando.ids.auditoria!,actorId:contexto.cuenta.id,caso:comando.caso,recursoId:comando.id,fechaHora:comando.instante,correlacion:contexto.correlacion}],resultado:{httpStatus:201,respuesta:metodo,correlacionOriginal:contexto.correlacion}};
  });
 }
}
