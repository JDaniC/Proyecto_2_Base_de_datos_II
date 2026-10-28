import { createHash } from 'node:crypto';
import type { Document } from 'mongodb';
import type { Paciente, CausaArchivoPaciente } from '../../../../dominio/clinica/paciente.js';
import { fechaCivil } from '../../../../dominio/compartido/fecha-civil.js';
import { instanteUtc } from '../../../../dominio/compartido/instante-utc.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../../dominio/compartido/version.js';
import { derivarClaveIdentificacion, normalizarTextoBusqueda } from '../../../../dominio/compartido/normalizacion.js';

export interface ContactoMongo {
  contacto_id: string;
  tipo: 'TELEFONO' | 'CORREO';
  valor: string;
  es_principal: boolean;
}

export interface DocumentoPacienteMongo extends Document {
  _id: string;
  revision: number;
  codigo_paciente: string;
  primer_nombre: string;
  segundo_nombre?: string;
  primer_apellido: string;
  segundo_apellido?: string;
  nombre_busqueda: string;
  claves_nombre?: string[];
  numero_busqueda?: string;
  tipo_documento?: string;
  numero_documento?: string;
  fecha_nacimiento?: Date;
  sexo_referencia?: string;
  direccion?: string;
  contactos: ContactoMongo[];
  fecha_registro: Date;
  activo: boolean;
  historial: {
    id_historial: string;
    numero_historial: string;
    fecha_apertura: Date;
    estado: 'ACTIVO' | 'ARCHIVADO';
    baja?: { causa: CausaArchivoPaciente; motivo: string; fecha: Date; actor_id: string };
  };
}

export function clavesNombre(nombres: string, apellidos: string): string[] {
  const palabras = normalizarTextoBusqueda(`${nombres} ${apellidos}`).split(' ');
  return [...new Set(palabras.map((_, i) => palabras.slice(i).join(' ')))];
}

export function identidadMongo(tipo: string, numero: string): { tipo_documento: string; numero_documento: string } {
  const clave = derivarClaveIdentificacion(tipo, numero);
  const separador = tipo.trim().toUpperCase().length;
  return { tipo_documento: clave.slice(0, separador), numero_documento: clave.slice(separador + 1) };
}

export function idReservaMongo(tipo: string, numero: string): string {
  return createHash('sha256').update(JSON.stringify([tipo, numero])).digest('hex');
}

/** Identificador estable, sin aleatoriedad dentro de callbacks repetibles. */
export function idContacto(pacienteId: string, tipo: string): string {
  const hash = createHash('sha256').update(`${pacienteId}:principal:${tipo}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export function mapearPacienteMongodb(doc: DocumentoPacienteMongo): Paciente {
  const nombres = [doc.primer_nombre, doc.segundo_nombre].filter(Boolean).join(' ');
  const apellidos = [doc.primer_apellido, doc.segundo_apellido].filter(Boolean).join(' ');
  const principal = (tipo: ContactoMongo['tipo']) => doc.contactos.find((c) => c.tipo === tipo && c.es_principal)?.valor;
  const telefono = principal('TELEFONO');
  const correo = principal('CORREO');
  return Object.freeze({
    id: uuidPublico(doc._id), codigoLegible: doc.codigo_paciente, institucion: 'LABORATORIO_CLINICO',
    nombres, apellidos,
    fechaNacimiento: doc.fecha_nacimiento ? fechaCivil(doc.fecha_nacimiento.toISOString().slice(0, 10)) : null,
    sexo: doc.sexo_referencia ?? null,
    ...(doc.tipo_documento && doc.numero_documento ? { identificacion: { tipo: doc.tipo_documento, numero: doc.numero_documento } } : {}),
    ...(telefono !== undefined ? { telefono } : {}), ...(correo !== undefined ? { correo } : {}),
    ...(doc.direccion !== undefined ? { direccion: doc.direccion } : {}),
    estado: doc.historial.estado, version: versionPositiva(doc.revision),
    fechaRegistro: instanteUtc(doc.fecha_registro.toISOString()),
    ...(doc.historial.baja ? { baja: {
      causa: doc.historial.baja.causa, motivo: doc.historial.baja.motivo,
      fecha: instanteUtc(doc.historial.baja.fecha.toISOString()), actorId: uuidPublico(doc.historial.baja.actor_id),
    } } : {}),
  });
}
