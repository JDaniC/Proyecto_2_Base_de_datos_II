import type { ContextoAutenticado } from '../../puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../puertos/bundle-institucional.js';
import type { PuertosHospital, PaginaHospital } from '../../puertos/hospital.js';
import type { CamaHospitalaria, Hospitalizacion, ResumenHospitalizacion } from '../../../dominio/hospital/hospitalizacion.js';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';

export class ConsultarHospitalizaciones {
  async ejecutarListado(
    contexto: ContextoAutenticado,
    bundle: BundleInstitucional,
    filtroEstado?: string,
    pagina?: PaginaHospital,
  ): Promise<readonly ResumenHospitalizacion[]> {
    const puertos = this.obtenerPuertosHospital(contexto, bundle);
    if (filtroEstado !== undefined && !['ACTIVA', 'FINALIZADA', 'ANULADA'].includes(filtroEstado)) throw new ErrorDominio('SOLICITUD_INVALIDA', 'Estado de hospitalización inválido.');
    return puertos.hospitalizaciones.listar(filtroEstado, validarPagina(pagina));
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
    pagina?: PaginaHospital,
  ): Promise<readonly ResumenHospitalizacion[]> {
    const puertos = this.obtenerPuertosHospital(contexto, bundle);
    const id = uuidPublico(pacienteId);
    return puertos.hospitalizaciones.porPaciente(id, validarPagina(pagina));
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

function validarPagina(pagina: PaginaHospital = { pagina: 1, limite: 25 }): PaginaHospital {
  if (!Number.isSafeInteger(pagina.pagina) || pagina.pagina < 1 || pagina.pagina > 40000 ||
      !Number.isSafeInteger(pagina.limite) || pagina.limite < 1 || pagina.limite > 100) {
    throw new ErrorDominio('SOLICITUD_INVALIDA', 'Página hospitalaria inválida.');
  }
  return pagina;
}
