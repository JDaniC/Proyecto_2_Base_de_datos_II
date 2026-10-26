import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { describe, it } from 'node:test';

const instituciones =
  'HOSPITAL_GENERAL,CLINICA_ODONTOLOGICA,LABORATORIO_CLINICO,CENTRO_MEDICO_PEDIATRICO';

async function puertoDisponible(): Promise<number> {
  const servidor = createServer();
  await new Promise<void>((aceptar, rechazar) => {
    servidor.once('error', rechazar);
    servidor.listen(0, '127.0.0.1', aceptar);
  });
  const direccion = servidor.address();
  assert.ok(direccion && typeof direccion !== 'string');
  await new Promise<void>((aceptar, rechazar) => {
    servidor.close((error) => error ? rechazar(error) : aceptar());
  });
  return direccion.port;
}

describe('arranque del servidor', () => {
  it('falla antes de escuchar cuando falta una variable requerida', () => {
    const resultado = spawnSync(
      process.execPath,
      [resolve('dist-test/src/main.js')],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          PATH: process.env.PATH ?? '',
          APP_ENV: 'test',
          HOST: '127.0.0.1',
          PORT: '32187',
        },
      },
    );

    assert.equal(resultado.status, 1);
    assert.match(resultado.stderr, /INSTITUTIONS/);
    assert.doesNotMatch(resultado.stderr, /stack|Error:/i);
  });

  it('falla cerrado ante una institución inválida con un mensaje técnico seguro', () => {
    const resultado = spawnSync(
      process.execPath,
      [resolve('dist-test/src/main.js')],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          PATH: process.env.PATH ?? '',
          APP_ENV: 'test',
          HOST: '127.0.0.1',
          PORT: '32187',
          INSTITUTIONS: 'INSTITUCION_FALSA',
        },
      },
    );

    assert.equal(resultado.status, 1);
    assert.match(resultado.stderr, /INSTITUTIONS/);
    assert.doesNotMatch(resultado.stderr, /INSTITUCION_FALSA|stack|Error:/i);
  });

  it('arranca en una instancia aislada y expone salud y contrato', async () => {
    const port = await puertoDisponible();
    const proceso = spawn(process.execPath, [resolve('dist-test/src/main.js')], {
      cwd: process.cwd(),
      env: {
        PATH: process.env.PATH ?? '',
        APP_ENV: 'test',
        HOST: '127.0.0.1',
        PORT: String(port),
        INSTITUTIONS: instituciones,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let errores = '';
    proceso.stderr.setEncoding('utf8');
    proceso.stderr.on('data', (fragmento: string) => { errores += fragmento; });

    try {
      let liveness: Response | undefined;
      for (let intento = 0; intento < 50; intento += 1) {
        if (proceso.exitCode !== null) break;
        try {
          liveness = await fetch(`http://127.0.0.1:${port}/api/v1/health/live`);
          break;
        } catch {
          await delay(100);
        }
      }

      assert.ok(liveness, `el proceso no inició: ${errores}`);
      assert.equal(liveness.status, 200);
      const contrato = await fetch(`http://127.0.0.1:${port}/api/v1/openapi.json`);
      const documento = await contrato.json() as { openapi: string; paths: object };
      assert.equal(contrato.status, 200);
      assert.equal(documento.openapi, '3.1.0');
      assert.equal(Object.keys(documento.paths).length, 22);
    } finally {
      if (proceso.exitCode === null && proceso.signalCode === null) {
        const salida = once(proceso, 'exit');
        proceso.kill('SIGTERM');
        await salida;
      }
    }
  });
});
