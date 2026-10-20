import { Paciente } from '../services/types';

export const MOCK_PACIENTES_INICIALES: Paciente[] = [
  // --- Hospital General San Juan ---
  {
    id: 'pac-hosp-001',
    codigoLegible: 'HC-HOSP-0104',
    institucionId: 'HOSPITAL_GENERAL',
    nombres: 'Roberto',
    apellidos: 'Estrada Morales',
    nombreCompleto: 'Roberto Estrada Morales',
    fechaNacimiento: '1972-04-12',
    edadAnios: 54,
    sexo: 'MASCULINO',
    tipoIdentificacion: 'CUI',
    numeroIdentificacion: '9900-10101-0101',
    telefono: '5555-0104',
    correo: 'roberto.estrada@paciente-demo.gt',
    direccion: 'Zona 1, Ciudad de Guatemala',
    estado: 'ACTIVO',
    estadoAlergias: 'CON_ALERGIAS',
    contactoEmergencia: {
      nombre: 'Marta Estrada',
      parentesco: 'Esposa',
      telefono: '5555-1001'
    },
    fechaRegistro: '2025-01-15T08:30:00Z',
    historialConsultasCount: 6
  },
  {
    id: 'pac-hosp-002',
    codigoLegible: 'HC-HOSP-0108',
    institucionId: 'HOSPITAL_GENERAL',
    nombres: 'Claudia',
    apellidos: 'Méndez Arriola',
    nombreCompleto: 'Claudia Méndez Arriola',
    fechaNacimiento: '1985-08-23',
    edadAnios: 41,
    sexo: 'FEMENINO',
    tipoIdentificacion: 'CUI',
    numeroIdentificacion: '9900-10102-0101',
    telefono: '5555-0108',
    correo: 'claudia.mendez@paciente-demo.gt',
    direccion: 'Zona 11, Mixco, Guatemala',
    estado: 'ACTIVO',
    estadoAlergias: 'SIN_VERIFICAR',
    contactoEmergencia: {
      nombre: 'Jorge Méndez',
      parentesco: 'Hermano',
      telefono: '5555-1002'
    },
    fechaRegistro: '2025-02-10T11:20:00Z',
    historialConsultasCount: 3
  },
  {
    id: 'pac-hosp-003',
    codigoLegible: 'HC-HOSP-0112',
    institucionId: 'HOSPITAL_GENERAL',
    nombres: 'Carlos',
    apellidos: 'Villagrán Sagastume',
    nombreCompleto: 'Carlos Villagrán Sagastume',
    fechaNacimiento: '1964-11-03',
    edadAnios: 61,
    sexo: 'MASCULINO',
    tipoIdentificacion: 'CUI',
    numeroIdentificacion: '9900-10103-0101',
    telefono: '5555-0112',
    correo: 'carlos.villagran@paciente-demo.gt',
    direccion: 'Zona 7, Quinta Samayoa, Guatemala',
    estado: 'ACTIVO',
    estadoAlergias: 'SIN_ALERGIAS_CONOCIDAS',
    contactoEmergencia: {
      nombre: 'Lucía Villagrán',
      parentesco: 'Hija',
      telefono: '5555-1003'
    },
    fechaRegistro: '2025-03-01T09:15:00Z',
    historialConsultasCount: 8
  },
  {
    id: 'pac-hosp-004',
    codigoLegible: 'HC-HOSP-0115',
    institucionId: 'HOSPITAL_GENERAL',
    nombres: 'Patricia',
    apellidos: 'Gómez de León',
    nombreCompleto: 'Patricia Gómez de León',
    fechaNacimiento: '1989-02-17',
    edadAnios: 37,
    sexo: 'FEMENINO',
    tipoIdentificacion: 'CUI',
    numeroIdentificacion: '9900-10104-0101',
    telefono: '5555-0115',
    correo: 'patricia.gomez@paciente-demo.gt',
    direccion: 'Zona 10, Ciudad de Guatemala',
    estado: 'ACTIVO',
    estadoAlergias: 'CON_ALERGIAS',
    contactoEmergencia: {
      nombre: 'Andrés Gómez',
      parentesco: 'Esposo',
      telefono: '5555-1004'
    },
    fechaRegistro: '2025-03-20T14:45:00Z',
    historialConsultasCount: 2
  },
  {
    id: 'pac-hosp-005',
    codigoLegible: 'HC-HOSP-0120',
    institucionId: 'HOSPITAL_GENERAL',
    nombres: 'Fernando',
    apellidos: 'Castillo Ruiz',
    nombreCompleto: 'Fernando Castillo Ruiz',
    fechaNacimiento: '1997-06-30',
    edadAnios: 29,
    sexo: 'MASCULINO',
    tipoIdentificacion: 'CUI',
    numeroIdentificacion: '9900-10105-0101',
    telefono: '5555-0120',
    correo: 'fernando.castillo@paciente-demo.gt',
    direccion: 'Carretera a El Salvador Km 14',
    estado: 'ACTIVO',
    estadoAlergias: 'SIN_VERIFICAR',
    contactoEmergencia: {
      nombre: 'Rosa Ruiz',
      parentesco: 'Madre',
      telefono: '5555-1005'
    },
    fechaRegistro: '2025-04-05T10:00:00Z',
    historialConsultasCount: 1
  },
  {
    id: 'pac-hosp-006',
    codigoLegible: 'HC-HOSP-0125',
    institucionId: 'HOSPITAL_GENERAL',
    nombres: 'Brenda Elizabeth',
    apellidos: 'Morales Cifuentes',
    nombreCompleto: 'Brenda Elizabeth Morales Cifuentes',
    fechaNacimiento: '1978-09-14',
    edadAnios: 48,
    sexo: 'FEMENINO',
    tipoIdentificacion: 'CUI',
    numeroIdentificacion: '9900-10106-0101',
    telefono: '5555-0125',
    correo: 'brenda.morales@paciente-demo.gt',
    direccion: 'Zona 2, Ciudad Nueva, Guatemala',
    estado: 'ACTIVO',
    estadoAlergias: 'SIN_ALERGIAS_CONOCIDAS',
    fechaRegistro: '2025-04-18T16:10:00Z',
    historialConsultasCount: 4
  },
  {
    id: 'pac-hosp-007',
    codigoLegible: 'HC-HOSP-0130',
    institucionId: 'HOSPITAL_GENERAL',
    nombres: 'Gustavo Adolfo',
    apellidos: 'Salazar Marroquín',
    nombreCompleto: 'Gustavo Adolfo Salazar Marroquín',
    fechaNacimiento: '1955-01-20',
    edadAnios: 71,
    sexo: 'MASCULINO',
    tipoIdentificacion: 'CUI',
    numeroIdentificacion: '9900-10107-0101',
    telefono: '5555-0130',
    correo: 'gustavo.salazar@paciente-demo.gt',
    direccion: 'Zona 5, Jardines de la Asunción',
    estado: 'ARCHIVADO',
    estadoAlergias: 'SIN_VERIFICAR',
    fechaRegistro: '2024-11-12T08:00:00Z',
    historialConsultasCount: 9
  },

  // --- Clínica Odontológica ---
  {
    id: 'pac-odon-001',
    codigoLegible: 'HC-ODON-0201',
    institucionId: 'CLINICA_ODONTOLOGICA',
    nombres: 'María Fernanda',
    apellidos: 'López Barillas',
    nombreCompleto: 'María Fernanda López Barillas',
    fechaNacimiento: '1993-03-15',
    edadAnios: 33,
    sexo: 'FEMENINO',
    tipoIdentificacion: 'CUI',
    numeroIdentificacion: '9900-20101-0101',
    telefono: '5555-0201',
    correo: 'fernanda.lopez@paciente-demo.gt',
    direccion: 'Zona 14, La Villa, Guatemala',
    estado: 'ACTIVO',
    estadoAlergias: 'SIN_ALERGIAS_CONOCIDAS',
    fechaRegistro: '2025-01-20T10:15:00Z',
    historialConsultasCount: 3
  },
  {
    id: 'pac-odon-002',
    codigoLegible: 'HC-ODON-0205',
    institucionId: 'CLINICA_ODONTOLOGICA',
    nombres: 'Sergio Estuardo',
    apellidos: 'Ramos Aguilar',
    nombreCompleto: 'Sergio Estuardo Ramos Aguilar',
    fechaNacimiento: '1999-05-18',
    edadAnios: 27,
    sexo: 'MASCULINO',
    tipoIdentificacion: 'CUI',
    numeroIdentificacion: '9900-20102-0101',
    telefono: '5555-0205',
    correo: 'sergio.ramos@paciente-demo.gt',
    direccion: 'Zona 9, Guatemala',
    estado: 'ACTIVO',
    estadoAlergias: 'SIN_VERIFICAR',
    fechaRegistro: '2025-02-14T14:30:00Z',
    historialConsultasCount: 2
  },
  {
    id: 'pac-odon-003',
    codigoLegible: 'HC-ODON-0208',
    institucionId: 'CLINICA_ODONTOLOGICA',
    nombres: 'Sandra Maribel',
    apellidos: 'Contreras Solís',
    nombreCompleto: 'Sandra Maribel Contreras Solís',
    fechaNacimiento: '1981-10-12',
    edadAnios: 45,
    sexo: 'FEMENINO',
    tipoIdentificacion: 'CUI',
    numeroIdentificacion: '9900-20103-0101',
    telefono: '5555-0208',
    correo: 'sandra.contreras@paciente-demo.gt',
    direccion: 'Zona 12, Ciudad de Plata',
    estado: 'ACTIVO',
    estadoAlergias: 'CON_ALERGIAS',
    fechaRegistro: '2025-03-05T09:00:00Z',
    historialConsultasCount: 5
  },

  // --- Laboratorio Clínico ---
  {
    id: 'pac-lab-001',
    codigoLegible: 'HC-LAB-0301',
    institucionId: 'LABORATORIO_CLINICO',
    nombres: 'Eduardo René',
    apellidos: 'Fuentes Maldonado',
    nombreCompleto: 'Eduardo René Fuentes Maldonado',
    fechaNacimiento: '1977-04-02',
    edadAnios: 49,
    sexo: 'MASCULINO',
    tipoIdentificacion: 'CUI',
    numeroIdentificacion: '9900-30101-0101',
    telefono: '5555-0301',
    correo: 'eduardo.fuentes@paciente-demo.gt',
    direccion: 'Zona 15, Vista Hermosa I',
    estado: 'ACTIVO',
    estadoAlergias: 'SIN_ALERGIAS_CONOCIDAS',
    fechaRegistro: '2025-01-10T08:00:00Z',
    historialConsultasCount: 1
  },
  {
    id: 'pac-lab-002',
    codigoLegible: 'HC-LAB-0304',
    institucionId: 'LABORATORIO_CLINICO',
    nombres: 'Silvia Eugenia',
    apellidos: 'Cabrera Godínez',
    nombreCompleto: 'Silvia Eugenia Cabrera Godínez',
    fechaNacimiento: '1990-09-19',
    edadAnios: 36,
    sexo: 'FEMENINO',
    tipoIdentificacion: 'CUI',
    numeroIdentificacion: '9900-30102-0101',
    telefono: '5555-0304',
    correo: 'silvia.cabrera@paciente-demo.gt',
    direccion: 'Zona 16, San Gaspar',
    estado: 'ACTIVO',
    estadoAlergias: 'SIN_VERIFICAR',
    fechaRegistro: '2025-02-22T10:45:00Z',
    historialConsultasCount: 2
  },

  // --- Centro Médico Pediátrico ---
  {
    id: 'pac-ped-001',
    codigoLegible: 'HC-PED-0401',
    institucionId: 'CENTRO_PEDIATRICO',
    nombres: 'Mateo Nicolás',
    apellidos: 'Álvarez Arrecis',
    nombreCompleto: 'Mateo Nicolás Álvarez Arrecis',
    fechaNacimiento: '2022-05-10',
    edadAnios: 4,
    sexo: 'MASCULINO',
    tipoIdentificacion: 'SIN_DOCUMENTO_MENOR',
    numeroIdentificacion: 'MENOR-PED-0401',
    telefono: '5555-0401',
    correo: 'tutor.mateo@familia-demo.gt',
    direccion: 'Zona 11, Las Charcas, Guatemala',
    estado: 'ACTIVO',
    estadoAlergias: 'CON_ALERGIAS',
    responsables: [
      {
        id: 'resp-001',
        nombre: 'Andrea Arrecis de Álvarez',
        parentesco: 'Madre',
        telefono: '5555-9401',
        documento: '9900-40901-0101',
        esPrincipal: true,
        autorizaAtencion: true
      }
    ],
    fechaRegistro: '2025-01-05T09:30:00Z',
    historialConsultasCount: 7
  },
  {
    id: 'pac-ped-002',
    codigoLegible: 'HC-PED-0405',
    institucionId: 'CENTRO_PEDIATRICO',
    nombres: 'Sofía Valentina',
    apellidos: 'Lemus Monroy',
    nombreCompleto: 'Sofía Valentina Lemus Monroy',
    fechaNacimiento: '2019-08-14',
    edadAnios: 7,
    sexo: 'FEMENINO',
    tipoIdentificacion: 'SIN_DOCUMENTO_MENOR',
    numeroIdentificacion: 'MENOR-PED-0405',
    telefono: '5555-0405',
    correo: 'tutor.sofia@familia-demo.gt',
    direccion: 'Zona 13, Aurora II',
    estado: 'ACTIVO',
    estadoAlergias: 'SIN_VERIFICAR',
    responsables: [
      {
        id: 'resp-002',
        nombre: 'Carlos Lemus Pinto',
        parentesco: 'Padre',
        telefono: '5555-9402',
        documento: '9900-40902-0101',
        esPrincipal: true,
        autorizaAtencion: true
      }
    ],
    fechaRegistro: '2025-02-18T11:00:00Z',
    historialConsultasCount: 4
  },
  {
    id: 'pac-ped-003',
    codigoLegible: 'HC-PED-0409',
    institucionId: 'CENTRO_PEDIATRICO',
    nombres: 'Lucas Gabriel',
    apellidos: 'Orozco Valenzuela',
    nombreCompleto: 'Lucas Gabriel Orozco Valenzuela',
    fechaNacimiento: '2015-02-03',
    edadAnios: 11,
    sexo: 'MASCULINO',
    tipoIdentificacion: 'CUI',
    numeroIdentificacion: '9900-40103-0101',
    telefono: '5555-0409',
    correo: 'tutor.lucas@familia-demo.gt',
    direccion: 'Zona 1, Centro Histórico',
    estado: 'ACTIVO',
    estadoAlergias: 'SIN_ALERGIAS_CONOCIDAS',
    responsables: [
      {
        id: 'resp-003',
        nombre: 'Marcela Valenzuela de Orozco',
        parentesco: 'Madre',
        telefono: '5555-9403',
        documento: '9900-40903-0101',
        esPrincipal: true,
        autorizaAtencion: true
      }
    ],
    fechaRegistro: '2025-03-12T15:20:00Z',
    historialConsultasCount: 5
  }
];

export function calcularEdadAnios(fechaNacimiento: string): number {
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) {
    edad--;
  }
  return Math.max(0, edad);
}

export function normalizarIdentificacion(valor: string): string {
  return valor.trim().replace(/\s+/g, '').toUpperCase();
}
