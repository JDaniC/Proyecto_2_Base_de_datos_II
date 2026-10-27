import type {
  Paciente,
  Identificacion,
  ContactoEmergencia,
  ResponsablePaciente,
  ArchivoRegistrado,
  Sexo,
  EstadoPaciente,
} from '../../../dominio/clinica/paciente.js';
import type { Institucion } from '../../../dominio/compartido/institucion.js';

export interface ResponsableAltaEntrada {
  readonly responsable_id?: string;
  readonly version_responsable?: number;
  readonly parentesco: string;
  readonly es_principal: boolean;
  readonly autoriza_atencion: boolean;
  readonly nombres?: string;
  readonly apellidos?: string;
  readonly telefono?: string;
  readonly documento?: Identificacion;
}

export interface AltaPacienteEntrada {
  readonly nombres: string;
  readonly apellidos: string;
  readonly fecha_nacimiento: string;
  readonly sexo: Sexo;
  readonly identificacion?: Identificacion;
  readonly telefono?: string;
  readonly correo?: string;
  readonly direccion?: string;
  readonly grupo_sanguineo?: string;
  readonly contacto_emergencia?: ContactoEmergencia;
  readonly responsables?: readonly ResponsableAltaEntrada[];
}

export interface CambioPacienteEntrada {
  readonly version_esperada: number;
  readonly nombres?: string;
  readonly apellidos?: string;
  readonly fecha_nacimiento?: string;
  readonly sexo?: Sexo;
  readonly identificacion?: Identificacion | null;
  readonly telefono?: string | null;
  readonly correo?: string | null;
  readonly direccion?: string | null;
  readonly grupo_sanguineo?: string | null;
  readonly contacto_emergencia?: ContactoEmergencia | null;
}

export interface BuscarPacientesEntrada {
  readonly q: string;
  readonly cursor?: string;
  readonly limite?: number;
  readonly orden?: 'ASC' | 'DESC';
  readonly estado?: EstadoPaciente | 'TODOS';
}

export interface PacienteDto {
  readonly id: string;
  readonly codigo_legible: string;
  readonly institucion: Institucion;
  readonly nombres: string;
  readonly apellidos: string;
  readonly fecha_nacimiento: string;
  readonly sexo: Sexo;
  readonly identificacion?: Identificacion;
  readonly telefono?: string;
  readonly correo?: string;
  readonly direccion?: string;
  readonly grupo_sanguineo?: string;
  readonly contacto_emergencia?: ContactoEmergencia;
  readonly estado: EstadoPaciente;
  readonly version: number;
  readonly fecha_registro: string;
  readonly responsables?: readonly ResponsablePaciente[];
  readonly baja?: ArchivoRegistrado;
}

export interface RespuestaPacienteDto {
  readonly data: PacienteDto;
  readonly meta: { readonly correlacion: string };
}

export interface RespuestaPacientesDto {
  readonly data: readonly PacienteDto[];
  readonly meta: {
    readonly correlacion: string;
    readonly siguiente_cursor?: string;
  };
}

export function mapearPacienteDto(paciente: Paciente): PacienteDto {
  return Object.freeze({
    id: paciente.id,
    codigo_legible: paciente.codigoLegible,
    institucion: paciente.institucion,
    nombres: paciente.nombres,
    apellidos: paciente.apellidos,
    fecha_nacimiento: paciente.fechaNacimiento,
    sexo: paciente.sexo,
    ...(paciente.identificacion ? { identificacion: paciente.identificacion } : {}),
    ...(paciente.telefono !== undefined ? { telefono: paciente.telefono } : {}),
    ...(paciente.correo !== undefined ? { correo: paciente.correo } : {}),
    ...(paciente.direccion !== undefined ? { direccion: paciente.direccion } : {}),
    ...(paciente.grupoSanguineo !== undefined ? { grupo_sanguineo: paciente.grupoSanguineo } : {}),
    ...(paciente.contactoEmergencia ? { contacto_emergencia: paciente.contactoEmergencia } : {}),
    estado: paciente.estado,
    version: paciente.version,
    fecha_registro: paciente.fechaRegistro,
    ...(paciente.responsables && paciente.responsables.length > 0 ? { responsables: paciente.responsables } : {}),
    ...(paciente.baja ? { baja: paciente.baja } : {}),
  });
}
