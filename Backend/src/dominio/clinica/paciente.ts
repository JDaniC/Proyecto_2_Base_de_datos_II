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
  readonly tipo: TipoIdentificacion;
  readonly numero: string;
}

export interface ContactoEmergencia {
  readonly nombre: string;
  readonly telefono: string;
  readonly relacion?: string;
}

export interface VinculoResponsable {
  readonly responsableId: UUID;
  readonly versionResponsable: Version;
  readonly parentesco: string;
  readonly esPrincipal: boolean;
  readonly autorizaAtencion: boolean;
}

export interface NuevoResponsable {
  readonly documento: Identificacion;
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
  readonly documento: Identificacion;
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
  readonly fechaNacimiento: FechaCivil;
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
  // Normalizar y comprobar que cumple el formato
  normalizarIdentificacion(obj.tipo, obj.numero);
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
  if (typeof valor !== 'string') {
    throw solicitudInvalida('El grupo sanguíneo debe ser texto.', campo);
  }
  const recortado = valor.trim().toUpperCase();
  if (!GRUPOS_SANGUINEOS_VALIDOS.includes(recortado)) {
    throw solicitudInvalida('El grupo sanguíneo debe ser uno de: A+, A-, B+, B-, AB+, AB-, O+, O-.', campo);
  }
  return recortado;
}

export function validarContactoEmergencia(valor: unknown, campo = 'contacto_emergencia'): ContactoEmergencia | undefined {
  if (valor === undefined || valor === null) return undefined;
  if (typeof valor !== 'object') {
    throw solicitudInvalida('El contacto de emergencia debe ser un objeto.', campo);
  }
  const obj = valor as Record<string, unknown>;
  const nombre = validarTextoNoVacio(obj.nombre, `${campo}.nombre`, 200);
  const telefono = validarTextoNoVacio(obj.telefono, `${campo}.telefono`, 30);
  const relacion = typeof obj.relacion === 'string' && obj.relacion.trim().length > 0
    ? obj.relacion.trim().slice(0, 80)
    : undefined;
  return Object.freeze({
    nombre,
    telefono,
    ...(relacion !== undefined ? { relacion } : {}),
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
  const corto = id.replace(/-/g, '').slice(0, 6).toUpperCase();
  return `${prefijo}-${corto}`;
}
