import { ErrorDominio, solicitudInvalida } from '../../../dominio/compartido/error-dominio.js';
import { fechaCivil } from '../../../dominio/compartido/fecha-civil.js';
import { instanteUtc } from '../../../dominio/compartido/instante-utc.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { objetoCerrado, textoClinico } from '../../../dominio/clinica/consulta.js';
import type { Cita } from '../../../dominio/clinica/cita.js';
import type { ContextoAutenticado } from '../../puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../puertos/bundle-institucional.js';
import { exigirClinica } from '../consultas/atencion-clinica.js';
import { exigirAgenda } from './gestionar-citas.js';

function normalizarInstanteUtc(valor: unknown, campo: string): string {
  const fecha = instanteUtc(valor, campo);
  const [base, fraccion = ''] = fecha.slice(0, -1).split('.');
  return `${base}.${fraccion.padEnd(9, '0')}Z`;
}

export class ConsultarCitas {
  private verificar(contexto: ContextoAutenticado, bundle: BundleInstitucional): void {
    exigirAgenda(contexto.cuenta.institucion);
    if (bundle.institucion !== contexto.cuenta.institucion || !contexto.cuenta.permisos.some(p => p === 'citas.administrar' || p === 'consultas.registrar')) {
      throw new ErrorDominio('SIN_PERMISO', 'Sin acceso a agenda.');
    }
  }
  async porId(contexto: ContextoAutenticado, bundle: BundleInstitucional, id: unknown) {
    this.verificar(contexto, bundle);
    const cita = await exigirClinica(bundle).citas.porId(uuidPublico(id));
    if (!cita) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Cita no encontrada.');
    return cita;
  }
  async listar(contexto: ContextoAutenticado, bundle: BundleInstitucional, query: unknown) {
    this.verificar(contexto, bundle);
    const q = objetoCerrado(query, ['fecha_desde', 'fecha_hasta', 'profesional_id', 'estado', 'q', 'limite', 'cursor', 'orden']);
    const desde = fechaCivil(q.fecha_desde), hasta = fechaCivil(q.fecha_hasta);
    if (desde >= hasta) throw solicitudInvalida('El rango debe ser [desde,hasta).');
    const limite = q.limite === undefined ? 20 : typeof q.limite === 'string' && /^[1-9][0-9]*$/.test(q.limite) ? Number(q.limite) : typeof q.limite === 'number' ? q.limite : NaN;
    if (!Number.isInteger(limite) || limite < 1 || limite > 100) throw solicitudInvalida('Límite fuera de rango.');
    if (q.orden !== undefined && q.orden !== 'ASC' && q.orden !== 'DESC') throw solicitudInvalida('Orden inválido.');
    if (q.cursor !== undefined && (typeof q.cursor !== 'string' || !/^[A-Za-z0-9_-]{1,2048}$/.test(q.cursor))) throw solicitudInvalida('Cursor inválido.');
    if (q.estado !== undefined && !['PROGRAMADA', 'EN_CURSO', 'ATENDIDA', 'CANCELADA'].includes(String(q.estado))) throw solicitudInvalida('Estado inválido.');
    return exigirClinica(bundle).citas.listar({ fecha_desde: desde, fecha_hasta: hasta,
      ...(q.profesional_id === undefined ? {} : { profesional_id: uuidPublico(q.profesional_id) }),
      ...(q.estado === undefined ? {} : { estado: q.estado as Cita['estado'] }),
      ...(q.q === undefined ? {} : { q: textoClinico(q.q, 'q', 120) }) },
    { limite, orden: q.orden ?? 'ASC', ...(q.cursor === undefined ? {} : { cursor: q.cursor as string }) },
    JSON.stringify([contexto.cuenta.id, contexto.cuenta.institucion, [...contexto.cuenta.permisos].sort()]));
  }
  async revisiones(contexto: ContextoAutenticado, bundle: BundleInstitucional, id: unknown, query: unknown) {
    this.verificar(contexto, bundle);
    const citaId = uuidPublico(id);
    const clinica = exigirClinica(bundle);
    const cita = await clinica.citas.porId(citaId);
    if (!cita) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Cita no encontrada.');
    const q = objetoCerrado(query ?? {}, ['cursor', 'limite', 'orden', 'desde', 'hasta']);
    const limite = q.limite === undefined ? 20 : typeof q.limite === 'string' && /^[1-9][0-9]*$/.test(q.limite) ? Number(q.limite) : typeof q.limite === 'number' ? q.limite : NaN;
    if (!Number.isInteger(limite) || limite < 1 || limite > 100) throw solicitudInvalida('Límite fuera de rango.');
    if (q.orden !== undefined && q.orden !== 'ASC' && q.orden !== 'DESC') throw solicitudInvalida('Orden inválido.');
    if (q.cursor !== undefined && (typeof q.cursor !== 'string' || !/^[A-Za-z0-9_-]{1,2048}$/.test(q.cursor))) throw solicitudInvalida('Cursor inválido.');
    const desdeCmp = q.desde === undefined ? undefined : normalizarInstanteUtc(q.desde, 'desde');
    const hastaCmp = q.hasta === undefined ? undefined : normalizarInstanteUtc(q.hasta, 'hasta');
    if (desdeCmp !== undefined && hastaCmp !== undefined && desdeCmp >= hastaCmp) {
      throw solicitudInvalida('El rango debe ser [desde,hasta).');
    }
    const desde = q.desde === undefined ? undefined : instanteUtc(q.desde, 'desde');
    const hasta = q.hasta === undefined ? undefined : instanteUtc(q.hasta, 'hasta');
    const orden = (q.orden ?? 'ASC') as 'ASC' | 'DESC';
    const ambitoCursor = JSON.stringify([
      'citas.revisiones',
      contexto.cuenta.id,
      contexto.cuenta.institucion,
      [...contexto.cuenta.permisos].sort(),
      citaId,
      orden,
      desde ?? null,
      hasta ?? null,
    ]);
    return clinica.citas.revisiones(
      citaId,
      { ...(desde === undefined ? {} : { desde }), ...(hasta === undefined ? {} : { hasta }) },
      { limite, orden, ...(q.cursor === undefined ? {} : { cursor: q.cursor as string }) },
      ambitoCursor,
    );
  }
}
