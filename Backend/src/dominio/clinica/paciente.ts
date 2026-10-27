import { solicitudInvalida } from '../compartido/error-dominio.js';
import type { FechaCivil } from '../compartido/fecha-civil.js';
import { fechaCivil } from '../compartido/fecha-civil.js';
import type { InstanteUTC } from '../compartido/instante-utc.js';
import type { Institucion } from '../compartido/institucion.js';
import type { UUID } from '../compartido/uuid.js';
import type { Version } from '../compartido/version.js';
import { normalizarIdentificacion } from '../compartido/normalizacion.js';

export type Sexo = 'MASCULINO' | 'FEMENINO' | 'OTRO';
export type TipoIdentificacion = 'CUI' | 'PASAPORTE';
export type EstadoPaciente = 'ACTIVO' | 'ARCHIVADO';
export type CausaArchivoPaciente = 'TRASLADO' | 'FALLECIMIENTO' | 'OTRA_ADMINISTRATIVA';

export interface Identificacion {
  readonly tipo: TipoIdentificacion | string;
  readonly numero: string;
}

export interface ContactoEmergencia {
  readonly nombres: string;
  readonly apellidos: string;
  readonly parentesco: string;
  readonly telefono: string;
}

export interface VinculoResponsable {
  readonly responsableId: UUID;
  readonly versionResponsable: Version;
  readonly parentesco: string;
  readonly esPrincipal: boolean;
  readonly autorizaAtencion: boolean;
}

export interface NuevoResponsable {
  readonly documento?: Identificacion;
  readonly nombres: string;
  readonly apellidos: string;
  readonly telefono: string;
  readonly parentesco: string;
  readonly esPrincipal: boolean;
  readonly autorizaAtencion: boolean;
}

export type ResponsableAlta = VinculoResponsable | NuevoResponsable;

export interface ResponsableDetalle {
  readonly id: UUID;
  readonly nombres: string;
  readonly apellidos: string;
  readonly nombre: string;
  readonly telefono: string;
  readonly documento?: Identificacion;
  readonly version: Version;
}

export interface ResponsablePaciente {
  readonly responsable: ResponsableDetalle;
  readonly vinculo: VinculoResponsable;
  readonly versionVinculo: Version;
}

export interface ArchivoRegistrado {
  readonly fecha: InstanteUTC;
  readonly motivo: string;
  readonly causa: CausaArchivoPaciente;
  readonly actorId: UUID;
}

export interface Paciente {
  readonly id: UUID;
  readonly codigoLegible: string;
  readonly institucion: Institucion;
  readonly nombres: string;
  readonly apellidos: string;
  readonly fechaNacimiento?: FechaCivil;
  readonly sexo: Sexo;
  readonly identificacion?: Identificacion;
  readonly telefono?: string;
  readonly correo?: string;
  readonly direccion?: string;
  readonly grupoSanguineo?: string;
  readonly contactoEmergencia?: ContactoEmergencia;
  readonly estado: EstadoPaciente;
  readonly version: Version;
  readonly fechaRegistro: InstanteUTC;
  readonly responsables?: readonly ResponsablePaciente[];
  readonly baja?: ArchivoRegistrado;
}

const GRUPOS_SANGUINEOS_VALIDOS: readonly string[] = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
];

export function validarSexo(valor: unknown, campo = 'sexo'): Sexo {
  if (typeof valor !== 'string' || !['MASCULINO', 'FEMENINO', 'OTRO'].includes(valor)) {
    throw solicitudInvalida('El sexo debe ser MASCULINO, FEMENINO u OTRO.', campo);
  }
  return valor as Sexo;
}

export function validarIdentificacion(valor: unknown, campo = 'identificacion'): Identificacion {
  if (typeof valor !== 'object' || valor === null) {
    throw solicitudInvalida('La identificación debe ser un objeto válido.', campo);
  }
  const obj = valor as Record<string, unknown>;
  if (typeof obj.tipo !== 'string' || (obj.tipo !== 'CUI' && obj.tipo !== 'PASAPORTE')) {
    throw solicitudInvalida('El tipo de identificación debe ser CUI o PASAPORTE.', `${campo}.tipo`);
  }
  if (typeof obj.numero !== 'string' || obj.numero.trim().length === 0) {
    throw solicitudInvalida('El número de identificación no puede estar vacío.', `${campo}.numero`);
  }
  const limiteCaptura = obj.tipo === 'CUI' ? 20 : 40;
  if (obj.numero.length > limiteCaptura) {
    throw solicitudInvalida('El número excede el límite de captura.', `${campo}.numero`);
  }
  const clave = normalizarIdentificacion(obj.tipo, obj.numero);
  const canonico = clave.slice(obj.tipo.length + 1);
  if (canonico.length > limiteCaptura) {
    throw solicitudInvalida('El número excede el límite de captura.', `${campo}.numero`);
  }
  return Object.freeze({
    tipo: obj.tipo,
    numero: obj.numero.trim(),
  });
}

export function validarTextoNoVacio(valor: unknown, nombreCampo: string, maximo = 200): string {
  if (typeof valor !== 'string') {
    throw solicitudInvalida(`El campo ${nombreCampo} debe ser texto.`, nombreCampo);
  }
  const recortado = valor.trim();
  if (recortado.length === 0) {
    throw solicitudInvalida(`El campo ${nombreCampo} no puede estar vacío.`, nombreCampo);
  }
  if ([...recortado].length > maximo) {
    throw solicitudInvalida(`El campo ${nombreCampo} excede el máximo de ${maximo} caracteres.`, nombreCampo);
  }
  return recortado;
}

export function validarFechaNacimiento(fecha: unknown, fechaLimiteCivil: string, campo = 'fecha_nacimiento'): FechaCivil {
  const fc = fechaCivil(fecha, campo);
  if (fc > fechaLimiteCivil) {
    throw solicitudInvalida('La fecha de nacimiento no puede estar en el futuro.', campo);
  }
  return fc;
}

export function validarGrupoSanguineo(institucion: Institucion, valor: unknown, campo = 'grupo_sanguineo'): string | undefined {
  if (valor === undefined || valor === null) return undefined;
  if (institucion !== 'HOSPITAL_GENERAL') {
    throw solicitudInvalida('El grupo sanguíneo solo aplica a HOSPITAL_GENERAL.', campo);
  }
  if (typeof valor !== 'string') {
    throw solicitudInvalida('El grupo sanguíneo debe ser texto.', campo);
  }
  const recortado = valor.trim().toUpperCase();
  if (!GRUPOS_SANGUINEOS_VALIDOS.includes(recortado)) {
    throw solicitudInvalida('El grupo sanguíneo debe ser uno de: A+, A-, B+, B-, AB+, AB-, O+, O-.', campo);
  }
  return recortado;
}

export function validarContactoEmergencia(institucion: Institucion, valor: unknown, campo = 'contacto_emergencia'): ContactoEmergencia | undefined {
  if (valor === undefined || valor === null) return undefined;
  if (institucion !== 'HOSPITAL_GENERAL') {
    throw solicitudInvalida('El contacto de emergencia solo aplica a HOSPITAL_GENERAL.', campo);
  }
  if (typeof valor !== 'object') {
    throw solicitudInvalida('El contacto de emergencia debe ser un objeto.', campo);
  }
  const obj = valor as Record<string, unknown>;
  const nombres = validarTextoNoVacio(obj.nombres, `${campo}.nombres`, 80);
  const apellidos = validarTextoNoVacio(obj.apellidos, `${campo}.apellidos`, 80);
  const parentesco = validarTextoNoVacio(obj.parentesco, `${campo}.parentesco`, 60);
  const telefono = validarTextoNoVacio(obj.telefono, `${campo}.telefono`, 30);
  return Object.freeze({
    nombres,
    apellidos,
    parentesco,
    telefono,
  });
}

export function generarCodigoLegible(institucion: Institucion, id: UUID): string {
  const prefijos: Record<Institucion, string> = {
    HOSPITAL_GENERAL: 'HOSP',
    CLINICA_ODONTOLOGICA: 'DENT',
    LABORATORIO_CLINICO: 'LAB',
    CENTRO_MEDICO_PEDIATRICO: 'PED',
  };
  const prefijo = prefijos[institucion] ?? 'PAC';
  const hex = id.replace(/-/g, '').toUpperCase();
  return `${prefijo}-${hex}`;
}
