import {objetoCerrado,textoClinico} from '../../../dominio/clinica/consulta.js';
import {uuidPublico} from '../../../dominio/compartido/uuid.js';
import {versionPositiva} from '../../../dominio/compartido/version.js';
import {ErrorDominio,solicitudInvalida} from '../../../dominio/compartido/error-dominio.js';
import {congelarPrueba,type ParametroPrueba} from '../../../dominio/laboratorio/ordenes.js';
import {validarPermiso} from '../../../dominio/clinica/politicas-institucionales.js';
import {contextoVigente,type DependenciasClinicas,type ParametrosClinicos} from '../consultas/atencion-clinica.js';
import {prepararComandoEstable} from '../../servicios/preparar-comando-estable.js';
export class PublicarPruebaLaboratorio{
 constructor(private readonly deps:DependenciasClinicas){}
 async ejecutar(p:ParametrosClinicos){
  const autorizar=(c:typeof p.contexto)=>{if(c.cuenta.institucion!=='LABORATORIO_CLINICO'||p.bundle.institucion!=='LABORATORIO_CLINICO'||!c.cuenta.roles.includes('VALIDADOR_LABORATORIO'))throw new ErrorDominio('SIN_PERMISO','No puede publicar pruebas de laboratorio.');validarPermiso(c.cuenta,'resultados.validar');};
  autorizar(p.contexto);
  const e=objetoCerrado(p.entrada,['codigo','version','anteriorId','nombre','area','metodoId','tiposMuestraIds','parametros']);
  const version=versionPositiva(e.version),anteriorId=e.anteriorId===undefined?null:uuidPublico(e.anteriorId);
  if((version===1&&anteriorId)||(version>1&&!anteriorId))throw solicitudInvalida('La versión requiere su predecesora exacta.');
  if(!Array.isArray(e.tiposMuestraIds)||!Array.isArray(e.parametros)||e.parametros.length>100)throw solicitudInvalida('Referencias o parámetros inválidos.');
  const parametros=e.parametros.map(v=>{
   const r=objetoCerrado(v,['id','codigo','nombre','tipo','obligatorio','unidad','opciones']);
   if(r.opciones!==undefined&&(!Array.isArray(r.opciones)||r.opciones.length>100))throw solicitudInvalida('Opciones inválidas.');
   return {id:uuidPublico(r.id),codigo:textoClinico(r.codigo,'codigo',40),nombre:textoClinico(r.nombre,'nombre',200),tipo:r.tipo,obligatorio:r.obligatorio,
    ...(r.unidad===undefined?{}:{unidad:textoClinico(r.unidad,'unidad',60)}),...(r.opciones===undefined?{}:{opciones:(r.opciones as unknown[]).map(o=>textoClinico(o,'opciones',200))})} as ParametroPrueba;
  });
  const area=textoClinico(e.area,'area',100),base=congelarPrueba({id:uuidPublico(this.deps.ids.nuevo()),codigo:textoClinico(e.codigo,'codigo',40),nombre:textoClinico(e.nombre,'nombre',200),version,activo:true,metodoId:uuidPublico(e.metodoId),tiposMuestraIds:e.tiposMuestraIds.map(v=>uuidPublico(v)),parametros});
  const comando=await prepararComandoEstable(p.claveIdempotencia,'laboratorio.prueba.publicar',{...base,id:undefined,area,anteriorId},['auditoria'],this.deps);
  const prueba=Object.freeze({...base,id:comando.id});
  if(!p.bundle.uow)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Persistencia no disponible.');
  return p.bundle.uow.ejecutar(p.contexto,comando,async lector=>{
   const contexto=await contextoVigente(lector,p.contexto);autorizar(contexto);const refs=lector.laboratorio;
   if(!refs)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Laboratorio no preparado.');
   if(anteriorId){
    const anterior=await refs.pruebaPorId(anteriorId);
    if(!anterior||anterior.codigo!==prueba.codigo||anterior.version+1!==version)throw new ErrorDominio('REFERENCIA_INCOMPATIBLE','Predecesora incompatible.');
    for(const param of parametros){const anteriorParametro=anterior.parametros.find(v=>v.codigo===param.codigo||v.id===param.id);if(anteriorParametro&&(anteriorParametro.codigo!==param.codigo||anteriorParametro.id!==param.id))throw new ErrorDominio('REFERENCIA_INCOMPATIBLE','La identidad del parámetro debe conservarse.');}
   }
   if(!(await refs.metodoPorId(uuidPublico(prueba.metodoId)))?.activo)throw new ErrorDominio('REFERENCIA_INCOMPATIBLE','Método no habilitado.');
   for(const tipo of prueba.tiposMuestraIds)if(!(await refs.tipoMuestraPorId(uuidPublico(tipo)))?.activo)throw new ErrorDominio('REFERENCIA_INCOMPATIBLE','Tipo de muestra no habilitado.');
   const respuesta={prueba,area};
   return {tipo:'CONFIRMAR',cambios:[{agregado:'pruebas',tipo:'PUBLICAR_PRUEBA',recursoId:comando.id,versionAnterior:null,nuevoEstado:respuesta}],revisiones:[],auditoria:[{id:comando.ids.auditoria!,actorId:contexto.cuenta.id,caso:comando.caso,recursoId:comando.id,fechaHora:comando.instante,correlacion:contexto.correlacion}],resultado:{httpStatus:201,respuesta,correlacionOriginal:contexto.correlacion}};
  });
 }
}
