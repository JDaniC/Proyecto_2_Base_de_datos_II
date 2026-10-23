import {
  AntecedentesClinicos,
  ConsultaPaciente,
  DiagnosticoHistorial,
  RecetaHistorial,
  EventoHistorial
} from '../services/types';

export const MOCK_ANTECEDENTES_DEFECTO: Record<string, AntecedentesClinicos> = {
  'pac-hosp-001': {
    patologicos: [
      'Hipertensión arterial esencial estadio 2 (diagnosticada en 2020)',
      'Diabetes Mellitus tipo 2 controlada con hipoglucemiantes orales',
      'Dislipidemia mixta en tratamiento'
    ],
    quirurgicos: [
      'Colecistectomía laparoscópica programada sin complicaciones (2018)'
    ],
    familiares: [
      'Padre fallecido por infarto agudo de miocardio a los 58 años',
      'Madre con antecedente de hipertensión arterial y accidente cerebrovascular isquémico'
    ],
    alergias: [
      { sustancia: 'Penicilina y derivados betalactámicos', severidad: 'SEVERA', reaccion: 'Angioedema facial y dificultad respiratoria' },
      { sustancia: 'Ibuprofeno / AINEs', severidad: 'LEVE', reaccion: 'Urticaria pruriginosa en tronco' }
    ],
    medicamentosActuales: [
      'Losartán Potásico 50 mg cada 12 horas VO',
      'Metformina Clorhidrato 850 mg cada 12 horas con alimentos VO',
      'Amlodipino 5 mg una vez al día por la mañana VO'
    ]
  },
  'pac-hosp-002': {
    patologicos: [
      'Asma bronquial intermitente leve con crisis ocasionales'
    ],
    quirurgicos: [
      'Apendicectomía no complicada (hace 2 semanas)'
    ],
    familiares: [
      'Tía materna con asma bronquial atópica'
    ],
    alergias: [], // SIN_VERIFICAR
    medicamentosActuales: [
      'Salbutamol inhalador 100 mcg a demanda ante broncoespasmo'
    ]
  },
  'pac-ped-001': {
    patologicos: [
      'Dermatitis atópica infantil de control ambulatorio',
      'Bronquiolitis aguda a los 8 meses (resuelta sin secuelas)'
    ],
    quirurgicos: [
      'Sin antecedentes quirúrgicos ni hospitalizaciones mayores'
    ],
    familiares: [
      'Madre con rinitis alérgica estacional',
      'Padre con antecedente de dermatitis de contacto'
    ],
    alergias: [
      {
        sustancia: 'Proteína de Leche de Vaca (Caseína / Lactoalbúmina)',
        severidad: 'MODERADA',
        reaccion: 'Erupción urticariana peribucal y reflujo gastroesofágico agudo'
      },
      {
        sustancia: 'Amoxicilina / Clavulanato',
        severidad: 'SEVERA',
        reaccion: 'Exantema morbiliforme con broncoespasmo moderado'
      }
    ],
    medicamentosActuales: [
      'Cetirizina jarabe 2.5 mg/día en períodos de brote atópico',
      'Crema emoliente con ceramidas tras baño diario'
    ],
    perinatales: {
      edadGestacionalSemanas: 38,
      pesoNacimientoGramos: 3150,
      tallaNacimientoCm: 49,
      apgar1Minuto: 8,
      apgar5Minutos: 9,
      tipoParto: 'PARTO_VAGINAL',
      lactanciaMaternaExclusivaMeses: 6,
      complicacionesPerinatales: 'Sin complicaciones. Ictericia fisiológica leve resuelta sin fototerapia.'
    },
    verificacionAlergias: {
      verificadoPor: 'Dra. Carmen Morales (Pediatra)',
      fechaVerificacion: '2026-06-15',
      notas: 'Alergias confirmadas por prueba cutánea y provocación oral controlada.'
    }
  },
  'pac-ped-002': {
    patologicos: [
      'Sin patologías crónicas documentadas'
    ],
    quirurgicos: [],
    familiares: [
      'Sin antecedentes heredo-familiares de relevancia'
    ],
    alergias: [],
    medicamentosActuales: [],
    perinatales: {
      edadGestacionalSemanas: 39,
      pesoNacimientoGramos: 3300,
      tallaNacimientoCm: 50,
      apgar1Minuto: 9,
      apgar5Minutos: 10,
      tipoParto: 'CESAREA',
      lactanciaMaternaExclusivaMeses: 4,
      complicacionesPerinatales: 'Cesárea por presentación podálica. Sin asfixia neonatal.'
    }
  },
  'pac-ped-003': {
    patologicos: [
      'Rinitis alérgica estacional leve'
    ],
    quirurgicos: [],
    familiares: [
      'Madre asmática'
    ],
    alergias: [],
    medicamentosActuales: [],
    perinatales: {
      edadGestacionalSemanas: 40,
      pesoNacimientoGramos: 3450,
      tallaNacimientoCm: 51,
      apgar1Minuto: 9,
      apgar5Minutos: 9,
      tipoParto: 'PARTO_VAGINAL',
      lactanciaMaternaExclusivaMeses: 6,
      complicacionesPerinatales: 'Parto eutócico a término sin incidencias.'
    },
    verificacionAlergias: {
      verificadoPor: 'Dr. Roberto Santos (Pediatra)',
      fechaVerificacion: '2026-08-20',
      notas: 'Anamnesis farmacológica negativa para alergias medicamentosas y alimentarias.'
    }
  }
};

export const MOCK_CONSULTAS_DEFECTO: Record<string, ConsultaPaciente[]> = {
  'pac-hosp-001': [
    {
      id: 'con-0104-1',
      fechaHora: '2026-10-18T09:30:00Z',
      motivo: 'Evaluación y control de hipertensión arterial y cifras glucémicas',
      sintomas: 'Paciente refiere leve mareo ocasional matutino, sin escotomas ni tinnitus.',
      profesionalNombre: 'Dra. Elena Morales',
      profesionalRol: 'Médico Especialista en Medicina Interna',
      diagnosticoPrincipal: 'I10 Hipertensión esencial (primaria)',
      estado: 'FINALIZADA'
    },
    {
      id: 'con-0104-2',
      fechaHora: '2026-08-14T10:15:00Z',
      motivo: 'Control trimestral de parámetros metabólicos y reabastecimiento de receta',
      sintomas: 'Asintomático cardiovascular, refiere adecuada tolerancia a metformina.',
      profesionalNombre: 'Dra. Elena Morales',
      profesionalRol: 'Médico Especialista en Medicina Interna',
      diagnosticoPrincipal: 'E11 Diabetes mellitus no insulinodependiente',
      estado: 'FINALIZADA'
    },
    {
      id: 'con-0104-3',
      fechaHora: '2026-05-10T11:00:00Z',
      motivo: 'Cefalea opresiva holocraneana y cifras tensionales de 150/95 mmHg',
      sintomas: 'Cefalea de 3 días de evolución posterior a evento de estrés laboral.',
      profesionalNombre: 'Dr. Fernando Paz',
      profesionalRol: 'Médico de Consulta Externa',
      diagnosticoPrincipal: 'I10 Hipertensión esencial (primaria)',
      estado: 'FINALIZADA'
    }
  ],
  'pac-hosp-002': [
    {
      id: 'con-0108-1',
      fechaHora: '2026-10-19T09:15:00Z',
      motivo: 'Revisión clínica post-quirúrgica y retiro de puntos de sutura',
      sintomas: 'Evolución favorable, herida limpia con bordes afrontados, sin signos de flogosis.',
      profesionalNombre: 'Dra. Elena Morales',
      profesionalRol: 'Médico Especialista en Medicina Interna',
      diagnosticoPrincipal: 'K35.8 Apendicitis aguda resuelta',
      estado: 'FINALIZADA'
    }
  ],
  'pac-ped-001': [
    {
      id: 'con-ped-001-3',
      fechaHora: '2026-05-10T09:00:00Z',
      motivo: 'Control integral de crecimiento y desarrollo del niño sano (4 años)',
      sintomas: 'Paciente acude en compañía de su madre para control anual de 4 años. Asintomático.',
      profesionalNombre: 'Dra. Marcela Estrada',
      profesionalRol: 'Pediatra Especialista',
      diagnosticoPrincipal: 'Z00.1 Control de salud de rutina del niño',
      estado: 'FINALIZADA',
      signosVitales: {
        pesoKg: 16.5,
        tallaCm: 103.5,
        temperaturaC: 36.7,
        presionSistolica: null,
        presionDiastolica: null,
        frecuenciaCardiacaLpm: 95,
        perimetroCefalicoCm: 50.8
      }
    },
    {
      id: 'con-ped-001-2',
      fechaHora: '2025-05-15T10:30:00Z',
      motivo: 'Control de crecimiento y desarrollo del niño sano (3 años)',
      sintomas: 'Control periódico de 3 años. Adecuado desarrollo psicomotor.',
      profesionalNombre: 'Dra. Marcela Estrada',
      profesionalRol: 'Pediatra Especialista',
      diagnosticoPrincipal: 'Z00.1 Control de salud de rutina del niño',
      estado: 'FINALIZADA',
      signosVitales: {
        pesoKg: 14.6,
        tallaCm: 96.0,
        temperaturaC: 36.5,
        presionSistolica: null,
        presionDiastolica: null,
        frecuenciaCardiacaLpm: 98,
        perimetroCefalicoCm: 49.8
      }
    },
    {
      id: 'con-ped-001-1',
      fechaHora: '2024-05-12T08:45:00Z',
      motivo: 'Control de crecimiento y desarrollo del niño sano (2 años)',
      sintomas: 'Control de los 2 años cumplidos. Sin antecedentes mórbidos recientes.',
      profesionalNombre: 'Dra. Marcela Estrada',
      profesionalRol: 'Pediatra Especialista',
      diagnosticoPrincipal: 'Z00.1 Control de salud de rutina del niño',
      estado: 'FINALIZADA',
      signosVitales: {
        pesoKg: 12.4,
        tallaCm: 87.0,
        temperaturaC: 36.6,
        presionSistolica: null,
        presionDiastolica: null,
        frecuenciaCardiacaLpm: 105,
        perimetroCefalicoCm: 48.5
      }
    }
  ]
};

export const MOCK_DIAGNOSTICOS_DEFECTO: Record<string, DiagnosticoHistorial[]> = {
  'pac-hosp-001': [
    {
      id: 'dx-0104-1',
      codigoCIE: 'I10',
      nombre: 'Hipertensión esencial (primaria)',
      esPrincipal: true,
      fechaRegistro: '2020-04-10',
      registradoPor: 'Dr. Fernando Paz'
    },
    {
      id: 'dx-0104-2',
      codigoCIE: 'E11.9',
      nombre: 'Diabetes mellitus tipo 2 sin mención de complicación',
      esPrincipal: false,
      fechaRegistro: '2021-09-15',
      registradoPor: 'Dra. Elena Morales'
    },
    {
      id: 'dx-0104-3',
      codigoCIE: 'E78.2',
      nombre: 'Hiperlipidemia mixta',
      esPrincipal: false,
      fechaRegistro: '2023-01-20',
      registradoPor: 'Dra. Elena Morales'
    }
  ],
  'pac-hosp-002': [
    {
      id: 'dx-0108-1',
      codigoCIE: 'K35.8',
      nombre: 'Apendicitis aguda no especificada (resuelta)',
      esPrincipal: true,
      fechaRegistro: '2026-10-05',
      registradoPor: 'Dra. Elena Morales'
    }
  ]
};

export const MOCK_RECETAS_DEFECTO: Record<string, RecetaHistorial[]> = {
  'pac-hosp-001': [
    {
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
        },
        {
          nombre: 'Metformina Clorhidrato',
          presentacion: 'Tableta de liberación inmediata',
          dosis: '850 mg',
          frecuencia: 'Cada 12 horas',
          duracion: '90 días',
          via: 'Oral',
          indicaciones: 'Tomar inmediatamente después del desayuno y la cena.'
        }
      ]
    }
  ],
  'pac-hosp-002': [
    {
      id: 'rec-0108-1',
      codigoReceta: 'REC-2026-0422',
      fechaEmision: '2026-10-19T09:30:00Z',
      emitidaPor: 'Dra. Elena Morales',
      rolEmisor: 'Médico Especialista (Col. CMG-10421)',
      estado: 'EMITIDA',
      medicamentos: [
        {
          nombre: 'Paracetamol',
          presentacion: 'Tableta',
          dosis: '500 mg',
          frecuencia: 'Cada 8 horas',
          duracion: '3 días',
          via: 'Oral',
          indicaciones: 'Tomar únicamente en caso de molestia o dolor.'
        }
      ]
    }
  ]
};

export const MOCK_EVENTOS_TIMELINE_DEFECTO: Record<string, EventoHistorial[]> = {
  'pac-hosp-001': [
    {
      id: 'evt-001',
      fechaHora: '2026-10-18T09:45:00Z',
      tipoEvento: 'RECETA',
      titulo: 'Receta médica emitida',
      descripcion: 'Prescripción de tratamiento crónico para hipertensión y diabetes (2 fármacos)',
      profesional: 'Dra. Elena Morales',
      rolProfesional: 'Médico Especialista',
      recursoCodigo: 'REC-2026-0419'
    },
    {
      id: 'evt-002',
      fechaHora: '2026-10-18T09:30:00Z',
      tipoEvento: 'CONSULTA',
      titulo: 'Consulta clínica de seguimiento',
      descripcion: 'Evaluación y control periódico de hipertensión arterial y glucemias en ayunas',
      profesional: 'Dra. Elena Morales',
      rolProfesional: 'Médico Especialista',
      recursoCodigo: 'CON-2026-0814'
    },
    {
      id: 'evt-003',
      fechaHora: '2026-08-14T10:15:00Z',
      tipoEvento: 'CONSULTA',
      titulo: 'Control trimestral de parámetros metabólicos',
      descripcion: 'Revisión de hemoglobina glucosilada y ajuste de pauta de actividad física',
      profesional: 'Dra. Elena Morales',
      rolProfesional: 'Médico Especialista'
    },
    {
      id: 'evt-004',
      fechaHora: '2026-05-10T11:00:00Z',
      tipoEvento: 'CONSULTA',
      titulo: 'Atención médica por cefalea',
      descripcion: 'Manejo ambulatorio y monitorización de presión arterial sistémica',
      profesional: 'Dr. Fernando Paz',
      rolProfesional: 'Médico de Consulta Externa'
    },
    {
      id: 'evt-005',
      fechaHora: '2025-01-15T08:30:00Z',
      tipoEvento: 'DIAGNOSTICO',
      titulo: 'Apertura y registro inicial de expediente',
      descripcion: 'Ingreso administrativo y verificación de identificación civil',
      profesional: 'Secretaría de Admisión',
      rolProfesional: 'Personal Administrativo',
      recursoCodigo: 'HC-HOSP-0104'
    }
  ],
  'pac-hosp-002': [
    {
      id: 'evt-101',
      fechaHora: '2026-10-19T09:30:00Z',
      tipoEvento: 'RECETA',
      titulo: 'Receta post-quirúrgica emitida',
      descripcion: 'Analgésico de rescate por 3 días',
      profesional: 'Dra. Elena Morales',
      rolProfesional: 'Médico Especialista',
      recursoCodigo: 'REC-2026-0422'
    },
    {
      id: 'evt-102',
      fechaHora: '2026-10-19T09:15:00Z',
      tipoEvento: 'CONSULTA',
      titulo: 'Revisión clínica y retiro de puntos',
      descripcion: 'Comprobación de cicatrización adecuada tras apendicectomía',
      profesional: 'Dra. Elena Morales',
      rolProfesional: 'Médico Especialista'
    },
    {
      id: 'evt-103',
      fechaHora: '2025-02-10T11:20:00Z',
      tipoEvento: 'DIAGNOSTICO',
      titulo: 'Apertura de expediente clínico',
      descripcion: 'Registro administrativo inicial en hospital',
      profesional: 'Secretaría de Admisión',
      rolProfesional: 'Personal Administrativo',
      recursoCodigo: 'HC-HOSP-0108'
    }
  ]
};
