import type { ContextoAutenticado } from '../../puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../puertos/bundle-institucional.js';
import type { PuertosHospital } from '../../puertos/hospital.js';
import type { CamaHospitalaria, Hospitalizacion } from '../../../dominio/hospital/hospitalizacion.js';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';

export class ConsultarHospitalizaciones {
  async ejecutarListado(
    contexto: ContextoAutenticado,
    bundle: BundleInstitucional,
    filtroEstado?: string,
  ): Promise<readonly Hospitalizacion[]> {
    const puertos = this.obtenerPuertosHospital(contexto, bundle);
    if (filtroEstado !== undefined && !['ACTIVA', 'FINALIZADA', 'ANULADA'].includes(filtroEstado)) throw new ErrorDominio('SOLICITUD_INVALIDA', 'Estado de hospitalización inválido.');
    return puertos.hospitalizaciones.listar(filtroEstado);
  }

  async ejecutarPorId(
    contexto: ContextoAutenticado,
    bundle: BundleInstitucional,
    hospitalizacionId: string,
  ): Promise<Hospitalizacion> {
    const puertos = this.obtenerPuertosHospital(contexto, bundle);
    const id = uuidPublico(hospitalizacionId);
    const hospitalizacion = await puertos.hospitalizaciones.porId(id);
    if (!hospitalizacion) {
      throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Hospitalización no encontrada.');
    }
    return hospitalizacion;
  }

  async ejecutarPorPaciente(
    contexto: ContextoAutenticado,
    bundle: BundleInstitucional,
    pacienteId: string,
  ): Promise<readonly Hospitalizacion[]> {
    const puertos = this.obtenerPuertosHospital(contexto, bundle);
    const id = uuidPublico(pacienteId);
    return puertos.hospitalizaciones.porPaciente(id);
  }

  async ejecutarListarCamas(
    contexto: ContextoAutenticado,
    bundle: BundleInstitucional,
  ): Promise<readonly CamaHospitalaria[]> {
    const puertos = this.obtenerPuertosHospital(contexto, bundle);
    return puertos.camas.listar();
  }

  private obtenerPuertosHospital(contexto: ContextoAutenticado, bundle: BundleInstitucional): PuertosHospital {
    if (!contexto.cuenta.permisos.includes('historial.leer')) {
      throw new ErrorDominio('SIN_PERMISO', 'Se requiere acceso al historial clínico.');
    }
    if (contexto.cuenta.institucion !== 'HOSPITAL_GENERAL') {
      throw new ErrorDominio('SIN_PERMISO', 'Capacidad hospitalaria exclusiva de Hospital General.');
    }
    if (!bundle.hospital) {
      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'Bundle hospitalario no disponible.');
    }
    return bundle.hospital;
  }
}
