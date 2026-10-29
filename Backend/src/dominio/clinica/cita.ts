import type { UUID } from '../compartido/uuid.js';
import type { Version } from '../compartido/version.js';
import type { InstanteUTC } from '../compartido/instante-utc.js';
import { fechaCivil } from '../compartido/fecha-civil.js';
import { solicitudInvalida } from '../compartido/error-dominio.js';

export interface Cita {
  readonly id: UUID; readonly paciente_id: UUID; readonly profesional_id: UUID; readonly version: Version;
  readonly fecha: string; readonly hora_inicio: string; readonly hora_fin: string | null;
  readonly duracion_minutos: number | null; readonly motivo: string; readonly consultorio?: string;
  readonly estado: 'PROGRAMADA' | 'EN_CURSO' | 'ATENDIDA' | 'CANCELADA';
  readonly motivo_cancelacion?: string; readonly fecha_creacion: InstanteUTC;
}
export function intervaloCita(fecha: unknown, hora: unknown, duracion: unknown): { fecha: string; hora_inicio: string; hora_fin: string; duracion_minutos: number } {
  const civil = fechaCivil(fecha);
  if (typeof hora !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) throw solicitudInvalida('Hora civil inválida.');
  if (typeof duracion !== 'number' || !Number.isInteger(duracion) || duracion < 5 || duracion > 480) throw solicitudInvalida('Duración fuera de 5–480 minutos.');
  const fin = Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3)) + duracion;
  if (fin >= 1440) throw solicitudInvalida('La cita debe terminar el mismo día.');
  return { fecha: civil, hora_inicio: hora, hora_fin: `${String(Math.floor(fin / 60)).padStart(2, '0')}:${String(fin % 60).padStart(2, '0')}`, duracion_minutos: duracion };
}
