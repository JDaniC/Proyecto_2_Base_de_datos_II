import { CatalogRepository } from '../services/contracts';
import {
  InstitucionId,
  MedicoCatalogo,
  AseguradoraCatalogo,
  ProcedimientoOdontologico,
  PruebaLaboratorioCatalogo,
  VacunaCatalogo
} from '../services/types';

const STORAGE_MEDICOS = 'clinica_catalog_medicos_v1';
const STORAGE_ASEGURADORAS = 'clinica_catalog_aseguradoras_v1';
const STORAGE_ODONTO = 'clinica_catalog_odonto_v1';
const STORAGE_LAB = 'clinica_catalog_lab_v1';
const STORAGE_VACUNAS = 'clinica_catalog_vacunas_v1';

export class MockCatalogRepository implements CatalogRepository {
  private medicos: MedicoCatalogo[] = [];
  private aseguradoras: AseguradoraCatalogo[] = [];
  private procedimientosOdonto: ProcedimientoOdontologico[] = [];
  private pruebasLab: PruebaLaboratorioCatalogo[] = [];
  private vacunas: VacunaCatalogo[] = [];

  constructor() {
    this.cargarDatos();
  }

  private cargarDatos(): void {
    try {
      const rawM = localStorage.getItem(STORAGE_MEDICOS);
      if (rawM) this.medicos = JSON.parse(rawM);
      const rawA = localStorage.getItem(STORAGE_ASEGURADORAS);
      if (rawA) this.aseguradoras = JSON.parse(rawA);
      const rawO = localStorage.getItem(STORAGE_ODONTO);
      if (rawO) this.procedimientosOdonto = JSON.parse(rawO);
      const rawL = localStorage.getItem(STORAGE_LAB);
      if (rawL) this.pruebasLab = JSON.parse(rawL);
      const rawV = localStorage.getItem(STORAGE_VACUNAS);
      if (rawV) this.vacunas = JSON.parse(rawV);
    } catch {
      // fallback
    }

    if (this.medicos.length === 0) {
      this.medicos = [
        {
          id: 'med-01',
          nombre: 'Dra. Elena Morales',
          colegiado: 'CMG-10421',
          especialidadPrincipal: 'Medicina Interna',
          especialidadesSecundarias: ['Cuidados Intensivos'],
          email: 'elena.morales@hospital-general.salud.gt',
          telefono: '+502 2345-6701',
          estado: 'ACTIVO'
        },
        {
          id: 'med-02',
          nombre: 'Dr. Alejandro Soto Gómez',
          colegiado: 'CMG-14209',
          especialidadPrincipal: 'Medicina General',
          especialidadesSecundarias: ['Urgencias Médicas'],
          email: 'alejandro.soto@hospital-general.salud.gt',
          telefono: '+502 2345-6702',
          estado: 'ACTIVO'
        },
        {
          id: 'med-03',
          nombre: 'Dr. Sergio Valladares',
          colegiado: 'CMG-08910',
          especialidadPrincipal: 'Cirugía General',
          especialidadesSecundarias: ['Laparoscopía'],
          email: 'sergio.valladares@hospital-general.salud.gt',
          telefono: '+502 2345-6703',
          estado: 'ACTIVO'
        },
        {
          id: 'med-04',
          nombre: 'Dra. Sofía Estrada Méndez',
          colegiado: 'CMG-12093',
          especialidadPrincipal: 'Cardiología Clínica',
          especialidadesSecundarias: ['Ecocardiografía'],
          email: 'sofia.estrada@hospital-general.salud.gt',
          telefono: '+502 2345-6704',
          estado: 'INACTIVO'
        }
      ];
    }

    if (this.aseguradoras.length === 0) {
      this.aseguradoras = [
        {
          id: 'aseg-01',
          nombre: 'Seguros El Roble, S.A.',
          codigoAseguradora: 'ASEG-ROBLE',
          telefonoAutorizaciones: '+502 2420-3333',
          estado: 'ACTIVO',
          planes: [
            { id: 'pln-01', nombrePlan: 'Plan Roble Oro Hospitalario', porcentajeCobertura: 90, deducibleBaseGTQ: 500, activo: true },
            { id: 'pln-02', nombrePlan: 'Plan Roble Clásico Integral', porcentajeCobertura: 80, deducibleBaseGTQ: 1000, activo: true }
          ]
        },
        {
          id: 'aseg-02',
          nombre: 'Aseguradora General, S.A.',
          codigoAseguradora: 'ASEG-GENERAL',
          telefonoAutorizaciones: '+502 2384-5555',
          estado: 'ACTIVO',
          planes: [
            { id: 'pln-03', nombrePlan: 'Plan Médico Familiar', porcentajeCobertura: 75, deducibleBaseGTQ: 1200, activo: true },
            { id: 'pln-04', nombrePlan: 'Plan Ejecutivo Platino', porcentajeCobertura: 85, deducibleBaseGTQ: 800, activo: true }
          ]
        },
        {
          id: 'aseg-03',
          nombre: 'Seguros G&T Continental',
          codigoAseguradora: 'ASEG-GYT',
          telefonoAutorizaciones: '+502 2338-6000',
          estado: 'ACTIVO',
          planes: [
            { id: 'pln-05', nombrePlan: 'Total Salud Preferente', porcentajeCobertura: 85, deducibleBaseGTQ: 750, activo: true }
          ]
        }
      ];
    }

    if (this.procedimientosOdonto.length === 0) {
      this.procedimientosOdonto = [
        {
          id: 'proc-01',
          codigo: 'ODON-01',
          nombre: 'Profilaxis Ultrassónica y Aplicación de Flúor',
          categoria: 'PREVENTIVA',
          duracionEstimadaMin: 30,
          arancelReferencialGTQ: 250,
          estado: 'ACTIVO'
        },
        {
          id: 'proc-02',
          codigo: 'ODON-02',
          nombre: 'Restauración Estética con Resina Fotocurable',
          categoria: 'RESTAURADORA',
          duracionEstimadaMin: 45,
          arancelReferencialGTQ: 350,
          estado: 'ACTIVO'
        },
        {
          id: 'proc-03',
          codigo: 'ODON-03',
          nombre: 'Tratamiento de Conductos Radiculares (Endodoncia Unirradicular)',
          categoria: 'ENDODONCIA',
          duracionEstimadaMin: 60,
          arancelReferencialGTQ: 1200,
          estado: 'ACTIVO'
        },
        {
          id: 'proc-04',
          codigo: 'ODON-04',
          nombre: 'Exodoncia Simple de Pieza Permanente',
          categoria: 'CIRUGIA',
          duracionEstimadaMin: 40,
          arancelReferencialGTQ: 400,
          estado: 'ACTIVO'
        },
        {
          id: 'proc-05',
          codigo: 'ODON-05',
          nombre: 'Raspado y Alisado Radicular por Cuadrante',
          categoria: 'PERIODONCIA',
          duracionEstimadaMin: 45,
          arancelReferencialGTQ: 500,
          estado: 'ACTIVO'
        }
      ];
    }

    if (this.pruebasLab.length === 0) {
      this.pruebasLab = [
        {
          id: 'lab-01',
          codigoPrueba: 'HEM-001',
          nombre: 'Hematología Completa Automatizada',
          seccion: 'Hematología y Coagulación',
          tipoMuestra: 'Sangre total con EDTA (Tubo lila)',
          metodoAnalitico: 'Citometría de Flujo e Impedancia Eléctrica',
          version: 2,
          tiempoEntregaHoras: 2,
          estado: 'ACTIVO',
          parametros: [
            { parametroId: 'p-01', nombre: 'Recuento de Leucocitos', unidadMedida: '10^3/µL', rangoReferencia: '4.5 - 11.0' },
            { parametroId: 'p-02', nombre: 'Hemoglobina', unidadMedida: 'g/dL', rangoReferencia: '12.0 - 16.5' },
            { parametroId: 'p-03', nombre: 'Hematocrito', unidadMedida: '%', rangoReferencia: '36.0 - 48.0' },
            { parametroId: 'p-04', nombre: 'Plaquetas', unidadMedida: '10^3/µL', rangoReferencia: '150 - 450' }
          ]
        },
        {
          id: 'lab-02',
          codigoPrueba: 'QUI-010',
          nombre: 'Glucosa Sérica en Ayunas',
          seccion: 'Química Clínica',
          tipoMuestra: 'Suero libre de hemólisis (Tubo rojo/amarillo)',
          metodoAnalitico: 'Espectrofotometría Enzimática (Hexoquinasa)',
          version: 1,
          tiempoEntregaHoras: 1,
          estado: 'ACTIVO',
          parametros: [
            { parametroId: 'p-05', nombre: 'Glucosa', unidadMedida: 'mg/dL', rangoReferencia: '70.0 - 100.0' }
          ]
        },
        {
          id: 'lab-03',
          codigoPrueba: 'QUI-025',
          nombre: 'Perfil Lipídico Integral',
          seccion: 'Química Clínica',
          tipoMuestra: 'Suero sanguíneo con ayuno 12 h',
          metodoAnalitico: 'Colorimetría Enzimática Automatizada',
          version: 1,
          tiempoEntregaHoras: 3,
          estado: 'ACTIVO',
          parametros: [
            { parametroId: 'p-06', nombre: 'Colesterol Total', unidadMedida: 'mg/dL', rangoReferencia: '< 200' },
            { parametroId: 'p-07', nombre: 'Triglicéridos', unidadMedida: 'mg/dL', rangoReferencia: '< 150' },
            { parametroId: 'p-08', nombre: 'Colesterol HDL', unidadMedida: 'mg/dL', rangoReferencia: '> 40 (H) / > 50 (M)' },
            { parametroId: 'p-09', nombre: 'Colesterol LDL', unidadMedida: 'mg/dL', rangoReferencia: '< 100' }
          ]
        }
      ];
    }

    if (this.vacunas.length === 0) {
      this.vacunas = [
        {
          id: 'vac-01',
          nombreVacuna: 'BCG (Bacilo de Calmette-Guérin)',
          enfermedadPrevenida: 'Formas graves de Tuberculosis (meníngea y miliar)',
          viaAdministracion: 'INTRADERMICA',
          esquemaVersion: 'Esquema Nacional MSPAS v2.1',
          estado: 'ACTIVO',
          dosis: [
            { dosisId: 'dos-bcg-01', numeroDosis: 1, etiquetaDosis: 'Dosis única al nacer', edadRecomendadaMeses: 0 }
          ]
        },
        {
          id: 'vac-02',
          nombreVacuna: 'Hepatitis B Pediátrica',
          enfermedadPrevenida: 'Hepatitis B y transmisión vertical perinatal',
          viaAdministracion: 'INTRAMUSCULAR',
          esquemaVersion: 'Esquema Nacional MSPAS v2.1',
          estado: 'ACTIVO',
          dosis: [
            { dosisId: 'dos-hb-01', numeroDosis: 1, etiquetaDosis: 'Dosis neonatal primeras 24 h', edadRecomendadaMeses: 0 },
            { dosisId: 'dos-hb-02', numeroDosis: 2, etiquetaDosis: 'Segunda dosis', edadRecomendadaMeses: 2, intervaloMinimoSemanas: 4 },
            { dosisId: 'dos-hb-03', numeroDosis: 3, etiquetaDosis: 'Tercera dosis', edadRecomendadaMeses: 6, intervaloMinimoSemanas: 8 }
          ]
        },
        {
          id: 'vac-03',
          nombreVacuna: 'Pentavalente (DPT + HB + Hib)',
          enfermedadPrevenida: 'Difteria, Tétanos, Tos Ferina, Hepatitis B, H. Influenzae b',
          viaAdministracion: 'INTRAMUSCULAR',
          esquemaVersion: 'Esquema Nacional MSPAS v2.1',
          estado: 'ACTIVO',
          dosis: [
            { dosisId: 'dos-penta-01', numeroDosis: 1, etiquetaDosis: 'Primera dosis', edadRecomendadaMeses: 2 },
            { dosisId: 'dos-penta-02', numeroDosis: 2, etiquetaDosis: 'Segunda dosis', edadRecomendadaMeses: 4, intervaloMinimoSemanas: 8 },
            { dosisId: 'dos-penta-03', numeroDosis: 3, etiquetaDosis: 'Tercera dosis', edadRecomendadaMeses: 6, intervaloMinimoSemanas: 8 }
          ]
        },
        {
          id: 'vac-04',
          nombreVacuna: 'SPR (Sarampión, Paperas y Rubéola)',
          enfermedadPrevenida: 'Sarampión, Parotiditis y Rubéola',
          viaAdministracion: 'SUBCUTANEA',
          esquemaVersion: 'Esquema Nacional MSPAS v2.1',
          estado: 'ACTIVO',
          dosis: [
            { dosisId: 'dos-spr-01', numeroDosis: 1, etiquetaDosis: 'Primera dosis (12 meses)', edadRecomendadaMeses: 12 },
            { dosisId: 'dos-spr-02', numeroDosis: 2, etiquetaDosis: 'Refuerzo (18 meses)', edadRecomendadaMeses: 18, intervaloMinimoSemanas: 24 }
          ]
        }
      ];
    }
  }

  private guardarDatos(): void {
    try {
      localStorage.setItem(STORAGE_MEDICOS, JSON.stringify(this.medicos));
      localStorage.setItem(STORAGE_ASEGURADORAS, JSON.stringify(this.aseguradoras));
      localStorage.setItem(STORAGE_ODONTO, JSON.stringify(this.procedimientosOdonto));
      localStorage.setItem(STORAGE_LAB, JSON.stringify(this.pruebasLab));
      localStorage.setItem(STORAGE_VACUNAS, JSON.stringify(this.vacunas));
    } catch {
      // ignore
    }
  }

  async obtenerMedicos(_institucionId: InstitucionId): Promise<MedicoCatalogo[]> {
    await new Promise((res) => setTimeout(res, 30));
    return [...this.medicos];
  }

  async crearMedico(_institucionId: InstitucionId, medico: Omit<MedicoCatalogo, 'id'>): Promise<MedicoCatalogo> {
    await new Promise((res) => setTimeout(res, 50));
    const existe = this.medicos.find((m) => m.colegiado.toUpperCase() === medico.colegiado.toUpperCase());
    if (existe) {
      throw new Error(`El número de colegiado ${medico.colegiado} ya está registrado para ${existe.nombre}.`);
    }

    const nuevo: MedicoCatalogo = {
      ...medico,
      id: `med-${Date.now()}`
    };
    this.medicos.unshift(nuevo);
    this.guardarDatos();
    return nuevo;
  }

  async cambiarEstadoMedico(_institucionId: InstitucionId, id: string, estado: 'ACTIVO' | 'INACTIVO'): Promise<MedicoCatalogo> {
    await new Promise((res) => setTimeout(res, 40));
    const idx = this.medicos.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('Médico no encontrado');
    this.medicos[idx] = { ...this.medicos[idx], estado };
    this.guardarDatos();
    return this.medicos[idx];
  }

  async obtenerAseguradoras(_institucionId: InstitucionId): Promise<AseguradoraCatalogo[]> {
    await new Promise((res) => setTimeout(res, 30));
    return [...this.aseguradoras];
  }

  async obtenerProcedimientosOdontologicos(_institucionId: InstitucionId): Promise<ProcedimientoOdontologico[]> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 30));
    return [...this.procedimientosOdonto];
  }

  async crearProcedimientoOdontologico(
    _institucionId: InstitucionId,
    proc: Omit<ProcedimientoOdontologico, 'id'>
  ): Promise<ProcedimientoOdontologico> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 40));
    const nuevo: ProcedimientoOdontologico = {
      ...proc,
      id: `proc-odon-${Date.now()}`
    };
    this.procedimientosOdonto.push(nuevo);
    this.guardarDatos();
    return nuevo;
  }

  async obtenerPruebasLaboratorio(_institucionId: InstitucionId): Promise<PruebaLaboratorioCatalogo[]> {
    await new Promise((res) => setTimeout(res, 30));
    return [...this.pruebasLab];
  }

  async crearPruebaLaboratorio(_institucionId: InstitucionId, prueba: Omit<PruebaLaboratorioCatalogo, 'id' | 'version'>): Promise<PruebaLaboratorioCatalogo> {
    await new Promise((res) => setTimeout(res, 40));
    const nueva: PruebaLaboratorioCatalogo = {
      ...prueba,
      id: `lab-${Date.now()}`,
      version: 1
    };
    this.pruebasLab.push(nueva);
    this.guardarDatos();
    return nueva;
  }

  async crearNuevaVersionPruebaLaboratorio(
    _institucionId: InstitucionId,
    pruebaId: string,
    cambios: Partial<Omit<PruebaLaboratorioCatalogo, 'id' | 'version'>>,
    _motivoCambio: string
  ): Promise<PruebaLaboratorioCatalogo> {
    await new Promise((res) => setTimeout(res, 50));
    const index = this.pruebasLab.findIndex((p) => p.id === pruebaId);
    if (index === -1) {
      throw new Error(`Prueba de laboratorio ${pruebaId} no encontrada.`);
    }

    const anterior = this.pruebasLab[index];
    const nuevaVersion: PruebaLaboratorioCatalogo = {
      ...anterior,
      ...cambios,
      version: anterior.version + 1
    };

    this.pruebasLab[index] = nuevaVersion;
    this.guardarDatos();
    return nuevaVersion;
  }

  async cambiarEstadoPruebaLaboratorio(
    _institucionId: InstitucionId,
    pruebaId: string,
    estado: 'ACTIVO' | 'INACTIVO'
  ): Promise<PruebaLaboratorioCatalogo> {
    await new Promise((res) => setTimeout(res, 30));
    const index = this.pruebasLab.findIndex((p) => p.id === pruebaId);
    if (index === -1) {
      throw new Error(`Prueba de laboratorio ${pruebaId} no encontrada.`);
    }

    this.pruebasLab[index] = {
      ...this.pruebasLab[index],
      estado
    };
    this.guardarDatos();
    return this.pruebasLab[index];
  }

  async obtenerVacunas(_institucionId: InstitucionId): Promise<VacunaCatalogo[]> {
    await new Promise((res) => setTimeout(res, 30));
    return [...this.vacunas];
  }

  async crearVacuna(
    _institucionId: InstitucionId,
    vacuna: Omit<VacunaCatalogo, 'id'>
  ): Promise<VacunaCatalogo> {
    await new Promise((res) => setTimeout(res, 50));
    const nueva: VacunaCatalogo = {
      ...vacuna,
      id: `vac-${Date.now()}`
    };
    this.vacunas.unshift(nueva);
    this.guardarDatos();
    return nueva;
  }

  async crearVersionEsquemaVacuna(
    _institucionId: InstitucionId,
    vacunaId: string,
    nuevaVersion: string,
    dosis: VacunaCatalogo['dosis']
  ): Promise<VacunaCatalogo> {
    await new Promise((res) => setTimeout(res, 50));
    const index = this.vacunas.findIndex((v) => v.id === vacunaId);
    if (index === -1) throw new Error(`Vacuna ${vacunaId} no encontrada.`);

    this.vacunas[index] = {
      ...this.vacunas[index],
      esquemaVersion: nuevaVersion,
      dosis: [...dosis]
    };
    this.guardarDatos();
    return this.vacunas[index];
  }
}
