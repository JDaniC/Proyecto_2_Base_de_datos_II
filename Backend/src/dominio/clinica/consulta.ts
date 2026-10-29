import { ErrorDominio, solicitudInvalida } from '../compartido/error-dominio.js';
import type { UUID } from '../compartido/uuid.js';
import type { Version } from '../compartido/version.js';
import type { InstanteUTC } from '../compartido/instante-utc.js';
import type { Institucion } from '../compartido/institucion.js';
import type { Rol } from '../compartido/autorizacion.js';

export interface ProfesionalHistorico {
  readonly id: UUID; readonly nombre: string; readonly rol: Rol;
  readonly colegiado: string; readonly entidad_colegiacion: string;
}
export interface ProfesionalClinico extends ProfesionalHistorico {
  readonly activo: boolean;
  /** Laboratorio: únicamente solicitante médico individual, nunca institución. */
  readonly tipo?: 'INDIVIDUAL' | 'INSTITUCIONAL';
}
export interface DiagnosticoEntrada {
  readonly codigo_cie: string; readonly nombre: string; readonly es_principal: boolean; readonly observacion?: string;
}
export interface TratamientoEntrada { readonly descripcion: string; readonly indicaciones: string; }
export interface MedicamentoEntrada {
  readonly nombre: string; readonly presentacion: string; readonly concentracion: string;
  readonly dosis: string; readonly frecuencia: string; readonly duracion: string;
  readonly via: string; readonly indicaciones: string;
}
export interface RecetaEntrada { readonly medicamentos: readonly MedicamentoEntrada[]; readonly observaciones?: string; }
export type SignosVitales = Readonly<Partial<Record<'peso_kg' | 'talla_cm' | 'temperatura_c' |
  'presion_sistolica' | 'presion_diastolica' | 'frecuencia_cardiaca_lpm' |
  'frecuencia_respiratoria_rpm' | 'saturacion_oxigeno_pct' | 'perimetro_cefalico_cm', number | null>>>;
export interface ComponenteRegistrado { readonly id: UUID; readonly fecha_registro: InstanteUTC; readonly registrado_por: ProfesionalHistorico; }
export interface RecetaEmitida extends Omit<RecetaEntrada, 'medicamentos'> {
  readonly medicamentos: readonly (MedicamentoEntrada & { readonly id: UUID })[];
  readonly id: UUID; readonly codigo_legible: string; readonly version: Version; readonly estado: 'EMITIDA';
  readonly fecha_emision: InstanteUTC; readonly prescriptor: ProfesionalHistorico;
}
export interface Consulta {
  readonly id: UUID; readonly paciente_id: UUID; readonly cita_id?: UUID;
  readonly fecha_hora: InstanteUTC; readonly profesional: ProfesionalHistorico;
  readonly estado: 'ABIERTA' | 'FINALIZADA'; readonly version: Version;
  readonly motivo: string; readonly sintomas: string; readonly observaciones?: string;
  readonly signos_vitales: SignosVitales;
  readonly diagnosticos: readonly (DiagnosticoEntrada & ComponenteRegistrado)[];
  readonly tratamientos: readonly (TratamientoEntrada & ComponenteRegistrado)[];
  readonly receta?: RecetaEmitida;
  readonly responsable_id?: UUID;
  readonly autorizacion?: {
    readonly responsable_id: UUID; readonly version_vinculo: Version; readonly autorizaba: true;
    readonly identificacion_historica: { readonly tipo: string; readonly numero: string };
    readonly nombre_historico: string; readonly fecha_hora: InstanteUTC;
  };
}

export function objetoCerrado(valor: unknown, campos: readonly string[]): Record<string, unknown> {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) throw solicitudInvalida('Se requiere un objeto.');
  const obj = valor as Record<string, unknown>;
  if (Object.keys(obj).some(k => !campos.includes(k))) throw solicitudInvalida('La solicitud contiene campos no admitidos.');
  return obj;
}
export function textoClinico(valor: unknown, campo: string, maximo: number, permiteVacio = false): string {
  if (typeof valor !== 'string' || [...valor].length > maximo || (!permiteVacio && !valor.trim())) {
    throw solicitudInvalida('Texto requerido o longitud inválida.', campo);
  }
  return valor;
}
export function listaClinica(valor: unknown, campo: string, minimo = 0): readonly unknown[] {
  if (!Array.isArray(valor) || valor.length < minimo) throw solicitudInvalida('Colección inválida.', campo);
  if (valor.length > 100) throw new ErrorDominio('LIMITE_AGREGADO', 'La colección excede 100 elementos.', [campo]);
  return valor;
}
export function validarDiagnostico(valor: unknown, institucion: Institucion): DiagnosticoEntrada {
  const d = objetoCerrado(valor, ['codigo_cie', 'nombre', 'es_principal', 'observacion']);
  if (typeof d.es_principal !== 'boolean') throw solicitudInvalida('es_principal debe ser booleano.');
  return { codigo_cie: textoClinico(d.codigo_cie, 'codigo_cie', 20),
    nombre: textoClinico(d.nombre, 'nombre', institucion === 'CLINICA_ODONTOLOGICA' ? 180 : 200),
    es_principal: d.es_principal,
    ...(d.observacion === undefined ? {} : { observacion: textoClinico(d.observacion, 'observacion', 2000, true) }) };
}
export function validarPrincipal(diagnosticos: readonly DiagnosticoEntrada[]): void {
  if (diagnosticos.length && diagnosticos.filter(d => d.es_principal).length !== 1) {
    throw solicitudInvalida('Los diagnósticos requieren exactamente un principal.');
  }
}
export function validarTratamiento(valor: unknown, institucion: Institucion): TratamientoEntrada {
  const t = objetoCerrado(valor, ['descripcion', 'indicaciones']);
  return { descripcion: textoClinico(t.descripcion, 'descripcion', institucion === 'CLINICA_ODONTOLOGICA' ? 180 : 200),
    indicaciones: textoClinico(t.indicaciones, 'indicaciones', 2000) };
}
export function validarReceta(valor: unknown): RecetaEntrada {
  const r = objetoCerrado(valor, ['medicamentos', 'observaciones']);
  return { medicamentos: listaClinica(r.medicamentos, 'medicamentos', 1).map(valor => {
    const campos = ['nombre', 'presentacion', 'concentracion', 'dosis', 'frecuencia', 'duracion', 'via', 'indicaciones'];
    const m = objetoCerrado(valor, campos);
    return Object.fromEntries(campos.map(campo => [campo, textoClinico(m[campo], campo,
      campo === 'via' ? 100 : campo === 'indicaciones' ? 500 : 200)])) as unknown as MedicamentoEntrada;
  }), ...(r.observaciones === undefined ? {} : { observaciones: textoClinico(r.observaciones, 'observaciones', 2000, true) }) };
}
export function validarSignos(valor: unknown, institucion: Institucion): SignosVitales {
  const reglas = { peso_kg: [0.1, 500, 3], talla_cm: [10, 300, 2], temperatura_c: [20, 50, 1],
    presion_sistolica: [10, 300, 0], presion_diastolica: [10, 200, 0], frecuencia_cardiaca_lpm: [10, 300, 0],
    frecuencia_respiratoria_rpm: [1, 150, 0], saturacion_oxigeno_pct: [0, 100, 2], perimetro_cefalico_cm: [10, 100] };
  const signos = objetoCerrado(valor, Object.keys(reglas));
  for (const [campo, v] of Object.entries(signos)) {
    if (campo === 'perimetro_cefalico_cm' && institucion !== 'CENTRO_MEDICO_PEDIATRICO') {
      throw new ErrorDominio('SIN_PERMISO', 'La medición solo aplica a pediatría.');
    }
    if (v === null) continue;
    const [min, max, escala] = reglas[campo as keyof typeof reglas]!;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min! || v > max! ||
      (escala !== undefined && Number(v.toFixed(escala)) !== v)) throw solicitudInvalida('Medición fuera de rango o precisión.', campo);
  }
  return { ...signos } as SignosVitales;
}
export function validarTamanoClinico(valor: unknown): void {
  if (new TextEncoder().encode(JSON.stringify(valor)).length > 262144) throw new ErrorDominio('LIMITE_AGREGADO', 'El agregado excede 256 KiB.');
}
