import { versionPositiva } from '../../../dominio/compartido/version.js';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { objetoCerrado, textoClinico } from '../../../dominio/clinica/consulta.js';
import { validarPermiso, validarPrescriptorClinico } from '../../../dominio/clinica/politicas-institucionales.js';
import type { Paciente } from '../../../dominio/clinica/paciente.js';
import { validarAlergia, validarPerinatales, validarHistoriaPediatrica } from '../../../dominio/pediatria/antecedentes.js';
import type { AntecedentesPediatricos } from '../../puertos/pediatria.js';
import { prepararComandoEstable } from '../../servicios/preparar-comando-estable.js';
import { contextoVigente, exigirVersion, siguienteVersion, type DependenciasClinicas, type ParametrosClinicos } from '../consultas/atencion-clinica.js';

export class GestionarAntecedentes {
  constructor(private readonly deps:DependenciasClinicas){}
  async ejecutar(accion:'alergia'|'bajaAlergia'|'sinAlergias'|'perinatales'|'historia',p:ParametrosClinicos){
    if(p.contexto.cuenta.institucion!=='CENTRO_MEDICO_PEDIATRICO'||p.bundle.institucion!=='CENTRO_MEDICO_PEDIATRICO')throw new ErrorDominio('SIN_PERMISO','Operación exclusiva de pediatría.');
    validarPermiso(p.contexto.cuenta,'consultas.registrar');
    const pid=uuidPublico(p.id),e=objetoCerrado(p.entrada,['version_paciente','version_antecedentes','motivo',...(accion==='alergia'?['alergia']:accion==='bajaAlergia'?['alergia_id']:accion==='perinatales'?['perinatales']:accion==='historia'?['historia']:[])]);
    const motivo=textoClinico(e.motivo,'motivo',1000);
    if(!Number.isSafeInteger(e.version_antecedentes)||Number(e.version_antecedentes)<0)throw new ErrorDominio('SOLICITUD_INVALIDA','Versión de antecedentes inválida.');
    const comando=await prepararComandoEstable(p.claveIdempotencia,`pediatria.antecedentes.${accion}`,{pid,e},['revision','auditoria','alergia','evento'],this.deps);
    if(!p.bundle.uow)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Persistencia no disponible.');
    return p.bundle.uow.ejecutar<AntecedentesPediatricos>(p.contexto,comando,async lector=>{
      const contexto=await contextoVigente(lector,p.contexto);validarPermiso(contexto.cuenta,'consultas.registrar');
      const previa=await lector.operaciones.porClave<AntecedentesPediatricos>(contexto.cuenta.id,comando.caso,comando.claveIdempotencia);
      if(previa){if(previa.hashEntrada!==comando.hashEntrada)throw new ErrorDominio('CLAVE_REUTILIZADA','La clave corresponde a otra intención.');return {tipo:'REPETIR',operacion:previa};}
      const paciente=await lector.pacientes.porId(pid) as Paciente|null;
      if(!paciente)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Paciente no encontrado.');
      if(paciente.estado!=='ACTIVO')throw new ErrorDominio('ESTADO_INVALIDO','El paciente está archivado.');
      exigirVersion(paciente.version,e.version_paciente);
      if(!lector.antecedentesPediatricos||!lector.clinica||!contexto.cuenta.profesional)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Lectura clínica no disponible.');
      const profesional=await lector.clinica.profesionales.porId(contexto.cuenta.profesional.id);
      if(!profesional)throw new ErrorDominio('SIN_PERMISO','Profesional no encontrado.');
      validarPrescriptorClinico({...contexto.cuenta,profesionalVinculado:contexto.cuenta.profesional},profesional);
      const anterior=await lector.antecedentesPediatricos.porPaciente(pid);
      if(anterior.version!==e.version_antecedentes)throw new ErrorDominio('VERSION_DESACTUALIZADA','Los antecedentes cambiaron.');
      const actual:AntecedentesPediatricos={...anterior,version:anterior.version === 0 ? 1 : siguienteVersion(versionPositiva(anterior.version)),actorId:contexto.cuenta.id,fechaHora:comando.instante};
      if(accion==='alergia'){
        if(anterior.alergias.length>=100)throw new ErrorDominio('LIMITE_AGREGADO','Límite de alergias alcanzado.');
        const alergia=validarAlergia(e.alergia);
        if(anterior.alergias.some(a=>a.activa&&a.sustancia.toLocaleLowerCase()===alergia.sustancia.toLocaleLowerCase()))throw new ErrorDominio('ESTADO_INVALIDO','La alergia ya está activa.');
        Object.assign(actual,{alergias:[...anterior.alergias,{...alergia,id:comando.ids.alergia!,activa:true,actorId:contexto.cuenta.id,fechaHora:comando.instante}]});
        delete (actual as {verificacionSinAlergias?:unknown}).verificacionSinAlergias;
      }else if(accion==='bajaAlergia'){
        const id=uuidPublico(e.alergia_id);
        if(!anterior.alergias.some(a=>a.id===id&&a.activa))throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Alergia activa no encontrada.');
        Object.assign(actual,{alergias:anterior.alergias.map(a=>a.id===id?{...a,activa:false}:a)});
      }else if(accion==='sinAlergias'){
        if(anterior.alergias.some(a=>a.activa))throw new ErrorDominio('ESTADO_INVALIDO','Hay alergias activas registradas.');
        Object.assign(actual,{verificacionSinAlergias:{actorId:contexto.cuenta.id,fechaHora:comando.instante}});
      }else if(accion==='historia') Object.assign(actual,{historia:validarHistoriaPediatrica(e.historia)});
      else Object.assign(actual,{perinatales:validarPerinatales(e.perinatales)});
      return {tipo:'CONFIRMAR',cambios:[{agregado:'antecedentesPediatricos',tipo:'GUARDAR',recursoId:pid,versionAnterior:anterior.version?versionPositiva(anterior.version):null,nuevoEstado:{actual,anterior,revisionId:comando.ids.revision!,motivo}},
        {agregado:'pacientes',tipo:'ACTUALIZAR',recursoId:pid,versionAnterior:paciente.version,nuevoEstado:{...paciente,version:siguienteVersion(paciente.version)}},
        {agregado:'eventosHistorial',tipo:'CREAR',recursoId:comando.ids.evento!,versionAnterior:null,nuevoEstado:{id:comando.ids.evento!,pacienteId:pid,tipo:'ANTECEDENTE',recursoId:pid,fechaHora:comando.instante,titulo:'Antecedentes pediátricos actualizados'}}],
        revisiones:[{id:comando.ids.revision!,agregado:'pacientes',recursoId:pid,versionAnterior:paciente.version,snapshotAnterior:paciente}],
        auditoria:[{id:comando.ids.auditoria!,actorId:contexto.cuenta.id,caso:comando.caso,recursoId:pid,fechaHora:comando.instante,correlacion:contexto.correlacion,motivo}],resultado:{httpStatus:200,respuesta:actual,correlacionOriginal:contexto.correlacion}};
    });
  }
}
