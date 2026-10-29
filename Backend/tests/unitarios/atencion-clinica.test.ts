import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AtencionClinica } from '../../src/aplicacion/casos-uso/consultas/atencion-clinica.js';
import { ConsultarConsulta } from '../../src/aplicacion/casos-uso/consultas/consultar-consulta.js';
import { GestionarCitas } from '../../src/aplicacion/casos-uso/citas/gestionar-citas.js';
import { dependenciasComandoPorDefecto } from '../../src/adaptadores/salida/sistema/servicios-sistema.js';
import { INSTITUCIONES_CANONICAS } from '../../src/dominio/compartido/institucion.js';
import { validarSignos, validarReceta, validarTamanoClinico } from '../../src/dominio/clinica/consulta.js';
import { intervaloCita } from '../../src/dominio/clinica/cita.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';
import { escenarioClinico, nuevoId, medicamento, ahora } from '../fixtures/clinica-comun.js';
const servicio = new AtencionClinica(dependenciasComandoPorDefecto);
const agenda = new GestionarCitas(dependenciasComandoPorDefecto);
const error = (codigo: string) => (e: unknown) => (e as { codigo: string }).codigo === codigo;
for (const institucion of INSTITUCIONES_CANONICAS) describe(`CA04/05/06 común — ${institucion} (UoW sintética)`, () => {
  it('confirma atención, receta histórica, componentes y cita en una UoW; replay no duplica', async () => {
    const s = escenarioClinico(institucion); s.control.repetirCallback = true;
    const p = { contexto: s.contexto, bundle: s.bundle, claveIdempotencia: nuevoId(), entrada: s.entrada };
    const r = await servicio.ejecutar('completa', p);
    assert.equal(r.httpStatus, 201); assert.equal(r.respuesta.estado, 'FINALIZADA'); assert.equal(s.consultas.size, 1);
    assert.equal(s.auditoria.length, 1); assert.equal(s.operaciones.size, 1); assert.equal(s.eventos.length, 4);
    assert.equal(r.respuesta.receta!.medicamentos[0]!.dosis, '1 tableta');
    assert.equal(r.respuesta.diagnosticos[0]!.registrado_por.id, s.profesional.id);
    if (institucion === 'CLINICA_ODONTOLOGICA') assert.equal(s.citas.get(s.cita.id)!.estado, 'ATENDIDA');
    if (institucion === 'CENTRO_MEDICO_PEDIATRICO') assert.equal(r.respuesta.autorizacion!.identificacion_historica.numero, '1234567890101');
    s.profesional = { ...s.profesional, nombre: 'Nombre posterior' };
    const replay = await servicio.ejecutar('completa', p); assert.deepEqual(replay, r);
    assert.equal(replay.respuesta.receta!.prescriptor.nombre, 'Profesional sintético'); assert.equal(s.auditoria.length, 1);
    await assert.rejects(servicio.ejecutar('completa', { ...p, entrada: { ...s.entrada, motivo: 'Otra intención' } }), error('CLAVE_REUTILIZADA'));
  });
  for (const fallo of ['datos', 'receta', 'auditoria'] as const) it(`rollback íntegro ante fallo de ${fallo}`, async () => {
    const s = escenarioClinico(institucion); s.control.fallo = fallo;
    await assert.rejects(servicio.ejecutar('completa', { contexto: s.contexto, bundle: s.bundle, claveIdempotencia: nuevoId(), entrada: s.entrada }));
    assert.equal(s.consultas.size, 0); assert.equal(s.operaciones.size, 0); assert.equal(s.auditoria.length, 0);
    assert.equal(s.revisiones.length, 0); assert.equal(s.eventos.length, 0); assert.equal(s.pacientes.get(s.paciente.id)!.version, 1);
    assert.equal(s.citas.get(s.cita.id)!.estado, 'PROGRAMADA');
  });
  it('apertura, componentes, receta y finalización preservan versiones exactas y fechas propias', async () => {
    const s = escenarioClinico(institucion);
    const entrada = Object.fromEntries(Object.entries(s.entrada).filter(([k]) => !['diagnosticos', 'tratamientos', 'receta'].includes(k)));
    const p = { contexto: s.contexto, bundle: s.bundle, claveIdempotencia: nuevoId() };
    const abierta = (await servicio.ejecutar('abrir', { ...p, entrada })).respuesta;
    const emitir = async (accion: 'diagnostico' | 'tratamiento' | 'receta' | 'finalizar', version: number, extra: object = {}) =>
      (await servicio.ejecutar(accion, { ...p, claveIdempotencia: nuevoId(), id: abierta.id, entrada: { version_esperada: version, ...extra } })).respuesta;
    const d = await emitir('diagnostico', 1, { diagnostico: s.entrada.diagnosticos[0] });
    assert.equal(d.version, 2); assert.ok(d.diagnosticos[0]!.fecha_registro >= abierta.fecha_hora);
    await emitir('tratamiento', 2, { tratamiento: s.entrada.tratamientos[0] });
    const r = await emitir('receta', 3, { receta: s.entrada.receta });
    await assert.rejects(emitir('receta', 4, { receta: s.entrada.receta }), error('RECETA_EXISTENTE'));
    // Puede terminar una atención iniciada antes de archivar al paciente.
    s.pacientes.set(s.paciente.id, { ...s.pacientes.get(s.paciente.id)!, estado: 'ARCHIVADO' });
    const final = await emitir('finalizar', 4); assert.equal(final.estado, 'FINALIZADA');
    assert.equal(final.receta!.fecha_emision, r.receta!.fecha_emision);
    const v1 = await new ConsultarConsulta().ejecutar(s.contexto, s.bundle, abierta.id, 1);
    assert.deepEqual(v1, abierta); assert.equal(v1.diagnosticos.length, 0);
    await assert.rejects(new ConsultarConsulta().ejecutar(s.contexto, s.bundle, abierta.id, 99), error('RECURSO_NO_ENCONTRADO'));
    await assert.rejects(emitir('finalizar', 5), error('ESTADO_INVALIDO'));
  });
  it('rechaza estado, versiones, principales y autoridad enviada sin fragmentos', async () => {
    for (const entrada of [
      { ...escenarioClinico(institucion).entrada, profesional_id: nuevoId() },
      { ...escenarioClinico(institucion).entrada, actor_id: nuevoId() },
      { ...escenarioClinico(institucion).entrada, diagnosticos: [{ codigo_cie: 'A', nombre: 'S', es_principal: false }] },
      { ...escenarioClinico(institucion).entrada, tratamientos: [{ descripcion: 'S', indicaciones: 'S', fecha_inicio: '2026-10-29', fecha_fin: '2026-10-28' }] },
    ]) {
      const s = escenarioClinico(institucion);
      await assert.rejects(servicio.ejecutar('completa', { contexto: s.contexto, bundle: s.bundle, claveIdempotencia: nuevoId(), entrada }), error('SOLICITUD_INVALIDA'));
      assert.equal(s.consultas.size, 0);
    }
    const s = escenarioClinico(institucion), p = { contexto: s.contexto, bundle: s.bundle, claveIdempotencia: nuevoId() };
    await assert.rejects(servicio.ejecutar('completa', { ...p, entrada: { ...s.entrada, version_paciente: 2 } }), error('VERSION_DESACTUALIZADA'));
    s.pacientes.set(s.paciente.id, { ...s.paciente, estado: 'ARCHIVADO' });
    await assert.rejects(servicio.ejecutar('completa', { ...p, entrada: s.entrada }), error('ESTADO_INVALIDO'));
  });
  it('revalida permisos y profesional actuales incluso al repetir operación', async () => {
    const s = escenarioClinico(institucion), p = { contexto: s.contexto, bundle: s.bundle, claveIdempotencia: nuevoId(), entrada: s.entrada };
    await servicio.ejecutar('completa', p);
    s.cuenta = { ...s.cuenta, permisos: ['historial.leer'] };
    await assert.rejects(servicio.ejecutar('completa', p), error('SIN_PERMISO'));
    assert.equal(s.auditoria.length, 1);
    const t = escenarioClinico(institucion); t.profesional = { ...t.profesional, activo: false };
    await assert.rejects(servicio.ejecutar('completa', { contexto: t.contexto, bundle: t.bundle, claveIdempotencia: nuevoId(), entrada: t.entrada }), error('SIN_PERMISO'));
    assert.equal(t.consultas.size, 0);
  });
  it('permite cero diagnósticos y serializa doble intención y versión concurrente', async () => {
    const s = escenarioClinico(institucion), p = { contexto: s.contexto, bundle: s.bundle, claveIdempotencia: nuevoId(), entrada: { ...s.entrada, diagnosticos: [], tratamientos: [] } };
    const resultados = await Promise.all([servicio.ejecutar('completa', p), servicio.ejecutar('completa', p)]);
    assert.deepEqual(resultados[0], resultados[1]); assert.equal(s.consultas.size, 1);
    const t = escenarioClinico(institucion), base = { contexto: t.contexto, bundle: t.bundle, entrada: t.entrada };
    const carrera = await Promise.allSettled([servicio.ejecutar('completa', { ...base, claveIdempotencia: nuevoId() }), servicio.ejecutar('completa', { ...base, claveIdempotencia: nuevoId() })]);
    assert.equal(carrera.filter(r => r.status === 'fulfilled').length, 1); assert.equal(t.consultas.size, 1);
  });
});
describe('Políticas institucionales y límites clínicos', () => {
  it('dental exige cita propia, programada, versión y profesional coincidente', async () => {
    for (const cambio of ['sin', 'cancelada', 'ajena', 'profesional', 'version']) {
      const s = escenarioClinico('CLINICA_ODONTOLOGICA'); let entrada: object = s.entrada;
      if (cambio === 'sin') { entrada = Object.fromEntries(Object.entries(s.entrada).filter(([k]) => !['cita_id', 'version_cita'].includes(k))); }
      if (cambio === 'cancelada') s.citas.set(s.cita.id, { ...s.cita, estado: 'CANCELADA', motivo_cancelacion: 'S' });
      if (cambio === 'ajena') s.citas.set(s.cita.id, { ...s.cita, paciente_id: nuevoId() });
      if (cambio === 'profesional') s.citas.set(s.cita.id, { ...s.cita, profesional_id: nuevoId() });
      if (cambio === 'version') entrada = { ...s.entrada, version_cita: 2 };
      await assert.rejects(servicio.ejecutar('completa', { contexto: s.contexto, bundle: s.bundle, claveIdempotencia: nuevoId(), entrada })); assert.equal(s.consultas.size, 0);
    }
  });
  it('principal sin autorización o vínculo retirado no permite atención pediátrica', async () => {
    for (const vinculo of [{ activo: true, autorizaAtencion: false }, { activo: false, autorizaAtencion: true }]) {
      const s = escenarioClinico('CENTRO_MEDICO_PEDIATRICO'); s.autorizacion = { ...s.autorizacion, ...vinculo };
      await assert.rejects(servicio.ejecutar('completa', { contexto: s.contexto, bundle: s.bundle, claveIdempotencia: nuevoId(), entrada: s.entrada }), error('SIN_PERMISO')); assert.equal(s.consultas.size, 0);
    }
  });
  it('laboratorio rechaza solicitante institucional y analista; no publica agenda', async () => {
    const s = escenarioClinico('LABORATORIO_CLINICO'); s.profesional = { ...s.profesional, tipo: 'INSTITUCIONAL' };
    await assert.rejects(servicio.ejecutar('completa', { contexto: s.contexto, bundle: s.bundle, claveIdempotencia: nuevoId(), entrada: s.entrada }), error('SIN_PERMISO'));
    s.profesional = { ...s.profesional, tipo: 'INDIVIDUAL' }; s.cuenta = { ...s.cuenta, roles: ['ANALISTA_LABORATORIO'] };
    await assert.rejects(servicio.ejecutar('completa', { contexto: s.contexto, bundle: s.bundle, claveIdempotencia: nuevoId(), entrada: s.entrada }), error('SIN_PERMISO'));
    await assert.rejects(agenda.ejecutar('crear', { contexto: s.contexto, bundle: s.bundle, claveIdempotencia: nuevoId(), entrada: {} }), error('SIN_PERMISO'));
  });
  it('valida escala decimal sin redondear, fechas reales, medianoche y dosis completas', () => {
    assert.deepEqual(validarSignos({ temperatura_c: 36.7, peso_kg: 12.345, saturacion_oxigeno_pct: 99.99 }, 'HOSPITAL_GENERAL'), { temperatura_c: 36.7, peso_kg: 12.345, saturacion_oxigeno_pct: 99.99 });
    for (const signos of [{ peso_kg: 12.3456 }, { temperatura_c: 36.75 }, { presion_sistolica: 120.5 }, { talla_cm: NaN }]) assert.throws(() => validarSignos(signos, 'HOSPITAL_GENERAL'), error('SOLICITUD_INVALIDA'));
    assert.throws(() => validarSignos({ perimetro_cefalico_cm: 40 }, 'HOSPITAL_GENERAL'), error('SIN_PERMISO'));
    assert.throws(() => intervaloCita('2026-02-30', '10:00', 30)); assert.throws(() => intervaloCita('2026-10-28', '23:50', 30));
    assert.equal(intervaloCita('2026-10-28', '10:00', 30).hora_fin, '10:30');
    assert.throws(() => validarReceta({ medicamentos: [{ ...medicamento, concentracion: '' }] }));
    assert.throws(() => validarTamanoClinico('á'.repeat(131073)), error('LIMITE_AGREGADO'));
  });
  it('controla 100 elementos, tamaño 256 KiB, duplicados dentales y desborde de versión', async () => {
    const s = escenarioClinico('HOSPITAL_GENERAL');
    for (const entrada of [{ ...s.entrada, diagnosticos: Array(101).fill(s.entrada.diagnosticos[0]) },
      { ...s.entrada, tratamientos: Array.from({ length: 100 }, () => ({ descripcion: 't'.repeat(200), indicaciones: 'á'.repeat(2000) })) }]) {
      await assert.rejects(servicio.ejecutar('completa', { contexto: s.contexto, bundle: s.bundle, claveIdempotencia: nuevoId(), entrada }), error('LIMITE_AGREGADO'));
    }
    s.pacientes.set(s.paciente.id, { ...s.paciente, version: versionPositiva(Number.MAX_SAFE_INTEGER) });
    await assert.rejects(servicio.ejecutar('completa', { contexto: s.contexto, bundle: s.bundle, claveIdempotencia: nuevoId(), entrada: { ...s.entrada, version_paciente: Number.MAX_SAFE_INTEGER } }), error('ESTADO_INVALIDO'));
    assert.equal(s.consultas.size, 0);
    const d = escenarioClinico('CLINICA_ODONTOLOGICA');
    await assert.rejects(servicio.ejecutar('completa', { contexto: d.contexto, bundle: d.bundle, claveIdempotencia: nuevoId(), entrada: { ...d.entrada, tratamientos: [d.entrada.tratamientos[0], d.entrada.tratamientos[0]] } }), error('SOLICITUD_INVALIDA'));
  });
});
for (const institucion of INSTITUCIONES_CANONICAS.filter(i => i !== 'LABORATORIO_CLINICO')) describe(`Agenda CA06 — ${institucion}`, () => {
  it('crea, rechaza solapamiento semiabierto, reprograma y cancela preservando motivos y fecha original', async () => {
    const s = escenarioClinico(institucion), p = { contexto: s.contexto, bundle: s.bundle };
    const entrada = { paciente_id: s.paciente.id, version_paciente: 1, profesional_id: s.profesional.id, fecha: '2026-10-28', hora_inicio: '10:30', duracion_minutos: 30, motivo: 'Atención original' };
    const cita = (await agenda.ejecutar('crear', { ...p, entrada, claveIdempotencia: nuevoId() })).respuesta;
    await assert.rejects(agenda.ejecutar('crear', { ...p, entrada: { ...entrada, version_paciente: 2, hora_inicio: '10:45' }, claveIdempotencia: nuevoId() }), error('CITA_SOLAPADA'));
    const cambio = await agenda.ejecutar('reprogramar', { ...p, id: cita.id, claveIdempotencia: nuevoId(), entrada: { version_esperada: 1, fecha: '2026-10-29', hora_inicio: '11:00', motivo: 'Nueva disponibilidad' } });
    assert.equal(cambio.respuesta.fecha_creacion, cita.fecha_creacion); assert.equal(cambio.respuesta.motivo, 'Atención original');
    const cancelada = await agenda.ejecutar('cancelar', { ...p, id: cita.id, claveIdempotencia: nuevoId(), entrada: { version_esperada: 2, motivo: 'Cancelación justificada' } });
    assert.equal(cancelada.respuesta.motivo_cancelacion, 'Cancelación justificada'); assert.equal(cancelada.respuesta.motivo, 'Atención original'); assert.equal(s.revisiones.length, 2);
    assert.equal(s.citas.get(cita.id)!.estado, 'CANCELADA'); assert.ok(cita.fecha_creacion >= ahora);
  });
});
