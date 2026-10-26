import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { leerContratoOpenApi } from '../../src/composicion/leer-contrato-openapi.js';

describe('contrato OpenAPI de arranque', () => {
  it('lee el contrato canónico con las 22 rutas congeladas', () => {
    const contrato = leerContratoOpenApi(resolve(process.cwd(), 'docs/openapi.yaml'));

    assert.equal(contrato.openapi, '3.1.0');
    assert.equal(Object.keys(contrato.paths).length, 22);
    assert.equal(contrato.servers?.[0]?.url, '/api/v1');
    assert.equal(extensionImplementacion(contrato.paths['/sesion']?.post), 'IMPLEMENTED');
    assert.equal(extensionImplementacion(contrato.paths['/sesion']?.get), 'IMPLEMENTED');
    assert.equal(extensionImplementacion(contrato.paths['/sesion/cierre']?.post), 'IMPLEMENTED');
  });

  it('falla cerrado para YAML malformado o documento con otra versión', () => {
    const directorio = mkdtempSync(join(tmpdir(), 'backend-openapi-'));
    const ruta = join(directorio, 'openapi.yaml');

    try {
      writeFileSync(ruta, 'openapi: [', 'utf8');
      assert.throws(() => leerContratoOpenApi(ruta));

      writeFileSync(ruta, 'openapi: 3.0.3\npaths: {}\n', 'utf8');
      assert.throws(() => leerContratoOpenApi(ruta));
    } finally {
      rmSync(directorio, { recursive: true, force: true });
    }
  });
});

function extensionImplementacion(operacion: unknown): unknown {
  return (operacion as Record<string, unknown> | undefined)?.['x-implementacion'];
}
