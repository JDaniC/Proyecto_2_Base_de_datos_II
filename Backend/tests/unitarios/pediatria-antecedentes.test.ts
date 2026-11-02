import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarAlergia, validarPerinatales, validarHistoriaPediatrica } from '../../src/dominio/pediatria/antecedentes.js';

test('perinatales conserva ausencia de mediciones y cero en Apgar sin inventar valores',()=>{
  assert.deepEqual(validarPerinatales({}),{});
  assert.deepEqual(validarPerinatales({apgar1Minuto:0,pesoNacimientoGramos:3000}),{apgar1Minuto:0,pesoNacimientoGramos:3000});
  for(const entrada of [{pesoNacimientoGramos:0},{tallaNacimientoCm:-1},{apgar5Minutos:11},{apgar1Minuto:1.5},{edadGestacionalSemanas:Infinity},{tipoParto:'OTRO'},{autor:'cliente'}])assert.throws(()=>validarPerinatales(entrada));
});
test('alergia exige sustancia, reacción y severidad; omite autoridad cliente del contrato',()=>{
  assert.deepEqual(validarAlergia({sustancia:' Polen ',reaccion:'Erupción',severidad:'LEVE'}),{sustancia:'Polen',reaccion:'Erupción',severidad:'LEVE'});
  for(const entrada of [{sustancia:'',reaccion:'Erupción',severidad:'LEVE'},{sustancia:'Polen',reaccion:'',severidad:'LEVE'},{sustancia:'Polen',reaccion:'Erupción',severidad:'OTRA'},{sustancia:'Polen',reaccion:'Erupción',severidad:'LEVE',autor:'cliente'}])assert.throws(()=>validarAlergia(entrada));
});

test('historia exige las cuatro listas explícitas y rechaza duplicados, autoridad o texto vacío',()=>{
  const historia={patologicos:['Asma sintética'],quirurgicos:[],familiares:[],medicamentosActuales:[]};
  assert.deepEqual(validarHistoriaPediatrica(historia),historia);
  for(const entrada of [{...historia,patologicos:['Asma',' asma ']},{...historia,familiares:[' ']},{...historia,actor:'cliente'},{patologicos:[]}]) assert.throws(()=>validarHistoriaPediatrica(entrada));
});
