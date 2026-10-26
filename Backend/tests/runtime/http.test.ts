import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { resolve } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { ConsultarBundlesConfigurados } from '../../src/aplicacion/casos-uso/consultar-bundles-configurados.js';
import { crearAplicacionHttp } from '../../src/composicion/crear-aplicacion-http.js';
import { leerContratoOpenApi } from '../../src/composicion/leer-contrato-openapi.js';
import { parsearConfiguracion } from '../../src/configuracion/entorno.js';
import { CONSULTAR_BUNDLES_CONFIGURADOS } from '../../src/composicion/tokens.js';
import { moduloPruebaHttp } from '../fixtures/http-prueba.module.js';

const configuracion = parsearConfiguracion({
  APP_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: '3000',
  INSTITUTIONS:
    'HOSPITAL_GENERAL,CLINICA_ODONTOLOGICA,LABORATORIO_CLINICO,CENTRO_MEDICO_PEDIATRICO',
});
const contrato = leerContratoOpenApi(resolve(process.cwd(), 'docs/openapi.yaml'));

describe('frontera HTTP y composición', () => {
  let app: INestApplication | undefined;
  let baseUrl = '';

  before(async () => {
    app = await crearAplicacionHttp(moduloPruebaHttp(configuracion), contrato);
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await app?.close();
  });

  it('acepta un DTO válido y envuelve la respuesta con su correlación', async () => {
    const respuesta = await fetch(`${baseUrl}/api/v1/pruebas-http/eco`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texto: 'hola' }),
    });
    const cuerpo = await respuesta.json() as {
      data: { texto: string };
      meta: { correlacion: string };
    };

    assert.equal(respuesta.status, 201);
    assert.equal(cuerpo.data.texto, 'hola');
    assert.equal(cuerpo.meta.correlacion, respuesta.headers.get('x-correlation-id'));
  });

  it('acepta el límite exacto del DTO y rechaza el siguiente carácter', async () => {
    const exacto = await fetch(`${baseUrl}/api/v1/pruebas-http/eco`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texto: 'x'.repeat(20) }),
    });
    const cuerpoExacto = await exacto.json() as { data: { texto: string } };
    const excedido = await fetch(`${baseUrl}/api/v1/pruebas-http/eco`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texto: 'x'.repeat(21) }),
    });
    const cuerpoExcedido = await excedido.json() as {
      error: { campos: { campo: string; codigo: string }[] };
    };

    assert.equal(exacto.status, 201);
    assert.equal(cuerpoExacto.data.texto.length, 20);
    assert.equal(excedido.status, 400);
    assert.ok(cuerpoExcedido.error.campos.some((campo) =>
      campo.campo === 'texto' && campo.codigo === 'RANGO',
    ));
  });

  it('valida DTO cerrados y devuelve el sobre común con correlación', async () => {
    const correlacion = '00000000-0000-4000-8000-000000000090';
    const respuesta = await fetch(`${baseUrl}/api/v1/pruebas-http/eco`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': correlacion,
      },
      body: JSON.stringify({ texto: 'correcto', institucion: 'HOSPITAL_GENERAL' }),
    });
    const cuerpo = await respuesta.json() as {
      error: { codigo: string; campos: { campo: string; codigo: string }[] };
      meta: { correlacion: string };
    };

    assert.equal(respuesta.status, 400);
    assert.equal(respuesta.headers.get('x-correlation-id'), correlacion);
    assert.equal(cuerpo.error.codigo, 'SOLICITUD_INVALIDA');
    assert.ok(cuerpo.error.campos.some((campo) => campo.codigo === 'NO_PERMITIDO'));
    assert.equal(cuerpo.meta.correlacion, correlacion);
  });

  it('limita la lista de errores de campo al máximo del contrato', async () => {
    const extras = Object.fromEntries(
      Array.from({ length: 101 }, (_, indice) => [`campo_${indice}`, 'valor']),
    );
    const respuesta = await fetch(`${baseUrl}/api/v1/pruebas-http/eco`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texto: 'correcto', ...extras }),
    });
    const cuerpo = await respuesta.json() as {
      error: { campos: { campo: string; codigo: string }[] };
    };

    assert.equal(respuesta.status, 400);
    assert.equal(cuerpo.error.campos.length, 100);
    assert.ok(cuerpo.error.campos.every((campo) => campo.codigo === 'NO_PERMITIDO'));
  });

  it('rechaza campos requeridos y crea una correlación si la entrada no es UUID', async () => {
    const respuesta = await fetch(`${baseUrl}/api/v1/pruebas-http/eco`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': 'no-es-uuid',
      },
      body: JSON.stringify({}),
    });
    const cuerpo = await respuesta.json() as {
      error: { campos: { campo: string; codigo: string }[] };
      meta: { correlacion: string };
    };
    const cabecera = respuesta.headers.get('x-correlation-id');

    assert.equal(respuesta.status, 400);
    assert.match(cabecera ?? '', /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/);
    assert.equal(cuerpo.meta.correlacion, cabecera);
    assert.ok(cuerpo.error.campos.some((campo) =>
      campo.campo === 'texto' && campo.codigo === 'REQUERIDO',
    ));
  });

  it('rechaza un tipo de DTO incorrecto con código de formato', async () => {
    const respuesta = await fetch(`${baseUrl}/api/v1/pruebas-http/eco`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texto: 42 }),
    });
    const cuerpo = await respuesta.json() as {
      error: { campos: { campo: string; codigo: string }[] };
    };

    assert.equal(respuesta.status, 400);
    assert.ok(cuerpo.error.campos.some((campo) =>
      campo.campo === 'texto' && campo.codigo === 'FORMATO',
    ));
  });

  it('rechaza valores vacíos y nulos como requeridos', async () => {
    for (const texto of ['', null]) {
      const respuesta = await fetch(`${baseUrl}/api/v1/pruebas-http/eco`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ texto }),
      });
      const cuerpo = await respuesta.json() as {
        error: { campos: { campo: string; codigo: string }[] };
      };

      assert.equal(respuesta.status, 400);
      assert.ok(cuerpo.error.campos.some((campo) =>
        campo.campo === 'texto' && campo.codigo === 'REQUERIDO',
      ));
    }
  });

  it('mapea límites de DTO y JSON malformado al error común', async () => {
    const demasiadoLargo = await fetch(`${baseUrl}/api/v1/pruebas-http/eco`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texto: 'x'.repeat(21) }),
    });
    const cuerpoLargo = await demasiadoLargo.json() as {
      error: { campos: { campo: string; codigo: string }[] };
    };
    const malformado = await fetch(`${baseUrl}/api/v1/pruebas-http/eco`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"texto":',
    });
    const cuerpoMalformado = await malformado.json() as {
      error: { codigo: string };
    };

    assert.equal(demasiadoLargo.status, 400);
    assert.ok(cuerpoLargo.error.campos.some((campo) => campo.codigo === 'RANGO'));
    assert.equal(malformado.status, 400);
    assert.equal(cuerpoMalformado.error.codigo, 'SOLICITUD_INVALIDA');
  });

  it('traduce 404 al contrato y oculta el texto técnico del framework', async () => {
    const respuesta = await fetch(`${baseUrl}/api/v1/pruebas-http/no-encontrado`);
    const texto = await respuesta.text();

    assert.equal(respuesta.status, 404);
    assert.match(texto, /RECURSO_NO_ENCONTRADO/);
    assert.doesNotMatch(texto, /detalle-interno-de-prueba|Not Found|stack/i);
  });

  it('mapea las demás clases HTTP conocidas al catálogo común sin texto interno', async () => {
    const casos = [
      [401, 'NO_AUTENTICADO'],
      [403, 'SIN_PERMISO'],
      [409, 'ESTADO_INVALIDO'],
      [503, 'PERSISTENCIA_NO_DISPONIBLE'],
    ] as const;

    for (const [status, codigo] of casos) {
      const respuesta = await fetch(
        `${baseUrl}/api/v1/pruebas-http/http-error/${status}`,
      );
      const texto = await respuesta.text();
      assert.equal(respuesta.status, status);
      assert.match(texto, new RegExp(codigo));
      assert.doesNotMatch(texto, /detalle-interno-de-prueba|stack/i);
    }
  });

  it('normaliza fallos inesperados y omite el mensaje técnico', async () => {
    const respuesta = await fetch(`${baseUrl}/api/v1/pruebas-http/error`);
    const texto = await respuesta.text();

    assert.equal(respuesta.status, 500);
    assert.match(texto, /ERROR_INTERNO/);
    assert.doesNotMatch(texto, /secreto-interno-de-prueba|stack|Error:/i);
  });

  it('expone salud técnica sin secretos y readiness advierte que no hay persistencia', async () => {
    const liveness = await fetch(`${baseUrl}/api/v1/health/live`);
    const cuerpoLiveness = await liveness.json() as { data: { estado: string } };
    const readiness = await fetch(`${baseUrl}/api/v1/health/ready`);
    const textoReadiness = await readiness.text();

    assert.equal(liveness.status, 200);
    assert.equal(cuerpoLiveness.data.estado, 'disponible');
    assert.equal(readiness.status, 503);
    assert.match(textoReadiness, /adaptadores_de_persistencia_pendientes/);
    assert.doesNotMatch(textoReadiness, /secret|password|token|stack/i);
  });

  it('sirve el contrato canónico sin sumar endpoints simulados', async () => {
    const respuesta = await fetch(`${baseUrl}/api/v1/openapi.json`);
    const documento = await respuesta.json() as {
      openapi: string;
      paths: Record<string, unknown>;
      servers: { url: string }[];
    };
    const yaml = await fetch(`${baseUrl}/api/v1/openapi.yaml`);
    const yamlTexto = await yaml.text();
    const interfaz = await fetch(`${baseUrl}/api/v1/docs`);

    assert.equal(respuesta.status, 200);
    assert.equal(documento.openapi, '3.1.0');
    assert.equal(Object.keys(documento.paths).length, 22);
    assert.equal(documento.servers[0]?.url, '/api/v1');
    assert.equal('/health/live' in documento.paths, false);
    assert.equal('/pruebas-http/eco' in documento.paths, false);
    assert.match(yamlTexto, /^openapi: 3\.1\.0/m);
    assert.equal(interfaz.status, 200);
    assert.match(interfaz.headers.get('content-type') ?? '', /text\/html/);
  });

  it('rechaza JSON que excede el máximo UTF-8 sin exponer el error del parser', async () => {
    const maximo = 262_144;
    const prefijo = '{"texto":"';
    const sufijo = '"}';
    const cuerpo = `${prefijo}${'x'.repeat(maximo - prefijo.length - sufijo.length)}${sufijo}`;
    assert.equal(Buffer.byteLength(cuerpo, 'utf8'), maximo);

    const exacto = await fetch(`${baseUrl}/api/v1/pruebas-http/eco`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: cuerpo,
    });
    const cuerpoExacto = await exacto.json() as {
      error: { codigo: string; campos: { codigo: string }[] };
    };
    assert.equal(exacto.status, 400);
    assert.equal(cuerpoExacto.error.codigo, 'SOLICITUD_INVALIDA');
    assert.ok(cuerpoExacto.error.campos.some((campo) => campo.codigo === 'RANGO'));

    const respuesta = await fetch(`${baseUrl}/api/v1/pruebas-http/eco`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': '00000000-0000-4000-8000-000000000090',
      },
      body: `${cuerpo} `,
    });
    const texto = await respuesta.text();

    assert.equal(respuesta.status, 413);
    assert.match(texto, /LIMITE_AGREGADO/);
    assert.doesNotMatch(texto, /entity\.too\.large|PayloadTooLargeError|stack/i);
    assert.equal(
      respuesta.headers.get('x-correlation-id'),
      '00000000-0000-4000-8000-000000000090',
    );
  });

  it('resuelve el caso de uso ordinario con cuatro bundles inmutables y sin motor', () => {
    const consultar = app!.get<ConsultarBundlesConfigurados>(
      CONSULTAR_BUNDLES_CONFIGURADOS,
      { strict: false },
    );
    const bundles = consultar.ejecutar();

    assert.deepEqual(bundles.map((bundle) => bundle.institucion), [
      'HOSPITAL_GENERAL',
      'CLINICA_ODONTOLOGICA',
      'LABORATORIO_CLINICO',
      'CENTRO_MEDICO_PEDIATRICO',
    ]);
    assert.ok(bundles.every((bundle) =>
      bundle.estadoPersistencia === 'NO_CONFIGURADA',
    ));
    assert.equal(Object.isFrozen(bundles), true);
    assert.ok(bundles.every(Object.isFrozen));
  });
});
