import assert from 'node:assert/strict';
import {test} from 'node:test';
import {crearBundlesInstitucionales} from '../../src/composicion/crear-bundles-institucionales.js';
import type { BundleInstitucional } from '../../src/aplicacion/puertos/bundle-institucional.js';
import {escenarioClinico} from '../fixtures/clinica-comun.js';
test('composición real conserva puertos pediátricos; la falta de configuración no los inventa',()=>{
 const e=escenarioClinico('CENTRO_MEDICO_PEDIATRICO');
 const antecedentesPediatricos={porPaciente:async()=>({version:0,alergias:[]})},responsablesPediatricos={porDocumento:async()=>null};
 const vacunasPediatricas:NonNullable<BundleInstitucional['vacunasPediatricas']>={obtenerCatalogo:async()=>[],obtenerVersionEsquema:async()=>null,obtenerEsquemas:async()=>[],obtenerAplicaciones:async()=>[],obtenerPorId:async()=>null};
 const [bundle]=crearBundlesInstitucionales(['CENTRO_MEDICO_PEDIATRICO'],{CENTRO_MEDICO_PEDIATRICO:{cuenta:e.bundle.cuenta!,antecedentesPediatricos,responsablesPediatricos,vacunasPediatricas}});
 assert.equal(bundle!.vacunasPediatricas,vacunasPediatricas);
 assert.equal(crearBundlesInstitucionales(['CENTRO_MEDICO_PEDIATRICO'])[0]!.vacunasPediatricas,undefined);
 assert.equal(bundle!.antecedentesPediatricos,antecedentesPediatricos);assert.equal(bundle!.responsablesPediatricos,responsablesPediatricos);
 assert.equal(crearBundlesInstitucionales(['CENTRO_MEDICO_PEDIATRICO'])[0]!.antecedentesPediatricos,undefined);
});
