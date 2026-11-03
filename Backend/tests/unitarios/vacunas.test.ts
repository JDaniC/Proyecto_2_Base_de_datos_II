import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calcularEstadoDosis, generarIdAplicacion, validarRegistroAplicacion, validarCorreccionAplicacion, validarAnulacionAplicacion, validarAsignacionEsquema } from '../../src/dominio/pediatria/vacunas.js';
const paciente = '11111111-1111-4111-8111-111111111111';
const vacuna = '22222222-2222-4222-8222-222222222222';
const dosis = '33333333-3333-4333-8333-333333333333';
const registro = { vacunaId: vacuna, dosisId: dosis, fechaAplicacion: '2024-02-29', lote: ' lote-1 ', sitioAnatomico: ' Brazo ' };
test('la identidad lógica es estable por paciente vacuna y dosis', () => {
 assert.equal(generarIdAplicacion(paciente,vacuna,dosis),`${paciente}__${vacuna}__${dosis}`);
 assert.notEqual(generarIdAplicacion(paciente,vacuna,dosis),generarIdAplicacion(vacuna,vacuna,dosis));
 assert.throws(()=>generarIdAplicacion('invalido',vacuna,dosis));
});
test('registro conserva fecha civil bisiesta y normaliza lote y sitio', () => {
 const r=validarRegistroAplicacion(registro);
 assert.equal(r.fechaAplicacion,'2024-02-29'); assert.equal(r.lote,'LOTE-1'); assert.equal(r.sitioAnatomico,'Brazo');
 for (const entrada of [null,{}, {...registro,fechaAplicacion:'2023-02-29'}, {...registro,lote:' '}, {...registro,sitioAnatomico:''}, {...registro,actorId:paciente}]) assert.throws(()=>validarRegistroAplicacion(entrada));
});
test('corrección exige motivo y revisión y no permite cambiar administración', () => {
 assert.equal(validarCorreccionAplicacion({motivo:'Rectificar lote',versionEsperada:1,lote:' xyz '}).lote,'XYZ');
 for (const entrada of [{motivo:' ',versionEsperada:1},{motivo:'Error',versionEsperada:0},{motivo:'Error',versionEsperada:1,fechaAplicacion:'2024-03-01'},{motivo:'Error',versionEsperada:1,dosisId:dosis}]) assert.throws(()=>validarCorreccionAplicacion(entrada));
});
test('anulación y asignación rechazan autoridad cliente y versiones inválidas', () => {
 assert.equal(validarAnulacionAplicacion({motivo:'Registro erróneo',versionEsperada:2}).versionEsperada,2);
 assert.throws(()=>validarAnulacionAplicacion({motivo:'Error',versionEsperada:1.5}));
 assert.deepEqual(validarAsignacionEsquema({vacunaId:vacuna,versionId:dosis}),{vacunaId:vacuna,versionId:dosis});
 assert.throws(()=>validarAsignacionEsquema({vacunaId:vacuna,versionId:dosis,actorId:paciente}));
});

test('retraso de dosis usa días civiles exactos y conserva futura antes del mes cumplido', () => {
 const d={dosisId:dosis,numero:1,edadMesesRecomendada:2};
 assert.deepEqual(calcularEstadoDosis(d,1,null,'2024-01-01','2024-02-29'),{estado:'FUTURA'});
 assert.deepEqual(calcularEstadoDosis(d,2,null,'2024-01-01','2024-03-01'),{estado:'PENDIENTE',diasRetraso:0});
 assert.deepEqual(calcularEstadoDosis(d,3,null,'2024-01-01','2024-04-01'),{estado:'PENDIENTE',diasRetraso:31});
 assert.throws(()=>calcularEstadoDosis(d,-1));
});
