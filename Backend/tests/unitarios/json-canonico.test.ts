import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';
import { parsearJSONSinClavesDuplicadas, serializarJCS } from '../../src/dominio/compartido/json-canonico.js';

describe('serialización JSON canónica JCS', () => {
  it('ordena recursivamente propiedades por unidades UTF-16 y conserva el orden de arrays', () => {
    const entrada = { z: 1, a: { b: 2, a: 1 }, lista: [{ y: true, x: false }, 3] };
    assert.equal(serializarJCS(entrada), '{"a":{"a":1,"b":2},"lista":[{"x":false,"y":true},3],"z":1}');
  });

  it('sigue el vector de orden de propiedades Unicode de RFC 8785 §3.2.3', () => {
    const entrada = {
      '€': 'Euro Sign',
      '\r': 'Carriage Return',
      'דּ': 'Hebrew Letter Dalet With Dagesh',
      '1': 'One',
      '😀': 'Emoji: Grinning Face',
      '\u0080': 'Control',
      'ö': 'Latin Small Letter O With Diaeresis',
    };
    const esperado = `{"\\r":"Carriage Return","1":"One","${String.fromCharCode(0x80)}":"Control","ö":"Latin Small Letter O With Diaeresis","€":"Euro Sign","😀":"Emoji: Grinning Face","דּ":"Hebrew Letter Dalet With Dagesh"}`;
    assert.equal(serializarJCS(entrada), esperado);
  });

  it('coincide con el vector numérico, de texto y literales de RFC 8785 §3.2.2', () => {
    const entrada = {
      numbers: [333333333.33333329, 1e30, 4.5, 2e-3, 1e-27],
      string: '€$\u000f\nA\'B"\\\\"/',
      literals: [null, true, false],
    };
    assert.equal(serializarJCS(entrada), String.raw`{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"€$\u000f\nA'B\"\\\\\"/"}`);
  });

  it('conserva las cadenas Unicode sin normalizarlas y rechaza sustitutos aislados', () => {
    assert.notEqual(serializarJCS({ texto: 'é' }), serializarJCS({ texto: 'e\u0301' }));
    assert.throws(() => serializarJCS('\ud800'), (error: unknown) => error instanceof ErrorDominio && error.codigo === 'SOLICITUD_INVALIDA');
    assert.throws(() => serializarJCS({ ['\udc00']: 1 }), ErrorDominio);
  });

  it('rechaza claves duplicadas, también cuando una repetición usa escapes Unicode', () => {
    assert.deepEqual(parsearJSONSinClavesDuplicadas('{"a":1,"b":{"c":2}}'), { a: 1, b: { c: 2 } });
    assert.throws(() => parsearJSONSinClavesDuplicadas('{"a":1,"a":2}'), ErrorDominio);
    assert.throws(() => parsearJSONSinClavesDuplicadas('{"a":1,"\\u0061":2}'), ErrorDominio);
    assert.throws(() => parsearJSONSinClavesDuplicadas('{"items":[{"x":1,"x":2}]}'), ErrorDominio);
    assert.throws(() => parsearJSONSinClavesDuplicadas('{"a":}'), ErrorDominio);
  });

  it('rechaza Infinity, NaN, undefined, ciclos y objetos no JSON', () => {
    for (const valor of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, undefined, 1n]) {
      assert.throws(() => serializarJCS(valor), ErrorDominio);
    }
    assert.equal(serializarJCS(1e30), '1e+30');
    assert.throws(() => serializarJCS({ omitido: undefined }), ErrorDominio);
    const ciclo: { self?: unknown } = {};
    ciclo.self = ciclo;
    assert.throws(() => serializarJCS(ciclo), ErrorDominio);
    assert.throws(() => serializarJCS(new Date()), ErrorDominio);
  });
});
