import {objetoCerrado,textoClinico} from '../../../dominio/clinica/consulta.js';
import {uuidPublico} from '../../../dominio/compartido/uuid.js';
import {versionPositiva} from '../../../dominio/compartido/version.js';
import {ErrorDominio,solicitudInvalida} from '../../../dominio/compartido/error-dominio.js';
import {validarPermiso} from '../../../dominio/clinica/politicas-institucionales.js';
import {contextoVigente,siguienteVersion,type DependenciasClinicas,type ParametrosClinicos} from '../consultas/atencion-clinica.js';
import {prepararComandoEstable} from '../../servicios/preparar-comando-estable.js';
export class CambiarEstadoVersionLaboratorio{
 constructor(private readonly deps:DependenciasClinicas,private readonly tipo:'prueba'|'metodo'){}
 async ejecutar(p:ParametrosClinicos){
  const autorizar=(c:typeof p.contexto)=>{if(c.cuenta.institucion!=='LABORATORIO_CLINICO'||p.bundle.institucion!=='LABORATORIO_CLINICO'||!c.cuenta.roles.includes('VALIDADOR_LABORATORIO'))throw new ErrorDominio('SIN_PERMISO','No puede administrar versiones de catálogo.');validarPermiso(c.cuenta,'resultados.validar');};
  autorizar(p.contexto);
  const id=uuidPublico(p.id),e=objetoCerrado(p.entrada,['versionEsperada','activo','motivo']);
  const versionEsperada=versionPositiva(e.versionEsperada),motivo=textoClinico(e.motivo,'motivo',1000).trim();
  if(typeof e.activo!=='boolean')throw solicitudInvalida('El estado debe ser booleano.','activo');const activo=e.activo;
  const comando=await prepararComandoEstable(p.claveIdempotencia,`laboratorio.${this.tipo}.estado`,{id,versionEsperada,activo,motivo},['revision','auditoria'],this.deps);
  if(!p.bundle.uow)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Persistencia no disponible.');
  return p.bundle.uow.ejecutar(p.contexto,comando,async lector=>{
   const contexto=await contextoVigente(lector,p.contexto);autorizar(contexto);const refs=lector.laboratorio;
   if(!refs)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Laboratorio no preparado.');
   const anterior=this.tipo==='prueba'?await refs.pruebaPorId(id):await refs.metodoPorId(id);
   const revision=this.tipo==='prueba'?await refs.revisionPruebaPorId(id):await refs.revisionMetodoPorId(id);
   if(!anterior||revision===null)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Versión no encontrada.');
   if(revision!==versionEsperada)throw new ErrorDominio('VERSION_DESACTUALIZADA','La versión de catálogo cambió.');
   if(anterior.activo===activo)throw new ErrorDominio('ESTADO_INVALIDO','La versión ya tiene ese estado.');
   const respuesta={id,activo,revision:siguienteVersion(revision)};
   return {tipo:'CONFIRMAR',cambios:[{agregado:this.tipo==='prueba'?'pruebas':'metodos',tipo:'CAMBIAR_ESTADO',recursoId:id,versionAnterior:revision,nuevoEstado:respuesta}],revisiones:[{id:comando.ids.revision!,agregado:this.tipo==='prueba'?'pruebas':'metodos',recursoId:id,versionAnterior:revision,snapshotAnterior:{[this.tipo]:anterior,revision}}],auditoria:[{id:comando.ids.auditoria!,actorId:contexto.cuenta.id,caso:comando.caso,recursoId:id,fechaHora:comando.instante,correlacion:contexto.correlacion,motivo}],resultado:{httpStatus:200,respuesta,correlacionOriginal:contexto.correlacion}};
  });
 }
}
