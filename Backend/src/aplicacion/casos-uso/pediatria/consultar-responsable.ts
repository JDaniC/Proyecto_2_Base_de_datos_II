import {ErrorDominio} from '../../../dominio/compartido/error-dominio.js';
import {uuidPublico} from '../../../dominio/compartido/uuid.js';
import {validarIdentificacion} from '../../../dominio/clinica/paciente.js';
import {objetoCerrado} from '../../../dominio/clinica/consulta.js';
import {validarPermiso} from '../../../dominio/clinica/politicas-institucionales.js';
import type {BundleInstitucional} from '../../puertos/bundle-institucional.js';
import type {ContextoAutenticado} from '../../puertos/contexto-autenticado.js';
export class ConsultarResponsable {
 async ejecutar(contexto:ContextoAutenticado,bundle:BundleInstitucional,id:string,entrada:unknown){
  validarPermiso(contexto.cuenta,'pacientes.administrar');
  if(bundle.institucion!=='CENTRO_MEDICO_PEDIATRICO'||contexto.cuenta.institucion!==bundle.institucion)throw new ErrorDominio('SIN_PERMISO','Ámbito incompatible.');
  const e=objetoCerrado(entrada,['tipo','numero']),documento=validarIdentificacion(e,'documento'),pid=uuidPublico(id);
  if(!bundle.pacientes||!bundle.responsablesPediatricos||!bundle.clinica)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Lectura no disponible.');
  if(!await bundle.pacientes.porId(pid))throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Paciente no encontrado.');
  const responsable=await bundle.responsablesPediatricos.porDocumento(documento);
  if(!responsable)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Responsable no encontrado.');
  const vinculo=await bundle.clinica.responsables.autorizacion(pid,responsable.id);
  return {responsable,...(vinculo?{version_vinculo:vinculo.version,activo:vinculo.activo}:{})};
 }
}
