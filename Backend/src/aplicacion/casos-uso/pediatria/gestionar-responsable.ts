import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import type { Paciente, ResponsableDetalle } from '../../../dominio/clinica/paciente.js';
import { objetoCerrado, textoClinico } from '../../../dominio/clinica/consulta.js';
import { validarPermiso } from '../../../dominio/clinica/politicas-institucionales.js';
import { validarPrincipalidad } from '../../../dominio/pediatria/vinculos.js';
import { prepararComandoEstable } from '../../servicios/preparar-comando-estable.js';
import { contextoVigente, exigirVersion, siguienteVersion, type DependenciasClinicas, type ParametrosClinicos } from '../consultas/atencion-clinica.js';

export class GestionarResponsable {
  constructor(private readonly deps: DependenciasClinicas) {}
  async ejecutar(accion: 'contacto' | 'vinculo' | 'baja', p: ParametrosClinicos, responsableId: string) {
    if(p.contexto.cuenta.institucion !== 'CENTRO_MEDICO_PEDIATRICO' || p.bundle.institucion !== 'CENTRO_MEDICO_PEDIATRICO') throw new ErrorDominio('SIN_PERMISO','Operación exclusiva de pediatría.');
    validarPermiso(p.contexto.cuenta,'pacientes.administrar');
    const pacienteId=uuidPublico(p.id), id=uuidPublico(responsableId);
    const e=objetoCerrado(p.entrada,accion==='contacto'?['version_paciente','version_responsable','telefono']:accion==='baja'?['version_paciente','version_vinculo','motivo']:['version_paciente','version_vinculo','parentesco','es_principal','autoriza_atencion']);
    const comando=await prepararComandoEstable(p.claveIdempotencia,`pediatria.responsable.${accion}`,{pacienteId,id,e},['revision','auditoria'],this.deps);
    if(!p.bundle.uow)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Persistencia no disponible.');
    return p.bundle.uow.ejecutar<ResponsableDetalle | {id:string;activo:boolean}>(p.contexto,comando,async lector=>{
      const contexto=await contextoVigente(lector,p.contexto);validarPermiso(contexto.cuenta,'pacientes.administrar');
      const previa=await lector.operaciones.porClave<ResponsableDetalle | {id:string;activo:boolean}>(contexto.cuenta.id,comando.caso,comando.claveIdempotencia);
      if(previa){if(previa.hashEntrada!==comando.hashEntrada)throw new ErrorDominio('CLAVE_REUTILIZADA','La clave corresponde a otra intención.');return {tipo:'REPETIR',operacion:previa};}
      const paciente=await lector.pacientes.porId(pacienteId) as Paciente|null;
      if(!paciente)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Paciente no encontrado.');
      if(paciente.estado!=='ACTIVO')throw new ErrorDominio('ESTADO_INVALIDO','El expediente está archivado.');
      exigirVersion(paciente.version,e.version_paciente);
      const vinculo=paciente.responsables?.find(r=>r.responsable.id===id);
      if(!vinculo)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Vínculo no encontrado.');
      let respuesta:ResponsableDetalle|{id:string;activo:boolean};
      let cambio;
      if(accion==='contacto'){
        exigirVersion(vinculo.responsable.version,e.version_responsable);
        const actual={...vinculo.responsable,telefono:textoClinico(e.telefono,'telefono',30),version:siguienteVersion(vinculo.responsable.version)};
        respuesta=actual;cambio={agregado:'responsableContacto',tipo:'ACTUALIZAR',recursoId:id,versionAnterior:vinculo.responsable.version,nuevoEstado:actual};
      }else{
        exigirVersion(vinculo.versionVinculo,e.version_vinculo);
        if(accion==='vinculo'&&(typeof e.es_principal!=='boolean'||typeof e.autoriza_atencion!=='boolean'))throw new ErrorDominio('SOLICITUD_INVALIDA','Las decisiones del vínculo deben ser booleanas.');
        const nuevo={...vinculo.vinculo,...(accion==='vinculo'?{parentesco:textoClinico(e.parentesco,'parentesco',60),esPrincipal:e.es_principal as boolean,autorizaAtencion:e.autoriza_atencion as boolean}:{})};
        if(accion==='baja')textoClinico(e.motivo,'motivo',1000);
        validarPrincipalidad((paciente.responsables??[]).map(r=>({responsableId:r.responsable.id,estado:r.responsable.id===id&&accion==='baja'?'INACTIVO':'ACTIVO',esPrincipal:r.responsable.id===id?nuevo.esPrincipal:r.vinculo.esPrincipal,autorizaAtencion:r.vinculo.autorizaAtencion})));
        respuesta={id,activo:accion!=='baja'};cambio={agregado:'vinculoPediatrico',tipo:'ACTUALIZAR',recursoId:id,versionAnterior:vinculo.versionVinculo,nuevoEstado:{pacienteId,vinculo:nuevo,estado:accion==='baja'?'INACTIVO':'ACTIVO',version:siguienteVersion(vinculo.versionVinculo)}};
      }
      return {tipo:'CONFIRMAR',cambios:[cambio,{agregado:'pacientes',tipo:'ACTUALIZAR',recursoId:pacienteId,versionAnterior:paciente.version,nuevoEstado:{...paciente,version:siguienteVersion(paciente.version)}}],
        revisiones:[{id:comando.ids.revision!,agregado:'pacientes',recursoId:pacienteId,versionAnterior:paciente.version,snapshotAnterior:paciente}],
        auditoria:[{id:comando.ids.auditoria!,actorId:contexto.cuenta.id,caso:comando.caso,recursoId:id,fechaHora:comando.instante,correlacion:contexto.correlacion}],resultado:{httpStatus:200,respuesta,correlacionOriginal:contexto.correlacion}};
    });
  }
}
