import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../dominio/compartido/version.js';
import { validarPermiso } from '../../../dominio/clinica/politicas-institucionales.js';
import type { ContextoAutenticado } from '../../puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../puertos/bundle-institucional.js';
import { exigirClinica } from './atencion-clinica.js';

export class ConsultarConsulta {
  async ejecutar(contexto: ContextoAutenticado, bundle: BundleInstitucional, id: unknown, version?: unknown) {
    validarPermiso(contexto.cuenta, 'historial.leer');
    if (bundle.institucion !== contexto.cuenta.institucion) throw new ErrorDominio('SIN_PERMISO', 'Ámbito incompatible.');
    const consultas = exigirClinica(bundle).consultas;
    const uuid = uuidPublico(id);
    const consulta = version === undefined ? await consultas.porId(uuid) : await consultas.porVersion(uuid, versionPositiva(version));
    if (!consulta) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Consulta no encontrada.');
    return consulta;
  }
}
