import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import { institucionAdmiteCapacidad } from '../../../dominio/compartido/autorizacion.js';
import { uuidPublico, type UUID } from '../../../dominio/compartido/uuid.js';
import type { ContextoAutenticado } from '../../puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../puertos/bundle-institucional.js';
import {
  type PacienteDto,
  mapearPacienteDto,
} from './dtos-pacientes.js';

export class ConsultarPaciente {
  async ejecutar(parametros: {
    readonly contexto: ContextoAutenticado;
    readonly bundle: BundleInstitucional;
    readonly id: UUID;
  }): Promise<PacienteDto> {
    const { contexto, bundle } = parametros;
    const pacienteId = uuidPublico(parametros.id, 'id');

    const tienePermiso = contexto.cuenta.permisos.includes('pacientes.administrar') ||
      contexto.cuenta.permisos.includes('historial.leer');

    if (!tienePermiso) {
      throw new ErrorDominio('SIN_PERMISO', 'La cuenta no tiene permiso para consultar pacientes.');
    }

    if (!institucionAdmiteCapacidad(contexto.cuenta.institucion, 'PACIENTES')) {
      throw new ErrorDominio('SIN_PERMISO', 'La institución no admite gestión de pacientes.');
    }

    if (!bundle.pacientes) {
      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'El repositorio de pacientes no está disponible.');
    }

    const paciente = await bundle.pacientes.porId(pacienteId);
    if (!paciente || paciente.institucion !== contexto.cuenta.institucion) {
      throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'No se encontró el paciente.');
    }

    return mapearPacienteDto(paciente);
  }
}
