import { ErrorDominio, solicitudInvalida } from '../../../dominio/compartido/error-dominio.js';
import { instanteUtc } from '../../../dominio/compartido/instante-utc.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import type { ContextoAutenticado } from '../../puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../puertos/bundle-institucional.js';
import { TIPOS_EVENTO, tiposInstitucion, type CodecCursorHistorial, type FiltrosHistorial, type EventoHistorial } from '../../puertos/historial.js';
import { mapearPacienteDto } from '../pacientes/dtos-pacientes.js';
import { mezclarEventos } from './mezclar-eventos.js';

export function normalizarInstante(valor: string): string {
  const fecha = instanteUtc(valor);
  const [base, fraccion = ''] = fecha.slice(0, -1).split('.');
  return `${base}.${fraccion.padEnd(9, '0')}Z`;
}
export function eventoDto(e: EventoHistorial) {
  return { id: e.id, fecha_hora: e.fechaHora, tipo: e.tipo, recurso_id: e.recursoId, titulo: e.titulo,
    ...(e.consultaId === undefined ? {} : { consulta_id: e.consultaId }),
    ...(e.versionConsulta === undefined ? {} : { version_consulta: e.versionConsulta }),
    ...(e.profesional === undefined ? {} : { profesional: e.profesional }) };
}
export class ConsultarHistorial {
  constructor(private readonly cursor: CodecCursorHistorial) {}
  async ejecutar(contexto: ContextoAutenticado, bundle: BundleInstitucional, id: string, entrada: FiltrosHistorial, expediente = false) {
    if (contexto.cuenta.estado !== 'ACTIVA' || !contexto.cuenta.permisos.includes('historial.leer')) {
      throw new ErrorDominio('SIN_PERMISO', 'Se requiere permiso de lectura del historial.');
    }
    if (bundle.institucion !== contexto.cuenta.institucion) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'No se encontró el paciente.');
    const pacienteId = uuidPublico(id, 'id');
    if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada) || Object.keys(entrada).some((k) => !['limite', 'orden', 'desde', 'hasta', 'tipo', 'cursor'].includes(k))) {
      throw solicitudInvalida('Los filtros no son válidos.');
    }
    const limite = entrada.limite === undefined ? 20 : entrada.limite;
    const orden = entrada.orden === undefined ? 'ASC' : entrada.orden;
    if (!Number.isInteger(limite) || limite < 1 || limite > 100) throw solicitudInvalida('El límite debe estar entre 1 y 100.', 'limite');
    if (orden !== 'ASC' && orden !== 'DESC') throw solicitudInvalida('El orden es inválido.', 'orden');
    const desde = entrada.desde === undefined ? undefined : normalizarInstante(entrada.desde);
    const hasta = entrada.hasta === undefined ? undefined : normalizarInstante(entrada.hasta);
    if (desde !== undefined && hasta !== undefined && desde >= hasta) throw solicitudInvalida('El rango debe ser no vacío.', 'hasta');
    if (entrada.tipo !== undefined && !TIPOS_EVENTO.includes(entrada.tipo)) throw solicitudInvalida('El tipo es inválido.', 'tipo');
    const filtros = { limite, orden, ...(desde === undefined ? {} : { desde }), ...(hasta === undefined ? {} : { hasta }),
      ...(entrada.tipo === undefined ? {} : { tipo: entrada.tipo }) };
    const ambito = JSON.stringify({ v: 1, recurso: expediente ? 'expediente' : 'historial', institucion: bundle.institucion,
      cuenta: contexto.cuenta.id, version: contexto.cuenta.version, roles: [...contexto.cuenta.roles].sort(),
      permisos: [...contexto.cuenta.permisos].sort(), pacienteId, filtros });
    const despues = entrada.cursor === undefined ? undefined : this.cursor.decodificar(entrada.cursor, ambito);
    if (!bundle.pacientes || !bundle.historial) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'El historial no está disponible.');
    const paciente = await bundle.pacientes.porId(pacienteId);
    if (!paciente || paciente.institucion !== bundle.institucion) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'No se encontró el paciente.');
    try {
      await bundle.historial.verificarPreparacion();
      const tipos = tiposInstitucion(bundle.institucion);
      if (tipos.some((tipo) => !bundle.historial!.fuentes.some((f) => f.tipo === tipo))) {
        throw new Error('FUENTE_FALTANTE');
      }
      const fuentes = bundle.historial.fuentes.filter((f) => tipos.includes(f.tipo) && (entrada.tipo === undefined || entrada.tipo === f.tipo)).map((f) => f.fuente);
      const pagina = await mezclarEventos({ fuentes, pacienteId, ...filtros, ...(despues === undefined ? {} : { despues }) });
      const ultima = pagina.elementos.at(-1);
      const historial = { paciente_id: paciente.id, version: paciente.version, estado: paciente.estado, eventos: pagina.elementos.map(eventoDto) };
      return { data: expediente ? { paciente: mapearPacienteDto(paciente), historial } : historial,
        meta: { correlacion: contexto.correlacion, ...(pagina.hayMas && ultima ? { siguiente_cursor: this.cursor.codificar(ambito, ultima) } : {}) } };
    } catch (error) {
      if (error instanceof ErrorDominio && error.codigo === 'PERSISTENCIA_NO_DISPONIBLE') throw error;
      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible consultar el historial. Verifique su preparación e índices.');
    }
  }
}
