import { HospitalizationRepository } from '../services/contracts';
import {
  InstitucionId,
  HospitalizacionItem,
  CamaHospitalaria,
  AsignacionCamaItem,
  NotaEvolucionItem,
  ProcedimientoHospitalarioItem,
  CrearIngresoHospitalarioDTO,
  RegistrarEgresoHospitalarioDTO
} from '../services/types';

const STORAGE_HOSP = 'clinica_hospitalizaciones_dataset_v1';
const STORAGE_CAMAS = 'clinica_camas_dataset_v1';

const CAMAS_INITIAL: CamaHospitalaria[] = [
  {
    id: 'cama-201-a',
    habitacionId: 'hab-201',
    numeroHabitacion: '201',
    piso: 2,
    salaServicio: 'Medicina Interna',
    codigoCama: '201-A',
    estado: 'DISPONIBLE'
  },
  {
    id: 'cama-201-b',
    habitacionId: 'hab-201',
    numeroHabitacion: '201',
    piso: 2,
    salaServicio: 'Medicina Interna',
    codigoCama: '201-B',
    estado: 'OCUPADA',
    hospitalizacionActivaId: 'hosp-001',
    pacienteActual: 'Roberto Estrada Morales'
  },
  {
    id: 'cama-202-a',
    habitacionId: 'hab-202',
    numeroHabitacion: '202',
    piso: 2,
    salaServicio: 'Cirugía General',
    codigoCama: '202-A',
    estado: 'OCUPADA',
    hospitalizacionActivaId: 'hosp-002',
    pacienteActual: 'Carmen Mendoza'
  },
  {
    id: 'cama-202-b',
    habitacionId: 'hab-202',
    numeroHabitacion: '202',
    piso: 2,
    salaServicio: 'Cirugía General',
    codigoCama: '202-B',
    estado: 'DISPONIBLE'
  },
  {
    id: 'cama-203-a',
    habitacionId: 'hab-203',
    numeroHabitacion: '203',
    piso: 2,
    salaServicio: 'Cuidados Intermedios',
    codigoCama: '203-A',
    estado: 'DISPONIBLE'
  },
  {
    id: 'cama-203-b',
    habitacionId: 'hab-203',
    numeroHabitacion: '203',
    piso: 2,
    salaServicio: 'Cuidados Intermedios',
    codigoCama: '203-B',
    estado: 'MANTENIMIENTO'
  },
  {
    id: 'cama-301-a',
    habitacionId: 'hab-301',
    numeroHabitacion: '301',
    piso: 3,
    salaServicio: 'Aislamiento Especial',
    codigoCama: '301-A',
    estado: 'DISPONIBLE'
  }
];

const HOSPITALIZACIONES_INITIAL: HospitalizacionItem[] = [
  {
    id: 'hosp-001',
    codigoIngreso: 'ING-2026-0042',
    institucionId: 'HOSPITAL_GENERAL',
    pacienteId: 'pac-001',
    pacienteNombre: 'Roberto Estrada Morales',
    pacienteExpediente: 'EXP-2026-0042',
    medicoTratanteId: 'med-01',
    medicoTratanteNombre: 'Dra. Elena Morales',
    medicoTratanteColegiado: 'CMG-10421',
    fechaIngreso: '2026-10-17T09:30:00Z',
    estado: 'ACTIVA',
    diagnosticoIngresoCIE: 'I10',
    diagnosticoIngresoNombre: 'Hipertensión esencial (primaria) descompensada',
    motivoIngreso: 'Crisis hipertensiva sintomática con cefalea refractaria a tratamiento oral. Monitoreo hemodinámico.',
    camaActual: {
      camaId: 'cama-201-b',
      codigoCama: '201-B',
      habitacion: 'Habitación 201',
      servicio: 'Medicina Interna'
    },
    asignacionesCama: [
      {
        id: 'asig-001',
        camaId: 'cama-201-b',
        codigoCama: '201-B',
        habitacion: 'Habitación 201',
        servicio: 'Medicina Interna',
        fechaInicio: '2026-10-17T09:30:00Z'
      }
    ],
    consultasEnlazadasIds: ['cons-102'],
    notasEvolucion: [
      {
        id: 'nota-001',
        fechaHora: '2026-10-17T18:00:00Z',
        medicoNombre: 'Dra. Elena Morales',
        medicoColegiado: 'CMG-10421',
        notaClinica: 'Paciente ingresa hemodinámicamente estable pero con PA 170/105 mmHg. Se inicia infusión y monitoreo continuo.',
        planTerapeutico: 'Dieta hiposódica estricta, monitoreo de signos vitales cada 4 horas.'
      },
      {
        id: 'nota-002',
        fechaHora: '2026-10-18T08:30:00Z',
        medicoNombre: 'Dra. Elena Morales',
        medicoColegiado: 'CMG-10421',
        notaClinica: 'Cifras tensionales en descenso (135/85 mmHg). Buena tolerancia oral, sin cefalea ni acúfenos.',
        planTerapeutico: 'Continuar antihipertensivo oral. Evaluar egreso en 24 horas si mantiene estabilidad.'
      }
    ],
    procedimientos: [
      {
        id: 'proc-001',
        nombre: 'Colocación de catéter venoso periférico y toma de muestras',
        codigo: 'PROC-CVP-01',
        fechaHora: '2026-10-17T10:00:00Z',
        profesionalNombre: 'Enfra. Mayra Castillo',
        resultado: 'Cateterización exitosa en fosa antecubital izquierda sin hematoma.',
        observaciones: 'Calibre 18G permeable con solución salina normal.'
      }
    ]
  },
  {
    id: 'hosp-002',
    codigoIngreso: 'ING-2026-0048',
    institucionId: 'HOSPITAL_GENERAL',
    pacienteId: 'pac-004',
    pacienteNombre: 'Carmen Mendoza',
    pacienteExpediente: 'EXP-2026-0078',
    medicoTratanteId: 'med-03',
    medicoTratanteNombre: 'Dr. Sergio Valladares',
    medicoTratanteColegiado: 'CMG-08910',
    fechaIngreso: '2026-10-18T14:00:00Z',
    estado: 'ACTIVA',
    diagnosticoIngresoCIE: 'K35.8',
    diagnosticoIngresoNombre: 'Apendicitis aguda no especificada',
    motivoIngreso: 'Abdomen agudo quirúrgico. Programada para apendicectomía laparoscópica de urgencia.',
    camaActual: {
      camaId: 'cama-202-a',
      codigoCama: '202-A',
      habitacion: 'Habitación 202',
      servicio: 'Cirugía General'
    },
    asignacionesCama: [
      {
        id: 'asig-002',
        camaId: 'cama-202-a',
        codigoCama: '202-A',
        habitacion: 'Habitación 202',
        servicio: 'Cirugía General',
        fechaInicio: '2026-10-18T14:00:00Z'
      }
    ],
    consultasEnlazadasIds: [],
    notasEvolucion: [
      {
        id: 'nota-003',
        fechaHora: '2026-10-18T16:00:00Z',
        medicoNombre: 'Dr. Sergio Valladares',
        medicoColegiado: 'CMG-08910',
        notaClinica: 'Paciente en sala de pre-operatorio con dolor en fosa ilíaca derecha, Blumberg positivo.',
        planTerapeutico: 'Pasa a quirófano para apendicectomía laparoscópica de urgencia.'
      }
    ],
    procedimientos: [
      {
        id: 'proc-002',
        nombre: 'Apendicectomía por vía laparoscópica',
        codigo: 'QX-APEND-02',
        fechaHora: '2026-10-18T17:30:00Z',
        profesionalNombre: 'Dr. Sergio Valladares',
        resultado: 'Apendicectomía exitosa, pieza quirúrgica enviada a patología. Sin sangrado activo.',
        observaciones: 'Tiempo quirúrgico 45 minutos. Tolera adecuada reversión anestésica.'
      }
    ]
  },
  {
    id: 'hosp-003',
    codigoIngreso: 'ING-2026-0031',
    institucionId: 'HOSPITAL_GENERAL',
    pacienteId: 'pac-002',
    pacienteNombre: 'Lucía Gómez Sandoval',
    pacienteExpediente: 'EXP-2026-0045',
    medicoTratanteId: 'med-01',
    medicoTratanteNombre: 'Dra. Elena Morales',
    medicoTratanteColegiado: 'CMG-10421',
    fechaIngreso: '2026-10-10T08:00:00Z',
    fechaEgreso: '2026-10-14T12:00:00Z',
    estado: 'EGRESADA',
    tipoEgreso: 'ALTA_MEDICA',
    diagnosticoIngresoCIE: 'J06.9',
    diagnosticoIngresoNombre: 'Infección respiratoria aguda de las vías superiores',
    diagnosticoEgresoCIE: 'J06.9',
    diagnosticoEgresoNombre: 'Infección respiratoria aguda resuelta',
    motivoIngreso: 'Dificultad respiratoria moderada con saturación 88% al aire ambiente.',
    resumenEgreso: 'Evolución clínica favorable tras 4 días de antibioticoterapia IV y oxigenoterapia.',
    asignacionesCama: [
      {
        id: 'asig-000',
        camaId: 'cama-201-a',
        codigoCama: '201-A',
        habitacion: 'Habitación 201',
        servicio: 'Medicina Interna',
        fechaInicio: '2026-10-10T08:00:00Z',
        fechaFin: '2026-10-14T12:00:00Z'
      }
    ],
    consultasEnlazadasIds: []
  }
];

export class MockHospitalizationRepository implements HospitalizationRepository {
  private hospitalizaciones: HospitalizacionItem[] = [];
  private camas: CamaHospitalaria[] = [];

  constructor() {
    this.cargarDatos();
  }

  private cargarDatos(): void {
    try {
      const rawH = localStorage.getItem(STORAGE_HOSP);
      if (rawH) this.hospitalizaciones = JSON.parse(rawH);
      const rawC = localStorage.getItem(STORAGE_CAMAS);
      if (rawC) this.camas = JSON.parse(rawC);
    } catch {
      // fallback
    }

    if (this.hospitalizaciones.length === 0) {
      this.hospitalizaciones = JSON.parse(JSON.stringify(HOSPITALIZACIONES_INITIAL));
    }
    if (this.camas.length === 0) {
      this.camas = JSON.parse(JSON.stringify(CAMAS_INITIAL));
    }
  }

  private guardarDatos(): void {
    try {
      localStorage.setItem(STORAGE_HOSP, JSON.stringify(this.hospitalizaciones));
      localStorage.setItem(STORAGE_CAMAS, JSON.stringify(this.camas));
    } catch {
      // ignore
    }
  }

  async listarHospitalizaciones(institucionId: InstitucionId, filtroEstado?: string): Promise<HospitalizacionItem[]> {
    await new Promise((res) => setTimeout(res, 40));
    return this.hospitalizaciones.filter((h) => {
      if (h.institucionId !== institucionId) return false;
      if (filtroEstado && filtroEstado !== 'TODAS' && h.estado !== filtroEstado) {
        return false;
      }
      return true;
    });
  }

  async obtenerHospitalizacionPorId(institucionId: InstitucionId, id: string): Promise<HospitalizacionItem | null> {
    await new Promise((res) => setTimeout(res, 20));
    return this.hospitalizaciones.find((h) => h.institucionId === institucionId && h.id === id) || null;
  }

  async obtenerHospitalizacionesPorPaciente(institucionId: InstitucionId, pacienteId: string): Promise<HospitalizacionItem[]> {
    await new Promise((res) => setTimeout(res, 30));
    return this.hospitalizaciones.filter((h) => h.institucionId === institucionId && h.pacienteId === pacienteId);
  }

  async listarCamas(_institucionId: InstitucionId): Promise<CamaHospitalaria[]> {
    await new Promise((res) => setTimeout(res, 25));
    return [...this.camas];
  }

  async crearIngreso(institucionId: InstitucionId, dto: CrearIngresoHospitalarioDTO): Promise<HospitalizacionItem> {
    await new Promise((res) => setTimeout(res, 50));

    // Validar aislamiento de recursos del paciente (Regla RF-016 / CA17)
    if (dto.consultasEnlazadasIds && dto.consultasEnlazadasIds.length > 0) {
      const tieneIncompatible = dto.consultasEnlazadasIds.some(
        (id) => id.includes('incompatible') || id.includes('otro-paciente')
      );
      if (tieneIncompatible) {
        throw new Error('409 REFERENCIA_INCOMPATIBLE: Las consultas o diagnósticos vinculados no pertenecen al expediente del paciente.');
      }
    }

    // Verificar que la cama esté disponible (Regla CA17)
    const cama = this.camas.find((c) => c.id === dto.camaId);
    if (!cama) throw new Error('Cama no encontrada');
    if (cama.estado !== 'DISPONIBLE') {
      throw new Error(`La cama ${cama.codigoCama} no está disponible (Estado: ${cama.estado}).`);
    }

    const nuevoId = `hosp-${Date.now()}`;
    const codigoIngreso = `ING-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const nuevaAsignacion: AsignacionCamaItem = {
      id: `asig-${Date.now()}`,
      camaId: cama.id,
      codigoCama: cama.codigoCama,
      habitacion: `Habitación ${cama.numeroHabitacion}`,
      servicio: cama.salaServicio,
      fechaInicio: dto.fechaIngreso
    };

    const nuevo: HospitalizacionItem = {
      id: nuevoId,
      codigoIngreso,
      institucionId,
      pacienteId: dto.pacienteId,
      pacienteNombre: dto.pacienteNombre || (dto.pacienteId === 'pac-001' ? 'Roberto Estrada Morales' : 'Paciente Registrado'),
      pacienteExpediente: dto.pacienteExpediente || 'EXP-2026-0042',
      medicoTratanteId: dto.medicoTratanteId,
      medicoTratanteNombre: dto.medicoTratanteNombre || 'Dra. Elena Morales',
      medicoTratanteColegiado: dto.medicoTratanteColegiado || 'CMG-10421',
      fechaIngreso: dto.fechaIngreso,
      estado: 'ACTIVA',
      diagnosticoIngresoCIE: dto.diagnosticoIngresoCIE,
      diagnosticoIngresoNombre: dto.diagnosticoIngresoNombre,
      motivoIngreso: dto.motivoIngreso,
      camaActual: {
        camaId: cama.id,
        codigoCama: cama.codigoCama,
        habitacion: `Habitación ${cama.numeroHabitacion}`,
        servicio: cama.salaServicio
      },
      asignacionesCama: [nuevaAsignacion],
      consultasEnlazadasIds: dto.consultasEnlazadasIds || [],
      notasEvolucion: [],
      procedimientos: []
    };

    // Actualizar estado de la cama
    cama.estado = 'OCUPADA';
    cama.hospitalizacionActivaId = nuevoId;
    cama.pacienteActual = nuevo.pacienteNombre;

    this.hospitalizaciones.unshift(nuevo);
    this.guardarDatos();
    return nuevo;
  }

  async registrarEgreso(
    institucionId: InstitucionId,
    hospitalizacionId: string,
    dto: RegistrarEgresoHospitalarioDTO
  ): Promise<HospitalizacionItem> {
    await new Promise((res) => setTimeout(res, 50));
    const hosp = this.hospitalizaciones.find((h) => h.institucionId === institucionId && h.id === hospitalizacionId);
    if (!hosp) throw new Error('Hospitalización no encontrada');
    if (hosp.estado !== 'ACTIVA') throw new Error('La hospitalización ya no se encuentra activa');

    // Cerrar asignación de cama activa
    if (hosp.camaActual) {
      const cama = this.camas.find((c) => c.id === hosp.camaActual?.camaId);
      if (cama) {
        cama.estado = 'DISPONIBLE';
        cama.hospitalizacionActivaId = undefined;
        cama.pacienteActual = undefined;
      }

      const ultAsig = hosp.asignacionesCama[hosp.asignacionesCama.length - 1];
      if (ultAsig && !ultAsig.fechaFin) {
        ultAsig.fechaFin = dto.fechaEgreso;
      }
    }

    hosp.estado = 'EGRESADA';
    hosp.fechaEgreso = dto.fechaEgreso;
    hosp.tipoEgreso = dto.tipoEgreso;
    hosp.diagnosticoEgresoCIE = dto.diagnosticoEgresoCIE;
    hosp.diagnosticoEgresoNombre = dto.diagnosticoEgresoNombre;
    hosp.resumenEgreso = dto.resumenClinico;
    hosp.camaActual = undefined;

    this.guardarDatos();
    return hosp;
  }

  async asignarCama(
    institucionId: InstitucionId,
    hospitalizacionId: string,
    nuevaCamaId: string,
    fechaInicio: string,
    motivo: string
  ): Promise<HospitalizacionItem> {
    await new Promise((res) => setTimeout(res, 40));
    const hosp = this.hospitalizaciones.find((h) => h.institucionId === institucionId && h.id === hospitalizacionId);
    if (!hosp) throw new Error('Hospitalización no encontrada');

    const nuevaCama = this.camas.find((c) => c.id === nuevaCamaId);
    if (!nuevaCama) throw new Error('Cama destino no encontrada');
    if (nuevaCama.estado !== 'DISPONIBLE') {
      throw new Error(`La cama ${nuevaCama.codigoCama} no está disponible (Estado: ${nuevaCama.estado}).`);
    }

    // Liberar cama anterior
    if (hosp.camaActual) {
      const camaAnt = this.camas.find((c) => c.id === hosp.camaActual?.camaId);
      if (camaAnt) {
        camaAnt.estado = 'DISPONIBLE';
        camaAnt.hospitalizacionActivaId = undefined;
        camaAnt.pacienteActual = undefined;
      }

      const ultAsig = hosp.asignacionesCama[hosp.asignacionesCama.length - 1];
      if (ultAsig && !ultAsig.fechaFin) {
        ultAsig.fechaFin = fechaInicio; // Semántica semiabierta [inicio, fin)
      }
    }

    // Ocupar nueva cama
    nuevaCama.estado = 'OCUPADA';
    nuevaCama.hospitalizacionActivaId = hosp.id;
    nuevaCama.pacienteActual = hosp.pacienteNombre;

    const nuevaAsig: AsignacionCamaItem = {
      id: `asig-${Date.now()}`,
      camaId: nuevaCama.id,
      codigoCama: nuevaCama.codigoCama,
      habitacion: `Habitación ${nuevaCama.numeroHabitacion}`,
      servicio: nuevaCama.salaServicio,
      fechaInicio,
      motivoCambio: motivo
    };

    hosp.asignacionesCama.push(nuevaAsig);
    hosp.camaActual = {
      camaId: nuevaCama.id,
      codigoCama: nuevaCama.codigoCama,
      habitacion: `Habitación ${nuevaCama.numeroHabitacion}`,
      servicio: nuevaCama.salaServicio
    };

    this.guardarDatos();
    return hosp;
  }

  async liberarCama(institucionId: InstitucionId, hospitalizacionId: string, fechaFin: string): Promise<HospitalizacionItem> {
    await new Promise((res) => setTimeout(res, 30));
    const hosp = this.hospitalizaciones.find((h) => h.institucionId === institucionId && h.id === hospitalizacionId);
    if (!hosp) throw new Error('Hospitalización no encontrada');

    if (hosp.camaActual) {
      const cama = this.camas.find((c) => c.id === hosp.camaActual?.camaId);
      if (cama) {
        cama.estado = 'DISPONIBLE';
        cama.hospitalizacionActivaId = undefined;
        cama.pacienteActual = undefined;
      }
      const ultAsig = hosp.asignacionesCama[hosp.asignacionesCama.length - 1];
      if (ultAsig && !ultAsig.fechaFin) {
        ultAsig.fechaFin = fechaFin;
      }
      hosp.camaActual = undefined;
    }

    this.guardarDatos();
    return hosp;
  }

  async agregarNotaEvolucion(
    institucionId: InstitucionId,
    hospitalizacionId: string,
    nota: Omit<NotaEvolucionItem, 'id'>
  ): Promise<HospitalizacionItem> {
    await new Promise((res) => setTimeout(res, 40));
    const hosp = this.hospitalizaciones.find((h) => h.institucionId === institucionId && h.id === hospitalizacionId);
    if (!hosp) throw new Error('Hospitalización no encontrada');
    if (hosp.estado !== 'ACTIVA') throw new Error('No se pueden registrar notas de evolución en una hospitalización egresada.');

    if (!hosp.notasEvolucion) hosp.notasEvolucion = [];
    const nuevaNota: NotaEvolucionItem = {
      id: `nota-${Date.now()}`,
      ...nota
    };
    hosp.notasEvolucion.unshift(nuevaNota);
    this.guardarDatos();
    return hosp;
  }

  async agregarProcedimiento(
    institucionId: InstitucionId,
    hospitalizacionId: string,
    proc: Omit<ProcedimientoHospitalarioItem, 'id'>
  ): Promise<HospitalizacionItem> {
    await new Promise((res) => setTimeout(res, 40));
    const hosp = this.hospitalizaciones.find((h) => h.institucionId === institucionId && h.id === hospitalizacionId);
    if (!hosp) throw new Error('Hospitalización no encontrada');

    if (!hosp.procedimientos) hosp.procedimientos = [];
    const nuevoProc: ProcedimientoHospitalarioItem = {
      id: `proc-${Date.now()}`,
      ...proc
    };
    hosp.procedimientos.unshift(nuevoProc);
    this.guardarDatos();
    return hosp;
  }
}
