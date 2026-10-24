import { VaccineRepository } from '../services/contracts';
import {
  InstitucionId,
  AplicacionVacuna,
  RegistrarAplicacionVacunaDTO,
  CorregirAplicacionVacunaDTO,
  ItemEsquemaPaciente,
  VacunaCatalogo
} from '../services/types';
import { MockCatalogRepository } from './mockCatalogRepository';

const STORAGE_APLICACIONES_VACUNAS = 'clinica_vacunas_aplicadas_v1';

const MOCK_APLICACIONES_INICIALES: AplicacionVacuna[] = [
  // Mateo Nicolás (pac-ped-001) - BCG al nacer
  {
    id: 'app-vac-01',
    claveLogica: 'pac-ped-001_vac-01_dos-bcg-01',
    pacienteId: 'pac-ped-001',
    vacunaId: 'vac-01',
    nombreVacuna: 'BCG (Bacilo de Calmette-Guérin)',
    dosisId: 'dos-bcg-01',
    numeroDosis: 1,
    etiquetaDosis: 'Dosis única al nacer',
    fechaAplicacion: '2022-05-11',
    horaAplicacion: '09:30',
    lote: 'BCG-GT-2022-81',
    sitioAnatomico: 'Deltoides derecho',
    viaAdministracion: 'INTRADERMICA',
    profesionalAplicador: 'Enf. Patricia Gómez (Centro Pediátrico)',
    reaccionesInmediatas: 'Sin reacción adversa inmediata. Pápula eritematosa esperada.',
    observaciones: 'Vacunación neonatal institucional previa al egreso.',
    estadoRegistro: 'VIGENTE',
    versionRegistro: 1
  },
  // Mateo Nicolás (pac-ped-001) - Hepatitis B 1ra dosis neonatal
  {
    id: 'app-vac-02',
    claveLogica: 'pac-ped-001_vac-02_dos-hb-01',
    pacienteId: 'pac-ped-001',
    vacunaId: 'vac-02',
    nombreVacuna: 'Hepatitis B Pediátrica',
    dosisId: 'dos-hb-01',
    numeroDosis: 1,
    etiquetaDosis: 'Dosis neonatal primeras 24 h',
    fechaAplicacion: '2022-05-11',
    horaAplicacion: '10:00',
    lote: 'HB-PED-2022-19',
    sitioAnatomico: 'Cara anterolateral muslo izquierdo',
    viaAdministracion: 'INTRAMUSCULAR',
    profesionalAplicador: 'Dra. Carmen Morales (Pediatra)',
    reaccionesInmediatas: 'Tolerancia adecuada.',
    observaciones: 'Primera dosis de profilaxis contra transmisión vertical.',
    estadoRegistro: 'VIGENTE',
    versionRegistro: 1
  },
  // Mateo Nicolás (pac-ped-001) - Hepatitis B 2da dosis (2 meses)
  {
    id: 'app-vac-03',
    claveLogica: 'pac-ped-001_vac-02_dos-hb-02',
    pacienteId: 'pac-ped-001',
    vacunaId: 'vac-02',
    nombreVacuna: 'Hepatitis B Pediátrica',
    dosisId: 'dos-hb-02',
    numeroDosis: 2,
    etiquetaDosis: 'Segunda dosis',
    fechaAplicacion: '2022-07-15',
    horaAplicacion: '11:15',
    lote: 'HB-PED-2022-44',
    sitioAnatomico: 'Cara anterolateral muslo derecho',
    viaAdministracion: 'INTRAMUSCULAR',
    profesionalAplicador: 'Dr. Roberto Santos (Pediatra)',
    reaccionesInmediatas: 'Llanto breve, sin fiebre.',
    observaciones: 'Control de 2 meses.',
    estadoRegistro: 'VIGENTE',
    versionRegistro: 1
  },
  // Mateo Nicolás (pac-ped-001) - Hepatitis B 3ra dosis (6 meses)
  {
    id: 'app-vac-04',
    claveLogica: 'pac-ped-001_vac-02_dos-hb-03',
    pacienteId: 'pac-ped-001',
    vacunaId: 'vac-02',
    nombreVacuna: 'Hepatitis B Pediátrica',
    dosisId: 'dos-hb-03',
    numeroDosis: 3,
    etiquetaDosis: 'Tercera dosis',
    fechaAplicacion: '2022-11-20',
    horaAplicacion: '10:45',
    lote: 'HB-PED-2022-78',
    sitioAnatomico: 'Cara anterolateral muslo izquierdo',
    viaAdministracion: 'INTRAMUSCULAR',
    profesionalAplicador: 'Dra. Marcela Estrada (Pediatra)',
    reaccionesInmediatas: 'Sin complicaciones.',
    observaciones: 'Esquema primario completo de Hepatitis B.',
    estadoRegistro: 'VIGENTE',
    versionRegistro: 1
  }
];

export class MockVaccineRepository implements VaccineRepository {
  private aplicaciones: AplicacionVacuna[] = [];
  private catalogRepo = new MockCatalogRepository();

  constructor() {
    this.cargarDatos();
  }

  private cargarDatos(): void {
    try {
      const raw = localStorage.getItem(STORAGE_APLICACIONES_VACUNAS);
      if (raw) {
        this.aplicaciones = JSON.parse(raw);
        return;
      }
    } catch {
      // fallback
    }
    this.aplicaciones = JSON.parse(JSON.stringify(MOCK_APLICACIONES_INICIALES));
    this.guardarDatos();
  }

  private guardarDatos(): void {
    try {
      localStorage.setItem(STORAGE_APLICACIONES_VACUNAS, JSON.stringify(this.aplicaciones));
    } catch {
      // ignore
    }
  }

  async obtenerAplicaciones(
    _institucionId: InstitucionId,
    pacienteId: string
  ): Promise<AplicacionVacuna[]> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 30));
    return this.aplicaciones
      .filter((a) => a.pacienteId === pacienteId)
      .sort((a, b) => new Date(b.fechaAplicacion).getTime() - new Date(a.fechaAplicacion).getTime());
  }

  async obtenerEsquemaCompletoPaciente(
    institucionId: InstitucionId,
    pacienteId: string,
    edadMeses: number
  ): Promise<ItemEsquemaPaciente[]> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 40));

    const catalogoVacunas: VacunaCatalogo[] = await this.catalogRepo.obtenerVacunas(institucionId);
    const aplicacionesVigentes = this.aplicaciones.filter(
      (a) => a.pacienteId === pacienteId && a.estadoRegistro !== 'ANULADO'
    );

    const itemsEsquema: ItemEsquemaPaciente[] = [];

    for (const vac of catalogoVacunas) {
      for (const d of vac.dosis) {
        const claveLogica = `${pacienteId}_${vac.id}_${d.dosisId}`;
        const appVigente = aplicacionesVigentes.find((a) => a.claveLogica === claveLogica);

        if (appVigente) {
          itemsEsquema.push({
            vacuna: vac,
            dosisId: d.dosisId,
            numeroDosis: d.numeroDosis,
            etiquetaDosis: d.etiquetaDosis,
            edadRecomendadaMeses: d.edadRecomendadaMeses,
            estado: 'APLICADA',
            aplicacionVigente: appVigente
          });
        } else {
          if (edadMeses >= d.edadRecomendadaMeses) {
            const mesesRetraso = Math.max(0, edadMeses - d.edadRecomendadaMeses);
            itemsEsquema.push({
              vacuna: vac,
              dosisId: d.dosisId,
              numeroDosis: d.numeroDosis,
              etiquetaDosis: d.etiquetaDosis,
              edadRecomendadaMeses: d.edadRecomendadaMeses,
              estado: 'PENDIENTE',
              diasRetraso: mesesRetraso * 30
            });
          } else {
            itemsEsquema.push({
              vacuna: vac,
              dosisId: d.dosisId,
              numeroDosis: d.numeroDosis,
              etiquetaDosis: d.etiquetaDosis,
              edadRecomendadaMeses: d.edadRecomendadaMeses,
              estado: 'FUTURA'
            });
          }
        }
      }
    }

    return itemsEsquema;
  }

  async registrarAplicacion(
    institucionId: InstitucionId,
    pacienteId: string,
    dto: RegistrarAplicacionVacunaDTO,
    profesional: string
  ): Promise<AplicacionVacuna> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 50));

    const claveLogica = `${pacienteId}_${dto.vacunaId}_${dto.dosisId}`;

    // Regla CA11: Prevención determinista de doble aplicación
    const yaAplicada = this.aplicaciones.find(
      (a) => a.claveLogica === claveLogica && a.estadoRegistro === 'VIGENTE'
    );

    if (yaAplicada) {
      throw new Error(
        `Esta dosis ya se registró el ${yaAplicada.fechaAplicacion.split('-').reverse().join('/')} (lote ${yaAplicada.lote}). Revisa el historial de aplicaciones.`
      );
    }

    const catalogoVacunas = await this.catalogRepo.obtenerVacunas(institucionId);
    const vacuna = catalogoVacunas.find((v) => v.id === dto.vacunaId);
    if (!vacuna) throw new Error('No se encontró la vacuna. Actualiza la vista e inténtalo de nuevo.');

    const dosis = vacuna.dosis.find((d) => d.dosisId === dto.dosisId);
    if (!dosis) throw new Error(`Dosis ${dto.dosisId} no encontrada para la vacuna ${vacuna.nombreVacuna}.`);

    const nuevaAplicacion: AplicacionVacuna = {
      id: `app-vac-${Date.now()}`,
      claveLogica,
      pacienteId,
      vacunaId: dto.vacunaId,
      nombreVacuna: vacuna.nombreVacuna,
      dosisId: dto.dosisId,
      numeroDosis: dosis.numeroDosis,
      etiquetaDosis: dosis.etiquetaDosis,
      fechaAplicacion: dto.fechaAplicacion,
      horaAplicacion: dto.horaAplicacion || new Date().toTimeString().slice(0, 5),
      lote: dto.lote.trim().toUpperCase(),
      sitioAnatomico: dto.sitioAnatomico,
      viaAdministracion: vacuna.viaAdministracion,
      profesionalAplicador: profesional,
      reaccionesInmediatas: dto.reaccionesInmediatas?.trim(),
      observaciones: dto.observaciones?.trim(),
      estadoRegistro: 'VIGENTE',
      versionRegistro: 1
    };

    this.aplicaciones.unshift(nuevaAplicacion);
    this.guardarDatos();
    return nuevaAplicacion;
  }

  async corregirAplicacion(
    _institucionId: InstitucionId,
    aplicacionId: string,
    dto: CorregirAplicacionVacunaDTO,
    profesional: string
  ): Promise<AplicacionVacuna> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 50));

    const index = this.aplicaciones.findIndex((a) => a.id === aplicacionId);
    if (index === -1) throw new Error('No se encontró la aplicación de vacuna. Actualiza la vista e inténtalo de nuevo.');

    const actual = this.aplicaciones[index];
    const copiaAnterior: Partial<AplicacionVacuna> = {
      lote: actual.lote,
      sitioAnatomico: actual.sitioAnatomico,
      reaccionesInmediatas: actual.reaccionesInmediatas,
      observaciones: actual.observaciones,
      profesionalAplicador: actual.profesionalAplicador
    };

    const historial = actual.historialRevisiones ? [...actual.historialRevisiones] : [];
    historial.push({
      version: actual.versionRegistro,
      fecha: new Date().toISOString(),
      actor: profesional,
      motivo: dto.motivo,
      datosAnteriores: copiaAnterior
    });

    const corregida: AplicacionVacuna = {
      ...actual,
      lote: dto.lote ? dto.lote.trim().toUpperCase() : actual.lote,
      sitioAnatomico: dto.sitioAnatomico || actual.sitioAnatomico,
      reaccionesInmediatas: dto.reaccionesInmediatas !== undefined ? dto.reaccionesInmediatas : actual.reaccionesInmediatas,
      observaciones: dto.observaciones !== undefined ? dto.observaciones : actual.observaciones,
      estadoRegistro: 'CORREGIDO',
      versionRegistro: actual.versionRegistro + 1,
      motivoCorreccion: dto.motivo,
      historialRevisiones: historial
    };

    this.aplicaciones[index] = corregida;
    this.guardarDatos();
    return corregida;
  }

  async anularAplicacion(
    _institucionId: InstitucionId,
    aplicacionId: string,
    motivo: string,
    profesional: string
  ): Promise<AplicacionVacuna> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 50));

    const index = this.aplicaciones.findIndex((a) => a.id === aplicacionId);
    if (index === -1) throw new Error('No se encontró la aplicación de vacuna. Actualiza la vista e inténtalo de nuevo.');

    const actual = this.aplicaciones[index];
    const historial = actual.historialRevisiones ? [...actual.historialRevisiones] : [];
    historial.push({
      version: actual.versionRegistro,
      fecha: new Date().toISOString(),
      actor: profesional,
      motivo: `Anulación: ${motivo}`,
      datosAnteriores: { ...actual }
    });

    const anulada: AplicacionVacuna = {
      ...actual,
      estadoRegistro: 'ANULADO',
      versionRegistro: actual.versionRegistro + 1,
      motivoCorreccion: motivo,
      historialRevisiones: historial
    };

    this.aplicaciones[index] = anulada;
    this.guardarDatos();
    return anulada;
  }
}
