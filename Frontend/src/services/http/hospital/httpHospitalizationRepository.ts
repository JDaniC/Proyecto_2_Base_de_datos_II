import { stableCommandKeys } from '../stableCommand';
import { HttpError } from '../errors';
import { HospitalizationRepository } from '../../contracts';
import { HttpClient } from '../httpClient';
import {
  InstitucionId,
  HospitalizacionItem,
  PaginaHospitalizaciones,
  CamaHospitalaria,
  EstadoCama,
  NotaEvolucionItem,
  ProcedimientoHospitalarioItem,
  CrearIngresoHospitalarioDTO,
  RegistrarEgresoHospitalarioDTO,
} from '../../types';

export class HttpHospitalizationRepository implements HospitalizationRepository {
  constructor(private readonly client: HttpClient) {}
  private readonly clave = stableCommandKeys();
  private mutar<T>(path: string, body: unknown, options?: { idempotencyKey?: string }) {
    return this.client.post<T>(path, body, { idempotencyKey: options?.idempotencyKey || this.clave(path, body) });
  }

  async listarHospitalizaciones(
    _institucionId: InstitucionId,
    filtroEstado?: string,
    pagina?: { pagina: number; limite: number },
  ): Promise<PaginaHospitalizaciones> {
    const query: Record<string, string> = {};
    if (filtroEstado) query.estado = filtroEstado === 'EGRESADA' ? 'FINALIZADA' : filtroEstado;
    if (pagina) { query.pagina = String(pagina.pagina); query.limite = String(pagina.limite); }
    const res = await this.client.get<{ hospitalizaciones: HospitalizacionItem[]; pagina: number; hayMas: boolean }>(
      '/hospital/hospitalizaciones',
      { query },
    );
    const lista = res.data?.hospitalizaciones || [];
    return { items: lista.map(normalizarHospitalizacionItem), pagina: res.data.pagina, hayMas: res.data.hayMas };
  }

  async obtenerHospitalizacionPorId(
    _institucionId: InstitucionId,
    id: string,
  ): Promise<HospitalizacionItem | null> {
    try {
      const res = await this.client.get<HospitalizacionItem>(
        `/hospital/hospitalizaciones/${id}`,
      );
      return normalizarHospitalizacionItem(res.data);
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return null;
      throw error;
    }
  }

  async obtenerHospitalizacionesPorPaciente(
    _institucionId: InstitucionId,
    pacienteId: string,
  ): Promise<HospitalizacionItem[]> {
    const res = await this.client.get<{ hospitalizaciones: HospitalizacionItem[] }>(
      '/hospital/hospitalizaciones',
      { query: { pacienteId } },
    );
    const lista = res.data?.hospitalizaciones || [];
    return lista.map(normalizarHospitalizacionItem);
  }

  async crearIngreso(
    _institucionId: InstitucionId,
    dto: CrearIngresoHospitalarioDTO,
  ): Promise<HospitalizacionItem> {
    const res = await this.mutar<HospitalizacionItem>(
      '/hospital/hospitalizaciones',
      {
        pacienteId: dto.pacienteId,
        camaId: dto.camaId,
        motivoIngreso: dto.motivoIngreso,
        diagnosticoIngresoCIE: dto.diagnosticoIngresoCIE,
        diagnosticoIngresoNombre: dto.diagnosticoIngresoNombre,
        consultasEnlazadasIds: dto.consultasEnlazadasIds,
        versionEsperadaCama: dto.versionEsperadaCama,
      },
      {
        idempotencyKey: dto.idempotencyKey,
      },
    );
    return normalizarHospitalizacionItem(res.data);
  }

  async registrarEgreso(
    _institucionId: InstitucionId,
    hospitalizacionId: string,
    dto: RegistrarEgresoHospitalarioDTO,
  ): Promise<HospitalizacionItem> {
    const res = await this.mutar<HospitalizacionItem>(
      `/hospital/hospitalizaciones/${hospitalizacionId}/egreso`,
      {
        fechaEgreso: dto.fechaEgreso,
        tipoEgreso: dto.tipoEgreso,
        diagnosticoEgresoCIE: dto.diagnosticoEgresoCIE,
        diagnosticoEgresoNombre: dto.diagnosticoEgresoNombre,
        resumenClinico: dto.resumenClinico,
        versionEsperada: dto.versionEsperada,
      },
      {
        idempotencyKey: dto.idempotencyKey,
      },
    );
    return normalizarHospitalizacionItem(res.data);
  }

  async listarCamas(_institucionId: InstitucionId): Promise<CamaHospitalaria[]> {
    const res = await this.client.get<{ camas: CamaHospitalaria[] }>(
      '/hospital/camas',
    );
    const lista = res.data?.camas || [];
    return lista.map((c: CamaHospitalaria) => ({
      ...c,
      id: String(c.id),
      habitacionId: String(c.habitacionId),
      numeroHabitacion: String(c.numeroHabitacion),
      piso: Number(c.piso),
      salaServicio: String(c.salaServicio),
      codigoCama: String(c.codigoCama),
      estado: c.estado as EstadoCama,
    }));
  }

  async asignarCama(
    _institucionId: InstitucionId,
    hospitalizacionId: string,
    nuevaCamaId: string,
    fechaInicio: string,
    motivo: string,
    versionEsperada?: number,
  ): Promise<HospitalizacionItem> {
    const res = await this.mutar<HospitalizacionItem>(
      `/hospital/hospitalizaciones/${hospitalizacionId}/asignacion-cama`,
      {
        nuevaCamaId,
        fechaInicio,
        motivo,
        versionEsperada,
      },
    );
    return normalizarHospitalizacionItem(res.data);
  }

  async liberarCama(
    _institucionId: InstitucionId,
    hospitalizacionId: string,
    fechaFin: string,
    versionEsperada?: number,
  ): Promise<HospitalizacionItem> {
    const res = await this.mutar<HospitalizacionItem>(
      `/hospital/hospitalizaciones/${hospitalizacionId}/liberacion-cama`,
      {
        fechaFin,
        versionEsperada,
      },
    );
    return normalizarHospitalizacionItem(res.data);
  }

  async cambiarEstadoCama(
    _institucionId: InstitucionId,
    _camaId: string,
    _nuevoEstado: EstadoCama,
  ): Promise<CamaHospitalaria> {
    throw new Error('DEC11: Sin CRUD administrativo de camas');
  }

  async agregarNotaEvolucion(
    _institucionId: InstitucionId,
    hospitalizacionId: string,
    nota: Omit<NotaEvolucionItem, 'id'>,
    versionEsperada?: number,
  ): Promise<HospitalizacionItem> {
    const res = await this.mutar<HospitalizacionItem>(
      `/hospital/hospitalizaciones/${hospitalizacionId}/notas-evolucion`,
      {
        notaClinica: nota.notaClinica,
        planTerapeutico: nota.planTerapeutico,
        versionEsperada,
      },
    );
    return normalizarHospitalizacionItem(res.data);
  }

  async agregarProcedimiento(
    _institucionId: InstitucionId,
    hospitalizacionId: string,
    proc: Omit<ProcedimientoHospitalarioItem, 'id'>,
    versionEsperada?: number,
  ): Promise<HospitalizacionItem> {
    const res = await this.mutar<HospitalizacionItem>(
      `/hospital/hospitalizaciones/${hospitalizacionId}/procedimientos`,
      {
        nombre: proc.nombre,
        resultado: proc.resultado,
        codigo: proc.codigo,
        observaciones: proc.observaciones,
        versionEsperada,
      },
    );
    return normalizarHospitalizacionItem(res.data);
  }
}

function normalizarHospitalizacionItem(raw: unknown): HospitalizacionItem {
  const item = raw as Partial<HospitalizacionItem>;
  return {
    id: String(item.id || ''),
    codigoIngreso: String(item.codigoIngreso || ''),
    institucionId: 'HOSPITAL_GENERAL',
    pacienteId: String(item.pacienteId || ''),
    pacienteNombre: String(item.pacienteNombre || ''),
    pacienteExpediente: String(item.pacienteExpediente || ''),
    medicoTratanteId: String(item.medicoTratanteId || ''),
    medicoTratanteNombre: String(item.medicoTratanteNombre || ''),
    medicoTratanteColegiado: String(item.medicoTratanteColegiado || ''),
    fechaIngreso: String(item.fechaIngreso || ''),
    fechaEgreso: item.fechaEgreso ? String(item.fechaEgreso) : undefined,
    estado: (item.estado as string) === 'FINALIZADA' ? 'EGRESADA' : item.estado || 'ACTIVA',
    diagnosticoIngresoCIE: String(item.diagnosticoIngresoCIE || ''),
    diagnosticoIngresoNombre: String(item.diagnosticoIngresoNombre || ''),
    diagnosticoEgresoCIE: item.diagnosticoEgresoCIE ? String(item.diagnosticoEgresoCIE) : undefined,
    diagnosticoEgresoNombre: item.diagnosticoEgresoNombre ? String(item.diagnosticoEgresoNombre) : undefined,
    motivoIngreso: String(item.motivoIngreso || ''),
    resumenEgreso: item.resumenEgreso ? String(item.resumenEgreso) : undefined,
    tipoEgreso: item.tipoEgreso,
    camaActual: item.camaActual ? {
      camaId: String(item.camaActual.camaId),
      codigoCama: String(item.camaActual.codigoCama),
      habitacion: String(item.camaActual.habitacion),
      servicio: String(item.camaActual.servicio),
    } : undefined,
    asignacionesCama: (item.asignacionesCama || []).map((a) => ({
      id: String(a.id),
      camaId: String(a.camaId),
      codigoCama: String(a.codigoCama),
      habitacion: String(a.habitacion),
      servicio: String(a.servicio),
      fechaInicio: String(a.fechaInicio),
      fechaFin: a.fechaFin ? String(a.fechaFin) : undefined,
      motivoCambio: a.motivoCambio ? String(a.motivoCambio) : undefined,
    })),
    consultasEnlazadasIds: (item.consultasEnlazadasIds || []).map(String),
    notasEvolucion: (item.notasEvolucion || []).map((n) => ({
      id: String(n.id),
      fechaHora: String(n.fechaHora),
      medicoNombre: String(n.medicoNombre),
      medicoColegiado: String(n.medicoColegiado),
      notaClinica: String(n.notaClinica),
      planTerapeutico: n.planTerapeutico ? String(n.planTerapeutico) : undefined,
    })),
    procedimientos: (item.procedimientos || []).map((p) => ({
      id: String(p.id),
      nombre: String(p.nombre),
      codigo: p.codigo ? String(p.codigo) : undefined,
      fechaHora: String(p.fechaHora),
      profesionalNombre: String(p.profesionalNombre),
      resultado: String(p.resultado),
      observaciones: p.observaciones ? String(p.observaciones) : undefined,
    })),
    version: typeof item.version === 'number' ? item.version : 1,
  };
}

export function createHttpHospitalizationRepository(client: HttpClient): HospitalizationRepository {
  return new HttpHospitalizationRepository(client);
}
