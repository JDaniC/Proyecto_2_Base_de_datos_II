import { LaboratoryRepository } from '../services/contracts';
import {
  InstitucionId,
  OrdenLaboratorio,
  FiltrosBandejaLab,
  CrearOrdenLabDTO,
  MuestraLaboratorio,
  EstadoMuestraLaboratorio,
  EventoTrazabilidadMuestra
} from '../services/types';

const STORAGE_KEY_ORDENES = 'clinica_lab_ordenes_v1';
const STORAGE_KEY_MUESTRAS = 'clinica_lab_muestras_v1';

export class MockLaboratoryRepository implements LaboratoryRepository {
  private ordenes: OrdenLaboratorio[] = [];
  private muestras: MuestraLaboratorio[] = [];

  constructor() {
    this.cargarDatos();
  }

  private cargarDatos(): void {
    try {
      const rawO = localStorage.getItem(STORAGE_KEY_ORDENES);
      const rawM = localStorage.getItem(STORAGE_KEY_MUESTRAS);

      if (rawO) this.ordenes = JSON.parse(rawO);
      if (rawM) this.muestras = JSON.parse(rawM);
    } catch {
      // fallback
    }

    if (this.ordenes.length === 0) {
      this.ordenes = [
        {
          id: 'ord-lab-01',
          codigoOrden: 'ORD-LAB-2026-0081',
          institucionId: 'LABORATORIO_CLINICO',
          pacienteId: 'pac-01',
          pacienteNombre: 'Ana Lucía Morales',
          pacienteDpi: '2456 78901 0101',
          pacienteEdad: 34,
          pacienteSexo: 'F',
          medicoSolicitante: 'Dr. Fernando Arévalo (Colegiado CMG-7819)',
          prioridad: 'STAT',
          estado: 'EN_ANALISIS',
          motivoClinico: 'Sospecha de cetoacidosis diabética y desequilibrio hidroelectrolítico agudo',
          fechaCreacion: '2026-10-22T07:30:00Z',
          totalArancelGTQ: 420,
          items: [
            {
              id: 'item-01',
              pruebaId: 'lab-gas-01',
              codigoPrueba: 'GAS-001',
              nombrePrueba: 'Gasometría Arterial Completa',
              seccion: 'Hematología y Gases',
              tipoMuestra: 'Sangre Arterial Heparinizada',
              versionPrueba: 2,
              arancelGTQ: 240,
              estado: 'EN_PROCESO'
            },
            {
              id: 'item-02',
              pruebaId: 'lab-elec-01',
              codigoPrueba: 'BIO-004',
              nombrePrueba: 'Electrólitos Séricos (Na, K, Cl, Ca)',
              seccion: 'Bioquímica Clínica',
              tipoMuestra: 'Suero (Tubo Oro)',
              versionPrueba: 1,
              arancelGTQ: 180,
              estado: 'EN_PROCESO'
            }
          ],
          muestras: [
            {
              id: 'mue-01',
              codigoMuestra: 'MUE-2026-0081-01',
              ordenId: 'ord-lab-01',
              codigoOrden: 'ORD-LAB-2026-0081',
              pacienteId: 'pac-01',
              pacienteNombre: 'Ana Lucía Morales',
              tipoMuestra: 'Sangre Arterial Heparinizada',
              tuboContenedor: 'Jeringa Heparinizada (Tapa hermética)',
              estado: 'ACEPTADA',
              fechaToma: '2026-10-22T07:45:00Z',
              tomadaPor: 'Licda. Carmen Valladares (Enfermera Flebotomista)',
              fechaRecepcion: '2026-10-22T07:55:00Z',
              recibidaPor: 'Lic. Kevin Estrada (Analista de Laboratorio)',
              eventosTrazabilidad: [
                {
                  id: 'evt-01',
                  tipoEvento: 'CREACION',
                  fechaHora: '2026-10-22T07:30:00Z',
                  actor: 'Recepción Central',
                  detalle: 'Orden generada con prioridad STAT'
                },
                {
                  id: 'evt-02',
                  tipoEvento: 'TOMA',
                  fechaHora: '2026-10-22T07:45:00Z',
                  actor: 'Licda. Carmen Valladares',
                  detalle: 'Punción en arteria radial izquierda sin hematoma'
                },
                {
                  id: 'evt-03',
                  tipoEvento: 'RECEPCION',
                  fechaHora: '2026-10-22T07:55:00Z',
                  actor: 'Lic. Kevin Estrada',
                  detalle: 'Muestra ingresada a cabina con hielo y verificación de rótulo unívoco'
                },
                {
                  id: 'evt-04',
                  tipoEvento: 'ACEPTACION',
                  fechaHora: '2026-10-22T08:00:00Z',
                  actor: 'Lic. Kevin Estrada',
                  detalle: 'Criterios preanalíticos cumplidos; sin coágulos ni burbujas'
                }
              ]
            }
          ]
        },
        {
          id: 'ord-lab-02',
          codigoOrden: 'ORD-LAB-2026-0082',
          institucionId: 'LABORATORIO_CLINICO',
          pacienteId: 'pac-02',
          pacienteNombre: 'Carlos Fernando López',
          pacienteDpi: '1987 65432 0101',
          pacienteEdad: 48,
          pacienteSexo: 'M',
          medicoSolicitante: 'Dra. Elena Morales (Colegiado CMG-10421)',
          prioridad: 'URGENTE',
          estado: 'MUESTRA_PENDIENTE',
          motivoClinico: 'Control metabólico y evaluación de riesgo cardiovascular por síndrome metabólico',
          fechaCreacion: '2026-10-22T08:15:00Z',
          totalArancelGTQ: 310,
          items: [
            {
              id: 'item-03',
              pruebaId: 'lab-glu-01',
              codigoPrueba: 'BIO-001',
              nombrePrueba: 'Glucosa en Ayunas',
              seccion: 'Bioquímica Clínica',
              tipoMuestra: 'Suero (Tubo Rojo/Oro)',
              versionPrueba: 2,
              arancelGTQ: 60,
              estado: 'PENDIENTE'
            },
            {
              id: 'item-04',
              pruebaId: 'lab-lip-01',
              codigoPrueba: 'BIO-002',
              nombrePrueba: 'Perfil Lipídico Completo (Col total, HDL, LDL, VLDL, Triglicéridos)',
              seccion: 'Bioquímica Clínica',
              tipoMuestra: 'Suero (Tubo Rojo/Oro)',
              versionPrueba: 3,
              arancelGTQ: 250,
              estado: 'PENDIENTE'
            }
          ],
          muestras: [
            {
              id: 'mue-02',
              codigoMuestra: 'MUE-2026-0082-01',
              ordenId: 'ord-lab-02',
              codigoOrden: 'ORD-LAB-2026-0082',
              pacienteId: 'pac-02',
              pacienteNombre: 'Carlos Fernando López',
              tipoMuestra: 'Suero Sanguíneo',
              tuboContenedor: 'Tubo Oro con Gel Separador',
              estado: 'PENDIENTE_TOMA',
              eventosTrazabilidad: [
                {
                  id: 'evt-05',
                  tipoEvento: 'CREACION',
                  fechaHora: '2026-10-22T08:15:00Z',
                  actor: 'Recepción Central',
                  detalle: 'Etiqueta preimpresa y orden registrada con 12 h de ayuno referidas'
                }
              ]
            }
          ]
        },
        {
          id: 'ord-lab-03',
          codigoOrden: 'ORD-LAB-2026-0083',
          institucionId: 'LABORATORIO_CLINICO',
          pacienteId: 'pac-03',
          pacienteNombre: 'Sofía Daniela Reyes',
          pacienteDpi: '3012 45678 0101',
          pacienteEdad: 22,
          pacienteSexo: 'F',
          medicoSolicitante: 'Dra. Gabriela Fuentes (Colegiado CMG-11540)',
          prioridad: 'RUTINA',
          estado: 'CREADA',
          motivoClinico: 'Evaluación preoperatoria para rinoseptoplastia funcional',
          fechaCreacion: '2026-10-22T08:45:00Z',
          totalArancelGTQ: 325,
          items: [
            {
              id: 'item-05',
              pruebaId: 'lab-01',
              codigoPrueba: 'HEM-001',
              nombrePrueba: 'Hematología Completa Automatizada',
              seccion: 'Hematología y Coagulación',
              tipoMuestra: 'Sangre total con EDTA (Tubo lila)',
              versionPrueba: 2,
              arancelGTQ: 125,
              estado: 'PENDIENTE'
            },
            {
              id: 'item-06',
              pruebaId: 'lab-coag-01',
              codigoPrueba: 'HEM-002',
              nombrePrueba: 'Tiempos de Coagulación (TP / TPT / INR)',
              seccion: 'Hematología y Coagulación',
              tipoMuestra: 'Plasma Citratado (Tubo Azul Celeste)',
              versionPrueba: 1,
              arancelGTQ: 200,
              estado: 'PENDIENTE'
            }
          ],
          muestras: [
            {
              id: 'mue-03',
              codigoMuestra: 'MUE-2026-0083-01',
              ordenId: 'ord-lab-03',
              codigoOrden: 'ORD-LAB-2026-0083',
              pacienteId: 'pac-03',
              pacienteNombre: 'Sofía Daniela Reyes',
              tipoMuestra: 'Sangre Total EDTA',
              tuboContenedor: 'Tubo Lila (EDTA K2)',
              estado: 'PENDIENTE_TOMA',
              eventosTrazabilidad: [
                {
                  id: 'evt-06',
                  tipoEvento: 'CREACION',
                  fechaHora: '2026-10-22T08:45:00Z',
                  actor: 'Recepción Central',
                  detalle: 'Orden de rutina ambulatoria creada'
                }
              ]
            }
          ]
        },
        {
          id: 'ord-lab-04',
          codigoOrden: 'ORD-LAB-2026-0084',
          institucionId: 'LABORATORIO_CLINICO',
          pacienteId: 'pac-04',
          pacienteNombre: 'María Elena Estrada',
          pacienteDpi: '1789 12345 0101',
          pacienteEdad: 59,
          pacienteSexo: 'F',
          medicoSolicitante: 'Dr. Roberto Mendoza (Colegiado CMG-8921)',
          prioridad: 'RUTINA',
          estado: 'PARA_VALIDAR',
          motivoClinico: 'Seguimiento de infección urinaria recurrente y ajuste de antibiótico guiado',
          fechaCreacion: '2026-10-20T10:00:00Z',
          totalArancelGTQ: 280,
          items: [
            {
              id: 'item-07',
              pruebaId: 'lab-uro-01',
              codigoPrueba: 'MIC-001',
              nombrePrueba: 'Urocultivo con Antibiograma Automatizado',
              seccion: 'Microbiología Clínica',
              tipoMuestra: 'Orina fresca chorro medio (Frasco estéril)',
              versionPrueba: 2,
              arancelGTQ: 280,
              estado: 'EN_PROCESO'
            }
          ],
          muestras: [
            {
              id: 'mue-04',
              codigoMuestra: 'MUE-2026-0084-01',
              ordenId: 'ord-lab-04',
              codigoOrden: 'ORD-LAB-2026-0084',
              pacienteId: 'pac-04',
              pacienteNombre: 'María Elena Estrada',
              tipoMuestra: 'Orina chorro medio',
              tuboContenedor: 'Frasco Estéril 60 mL',
              estado: 'PROCESADA',
              fechaToma: '2026-10-20T10:30:00Z',
              tomadaPor: 'Paciente en sala de tomas (instructivo entregado)',
              fechaRecepcion: '2026-10-20T10:45:00Z',
              recibidaPor: 'Lic. Kevin Estrada',
              eventosTrazabilidad: [
                {
                  id: 'evt-07',
                  tipoEvento: 'CREACION',
                  fechaHora: '2026-10-20T10:00:00Z',
                  actor: 'Recepción Central',
                  detalle: 'Orden registrada'
                },
                {
                  id: 'evt-08',
                  tipoEvento: 'TOMA',
                  fechaHora: '2026-10-20T10:30:00Z',
                  actor: 'Toma de Muestras',
                  detalle: 'Recolección higiénica confirmada'
                },
                {
                  id: 'evt-09',
                  tipoEvento: 'RECEPCION',
                  fechaHora: '2026-10-20T10:45:00Z',
                  actor: 'Lic. Kevin Estrada',
                  detalle: 'Sembrado en agar sangre y MacConkey antes de 30 min'
                },
                {
                  id: 'evt-10',
                  tipoEvento: 'ACEPTACION',
                  fechaHora: '2026-10-20T11:00:00Z',
                  actor: 'Lic. Kevin Estrada',
                  detalle: 'Criterios cumplidos para incubación a 37°C por 48 h'
                }
              ]
            }
          ]
        },
        {
          id: 'ord-lab-05',
          codigoOrden: 'ORD-LAB-2026-0085',
          institucionId: 'LABORATORIO_CLINICO',
          pacienteId: 'pac-05',
          pacienteNombre: 'Jorge Mario Castillo',
          pacienteDpi: '2234 56789 0101',
          pacienteEdad: 63,
          pacienteSexo: 'M',
          medicoSolicitante: 'Dr. Alejandro Morales (Colegiado CMG-6540)',
          prioridad: 'URGENTE',
          estado: 'COMPLETADA',
          motivoClinico: 'Descarte de síndrome coronario agudo / dolor torácico opresivo',
          fechaCreacion: '2026-10-21T18:00:00Z',
          totalArancelGTQ: 380,
          items: [
            {
              id: 'item-08',
              pruebaId: 'lab-trop-01',
              codigoPrueba: 'INM-001',
              nombrePrueba: 'Troponina I de Alta Sensibilidad',
              seccion: 'Inmunología Clínica',
              tipoMuestra: 'Suero (Tubo Rojo)',
              versionPrueba: 2,
              arancelGTQ: 380,
              estado: 'VALIDADO'
            }
          ],
          muestras: [
            {
              id: 'mue-05',
              codigoMuestra: 'MUE-2026-0085-01',
              ordenId: 'ord-lab-05',
              codigoOrden: 'ORD-LAB-2026-0085',
              pacienteId: 'pac-05',
              pacienteNombre: 'Jorge Mario Castillo',
              tipoMuestra: 'Suero Sanguíneo',
              tuboContenedor: 'Tubo Rojo con Activador de Coágulo',
              estado: 'PROCESADA',
              fechaToma: '2026-10-21T18:15:00Z',
              tomadaPor: 'Licda. Carmen Valladares',
              fechaRecepcion: '2026-10-21T18:25:00Z',
              recibidaPor: 'Lic. Kevin Estrada',
              eventosTrazabilidad: [
                {
                  id: 'evt-11',
                  tipoEvento: 'CREACION',
                  fechaHora: '2026-10-21T18:00:00Z',
                  actor: 'Urgencias',
                  detalle: 'Orden de emergencia'
                },
                {
                  id: 'evt-12',
                  tipoEvento: 'TOMA',
                  fechaHora: '2026-10-21T18:15:00Z',
                  actor: 'Licda. Carmen Valladares',
                  detalle: 'Punción venosa exitosa al primer intento'
                },
                {
                  id: 'evt-13',
                  tipoEvento: 'RECEPCION',
                  fechaHora: '2026-10-21T18:25:00Z',
                  actor: 'Lic. Kevin Estrada',
                  detalle: 'Centrifugada a 3000 rpm durante 10 min'
                },
                {
                  id: 'evt-14',
                  tipoEvento: 'ACEPTACION',
                  fechaHora: '2026-10-21T18:35:00Z',
                  actor: 'Lic. Kevin Estrada',
                  detalle: 'Suero límpido sin hemólisis'
                }
              ]
            }
          ]
        }
      ];
    }

    // Unir todas las muestras de las órdenes
    this.muestras = this.ordenes.flatMap((o) => o.muestras);
    this.guardarDatos();
  }

  private guardarDatos(): void {
    try {
      localStorage.setItem(STORAGE_KEY_ORDENES, JSON.stringify(this.ordenes));
      localStorage.setItem(STORAGE_KEY_MUESTRAS, JSON.stringify(this.muestras));
    } catch {
      // ignore
    }
  }

  async obtenerBandeja(
    _institucionId: InstitucionId,
    filtros?: FiltrosBandejaLab
  ): Promise<OrdenLaboratorio[]> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 40));

    let resultado = [...this.ordenes];

    if (filtros) {
      if (filtros.prioridad && filtros.prioridad !== 'TODAS') {
        resultado = resultado.filter((o) => o.prioridad === filtros.prioridad);
      }

      if (filtros.estado && filtros.estado !== 'TODOS') {
        resultado = resultado.filter((o) => o.estado === filtros.estado);
      }

      if (filtros.seccion && filtros.seccion !== 'TODAS') {
        resultado = resultado.filter((o) =>
          o.items.some((item) => item.seccion.toLowerCase().includes(filtros.seccion!.toLowerCase()))
        );
      }

      if (filtros.busqueda && filtros.busqueda.trim() !== '') {
        const q = filtros.busqueda.toLowerCase();
        resultado = resultado.filter(
          (o) =>
            o.codigoOrden.toLowerCase().includes(q) ||
            o.pacienteNombre.toLowerCase().includes(q) ||
            o.pacienteDpi.toLowerCase().includes(q) ||
            o.medicoSolicitante.toLowerCase().includes(q) ||
            o.items.some((item) => item.nombrePrueba.toLowerCase().includes(q))
        );
      }
    }

    // Ordenar STAT y URGENTE primero, luego por fecha descendente
    resultado.sort((a, b) => {
      const pesoPrioridad = { STAT: 3, URGENTE: 2, RUTINA: 1 };
      const diffPrio = pesoPrioridad[b.prioridad] - pesoPrioridad[a.prioridad];
      if (diffPrio !== 0) return diffPrio;
      return new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime();
    });

    return resultado;
  }

  async obtenerOrdenPorId(
    _institucionId: InstitucionId,
    ordenId: string
  ): Promise<OrdenLaboratorio | null> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 30));
    const orden = this.ordenes.find((o) => o.id === ordenId || o.codigoOrden === ordenId);
    return orden ? { ...orden } : null;
  }

  async crearOrden(
    institucionId: InstitucionId,
    dto: CrearOrdenLabDTO
  ): Promise<OrdenLaboratorio> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 50));

    const nuevoNumero = this.ordenes.length + 86;
    const codigoOrden = `ORD-LAB-2026-00${nuevoNumero}`;
    const id = `ord-lab-${Date.now()}`;
    const fechaActual = new Date().toISOString();

    const items: OrdenLaboratorio['items'] = dto.pruebasSeleccionadasIds.map((pid, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      pruebaId: pid,
      codigoPrueba: `PRB-${100 + idx}`,
      nombrePrueba: pid.includes('hem') ? 'Hematología Completa Automatizada' : 'Perfil Bioquímico Clínico',
      seccion: pid.includes('hem') ? 'Hematología y Coagulación' : 'Bioquímica Clínica',
      tipoMuestra: 'Sangre Total EDTA / Suero',
      versionPrueba: 1,
      arancelGTQ: 150,
      estado: 'PENDIENTE'
    }));

    const codigoMuestra = `MUE-2026-00${nuevoNumero}-01`;
    const muestraId = `mue-${Date.now()}`;
    const muestraNueva: MuestraLaboratorio = {
      id: muestraId,
      codigoMuestra,
      ordenId: id,
      codigoOrden,
      pacienteId: dto.pacienteId,
      pacienteNombre: dto.pacienteNombre,
      tipoMuestra: 'Sangre Venosa',
      tuboContenedor: 'Tubo Lila EDTA / Tubo Oro Gel',
      estado: 'PENDIENTE_TOMA',
      eventosTrazabilidad: [
        {
          id: `evt-${Date.now()}`,
          tipoEvento: 'CREACION',
          fechaHora: fechaActual,
          actor: 'Recepción Central',
          detalle: 'Orden creada en sistema con contenedor asignado'
        }
      ]
    };

    const nuevaOrden: OrdenLaboratorio = {
      id,
      codigoOrden,
      institucionId,
      pacienteId: dto.pacienteId,
      pacienteNombre: dto.pacienteNombre,
      pacienteDpi: dto.pacienteDpi,
      pacienteEdad: dto.pacienteEdad,
      pacienteSexo: dto.pacienteSexo,
      medicoSolicitante: dto.medicoSolicitante,
      prioridad: dto.prioridad,
      estado: 'CREADA',
      motivoClinico: dto.motivoClinico,
      fechaCreacion: fechaActual,
      totalArancelGTQ: items.reduce((acc, i) => acc + i.arancelGTQ, 0),
      items,
      muestras: [muestraNueva]
    };

    this.ordenes.unshift(nuevaOrden);
    this.muestras.unshift(muestraNueva);
    this.guardarDatos();
    return nuevaOrden;
  }

  async obtenerMuestras(
    _institucionId: InstitucionId,
    ordenId?: string
  ): Promise<MuestraLaboratorio[]> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 30));
    if (ordenId) {
      return this.muestras.filter((m) => m.ordenId === ordenId || m.codigoOrden === ordenId);
    }
    return [...this.muestras];
  }

  async actualizarEstadoMuestra(
    _institucionId: InstitucionId,
    muestraId: string,
    nuevoEstado: EstadoMuestraLaboratorio,
    motivo?: string,
    actor: string = 'Personal de Laboratorio'
  ): Promise<MuestraLaboratorio> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 40));

    const idx = this.muestras.findIndex((m) => m.id === muestraId || m.codigoMuestra === muestraId);
    if (idx === -1) throw new Error(`Muestra ${muestraId} no encontrada`);

    const m = this.muestras[idx];
    const ahora = new Date().toISOString();

    let tipoEvento: EventoTrazabilidadMuestra['tipoEvento'] = 'RECTIFICACION';
    if (nuevoEstado === 'TOMADA') {
      tipoEvento = 'TOMA';
      m.fechaToma = ahora;
      m.tomadaPor = actor;
    } else if (nuevoEstado === 'RECIBIDA') {
      tipoEvento = 'RECEPCION';
      m.fechaRecepcion = ahora;
      m.recibidaPor = actor;
    } else if (nuevoEstado === 'ACEPTADA') {
      tipoEvento = 'ACEPTACION';
    } else if (nuevoEstado === 'RECHAZADA') {
      tipoEvento = 'RECHAZO';
      m.motivoRechazo = motivo || 'Muestra no apta por criterios preanalíticos';
    }

    m.estado = nuevoEstado;
    m.eventosTrazabilidad.push({
      id: `evt-${Date.now()}`,
      tipoEvento,
      fechaHora: ahora,
      actor,
      detalle: `Muestra en estado ${nuevoEstado}`,
      motivo
    });

    // Sincronizar en la orden correspondiente
    const ordIdx = this.ordenes.findIndex((o) => o.id === m.ordenId);
    if (ordIdx !== -1) {
      const mIdx = this.ordenes[ordIdx].muestras.findIndex((x) => x.id === m.id);
      if (mIdx !== -1) {
        this.ordenes[ordIdx].muestras[mIdx] = { ...m };
      }
      if (nuevoEstado === 'ACEPTADA') {
        this.ordenes[ordIdx].estado = 'EN_ANALISIS';
      }
    }

    this.guardarDatos();
    return { ...m };
  }

  async registrarRetomaMuestra(
    _institucionId: InstitucionId,
    muestraRechazadaId: string,
    motivoRetoma: string,
    actor: string
  ): Promise<MuestraLaboratorio> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 50));

    const idx = this.muestras.findIndex((m) => m.id === muestraRechazadaId);
    if (idx === -1) throw new Error('Muestra original no encontrada para generar retoma');

    const original = this.muestras[idx];
    const ahora = new Date().toISOString();

    const retomaId = `mue-retoma-${Date.now()}`;
    const codigoRetoma = `${original.codigoMuestra}-R1`;

    const nuevaMuestra: MuestraLaboratorio = {
      id: retomaId,
      codigoMuestra: codigoRetoma,
      ordenId: original.ordenId,
      codigoOrden: original.codigoOrden,
      pacienteId: original.pacienteId,
      pacienteNombre: original.pacienteNombre,
      tipoMuestra: original.tipoMuestra,
      tuboContenedor: original.tuboContenedor,
      estado: 'PENDIENTE_TOMA',
      esRetoma: true,
      muestraOrigenId: original.id,
      eventosTrazabilidad: [
        {
          id: `evt-${Date.now()}`,
          tipoEvento: 'RETOMA',
          fechaHora: ahora,
          actor,
          detalle: `Retoma generada tras rechazo de ${original.codigoMuestra}`,
          motivo: motivoRetoma
        }
      ]
    };

    this.muestras.push(nuevaMuestra);

    // Agregar a la orden
    const ordIdx = this.ordenes.findIndex((o) => o.id === original.ordenId);
    if (ordIdx !== -1) {
      this.ordenes[ordIdx].muestras.push(nuevaMuestra);
      this.ordenes[ordIdx].estado = 'MUESTRA_PENDIENTE';
    }

    this.guardarDatos();
    return nuevaMuestra;
  }

  async rectificarDatoMuestra(
    _institucionId: InstitucionId,
    muestraId: string,
    campo: 'tuboContenedor' | 'tipoMuestra',
    nuevoValor: string,
    motivo: string,
    actor: string
  ): Promise<MuestraLaboratorio> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 40));

    const idx = this.muestras.findIndex((m) => m.id === muestraId || m.codigoMuestra === muestraId);
    if (idx === -1) throw new Error('Muestra no encontrada para rectificación');

    const m = this.muestras[idx];
    const valorAnterior = m[campo];
    m[campo] = nuevoValor;

    const ahora = new Date().toISOString();
    m.eventosTrazabilidad.push({
      id: `evt-${Date.now()}`,
      tipoEvento: 'RECTIFICACION',
      fechaHora: ahora,
      actor,
      detalle: `Rectificación de campo «${campo}»: de «${valorAnterior}» a «${nuevoValor}»`,
      motivo
    });

    // Sincronizar en la orden
    const ordIdx = this.ordenes.findIndex((o) => o.id === m.ordenId);
    if (ordIdx !== -1) {
      const mIdx = this.ordenes[ordIdx].muestras.findIndex((x) => x.id === m.id);
      if (mIdx !== -1) {
        this.ordenes[ordIdx].muestras[mIdx] = { ...m };
      }
    }

    this.guardarDatos();
    return { ...m };
  }
}
