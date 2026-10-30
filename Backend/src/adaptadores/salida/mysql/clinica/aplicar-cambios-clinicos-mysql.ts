import { corregirConsultaSql } from '../../sql/corregir-consulta-sql.js';
import { aplicarEstadoHistorialSql } from '../../sql/aplicar-estado-historial-sql.js';
import type { CambioPlanificado, ComandoEstable } from '../../../../aplicacion/puertos/nucleo.js';
import type { ContextoAutenticado } from '../../../../aplicacion/puertos/contexto-autenticado.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import type { Cita } from '../../../../dominio/clinica/cita.js';
import type { Consulta, RecetaEmitida } from '../../../../dominio/clinica/consulta.js';
import type { Paciente } from '../../../../dominio/clinica/paciente.js';
import type { EjecutorSql } from '../../sql/tipos-sql.js';
import { fechaDb, instantaneaReceta, instanteNanos, idClinicoEstable } from '../../sql/mapear-clinica-sql.js';
import { aplicarCambiosPacientesMysql } from '../pacientes/aplicar-cambios-pacientes-mysql.js';

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

async function ultimoId(executor: EjecutorSql): Promise<number> {
  const resultado = await executor.consultar<{ id: number | string }>('SELECT LAST_INSERT_ID() AS id');
  return Number(resultado.filas[0]?.id);
}

async function interno(
  executor: EjecutorSql,
  tabla: string,
  columna: string,
  idPublico: string,
  mensaje: string,
): Promise<number> {
  const resultado = await executor.consultar<{ id: number | string }>(
    `SELECT ${columna} AS id FROM ${tabla} WHERE id_publico = ?`,
    [idPublico],
  );
  const id = Number(resultado.filas[0]?.id);
  if (!Number.isSafeInteger(id)) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', mensaje);
  return id;
}

async function revisionActual(executor: EjecutorSql, tabla: string, idPublico: string): Promise<number | null> {
  const resultado = await executor.consultar<{ revision: number | string }>(
    `SELECT revision FROM ${tabla} WHERE id_publico = ?`, [idPublico],
  );
  const revision = resultado.filas[0]?.revision;
  return revision === undefined ? null : Number(revision);
}

async function avanzarRevisionPaciente(executor: EjecutorSql, cambio: CambioPlanificado): Promise<void> {
  const paciente = cambio.nuevoEstado as Paciente;
  if (cambio.versionAnterior === null) return;
  await executor.consultar(
    'UPDATE paciente SET revision = ? WHERE id_publico = ? AND revision = ?',
    [paciente.version, paciente.id, cambio.versionAnterior],
  );
  if (await revisionActual(executor, 'paciente', paciente.id) !== paciente.version) {
    throw new ErrorDominio('VERSION_DESACTUALIZADA', 'El paciente ha sido modificado por otro proceso.');
  }
}

async function guardarCita(executor: EjecutorSql, cambio: CambioPlanificado): Promise<void> {
  const cita = cambio.nuevoEstado as Cita;
  const idPaciente = await interno(executor, 'paciente', 'id_paciente', cita.paciente_id, 'Paciente no disponible para la cita.');
  const idOdontologo = await interno(executor, 'odontologo', 'id_odontologo', cita.profesional_id, 'Profesional no disponible para la cita.');
  const fechaHora = `${cita.fecha} ${cita.hora_inicio}:00`;
  const horaFin = cita.hora_fin === null ? null : `${cita.hora_fin}:00`;
  if (cambio.versionAnterior === null) {
    await executor.consultar(
      `INSERT INTO cita (id_publico, revision, id_paciente, id_odontologo, fecha_hora, hora_fin,
         duracion_minutos, consultorio, motivo, motivo_cancelacion, estado, fecha_creacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cita.id, cita.version, idPaciente, idOdontologo, fechaHora, horaFin, cita.duracion_minutos,
        cita.consultorio ?? null, cita.motivo, cita.motivo_cancelacion ?? null, cita.estado, fechaDb(cita.fecha_creacion)],
    );
    return;
  }
  // EN_CURSO es lógico (consulta abierta); el enum físico dental no lo admite.
  const estadoFisico = cita.estado === 'EN_CURSO' ? null : cita.estado;
  await executor.consultar(
    `UPDATE cita SET revision = ?, fecha_hora = ?, hora_fin = ?, duracion_minutos = ?, consultorio = ?,
       motivo = ?, motivo_cancelacion = ?, estado = COALESCE(?, estado)
     WHERE id_publico = ? AND revision = ?`,
    [cita.version, fechaHora, horaFin, cita.duracion_minutos, cita.consultorio ?? null, cita.motivo,
      cita.motivo_cancelacion ?? null, estadoFisico, cita.id, cambio.versionAnterior],
  );
  if (await revisionActual(executor, 'cita', cita.id) !== cita.version) {
    throw new ErrorDominio('VERSION_DESACTUALIZADA', 'La cita ha sido modificada por otro proceso.');
  }
}

async function resolverCatalogoDiagnostico(executor: EjecutorSql, codigo: string, nombre: string): Promise<number> {
  const existente = await executor.consultar<{ id: number | string }>(
    'SELECT id_diagnostico AS id FROM diagnostico WHERE codigo = ? LIMIT 1', [codigo],
  );
  if (existente.filas[0]) return Number(existente.filas[0].id);
  await executor.consultar(
    'INSERT INTO diagnostico (id_publico, revision, codigo, nombre) VALUES (?, 1, ?, ?) ON DUPLICATE KEY UPDATE id_diagnostico = LAST_INSERT_ID(id_diagnostico)',
    [idClinicoEstable(codigo, 'catalogo-diagnostico-dental'), codigo, nombre],
  );
  return ultimoId(executor);
}

async function resolverTratamiento(executor: EjecutorSql, nombre: string): Promise<number> {
  const existente = await executor.consultar<{ id: number | string }>(
    'SELECT id_tratamiento AS id FROM tratamiento WHERE nombre = ? LIMIT 1', [nombre],
  );
  if (existente.filas[0]) return Number(existente.filas[0].id);
  await executor.consultar(
    'INSERT INTO tratamiento (id_publico, revision, nombre) VALUES (?, 1, ?) ON DUPLICATE KEY UPDATE id_tratamiento = LAST_INSERT_ID(id_tratamiento)',
    [idClinicoEstable(nombre, 'catalogo-tratamiento-dental'), nombre],
  );
  return ultimoId(executor);
}

async function resolverMedicamento(executor: EjecutorSql, receta: RecetaEmitida, idMedicamento: string): Promise<number> {
  const med = receta.medicamentos.find((m) => m.id === idMedicamento)!;
  const existente = await executor.consultar<{ id: number | string }>(
    `SELECT id_medicamento AS id FROM medicamento
      WHERE LOWER(nombre_generico) = LOWER(?) AND COALESCE(presentacion, '') = COALESCE(?, '')
        AND COALESCE(concentracion, '') = COALESCE(?, '') LIMIT 1`,
    [med.nombre, med.presentacion, med.concentracion],
  );
  if (existente.filas[0]) return Number(existente.filas[0].id);
  await executor.consultar(
    'INSERT INTO medicamento (id_publico, revision, nombre_generico, presentacion, concentracion) VALUES (?, 1, ?, ?, ?)',
    [idClinicoEstable(med.id, 'catalogo-medicamento-dental'), med.nombre, med.presentacion, med.concentracion],
  );
  return ultimoId(executor);
}

async function guardarReceta(executor: EjecutorSql, idConsulta: number, receta: RecetaEmitida): Promise<void> {
  const existente = await executor.consultar<{ id_receta: number | string }>(
    'SELECT id_receta FROM receta WHERE id_consulta = ?', [idConsulta],
  );
  if (existente.filas[0]) return;
  await executor.consultar(
    `INSERT INTO receta (estado, id_publico, revision, id_consulta, fecha_emision)
     VALUES ('BORRADOR', ?, 1, ?, ?)`,
    [receta.id, idConsulta, fechaDb(receta.fecha_emision)],
  );
  const idReceta = await ultimoId(executor);
  if (!Number.isSafeInteger(idReceta) || idReceta <= 0) {
    throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No se pudo registrar la receta.');
  }
  const usados = new Set<number>();
  for (const med of receta.medicamentos) {
    const idMedicamento = await resolverMedicamento(executor, receta, med.id);
    if (usados.has(idMedicamento)) continue;
    usados.add(idMedicamento);
    await executor.consultar(
      `INSERT INTO detalle_receta (id_publico, revision, id_receta, id_medicamento, dosis,
         frecuencia, duracion, via_administracion, indicaciones)
       VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)`,
      [idClinicoEstable(med.id, 'detalle-receta-dental'), idReceta, idMedicamento, med.dosis, med.frecuencia,
        med.duracion === '' ? null : med.duracion, med.via, med.indicaciones],
    );
  }
  await executor.consultar(
    "UPDATE receta SET estado = 'EMITIDA', contenido_historico = ? WHERE id_receta = ?",
    [JSON.stringify(instantaneaReceta(receta)), idReceta],
  );
}

async function guardarConsulta(executor: EjecutorSql, cambio: CambioPlanificado): Promise<void> {
  const consulta = cambio.nuevoEstado as Consulta;
  const idPaciente = await interno(executor, 'paciente', 'id_paciente', consulta.paciente_id,
    'Paciente no disponible para la consulta.');
  const historial = await executor.consultar<{ id_historial: number | string }>(
    'SELECT id_historial FROM historial_clinico WHERE id_paciente = ? FOR SHARE', [idPaciente],
  );
  const idHistorial = Number(historial.filas[0]?.id_historial);
  if (!Number.isSafeInteger(idHistorial)) {
    throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'Historial clínico no disponible.');
  }
  if (!consulta.cita_id) throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'La consulta dental exige una cita.');
  const idCita = await interno(executor, 'cita', 'id_cita', consulta.cita_id, 'Cita no disponible para la consulta.');
  const idOdontologo = await interno(executor, 'odontologo', 'id_odontologo', consulta.profesional.id,
    'Profesional no disponible para la consulta.');
  const profesionalJson = JSON.stringify(consulta.profesional);
  let idConsulta: number;
  if (cambio.versionAnterior === null) {
    await executor.consultar(
      `INSERT INTO consulta_odontologica (id_publico, revision, id_historial, id_cita, id_odontologo,
         fecha_hora, motivo, sintomas, observaciones, profesional_historico, campos_signos, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ABIERTA')`,
      [consulta.id, consulta.version, idHistorial, idCita, idOdontologo, fechaDb(consulta.fecha_hora),
        consulta.motivo, consulta.sintomas === '' ? null : consulta.sintomas, consulta.observaciones ?? null,
        profesionalJson, JSON.stringify(Object.keys(consulta.signos_vitales))],
    );
    idConsulta = await ultimoId(executor);
    if (!Number.isSafeInteger(idConsulta) || idConsulta <= 0) {
      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No se pudo registrar la consulta.');
    }
  } else {
    await executor.consultar(
      `UPDATE consulta_odontologica SET revision = ?, motivo = ?, sintomas = ?, observaciones = ?,
         profesional_historico = ?, campos_signos = ?, estado = 'ABIERTA'
       WHERE id_publico = ? AND revision = ?`,
      [consulta.version, consulta.motivo, consulta.sintomas === '' ? null : consulta.sintomas,
        consulta.observaciones ?? null, profesionalJson, JSON.stringify(Object.keys(consulta.signos_vitales)), consulta.id, cambio.versionAnterior],
    );
    if (await revisionActual(executor, 'consulta_odontologica', consulta.id) !== consulta.version) {
      throw new ErrorDominio('VERSION_DESACTUALIZADA', 'La consulta ha sido modificada por otro proceso.');
    }
    const fila = await executor.consultar<{ id_consulta: number | string }>(
      'SELECT id_consulta FROM consulta_odontologica WHERE id_publico = ?', [consulta.id],
    );
    idConsulta = Number(fila.filas[0]?.id_consulta);
  }
  await guardarSignos(executor, idConsulta, consulta, cambio.versionAnterior === null);
  await guardarDiagnosticos(executor, idConsulta, consulta);
  await guardarTratamientos(executor, idConsulta, consulta);
  if (consulta.receta) await guardarReceta(executor, idConsulta, consulta.receta);
  if (consulta.estado === 'FINALIZADA') {
    await executor.consultar("UPDATE consulta_odontologica SET estado = 'FINALIZADA' WHERE id_consulta = ?", [idConsulta]);
  }
}

async function guardarSignos(executor: EjecutorSql, idConsulta: number, consulta: Consulta, esNueva: boolean): Promise<void> {
  const valores = consulta.signos_vitales;
  if (Object.values(valores).every((v) => v === null || v === undefined)) return;
  const parametros = [fechaDb(consulta.fecha_hora), valores.peso_kg ?? null, valores.talla_cm ?? null,
    valores.temperatura_c ?? null, valores.presion_sistolica ?? null, valores.presion_diastolica ?? null,
    valores.frecuencia_cardiaca_lpm ?? null, valores.frecuencia_respiratoria_rpm ?? null,
    valores.saturacion_oxigeno_pct ?? null];
  if (!esNueva) {
    const previos = await executor.consultar<Record<string, unknown>>(
      `SELECT peso_kg, talla_cm, temperatura_c, presion_sistolica, presion_diastolica,
              frecuencia_cardiaca_lpm, frecuencia_respiratoria_rpm, saturacion_oxigeno_pct
         FROM signos_vitales_consulta WHERE id_consulta = ?`,
      [idConsulta],
    );
    const fila = previos.filas[0];
    if (fila && mismoSigno(fila, valores)) return;
    if (fila) {
      await executor.consultar(
        `UPDATE signos_vitales_consulta SET fecha_hora_medicion = ?, peso_kg = ?, talla_cm = ?, temperatura_c = ?,
           presion_sistolica = ?, presion_diastolica = ?, frecuencia_cardiaca_lpm = ?,
           frecuencia_respiratoria_rpm = ?, saturacion_oxigeno_pct = ?
         WHERE id_consulta = ?`,
        [...parametros, idConsulta],
      );
      return;
    }
  }
  await executor.consultar(
    `INSERT INTO signos_vitales_consulta (id_publico, revision, id_consulta, fecha_hora_medicion, peso_kg,
       talla_cm, temperatura_c, presion_sistolica, presion_diastolica, frecuencia_cardiaca_lpm,
       frecuencia_respiratoria_rpm, saturacion_oxigeno_pct)
     VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [idClinicoEstable(`${consulta.id}:${consulta.version}`, 'signos-dental'), idConsulta, ...parametros],
  );
}

function mismoSigno(fila: Record<string, unknown>, valores: Consulta['signos_vitales']): boolean {
  const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return n(fila.peso_kg) === (valores.peso_kg ?? null) &&
    n(fila.talla_cm) === (valores.talla_cm ?? null) &&
    n(fila.temperatura_c) === (valores.temperatura_c ?? null) &&
    n(fila.presion_sistolica) === (valores.presion_sistolica ?? null) &&
    n(fila.presion_diastolica) === (valores.presion_diastolica ?? null) &&
    n(fila.frecuencia_cardiaca_lpm) === (valores.frecuencia_cardiaca_lpm ?? null) &&
    n(fila.frecuencia_respiratoria_rpm) === (valores.frecuencia_respiratoria_rpm ?? null) &&
    n(fila.saturacion_oxigeno_pct) === (valores.saturacion_oxigeno_pct ?? null);
}

async function guardarDiagnosticos(executor: EjecutorSql, idConsulta: number, consulta: Consulta): Promise<void> {
  for (const diagnostico of consulta.diagnosticos) {
    const existe = await executor.consultar<{ id: number | string }>(
      'SELECT 1 AS id FROM consulta_diagnostico WHERE id_publico = ?', [diagnostico.id],
    );
    if (existe.filas[0]) continue;
    const idCatalogo = await resolverCatalogoDiagnostico(executor, diagnostico.codigo_cie, diagnostico.nombre);
    await executor.consultar(
      `INSERT INTO consulta_diagnostico (id_publico, revision, id_consulta, id_diagnostico, es_principal,
         nombre_historico, observaciones, fecha_registro, autor_historico)
       VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)`,
      [diagnostico.id, idConsulta, idCatalogo, diagnostico.es_principal ? 1 : 0, diagnostico.nombre,
        diagnostico.observacion ?? null, fechaDb(diagnostico.fecha_registro), JSON.stringify(diagnostico.registrado_por)],
    );
    await executor.consultar('UPDATE consulta_diagnostico SET orden_registro = ? WHERE id_publico = ?', [consulta.diagnosticos.indexOf(diagnostico), diagnostico.id]);
  }
}

async function guardarTratamientos(executor: EjecutorSql, idConsulta: number, consulta: Consulta): Promise<void> {
  for (const tratamiento of consulta.tratamientos) {
    const existe = await executor.consultar<{ id: number | string }>(
      'SELECT 1 AS id FROM consulta_tratamiento WHERE id_publico = ?', [tratamiento.id],
    );
    if (existe.filas[0]) continue;
    const idCatalogo = await resolverTratamiento(executor, tratamiento.descripcion);
    await executor.consultar(
      `INSERT INTO consulta_tratamiento (id_publico, revision, id_consulta, id_tratamiento, fecha_inicio,
         observaciones, nombre_historico, fecha_registro, autor_historico)
       VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)`,
      [tratamiento.id, idConsulta, idCatalogo, tratamiento.fecha_registro.slice(0, 10), tratamiento.indicaciones,
        tratamiento.descripcion, fechaDb(tratamiento.fecha_registro), JSON.stringify(tratamiento.registrado_por)],
    );
    await executor.consultar('UPDATE consulta_tratamiento SET orden_registro = ? WHERE id_publico = ?', [consulta.tratamientos.indexOf(tratamiento), tratamiento.id]);
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
    'INSERT INTO clinica_historial.eventos (id, paciente_id, tipo, fecha_hora, contenido) VALUES (?, ?, ?, ?, ?)',
    [evento.id, evento.pacienteId, evento.tipo, fecha, JSON.stringify(contenido)],
  );
}

export async function aplicarCambiosClinicosMysql(
  executor: EjecutorSql,
  contexto: ContextoAutenticado,
  comando: ComandoEstable,
  cambios: readonly CambioPlanificado[],
): Promise<void> {
  for (const c of cambios.filter(c => c.agregado === 'estadoHistorial')) await aplicarEstadoHistorialSql(executor, 'mysql', c);
  const esClinico = (c: CambioPlanificado) =>
    c.agregado === 'citas' || c.agregado === 'consultas' || c.agregado === 'eventosHistorial' ||
    (c.agregado === 'pacientes' && c.tipo === 'AVANZAR_REVISION');
  const dePacientes = cambios.filter((c) => !esClinico(c) && c.agregado !== 'estadoHistorial');
  if (dePacientes.length > 0) {
    await aplicarCambiosPacientesMysql(executor, contexto, comando, dePacientes);
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
        if (comando.caso === 'consulta.corregir') await corregirConsultaSql(executor, 'mysql', contexto, comando, cambio);
        else await guardarConsulta(executor, cambio);
        break;
      case 'eventosHistorial':
        await guardarEvento(executor, cambio);
        break;
      default:
        throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', `Agregado no soportado por la UoW clínica: ${cambio.agregado}.`);
    }
  }
}
