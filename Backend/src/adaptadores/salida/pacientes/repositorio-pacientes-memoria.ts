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
  LectorTransaccional,
  OperacionIdempotente,
  UnidadDeTrabajo,
  PlanDeEscrituras,
  ResultadoDurable,
  ComandoEstable,
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
  private readonly operaciones = new Map<string, OperacionIdempotente<unknown>>();
  private readonly responsables = new Map<string, ResponsableDetalle>();
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

    const todos = Array.from(this.pacientes.values()).filter((p) => {
      if (criterios.estado && criterios.estado !== 'TODOS' && p.estado !== criterios.estado) {
        return false;
      }

      // 1. Coincidencia exacta de documento
      if (p.identificacion) {
        if (p.identificacion.numero.toUpperCase() === qRaw.toUpperCase()) return true;
        try {
          const normDoc = normalizarIdentificacion(p.identificacion.tipo, p.identificacion.numero);
          if (normDoc === qRaw || normDoc.includes(qRaw.toUpperCase())) return true;
        } catch {
          // continuar
        }
      }

      // 2. Coincidencia por nombre o apellido (sin límite de longitud en texto almacenado)
      if (qNormNombre && qNormNombre.length > 0) {
        const nombreCompleto = normalizarTextoBusqueda(`${p.nombres} ${p.apellidos}`);
        if (nombreCompleto.includes(qNormNombre)) return true;
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
          return p && p.version === version ? p : null;
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
      historial: { eventos: async () => ({ elementos: [] }) },
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

          // Aplicar cambios atómicamente en memoria
          for (const cambio of plan.cambios) {
            if (cambio.agregado === 'pacientes') {
              this.pacientes.set(cambio.recursoId, cambio.nuevoEstado as Paciente);
            } else if (cambio.agregado === 'responsables') {
              this.responsables.set(cambio.recursoId, cambio.nuevoEstado as ResponsableDetalle);
            } else if (cambio.agregado === 'identidades') {
              const estado = cambio.nuevoEstado as { identificacion: Identificacion; titularId?: UUID };
              if (cambio.tipo === 'LIBERAR') {
                this.liberarIdentidad(estado.identificacion);
              } else {
                this.reservarIdentidad(estado.identificacion, (estado.titularId ?? cambio.recursoId) as UUID);
              }
            }
          }

          const opIdempotente: OperacionIdempotente<T> = Object.freeze({
            hashEntrada: comando.hashEntrada,
            resultado: plan.resultado,
          });

          this.guardarOperacion(contexto.cuenta.id, comando.caso, comando.claveIdempotencia, opIdempotente);

          return plan.resultado;
        };

        const proximo = this.colaUow.then(operacionSecuencial, operacionSecuencial);
        this.colaUow = proximo.catch(() => {});
        return proximo;
      },
    };
  }
}
