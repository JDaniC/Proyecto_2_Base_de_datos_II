import { ErrorDominio, solicitudInvalida } from '../../../dominio/compartido/error-dominio.js';
import { institucionAdmiteCapacidad } from '../../../dominio/compartido/autorizacion.js';
import type { ContextoAutenticado } from '../../puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../puertos/bundle-institucional.js';
import {
  type BuscarPacientesEntrada,
  type RespuestaPacientesDto,
  mapearPacienteDto,
} from './dtos-pacientes.js';

export class BuscarPacientes {
  async ejecutar(parametros: {
    readonly contexto: ContextoAutenticado;
    readonly bundle: BundleInstitucional;
    readonly entrada: BuscarPacientesEntrada;
  }): Promise<RespuestaPacientesDto> {
    const { contexto, bundle, entrada } = parametros;

    const tienePermiso = contexto.cuenta.permisos.includes('pacientes.administrar') ||
      contexto.cuenta.permisos.includes('historial.leer');

    if (!tienePermiso) {
      throw new ErrorDominio('SIN_PERMISO', 'La cuenta no tiene permiso para buscar pacientes.');
    }

    if (!institucionAdmiteCapacidad(contexto.cuenta.institucion, 'PACIENTES')) {
      throw new ErrorDominio('SIN_PERMISO', 'La institución no admite gestión de pacientes.');
    }

    if (typeof entrada !== 'object' || entrada === null) {
      throw solicitudInvalida('Los parámetros de búsqueda son requeridos.');
    }

    if (typeof entrada.q !== 'string' || entrada.q.trim().length === 0) {
      throw solicitudInvalida('El término de búsqueda no puede estar vacío.', 'q');
    }

    if ([...entrada.q.trim()].length > 120) {
      throw solicitudInvalida('El término de búsqueda excede el máximo de 120 caracteres.', 'q');
    }

    const limite = entrada.limite ?? 20;
    if (typeof limite !== 'number' || !Number.isSafeInteger(limite) || limite < 1 || limite > 100) {
      throw solicitudInvalida('El límite debe ser un entero entre 1 y 100.', 'limite');
    }

    const orden = entrada.orden ?? 'ASC';
    if (orden !== 'ASC' && orden !== 'DESC') {
      throw solicitudInvalida('El orden debe ser ASC o DESC.', 'orden');
    }

    if (entrada.estado !== undefined && !['ACTIVO', 'ARCHIVADO', 'TODOS'].includes(entrada.estado)) {
      throw solicitudInvalida('El estado debe ser ACTIVO, ARCHIVADO o TODOS.', 'estado');
    }

    if (!bundle.pacientes) {
      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'El repositorio de pacientes no está disponible.');
    }

    const pagina = await bundle.pacientes.buscar({
      q: entrada.q.trim(),
      limite,
      orden,
      ...(entrada.cursor !== undefined ? { cursor: entrada.cursor } : {}),
      ...(entrada.estado !== undefined ? { estado: entrada.estado } : {}),
    });

    return Object.freeze({
      data: Object.freeze(pagina.elementos.map(mapearPacienteDto)),
      meta: Object.freeze({
        correlacion: contexto.correlacion,
        ...(pagina.siguienteCursor ? { siguiente_cursor: pagina.siguienteCursor } : {}),
      }),
    });
  }
}
