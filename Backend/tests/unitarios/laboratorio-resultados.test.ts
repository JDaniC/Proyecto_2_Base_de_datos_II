import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crearOrdenLaboratorio, type PruebaVersionada } from '../../src/dominio/laboratorio/ordenes.js';
import { registrarEventoMuestra, tomarMuestra, type Muestra } from '../../src/dominio/laboratorio/muestras.js';
import { crearBorradorResultado, crearCorreccionResultado, crearRepeticionResultado, guardarBorradorResultado, validarResultado } from '../../src/dominio/laboratorio/resultados/resultado.js';

const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const prueba:PruebaVersionada={id:id(1),codigo:'HEM',nombre:'Hemograma',version:3,activo:true,metodoId:id(2),tiposMuestraIds:[id(3)],parametros:[
 {id:id(4),codigo:'HB',nombre:'Hemoglobina',tipo:'NUMERICO',obligatorio:true,unidad:'g/dL'},
 {id:id(5),codigo:'MORF',nombre:'Morfología',tipo:'CATEGORICO',obligatorio:true,opciones:['NORMAL','ALTERADA']},
 {id:id(6),codigo:'NOTA',nombre:'Nota',tipo:'TEXTO',obligatorio:false},
]};
const orden=crearOrdenLaboratorio({id:id(10),pacienteId:id(11),solicitanteId:id(12),registradoPorId:id(13),instante:'2026-11-04T12:00:00.000Z',prioridad:'RUTINA',indicaciones:''},[
 {id:id(14),prueba,centavos:1000},
]);

function muestraApta(cambios:Partial<Muestra>={}):Muestra{
 let muestra=tomarMuestra({id:id(20),ordenId:orden.id,codigo:'M-20',itemIds:[orden.items[0]!.id],tipoMuestraId:id(3),recipiente:'EDTA'},
  {id:id(21),actorId:id(22),instante:'2026-11-04T12:01:00.000Z'});
 muestra=registrarEventoMuestra(muestra,1,'RECEPCION','Íntegra',{id:id(23),actorId:id(22),instante:'2026-11-04T12:02:00.000Z'});
 muestra=registrarEventoMuestra(muestra,2,'ACEPTACION','Aceptada',{id:id(24),actorId:id(22),instante:'2026-11-04T12:03:00.000Z'});
 return {...muestra,...cambios};
}
const componentes=[
 {parametroId:id(4),valorNumerico:13.5,unidadAplicada:'g/dL',referenciaInferior:12,referenciaSuperior:16,indicador:'NORMAL' as const},
 {parametroId:id(5),valorTexto:'NORMAL',referenciaTexto:'Sin alteraciones',indicador:'NORMAL' as const},
];
const captura={id:id(30),serieId:id(31),itemId:id(14),analistaId:id(32),instante:'2026-11-04T12:04:00.000Z',componentes};

test('captura usa prueba congelada, muestra apta y conserva referencias aplicadas',()=>{
 const resultado=crearBorradorResultado(captura,orden,[muestraApta()]);
 assert.equal(resultado.estado,'BORRADOR');assert.equal(resultado.revision,1);assert.equal(resultado.version,1);
 assert.equal(resultado.pruebaId,prueba.id);assert.equal(resultado.pacienteId,orden.pacienteId);
 assert.deepEqual(resultado.componentes[0],componentes[0]);assert.equal(resultado.procedencia[0]?.muestraId,id(20));
 const catalogoModificado={...prueba,parametros:[{...prueba.parametros[0]!,unidad:'mg/L'},...prueba.parametros.slice(1)]};
 assert.notEqual(catalogoModificado.parametros[0]?.unidad,orden.items[0]?.prueba.parametros[0]?.unidad);
});

test('rechaza muestra ajena, rechazada, tipo incompatible y componente incompatible',()=>{
 const apta=muestraApta();
 for(const muestra of [{...apta,ordenId:id(99)},{...apta,itemIds:[id(99)]},{...apta,estado:'RECHAZADA' as const},{...apta,tipoMuestraId:id(99)}])
  assert.throws(()=>crearBorradorResultado(captura,orden,[muestra]));
 assert.throws(()=>crearBorradorResultado({...captura,componentes:componentes.slice(0,1)},orden,[apta]));
 assert.throws(()=>crearBorradorResultado({...captura,componentes:[{...componentes[0]!,valorNumerico:undefined,valorTexto:'13.5'},componentes[1]!] as typeof componentes},orden,[apta]));
 assert.throws(()=>crearBorradorResultado({...captura,componentes:[{...componentes[0]!,unidadAplicada:'mg/L'},componentes[1]!]},orden,[apta]));
 assert.throws(()=>crearBorradorResultado({...captura,componentes:[componentes[0]!,{...componentes[1]!,valorTexto:'DESCONOCIDA'}]},orden,[apta]));
});

test('borrador usa revisión optimista y un VALIDADO nunca se sobrescribe',()=>{
 const borrador=crearBorradorResultado(captura,orden,[muestraApta()]);
 const editado=guardarBorradorResultado(borrador,1,{analistaId:id(32),instante:'2026-11-04T12:05:00.000Z',componentes,observaciones:'Revisado'},orden,[muestraApta()]);
 assert.equal(editado.revision,2);assert.equal(editado.observaciones,'Revisado');assert.equal(editado.serieId,borrador.serieId);
 assert.throws(()=>guardarBorradorResultado(borrador,2,{analistaId:id(32),instante:'2026-11-04T12:05:00.000Z',componentes},orden,[muestraApta()]),{codigo:'VERSION_DESACTUALIZADA'});
 const validado=validarResultado(editado,2,id(40),'2026-11-04T12:06:00.000Z');
 assert.equal(validado.estado,'VALIDADO');assert.equal(validado.revision,3);assert.equal(validado.validadorId,id(40));
 assert.throws(()=>validarResultado(editado,1,id(40),'2026-11-04T12:06:00.000Z'),{codigo:'VERSION_DESACTUALIZADA'});
 assert.throws(()=>guardarBorradorResultado(validado,3,{analistaId:id(32),instante:'2026-11-04T12:07:00.000Z',componentes},orden,[muestraApta()]),{codigo:'ESTADO_INVALIDO'});
 assert.throws(()=>validarResultado(validado,3,id(40),'2026-11-04T12:07:00.000Z'),{codigo:'ESTADO_INVALIDO'});
});

test('corrección crea siguiente versión en la misma serie y repetición crea serie nueva',()=>{
 const anterior=validarResultado(crearBorradorResultado(captura,orden,[muestraApta()]),1,id(40),'2026-11-04T12:06:00.000Z');
 const correccion=crearCorreccionResultado(anterior,{...captura,id:id(41),serieId:id(99),instante:'2026-11-04T12:07:00.000Z'},'Ajuste verificado',orden,[muestraApta()]);
 assert.equal(correccion.serieId,anterior.serieId);assert.equal(correccion.version,2);assert.equal(correccion.resultadoAnteriorId,anterior.id);assert.equal(correccion.estado,'BORRADOR');
 const repeticion=crearRepeticionResultado(anterior,{...captura,id:id(42),serieId:id(43),instante:'2026-11-04T12:08:00.000Z'},orden,[muestraApta({id:id(44),codigo:'M-44'})]);
 assert.equal(repeticion.version,1);assert.equal(repeticion.serieId,id(43));assert.equal(repeticion.resultadoRepetidoDeId,anterior.id);
 assert.notEqual(repeticion.procedencia[0]?.muestraId,anterior.procedencia[0]?.muestraId);
 assert.throws(()=>crearCorreccionResultado(anterior,{...captura,id:id(41)},' ',orden,[muestraApta()]));
 assert.throws(()=>crearRepeticionResultado(anterior,{...captura,id:id(42),serieId:anterior.serieId},orden,[muestraApta()]));
});
