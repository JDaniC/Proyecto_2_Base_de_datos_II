import assert from 'node:assert/strict';
import { before, after, describe, it } from 'node:test';
import { resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/composicion/app.module.js';
import { crearAplicacionHttp } from '../../src/composicion/crear-aplicacion-http.js';
import { leerContratoOpenApi } from '../../src/composicion/leer-contrato-openapi.js';
import { parsearConfiguracion } from '../../src/configuracion/entorno.js';
import { INSTITUCIONES_CANONICAS } from '../../src/dominio/compartido/institucion.js';
import { VerificadorIdentidadMemoria } from '../../src/adaptadores/salida/identidad/verificador-identidad-memoria.js';
import { escenarioClinico, nuevoId } from '../fixtures/clinica-comun.js';
import type { Consulta } from '../../src/dominio/clinica/consulta.js';
const escenarios = INSTITUCIONES_CANONICAS.map(escenarioClinico);
for (const s of escenarios) s.cuenta = {...s.cuenta, permisos: [...s.cuenta.permisos, 'historial.archivar']};
const tokens = escenarios.map(s => ({ token: `clinica-${s.bundle.institucion}`, uid: s.cuenta.uid, institucion: s.bundle.institucion }));
describe('HTTP clínico — transporte real, identidad y UoW sintéticas', () => {
  let app: INestApplication, url: string;
  before(async () => {
    const config = parsearConfiguracion({ APP_ENV: 'test', HOST: '127.0.0.1', PORT: '3000', INSTITUTIONS: INSTITUCIONES_CANONICAS.join(',') });
    app = await crearAplicacionHttp(AppModule.registrar(config, { bundles: escenarios.map(s => s.bundle), verificadorIdentidad: new VerificadorIdentidadMemoria(tokens) }), leerContratoOpenApi(resolve('docs/openapi.yaml')));
    await app.listen(0, '127.0.0.1'); url = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}/api/v1`;
  });
  after(async () => { await app?.close(); });
  const post = (path: string, entrada: unknown, index = 0, clave = nuevoId()) => fetch(url + path, { method: 'POST', headers: { authorization: `Bearer ${tokens[index]!.token}`, 'content-type': 'application/json', 'idempotency-key': clave }, body: JSON.stringify(entrada) });
  const get = (path: string, index = 0) => fetch(url + path, { headers: { authorization: `Bearer ${tokens[index]!.token}` } });
  for (const [i, institucion] of INSTITUCIONES_CANONICAS.entries()) it(`201, replay y GET exacto — ${institucion}`, async () => {
    const s = escenarios[i]!, clave = nuevoId();
    const respuesta = await post('/consultas/completas', s.entrada, i, clave);
    assert.equal(respuesta.status, 201); const body = await respuesta.json() as { data: Consulta; meta: { correlacion: string } };
    assert.equal(body.data.estado, 'FINALIZADA'); assert.ok(body.data.receta?.codigo_legible);
    assert.equal('autorizacion' in body.data, false); assert.equal('colegiado' in body.data.profesional, false);
    assert.equal(respuesta.headers.get('x-correlation-id'), body.meta.correlacion);
    const replay = await post('/consultas/completas', s.entrada, i, clave); assert.equal(replay.status, 201); assert.deepEqual(await replay.json(), body);
    const exacta = await get(`/consultas/${body.data.id}?version=1`, i); assert.equal(exacta.status, 200); assert.deepEqual((await exacta.json() as { data: Consulta }).data, body.data);
    assert.equal((await get(`/consultas/${body.data.id}?version=99`, i)).status, 404);
    assert.equal((await get(`/consultas/${body.data.id}`, (i + 1) % 4)).status, 404);
  });
  it('400 en autoridad extra, metadatos del servidor, claves y versiones malformadas', async () => {
    const s = escenarios[0]!;
    for (const extra of [{ profesional_id: nuevoId() }, { institucion: 'LABORATORIO_CLINICO' }, { actor_id: nuevoId() }, { rol: 'MEDICO' }]) {
      const r = await post('/consultas/completas', { ...s.entrada, ...extra }); assert.equal(r.status, 400);
      const texto = await r.text(); assert.ok(!texto.includes('stack')); assert.ok(!texto.includes('Profesional sintético'));
    }
    const r = await fetch(url + '/consultas', { method: 'POST', headers: { authorization: `Bearer ${tokens[0]!.token}`, 'content-type': 'application/json' }, body: '{}' }); assert.equal(r.status, 400);
    assert.equal((await get(`/consultas/${nuevoId()}?version=1.5`)).status, 400);
  });
  it('401 anónimo y 403 laboratorio sin agenda', async () => {
    assert.equal((await fetch(url + '/consultas/completas', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 401);
    assert.equal((await post('/citas', {}, 2)).status, 403);
    assert.equal((await get('/citas?fecha_desde=2026-10-28&fecha_hasta=2026-10-29', 2)).status, 403);
  });
  it('503 explícito cuando el bundle no tiene puertos clínicos; nunca fallback', async () => {
    const s = escenarios[0]!, original = s.bundle.clinica;
    // Mutación exclusiva del fixture para simular un adaptador pendiente.
    Object.assign(s.bundle, { clinica: undefined });
    try { assert.equal((await get(`/consultas/${nuevoId()}`)).status, 503); }
    finally { Object.assign(s.bundle, { clinica: original }); }
  });
  it('PATCH de reprogramación conserva el contrato y rechaza POST no publicado', async () => {
    const s = escenarios[0]!, headers = { authorization: `Bearer ${tokens[0]!.token}`, 'content-type': 'application/json', 'idempotency-key': nuevoId() };
    const r = await fetch(url + `/citas/${s.cita.id}/reprogramacion`, { method: 'PATCH', headers, body: JSON.stringify({ version_esperada: 1, fecha: '2026-10-29', hora_inicio: '11:00', motivo: 'Cambio sintético' }) });
    assert.equal(r.status, 200); const body = await r.json() as { data: { motivo: string; fecha: string } };
    assert.equal(body.data.motivo, 'Control'); assert.equal(body.data.fecha, '2026-10-29');
    assert.equal((await post(`/citas/${s.cita.id}/reprogramacion`, {})).status, 404);
  });
  for (const [i, institucion] of INSTITUCIONES_CANONICAS.entries()) it(`archivo y corrección HTTP — ${institucion}`, async () => {
    const s = escenarios[i]!;
    const original = [...s.consultas.values()].find(c => c.estado === 'FINALIZADA')!;
    const anterior = await get(`/consultas/${original.id}?version=${original.version}`, i);
    assert.equal(anterior.status, 200);
    const bodyAnterior = await anterior.json();
    const paciente = s.pacientes.get(s.paciente.id)!;
    const archivo = await post(`/pacientes/${paciente.id}/archivo`, {version_esperada: paciente.version, causa: 'TRASLADO', motivo: 'Prueba sintética'}, i);
    assert.equal(archivo.status, 200);
    const correccion = await post(`/consultas/${original.id}/correcciones`, {
      version_esperada: original.version, motivo_correccion: 'Prueba sintética', contenido: {
        motivo: 'Motivo rectificado', sintomas: '', signos_vitales: {}, diagnosticos: [], tratamientos: []}}, i);
    assert.equal(correccion.status, 200);
    const actual = (await correccion.json() as {data: Consulta}).data;
    assert.equal(actual.version, original.version + 1);
    assert.equal(actual.receta, undefined);
    const previa = await get(`/consultas/${original.id}?version=${original.version}`, i);
    assert.deepEqual((await previa.json() as {data: unknown}).data, (bodyAnterior as {data: unknown}).data);
    assert.equal((await post(`/consultas/${original.id}/correcciones`, {version_esperada: actual.version, motivo_correccion: 'Inválido', actor: nuevoId(), contenido: {}}, i)).status, 400);
    const version = s.pacientes.get(paciente.id)!.version;
    const reactiva = await post(`/pacientes/${paciente.id}/reactivacion`, {version_esperada: version, motivo: 'Rectificación sintética'}, i);
    assert.equal(reactiva.status, institucion === 'CENTRO_MEDICO_PEDIATRICO' ? 200 : 403);
  });

  it('E04-P1-01: revisiones de cita, catálogos y antecedentes clínicos en odontología con separación de roles', async () => {
    const idxDental = INSTITUCIONES_CANONICAS.indexOf('CLINICA_ODONTOLOGICA');
    const s = escenarios[idxDental]!;
    const headersOdontologo = {
      authorization: `Bearer ${tokens[idxDental]!.token}`,
      'content-type': 'application/json',
      'idempotency-key': nuevoId(),
    };
    const catMedicos = await get('/catalogos/medicos', idxDental);
    assert.equal(catMedicos.status, 200);
    const bodyMedicos = (await catMedicos.json()) as { data: Array<{ id: string; rol: string }> };
    assert.equal(bodyMedicos.data.length, 1);
    assert.equal(bodyMedicos.data[0]?.id, s.profesional.id);
    assert.equal(bodyMedicos.data[0]?.rol, 'ODONTOLOGO');

    const catOdo = await get('/catalogos/odontologia', idxDental);
    assert.equal(catOdo.status, 200);
    const bodyCatOdo = (await catOdo.json()) as {
      data: { diagnosticos: unknown[]; procedimientos: unknown[]; medicamentos: unknown[] };
    };
    assert.ok(bodyCatOdo.data.diagnosticos.length > 0);
    assert.ok(bodyCatOdo.data.procedimientos.length > 0);
    assert.ok(bodyCatOdo.data.medicamentos.length > 0);

    const antInicial = await get(`/pacientes/${s.paciente.id}/antecedentes`, idxDental);
    assert.equal(antInicial.status, 200);

    // En la prueba previa el paciente quedó ARCHIVADO; activarlo en el fixture para probar flujo dental activo
    const pacientePrevio = s.pacientes.get(s.paciente.id)!;
    s.pacientes.set(s.paciente.id, { ...pacientePrevio, estado: 'ACTIVO' });
    const pacienteActual = s.pacientes.get(s.paciente.id)!;
    const putAnt = await fetch(`${url}/pacientes/${s.paciente.id}/antecedentes`, {
      method: 'PUT',
      headers: headersOdontologo,
      body: JSON.stringify({
        version_esperada: pacienteActual.version,
        patologicos: ['Diabetes tipo 2 controlada'],
        quirurgicos: [],
        familiares: [],
        alergias: [{ sustancia: 'Penicilina', severidad: 'SEVERA', reaccion: 'Urticaria' }],
        medicamentos_actuales: ['Metformina 850 mg'],
      }),
    });
    assert.equal(putAnt.status, 200);
    const bodyAnt = (await putAnt.json()) as {
      data: { alergias: Array<{ sustancia: string }>; patologicos: string[]; version_paciente: number };
    };
    assert.equal(bodyAnt.data.alergias[0]?.sustancia, 'Penicilina');
    assert.deepEqual(bodyAnt.data.patologicos, ['Diabetes tipo 2 controlada']);

    // Crear cita nueva, reprogramarla y consultar GET /citas/:id/revisiones
    const pacTrasAnt = s.pacientes.get(s.paciente.id)!;
    const nuevaCitaRes = await post(
      '/citas',
      {
        paciente_id: s.paciente.id,
        version_paciente: pacTrasAnt.version,
        profesional_id: s.profesional.id,
        fecha: '2026-11-10',
        hora_inicio: '14:00',
        duracion_minutos: 30,
        motivo: 'Profilaxis y control',
      },
      idxDental,
    );
    assert.equal(nuevaCitaRes.status, 201);
    const nuevaCita = ((await nuevaCitaRes.json()) as { data: { id: string; version: number } }).data;

    const reprogRes = await fetch(`${url}/citas/${nuevaCita.id}/reprogramacion`, {
      method: 'PATCH',
      headers: { ...headersOdontologo, 'idempotency-key': nuevoId() },
      body: JSON.stringify({
        version_esperada: 1,
        fecha: '2026-11-11',
        hora_inicio: '15:00',
        motivo: 'Solicitud del paciente por viaje',
      }),
    });
    assert.equal(reprogRes.status, 200);

    const revRes = await get(`/citas/${nuevaCita.id}/revisiones`, idxDental);
    assert.equal(revRes.status, 200);
    const bodyRev = (await revRes.json()) as { data: Array<{ motivo_cambio: string; version: number }> };
    assert.equal(bodyRev.data.length, 1);
    assert.equal(bodyRev.data[0]?.motivo_cambio, 'Solicitud del paciente por viaje');

    // Simular rol SECRETARIA (sin historial.leer ni consultas.registrar): deniega antecedentes y catálogo clínico
    const cuentaOriginal = s.cuenta;
    s.cuenta = {
      id: cuentaOriginal.id,
      uid: cuentaOriginal.uid,
      institucion: cuentaOriginal.institucion,
      estado: cuentaOriginal.estado,
      version: cuentaOriginal.version,
      roles: ['SECRETARIA'],
      permisos: ['pacientes.administrar', 'citas.administrar'],
    };
    try {
      assert.equal((await get(`/pacientes/${s.paciente.id}/antecedentes`, idxDental)).status, 403);
      const putSecretaria = await fetch(`${url}/pacientes/${s.paciente.id}/antecedentes`, {
        method: 'PUT',
        headers: { ...headersOdontologo, 'idempotency-key': nuevoId() },
        body: JSON.stringify({
          version_esperada: s.pacientes.get(s.paciente.id)!.version,
          patologicos: [],
          quirurgicos: [],
          familiares: [],
          alergias: [{ sustancia: 'Látex', severidad: 'LEVE', reaccion: 'Dermatitis' }],
          medicamentos_actuales: [],
        }),
      });
      assert.equal(putSecretaria.status, 403);
      assert.equal((await get('/catalogos/odontologia', idxDental)).status, 403);
      assert.equal((await get('/catalogos/medicos', idxDental)).status, 200);
      assert.equal((await get(`/citas/${nuevaCita.id}/revisiones`, idxDental)).status, 200);
    } finally {
      s.cuenta = cuentaOriginal;
    }
  });

  it('E04-P1-02: hospitalizaciones, asignación de camas, notas de evolución y egreso en Hospital General', async () => {
    const sHosp = escenarios[0]!;
    const authHeaders = {
      authorization: `Bearer ${tokens[0]!.token}`,
      'content-type': 'application/json',
    };

    // 1. Listar camas disponibles
    const resCamas = await fetch(`${url}/hospital/camas`, {
      method: 'GET',
      headers: authHeaders,
    });
    assert.equal(resCamas.status, 200);
    const bodyCamas = (await resCamas.json()) as { data: { camas: Array<{ id: string; estado: string; codigoCama: string }> } };
    assert.ok(bodyCamas.data.camas.length > 0);
    const camaId = sHosp.camaDemoId;

    // 2. Crear ingreso hospitalario
    const resIngreso = await fetch(`${url}/hospital/hospitalizaciones`, {
      method: 'POST',
      headers: { ...authHeaders, 'idempotency-key': nuevoId() },
      body: JSON.stringify({
        pacienteId: sHosp.paciente.id,
        camaId,
        versionEsperadaCama: 1,
        motivoIngreso: 'Crisis de hipertensión severa refractaria',
        diagnosticoIngresoCIE: 'I10',
        diagnosticoIngresoNombre: 'Hipertensión esencial primaria',
      }),
    });
    assert.equal(resIngreso.status, 201);
    const resIngresoBody = (await resIngreso.json()) as { data: { id: string; estado: string; camaActual?: { camaId: string }; version: number } };
    const hosp = resIngresoBody.data;
    assert.equal(hosp.estado, 'ACTIVA');
    assert.equal(hosp.camaActual?.camaId, camaId);

    // 3. Registrar nota de evolución médica
    const resNota = await fetch(`${url}/hospital/hospitalizaciones/${hosp.id}/notas-evolucion`, {
      method: 'POST',
      headers: { ...authHeaders, 'idempotency-key': nuevoId() },
      body: JSON.stringify({
        notaClinica: 'Presión arterial estabilizada en 130/85 mmHg con infusión.',
        planTerapeutico: 'Disminuir dosis gradualmente y monitorear.',
        versionEsperada: hosp.version,
      }),
    });
    assert.equal(resNota.status, 201);
    const resNotaBody = (await resNota.json()) as { data: { notasEvolucion: Array<{ notaClinica: string }> } };
    assert.equal(resNotaBody.data.notasEvolucion[0]?.notaClinica, 'Presión arterial estabilizada en 130/85 mmHg con infusión.');

    // 4. Registrar egreso hospitalario
    const resEgreso = await fetch(`${url}/hospital/hospitalizaciones/${hosp.id}/egreso`, {
      method: 'POST',
      headers: { ...authHeaders, 'idempotency-key': nuevoId() },
      body: JSON.stringify({
        fechaEgreso: '2026-11-01T12:00:00Z',
        versionEsperada: 2,
        tipoEgreso: 'ALTA_MEDICA',
        diagnosticoEgresoCIE: 'I10',
        diagnosticoEgresoNombre: 'Hipertensión esencial compensada',
        resumenClinico: 'Evolución favorable, paciente estable hemodinámicamente.',
      }),
    });
    assert.equal(resEgreso.status, 201);
    const resEgresoBody = (await resEgreso.json()) as { data: { estado: string; fechaEgreso: string; camaActual?: unknown } };
    const hospEgresada = resEgresoBody.data;
    assert.equal(hospEgresada.estado, 'FINALIZADA');
    assert.equal(hospEgresada.camaActual, undefined);

    const pagina = await fetch(`${url}/hospital/hospitalizaciones?pagina=1&limite=1`, { headers: authHeaders });
    assert.equal(pagina.status, 200);
    const paginaBody = await pagina.json() as { data: { pagina: number; hayMas: boolean; hospitalizaciones: unknown[] } };
    assert.equal(paginaBody.data.pagina, 1);
    assert.equal(paginaBody.data.hospitalizaciones.length, 1);
    assert.equal(paginaBody.data.hayMas, false);
    const finalizadas = await fetch(`${url}/hospital/hospitalizaciones?pacienteId=${sHosp.paciente.id}&estado=FINALIZADA`, { headers: authHeaders });
    assert.equal(finalizadas.status, 200);
    assert.equal(((await finalizadas.json()) as { data: { hospitalizaciones: unknown[] } }).data.hospitalizaciones.length, 1);
    const activas = await fetch(`${url}/hospital/hospitalizaciones?pacienteId=${sHosp.paciente.id}&estado=ACTIVA`, { headers: authHeaders });
    assert.equal(activas.status, 200);
    assert.equal(((await activas.json()) as { data: { hospitalizaciones: unknown[] } }).data.hospitalizaciones.length, 0);
    for (const query of ['pagina=0', 'limite=101', 'pagina=texto']) {
      const invalida = await fetch(`${url}/hospital/hospitalizaciones?${query}`, { headers: authHeaders });
      assert.equal(invalida.status, 400);
    }

    // 5. Verificar rechazo en otra institución (ej: CLINICA_ODONTOLOGICA, index 1)
    const resDental = await fetch(`${url}/hospital/camas`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${tokens[1]!.token}`,
      },
    });
    assert.equal(resDental.status, 403);
  });
});
