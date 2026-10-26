import { createHash } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

export const INSTITUCION = 'CENTRO_MEDICO_PEDIATRICO' as const;
export const VERSION_MODELO = 1;
export const MAX_DOCUMENTO = 256 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HASH_RE = /^[a-f0-9]{64}$/;

const id = z.string().regex(UUID_RE);
const hash = z.string().regex(HASH_RE);
const texto = (max = 200) => z.string().min(1).max(max).regex(/\S/);
const nota = texto(4000);
const fecha = z.date();
const lista = <T extends z.ZodTypeAny>(item: T, min = 0) => z.array(item).min(min).max(100);
const revision = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const objeto = <T extends z.ZodRawShape>(campos: T) => z.strictObject(campos);
const raiz = <T extends z.ZodRawShape>(campos: T) => objeto({ revision, ...campos });
const instantanea = z.record(z.string(), z.unknown());

const unicos = <T extends Record<string, unknown>>(valores: readonly T[], clave: keyof T, ctx: z.RefinementCtx) => {
  const ids = valores.map((v) => v[clave]);
  if (new Set(ids).size !== ids.length) {
    ctx.addIssue({ code: 'custom', path: [String(clave)], message: 'Identificador repetido.' });
  }
};

const baja = objeto({
  causa: z.enum(['TRASLADO', 'FALLECIMIENTO', 'OTRA_ADMINISTRATIVA']),
  motivo: nota,
  fecha,
  actor_id: id,
});

const medicamento = objeto({
  medicamento_id: id,
  nombre: texto(),
  presentacion: texto(),
  concentracion: texto(),
  dosis: texto(),
  frecuencia: texto(),
  duracion: texto(),
  via: texto(100),
  indicaciones: nota,
});

const receta = objeto({
  receta_id: id,
  version: revision,
  estado: z.enum(['EMITIDA', 'ANULADA']),
  fecha_emision: fecha,
  prescriptor_id: id,
  prescriptor_nombre_historico: texto(),
  colegiado_historico: texto(60),
  medicamentos: lista(medicamento, 1),
  indicaciones_generales: nota.optional(),
});

const diagnostico = objeto({
  diagnostico_id: id,
  codigo: texto(60),
  nombre: texto(),
  descripcion: nota.optional(),
  es_principal: z.boolean(),
  observaciones: nota.optional(),
});

const tratamiento = objeto({
  tratamiento_id: id,
  nombre: texto(),
  descripcion: nota.optional(),
  fecha_inicio: fecha.optional(),
  fecha_fin: fecha.optional(),
  indicaciones: nota.optional(),
  observaciones: nota.optional(),
}).refine(
  (v) => !v.fecha_inicio || !v.fecha_fin || v.fecha_fin >= v.fecha_inicio,
  { path: ['fecha_fin'], message: 'Fechas incompatibles.' },
);

const crecimiento = objeto({
  peso_kg: z.number().positive().optional(),
  talla_cm: z.number().positive().optional(),
  perimetro_cefalico_cm: z.number().positive().optional(),
  temperatura_c: z.number().finite().optional(),
  frecuencia_cardiaca: z.number().positive().optional(),
}).refine((v) => Object.keys(v).length > 0, 'Medicion vacia.');

const dosis = objeto({
  dosis_id: id,
  numero: revision,
  edad_recomendada_meses: z.number().int().nonnegative(),
});

const versionHistorica = raiz({
  version: revision,
  actor_id: id,
  fecha_hora: fecha,
  motivo: nota,
  contenido_anterior: instantanea,
});

const identidad = raiz({
  tipo_documento: texto(40),
  numero_documento: texto(80),
  recurso_id: id,
  fecha_registro: fecha,
});

const profesional = raiz({
  nombres: texto(),
  apellidos: texto(),
  colegiado: texto(60),
  entidad_colegiacion: texto(),
  especialidad: texto(),
  telefono: texto(40).optional(),
  correo: texto(254).optional(),
  estado: z.enum(['ACTIVO', 'INACTIVO']),
});

export const modelos = [
  {
    ruta: 'pacientes/{pacienteId}',
    esquema: raiz({
      nombres: texto(),
      apellidos: texto(),
      nombre_busqueda: texto(400),
      fecha_nacimiento: z.iso.date(),
      sexo: texto(40).optional(),
      grupo_sanguineo: texto(20).optional(),
      direccion: nota.optional(),
      tipo_documento: texto(40).optional(),
      numero_documento: texto(80).optional(),
      estado: z.enum(['ACTIVO', 'ARCHIVADO']),
      fecha_apertura: fecha,
      baja: baja.optional(),
    }).superRefine((v, ctx) => {
      if (Boolean(v.tipo_documento) !== Boolean(v.numero_documento)) {
        ctx.addIssue({ code: 'custom', path: ['numero_documento'], message: 'Identificacion incompleta.' });
      }
      if (v.estado === 'ARCHIVADO' && !v.baja) {
        ctx.addIssue({ code: 'custom', path: ['baja'], message: 'Baja requerida.' });
      }
    }),
  },
  { ruta: 'pacientes/{pacienteId}/versiones/{versionId}', esquema: versionHistorica },
  {
    ruta: 'responsables/{responsableId}',
    esquema: raiz({
      identificacion: texto(120),
      tipo_documento: texto(40),
      nombres: texto(),
      apellidos: texto(),
      telefono: texto(40),
      correo: texto(254).optional(),
      fecha_registro: fecha,
    }),
  },
  {
    ruta: 'pacientes/{pacienteId}/responsables/{responsableId}',
    esquema: raiz({
      responsable_id: id,
      parentesco: texto(80),
      es_principal: z.boolean(),
      autoriza_atencion: z.boolean(),
      estado: z.enum(['ACTIVO', 'INACTIVO']),
      fecha_registro: fecha,
      actor_id: id,
    }),
  },
  {
    ruta: 'pacientes/{pacienteId}/alergias/{alergiaId}',
    esquema: raiz({
      nombre: texto(),
      tipo: texto(80),
      reaccion: nota,
      severidad: texto(60),
      estado: z.enum(['ACTIVA', 'INACTIVA']),
      fecha_registro: fecha,
    }),
  },
  {
    ruta: 'pacientes/{pacienteId}/antecedentes/{antecedenteId}',
    esquema: raiz({
      tipo: texto(80),
      descripcion: nota,
      fecha_registro: fecha,
    }),
  },
  {
    ruta: 'pacientes/{pacienteId}/esquemas/{vacunaId}',
    esquema: raiz({
      vacuna_id: id,
      version_id: id,
      actor_id: id,
      fecha_asignacion: fecha,
      estado: z.enum(['ACTIVO', 'INACTIVO']),
    }),
  },
  { ruta: 'pediatras/{pediatraId}', esquema: profesional },
  {
    ruta: 'citas/{citaId}',
    esquema: raiz({
      paciente_id: id,
      pediatra_id: id,
      fecha_hora: fecha,
      motivo: nota,
      estado: z.enum(['PROGRAMADA', 'ATENDIDA', 'CANCELADA']),
      fecha_creacion: fecha,
      motivo_cancelacion: nota.optional(),
    }).refine(
      (v) => v.estado !== 'CANCELADA' || Boolean(v.motivo_cancelacion),
      { path: ['motivo_cancelacion'], message: 'Motivo requerido.' },
    ),
  },
  { ruta: 'citas/{citaId}/versiones/{versionId}', esquema: versionHistorica },
  {
    ruta: 'consultas/{consultaId}',
    esquema: raiz({
      paciente_id: id,
      cita_id: id.optional(),
      pediatra_id: id,
      fecha_hora: fecha,
      motivo: nota,
      sintomas: nota.optional(),
      observaciones: nota.optional(),
      estado: z.enum(['ABIERTA', 'FINALIZADA']),
      autorizacion_historica: objeto({
        responsable_id: id,
        identificacion: texto(120),
        nombre: texto(),
        fecha,
        autoriza_atencion: z.literal(true),
      }),
      control_crecimiento: crecimiento.optional(),
      diagnosticos: lista(diagnostico),
      tratamientos: lista(tratamiento),
      receta: receta.optional(),
    }).superRefine((v, ctx) => {
      unicos(v.diagnosticos, 'diagnostico_id', ctx);
      unicos(v.tratamientos, 'tratamiento_id', ctx);
      if (v.diagnosticos.length && v.diagnosticos.filter((d) => d.es_principal).length !== 1) {
        ctx.addIssue({ code: 'custom', path: ['diagnosticos'], message: 'Se requiere un diagnostico principal.' });
      }
      if (v.receta && v.receta.prescriptor_id !== v.pediatra_id) {
        ctx.addIssue({ code: 'custom', path: ['receta'], message: 'Prescriptor incompatible.' });
      }
      if (v.receta) unicos(v.receta.medicamentos, 'medicamento_id', ctx);
    }),
  },
  { ruta: 'consultas/{consultaId}/versiones/{versionId}', esquema: versionHistorica },
  {
    ruta: 'vacunas/{vacunaId}',
    esquema: raiz({
      nombre: texto(),
      enfermedad_objetivo: texto(),
      fabricante: texto(),
      version_vigente: id,
    }),
  },
  {
    ruta: 'vacunas/{vacunaId}/versiones/{versionId}',
    esquema: raiz({
      version: revision,
      nombre: texto(),
      enfermedad_objetivo: texto(),
      fabricante: texto(),
      fecha_creacion: fecha,
      dosis: lista(dosis, 1),
    }).superRefine((v, ctx) => {
      unicos(v.dosis, 'dosis_id', ctx);
      unicos(v.dosis, 'numero', ctx);
    }),
  },
  {
    ruta: 'aplicaciones_vacuna/{aplicacionId}',
    esquema: raiz({
      paciente_id: id,
      vacuna_id: id,
      dosis_id: id,
      version_esquema_id: id,
      pediatra_id: id,
      fecha_aplicacion: fecha,
      lote: texto(100),
      sitio_aplicacion: texto(100),
      observaciones: nota.optional(),
      estado: z.enum(['APLICADA', 'ANULADA']),
      motivo_anulacion: nota.optional(),
    }).refine(
      (v) => v.estado !== 'ANULADA' || Boolean(v.motivo_anulacion),
      { path: ['motivo_anulacion'], message: 'Motivo requerido.' },
    ),
  },
  { ruta: 'aplicaciones_vacuna/{aplicacionId}/versiones/{versionId}', esquema: versionHistorica },
  {
    ruta: 'usuarios/{usuarioId}',
    esquema: raiz({
      auth_uid: texto(128),
      proveedor_identidad: z.literal('FIREBASE'),
      institucion_id: z.literal(INSTITUCION),
      estado: z.enum(['PENDIENTE', 'ACTIVO', 'INACTIVO']),
      rol_ids: lista(id),
      pediatra_id: id.optional(),
      nombre_usuario: texto(100),
      ultimo_acceso: fecha.optional(),
    }).superRefine((v, ctx) => {
      if (new Set(v.rol_ids).size !== v.rol_ids.length) {
        ctx.addIssue({ code: 'custom', path: ['rol_ids'], message: 'Roles repetidos.' });
      }
    }),
  },
  {
    ruta: 'roles/{rolId}',
    esquema: raiz({
      nombre: texto(100),
      descripcion: nota,
      permisos: lista(texto(100)),
    }).superRefine((v, ctx) => {
      if (new Set(v.permisos).size !== v.permisos.length) {
        ctx.addIssue({ code: 'custom', path: ['permisos'], message: 'Permisos repetidos.' });
      }
    }),
  },
  {
    ruta: 'auditoria/{eventoId}',
    esquema: raiz({
      usuario_id: id,
      auth_uid: texto(128),
      institucion_id: z.literal(INSTITUCION),
      fecha_hora: fecha,
      accion: texto(100),
      tipo_recurso: texto(100),
      recurso_id: texto(300),
      correlacion: id,
      motivo: nota.optional(),
      version_afectada: revision.optional(),
      detalle: instantanea.optional(),
    }),
  },
  {
    ruta: 'operaciones/{clave}',
    esquema: raiz({
      institucion_id: z.literal(INSTITUCION),
      usuario_id: id,
      caso_uso: texto(100),
      clave: texto(200),
      hash_entrada: hash,
      recurso_tipo: texto(100),
      recurso_id: texto(300),
      fecha_hora: fecha,
      codigo_respuesta: z.number().int().min(200).max(299),
      estado: z.literal('CONFIRMADA'),
      respuesta: objeto({
        data: instantanea,
        meta: objeto({ correlacion: id }),
      }),
    }),
  },
  { ruta: 'identidades_paciente/{clave}', esquema: identidad },
  { ruta: 'identidades_responsable/{clave}', esquema: identidad },
  {
    ruta: 'colegiados/{clave}',
    esquema: raiz({
      entidad_colegiacion: texto(),
      colegiado: texto(60),
      pediatra_id: id,
      fecha_registro: fecha,
    }),
  },
  {
    ruta: 'configuracion/modelo',
    esquema: raiz({
      version_esquema: revision,
      institucion_id: z.literal(INSTITUCION),
      hash_modelo: hash,
      rutas: lista(texto(200), 1),
      limite_documento_bytes: z.literal(MAX_DOCUMENTO),
      limite_lista: z.literal(100),
      fecha_creacion: fecha,
    }),
  },
];

export class ErrorModelo extends Error {
  readonly codigo: string;
  readonly campos: readonly string[];

  constructor(codigo: string, campos: readonly string[] = []) {
    super(codigo);
    this.name = 'ErrorModelo';
    this.codigo = codigo;
    this.campos = Object.freeze([...campos]);
  }
}

export function idAplicacion(pacienteId: string, vacunaId: string, dosisId: string): string {
  for (const valor of [pacienteId, vacunaId, dosisId]) {
    if (!UUID_RE.test(valor)) throw new ErrorModelo('ID_INVALIDO');
  }
  return `${pacienteId}__${vacunaId}__${dosisId}`;
}

export function claveUnica(...partes: string[]): string {
  if (!partes.length || partes.some((p) => typeof p !== 'string' || !p.trim())) {
    throw new ErrorModelo('CLAVE_INVALIDA');
  }
  const normalizadas = partes.map((p) => p.normalize('NFKC').trim().replace(/\s+/g, ' ').toUpperCase());
  return createHash('sha256').update(JSON.stringify(normalizadas)).digest('hex');
}

export function claveOperacion(institucionId: string, usuarioId: string, casoUso: string, clave: string): string {
  const partes = [institucionId, usuarioId, casoUso, clave];
  if (partes.some((p) => typeof p !== 'string' || !p.trim())) throw new ErrorModelo('CLAVE_INVALIDA');
  return createHash('sha256').update(JSON.stringify(partes)).digest('hex');
}

export function normalizar(valor: unknown, profundidad = 0, dentroDeLista = false): unknown {
  if (profundidad > 20) throw new ErrorModelo('PROFUNDIDAD_EXCESIVA');
  if (valor instanceof Timestamp) return valor.toDate();
  if (typeof valor === 'object' && valor !== null && 'toDate' in valor && typeof (valor as { toDate: () => unknown }).toDate === 'function') {
    return (valor as { toDate: () => unknown }).toDate();
  }
  if (valor instanceof Date) {
    if (!Number.isFinite(valor.getTime())) throw new ErrorModelo('FECHA_INVALIDA');
    return new Date(valor);
  }
  if (valor === null || typeof valor === 'string' || typeof valor === 'boolean') return valor;
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  if (Array.isArray(valor)) {
    if (dentroDeLista || valor.length > 100) throw new ErrorModelo('LISTA_INVALIDA');
    return valor.map((v) => normalizar(v, profundidad + 1, true));
  }
  if (valor && Object.getPrototypeOf(valor) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>).map(([k, v]) => [k, normalizar(v, profundidad + 1)]),
    );
  }
  throw new ErrorModelo('TIPO_NO_ADMITIDO');
}

const bytesTexto = (s: string) => Buffer.byteLength(s, 'utf8') + 1;

function bytesValor(valor: unknown): number {
  if (valor === null || typeof valor === 'boolean') return 1;
  if (typeof valor === 'number' || valor instanceof Date) return 8;
  if (typeof valor === 'string') return bytesTexto(valor);
  if (Array.isArray(valor)) return valor.reduce((n, v) => n + bytesValor(v), 0);
  if (valor && typeof valor === 'object') {
    return 32 + Object.entries(valor as Record<string, unknown>).reduce(
      (n, [k, v]) => n + bytesTexto(k) + bytesValor(v),
      0,
    );
  }
  return 0;
}

export function tamanoDocumento(ruta: string, datos: unknown): number {
  const normalizados = normalizar(datos);
  return ruta.split('/').reduce((n, parte) => n + bytesTexto(parte), 16) + bytesValor(normalizados);
}

export function validarDocumento<T = unknown>(ruta: string, datos: unknown): T {
  if (typeof ruta !== 'string') throw new ErrorModelo('RUTA_INVALIDA');
  const partes = ruta.split('/');
  const modelo = modelos.find(({ ruta: patron }) => {
    const esperadas = patron.split('/');
    return esperadas.length === partes.length && esperadas.every((p, i) => p.startsWith('{') || p === partes[i]);
  });
  if (!modelo) throw new ErrorModelo('RUTA_NO_ADMITIDA');
  const parametros: Record<string, string> = {};
  modelo.ruta.split('/').forEach((p, i) => {
    if (p.startsWith('{')) {
      const parte = partes[i];
      if (parte !== undefined) {
        parametros[p.slice(1, -1)] = parte;
      }
    }
  });
  for (const [nombre, valor] of Object.entries(parametros)) {
    const valido = nombre === 'clave' ? HASH_RE.test(valor)
      : nombre === 'aplicacionId' ? valor.split('__').length === 3 && valor.split('__').every((v) => UUID_RE.test(v))
      : UUID_RE.test(valor);
    if (!valido) throw new ErrorModelo('ID_INVALIDO', [nombre]);
  }
  const resultado = modelo.esquema.safeParse(normalizar(datos));
  if (!resultado.success) {
    throw new ErrorModelo('DOCUMENTO_INVALIDO', resultado.error.issues.map((i) => i.path.join('.')));
  }
  const v = resultado.data as Record<string, unknown>;
  if (ruta.startsWith('aplicaciones_vacuna/') && partes.length === 2 &&
      parametros.aplicacionId !== idAplicacion(String(v.paciente_id), String(v.vacuna_id), String(v.dosis_id))) {
    throw new ErrorModelo('DOSIS_INCOMPATIBLE');
  }
  if (partes[0] === 'pacientes' && partes[2] === 'responsables' && parametros.responsableId !== v.responsable_id) {
    throw new ErrorModelo('RESPONSABLE_INCOMPATIBLE');
  }
  if (partes[0] === 'pacientes' && partes[2] === 'esquemas' && parametros.vacunaId !== v.vacuna_id) {
    throw new ErrorModelo('ESQUEMA_INCOMPATIBLE');
  }
  if (['identidades_paciente', 'identidades_responsable'].includes(partes[0] ?? '') &&
      parametros.clave !== claveUnica(String(v.tipo_documento), String(v.numero_documento))) {
    throw new ErrorModelo('IDENTIDAD_INCOMPATIBLE');
  }
  if (partes[0] === 'colegiados' &&
      parametros.clave !== claveUnica(String(v.entidad_colegiacion), String(v.colegiado))) {
    throw new ErrorModelo('COLEGIADO_INCOMPATIBLE');
  }
  if (partes[0] === 'operaciones' &&
      parametros.clave !== claveOperacion(String(v.institucion_id), String(v.usuario_id), String(v.caso_uso), String(v.clave))) {
    throw new ErrorModelo('OPERACION_INCOMPATIBLE');
  }
  if (tamanoDocumento(ruta, v) > MAX_DOCUMENTO) throw new ErrorModelo('LIMITE_AGREGADO');
  return v as T;
}
