import { ConsultationRepository } from '../services/contracts';
import {
  InstitucionId,
  RegistroConsultaCompletaDTO,
  DetalleConsultaCompleta,
  DiagnosticoHistorial,
  RecetaHistorial
} from '../services/types';
import {
  MOCK_CONSULTAS_DEFECTO,
  MOCK_DIAGNOSTICOS_DEFECTO,
  MOCK_RECETAS_DEFECTO,
  MOCK_EVENTOS_TIMELINE_DEFECTO
} from './mockClinicalData';

const LOCAL_STORAGE_KEY_CONSULTAS = 'clinica_consultas_completas_dataset_v1';
const LOCAL_STORAGE_KEY_CITAS = 'clinica_citas_dataset_v1';

export class MockConsultationRepository implements ConsultationRepository {
  private consultas: DetalleConsultaCompleta[] = [];

  constructor() {
    this.cargarConsultas();
  }

  private cargarConsultas(): void {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_CONSULTAS);
      if (raw) {
        this.consultas = JSON.parse(raw);
        return;
      }
    } catch {
      // Fallback
    }

    // Inicializar a partir de mockClinicalData
    const iniciales: DetalleConsultaCompleta[] = [
      {
        id: 'con-0104-1',
        institucionId: 'HOSPITAL_GENERAL',
        pacienteId: 'pac-hosp-001',
        fechaHora: '2026-10-18T09:30:00Z',
        motivo: 'Evaluación y control de hipertensión arterial y cifras glucémicas',
        sintomas: 'Paciente refiere leve mareo ocasional matutino, sin escotomas ni tinnitus.',
        observaciones: 'Adecuada adherencia terapéutica. Sin edemas en miembros inferiores.',
        profesionalNombre: 'Dra. Elena Morales',
        profesionalRol: 'Médico Especialista en Medicina Interna',
        estado: 'FINALIZADA',
        signosVitales: {
          pesoKg: 78.5,
          tallaCm: 172,
          temperaturaC: 36.6,
          presionSistolica: 135,
          presionDiastolica: 85,
          frecuenciaCardiacaLpm: 72,
          frecuenciaRespiratoriaRpm: 16,
          saturacionOxigenoPct: 98,
          perimetroCefalicoCm: null
        },
        diagnosticos: [
          {
            id: 'dx-0104-1',
            codigoCIE: 'I10',
            nombre: 'Hipertensión esencial (primaria)',
            esPrincipal: true,
            fechaRegistro: '2026-10-18',
            registradoPor: 'Dra. Elena Morales'
          }
        ],
        tratamientos: [
          {
            descripcion: 'Mantener dieta DASH hiposódica y ejercicio aeróbico 30 min diarios',
            indicaciones: 'Caminar a paso ligero 5 veces por semana.'
          }
        ],
        receta: {
          id: 'rec-0104-1',
          codigoReceta: 'REC-2026-0419',
          fechaEmision: '2026-10-18T09:45:00Z',
          emitidaPor: 'Dra. Elena Morales',
          rolEmisor: 'Médico Especialista (Col. CMG-10421)',
          estado: 'EMITIDA',
          medicamentos: [
            {
              nombre: 'Losartán Potásico',
              presentacion: 'Comprimido recubierto',
              dosis: '50 mg',
              frecuencia: 'Cada 12 horas',
              duracion: '90 días',
              via: 'Oral',
              indicaciones: 'Tomar por la mañana y noche con agua.'
            }
          ]
        },
        revision: 1,
        historialRevisiones: []
      }
    ];

    this.consultas = iniciales;
    this.guardarEnStorage();
  }

  private guardarEnStorage(): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_CONSULTAS, JSON.stringify(this.consultas));
    } catch {
      // Ignorar quota
    }
  }

  async registrarConsultaCompleta(
    institucionId: InstitucionId,
    dto: RegistroConsultaCompletaDTO,
    profesional: { nombre: string; rol: string }
  ): Promise<DetalleConsultaCompleta> {
    await new Promise((res) => setTimeout(res, 60));

    // Validar motivo
    if (!dto.motivo || dto.motivo.trim().length < 4) {
      throw new Error('El motivo de la consulta es obligatorio (mínimo 4 caracteres).');
    }

    // Validar diagnósticos: si hay diagnósticos, exactamente uno debe ser principal
    if (dto.diagnosticos && dto.diagnosticos.length > 0) {
      const principales = dto.diagnosticos.filter((d) => d.esPrincipal);
      if (principales.length !== 1) {
        throw new Error('Debe marcar exactamente un diagnóstico como principal.');
      }
    }

    const consultaId = `con-${Date.now()}`;
    const fechaHoraActual = new Date().toISOString();

    const diagnosticosHistorial: DiagnosticoHistorial[] = (dto.diagnosticos || []).map((d, index) => ({
      id: `dx-${Date.now()}-${index}`,
      codigoCIE: d.codigoCIE,
      nombre: d.nombre,
      esPrincipal: d.esPrincipal,
      fechaRegistro: fechaHoraActual.split('T')[0],
      registradoPor: profesional.nombre
    }));

    let recetaHistorial: RecetaHistorial | undefined = undefined;
    if (dto.receta && dto.receta.medicamentos && dto.receta.medicamentos.length > 0) {
      recetaHistorial = {
        id: `rec-${Date.now()}`,
        codigoReceta: `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        fechaEmision: fechaHoraActual,
        emitidaPor: profesional.nombre,
        rolEmisor: profesional.rol,
        estado: 'EMITIDA',
        medicamentos: dto.receta.medicamentos.map((m) => ({
          nombre: m.nombre,
          presentacion: m.presentacion,
          dosis: `${m.dosis} ${m.unidad}`.trim(),
          frecuencia: m.frecuencia,
          duracion: m.duracion,
          via: m.via,
          indicaciones: m.indicaciones
        }))
      };
    }

    const nuevaConsulta: DetalleConsultaCompleta = {
      id: consultaId,
      institucionId,
      pacienteId: dto.pacienteId,
      citaId: dto.citaId,
      fechaHora: fechaHoraActual,
      motivo: dto.motivo.trim(),
      sintomas: dto.sintomas?.trim() || '',
      observaciones: dto.observaciones?.trim() || '',
      profesionalNombre: profesional.nombre,
      profesionalRol: profesional.rol,
      estado: 'FINALIZADA',
      signosVitales: dto.signosVitales,
      diagnosticos: diagnosticosHistorial,
      tratamientos: dto.tratamientos || [],
      receta: recetaHistorial,
      revision: 1,
      historialRevisiones: []
    };

    this.consultas.push(nuevaConsulta);
    this.guardarEnStorage();

    // Si había cita vinculada, actualizarla a ATENDIDA (DEC-04)
    if (dto.citaId) {
      try {
        const rawCitas = localStorage.getItem(LOCAL_STORAGE_KEY_CITAS);
        if (rawCitas) {
          const citas = JSON.parse(rawCitas);
          const idx = citas.findIndex((c: any) => c.id === dto.citaId);
          if (idx !== -1) {
            citas[idx].estado = 'ATENDIDA';
            localStorage.setItem(LOCAL_STORAGE_KEY_CITAS, JSON.stringify(citas));
          }
        }
      } catch {
        // Fallback
      }
    }

    // Actualizar historial y consultas en mockClinicalData si aplica en memoria
    if (!MOCK_CONSULTAS_DEFECTO[dto.pacienteId]) {
      MOCK_CONSULTAS_DEFECTO[dto.pacienteId] = [];
    }
    const diagnosticoPrincipal = diagnosticosHistorial.find((d) => d.esPrincipal);
    MOCK_CONSULTAS_DEFECTO[dto.pacienteId].unshift({
      id: consultaId,
      fechaHora: fechaHoraActual,
      motivo: dto.motivo.trim(),
      sintomas: dto.sintomas?.trim() || '',
      profesionalNombre: profesional.nombre,
      profesionalRol: profesional.rol,
      diagnosticoPrincipal: diagnosticoPrincipal
        ? `${diagnosticoPrincipal.codigoCIE} ${diagnosticoPrincipal.nombre}`
        : 'Evaluación clínica general',
      estado: 'FINALIZADA',
      signosVitales: dto.signosVitales
    });

    if (recetaHistorial) {
      if (!MOCK_RECETAS_DEFECTO[dto.pacienteId]) {
        MOCK_RECETAS_DEFECTO[dto.pacienteId] = [];
      }
      MOCK_RECETAS_DEFECTO[dto.pacienteId].unshift(recetaHistorial);
    }

    if (!MOCK_EVENTOS_TIMELINE_DEFECTO[dto.pacienteId]) {
      MOCK_EVENTOS_TIMELINE_DEFECTO[dto.pacienteId] = [];
    }
    MOCK_EVENTOS_TIMELINE_DEFECTO[dto.pacienteId].unshift({
      id: `evt-${Date.now()}`,
      fechaHora: fechaHoraActual,
      tipoEvento: 'CONSULTA',
      titulo: 'Consulta clínica registrada',
      descripcion: dto.motivo.trim(),
      profesional: profesional.nombre,
      rolProfesional: profesional.rol,
      recursoCodigo: `CON-${consultaId.slice(-4)}`
    });

    return nuevaConsulta;
  }

  async obtenerPorId(
    institucionId: InstitucionId,
    pacienteId: string,
    consultaId: string
  ): Promise<DetalleConsultaCompleta | null> {
    await new Promise((res) => setTimeout(res, 40));
    let consulta = this.consultas.find(
      (c) =>
        c.id === consultaId &&
        c.pacienteId === pacienteId &&
        c.institucionId === institucionId
    );

    if (!consulta) {
      const listaDefecto = MOCK_CONSULTAS_DEFECTO[pacienteId] || [];
      const encontrada = listaDefecto.find((c) => c.id === consultaId);
      if (encontrada) {
        const dxs = MOCK_DIAGNOSTICOS_DEFECTO[pacienteId] || [];
        const recs = MOCK_RECETAS_DEFECTO[pacienteId] || [];
        consulta = {
          id: encontrada.id,
          institucionId,
          pacienteId,
          fechaHora: encontrada.fechaHora,
          motivo: encontrada.motivo,
          sintomas: encontrada.sintomas,
          observaciones: 'Evolución satisfactoria según pauta médica institucional.',
          profesionalNombre: encontrada.profesionalNombre,
          profesionalRol: encontrada.profesionalRol,
          estado: encontrada.estado,
          signosVitales: encontrada.signosVitales || {
            pesoKg: 78.0,
            tallaCm: 172,
            temperaturaC: 36.6,
            presionSistolica: 130,
            presionDiastolica: 85,
            frecuenciaCardiacaLpm: 72,
            frecuenciaRespiratoriaRpm: 16,
            saturacionOxigenoPct: 98,
            perimetroCefalicoCm: null
          },
          diagnosticos: dxs,
          tratamientos: [
            {
              descripcion: 'Control y seguimiento médico habitual',
              indicaciones: 'Mantener pauta farmacológica indicada.'
            }
          ],
          receta: recs[0],
          revision: 1,
          historialRevisiones: []
        };
        this.consultas.push(consulta);
        this.guardarEnStorage();
      }
    }

    return consulta || null;
  }

  async actualizarConsultaFinalizada(
    institucionId: InstitucionId,
    pacienteId: string,
    consultaId: string,
    cambios: Partial<RegistroConsultaCompletaDTO>,
    motivoCorreccion: string,
    autor: string
  ): Promise<DetalleConsultaCompleta> {
    await new Promise((res) => setTimeout(res, 50));
    const index = this.consultas.findIndex(
      (c) =>
        c.id === consultaId &&
        c.pacienteId === pacienteId &&
        c.institucionId === institucionId
    );
    if (index === -1) {
      throw new Error(`Consulta ${consultaId} no encontrada.`);
    }

    if (!motivoCorreccion || motivoCorreccion.trim().length < 5) {
      throw new Error('El motivo de la corrección es obligatorio (mínimo 5 caracteres).');
    }

    const actual = this.consultas[index];
    const nuevaRevision = (actual.revision || 1) + 1;

    const registroRevision = {
      revision: nuevaRevision,
      fechaHora: new Date().toISOString(),
      autor,
      motivo: motivoCorreccion.trim()
    };

    const actualizada: DetalleConsultaCompleta = {
      ...actual,
      motivo: cambios.motivo !== undefined ? cambios.motivo.trim() : actual.motivo,
      sintomas: cambios.sintomas !== undefined ? cambios.sintomas.trim() : actual.sintomas,
      observaciones:
        cambios.observaciones !== undefined ? cambios.observaciones.trim() : actual.observaciones,
      signosVitales: cambios.signosVitales ? { ...actual.signosVitales, ...cambios.signosVitales } : actual.signosVitales,
      revision: nuevaRevision,
      historialRevisiones: [...(actual.historialRevisiones || []), registroRevision]
    };

    this.consultas[index] = actualizada;
    this.guardarEnStorage();
    return actualizada;
  }
}
