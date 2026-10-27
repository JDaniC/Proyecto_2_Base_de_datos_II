import type { UUID } from '../../../dominio/compartido/uuid.js';
import {
  normalizarIdentificacion,
  normalizarNombreBusqueda,
  normalizarTextoBusqueda,
} from '../../../dominio/compartido/normalizacion.js';
import { ErrorDominio, solicitudInvalida } from '../../../dominio/compartido/error-dominio.js';
import type {
  Paciente,
  Identificacion,
  ResponsableDetalle,
} from '../../../dominio/clinica/paciente.js';
import type {
  CriteriosBusquedaPacientes,
  RepositorioPacienteLectura,
} from '../../../aplicacion/puertos/repositorio-paciente.js';
import type {
  Pagina,
  FiltrosPagina,
  LectorTransaccional,
  OperacionIdempotente,
  UnidadDeTrabajo,
  PlanDeEscrituras,
  ResultadoDurable,
  ComandoEstable,
  EventoAuditoria,
} from '../../../aplicacion/puertos/nucleo.js';
import type { ContextoAutenticado } from '../../../aplicacion/puertos/contexto-autenticado.js';

interface CursorBusquedaInterno {
  readonly q: string;
  readonly orden: string;
  readonly estado: string;
  readonly id: string;
}

function codificarCursor(payload: CursorBusquedaInterno): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodificarCursor(cursor: string): CursorBusquedaInterno {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    const parseado = JSON.parse(json) as unknown;
    if (
      typeof parseado === 'object' &&
      parseado !== null &&
      'q' in parseado &&
      'orden' in parseado &&
      'estado' in parseado &&
      'id' in parseado &&
      typeof (parseado as CursorBusquedaInterno).q === 'string' &&
      typeof (parseado as CursorBusquedaInterno).orden === 'string' &&
      typeof (parseado as CursorBusquedaInterno).estado === 'string' &&
      typeof (parseado as CursorBusquedaInterno).id === 'string'
    ) {
      return parseado as CursorBusquedaInterno;
    }
  } catch {
    // ignorar y lanzar abajo
  }
  throw solicitudInvalida('El cursor de paginación es inválido o está malformado.', 'cursor');
}

export class RepositorioPacientesMemoria implements RepositorioPacienteLectura {
  private readonly pacientes = new Map<string, Paciente>();
  private readonly identidades = new Map<string, string>();
  private readonly codigosPacientes = new Map<string, string>();
  private readonly operaciones = new Map<string, OperacionIdempotente<unknown>>();
  private readonly responsables = new Map<string, ResponsableDetalle>();
  private readonly revisionesPacientes = new Map<string, Paciente>();
  private readonly eventosAuditoria: EventoAuditoria[] = [];
  private readonly historiales = new Map<string, unknown>();
  private colaUow: Promise<unknown> = Promise.resolve();

  constructor(semillas?: readonly Paciente[]) {
    if (semillas) {
      for (const p of semillas) {
        this.guardar(p);
      }
    }
  }

  async porId(id: UUID): Promise<Paciente | null> {
    const paciente = this.pacientes.get(id);
    return paciente ?? null;
  }

  async buscar(criterios: CriteriosBusquedaPacientes): Promise<Pagina<Paciente>> {
    const qRaw = criterios.q.trim();
    let qNormNombre: string | null = null;
    try {
      qNormNombre = normalizarNombreBusqueda(qRaw);
    } catch {
      qNormNombre = normalizarTextoBusqueda(qRaw);
    }

    let qNormCui: string | null = null;
    let qNormPasaporte: string | null = null;
    try {
      qNormCui = normalizarIdentificacion('CUI', qRaw);
    } catch {
      // no es formato CUI
    }
    try {
      qNormPasaporte = normalizarIdentificacion('PASAPORTE', qRaw);
    } catch {
      // no es formato PASAPORTE
    }

    const todos = Array.from(this.pacientes.values()).filter((p) => {
      if (criterios.estado && criterios.estado !== 'TODOS' && p.estado !== criterios.estado) {
        return false;
      }

      // 1. Coincidencia exacta de documento (sin búsqueda por subcadena)
      if (p.identificacion) {
        if (p.identificacion.numero.toUpperCase() === qRaw.toUpperCase()) return true;
        try {
          const normDoc = normalizarIdentificacion(p.identificacion.tipo, p.identificacion.numero);
          if (normDoc === qNormCui || normDoc === qNormPasaporte) return true;
          const numLimpio = p.identificacion.numero.replace(/[\s-]+/gu, '').toUpperCase();
          const qLimpio = qRaw.replace(/[\s-]+/gu, '').toUpperCase();
          if (qLimpio.length > 0 && numLimpio === qLimpio) return true;
        } catch {
          // continuar
        }
      }

      // 2. Coincidencia por prefijo normalizado de nombres o apellidos (sin coincidencia infija)
      if (qNormNombre && qNormNombre.length > 0) {
        const nombreCompleto = normalizarTextoBusqueda(`${p.nombres} ${p.apellidos}`);
        const palabras = nombreCompleto.split(' ').filter(Boolean);
        for (let i = 0; i < palabras.length; i++) {
          const restoNombre = palabras.slice(i).join(' ');
          if (restoNombre.startsWith(qNormNombre)) return true;
        }
      }

      return false;
    });

    const orden = criterios.orden ?? 'ASC';
    const estado = criterios.estado ?? 'TODOS';

    todos.sort((a, b) => {
      const cmp = a.fechaRegistro.localeCompare(b.fechaRegistro);
      if (cmp !== 0) return orden === 'DESC' ? -cmp : cmp;
      return orden === 'DESC' ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id);
    });

    let inicio = 0;
    if (criterios.cursor) {
      const decoded = decodificarCursor(criterios.cursor);
      if (
        decoded.q !== criterios.q ||
        decoded.orden !== orden ||
        decoded.estado !== estado
      ) {
        throw solicitudInvalida('El cursor no coincide con los parámetros o el orden de la búsqueda.', 'cursor');
      }
      const idx = todos.findIndex((p) => p.id === decoded.id);
      if (idx === -1) {
        throw solicitudInvalida('El cursor hace referencia a un registro que no pertenece a los resultados.', 'cursor');
      }
      inicio = idx + 1;
    }

    const fin = inicio + criterios.limite;
    const elementos = todos.slice(inicio, fin);
    const siguienteCursor = fin < todos.length && elementos.length > 0
      ? codificarCursor({
          q: criterios.q,
          orden,
          estado,
          id: elementos[elementos.length - 1]!.id,
        })
      : undefined;

    return Object.freeze({
      elementos: Object.freeze(elementos),
      ...(siguienteCursor ? { siguienteCursor } : {}),
    });
  }

  guardar(paciente: Paciente): void {
    this.pacientes.set(paciente.id, paciente);
    this.codigosPacientes.set(paciente.codigoLegible, paciente.id);
    if (paciente.identificacion) {
      try {
        const clave = normalizarIdentificacion(paciente.identificacion.tipo, paciente.identificacion.numero);
        this.identidades.set(clave, paciente.id);
      } catch {
        // ignorar fallo de formato en semilla
      }
    }
    if (paciente.responsables) {
      for (const r of paciente.responsables) {
        this.responsables.set(r.responsable.id, r.responsable);
        if (r.responsable.documento) {
          try {
            const clave = normalizarIdentificacion(r.responsable.documento.tipo, r.responsable.documento.numero);
            this.identidades.set(clave, r.responsable.id);
          } catch {
            // ignorar fallo de formato en semilla
          }
        }
      }
    }
  }

  titularIdentidad(identificacion: Identificacion): UUID | null {
    try {
      const clave = normalizarIdentificacion(identificacion.tipo, identificacion.numero);
      const titular = this.identidades.get(clave);
      return (titular as UUID) ?? null;
    } catch {
      return null;
    }
  }

  reservarIdentidad(identificacion: Identificacion, titularId: UUID): void {
    const clave = normalizarIdentificacion(identificacion.tipo, identificacion.numero);
    this.identidades.set(clave, titularId);
  }

  liberarIdentidad(identificacion: Identificacion): void {
    const clave = normalizarIdentificacion(identificacion.tipo, identificacion.numero);
    this.identidades.delete(clave);
  }

  guardarOperacion(actorId: UUID, caso: string, claveIdempotencia: UUID, op: OperacionIdempotente<unknown>): void {
    this.operaciones.set(`${actorId}:${caso}:${claveIdempotencia}`, op);
  }

  obtenerOperacion(actorId: UUID, caso: string, claveIdempotencia: UUID): OperacionIdempotente<unknown> | null {
    return this.operaciones.get(`${actorId}:${caso}:${claveIdempotencia}`) ?? null;
  }

  crearLector(): LectorTransaccional {
    return {
      cuentas: { porUid: async () => null },
      pacientes: {
        porId: async (id: UUID) => this.pacientes.get(id) ?? null,
        porVersion: async (id: UUID, version: number) => {
          const p = this.pacientes.get(id);
          if (p && p.version === version) return p;
          return this.revisionesPacientes.get(`${id}:${version}`) ?? null;
        },
      },
      citas: { porId: async () => null },
      consultas: { porId: async () => null, porVersion: async () => null },
      identidades: {
        titular: async (ident: Identificacion) => this.titularIdentidad(ident),
      },
      responsables: {
        porId: async (id: UUID) => this.responsables.get(id) ?? null,
        porPaciente: async (pacienteId: UUID) => {
          const paciente = this.pacientes.get(pacienteId);
          if (!paciente || !paciente.responsables) return { elementos: [] };
          return { elementos: Object.freeze(paciente.responsables.map((r) => r.responsable)) };
        },
      },
      profesionales: { porId: async () => null },
      historial: {
        eventos: async (pacienteId: UUID, pagina?: FiltrosPagina) => {
          if (!this.pacientes.has(pacienteId)) {
            return { elementos: [] };
          }
          const filtrados = this.eventosAuditoria.filter((ev) => ev.recursoId === pacienteId);
          const orden = pagina?.orden ?? 'ASC';

          const conIndice = filtrados.map((evento, indice) => ({ evento, indice }));
          conIndice.sort((a, b) => {
            const cmp = a.evento.fechaHora.localeCompare(b.evento.fechaHora);
            if (cmp !== 0) return orden === 'DESC' ? -cmp : cmp;
            return orden === 'DESC' ? b.indice - a.indice : a.indice - b.indice;
          });
          const ordenados = conIndice.map((item) => item.evento);

          let inicio = 0;
          if (pagina?.cursor) {
            let cursorId = pagina.cursor;
            try {
              const raw = Buffer.from(pagina.cursor, 'base64url').toString('utf8');
              const parseado = JSON.parse(raw) as unknown;
              if (
                typeof parseado === 'object' &&
                parseado !== null &&
                'id' in parseado &&
                typeof (parseado as { id: string }).id === 'string'
              ) {
                cursorId = (parseado as { id: string }).id;
              }
            } catch {
              // si no es base64url JSON, usar cursor como ID crudo
            }

            const idx = ordenados.findIndex((ev) => ev.id === cursorId);
            if (idx !== -1) {
              inicio = idx + 1;
            }
          }

          const limite = Math.max(1, pagina?.limite ?? 50);
          const elementos = ordenados.slice(inicio, inicio + limite);
          const tieneMas = inicio + limite < ordenados.length;
          const siguienteCursor = tieneMas && elementos.length > 0
            ? Buffer.from(JSON.stringify({ id: elementos[elementos.length - 1]!.id, orden }), 'utf8').toString('base64url')
            : undefined;

          return {
            elementos: Object.freeze(elementos),
            ...(siguienteCursor ? { siguienteCursor } : {}),
          };
        },
      },
      operaciones: {
        porClave: async <T>(actorId: UUID, caso: string, clave: UUID) =>
          this.obtenerOperacion(actorId, caso, clave) as OperacionIdempotente<T> | null,
      },
    };
  }

  crearUnidadDeTrabajo(): UnidadDeTrabajo {
    return {
      ejecutar: async <T, TEstado, TSnapshot>(
        contexto: ContextoAutenticado,
        comando: ComandoEstable,
        planificar: (lector: LectorTransaccional) => Promise<PlanDeEscrituras<T, TEstado, TSnapshot>>,
      ): Promise<ResultadoDurable<T>> => {
        const operacionSecuencial = async (): Promise<ResultadoDurable<T>> => {
          const lector = this.crearLector();
          const plan = await planificar(lector);

          if (plan.tipo === 'REPETIR') {
            if (plan.operacion.hashEntrada !== comando.hashEntrada) {
              throw new ErrorDominio('CLAVE_REUTILIZADA', 'La clave de idempotencia ya se usó con otra solicitud.');
            }
            return plan.operacion.resultado;
          }

          // 1. Preparar y validar cambios en estado temporal (staging) antes de mutar el repositorio
          const pacientesStaged = new Map<string, Paciente>();
          const codigosStaged = new Map<string, string>();
          const responsablesStaged = new Map<string, ResponsableDetalle>();
          const historialesStaged = new Map<string, unknown>();
          const identidadesLiberar: string[] = [];
          const identidadesReservar = new Map<string, string>();

          for (const cambio of plan.cambios) {
            if (cambio.agregado === 'pacientes') {
              const pac = cambio.nuevoEstado as Paciente;
              const titularCodigo = this.codigosPacientes.get(pac.codigoLegible);
              if (titularCodigo && titularCodigo !== pac.id) {
                throw new ErrorDominio('ESTADO_INVALIDO', 'El código legible de paciente ya está en uso.');
              }
              const titularStaged = codigosStaged.get(pac.codigoLegible);
              if (titularStaged && titularStaged !== pac.id) {
                throw new ErrorDominio('ESTADO_INVALIDO', 'El código legible de paciente ya está en uso en esta operación.');
              }
              codigosStaged.set(pac.codigoLegible, pac.id);
              pacientesStaged.set(cambio.recursoId, pac);
            } else if (cambio.agregado === 'responsables') {
              responsablesStaged.set(cambio.recursoId, cambio.nuevoEstado as ResponsableDetalle);
            } else if (cambio.agregado === 'historiales' || cambio.agregado === 'historial') {
              historialesStaged.set(cambio.recursoId, cambio.nuevoEstado);
            } else if (cambio.agregado === 'identidades') {
              const estado = cambio.nuevoEstado as { identificacion: Identificacion; titularId?: UUID };
              if (cambio.tipo === 'LIBERAR') {
                const clave = normalizarIdentificacion(estado.identificacion.tipo, estado.identificacion.numero);
                identidadesLiberar.push(clave);
              } else {
                const clave = normalizarIdentificacion(estado.identificacion.tipo, estado.identificacion.numero);
                identidadesReservar.set(clave, (estado.titularId ?? cambio.recursoId) as UUID);
              }
            }
          }

          const revisionesStaged = new Map<string, Paciente>();
          for (const rev of plan.revisiones) {
            revisionesStaged.set(`${rev.recursoId}:${rev.versionAnterior}`, rev.snapshotAnterior as Paciente);
          }

          const auditoriaStaged = [...plan.auditoria];

          const opIdempotente: OperacionIdempotente<T> = Object.freeze({
            hashEntrada: comando.hashEntrada,
            resultado: plan.resultado,
          });
          const claveOp = `${contexto.cuenta.id}:${comando.caso}:${comando.claveIdempotencia}`;

          // 2. Publicar atómicamente solo una vez que todo el procesamiento falible ha concluido con éxito
          for (const [id, pac] of pacientesStaged) {
            this.pacientes.set(id, pac);
          }
          for (const [codigo, titularId] of codigosStaged) {
            this.codigosPacientes.set(codigo, titularId);
          }
          for (const [id, resp] of responsablesStaged) {
            this.responsables.set(id, resp);
          }
          for (const [id, hist] of historialesStaged) {
            this.historiales.set(id, hist);
          }
          for (const clave of identidadesLiberar) {
            this.identidades.delete(clave);
          }
          for (const [clave, titularId] of identidadesReservar) {
            this.identidades.set(clave, titularId);
          }
          for (const [clave, snapshot] of revisionesStaged) {
            this.revisionesPacientes.set(clave, snapshot);
          }
          for (const ev of auditoriaStaged) {
            this.eventosAuditoria.push(ev);
          }
          this.operaciones.set(claveOp, opIdempotente);

          return plan.resultado;
        };

        const proximo = this.colaUow.then(operacionSecuencial, operacionSecuencial);
        this.colaUow = proximo.catch(() => {});
        return proximo;
      },
    };
  }
}
