import { AuditRepository } from '../services/contracts';
import {
  InstitucionId,
  EventoAuditoria,
  FiltrosAuditoriaQuery
} from '../services/types';

const STORAGE_KEY = 'clinica_audit_events_dataset_v1';

const INITIAL_EVENTS: EventoAuditoria[] = [
  {
    id: 'EVT-2026-0091',
    correlacionId: 'corr-8419-f9c2-4011',
    institucionId: 'HOSPITAL_GENERAL',
    timestamp: '2026-10-19T14:35:10Z',
    actor: {
      nombre: 'Ing. Roberto Méndez',
      email: 'admin.sistemas@hospital-general.salud.gt',
      rol: 'Administrador Institucional',
      ipOrigen: '192.168.1.10'
    },
    accion: 'CAMBIO_ESTADO_CUENTA',
    tipoRecurso: 'USUARIO',
    recursoId: 'usr-pend-01',
    recursoNombre: 'Dr. Alejandro Soto Gómez',
    motivoJustificacion: 'Validación de acreditación CMG-14209 ante departamento de recursos médicos.',
    severidad: 'INFO',
    cambiosDetalle: [
      { campo: 'estado', valorAnterior: 'PENDIENTE', valorNuevo: 'ACTIVO' }
    ]
  },
  {
    id: 'EVT-2026-0088',
    correlacionId: 'corr-3312-ab77-9041',
    institucionId: 'HOSPITAL_GENERAL',
    timestamp: '2026-10-19T11:20:00Z',
    actor: {
      nombre: 'Dra. Elena Morales',
      email: 'elena.morales@hospital-general.salud.gt',
      rol: 'Médico Especialista',
      ipOrigen: '192.168.1.45'
    },
    accion: 'RECTIFICACION_CA10',
    tipoRecurso: 'CONSULTA',
    recursoId: 'cons-102',
    recursoNombre: 'Consulta Medicina Interna — Roberto Estrada Morales',
    versionAfectada: 'v2',
    motivoJustificacion: 'Ajuste de intervalo en pauta de Losartán Potásico 50 mg de 24 h a 12 h por registro de presión arterial sistólica en 145 mmHg.',
    severidad: 'ADVERTENCIA',
    cambiosDetalle: [
      { campo: 'planTratamiento.frecuencia', valorAnterior: 'Cada 24 horas', valorNuevo: 'Cada 12 horas' },
      { campo: 'revision', valorAnterior: '1', valorNuevo: '2' }
    ]
  },
  {
    id: 'EVT-2026-0082',
    correlacionId: 'corr-1094-bb20-1123',
    institucionId: 'HOSPITAL_GENERAL',
    timestamp: '2026-10-18T16:50:33Z',
    actor: {
      nombre: 'Ing. Roberto Méndez',
      email: 'admin.sistemas@hospital-general.salud.gt',
      rol: 'Administrador Institucional',
      ipOrigen: '192.168.1.10'
    },
    accion: 'ASIGNACION_PERMISOS',
    tipoRecurso: 'ROL',
    recursoId: 'MEDICO',
    recursoNombre: 'Médico Especialista',
    motivoJustificacion: 'Habilitación de facultad de emisión de informes periciales clínicos autorizada por dirección médica.',
    severidad: 'CRITICO',
    cambiosDetalle: [
      { campo: 'permisos', valorAnterior: '8 permisos', valorNuevo: '9 permisos (+ informes.emitir)' }
    ]
  },
  {
    id: 'EVT-2026-0075',
    correlacionId: 'corr-7718-ef44-8891',
    institucionId: 'HOSPITAL_GENERAL',
    timestamp: '2026-10-18T09:15:20Z',
    actor: {
      nombre: 'Dra. Elena Morales',
      email: 'elena.morales@hospital-general.salud.gt',
      rol: 'Médico Especialista',
      ipOrigen: '192.168.1.45'
    },
    accion: 'EMISION_RECETA',
    tipoRecurso: 'RECETA',
    recursoId: 'rec-001',
    recursoNombre: 'Receta Médica — Roberto Estrada Morales',
    motivoJustificacion: 'Prescripción oficial certificada de fármacos antihipertensivos con firma digital.',
    severidad: 'INFO',
    cambiosDetalle: [
      { campo: 'medicamentos', valorAnterior: null, valorNuevo: 'Losartán Potásico 50 mg + Metformina 850 mg' }
    ]
  },
  {
    id: 'EVT-2026-0062',
    correlacionId: 'corr-4410-cd33-1209',
    institucionId: 'HOSPITAL_GENERAL',
    timestamp: '2026-10-17T13:40:00Z',
    actor: {
      nombre: 'Ing. Roberto Méndez',
      email: 'admin.sistemas@hospital-general.salud.gt',
      rol: 'Administrador Institucional',
      ipOrigen: '192.168.1.10'
    },
    accion: 'ARCHIVADO_EXPEDIENTE',
    tipoRecurso: 'EXPEDIENTE',
    recursoId: 'exp-pac-004',
    recursoNombre: 'Expediente de Carmen Mendoza',
    motivoJustificacion: 'Baja administrativa por traslado a San Juan de Dios a solicitud formal de la familia.',
    severidad: 'CRITICO',
    cambiosDetalle: [
      { campo: 'estado', valorAnterior: 'ACTIVO', valorNuevo: 'ARCHIVADO' },
      { campo: 'causaArchivo', valorAnterior: null, valorNuevo: 'TRASLADO' }
    ]
  },
  {
    id: 'EVT-2026-0050',
    correlacionId: 'corr-9921-aa02-7711',
    institucionId: 'HOSPITAL_GENERAL',
    timestamp: '2026-10-16T08:30:15Z',
    actor: {
      nombre: 'Secretaría de Admisión Hospital',
      email: 'secretaria.admision@hospital-general.salud.gt',
      rol: 'Secretaría y Admisión',
      ipOrigen: '192.168.1.105'
    },
    accion: 'CREACION',
    tipoRecurso: 'PACIENTE',
    recursoId: 'pac-001',
    recursoNombre: 'Roberto Estrada Morales',
    motivoJustificacion: 'Admisión general de paciente ambulatorio con DPI 2489 12345 0101.',
    severidad: 'INFO',
    cambiosDetalle: [
      { campo: 'estado', valorAnterior: null, valorNuevo: 'ACTIVO' }
    ]
  }
];

export class MockAuditRepository implements AuditRepository {
  private eventos: EventoAuditoria[] = [];

  constructor() {
    this.cargarEventos();
  }

  private cargarEventos(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.eventos = JSON.parse(raw);
        return;
      }
    } catch {
      // fallback
    }
    this.eventos = JSON.parse(JSON.stringify(INITIAL_EVENTS));
  }

  private guardarEventos(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.eventos));
    } catch {
      // ignore
    }
  }

  async consultarEventos(institucionId: InstitucionId, filtros: FiltrosAuditoriaQuery): Promise<EventoAuditoria[]> {
    await new Promise((res) => setTimeout(res, 40));
    return this.eventos.filter((ev) => {
      if (ev.institucionId !== institucionId) return false;

      if (filtros.actor && filtros.actor.trim() !== '') {
        const a = filtros.actor.toLowerCase();
        const coincide =
          ev.actor.nombre.toLowerCase().includes(a) ||
          ev.actor.email.toLowerCase().includes(a) ||
          ev.actor.rol.toLowerCase().includes(a);
        if (!coincide) return false;
      }

      if (filtros.accion && filtros.accion !== 'TODAS' && ev.accion !== filtros.accion) {
        return false;
      }

      if (filtros.tipoRecurso && filtros.tipoRecurso !== 'TODOS' && ev.tipoRecurso !== filtros.tipoRecurso) {
        return false;
      }

      if (filtros.correlacionId && filtros.correlacionId.trim() !== '') {
        const c = filtros.correlacionId.toLowerCase();
        if (!ev.correlacionId.toLowerCase().includes(c) && !ev.id.toLowerCase().includes(c)) {
          return false;
        }
      }

      if (filtros.fechaDesde && new Date(ev.timestamp) < new Date(filtros.fechaDesde)) {
        return false;
      }

      if (filtros.fechaHasta && new Date(ev.timestamp) > new Date(filtros.fechaHasta + 'T23:59:59Z')) {
        return false;
      }

      return true;
    });
  }

  async obtenerEventoPorId(institucionId: InstitucionId, id: string): Promise<EventoAuditoria | null> {
    await new Promise((res) => setTimeout(res, 20));
    return this.eventos.find((e) => e.institucionId === institucionId && e.id === id) || null;
  }

  async registrarEvento(
    institucionId: InstitucionId,
    evento: Omit<EventoAuditoria, 'id' | 'correlacionId' | 'timestamp' | 'institucionId'>
  ): Promise<EventoAuditoria> {
    await new Promise((res) => setTimeout(res, 30));
    const nuevo: EventoAuditoria = {
      ...evento,
      id: `EVT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      correlacionId: `corr-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      institucionId
    };

    this.eventos.unshift(nuevo);
    this.guardarEventos();
    return nuevo;
  }
}
