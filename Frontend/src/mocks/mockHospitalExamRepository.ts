import { HospitalExamRepository } from '../services/contracts';
import {
  InstitucionId,
  OrdenExamenHospital,
  ResultadoExamenHospital,
  CrearOrdenExamenDTO,
  RegistrarResultadoExamenDTO,
  PruebaLaboratorioCatalogo
} from '../services/types';

const LOCAL_STORAGE_KEY_ORDENES = 'clinica_hospital_ordenes_examenes_v1';
const LOCAL_STORAGE_KEY_RESULTADOS = 'clinica_hospital_resultados_examenes_v1';

const MOCK_ORDENES_INICIALES: OrdenExamenHospital[] = [
  {
    id: 'ord-hosp-001',
    codigoLegible: 'ORD-HOSP-2026-0041',
    institucionId: 'HOSPITAL_GENERAL',
    pacienteId: 'pac-hosp-001',
    pacienteNombre: 'Roberto Estrada Morales',
    pacienteDpi: '9900-10101-0101',
    medicoSolicitanteId: 'med-01',
    medicoSolicitanteNombre: 'Dra. Elena Morales (Colegiado 8892)',
    hospitalizacionId: 'hosp-001',
    numeroCama: 'Cama 201-A',
    fechaSolicitud: '2026-04-12T08:30:00Z',
    prioridad: 'URGENTE',
    estado: 'COMPLETADA',
    diagnosticoPresuntivoCIE10: 'K80.0 - Colelitiasis con colecistitis aguda',
    motivoClinico: 'Evaluación prequirúrgica de urgencia y control glicémico.',
    items: [
      {
        id: 'item-001',
        pruebaId: 'lab-01',
        codigoPrueba: 'HEM-001',
        nombre: 'Hematología Completa Automatizada',
        seccion: 'Hematología y Coagulación',
        indicacionesMuestra: 'Sangre total con EDTA (Tubo lila)',
        estado: 'COMPLETADO',
        resultadoId: 'res-hosp-001'
      },
      {
        id: 'item-002',
        pruebaId: 'lab-02',
        codigoPrueba: 'QUI-010',
        nombre: 'Glucosa Sérica en Ayunas',
        seccion: 'Química Clínica',
        indicacionesMuestra: 'Suero libre de hemólisis (Tubo rojo/amarillo)',
        estado: 'COMPLETADO',
        resultadoId: 'res-hosp-002'
      }
    ]
  },
  {
    id: 'ord-hosp-002',
    codigoLegible: 'ORD-HOSP-2026-0042',
    institucionId: 'HOSPITAL_GENERAL',
    pacienteId: 'pac-hosp-001',
    pacienteNombre: 'Roberto Estrada Morales',
    pacienteDpi: '9900-10101-0101',
    medicoSolicitanteId: 'med-01',
    medicoSolicitanteNombre: 'Dra. Elena Morales (Colegiado 8892)',
    hospitalizacionId: 'hosp-001',
    numeroCama: 'Cama 201-A',
    fechaSolicitud: '2026-04-13T09:15:00Z',
    prioridad: 'RUTINA',
    estado: 'SOLICITADA',
    diagnosticoPresuntivoCIE10: 'E78.0 - Hipercolesterolemia pura',
    motivoClinico: 'Monitoreo de perfil lipídico por control posoperatorio mediato.',
    items: [
      {
        id: 'item-003',
        pruebaId: 'lab-03',
        codigoPrueba: 'QUI-025',
        nombre: 'Perfil Lipídico Integral',
        seccion: 'Química Clínica',
        indicacionesMuestra: 'Suero sanguíneo con ayuno 12 h',
        estado: 'PENDIENTE'
      }
    ]
  },
  {
    id: 'ord-hosp-003',
    codigoLegible: 'ORD-HOSP-2026-0043',
    institucionId: 'HOSPITAL_GENERAL',
    pacienteId: 'pac-hosp-002',
    pacienteNombre: 'María Carmen Santos',
    pacienteDpi: '8811-20202-0101',
    medicoSolicitanteId: 'med-02',
    medicoSolicitanteNombre: 'Dr. Carlos Mendoza (Colegiado 7431)',
    fechaSolicitud: '2026-04-14T07:45:00Z',
    prioridad: 'STAT',
    estado: 'EN_PROCESO',
    diagnosticoPresuntivoCIE10: 'I10 - Hipertensión esencial primaria',
    motivoClinico: 'Control urgente de química sanguínea y electrolitos.',
    items: [
      {
        id: 'item-004',
        pruebaId: 'lab-02',
        codigoPrueba: 'QUI-010',
        nombre: 'Glucosa Sérica en Ayunas',
        seccion: 'Química Clínica',
        estado: 'PENDIENTE'
      }
    ]
  }
];

const MOCK_RESULTADOS_INICIALES: ResultadoExamenHospital[] = [
  {
    id: 'res-hosp-001',
    ordenId: 'ord-hosp-001',
    codigoOrden: 'ORD-HOSP-2026-0041',
    pacienteId: 'pac-hosp-001',
    pacienteNombre: 'Roberto Estrada Morales',
    pruebaId: 'lab-01',
    nombrePrueba: 'Hematología Completa Automatizada',
    seccion: 'Hematología y Coagulación',
    metodoAnalitico: 'Citometría de Flujo e Impedancia Eléctrica',
    fechaEmision: '2026-04-12T11:00:00Z',
    responsableAnalisis: 'Licda. Sofia Morales (Química Bióloga)',
    colegiadoResponsable: 'QB-1940',
    estado: 'VALIDADO',
    interpretacionClinica: 'Recuento globular y plaquetario dentro de rangos normales de referencia. Sin signos de neutrofilia ni trombocitopenia.',
    observacionesTecnicas: 'Muestra procesada sin coágulos en analizador hematológico calibrado.',
    parametros: [
      {
        parametroId: 'p-01',
        nombre: 'Recuento de Leucocitos',
        valorMedido: '7.4',
        unidadMedida: '10^3/µL',
        rangoReferencia: '4.5 - 11.0',
        alerta: 'NORMAL'
      },
      {
        parametroId: 'p-02',
        nombre: 'Hemoglobina',
        valorMedido: '14.8',
        unidadMedida: 'g/dL',
        rangoReferencia: '12.0 - 16.5',
        alerta: 'NORMAL'
      },
      {
        parametroId: 'p-03',
        nombre: 'Hematocrito',
        valorMedido: '43.5',
        unidadMedida: '%',
        rangoReferencia: '36.0 - 48.0',
        alerta: 'NORMAL'
      },
      {
        parametroId: 'p-04',
        nombre: 'Plaquetas',
        valorMedido: '265',
        unidadMedida: '10^3/µL',
        rangoReferencia: '150 - 450',
        alerta: 'NORMAL'
      }
    ]
  },
  {
    id: 'res-hosp-002',
    ordenId: 'ord-hosp-001',
    codigoOrden: 'ORD-HOSP-2026-0041',
    pacienteId: 'pac-hosp-001',
    pacienteNombre: 'Roberto Estrada Morales',
    pruebaId: 'lab-02',
    nombrePrueba: 'Glucosa Sérica en Ayunas',
    seccion: 'Química Clínica',
    metodoAnalitico: 'Espectrofotometría Enzimática (Hexoquinasa)',
    fechaEmision: '2026-04-12T10:15:00Z',
    responsableAnalisis: 'Licda. Sofia Morales (Química Bióloga)',
    colegiadoResponsable: 'QB-1940',
    estado: 'VALIDADO',
    interpretacionClinica: 'Glucemia en ayunas con leve elevación sobre el límite de corte superior (100 mg/dL). Se recomienda correlación con HbA1c.',
    observacionesTecnicas: 'Suero sin lipemia ni hemólisis evidente.',
    parametros: [
      {
        parametroId: 'p-05',
        nombre: 'Glucosa',
        valorMedido: '118.0',
        unidadMedida: 'mg/dL',
        rangoReferencia: '70.0 - 100.0',
        alerta: 'ELEVADO'
      }
    ]
  }
];

export class MockHospitalExamRepository implements HospitalExamRepository {
  private ordenes: OrdenExamenHospital[] = [];
  private resultados: ResultadoExamenHospital[] = [];

  constructor() {
    this.cargarDeStorage();
  }

  private cargarDeStorage() {
    try {
      const ordRaw = localStorage.getItem(LOCAL_STORAGE_KEY_ORDENES);
      this.ordenes = ordRaw ? JSON.parse(ordRaw) : [...MOCK_ORDENES_INICIALES];

      const resRaw = localStorage.getItem(LOCAL_STORAGE_KEY_RESULTADOS);
      this.resultados = resRaw ? JSON.parse(resRaw) : [...MOCK_RESULTADOS_INICIALES];
    } catch {
      this.ordenes = [...MOCK_ORDENES_INICIALES];
      this.resultados = [...MOCK_RESULTADOS_INICIALES];
    }
  }

  private guardarEnStorage() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_ORDENES, JSON.stringify(this.ordenes));
      localStorage.setItem(LOCAL_STORAGE_KEY_RESULTADOS, JSON.stringify(this.resultados));
    } catch {
      // Ignorar quota errors
    }
  }

  async listarOrdenes(
    _institucionId: InstitucionId,
    filtroEstado?: string
  ): Promise<OrdenExamenHospital[]> {
    await new Promise((res) => setTimeout(res, 30));
    if (!filtroEstado || filtroEstado === 'TODAS') {
      return [...this.ordenes];
    }
    return this.ordenes.filter((o) => o.estado === filtroEstado);
  }

  async obtenerOrdenPorId(
    _institucionId: InstitucionId,
    id: string
  ): Promise<OrdenExamenHospital | null> {
    await new Promise((res) => setTimeout(res, 20));
    const orden = this.ordenes.find((o) => o.id === id);
    return orden ? { ...orden } : null;
  }

  async obtenerOrdenesPorPaciente(
    _institucionId: InstitucionId,
    pacienteId: string
  ): Promise<OrdenExamenHospital[]> {
    await new Promise((res) => setTimeout(res, 30));
    return this.ordenes.filter((o) => o.pacienteId === pacienteId);
  }

  async crearOrden(
    _institucionId: InstitucionId,
    dto: CrearOrdenExamenDTO,
    catalogoPruebas: PruebaLaboratorioCatalogo[] = []
  ): Promise<OrdenExamenHospital> {
    await new Promise((res) => setTimeout(res, 60));

    const correlativo = String(this.ordenes.length + 44).padStart(4, '0');
    const codigoLegible = `ORD-HOSP-2026-${correlativo}`;

    const items: OrdenExamenHospital['items'] = dto.pruebasIds.map((pId, idx) => {
      const prueba = catalogoPruebas.find((p) => p.id === pId);
      return {
        id: `item-${Date.now()}-${idx}`,
        pruebaId: pId,
        codigoPrueba: prueba?.codigoPrueba || `PRU-${idx + 1}`,
        nombre: prueba?.nombre || 'Examen de laboratorio',
        seccion: prueba?.seccion || 'Laboratorio Clínico',
        indicacionesMuestra: prueba?.tipoMuestra,
        estado: 'PENDIENTE'
      };
    });

    const nuevaOrden: OrdenExamenHospital = {
      id: `ord-${Date.now()}`,
      codigoLegible,
      institucionId: 'HOSPITAL_GENERAL',
      pacienteId: dto.pacienteId,
      pacienteNombre: dto.pacienteId === 'pac-hosp-001' ? 'Roberto Estrada Morales' : 'Paciente Hospitalario',
      pacienteDpi: '9900-10101-0101',
      medicoSolicitanteId: dto.medicoSolicitanteId,
      medicoSolicitanteNombre: dto.medicoSolicitanteNombre || 'Dra. Elena Morales (Colegiado 8892)',
      hospitalizacionId: dto.hospitalizacionId,
      numeroCama: dto.numeroCama,
      fechaSolicitud: new Date().toISOString(),
      prioridad: dto.prioridad,
      estado: 'SOLICITADA',
      motivoClinico: dto.motivoClinico,
      diagnosticoPresuntivoCIE10: dto.diagnosticoPresuntivoCIE10,
      items
    };

    this.ordenes.unshift(nuevaOrden);
    this.guardarEnStorage();
    return nuevaOrden;
  }

  async cancelarOrden(
    _institucionId: InstitucionId,
    ordenId: string,
    _motivo: string
  ): Promise<OrdenExamenHospital> {
    await new Promise((res) => setTimeout(res, 40));
    const orden = this.ordenes.find((o) => o.id === ordenId);
    if (!orden) throw new Error('Orden no encontrada');
    orden.estado = 'CANCELADA';
    this.guardarEnStorage();
    return orden;
  }

  async obtenerResultadosPorOrden(
    _institucionId: InstitucionId,
    ordenId: string
  ): Promise<ResultadoExamenHospital[]> {
    await new Promise((res) => setTimeout(res, 30));
    return this.resultados.filter((r) => r.ordenId === ordenId);
  }

  async obtenerResultadoPorId(
    _institucionId: InstitucionId,
    resultadoId: string
  ): Promise<ResultadoExamenHospital | null> {
    await new Promise((res) => setTimeout(res, 20));
    const r = this.resultados.find((resItem) => resItem.id === resultadoId);
    return r ? { ...r } : null;
  }

  async obtenerResultadosPorPaciente(
    _institucionId: InstitucionId,
    pacienteId: string
  ): Promise<ResultadoExamenHospital[]> {
    await new Promise((res) => setTimeout(res, 30));
    return this.resultados.filter((r) => r.pacienteId === pacienteId);
  }

  async registrarResultado(
    _institucionId: InstitucionId,
    dto: RegistrarResultadoExamenDTO,
    catalogoPruebas: PruebaLaboratorioCatalogo[] = []
  ): Promise<ResultadoExamenHospital> {
    await new Promise((res) => setTimeout(res, 60));

    const orden = this.ordenes.find((o) => o.id === dto.ordenId);
    if (!orden) throw new Error('Orden no encontrada');

    const item = orden.items.find((i) => i.pruebaId === dto.pruebaId);
    const prueba = catalogoPruebas.find((p) => p.id === dto.pruebaId);

    const resultadoId = `res-${Date.now()}`;

    const parametros = dto.parametros.map((dp) => {
      const catParam = prueba?.parametros.find((cp) => cp.parametroId === dp.parametroId);
      return {
        parametroId: dp.parametroId,
        nombre: catParam?.nombre || 'Parámetro evaluado',
        valorMedido: dp.valorMedido,
        unidadMedida: catParam?.unidadMedida || 'u',
        rangoReferencia: catParam?.rangoReferencia || 'Normal',
        alerta: dp.alerta
      };
    });

    const nuevoResultado: ResultadoExamenHospital = {
      id: resultadoId,
      ordenId: dto.ordenId,
      codigoOrden: orden.codigoLegible,
      pacienteId: orden.pacienteId,
      pacienteNombre: orden.pacienteNombre,
      pruebaId: dto.pruebaId,
      nombrePrueba: item?.nombre || prueba?.nombre || 'Prueba de laboratorio',
      seccion: item?.seccion || prueba?.seccion || 'Laboratorio Clínico',
      metodoAnalitico: prueba?.metodoAnalitico || 'Método Automatizado',
      fechaEmision: new Date().toISOString(),
      responsableAnalisis: dto.responsableAnalisis,
      colegiadoResponsable: dto.colegiadoResponsable,
      estado: 'VALIDADO',
      parametros,
      interpretacionClinica: dto.interpretacionClinica,
      observacionesTecnicas: dto.observacionesTecnicas
    };

    this.resultados.unshift(nuevoResultado);

    // Actualizar estado del item en la orden
    if (item) {
      item.estado = 'COMPLETADO';
      item.resultadoId = resultadoId;
    }

    // Si todos los items están completados, marcar orden como COMPLETADA
    const todosCompletos = orden.items.every((it) => it.estado === 'COMPLETADO');
    if (todosCompletos) {
      orden.estado = 'COMPLETADA';
    } else {
      orden.estado = 'EN_PROCESO';
    }

    this.guardarEnStorage();
    return nuevoResultado;
  }
}
