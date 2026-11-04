import {objetoCerrado,textoClinico} from '../../../dominio/clinica/consulta.js';
import {uuidPublico} from '../../../dominio/compartido/uuid.js';
import {versionPositiva} from '../../../dominio/compartido/version.js';
import {dinero} from '../../../dominio/compartido/dinero.js';
import {ErrorDominio,solicitudInvalida} from '../../../dominio/compartido/error-dominio.js';
import {validarPermiso} from '../../../dominio/clinica/politicas-institucionales.js';
import {crearOrdenLaboratorio,type OrdenLaboratorio,type PruebaVersionada} from '../../../dominio/laboratorio/ordenes.js';
import type {Paciente} from '../../../dominio/clinica/paciente.js';
import {prepararComandoEstable} from '../../servicios/preparar-comando-estable.js';
import {contextoVigente,type DependenciasClinicas,type ParametrosClinicos} from '../consultas/atencion-clinica.js';

export class CrearOrdenLaboratorio {
 constructor(private readonly deps:DependenciasClinicas){}
 async ejecutar(p:ParametrosClinicos){
  if(p.contexto.cuenta.institucion!=='LABORATORIO_CLINICO'||p.bundle.institucion!=='LABORATORIO_CLINICO')throw new ErrorDominio('SIN_PERMISO','Capacidad exclusiva de laboratorio.');
  validarPermiso(p.contexto.cuenta,'ordenes.administrar');
  const e=objetoCerrado(p.entrada,['pacienteId','versionPaciente','solicitanteId','prioridad','indicaciones','moneda','items']);
  const pacienteId=uuidPublico(e.pacienteId),versionPaciente=versionPositiva(e.versionPaciente),solicitanteId=uuidPublico(e.solicitanteId);
  if(!['RUTINA','URGENTE','EMERGENCIA'].includes(e.prioridad as string))throw solicitudInvalida('Prioridad inválida.','prioridad');
  const indicaciones=textoClinico(e.indicaciones,'indicaciones',2000,true);
  if(e.moneda!=='GTQ')throw solicitudInvalida('La moneda GTQ es obligatoria.','moneda');
  if(!Array.isArray(e.items)||e.items.length<1||e.items.length>100)throw solicitudInvalida('La orden requiere de 1 a 100 ítems.','items');
  const items=e.items.map(v=>{const i=objetoCerrado(v,['pruebaId','centavos']);return {pruebaId:uuidPublico(i.pruebaId),centavos:dinero(i.centavos,e.moneda).centavos};});
  if(new Set(items.map(i=>i.pruebaId)).size!==items.length)throw solicitudInvalida('No se admiten pruebas duplicadas.','items');
  const dto={pacienteId,versionPaciente,solicitanteId,prioridad:e.prioridad as OrdenLaboratorio['prioridad'],indicaciones,moneda:'GTQ',items};
  const comando=await prepararComandoEstable(p.claveIdempotencia,'laboratorio.orden.crear',dto,['revision','auditoria',...items.map((_,i)=>`item${i}`)],this.deps);
  if(!p.bundle.uow)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Persistencia no disponible.');
  return p.bundle.uow.ejecutar<OrdenLaboratorio>(p.contexto,comando,async lector=>{
   const contexto=await contextoVigente(lector,p.contexto);validarPermiso(contexto.cuenta,'ordenes.administrar');
   const refs=lector.laboratorio;if(!refs)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Laboratorio no preparado.');
   const paciente=await lector.pacientes.porId(pacienteId) as Paciente|null;
   if(!paciente||paciente.institucion!=='LABORATORIO_CLINICO')throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Paciente no encontrado.');
   if(paciente.version!==versionPaciente)throw new ErrorDominio('VERSION_DESACTUALIZADA','El paciente cambió.');
   if(paciente.estado!=='ACTIVO')throw new ErrorDominio('ESTADO_INVALIDO','El expediente no admite órdenes nuevas.');
   const solicitante=await refs.solicitantePorId(solicitanteId);
   if(!solicitante?.activo)throw new ErrorDominio('REFERENCIA_INCOMPATIBLE','Solicitante no habilitado.');
   const seleccion:{id:string;prueba:PruebaVersionada;centavos:number}[]=[];
   for(const [i,item] of items.entries()){
    const prueba=await refs.pruebaPorId(item.pruebaId);
    if(!prueba?.activo)throw new ErrorDominio('REFERENCIA_INCOMPATIBLE','Prueba no habilitada.');
    const metodo=await refs.metodoPorId(uuidPublico(prueba.metodoId));
    if(!metodo?.activo)throw new ErrorDominio('REFERENCIA_INCOMPATIBLE','Método no habilitado.');
    for(const tipoId of prueba.tiposMuestraIds){if(!(await refs.tipoMuestraPorId(uuidPublico(tipoId)))?.activo)throw new ErrorDominio('REFERENCIA_INCOMPATIBLE','Tipo de muestra no habilitado.');}
    seleccion.push({id:comando.ids[`item${i}`]!,prueba,centavos:item.centavos});
   }
   const orden=crearOrdenLaboratorio({id:comando.id,pacienteId,solicitanteId,prioridad:dto.prioridad,indicaciones,registradoPorId:contexto.cuenta.id,instante:comando.instante},seleccion);
   return {tipo:'CONFIRMAR',cambios:[{agregado:'pacientes',tipo:'RESERVAR_ORDEN',recursoId:pacienteId,versionAnterior:versionPaciente,nuevoEstado:{id:pacienteId,version:versionPaciente+1}},{agregado:'ordenes',tipo:'CREAR_ORDEN',recursoId:comando.id,versionAnterior:null,nuevoEstado:orden}],
    revisiones:[{id:comando.ids.revision!,agregado:'pacientes',recursoId:pacienteId,versionAnterior:versionPaciente,snapshotAnterior:paciente}],
    auditoria:[{id:comando.ids.auditoria!,actorId:contexto.cuenta.id,caso:comando.caso,recursoId:comando.id,fechaHora:comando.instante,correlacion:contexto.correlacion}],
    resultado:{httpStatus:201,respuesta:orden,correlacionOriginal:contexto.correlacion}};
  });
 }
}
