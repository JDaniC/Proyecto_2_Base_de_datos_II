import type { FechaCivil } from '../../../../dominio/compartido/fecha-civil.js';
import { fechaCivil } from '../../../../dominio/compartido/fecha-civil.js';
import { instanteUtc } from '../../../../dominio/compartido/instante-utc.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../../dominio/compartido/version.js';
import {
  type CausaArchivoPaciente,
  type ContactoEmergencia,
  type EstadoPaciente,
  type Identificacion,
  type Paciente,
  type Sexo,
  generarCodigoLegible,
  validarSexo,
} from '../../../../dominio/clinica/paciente.js';

export interface FilaPacientePostgresql extends Record<string, unknown> {
  id_paciente: number | string;
  id_publico: string;
  revision: number | string;
  cui: string | null;
  primer_nombre: string;
  segundo_nombre: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  tipo_sangre: string | null;
  telefono_principal: string | null;
  correo_principal: string | null;
  direccion: string | null;
  fecha_registro: string;
  numero_historial: string | null;
  estado_historial: string | null;
  causa_baja: string | null;
  motivo_baja: string | null;
  fecha_baja: string | null;
  actor_baja: string | null;
  ce_primer_nombre: string | null;
  ce_segundo_nombre: string | null;
  ce_primer_apellido: string | null;
  ce_segundo_apellido: string | null;
  ce_parentesco: string | null;
  ce_telefono: string | null;
  tipo_documento: string | null;
  numero_documento: string | null;
  clave_identidad_activa?: string | null;
  id_contacto_emergencia_activo?: number | string | null;
}

function convertirNumero(valor: unknown): number {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && /^\d+$/.test(valor.trim())) return Number(valor.trim());
  return Number.NaN;
}

export function mapearFilaPacientePostgresql(fila: FilaPacientePostgresql): Paciente {
  const idPublico = uuidPublico(fila.id_publico, 'id_publico');
  const codigoLegible = fila.numero_historial && fila.numero_historial.trim().length > 0
    ? fila.numero_historial.trim()
    : generarCodigoLegible('HOSPITAL_GENERAL', idPublico);

  const nombres = [fila.primer_nombre, fila.segundo_nombre]
    .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
    .map((n) => n.trim())
    .join(' ');

  const apellidos = [fila.primer_apellido, fila.segundo_apellido]
    .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
    .map((a) => a.trim())
    .join(' ');

  let identificacion: Identificacion | undefined;
  if (fila.tipo_documento && fila.numero_documento) {
    identificacion = Object.freeze({
      tipo: fila.tipo_documento.trim(),
      numero: fila.numero_documento.trim(),
    });
  } else if (fila.cui && fila.cui.trim().length > 0) {
    identificacion = Object.freeze({
      tipo: 'CUI',
      numero: fila.cui.trim(),
    });
  }

  let contactoEmergencia: ContactoEmergencia | undefined;
  if (fila.ce_primer_nombre && fila.ce_primer_apellido && fila.ce_telefono) {
    const ceNombres = [fila.ce_primer_nombre, fila.ce_segundo_nombre]
      .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
      .map((n) => n.trim())
      .join(' ');
    const ceApellidos = [fila.ce_primer_apellido, fila.ce_segundo_apellido]
      .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
      .map((a) => a.trim())
      .join(' ');
    contactoEmergencia = Object.freeze({
      nombres: ceNombres,
      apellidos: ceApellidos,
      parentesco: (fila.ce_parentesco ?? 'OTRO').trim(),
      telefono: fila.ce_telefono.trim(),
    });
  }

  const estadoHistorial = fila.estado_historial?.trim();
  const estado: EstadoPaciente = estadoHistorial === 'ARCHIVADO' ? 'ARCHIVADO' : 'ACTIVO';

  let baja: Paciente['baja'];
  if (estado === 'ARCHIVADO' && fila.fecha_baja) {
    const fechaBajaStr = typeof fila.fecha_baja === 'string'
      ? fila.fecha_baja
      : (fila.fecha_baja as Date).toISOString();
    baja = Object.freeze({
      fecha: instanteUtc(fechaBajaStr),
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

  return Object.freeze({
    id: idPublico,
    codigoLegible,
    institucion: 'HOSPITAL_GENERAL',
    nombres: nombres.length > 0 ? nombres : 'Sin nombre',
    apellidos: apellidos.length > 0 ? apellidos : 'Sin apellido',
    fechaNacimiento: fechaNacimiento ?? null,
    sexo: sexo ?? null,
    ...(identificacion ? { identificacion } : {}),
    ...(fila.telefono_principal && fila.telefono_principal.trim().length > 0
      ? { telefono: fila.telefono_principal.trim() }
      : {}),
    ...(fila.correo_principal && fila.correo_principal.trim().length > 0
      ? { correo: fila.correo_principal.trim() }
      : {}),
    ...(fila.direccion && fila.direccion.trim().length > 0
      ? { direccion: fila.direccion.trim() }
      : {}),
    ...(fila.tipo_sangre && fila.tipo_sangre.trim().length > 0
      ? { grupoSanguineo: fila.tipo_sangre.trim() }
      : {}),
    ...(contactoEmergencia ? { contactoEmergencia } : {}),
    estado,
    version: versionPositiva(convertirNumero(fila.revision)),
    fechaRegistro: instanteUtc(
      typeof fila.fecha_registro === 'string'
        ? fila.fecha_registro
        : (fila.fecha_registro as Date).toISOString(),
    ),
    ...(baja ? { baja } : {}),
  });
}
