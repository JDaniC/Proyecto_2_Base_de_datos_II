import assert from 'node:assert/strict';
import { test } from 'node:test';
import { edadMesesEnFecha, indiceMasaCorporal } from '../../src/dominio/pediatria/crecimiento.js';
import { validarPrincipalidad } from '../../src/dominio/pediatria/vinculos.js';

test('edad civil: bisiesto, antes/después del día y fechas imposibles', () => {
  assert.equal(edadMesesEnFecha('2020-02-29','2021-02-28'),11);
  assert.equal(edadMesesEnFecha('2020-02-29','2021-03-01'),12);
  assert.equal(edadMesesEnFecha('2020-02-29','2020-02-29'),0);
  assert.throws(()=>edadMesesEnFecha('2020-02-29','2020-02-28'));
  assert.throws(()=>edadMesesEnFecha('2021-02-29','2022-03-01'));
});
test('IMC sin talla o peso no se inventa; magnitudes no positivas fallan', () => {
  assert.equal(indiceMasaCorporal(20,null),null);
  assert.equal(indiceMasaCorporal(null,100),null);
  assert.equal(indiceMasaCorporal(20,100),20);
  for(const valor of [0,-1,NaN,Infinity]) assert.throws(()=>indiceMasaCorporal(valor,100));
});
test('principal activo obligatorio, independiente de autorización y UUID canónico', () => {
  const v={responsableId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',estado:'ACTIVO' as const,esPrincipal:true,autorizaAtencion:false};
  assert.doesNotThrow(()=>validarPrincipalidad([v]));
  assert.throws(()=>validarPrincipalidad([{...v,estado:'INACTIVO'}]));
  assert.throws(()=>validarPrincipalidad([{...v,esPrincipal:false,autorizaAtencion:true}]));
  assert.throws(()=>validarPrincipalidad([v,{...v,responsableId:v.responsableId.toUpperCase()}]));
});
