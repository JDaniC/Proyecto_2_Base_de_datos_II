import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { validarPermiso } from '../../../dominio/clinica/politicas-institucionales.js';
import type { ContextoAutenticado } from '../../puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../puertos/bundle-institucional.js';
export class ConsultarAntecedentes {
  async ejecutar(contexto:ContextoAutenticado,bundle:BundleInstitucional,id:unknown,version?:number){
    validarPermiso(contexto.cuenta,'historial.leer');
    if(contexto.cuenta.institucion!=='CENTRO_MEDICO_PEDIATRICO'||bundle.institucion!==contexto.cuenta.institucion)throw new ErrorDominio('SIN_PERMISO','Ámbito incompatible.');
    if(!bundle.antecedentesPediatricos||!bundle.pacientes)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Lectura no disponible.');
    const pid=uuidPublico(id);
    if(!await bundle.pacientes.porId(pid))throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Paciente no encontrado.');
    if(version!==undefined){if(!Number.isSafeInteger(version)||version<1)throw new ErrorDominio('SOLICITUD_INVALIDA','Versión inválida.');if(!bundle.antecedentesPediatricos.porVersion)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Historia no disponible.');const r=await bundle.antecedentesPediatricos.porVersion(pid,version);if(!r)throw new ErrorDominio('RECURSO_NO_ENCONTRADO','Versión no encontrada.');return r;}
    return bundle.antecedentesPediatricos.porPaciente(pid);
  }
}
