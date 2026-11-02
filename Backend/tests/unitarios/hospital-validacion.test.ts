import assert from 'node:assert/strict';
import { test } from 'node:test';
import { escenarioClinico, nuevoId } from '../fixtures/clinica-comun.js';
import { GestionarHospitalizaciones, type EntradaIngresoHospitalario, type EntradaEgresoHospitalario } from '../../src/aplicacion/casos-uso/hospital/gestionar-hospitalizaciones.js';

for (const [campo, valor] of Object.entries({ pacienteId: 15, motivoIngreso: ' ', diagnosticoIngresoCIE: null, diagnosticoIngresoNombre: 42, consultasEnlazadasIds: 'ajena', versionEsperadaCama: undefined, institucion: 'HOSPITAL_GENERAL' })) {
  test(`hospital: ingreso inválido en ${campo} no llega a persistencia`, async () => {
    const e = escenarioClinico('HOSPITAL_GENERAL');
    const entrada = { pacienteId: e.paciente.id, camaId: e.camaDemoId, motivoIngreso: 'Observación',
      diagnosticoIngresoCIE: 'Z09', diagnosticoIngresoNombre: 'Control', versionEsperadaCama: 1, [campo]: valor };
    await assert.rejects(new GestionarHospitalizaciones().ingresar(e.contexto, e.bundle, entrada as unknown as EntradaIngresoHospitalario, nuevoId()),
      { codigo: 'SOLICITUD_INVALIDA' });
    assert.equal(e.hospHospital.size, 0);
  });
}
for (const valor of ['', 'OTRO', undefined]) {
  test(`hospital: egreso rechaza tipo ${String(valor)} sin finalizar estancia`, async () => {
    const e = escenarioClinico('HOSPITAL_GENERAL');
    const entrada = { fechaEgreso: '2026-11-01T12:00:00Z', tipoEgreso: valor, diagnosticoEgresoCIE: 'Z09',
      diagnosticoEgresoNombre: 'Alta', resumenClinico: 'Estable', versionEsperada: 1 };
    await assert.rejects(new GestionarHospitalizaciones().egresar(e.contexto, e.bundle, nuevoId(), entrada as unknown as EntradaEgresoHospitalario, nuevoId()),
      { codigo: 'SOLICITUD_INVALIDA' });
    assert.equal(e.hospHospital.size, 0);
  });
}
