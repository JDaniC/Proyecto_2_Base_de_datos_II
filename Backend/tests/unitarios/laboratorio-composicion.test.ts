import {test} from 'node:test';
import assert from 'node:assert/strict';
import {crearBundlesInstitucionales} from '../../src/composicion/crear-bundles-institucionales.js';
import {escenarioClinico} from '../fixtures/clinica-comun.js';
import type {ConsultasCobros} from '../../src/aplicacion/puertos/cobros.js';
import type {ConsultasLaboratorio,ListadosLaboratorio} from '../../src/aplicacion/puertos/laboratorio.js';
test('composición productiva conserva cobros y consultas/listados de laboratorio sin habilitar ausentes',()=>{
 const escenario=escenarioClinico('LABORATORIO_CLINICO');
 const cobros:ConsultasCobros={async detalle(){return null;},async listar(){return {elementos:[]};}};
 const consultasLaboratorio:ConsultasLaboratorio={async ordenPorId(){return null;},async muestraPorId(){return null;},async listarCatalogo(){return {elementos:[]};}};
 const listadosLaboratorio:ListadosLaboratorio={async listarOrdenes(){return {elementos:[]};},async listarMuestras(){return {elementos:[]};}};
 const b=crearBundlesInstitucionales(['LABORATORIO_CLINICO'],{LABORATORIO_CLINICO:{cuenta:escenario.bundle.cuenta!,uow:escenario.bundle.uow!,cobros,consultasLaboratorio,listadosLaboratorio}})[0]!;
 assert.equal(b.cobros,cobros);assert.equal(b.consultasLaboratorio,consultasLaboratorio);assert.equal(b.listadosLaboratorio,listadosLaboratorio);assert.equal(b.uow,escenario.bundle.uow);
 const ausente=crearBundlesInstitucionales(['LABORATORIO_CLINICO'])[0]!;assert.equal(ausente.cobros,undefined);assert.equal(ausente.consultasLaboratorio,undefined);assert.equal(ausente.listadosLaboratorio,undefined);assert.equal(ausente.estadoPersistencia,'NO_CONFIGURADA');
});
