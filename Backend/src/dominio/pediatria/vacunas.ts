import { uuidPublico } from '../compartido/uuid.js';
import { fechaCivil } from '../compartido/fecha-civil.js';
import { solicitudInvalida } from '../compartido/error-dominio.js';
import { objetoCerrado, textoClinico } from '../clinica/consulta.js';

export interface DosisVacuna {
  readonly dosisId: string;
  readonly numero: number;
  readonly edadMesesRecomendada: number;
  readonly limiteInferiorDias?: number | undefined;
  readonly limiteSuperiorDias?: number | undefined;
  readonly obligatoria?: boolean | undefined;
  readonly etiquetaDosis?: string | undefined;
}

export interface VacunaCatalogo {
  readonly id: string;
  readonly nombre: string;
  readonly enfermedadObjetivo: string;
  readonly fabricante: string;
  readonly versionVigente: string;
  readonly dosis: readonly DosisVacuna[];
}

export interface VersionEsquemaVacuna {
  readonly versionId: string;
  readonly version: number;
  readonly nombre: string;
  readonly enfermedadObjetivo: string;
  readonly fabricante: string;
  readonly fechaCreacion: string;
  readonly dosis: readonly DosisVacuna[];
}

export interface EsquemaPaciente {
  readonly vacunaId: string;
  readonly versionId: string;
  readonly actorId: string;
  readonly fechaAsignacion: string;
  readonly estado: 'ACTIVO' | 'INACTIVO';
}

export interface AplicacionVacuna {
  readonly esquema?: VersionEsquemaVacuna | undefined;
  readonly id: string;
  readonly claveLogica: string;
  readonly pacienteId: string;
  readonly vacunaId: string;
  readonly dosisId: string;
  readonly versionEsquemaId: string;
  readonly pediatraId: string;
  readonly fechaAplicacion: string;
  readonly lote: string;
  readonly sitioAplicacion: string;
  readonly viaAdministracion?: string | undefined;
  readonly observaciones?: string | undefined;
  readonly estado: 'APLICADA' | 'ANULADA';
  readonly motivoAnulacion?: string | undefined;
  readonly version: number;
}

export type EstadoDosisVacuna = 'APLICADA' | 'PENDIENTE' | 'FUTURA';

export interface ItemEsquemaPaciente {
  readonly versionEsquemaId: string;
  readonly vacunaId: string;
  readonly nombreVacuna: string;
  readonly enfermedadObjetivo: string;
  readonly fabricante: string;
  readonly dosisId: string;
  readonly numeroDosis: number;
  readonly etiquetaDosis: string;
  readonly edadRecomendadaMeses: number;
  readonly estado: EstadoDosisVacuna;
  readonly diasRetraso?: number | undefined;
  readonly aplicacionVigente?: AplicacionVacuna | undefined;
}

/**
 * Genera el identificador determinista de la aplicación de vacuna.
 * Cumple la regla CA11 y coincide exactamente con `idAplicacion` del modelo físico Firestore.
 */
export function generarIdAplicacion(pacienteId: string, vacunaId: string, dosisId: string): string {
  const p = uuidPublico(pacienteId, 'paciente_id');
  const v = uuidPublico(vacunaId, 'vacuna_id');
  const d = uuidPublico(dosisId, 'dosis_id');
  return `${p}__${v}__${d}`;
}

/**
 * Calcula el estado de una dosis (APLICADA, PENDIENTE o FUTURA) en función de las
 * aplicaciones vigentes y los meses de edad cumplidos. No inventa recomendaciones médicas.
 */
export function calcularEstadoDosis(
  dosis: DosisVacuna,
  edadMeses: number,
  aplicacionVigente?: AplicacionVacuna | null,
  nacimiento?: string,
  hoy?: string
): { estado: EstadoDosisVacuna; diasRetraso?: number } {
  if (!Number.isFinite(edadMeses) || edadMeses < 0) {
    throw solicitudInvalida('La edad en meses debe ser un valor no negativo.', 'edad_meses');
  }
  if (aplicacionVigente && aplicacionVigente.estado === 'APLICADA') {
    return { estado: 'APLICADA' };
  }
  if (edadMeses >= dosis.edadMesesRecomendada) {
    if(nacimiento && hoy) {
      const n=fechaCivil(nacimiento),h=fechaCivil(hoy);
      const [a,m,d]=n.split('-').map(Number);
      const mesTotal=a!*12+m!-1+dosis.edadMesesRecomendada;
      const anio=Math.floor(mesTotal/12),mes=mesTotal%12;
      const ultimoDia=new Date(Date.UTC(anio,mes+1,0)).getUTCDate();
      const vencimiento=Date.UTC(anio,mes,Math.min(d!,ultimoDia));
      return {estado:'PENDIENTE',diasRetraso:Math.max(0,Math.floor((Date.parse(h)-vencimiento)/86400000))};
    }
    return { estado: 'PENDIENTE' };
  }
  return { estado: 'FUTURA' };
}

export function validarRegistroAplicacion(entrada: unknown): {
  vacunaId: string;
  dosisId: string;
  fechaAplicacion: string;
  lote: string;
  sitioAnatomico: string;
  observaciones?: string | undefined;
} {
  const e = objetoCerrado(entrada, [
    'vacunaId',
    'dosisId',
    'fechaAplicacion',
    'lote',
    'sitioAnatomico',
    'observaciones',
  ]);
  const vacunaId = uuidPublico(e.vacunaId, 'vacunaId');
  const dosisId = uuidPublico(e.dosisId, 'dosisId');
  const fechaAplicacion = fechaCivil(e.fechaAplicacion, 'fechaAplicacion');
  const lote = textoClinico(e.lote, 'lote', 100).trim().toUpperCase();
  if (!lote) throw solicitudInvalida('El lote es requerido.', 'lote');
  const sitioAnatomico = textoClinico(e.sitioAnatomico, 'sitioAnatomico', 100).trim();
  if (!sitioAnatomico) throw solicitudInvalida('El sitio anatómico es requerido.', 'sitioAnatomico');
  const observaciones = e.observaciones !== undefined
    ? textoClinico(e.observaciones, 'observaciones', 4000, true)?.trim()
    : undefined;

  return {
    vacunaId,
    dosisId,
    fechaAplicacion,
    lote,
    sitioAnatomico,
    observaciones: observaciones || undefined,
  };
}

export function validarCorreccionAplicacion(entrada: unknown): {
  lote?: string | undefined;
  sitioAnatomico?: string | undefined;
  observaciones?: string | undefined;
  motivo: string;
  versionEsperada: number;
} {
  const e = objetoCerrado(entrada, [
    'lote',
    'sitioAnatomico',
    'observaciones',
    'motivo',
    'versionEsperada',
  ]);
  const motivo = textoClinico(e.motivo, 'motivo', 1000).trim();
  if (!motivo) throw solicitudInvalida('El motivo de la corrección es requerido.', 'motivo');

  const versionEsperada = e.versionEsperada;
  if (!Number.isSafeInteger(versionEsperada) || typeof versionEsperada !== 'number' || versionEsperada < 1) {
    throw solicitudInvalida('La versión esperada debe ser un entero positivo.', 'versionEsperada');
  }

  const lote = e.lote !== undefined ? textoClinico(e.lote, 'lote', 100).trim().toUpperCase() : undefined;
  if (lote !== undefined && !lote) throw solicitudInvalida('El lote no puede ser vacío.', 'lote');

  const sitioAnatomico = e.sitioAnatomico !== undefined
    ? textoClinico(e.sitioAnatomico, 'sitioAnatomico', 100).trim()
    : undefined;
  if (sitioAnatomico !== undefined && !sitioAnatomico) {
    throw solicitudInvalida('El sitio anatómico no puede ser vacío.', 'sitioAnatomico');
  }

  const observaciones = e.observaciones !== undefined
    ? textoClinico(e.observaciones, 'observaciones', 4000, true)?.trim()
    : undefined;

  return {
    lote,
    sitioAnatomico,
    observaciones,
    motivo,
    versionEsperada,
  };
}

export function validarAnulacionAplicacion(entrada: unknown): {
  motivo: string;
  versionEsperada: number;
} {
  const e = objetoCerrado(entrada, ['motivo', 'versionEsperada']);
  const motivo = textoClinico(e.motivo, 'motivo', 1000).trim();
  if (!motivo) throw solicitudInvalida('El motivo de la anulación es requerido.', 'motivo');

  const versionEsperada = e.versionEsperada;
  if (!Number.isSafeInteger(versionEsperada) || typeof versionEsperada !== 'number' || versionEsperada < 1) {
    throw solicitudInvalida('La versión esperada debe ser un entero positivo.', 'versionEsperada');
  }

  return {
    motivo,
    versionEsperada,
  };
}

export function validarAsignacionEsquema(entrada: unknown): {
  vacunaId: import('../compartido/uuid.js').UUID;
  versionId: import('../compartido/uuid.js').UUID;
} {
  const e = objetoCerrado(entrada, ['vacunaId', 'versionId']);
  const vacunaId = uuidPublico(e.vacunaId, 'vacunaId');
  const versionId = uuidPublico(e.versionId, 'versionId');
  return { vacunaId, versionId };
}

export function validarIdAplicacion(valor: string): string {
  const partes=valor.split('__');
  if(partes.length!==3)throw solicitudInvalida('Identificador de aplicación inválido.');
  return generarIdAplicacion(partes[0]!,partes[1]!,partes[2]!);
}
