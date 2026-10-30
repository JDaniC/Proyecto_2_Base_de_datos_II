import { createHash } from 'node:crypto';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import { validarSignos } from '../../../dominio/clinica/consulta.js';
import { instanteUtc, type InstanteUTC } from '../../../dominio/compartido/instante-utc.js';
import { versionPositiva } from '../../../dominio/compartido/version.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import type { Cita } from '../../../dominio/clinica/cita.js';
import type { Consulta, ProfesionalClinico, ProfesionalHistorico, RecetaEmitida, SignosVitales } from '../../../dominio/clinica/consulta.js';

export interface FilaCitaSql extends Record<string, unknown> {
  id_publico: string;
  revision: number | string;
  paciente_id: string;
  profesional_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string | null;
  duracion_minutos: number | string | null;
  motivo: string;
  consultorio: string | null;
  estado: string;
  motivo_cancelacion: string | null;
  fecha_creacion: string;
  consulta_abierta?: boolean | number | string | null;
}

export interface FilaConsultaSql extends Record<string, unknown> {
  id_publico: string;
  revision: number | string;
  paciente_id: string;
  cita_id: string | null;
  fecha_hora: string;
  estado: string;
  motivo: string;
  sintomas: string | null;
  observaciones: string | null;
  profesional_historico: unknown;
  campos_signos: unknown;
  profesional_id: string;
  profesional_nombre: string | null;
  profesional_colegiado: string | null;
  profesional_entidad: string | null;
  profesional_estado: string | null;
}

export interface FilaSignosSql extends Record<string, unknown> {
  peso_kg: number | string | null;
  altura_cm: number | string | null;
  temperatura_c: number | string | null;
  presion_sistolica_mmhg: number | string | null;
  presion_diastolica_mmhg: number | string | null;
  frecuencia_cardiaca_lpm: number | string | null;
  frecuencia_respiratoria_rpm: number | string | null;
  saturacion_oxigeno_pct: number | string | null;
}

export interface FilaDiagnosticoSql extends Record<string, unknown> {
  id_publico: string;
  codigo: string;
  nombre: string | null;
  nombre_historico: string | null;
  es_principal: boolean | number | string;
  observacion: string | null;
  fecha_registro: string | null;
  autor_historico: unknown;
}

export interface FilaTratamientoSql extends Record<string, unknown> {
  id_publico: string;
  descripcion: string;
  indicaciones: string | null;
  fecha_registro: string | null;
  autor_historico: unknown;
}

export interface FilaRecetaSql extends Record<string, unknown> {
  contenido_historico: unknown;
  fecha_hora: string;
}

export function numero(valor: unknown, defecto = 0): number {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  if (typeof valor === 'string' && valor.trim() !== '' && Number.isFinite(Number(valor))) return Number(valor);
  return defecto;
}

export function numeroONulo(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null;
  const n = numero(valor, Number.NaN);
  return Number.isFinite(n) ? n : null;
}

export function textoONulo(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null;
}

export function objetoJson(valor: unknown): Record<string, unknown> | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'string') {
    try {
      const parsed: unknown = JSON.parse(valor);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }
  return typeof valor === 'object' && !Array.isArray(valor) ? valor as Record<string, unknown> : null;
}

export function instanteDeBd(valor: unknown, campo: string): InstanteUTC {
  if (typeof valor === 'string' && valor.length > 0) return instanteUtc(new Date(valor).toISOString(), campo);
  if (valor instanceof Date && Number.isFinite(valor.getTime())) return instanteUtc(valor.toISOString(), campo);
  throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'La fecha histórica requiere reconciliación.');
}

export function profesionalDeJson(valor: unknown): ProfesionalHistorico | null {
  const obj = objetoJson(valor);
  if (!obj) return null;
  if (typeof obj.id !== 'string' || typeof obj.nombre !== 'string' || typeof obj.rol !== 'string' ||
      typeof obj.colegiado !== 'string' || typeof obj.entidad_colegiacion !== 'string') return null;
  return {
    id: uuidPublico(obj.id),
    nombre: obj.nombre,
    rol: obj.rol as ProfesionalHistorico['rol'],
    colegiado: obj.colegiado,
    entidad_colegiacion: obj.entidad_colegiacion,
  };
}

export function mapearCitaSql(fila: FilaCitaSql): Cita {
  const abierta = fila.consulta_abierta === true || fila.consulta_abierta === 1 || fila.consulta_abierta === '1';
  const estado: Cita['estado'] = abierta ? 'EN_CURSO' : fila.estado as Cita['estado'];
  return {
    id: uuidPublico(fila.id_publico),
    paciente_id: uuidPublico(fila.paciente_id),
    profesional_id: uuidPublico(fila.profesional_id),
    version: versionPositiva(numero(fila.revision)),
    fecha: fila.fecha,
    hora_inicio: fila.hora_inicio,
    hora_fin: fila.hora_fin,
    duracion_minutos: numeroONulo(fila.duracion_minutos),
    motivo: fila.motivo,
    ...(textoONulo(fila.consultorio) ? { consultorio: fila.consultorio as string } : {}),
    estado,
    ...(textoONulo(fila.motivo_cancelacion) ? { motivo_cancelacion: fila.motivo_cancelacion as string } : {}),
    fecha_creacion: instanteDeBd(fila.fecha_creacion, 'fecha_creacion'),
  };
}

export function signosDeFila(fila: FilaSignosSql | undefined): SignosVitales {
  if (!fila) return {};
  return {
    ...(numeroONulo(fila.peso_kg) === null ? {} : { peso_kg: numeroONulo(fila.peso_kg)! }),
    ...(numeroONulo(fila.altura_cm) === null ? {} : { talla_cm: numeroONulo(fila.altura_cm)! }),
    ...(numeroONulo(fila.temperatura_c) === null ? {} : { temperatura_c: numeroONulo(fila.temperatura_c)! }),
    ...(numeroONulo(fila.presion_sistolica_mmhg) === null ? {} : { presion_sistolica: numeroONulo(fila.presion_sistolica_mmhg)! }),
    ...(numeroONulo(fila.presion_diastolica_mmhg) === null ? {} : { presion_diastolica: numeroONulo(fila.presion_diastolica_mmhg)! }),
    ...(numeroONulo(fila.frecuencia_cardiaca_lpm) === null ? {} : { frecuencia_cardiaca_lpm: numeroONulo(fila.frecuencia_cardiaca_lpm)! }),
    ...(numeroONulo(fila.frecuencia_respiratoria_rpm) === null ? {} : { frecuencia_respiratoria_rpm: numeroONulo(fila.frecuencia_respiratoria_rpm)! }),
    ...(numeroONulo(fila.saturacion_oxigeno_pct) === null ? {} : { saturacion_oxigeno_pct: numeroONulo(fila.saturacion_oxigeno_pct)! }),
  };
}

export function recetaDeJson(valor: unknown): RecetaEmitida | undefined {
  const obj = objetoJson(valor);
  if (!obj || typeof obj.id !== 'string' || typeof obj.codigo_legible !== 'string' ||
      typeof obj.fecha_emision !== 'string' || !Array.isArray(obj.medicamentos)) return undefined;
  const prescriptor = profesionalDeJson(obj.prescriptor);
  if (!prescriptor) return undefined;
  const medicamentos = obj.medicamentos.flatMap((m) => {
    const med = objetoJson(m);
    if (!med || typeof med.id !== 'string' || typeof med.nombre !== 'string') return [];
    return [{
      id: uuidPublico(med.id),
      nombre: med.nombre,
      presentacion: String(med.presentacion ?? ''),
      concentracion: String(med.concentracion ?? ''),
      dosis: String(med.dosis ?? ''),
      frecuencia: String(med.frecuencia ?? ''),
      duracion: String(med.duracion ?? ''),
      via: String(med.via ?? ''),
      indicaciones: String(med.indicaciones ?? ''),
    }];
  });
  if (medicamentos.length === 0) return undefined;
  return {
    id: uuidPublico(obj.id),
    codigo_legible: obj.codigo_legible,
    version: versionPositiva(numero(obj.version, 1)),
    estado: 'EMITIDA',
    fecha_emision: instanteUtc(obj.fecha_emision, 'fecha_emision'),
    prescriptor,
    medicamentos,
    ...(typeof obj.observaciones === 'string' && obj.observaciones !== '' ? { observaciones: obj.observaciones } : {}),
  };
}

export function profesionalDeConsulta(
  fila: FilaConsultaSql,
  _rol: ProfesionalHistorico['rol'],
): ProfesionalHistorico {
  const historico = profesionalDeJson(fila.profesional_historico);
  if (historico) return historico;
  throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'El profesional histórico requiere reconciliación.');
}

export function profesionalClinicoSql(
  fila: Record<string, unknown>,
  rol: ProfesionalClinico['rol'],
): ProfesionalClinico {
  return {
    id: uuidPublico(fila.id_publico),
    nombre: typeof fila.nombre === 'string' && fila.nombre.trim() !== '' ? fila.nombre : 'Sin dato',
    rol,
    activo: fila.activo === true || fila.activo === 1 || fila.activo === '1',
    tipo: 'INDIVIDUAL',
    colegiado: textoONulo(fila.colegiado) ?? '',
    entidad_colegiacion: textoONulo(fila.entidad_colegiacion) ?? '',
  };
}

export function componentesDeConsulta(
  fila: FilaConsultaSql,
  signos: SignosVitales,
  diagnosticos: readonly FilaDiagnosticoSql[],
  tratamientos: readonly FilaTratamientoSql[],
  receta: RecetaEmitida | undefined,
  rol: ProfesionalHistorico['rol'] = 'MEDICO',
): Consulta {
  const profesional = profesionalDeConsulta(fila, rol);
  const autor = (v: unknown) => { const p = profesionalDeJson(v); if (!p) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','El autor histórico requiere reconciliación.'); return p; };
  const fechaConsulta = instanteDeBd(fila.fecha_hora, 'fecha_hora');
  return {
    id: uuidPublico(fila.id_publico),
    paciente_id: uuidPublico(fila.paciente_id),
    ...(fila.cita_id ? { cita_id: uuidPublico(fila.cita_id) } : {}),
    fecha_hora: fechaConsulta,
    profesional,
    estado: fila.estado === 'FINALIZADA' ? 'FINALIZADA' : 'ABIERTA',
    version: versionPositiva(numero(fila.revision)),
    motivo: fila.motivo,
    sintomas: fila.sintomas ?? '',
    ...(textoONulo(fila.observaciones) ? { observaciones: fila.observaciones as string } : {}),
    signos_vitales: signosConPresencia(signos, fila.campos_signos),
    diagnosticos: diagnosticos.map((d) => ({
      id: uuidPublico(d.id_publico),
      fecha_registro: instanteDeBd(d.fecha_registro, 'fecha_registro'),
      registrado_por: autor(d.autor_historico),
      codigo_cie: d.codigo,
      nombre: d.nombre_historico ?? d.nombre ?? 'Sin dato',
      es_principal: d.es_principal === true || d.es_principal === 1 || d.es_principal === '1',
      ...(textoONulo(d.observacion) ? { observacion: d.observacion as string } : {}),
    })),
    tratamientos: tratamientos.map((t) => ({
      id: uuidPublico(t.id_publico),
      fecha_registro: instanteDeBd(t.fecha_registro, 'fecha_registro'),
      registrado_por: autor(t.autor_historico),
      descripcion: t.descripcion,
      indicaciones: t.indicaciones ?? '',
    })),
    ...(receta ? { receta } : {}),
  };
}

/** Instantánea cerrada que exigen los triggers de receta de ambos motores. */
export function instantaneaReceta(receta: RecetaEmitida): Record<string, unknown> {
  return {
    id: receta.id,
    codigo_legible: receta.codigo_legible,
    version: receta.version,
    estado: receta.estado,
    fecha_emision: receta.fecha_emision,
    prescriptor: receta.prescriptor,
    prescriptor_nombre_historico: receta.prescriptor.nombre,
    colegiado_historico: receta.prescriptor.colegiado,
    ...(receta.observaciones === undefined ? {} : { observaciones: receta.observaciones }),
    medicamentos: receta.medicamentos.map((m) => ({
      id: m.id,
      medicamento_id: m.id,
      nombre: m.nombre,
      presentacion: m.presentacion,
      concentracion: m.concentracion,
      dosis: m.dosis,
      frecuencia: m.frecuencia,
      duracion: m.duracion,
      via: m.via,
      indicaciones: m.indicaciones,
    })),
  };
}

/** TIMESTAMP/DATETIME en UTC sin conversión de zona. */
export function fechaDb(iso: string): string {
  const fecha = new Date(iso);
  if (!Number.isFinite(fecha.getTime())) throw new Error('INSTANTE_UTC_INVALIDO');
  return fecha.toISOString().replace('T', ' ').replace('Z', '');
}

/** El índice de historial exige nanosegundos; el contenido debe coincidir con el índice. */
export function instanteNanos(iso: string): string {
  const fecha = new Date(iso);
  if (!Number.isFinite(fecha.getTime())) throw new Error('INSTANTE_UTC_INVALIDO');
  const base = fecha.toISOString();
  const [segundos, fraccion = ''] = base.slice(0, -1).split('.');
  return `${segundos}.${fraccion.padEnd(9, '0').slice(0, 9)}Z`;
}

export function signosConPresencia(signos: SignosVitales, captura: unknown): SignosVitales {
  if (captura === null || captura === undefined) return signos;
  try {
    const campos: unknown = typeof captura === 'string' ? JSON.parse(captura) : captura;
    const permitidos = ['peso_kg','talla_cm','temperatura_c','presion_sistolica','presion_diastolica','frecuencia_cardiaca_lpm','frecuencia_respiratoria_rpm','saturacion_oxigeno_pct'];
    if (!Array.isArray(campos) || campos.length > 8 || new Set(campos).size !== campos.length || campos.some(k=>!permitidos.includes(k))) throw new Error();
    return validarSignos(Object.fromEntries(campos.map(k=>[k,signos[k as keyof SignosVitales] ?? null])),'HOSPITAL_GENERAL');
  } catch {throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','La medición requiere datos compatibles.');}
}


/** IDs de persistencia derivados de la intención estable; sin aleatoriedad en callbacks. */
export function idClinicoEstable(origen: string, tipo: string) {
  const h = createHash('sha256').update(JSON.stringify(['clinica-sql-v1',tipo,origen])).digest('hex');
  return uuidPublico(`${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`);
}
