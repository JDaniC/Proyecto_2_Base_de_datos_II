import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { validarPermiso } from '../../../dominio/clinica/politicas-institucionales.js';
import type { Paciente } from '../../../dominio/clinica/paciente.js';
import type { AplicacionVacuna } from '../../../dominio/pediatria/vacunas.js';
import type { ContextoAutenticado } from '../../puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../puertos/bundle-institucional.js';

export class ConsultarAplicacionesVacuna {
  async ejecutar(
    contexto: ContextoAutenticado,
    bundle: BundleInstitucional,
    pacienteId: string
  ): Promise<readonly AplicacionVacuna[]> {
    if (contexto.cuenta.institucion !== 'CENTRO_MEDICO_PEDIATRICO' || bundle.institucion !== 'CENTRO_MEDICO_PEDIATRICO') {
      throw new ErrorDominio('SIN_PERMISO', 'Operación exclusiva de pediatría.');
    }
    validarPermiso(contexto.cuenta, 'historial.leer');

    const pid = uuidPublico(pacienteId);
    if (!bundle.pacientes || !bundle.vacunasPediatricas) {
      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'Servicio de vacunas no disponible.');
    }

    const paciente = (await bundle.pacientes.porId(pid)) as Paciente | null;
    if (!paciente) {
      throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Paciente no encontrado.');
    }

    const aplicaciones=await bundle.vacunasPediatricas.obtenerAplicaciones(pid);
    return Promise.all(aplicaciones.map(async a=>{
      const esquema=await bundle.vacunasPediatricas!.obtenerVersionEsquema(uuidPublico(a.vacunaId),uuidPublico(a.versionEsquemaId));
      if(!esquema)throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Versión histórica no disponible.');
      return {...a,esquema};
    }));
  }
}
