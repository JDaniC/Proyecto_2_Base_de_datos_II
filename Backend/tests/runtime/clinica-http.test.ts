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

});
