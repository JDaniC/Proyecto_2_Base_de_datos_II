export interface CatalogoCIE10Item {
  codigo: string;
  nombre: string;
  categoria?: string;
}

export const CATALOGO_CIE10: CatalogoCIE10Item[] = [
  { codigo: 'I10', nombre: 'Hipertensión esencial (primaria)', categoria: 'Cardiovascular' },
  { codigo: 'E11.9', nombre: 'Diabetes mellitus tipo 2 sin mención de complicación', categoria: 'Metabólico' },
  { codigo: 'J00', nombre: 'Rinofaringitis aguda (resfriado común)', categoria: 'Respiratorio' },
  { codigo: 'J06.9', nombre: 'Infección respiratoria aguda de las vías superiores', categoria: 'Respiratorio' },
  { codigo: 'J45.9', nombre: 'Asma bronquial no especificada', categoria: 'Respiratorio' },
  { codigo: 'K29.7', nombre: 'Gastritis no especificada', categoria: 'Gastrointestinal' },
  { codigo: 'K35.8', nombre: 'Apendicitis aguda no especificada (resuelta)', categoria: 'Quirúrgico' },
  { codigo: 'M54.5', nombre: 'Lumbago no especificado', categoria: 'Musculoesquelético' },
  { codigo: 'R51', nombre: 'Cefalea', categoria: 'Neurológico' },
  { codigo: 'Z00.0', nombre: 'Examen médico general de rutina', categoria: 'Preventivo' },
  { codigo: 'K02.1', nombre: 'Caries de la dentina (Odontología)', categoria: 'Odontología' },
  { codigo: 'K05.0', nombre: 'Gingivitis aguda marginal (Odontología)', categoria: 'Odontología' },
  { codigo: 'Z00.1', nombre: 'Control de salud de rutina del niño y desarrollo (Pediatría)', categoria: 'Pediatría' }
];

export interface CatalogoMedicamentoItem {
  nombre: string;
  presentacion: string;
  concentracion: string;
  via: string;
  frecuencia: string;
  duracion: string;
}

export const MEDICAMENTOS_SUGERIDOS: CatalogoMedicamentoItem[] = [
  { nombre: 'Losartán Potásico', presentacion: 'Comprimido', concentracion: '50 mg', via: 'Oral', frecuencia: 'Cada 12 horas', duracion: '90 días' },
  { nombre: 'Metformina Clorhidrato', presentacion: 'Tableta', concentracion: '850 mg', via: 'Oral', frecuencia: 'Cada 12 horas', duracion: '90 días' },
  { nombre: 'Amoxicilina + Ácido Clavulánico', presentacion: 'Tableta', concentracion: '500/125 mg', via: 'Oral', frecuencia: 'Cada 8 horas', duracion: '7 días' },
  { nombre: 'Paracetamol', presentacion: 'Tableta', concentracion: '500 mg', via: 'Oral', frecuencia: 'Cada 8 horas', duracion: '3 días' },
  { nombre: 'Ibuprofeno', presentacion: 'Tableta', concentracion: '400 mg', via: 'Oral', frecuencia: 'Cada 8 horas', duracion: '5 días' },
  { nombre: 'Omeprazol', presentacion: 'Cápsula', concentracion: '20 mg', via: 'Oral', frecuencia: 'Cada 24 horas en ayunas', duracion: '30 días' }
];
