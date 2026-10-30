import type { CambioPlanificado, ComandoEstable } from '../../../../aplicacion/puertos/nucleo.js';
import type { ContextoAutenticado } from '../../../../aplicacion/puertos/contexto-autenticado.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import type { Cita } from '../../../../dominio/clinica/cita.js';
import type { Consulta, RecetaEmitida } from '../../../../dominio/clinica/consulta.js';
import type { Paciente } from '../../../../dominio/clinica/paciente.js';
import type { EjecutorSql } from '../../sql/tipos-sql.js';
import { fechaDb, instantaneaReceta, instanteNanos, idClinicoEstable } from '../../sql/mapear-clinica-sql.js';
import { aplicarCambiosPacientesPostgresql } from '../pacientes/aplicar-cambios-pacientes-postgresql.js';

interface EventoHistorialCambio {
  id: string;
  tipo: string;
  recursoId: string;
  titulo: string;
  consultaId?: string;
  versionConsulta?: number;
  fechaHora: string;
  pacienteId: string;
}

async function interno(
  executor: EjecutorSql,
  tabla: string,
  columna: string,
  idPublico: string,
  mensaje: string,
): Promise<number> {
  const resultado = await executor.consultar<{ id: number | string }>(
    `SELECT ${columna} AS id FROM ${tabla} WHERE id_publico = $1`,
    [idPublico],
  );
  const id = resultado.filas[0]?.id;
  const numero = typeof id === 'number' ? id : typeof id === 'string' ? Number(id) : NaN;
  if (!Number.isSafeInteger(numero)) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', mensaje);
  return numero;
}

async function avanzarRevisionPaciente(
  executor: EjecutorSql,
  cambio: CambioPlanificado,
): Promise<void> {
  const paciente = cambio.nuevoEstado as Paciente;
  if (cambio.versionAnterior === null) return;
  const resultado = await executor.consultar<{ id_paciente: number | string }>(
    'UPDATE paciente SET revision = $1 WHERE id_publico = $2 AND revision = $3 RETURNING id_paciente',
    [paciente.version, paciente.id, cambio.versionAnterior],
  );
  if (!resultado.filas[0]) {
    throw new ErrorDominio('VERSION_DESACTUALIZADA', 'El paciente ha sido modificado por otro proceso.');
  }
}

async function guardarCita(
  executor: EjecutorSql,
  cambio: CambioPlanificado,
): Promise<void> {
  const cita = cambio.nuevoEstado as Cita;
  const idPaciente = await interno(executor, 'paciente', 'id_paciente', cita.paciente_id, 'Paciente no disponible para la cita.');
  const idProfesional = await interno(executor, 'personal_medico', 'id_personal', cita.profesional_id, 'Profesional no disponible para la cita.');
  const fechaInicio = `${cita.fecha} ${cita.hora_inicio}`;
  const fechaFin = cita.hora_fin === null ? null : `${cita.fecha} ${cita.hora_fin}`;
  if (cambio.versionAnterior === null) {
    await executor.consultar(
      `INSERT INTO cita (id_publico, revision, id_paciente, id_personal_programado, fecha_hora_inicio,
         fecha_hora_fin, motivo_solicitud, estado_cita, duracion_minutos, consultorio, motivo_cancelacion, fecha_creacion)
       VALUES ($1, $2, $3, $4, $5::timestamp, $6::timestamp, $7, $8, $9, $10, $11, $12::timestamp)`,
      [cita.id, cita.version, idPaciente, idProfesional, fechaInicio, fechaFin, cita.motivo, cita.estado,
        cita.duracion_minutos, cita.consultorio ?? null, cita.motivo_cancelacion ?? null, fechaDb(cita.fecha_creacion)],
    );
    return;
  }
  // EN_CURSO es un estado lógico derivado de la consulta abierta; el enum físico no lo admite.
  const estadoFisico = cita.estado === 'EN_CURSO' ? null : cita.estado;
  const resultado = await executor.consultar<{ id_cita: number | string }>(
    `UPDATE cita SET revision = $1, fecha_hora_inicio = $2::timestamp, fecha_hora_fin = $3::timestamp,
       motivo_solicitud = $4, duracion_minutos = $5, consultorio = $6, motivo_cancelacion = $7,
       estado_cita = COALESCE($8, estado_cita)
     WHERE id_publico = $9 AND revision = $10 RETURNING id_cita`,
    [cita.version, fechaInicio, fechaFin, cita.motivo, cita.duracion_minutos, cita.consultorio ?? null,
      cita.motivo_cancelacion ?? null, estadoFisico, cita.id, cambio.versionAnterior],
  );
  if (!resultado.filas[0]) {
    throw new ErrorDominio('VERSION_DESACTUALIZADA', 'La cita ha sido modificada por otro proceso.');
  }
}

async function resolverCatalogoDiagnostico(
  executor: EjecutorSql,
  codigo: string,
  nombre: string,
): Promise<number> {
  const existente = await executor.consultar<{ id: number | string }>(
    'SELECT id_catalogo_diagnostico AS id FROM catalogo_diagnostico WHERE codigo = $1 LIMIT 1',
    [codigo],
  );
  const id = existente.filas[0]?.id;
  if (id !== undefined) return Number(id);
  const creado = await executor.consultar<{ id: number | string }>(
    `INSERT INTO catalogo_diagnostico (sistema, codigo, nombre) VALUES ('CIE-10', $1, $2)
     ON CONFLICT (sistema, version, codigo) DO UPDATE SET codigo = EXCLUDED.codigo RETURNING id_catalogo_diagnostico AS id`,
    [codigo, nombre],
  );
  return Number(creado.filas[0]?.id);
}

async function resolverMedicamentoPostgresql(
  executor: EjecutorSql,
  receta: RecetaEmitida,
  idMedicamento: string,
): Promise<number> {
  const med = receta.medicamentos.find((m) => m.id === idMedicamento)!;
  const existente = await executor.consultar<{ id: number | string }>(
    `SELECT id_medicamento AS id FROM medicamento
      WHERE LOWER(nombre) = LOWER($1) AND COALESCE(presentacion, '') = COALESCE($2, '') LIMIT 1`,
    [med.nombre, med.presentacion],
  );
  const id = existente.filas[0]?.id;
  if (id !== undefined) return Number(id);
  const creado = await executor.consultar<{ id: number | string }>(
    `INSERT INTO medicamento (id_publico, revision, nombre, presentacion, descripcion)
     VALUES ($1, 1, $2, $3, $4) RETURNING id_medicamento AS id`,
    [idClinicoEstable(med.id, 'catalogo-medicamento'), med.nombre, med.presentacion, `${med.concentracion}`.trim() || null],
  );
  return Number(creado.filas[0]?.id);
}

async function guardarReceta(
  executor: EjecutorSql,
  idConsulta: number,
  receta: RecetaEmitida,
): Promise<void> {
  const existente = await executor.consultar<{ id_receta: number | string }>(
    'SELECT id_receta FROM receta WHERE id_consulta = $1', [idConsulta],
  );
  if (existente.filas[0]) return;
  const idPrescriptor = await interno(executor, 'personal_medico', 'id_personal', receta.prescriptor.id,
    'Prescriptor no disponible para la receta.');
  const creada = await executor.consultar<{ id_receta: number | string }>(
    `INSERT INTO receta (estado, contenido_historico, id_publico, revision, id_consulta,
       id_personal_prescriptor, fecha_hora, indicaciones_generales)
     VALUES ('BORRADOR', NULL, $1, 1, $2, $3, $4::timestamp, $5) RETURNING id_receta`,
    [receta.id, idConsulta, idPrescriptor, fechaDb(receta.fecha_emision), receta.observaciones ?? null],
  );
  const idReceta = Number(creada.filas[0]?.id_receta);
  if (!Number.isSafeInteger(idReceta)) {
    throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No se pudo registrar la receta.');
  }
  const usados = new Set<number>();
  for (const med of receta.medicamentos) {
    const idMedicamento = await resolverMedicamentoPostgresql(executor, receta, med.id);
    if (usados.has(idMedicamento)) continue;
    usados.add(idMedicamento);
    await executor.consultar(
      `INSERT INTO detalle_receta (id_publico, revision, id_receta, id_medicamento, frecuencia,
         via_administracion, instrucciones)
       VALUES ($1, 1, $2, $3, $4, $5, $6)`,
      [idClinicoEstable(med.id, 'detalle-receta'), idReceta, idMedicamento, med.frecuencia, med.via, med.indicaciones],
    );
  }
  await executor.consultar(
    `UPDATE receta SET estado = 'EMITIDA', contenido_historico = $1::jsonb,
       indicaciones_generales = $2 WHERE id_receta = $3`,
    [JSON.stringify(instantaneaReceta(receta)), receta.observaciones ?? null, idReceta],
  );
}

async function guardarConsulta(
  executor: EjecutorSql,
  cambio: CambioPlanificado,
): Promise<void> {
  const consulta = cambio.nuevoEstado as Consulta;
  const idPaciente = await interno(executor, 'paciente', 'id_paciente', consulta.paciente_id,
    'Paciente no disponible para la consulta.');
  const historial = await executor.consultar<{ id_historial: number | string }>(
    'SELECT id_historial FROM historial_clinico WHERE id_paciente = $1 FOR SHARE', [idPaciente],
  );
  const idHistorial = historial.filas[0]?.id_historial;
  if (idHistorial === undefined) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'Historial clínico no disponible.');
  const idProfesional = await interno(executor, 'personal_medico', 'id_personal', consulta.profesional.id,
    'Profesional no disponible para la consulta.');
  const idCita = consulta.cita_id
    ? await interno(executor, 'cita', 'id_cita', consulta.cita_id, 'Cita no disponible para la consulta.')
    : null;
  const profesionalJson = JSON.stringify(consulta.profesional);
  let idConsulta: number;
  if (cambio.versionAnterior === null) {
    const creada = await executor.consultar<{ id_consulta: number | string }>(
      `INSERT INTO consulta (id_publico, revision, id_historial, id_personal_atendio, id_cita,
         fecha_hora, motivo_consulta, sintomas, observaciones, estado, profesional_historico, campos_signos)
       VALUES ($1, $2, $3, $4, $5, $6::timestamp, $7, $8, $9, 'ABIERTA', $10::jsonb, $11::jsonb) RETURNING id_consulta`,
      [consulta.id, consulta.version, Number(idHistorial), idProfesional, idCita, fechaDb(consulta.fecha_hora),
        consulta.motivo, consulta.sintomas === '' ? null : consulta.sintomas, consulta.observaciones ?? null,
        profesionalJson, JSON.stringify(Object.keys(consulta.signos_vitales))],
    );
    idConsulta = Number(creada.filas[0]?.id_consulta);
    if (!Number.isSafeInteger(idConsulta)) {
      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No se pudo registrar la consulta.');
    }
  } else {
    const actualizada = await executor.consultar<{ id_consulta: number | string }>(
      `UPDATE consulta SET revision = $1, motivo_consulta = $2, sintomas = $3, observaciones = $4,
         estado = $9, profesional_historico = $5::jsonb, campos_signos = $8::jsonb
       WHERE id_publico = $6 AND revision = $7 RETURNING id_consulta`,
      [consulta.version, consulta.motivo, consulta.sintomas === '' ? null : consulta.sintomas,
        consulta.observaciones ?? null, profesionalJson, consulta.id, cambio.versionAnterior, JSON.stringify(Object.keys(consulta.signos_vitales)), consulta.estado],
    );
    const id = actualizada.filas[0]?.id_consulta;
    if (id === undefined) throw new ErrorDominio('VERSION_DESACTUALIZADA', 'La consulta ha sido modificada por otro proceso.');
    idConsulta = Number(id);
  }
  await guardarSignos(executor, idConsulta, consulta, cambio.versionAnterior === null);
  await guardarDiagnosticos(executor, idConsulta, consulta);
  await guardarTratamientos(executor, idConsulta, consulta);
  if (consulta.receta) await guardarReceta(executor, idConsulta, consulta.receta);
  // Cierre al final: MySQL exige el principal ya insertado y ambos motores conservan la historia.
  if (consulta.estado === 'FINALIZADA' && cambio.versionAnterior === null) {
    await executor.consultar("UPDATE consulta SET estado = 'FINALIZADA' WHERE id_consulta = $1", [idConsulta]);
  }
}

async function guardarSignos(
  executor: EjecutorSql,
  idConsulta: number,
  consulta: Consulta,
  esNueva: boolean,
): Promise<void> {
  const valores = consulta.signos_vitales;
  const mediciones = Object.entries(valores).filter(([, v]) => v !== null && v !== undefined);
  if (mediciones.length === 0) return;
  if (!esNueva) {
    const previos = await executor.consultar<Record<string, unknown>>(
      `SELECT peso_kg, altura_cm, temperatura_c, presion_sistolica_mmhg, presion_diastolica_mmhg,
              frecuencia_cardiaca_lpm, frecuencia_respiratoria_rpm, saturacion_oxigeno_pct
         FROM signos_vitales WHERE id_consulta = $1 ORDER BY fecha_hora_medicion DESC, id_signos_vitales DESC LIMIT 1`,
      [idConsulta],
    );
    const fila = previos.filas[0];
    if (fila && mismoSigno(fila, valores)) return;
  }
  await executor.consultar(
    `INSERT INTO signos_vitales (id_publico, revision, id_consulta, fecha_hora_medicion,
       peso_kg, altura_cm, temperatura_c, presion_sistolica_mmhg, presion_diastolica_mmhg,
       frecuencia_cardiaca_lpm, frecuencia_respiratoria_rpm, saturacion_oxigeno_pct)
     VALUES ($1, 1, $2, $3::timestamp, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [idClinicoEstable(`${consulta.id}:${consulta.version}`, 'signos'), idConsulta, fechaDb(consulta.fecha_hora),
      valores.peso_kg ?? null, valores.talla_cm ?? null, valores.temperatura_c ?? null,
      valores.presion_sistolica ?? null, valores.presion_diastolica ?? null,
      valores.frecuencia_cardiaca_lpm ?? null, valores.frecuencia_respiratoria_rpm ?? null,
      valores.saturacion_oxigeno_pct ?? null],
  );
}

function mismoSigno(fila: Record<string, unknown>, valores: Consulta['signos_vitales']): boolean {
  const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return n(fila.peso_kg) === (valores.peso_kg ?? null) &&
    n(fila.altura_cm) === (valores.talla_cm ?? null) &&
    n(fila.temperatura_c) === (valores.temperatura_c ?? null) &&
    n(fila.presion_sistolica_mmhg) === (valores.presion_sistolica ?? null) &&
    n(fila.presion_diastolica_mmhg) === (valores.presion_diastolica ?? null) &&
    n(fila.frecuencia_cardiaca_lpm) === (valores.frecuencia_cardiaca_lpm ?? null) &&
    n(fila.frecuencia_respiratoria_rpm) === (valores.frecuencia_respiratoria_rpm ?? null) &&
    n(fila.saturacion_oxigeno_pct) === (valores.saturacion_oxigeno_pct ?? null);
}

async function guardarDiagnosticos(
  executor: EjecutorSql,
  idConsulta: number,
  consulta: Consulta,
): Promise<void> {
  for (const diagnostico of consulta.diagnosticos) {
    const existe = await executor.consultar<{ id: number | string }>(
      'SELECT 1 AS id FROM diagnostico WHERE id_publico = $1', [diagnostico.id],
    );
    if (existe.filas[0]) continue;
    const idCatalogo = await resolverCatalogoDiagnostico(executor, diagnostico.codigo_cie, diagnostico.nombre);
    await executor.consultar(
      `INSERT INTO diagnostico (id_publico, revision, id_consulta, id_catalogo_diagnostico, es_principal,
         fecha_diagnostico, nombre_historico, observacion, fecha_registro, autor_historico)
       VALUES ($1, 1, $2, $3, $4, $5::date, $6, $7, $8::timestamp, $9::jsonb)`,
      [diagnostico.id, idConsulta, idCatalogo, diagnostico.es_principal,
        diagnostico.fecha_registro.slice(0, 10), diagnostico.nombre, diagnostico.observacion ?? null,
        fechaDb(diagnostico.fecha_registro), JSON.stringify(diagnostico.registrado_por)],
    );
  }
}

async function guardarTratamientos(
  executor: EjecutorSql,
  idConsulta: number,
  consulta: Consulta,
): Promise<void> {
  for (const tratamiento of consulta.tratamientos) {
    const existe = await executor.consultar<{ id: number | string }>(
      'SELECT 1 AS id FROM tratamiento WHERE id_publico = $1', [tratamiento.id],
    );
    if (existe.filas[0]) continue;
    await executor.consultar(
      `INSERT INTO tratamiento (id_publico, revision, id_consulta, descripcion, fecha_inicio,
         indicaciones, fecha_registro, autor_historico, estado)
       VALUES ($1, 1, $2, $3, $4::date, $5, $6::timestamp, $7::jsonb, 'ACTIVO')`,
      [tratamiento.id, idConsulta, tratamiento.descripcion, tratamiento.fecha_registro.slice(0, 10),
        tratamiento.indicaciones, fechaDb(tratamiento.fecha_registro), JSON.stringify(tratamiento.registrado_por)],
    );
  }
}

async function guardarEvento(executor: EjecutorSql, cambio: CambioPlanificado): Promise<void> {
  const evento = cambio.nuevoEstado as EventoHistorialCambio;
  const fecha = instanteNanos(evento.fechaHora);
  const contenido = {
    id: evento.id,
    fechaHora: fecha,
    tipo: evento.tipo,
    recursoId: evento.recursoId,
    titulo: evento.titulo,
    ...(evento.consultaId === undefined ? {} : { consultaId: evento.consultaId }),
    ...(evento.versionConsulta === undefined ? {} : { versionConsulta: evento.versionConsulta }),
  };
  await executor.consultar(
    `INSERT INTO hospital_historial.eventos (id, paciente_id, tipo, fecha_hora, contenido)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [evento.id, evento.pacienteId, evento.tipo, fecha, JSON.stringify(contenido)],
  );
}

/**
 * Aplica un plan clínico sobre la misma conexión/UoW: pacientes, citas, consultas
 * y eventos de historial. Los pacientes no clínicos conservan el applier de E02.
 */
export async function aplicarCambiosClinicosPostgresql(
  executor: EjecutorSql,
  contexto: ContextoAutenticado,
  comando: ComandoEstable,
  cambios: readonly CambioPlanificado[],
): Promise<void> {
  const esClinico = (c: CambioPlanificado) =>
    c.agregado === 'citas' || c.agregado === 'consultas' || c.agregado === 'eventosHistorial' ||
    (c.agregado === 'pacientes' && c.tipo === 'AVANZAR_REVISION');
  const dePacientes = cambios.filter((c) => !esClinico(c));
  if (dePacientes.length > 0) {
    await aplicarCambiosPacientesPostgresql(executor, contexto, comando, dePacientes);
  }
  for (const cambio of cambios) {
    if (!esClinico(cambio)) continue;
    switch (cambio.agregado) {
      case 'pacientes':
        await avanzarRevisionPaciente(executor, cambio);
        break;
      case 'citas':
        await guardarCita(executor, cambio);
        break;
      case 'consultas':
        await guardarConsulta(executor, cambio);
        break;
      case 'eventosHistorial':
        await guardarEvento(executor, cambio);
        break;
      default:
        throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', `Agregado no soportado por la UoW clínica: ${cambio.agregado}.`);
    }
  }
}

