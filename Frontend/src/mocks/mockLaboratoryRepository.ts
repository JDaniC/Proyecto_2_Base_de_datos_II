import { LaboratoryRepository } from '../services/contracts';
import {
  InstitucionId,
  OrdenLaboratorio,
  FiltrosBandejaLab,
  CrearOrdenLabDTO,
  MuestraLaboratorio,
  EstadoMuestraLaboratorio,
  EventoTrazabilidadMuestra,
  ResultadoLaboratorio,
  GuardarResultadoBorradorDTO,
  ParametroResultadoLab,
  AlertaParametroLab,
  InformeLaboratorio,
  ItemResultadoInforme
} from '../services/types';

const STORAGE_KEY_ORDENES = 'clinica_lab_ordenes_v1';
const STORAGE_KEY_MUESTRAS = 'clinica_lab_muestras_v1';
const STORAGE_KEY_RESULTADOS = 'clinica_lab_resultados_v1';
const STORAGE_KEY_INFORMES = 'clinica_lab_informes_v1';

export function calcularAlertaParametro(
  valorStr: string,
  min?: number,
  max?: number,
  panicoMin?: number,
  panicoMax?: number
): AlertaParametroLab {
  const num = parseFloat(valorStr);
  if (isNaN(num)) return 'NORMAL';
  if (panicoMin !== undefined && num <= panicoMin) return 'CRITICO';
  if (panicoMax !== undefined && num >= panicoMax) return 'CRITICO';
  if (min !== undefined && num < min) return 'DISMINUIDO';
  if (max !== undefined && num > max) return 'ELEVADO';
  return 'NORMAL';
}

export function obtenerParametrosDefecto(codigoPrueba: string): ParametroResultadoLab[] {
  const c = codigoPrueba.toUpperCase();
  if (c.includes('GAS')) {
    return [
      { id: 'p-gas-01', codigoParametro: 'PH', nombre: 'pH arterial', valor: '', unidad: 'pH', rangoReferenciaMin: 7.35, rangoReferenciaMax: 7.45, rangoTexto: '7.35 - 7.45', alerta: 'NORMAL', valorPanicoMin: 7.20, valorPanicoMax: 7.60 },
      { id: 'p-gas-02', codigoParametro: 'PCO2', nombre: 'Presión parcial CO2 (pCO2)', valor: '', unidad: 'mmHg', rangoReferenciaMin: 35.0, rangoReferenciaMax: 45.0, rangoTexto: '35.0 - 45.0', alerta: 'NORMAL' },
      { id: 'p-gas-03', codigoParametro: 'PO2', nombre: 'Presión parcial O2 (pO2)', valor: '', unidad: 'mmHg', rangoReferenciaMin: 80.0, rangoReferenciaMax: 100.0, rangoTexto: '80.0 - 100.0', alerta: 'NORMAL', valorPanicoMin: 60.0 },
      { id: 'p-gas-04', codigoParametro: 'HCO3', nombre: 'Bicarbonato estándar (HCO3-)', valor: '', unidad: 'mmol/L', rangoReferenciaMin: 22.0, rangoReferenciaMax: 26.0, rangoTexto: '22.0 - 26.0', alerta: 'NORMAL', valorPanicoMin: 15.0, valorPanicoMax: 40.0 },
      { id: 'p-gas-05', codigoParametro: 'SATO2', nombre: 'Saturación de oxígeno (SatO2)', valor: '', unidad: '%', rangoReferenciaMin: 95.0, rangoReferenciaMax: 100.0, rangoTexto: '95.0 - 100.0', alerta: 'NORMAL', valorPanicoMin: 88.0 },
      { id: 'p-gas-06', codigoParametro: 'BE', nombre: 'Exceso de base (BE)', valor: '', unidad: 'mmol/L', rangoReferenciaMin: -2.0, rangoReferenciaMax: 2.0, rangoTexto: '-2.0 a +2.0', alerta: 'NORMAL' }
    ];
  }
  if (c.includes('BIO-004') || c.includes('ELEC')) {
    return [
      { id: 'p-elec-01', codigoParametro: 'NA', nombre: 'Sodio sérico (Na+)', valor: '', unidad: 'mmol/L', rangoReferenciaMin: 135.0, rangoReferenciaMax: 145.0, rangoTexto: '135.0 - 145.0', alerta: 'NORMAL', valorPanicoMin: 120.0, valorPanicoMax: 160.0 },
      { id: 'p-elec-02', codigoParametro: 'K', nombre: 'Potasio sérico (K+)', valor: '', unidad: 'mmol/L', rangoReferenciaMin: 3.5, rangoReferenciaMax: 5.1, rangoTexto: '3.5 - 5.1', alerta: 'NORMAL', valorPanicoMin: 2.8, valorPanicoMax: 6.2 },
      { id: 'p-elec-03', codigoParametro: 'CL', nombre: 'Cloro sérico (Cl-)', valor: '', unidad: 'mmol/L', rangoReferenciaMin: 98.0, rangoReferenciaMax: 107.0, rangoTexto: '98.0 - 107.0', alerta: 'NORMAL' },
      { id: 'p-elec-04', codigoParametro: 'CA', nombre: 'Calcio iónico (Ca++)', valor: '', unidad: 'mmol/L', rangoReferenciaMin: 1.12, rangoReferenciaMax: 1.32, rangoTexto: '1.12 - 1.32', alerta: 'NORMAL', valorPanicoMin: 0.90, valorPanicoMax: 1.60 }
    ];
  }
  if (c.includes('BIO-001') || c.includes('GLU')) {
    return [
      { id: 'p-glu-01', codigoParametro: 'GLU', nombre: 'Glucosa en ayunas', valor: '', unidad: 'mg/dL', rangoReferenciaMin: 70.0, rangoReferenciaMax: 105.0, rangoTexto: '70.0 - 105.0', alerta: 'NORMAL', valorPanicoMin: 45.0, valorPanicoMax: 400.0 }
    ];
  }
  if (c.includes('BIO-002') || c.includes('LIP')) {
    return [
      { id: 'p-lip-01', codigoParametro: 'COL_TOT', nombre: 'Colesterol Total', valor: '', unidad: 'mg/dL', rangoReferenciaMax: 200.0, rangoTexto: '< 200.0', alerta: 'NORMAL' },
      { id: 'p-lip-02', codigoParametro: 'TRIG', nombre: 'Triglicéridos', valor: '', unidad: 'mg/dL', rangoReferenciaMax: 150.0, rangoTexto: '< 150.0', alerta: 'NORMAL' },
      { id: 'p-lip-03', codigoParametro: 'HDL', nombre: 'Colesterol HDL (Bueno)', valor: '', unidad: 'mg/dL', rangoReferenciaMin: 40.0, rangoTexto: '> 40.0', alerta: 'NORMAL' },
      { id: 'p-lip-04', codigoParametro: 'LDL', nombre: 'Colesterol LDL (Malo)', valor: '', unidad: 'mg/dL', rangoReferenciaMax: 100.0, rangoTexto: '< 100.0', alerta: 'NORMAL' },
      { id: 'p-lip-05', codigoParametro: 'VLDL', nombre: 'Colesterol VLDL', valor: '', unidad: 'mg/dL', rangoReferenciaMin: 2.0, rangoReferenciaMax: 30.0, rangoTexto: '2.0 - 30.0', alerta: 'NORMAL' }
    ];
  }
  if (c.includes('HEM-001') || c.includes('HEM')) {
    return [
      { id: 'p-hem-01', codigoParametro: 'LEUC', nombre: 'Leucocitos totales', valor: '', unidad: '10^3/µL', rangoReferenciaMin: 4.5, rangoReferenciaMax: 11.0, rangoTexto: '4.5 - 11.0', alerta: 'NORMAL', valorPanicoMin: 2.0, valorPanicoMax: 30.0 },
      { id: 'p-hem-02', codigoParametro: 'ERIT', nombre: 'Eritrocitos', valor: '', unidad: '10^6/µL', rangoReferenciaMin: 4.2, rangoReferenciaMax: 5.8, rangoTexto: '4.2 - 5.8', alerta: 'NORMAL' },
      { id: 'p-hem-03', codigoParametro: 'HB', nombre: 'Hemoglobina', valor: '', unidad: 'g/dL', rangoReferenciaMin: 12.0, rangoReferenciaMax: 16.5, rangoTexto: '12.0 - 16.5', alerta: 'NORMAL', valorPanicoMin: 7.0, valorPanicoMax: 20.0 },
      { id: 'p-hem-04', codigoParametro: 'HTO', nombre: 'Hematocrito', valor: '', unidad: '%', rangoReferenciaMin: 37.0, rangoReferenciaMax: 48.0, rangoTexto: '37.0 - 48.0', alerta: 'NORMAL', valorPanicoMin: 20.0, valorPanicoMax: 60.0 },
      { id: 'p-hem-05', codigoParametro: 'PLAQ', nombre: 'Plaquetas', valor: '', unidad: '10^3/µL', rangoReferenciaMin: 150.0, rangoReferenciaMax: 450.0, rangoTexto: '150.0 - 450.0', alerta: 'NORMAL', valorPanicoMin: 50.0, valorPanicoMax: 1000.0 }
    ];
  }
  if (c.includes('HEM-002') || c.includes('COAG')) {
    return [
      { id: 'p-coag-01', codigoParametro: 'TP', nombre: 'Tiempo de Protrombina (TP)', valor: '', unidad: 's', rangoReferenciaMin: 11.0, rangoReferenciaMax: 13.5, rangoTexto: '11.0 - 13.5', alerta: 'NORMAL' },
      { id: 'p-coag-02', codigoParametro: 'INR', nombre: 'INR', valor: '', unidad: 'ratio', rangoReferenciaMin: 0.8, rangoReferenciaMax: 1.2, rangoTexto: '0.8 - 1.2', alerta: 'NORMAL', valorPanicoMax: 4.5 },
      { id: 'p-coag-03', codigoParametro: 'TPT', nombre: 'Tiempo de Tromboplastina Parcial (TPT)', valor: '', unidad: 's', rangoReferenciaMin: 25.0, rangoReferenciaMax: 35.0, rangoTexto: '25.0 - 35.0', alerta: 'NORMAL', valorPanicoMax: 70.0 }
    ];
  }
  if (c.includes('MIC-001') || c.includes('URO')) {
    return [
      { id: 'p-mic-01', codigoParametro: 'COLONIAS', nombre: 'Recuento de Colonias', valor: '', unidad: 'UFC/mL', rangoReferenciaMax: 10000, rangoTexto: '< 10,000 UFC/mL', alerta: 'NORMAL' },
      { id: 'p-mic-02', codigoParametro: 'AISLAMIENTO', nombre: 'Microorganismo Aislado', valor: '', unidad: 'texto', rangoTexto: 'Sin desarrollo patógeno', alerta: 'NORMAL' },
      { id: 'p-mic-03', codigoParametro: 'ANTIBIOGRAMA', nombre: 'Perfil de Sensibilidad', valor: '', unidad: 'texto', rangoTexto: 'No aplica si < 10,000', alerta: 'NORMAL' }
    ];
  }
  if (c.includes('INM-001') || c.includes('TROP')) {
    return [
      { id: 'p-inm-01', codigoParametro: 'TROP_I', nombre: 'Troponina I de Alta Sensibilidad', valor: '', unidad: 'ng/mL', rangoReferenciaMax: 0.04, rangoTexto: '< 0.040', alerta: 'NORMAL', valorPanicoMax: 0.100 }
    ];
  }
  return [
    { id: 'p-gen-01', codigoParametro: 'RESULT', nombre: 'Resultado Cuantitativo', valor: '', unidad: 'unidades', rangoTexto: 'Referencia institucional', alerta: 'NORMAL' }
  ];
}

export class MockLaboratoryRepository implements LaboratoryRepository {
  private ordenes: OrdenLaboratorio[] = [];
  private muestras: MuestraLaboratorio[] = [];
  private resultados: ResultadoLaboratorio[] = [];
  private informes: InformeLaboratorio[] = [];

  constructor() {
    this.cargarDatos();
  }

  private cargarDatos(): void {
    try {
      const rawO = localStorage.getItem(STORAGE_KEY_ORDENES);
      const rawM = localStorage.getItem(STORAGE_KEY_MUESTRAS);
      const rawR = localStorage.getItem(STORAGE_KEY_RESULTADOS);
      const rawI = localStorage.getItem(STORAGE_KEY_INFORMES);

      if (rawO) this.ordenes = JSON.parse(rawO);
      if (rawM) this.muestras = JSON.parse(rawM);
      if (rawR) this.resultados = JSON.parse(rawR);
      if (rawI) this.informes = JSON.parse(rawI);
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

    if (this.resultados.length === 0) {
      this.resultados = [
        {
          id: 'res-lab-seed-01',
          serieResultadoId: 'SER-2026-0084-1',
          version: 1,
          ordenId: 'ord-lab-04',
          codigoOrden: 'ORD-LAB-2026-0084',
          pacienteId: 'pac-04',
          pacienteNombre: 'María Elena Estrada',
          pacienteDpi: '1789 12345 0101',
          itemOrdenId: 'item-07',
          pruebaId: 'lab-uro-01',
          codigoPrueba: 'MIC-001',
          nombrePrueba: 'Urocultivo con Antibiograma Automatizado',
          seccion: 'Microbiología Clínica',
          muestraId: 'mue-04',
          codigoMuestra: 'MUE-2026-0084-01',
          equipoAnalitico: 'Sistema Automatizado VITEK 2 Compact',
          metodoAnalitico: 'Turbidimetría y Microdilución en Caldo Automatizada',
          loteReactivo: 'LOTE-VIT-2026-09',
          estado: 'BORRADOR',
          analistaId: 'usr-lab-ana-01',
          analistaNombre: 'Licda. Sofía Paniagua',
          fechaAnalisis: '2026-10-22T08:30:00Z',
          observaciones: 'Aislamiento de bacilo gram negativo con recuento significativo.',
          parametros: [
            {
              id: 'p-mic-01',
              codigoParametro: 'COLONIAS',
              nombre: 'Recuento de Colonias',
              valor: '100000',
              unidad: 'UFC/mL',
              rangoReferenciaMax: 10000,
              rangoTexto: '< 10,000 UFC/mL',
              alerta: 'ELEVADO'
            },
            {
              id: 'p-mic-02',
              codigoParametro: 'AISLAMIENTO',
              nombre: 'Microorganismo Aislado',
              valor: 'Escherichia coli (cepa sensible)',
              unidad: 'texto',
              rangoTexto: 'Sin desarrollo patógeno',
              alerta: 'NORMAL'
            },
            {
              id: 'p-mic-03',
              codigoParametro: 'ANTIBIOGRAMA',
              nombre: 'Perfil de Sensibilidad',
              valor: 'Sensible a Nitrofurantoína, Ceftriaxona y Ciprofloxacino',
              unidad: 'texto',
              rangoTexto: 'No aplica si < 10,000',
              alerta: 'NORMAL'
            }
          ]
        },
        {
          id: 'res-lab-seed-02',
          serieResultadoId: 'SER-2026-0085-1',
          version: 1,
          ordenId: 'ord-lab-05',
          codigoOrden: 'ORD-LAB-2026-0085',
          pacienteId: 'pac-05',
          pacienteNombre: 'Jorge Mario Castillo',
          pacienteDpi: '2234 56789 0101',
          itemOrdenId: 'item-08',
          pruebaId: 'lab-trop-01',
          codigoPrueba: 'INM-001',
          nombrePrueba: 'Troponina I de Alta Sensibilidad',
          seccion: 'Inmunología Clínica',
          muestraId: 'mue-05',
          codigoMuestra: 'MUE-2026-0085-01',
          equipoAnalitico: 'Analizador Roche Cobas e 411',
          metodoAnalitico: 'Inmunoensayo por Electroquimioluminiscencia (ECLIA)',
          loteReactivo: 'LOTE-ECL-2026-44',
          estado: 'VALIDADO',
          analistaId: 'usr-lab-ana-01',
          analistaNombre: 'Licda. Sofía Paniagua',
          fechaAnalisis: '2026-10-21T18:50:00Z',
          validadorId: 'usr-lab-val-01',
          validadorNombre: 'Lic. Kevin Estrada',
          fechaValidacion: '2026-10-21T19:05:00Z',
          observaciones: 'Curva de troponina concordante con cuadro coronario agudo en seguimiento.',
          parametros: [
            {
              id: 'p-inm-01',
              codigoParametro: 'TROP_I',
              nombre: 'Troponina I de Alta Sensibilidad',
              valor: '0.145',
              unidad: 'ng/mL',
              rangoReferenciaMax: 0.04,
              rangoTexto: '< 0.040',
              alerta: 'CRITICO',
              valorPanicoMax: 0.100
            }
          ]
        }
      ];
    }

    if (this.informes.length === 0) {
      this.informes = [
        {
          id: 'inf-lab-01',
          codigoInforme: 'INF-LAB-2026-0085',
          ordenId: 'ord-lab-05',
          codigoOrden: 'ORD-LAB-2026-0085',
          pacienteId: 'pac-05',
          pacienteNombre: 'Jorge Mario Castillo',
          pacienteDpi: '2234 56789 0101',
          pacienteEdad: 63,
          pacienteSexo: 'M',
          medicoSolicitante: 'Dr. Alejandro Morales (Colegiado CMG-6540)',
          fechaEmision: '2026-10-21T19:15:00Z',
          estado: 'EMITIDO',
          hashVerificacion: 'SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
          emisorId: 'usr-lab-val-01',
          emisorNombre: 'Lic. Kevin Estrada (Validador Técnico)',
          emisorColegiado: 'QB-4912',
          conclusionesGenerales: 'Valores concordantes con evento coronario agudo en seguimiento. Se recomienda correlación electrocardiográfica urgente.',
          resultadosIncluidos: [
            {
              resultadoId: 'res-lab-seed-02',
              serieResultadoId: 'SER-2026-0085-1',
              version: 1,
              pruebaId: 'lab-trop-01',
              codigoPrueba: 'INM-001',
              nombrePrueba: 'Troponina I de Alta Sensibilidad',
              seccion: 'Inmunología Clínica',
              muestraCodigo: 'MUE-2026-0085-01',
              equipoAnalitico: 'Analizador Roche Cobas e 411',
              metodoAnalitico: 'Inmunoensayo por Electroquimioluminiscencia (ECLIA)',
              parametros: [
                {
                  id: 'p-inm-01',
                  codigoParametro: 'TROP_I',
                  nombre: 'Troponina I de Alta Sensibilidad',
                  valor: '0.145',
                  unidad: 'ng/mL',
                  rangoReferenciaMax: 0.04,
                  rangoTexto: '< 0.040',
                  alerta: 'CRITICO',
                  valorPanicoMax: 0.100
                }
              ],
              analistaNombre: 'Licda. Sofía Paniagua',
              validadorNombre: 'Lic. Kevin Estrada',
              fechaValidacion: '2026-10-21T19:05:00Z'
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
      localStorage.setItem(STORAGE_KEY_RESULTADOS, JSON.stringify(this.resultados));
      localStorage.setItem(STORAGE_KEY_INFORMES, JSON.stringify(this.informes));
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

  async obtenerResultadosPorOrden(
    _institucionId: InstitucionId,
    ordenId: string
  ): Promise<ResultadoLaboratorio[]> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 30));
    return this.resultados.filter((r) => r.ordenId === ordenId || r.codigoOrden === ordenId);
  }

  async obtenerResultadoPorId(
    _institucionId: InstitucionId,
    resultadoId: string
  ): Promise<ResultadoLaboratorio | null> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 30));
    const r = this.resultados.find((resItem) => resItem.id === resultadoId);
    return r ? { ...r } : null;
  }

  async guardarResultadoBorrador(
    _institucionId: InstitucionId,
    dto: GuardarResultadoBorradorDTO
  ): Promise<ResultadoLaboratorio> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 50));

    const orden = this.ordenes.find((o) => o.id === dto.ordenId || o.codigoOrden === dto.ordenId);
    if (!orden) throw new Error(`Orden ${dto.ordenId} no encontrada`);

    const muestra = this.muestras.find((m) => m.id === dto.muestraId || m.codigoMuestra === dto.muestraId);
    if (!muestra) throw new Error(`Muestra ${dto.muestraId} no encontrada`);

    // Regla crítica de negocio: solo muestras ACEPTADA o PROCESADA pueden ser analizadas
    if (muestra.estado !== 'ACEPTADA' && muestra.estado !== 'PROCESADA') {
      throw new Error(
        `Criterio preanalítico no cumplido: La muestra ${muestra.codigoMuestra} se encuentra en estado «${muestra.estado}». Solo se permite capturar resultados sobre muestras en estado ACEPTADA o PROCESADA.`
      );
    }

    const item = orden.items.find((i) => i.id === dto.itemOrdenId);
    if (!item) throw new Error(`Ítem de prueba ${dto.itemOrdenId} no encontrado en la orden`);

    const parametrosMapeados: ParametroResultadoLab[] = dto.parametros.map((p) => ({
      id: p.parametroId || `param-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      codigoParametro: p.codigoParametro,
      nombre: p.nombre,
      valor: p.valor,
      unidad: p.unidad,
      rangoReferenciaMin: p.rangoReferenciaMin,
      rangoReferenciaMax: p.rangoReferenciaMax,
      rangoTexto: p.rangoTexto,
      alerta: p.alerta,
      valorPanicoMin: p.valorPanicoMin,
      valorPanicoMax: p.valorPanicoMax
    }));

    const ahora = new Date().toISOString();
    let resultadoFinal: ResultadoLaboratorio;

    const existingIdx = this.resultados.findIndex(
      (r) => r.ordenId === orden.id && r.itemOrdenId === dto.itemOrdenId && r.estado === 'BORRADOR'
    );

    if (existingIdx !== -1) {
      // Actualizar borrador existente
      const existing = this.resultados[existingIdx];
      existing.equipoAnalitico = dto.equipoAnalitico;
      existing.metodoAnalitico = dto.metodoAnalitico;
      existing.loteReactivo = dto.loteReactivo;
      existing.parametros = parametrosMapeados;
      existing.observaciones = dto.observaciones;
      existing.analistaId = dto.analistaId;
      existing.analistaNombre = dto.analistaNombre;
      existing.fechaAnalisis = ahora;
      resultadoFinal = { ...existing };
      this.resultados[existingIdx] = resultadoFinal;
    } else {
      // Crear nuevo borrador (versión 1 de la serie)
      const itemIndex = orden.items.findIndex((i) => i.id === dto.itemOrdenId);
      const codigoSufijo = orden.codigoOrden.replace('ORD-LAB-', '');
      const serieResultadoId = `SER-${codigoSufijo}-${itemIndex >= 0 ? itemIndex + 1 : 1}`;

      resultadoFinal = {
        id: `res-lab-${Date.now()}`,
        serieResultadoId,
        version: 1,
        ordenId: orden.id,
        codigoOrden: orden.codigoOrden,
        pacienteId: orden.pacienteId,
        pacienteNombre: orden.pacienteNombre,
        pacienteDpi: orden.pacienteDpi,
        itemOrdenId: dto.itemOrdenId,
        pruebaId: item.pruebaId,
        codigoPrueba: item.codigoPrueba,
        nombrePrueba: item.nombrePrueba,
        seccion: item.seccion,
        muestraId: muestra.id,
        codigoMuestra: muestra.codigoMuestra,
        equipoAnalitico: dto.equipoAnalitico,
        metodoAnalitico: dto.metodoAnalitico,
        loteReactivo: dto.loteReactivo,
        parametros: parametrosMapeados,
        observaciones: dto.observaciones,
        estado: 'BORRADOR',
        analistaId: dto.analistaId,
        analistaNombre: dto.analistaNombre,
        fechaAnalisis: ahora
      };
      this.resultados.push(resultadoFinal);
    }

    // Actualizar estado del ítem y de la orden
    item.estado = 'EN_PROCESO';

    // Si todos los ítems tienen resultados registrados, la orden pasa a PARA_VALIDAR
    const itemsConResultados = orden.items.filter((it) =>
      this.resultados.some((r) => r.ordenId === orden.id && r.itemOrdenId === it.id)
    );

    if (itemsConResultados.length === orden.items.length) {
      orden.estado = 'PARA_VALIDAR';
    } else {
      orden.estado = 'EN_ANALISIS';
    }

    this.guardarDatos();
    return resultadoFinal;
  }

  async validarResultado(
    _institucionId: InstitucionId,
    resultadoId: string,
    validadorId: string,
    validadorNombre: string
  ): Promise<ResultadoLaboratorio> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 50));

    const idx = this.resultados.findIndex((r) => r.id === resultadoId);
    if (idx === -1) throw new Error(`Resultado ${resultadoId} no encontrado`);

    const res = this.resultados[idx];
    res.estado = 'VALIDADO';
    res.validadorId = validadorId;
    res.validadorNombre = validadorNombre;
    res.fechaValidacion = new Date().toISOString();

    // Actualizar ítem en la orden
    const ordIdx = this.ordenes.findIndex((o) => o.id === res.ordenId);
    if (ordIdx !== -1) {
      const it = this.ordenes[ordIdx].items.find((i) => i.id === res.itemOrdenId);
      if (it) it.estado = 'VALIDADO';

      // Si todos los ítems están validados, orden COMPLETADA
      const todosValidados = this.ordenes[ordIdx].items.every((i) => i.estado === 'VALIDADO');
      if (todosValidados) {
        this.ordenes[ordIdx].estado = 'COMPLETADA';
      }
    }

    this.guardarDatos();
    return { ...res };
  }

  async corregirResultado(
    _institucionId: InstitucionId,
    resultadoId: string,
    dto: GuardarResultadoBorradorDTO,
    motivo: string
  ): Promise<ResultadoLaboratorio> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 50));

    const originalIdx = this.resultados.findIndex((r) => r.id === resultadoId);
    if (originalIdx === -1) throw new Error(`Resultado original ${resultadoId} no encontrado`);

    const original = this.resultados[originalIdx];
    original.estado = 'CORREGIDO';

    const parametrosMapeados: ParametroResultadoLab[] = dto.parametros.map((p) => ({
      id: p.parametroId || `param-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      codigoParametro: p.codigoParametro,
      nombre: p.nombre,
      valor: p.valor,
      unidad: p.unidad,
      rangoReferenciaMin: p.rangoReferenciaMin,
      rangoReferenciaMax: p.rangoReferenciaMax,
      rangoTexto: p.rangoTexto,
      alerta: p.alerta,
      valorPanicoMin: p.valorPanicoMin,
      valorPanicoMax: p.valorPanicoMax
    }));

    const ahora = new Date().toISOString();
    const nuevaVersion: ResultadoLaboratorio = {
      id: `res-lab-v${original.version + 1}-${Date.now()}`,
      serieResultadoId: original.serieResultadoId,
      version: original.version + 1,
      ordenId: original.ordenId,
      codigoOrden: original.codigoOrden,
      pacienteId: original.pacienteId,
      pacienteNombre: original.pacienteNombre,
      pacienteDpi: original.pacienteDpi,
      itemOrdenId: original.itemOrdenId,
      pruebaId: original.pruebaId,
      codigoPrueba: original.codigoPrueba,
      nombrePrueba: original.nombrePrueba,
      seccion: original.seccion,
      muestraId: dto.muestraId || original.muestraId,
      codigoMuestra: original.codigoMuestra,
      equipoAnalitico: dto.equipoAnalitico,
      metodoAnalitico: dto.metodoAnalitico,
      loteReactivo: dto.loteReactivo,
      parametros: parametrosMapeados,
      observaciones: dto.observaciones,
      estado: 'BORRADOR',
      analistaId: dto.analistaId,
      analistaNombre: dto.analistaNombre,
      fechaAnalisis: ahora,
      motivoModificacion: motivo
    };

    this.resultados.push(nuevaVersion);
    this.guardarDatos();
    return nuevaVersion;
  }

  async repetirAnalisis(
    _institucionId: InstitucionId,
    ordenId: string,
    itemOrdenId: string,
    nuevaMuestraId: string,
    dto: GuardarResultadoBorradorDTO
  ): Promise<ResultadoLaboratorio> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 50));

    const orden = this.ordenes.find((o) => o.id === ordenId);
    if (!orden) throw new Error('Orden no encontrada');

    const nuevaMuestra = this.muestras.find((m) => m.id === nuevaMuestraId);
    if (!nuevaMuestra) throw new Error('Nueva muestra no encontrada');

    const item = orden.items.find((i) => i.id === itemOrdenId);
    if (!item) throw new Error('Ítem no encontrado');

    const parametrosMapeados: ParametroResultadoLab[] = dto.parametros.map((p) => ({
      id: p.parametroId || `param-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      codigoParametro: p.codigoParametro,
      nombre: p.nombre,
      valor: p.valor,
      unidad: p.unidad,
      rangoReferenciaMin: p.rangoReferenciaMin,
      rangoReferenciaMax: p.rangoReferenciaMax,
      rangoTexto: p.rangoTexto,
      alerta: p.alerta,
      valorPanicoMin: p.valorPanicoMin,
      valorPanicoMax: p.valorPanicoMax
    }));

    const ahora = new Date().toISOString();
    const nuevaSerie: ResultadoLaboratorio = {
      id: `res-lab-serie-${Date.now()}`,
      serieResultadoId: `SER-${orden.codigoOrden.replace('ORD-LAB-', '')}-REP-${Date.now().toString().slice(-4)}`,
      version: 1,
      ordenId: orden.id,
      codigoOrden: orden.codigoOrden,
      pacienteId: orden.pacienteId,
      pacienteNombre: orden.pacienteNombre,
      pacienteDpi: orden.pacienteDpi,
      itemOrdenId,
      pruebaId: item.pruebaId,
      codigoPrueba: item.codigoPrueba,
      nombrePrueba: item.nombrePrueba,
      seccion: item.seccion,
      muestraId: nuevaMuestra.id,
      codigoMuestra: nuevaMuestra.codigoMuestra,
      equipoAnalitico: dto.equipoAnalitico,
      metodoAnalitico: dto.metodoAnalitico,
      loteReactivo: dto.loteReactivo,
      parametros: parametrosMapeados,
      observaciones: dto.observaciones,
      estado: 'BORRADOR',
      analistaId: dto.analistaId,
      analistaNombre: dto.analistaNombre,
      fechaAnalisis: ahora,
      motivoModificacion: 'Repetición técnica de análisis por nueva serie'
    };

    this.resultados.push(nuevaSerie);
    this.guardarDatos();
    return nuevaSerie;
  }

  async obtenerInformePorOrden(
    _institucionId: InstitucionId,
    ordenId: string
  ): Promise<InformeLaboratorio | null> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 30));
    const inf = this.informes.find((i) => i.ordenId === ordenId || i.codigoOrden === ordenId);
    return inf ? { ...inf } : null;
  }

  async emitirInforme(
    _institucionId: InstitucionId,
    ordenId: string,
    emisorId: string,
    emisorNombre: string,
    emisorColegiado: string,
    conclusiones?: string
  ): Promise<InformeLaboratorio> {
    this.cargarDatos();
    await new Promise((res) => setTimeout(res, 60));

    const orden = this.ordenes.find((o) => o.id === ordenId || o.codigoOrden === ordenId);
    if (!orden) throw new Error(`Orden ${ordenId} no encontrada`);

    // Regla crítica CA13: Todos los resultados incluidos deben estar en estado VALIDADO
    const resultadosOrden = this.resultados.filter((r) => r.ordenId === orden.id);

    const itemsNoValidados = orden.items.filter((item) => {
      const res = resultadosOrden.find((r) => r.itemOrdenId === item.id);
      return !res || res.estado !== 'VALIDADO';
    });

    if (itemsNoValidados.length > 0) {
      const nombresFaltantes = itemsNoValidados.map((i) => `«${i.nombrePrueba}»`).join(', ');
      throw new Error(
        `Regla CA13 incumplida: No es posible emitir el informe analítico oficial porque las siguientes pruebas no están en estado VALIDADO: ${nombresFaltantes}. Se requiere validación pericial completa antes de emitir.`
      );
    }

    // Armar instantánea inmutable de resultados con series y versiones exactas
    const resultadosIncluidos: ItemResultadoInforme[] = orden.items.map((item) => {
      // Buscar la versión activa validada (mayor versión en caso de correcciones)
      const resValidados = resultadosOrden.filter((r) => r.itemOrdenId === item.id && r.estado === 'VALIDADO');
      resValidados.sort((a, b) => b.version - a.version);
      const res = resValidados[0];

      return {
        resultadoId: res.id,
        serieResultadoId: res.serieResultadoId,
        version: res.version,
        pruebaId: item.pruebaId,
        codigoPrueba: item.codigoPrueba,
        nombrePrueba: item.nombrePrueba,
        seccion: item.seccion,
        muestraCodigo: res.codigoMuestra,
        equipoAnalitico: res.equipoAnalitico,
        metodoAnalitico: res.metodoAnalitico,
        parametros: res.parametros,
        analistaNombre: res.analistaNombre,
        validadorNombre: res.validadorNombre || emisorNombre,
        fechaValidacion: res.fechaValidacion || new Date().toISOString()
      };
    });

    const ahora = new Date().toISOString();
    const codigoSufijo = orden.codigoOrden.replace('ORD-LAB-', '');
    const codigoInforme = `INF-LAB-${codigoSufijo}`;

    // Hash criptográfico simulado de integridad
    const pseudoHashHex = Array.from({ length: 48 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const hashVerificacion = `SHA256:${pseudoHashHex}`;

    // Si ya existía informe, actualizar a emitido
    const idxExistente = this.informes.findIndex((i) => i.ordenId === orden.id);
    const nuevoInforme: InformeLaboratorio = {
      id: idxExistente !== -1 ? this.informes[idxExistente].id : `inf-lab-${Date.now()}`,
      codigoInforme,
      ordenId: orden.id,
      codigoOrden: orden.codigoOrden,
      pacienteId: orden.pacienteId,
      pacienteNombre: orden.pacienteNombre,
      pacienteDpi: orden.pacienteDpi,
      pacienteEdad: orden.pacienteEdad,
      pacienteSexo: orden.pacienteSexo,
      medicoSolicitante: orden.medicoSolicitante,
      fechaEmision: ahora,
      estado: 'EMITIDO',
      hashVerificacion,
      emisorId,
      emisorNombre,
      emisorColegiado,
      resultadosIncluidos,
      conclusionesGenerales: conclusiones || 'Resultados analíticos validados conforme al estándar de calidad de Laboratorio Clínico Central.'
    };

    if (idxExistente !== -1) {
      this.informes[idxExistente] = nuevoInforme;
    } else {
      this.informes.unshift(nuevoInforme);
    }

    // Orden pasa a COMPLETADA
    orden.estado = 'COMPLETADA';

    this.guardarDatos();
    return nuevoInforme;
  }
}
