import type { UUID } from '../../../dominio/compartido/uuid.js';
import { normalizarIdentificacion, normalizarNombreBusqueda } from '../../../dominio/compartido/normalizacion.js';
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

export class RepositorioPacientesMemoria implements RepositorioPacienteLectura {
  private readonly pacientes = new Map<string, Paciente>();
  private readonly identidades = new Map<string, string>();
  private readonly operaciones = new Map<string, OperacionIdempotente<unknown>>();
  private readonly responsables = new Map<string, ResponsableDetalle>();

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
      qNormNombre = qRaw.toLowerCase();
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

      // 2. Coincidencia por prefijo de nombre o apellido
      try {
        const nombreCompleto = normalizarNombreBusqueda(`${p.nombres} ${p.apellidos}`);
        if (qNormNombre && nombreCompleto.includes(qNormNombre)) return true;
      } catch {
        // continuar
      }

      return false;
    });

    todos.sort((a, b) => {
      const cmp = a.nombres.localeCompare(b.nombres);
      if (cmp !== 0) return criterios.orden === 'DESC' ? -cmp : cmp;
      return criterios.orden === 'DESC' ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id);
    });

    const inicio = criterios.cursor ? Math.max(0, todos.findIndex((p) => p.id === criterios.cursor) + 1) : 0;
    const fin = inicio + criterios.limite;
    const elementos = todos.slice(inicio, fin);
    const siguienteCursor = fin < todos.length && elementos.length > 0
      ? elementos[elementos.length - 1]!.id
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
        const lector = this.crearLector();
        const plan = await planificar(lector);

        if (plan.tipo === 'REPETIR') {
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
      },
    };
  }
}
