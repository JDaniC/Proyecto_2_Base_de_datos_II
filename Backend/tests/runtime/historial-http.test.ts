import assert from 'node:assert/strict';
import { before, after, describe, it } from 'node:test';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { writeFile, access } from 'node:fs/promises';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/composicion/app.module.js';
import { crearAplicacionHttp } from '../../src/composicion/crear-aplicacion-http.js';
import { leerContratoOpenApi } from '../../src/composicion/leer-contrato-openapi.js';
import { parsearConfiguracion } from '../../src/configuracion/entorno.js';
import { crearBundlesInstitucionales, type MapaRepositoriosInstitucion } from '../../src/composicion/crear-bundles-institucionales.js';
import { INSTITUCIONES_CANONICAS } from '../../src/dominio/compartido/institucion.js';
import { CUENTAS_SINTETICAS } from '../../src/adaptadores/salida/identidad/semillas-sinteticas.js';
import { RepositorioCuentaEnMemoria } from '../../src/adaptadores/salida/identidad/repositorio-cuenta-en-memoria.js';
import { VerificadorIdentidadMemoria } from '../../src/adaptadores/salida/identidad/verificador-identidad-memoria.js';
import { tiposInstitucion } from '../../src/aplicacion/puertos/historial.js';
import { uuidPublico } from '../../src/dominio/compartido/uuid.js';
import { instanteUtc } from '../../src/dominio/compartido/instante-utc.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';
process.env.CURSOR_SIGNING_SECRET = 'clave-sintetica-http-ca07-minimo-32-caracteres';
interface RespuestaExpediente { data: { paciente: {id: string}; historial: { eventos: {id: string}[] } }; meta: { siguiente_cursor: string } }
const pacienteId = '00000000-0000-4000-8000-000000009001';
describe('HTTP expediente e historial', () => {
  let app: INestApplication, url: string;
  const tokens = INSTITUCIONES_CANONICAS.map((institucion, i) => {
    const c = CUENTAS_SINTETICAS.find((c) => c.institucion === institucion && c.roles.includes('ADMIN_INSTITUCIONAL'))!;
    return { token: `ca07-institucion-${i}`, uid: c.uid, institucion };
  });
  const recepcion = CUENTAS_SINTETICAS.find((c) => c.institucion === 'HOSPITAL_GENERAL' && c.roles.includes('SECRETARIA'))!;
  const autorizaciones = [...tokens, { token: 'ca07-recepcion', uid: recepcion.uid, institucion: recepcion.institucion }];
  before(async () => {
    const mapa: MapaRepositoriosInstitucion = Object.fromEntries(INSTITUCIONES_CANONICAS.map((institucion, index) => [institucion, {
      cuenta: new RepositorioCuentaEnMemoria(institucion, CUENTAS_SINTETICAS.filter((c) => c.institucion === institucion)),
      pacientes: { async porId(id: string) { return id === pacienteId && index === 0 ? { id: uuidPublico(id), institucion, codigoLegible: 'CA07', nombres: 'Paciente', apellidos: 'Sintético', fechaNacimiento: null, sexo: null, estado: 'ACTIVO' as const, version: versionPositiva(1), fechaRegistro: instanteUtc('2026-01-01T00:00:00Z') } : null; }, async buscar() { return { elementos: [] }; } },
      historial: { async verificarPreparacion() {}, fuentes: tiposInstitucion(institucion).map((tipo) => ({ tipo, fuente: { async leer({ cantidad, despues }: {cantidad: number; despues?: {id: string}}) { return tipo === 'ARCHIVO' ? [1, 2, 3].map((n) => ({ id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, fechaHora: '2026-01-01T12:00:00.000000000Z', tipo, recursoId: pacienteId, titulo: 'Archivo sintético' })).filter((e) => !despues || e.id > despues.id).slice(0, cantidad) : []; } } })) },
    }]));
    const config = parsearConfiguracion({APP_ENV:'test',HOST:'127.0.0.1',PORT:'3000',INSTITUTIONS:INSTITUCIONES_CANONICAS.join(',')});
    app = await crearAplicacionHttp(AppModule.registrar(config, { bundles: crearBundlesInstitucionales(INSTITUCIONES_CANONICAS, mapa), verificadorIdentidad: new VerificadorIdentidadMemoria(autorizaciones) }), leerContratoOpenApi(resolve('docs/openapi.yaml')));
    await app.listen(0,'127.0.0.1'); url = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });
  after(async () => {
    if (process.env.CA07_BROWSER_READY) {
      await writeFile(process.env.CA07_BROWSER_READY, JSON.stringify({url,pacienteId}));
      const fin=Date.now()+120000;
      while(Date.now()<fin) { try { await access(process.env.CA07_BROWSER_READY+'.stop'); break; } catch {} await new Promise((ok)=>setTimeout(ok,500)); }
    }
    await app.close();
  });
  const get = (path: string, token = tokens[0]!.token) => fetch(url+path,{headers:{authorization:`Bearer ${token}`}});
  it('responde 200 con cabecera y página acotada, y continúa por cursor', async () => {
    const r=await get(`/api/v1/pacientes/${pacienteId}/expediente?limite=1`);assert.equal(r.status,200);const body=await r.json() as RespuestaExpediente;
    assert.equal(body.data.paciente.id,pacienteId);assert.equal(body.data.historial.eventos.length,1);assert.ok(body.meta.siguiente_cursor);
    const segunda=await get(`/api/v1/pacientes/${pacienteId}/expediente?limite=1&cursor=${body.meta.siguiente_cursor}`);
    assert.equal(segunda.status,200);assert.notEqual((await segunda.json() as RespuestaExpediente).data.historial.eventos[0]!.id,body.data.historial.eventos[0]!.id);
  });
  it('rechaza anónimo, recepción sin lectura clínica y paciente de otra institución', async () => {
    assert.equal((await fetch(`${url}/api/v1/pacientes/${pacienteId}/historial`)).status,401);
    assert.equal((await get(`/api/v1/pacientes/${pacienteId}/historial`,'ca07-recepcion')).status,403);
    for (const token of tokens.slice(1)) assert.equal((await get(`/api/v1/pacientes/${pacienteId}/historial`,token.token)).status,404);
  });
  it('devuelve 400 para filtros/cursor inválidos y autoridad extra del cliente', async () => {
    for(const query of ['limite=0','limite=101','orden=OTRO','tipo=OTRO','desde=no','cursor=alterado','rol=ADMIN_INSTITUCIONAL','institucion=HOSPITAL_GENERAL','limite=']) {
      const r=await get(`/api/v1/pacientes/${pacienteId}/historial?${query}`);assert.equal(r.status,400,query);const body=await r.json() as {error: {codigo: string}};assert.equal(body.error.codigo,'SOLICITUD_INVALIDA');assert.ok(!JSON.stringify(body).includes('stack'));
    }
  });
});
