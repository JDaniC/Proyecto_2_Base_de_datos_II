import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dinero, sumarDinero } from '../../src/dominio/compartido/dinero.js';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';
import { fechaCivil } from '../../src/dominio/compartido/fecha-civil.js';
import { instanteUtc } from '../../src/dominio/compartido/instante-utc.js';
import { normalizarIdentificacion, normalizarNombreBusqueda, VERSION_NORMALIZACION } from '../../src/dominio/compartido/normalizacion.js';
import { uuidPublico } from '../../src/dominio/compartido/uuid.js';
import { versionPositiva, VERSION_MAXIMA } from '../../src/dominio/compartido/version.js';

function rechazaSolicitud(accion: () => unknown, campo?: string): void {
  assert.throws(accion, (error: unknown) => {
    assert.ok(error instanceof ErrorDominio);
    assert.equal(error.codigo, 'SOLICITUD_INVALIDA');
    if (campo !== undefined) assert.deepEqual(error.campos, [campo]);
    return true;
  });
}

describe('valores comunes del dominio', () => {
  it('acepta UUID con cualquier versión y canoniza hexadecimal a minúsculas', () => {
    assert.equal(uuidPublico('A0B1C2D3-E4F5-6789-ABCD-0123456789AB'), 'a0b1c2d3-e4f5-6789-abcd-0123456789ab');
    rechazaSolicitud(() => uuidPublico('a0b1c2d3-e4f5-6789-abcd-0123456789xz'));
    rechazaSolicitud(() => uuidPublico(null));
  });

  it('valida versión positiva y el rango entero seguro', () => {
    assert.equal(versionPositiva(1), 1);
    assert.equal(versionPositiva(VERSION_MAXIMA), VERSION_MAXIMA);
    for (const valor of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, VERSION_MAXIMA + 1, '1']) {
      rechazaSolicitud(() => versionPositiva(valor));
    }
  });

  it('valida fechas gregorianas, años bisiestos y rechaza conversiones implícitas', () => {
    assert.equal(fechaCivil('2024-02-29'), '2024-02-29');
    assert.equal(fechaCivil('2026-12-31'), '2026-12-31');
    for (const valor of ['2025-02-29', '1900-02-29', '2026-04-31', '0000-01-01', '2026-1-01', '2026-01-01T00:00:00Z']) {
      rechazaSolicitud(() => fechaCivil(valor));
    }
  });

  it('acepta solo instantes UTC reales que terminan en Z', () => {
    assert.equal(instanteUtc('2024-02-29T23:59:59.123Z'), '2024-02-29T23:59:59.123Z');
    for (const valor of ['2025-02-29T00:00:00Z', '2026-01-01T24:00:00Z', '2026-01-01T00:00:00+06:00', '2026-01-01']) {
      rechazaSolicitud(() => instanteUtc(valor));
    }
  });

  it('mantiene dinero en centavos enteros GTQ y detecta overflow', () => {
    assert.deepEqual(dinero(150), { centavos: 150, moneda: 'GTQ' });
    assert.deepEqual(sumarDinero(dinero(20), dinero(22)), { centavos: 42, moneda: 'GTQ' });
    rechazaSolicitud(() => dinero(-1), 'centavos');
    rechazaSolicitud(() => dinero(1.1), 'centavos');
    rechazaSolicitud(() => dinero(Number.MAX_SAFE_INTEGER + 1), 'centavos');
    rechazaSolicitud(() => dinero(1, 'USD'), 'moneda');
    rechazaSolicitud(() => sumarDinero(dinero(Number.MAX_SAFE_INTEGER), dinero(1)));
  });

  it('normaliza nombre de búsqueda e identificación de forma determinista/versionada', () => {
    assert.equal(normalizarNombreBusqueda('  JOSE\tMaría  '), 'jose maria');
    assert.equal(normalizarNombreBusqueda('Jose\u0301 Maria'), 'jose maria');
    assert.equal(VERSION_NORMALIZACION, 1);
    rechazaSolicitud(() => normalizarNombreBusqueda('  '));
    rechazaSolicitud(() => normalizarNombreBusqueda('x'.repeat(121)));
    assert.equal(normalizarIdentificacion('CUI', ' 123 456-789 '), 'CUI:123456789');
    assert.equal(normalizarIdentificacion('PASAPORTE', ' ab 12 '), 'PASAPORTE:AB12');
    rechazaSolicitud(() => normalizarIdentificacion('CUI', ' -- '));
    rechazaSolicitud(() => normalizarIdentificacion('CUI', '1'.repeat(21)));
    rechazaSolicitud(() => normalizarIdentificacion('OTRO', '123'));
  });
});
