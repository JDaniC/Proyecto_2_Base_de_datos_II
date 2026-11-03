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
    const vacunas = bundle.vacunasPediatricas;
    const pares = [...new Map(aplicaciones.map(a => [`${a.vacunaId}__${a.versionEsquemaId}`, a])).entries()];
    const lecturas = await Promise.allSettled(pares.map(([, a]) => vacunas.obtenerVersionEsquema(uuidPublico(a.vacunaId), uuidPublico(a.versionEsquemaId))));
    const versiones = new Map(pares.map(([clave], i) => {
      const lectura = lecturas[i]!;
      if (lectura.status === 'rejected') throw lectura.reason;
      if (!lectura.value) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'Versión histórica no disponible.');
      return [clave, lectura.value] as const;
    }));
    return aplicaciones.map(a => ({...a, esquema: versiones.get(`${a.vacunaId}__${a.versionEsquemaId}`)!}));
  }
}
