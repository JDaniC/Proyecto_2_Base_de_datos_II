import type { FechaCivil } from '../../../../dominio/compartido/fecha-civil.js';
import { fechaCivil } from '../../../../dominio/compartido/fecha-civil.js';
import { instanteUtc } from '../../../../dominio/compartido/instante-utc.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../../dominio/compartido/version.js';
import {
  type CausaArchivoPaciente,
  type EstadoPaciente,
  type Identificacion,
  type Paciente,
  type Sexo,
  generarCodigoLegible,
  validarSexo,
} from '../../../../dominio/clinica/paciente.js';

export interface FilaPacienteMysql extends Record<string, unknown> {
  id_paciente: number | string;
  id_publico: string;
  revision: number | string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string | null;
  sexo?: string | null;
  telefono: string | null;
  correo: string | null;
  direccion?: string | null;
  estado: string;
  fecha_registro?: string | null;
  clave_identidad_activa?: string | null;
  historial_estado: string | null;
  fecha_apertura: string | null;
  causa_baja: string | null;
  motivo_baja: string | null;
  fecha_baja: string | null;
  actor_baja: string | null;
  tipo_documento: string | null;
  numero_documento: string | null;
}

function convertirNumero(valor: unknown): number {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && /^\d+$/.test(valor.trim())) return Number(valor.trim());
  return Number.NaN;
}

export function mapearFilaPacienteMysql(fila: FilaPacienteMysql): Paciente {
  const idPublico = uuidPublico(fila.id_publico, 'id_publico');
  const codigoLegible = generarCodigoLegible('CLINICA_ODONTOLOGICA', idPublico);

  let identificacion: Identificacion | undefined;
  if (fila.tipo_documento && fila.numero_documento) {
    identificacion = Object.freeze({
      tipo: fila.tipo_documento.trim(),
      numero: fila.numero_documento.trim(),
    });
  }

  const estadoHistorial = fila.historial_estado?.trim();
  const estadoPaciente = fila.estado?.trim();
  const estado: EstadoPaciente = (estadoHistorial === 'ARCHIVADO' || estadoPaciente === 'INACTIVO')
    ? 'ARCHIVADO'
    : 'ACTIVO';

  let baja: Paciente['baja'];
  if (estado === 'ARCHIVADO' && fila.fecha_baja) {
    baja = Object.freeze({
      fecha: instanteUtc(new Date(fila.fecha_baja).toISOString()),
      motivo: (fila.motivo_baja ?? 'Sin motivo registrado').trim(),
      causa: (fila.causa_baja ?? 'OTRA_ADMINISTRATIVA') as CausaArchivoPaciente,
      actorId: uuidPublico(fila.actor_baja ?? idPublico),
    });
  }

  let fechaNacimiento: FechaCivil | undefined = undefined;
  if (fila.fecha_nacimiento) {
    try {
      fechaNacimiento = fechaCivil(fila.fecha_nacimiento.trim().slice(0, 10));
    } catch {
      // conservar fecha indefinida ante datos legados no interpretables
    }
  }

  let sexo: Sexo = 'OTRO';
  if (fila.sexo) {
    try {
      sexo = validarSexo(fila.sexo.trim());
    } catch {
      sexo = 'OTRO';
    }
  }

  const fechaRegistroIso = typeof fila.fecha_registro === 'string'
    ? fila.fecha_registro
    : fila.fecha_apertura
      ? (typeof fila.fecha_apertura === 'string' ? fila.fecha_apertura : new Date(fila.fecha_apertura).toISOString())
      : new Date().toISOString();

  return Object.freeze({
    id: idPublico,
    codigoLegible,
    institucion: 'CLINICA_ODONTOLOGICA',
    nombres: (fila.nombres ?? 'Sin nombre').trim(),
    apellidos: (fila.apellidos ?? 'Sin apellido').trim(),
    ...(fechaNacimiento ? { fechaNacimiento } : {}),
    sexo,
    ...(identificacion ? { identificacion } : {}),
    ...(fila.telefono && fila.telefono.trim().length > 0
      ? { telefono: fila.telefono.trim() }
      : {}),
    ...(fila.correo && fila.correo.trim().length > 0
      ? { correo: fila.correo.trim() }
      : {}),
    ...(fila.direccion && fila.direccion.trim().length > 0
      ? { direccion: fila.direccion.trim() }
      : {}),
    estado,
    version: versionPositiva(convertirNumero(fila.revision)),
    fechaRegistro: instanteUtc(fechaRegistroIso),
    ...(baja ? { baja } : {}),
  });
}
