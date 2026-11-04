import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validarReferenciaAdministrativa} from '../../src/dominio/laboratorio/referencias.js';
test('referencias administrativas tienen campos cerrados y exigencias específicas',()=>{
 assert.deepEqual(validarReferenciaAdministrativa('tipoMuestra',{nombre:' Sangre sintética ',codigo:' SINT ',recipiente:' Tubo ',activo:true}),{nombre:'Sangre sintética',activo:true,codigo:'SINT',recipiente:'Tubo'});
 assert.throws(()=>validarReferenciaAdministrativa('solicitante',{nombre:'Sintético',tipo:'MEDICO',activo:true}));
 assert.throws(()=>validarReferenciaAdministrativa('solicitante',{nombre:'Sintético',tipo:'INSTITUCION',numeroColegiado:'SINT',activo:true}));
 assert.throws(()=>validarReferenciaAdministrativa('proveedor',{nombre:'Sintético',activo:true}));
 assert.throws(()=>validarReferenciaAdministrativa('tipoMuestra',{nombre:'Sintético',codigo:'SINT',recipiente:'Tubo',activo:'true'}));
 for(const extra of [{actorId:'cliente'},{roles:['ADMIN_INSTITUCIONAL']},{revision:1}])assert.throws(()=>validarReferenciaAdministrativa('tipoMuestra',{nombre:'Sintético',codigo:'SINT',recipiente:'Tubo',activo:true,...extra}));
});
