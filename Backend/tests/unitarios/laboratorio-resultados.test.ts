import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crearOrdenLaboratorio, type PruebaVersionada } from '../../src/dominio/laboratorio/ordenes.js';
import { registrarEventoMuestra, tomarMuestra, type Muestra } from '../../src/dominio/laboratorio/muestras.js';
import { completarOrdenPorResultado, crearBorradorResultado, crearCorreccionResultado, crearRepeticionResultado, guardarBorradorResultado, validarResultado, verificarProcedenciaResultado } from '../../src/dominio/laboratorio/resultados/resultado.js';
import { documentoResultadoLaboratorio, mapearResultadoLaboratorio } from '../../src/adaptadores/salida/mongodb/laboratorio/documento-resultado.js';
import { crearContextoAutenticado, type CuentaAutorizada } from '../../src/aplicacion/puertos/contexto-autenticado.js';
import { GestionarResultadoLaboratorio } from '../../src/aplicacion/casos-uso/laboratorio/gestionar-resultado.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';
import { uuidPublico } from '../../src/dominio/compartido/uuid.js';
import { instanteUtc } from '../../src/dominio/compartido/instante-utc.js';

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
const tiposMuestra=new Map([[id(3),'Sangre total']]);

test('captura usa prueba congelada, muestra apta y conserva referencias aplicadas',()=>{
 const resultado=crearBorradorResultado(captura,orden,[muestraApta()],tiposMuestra);
 assert.equal(resultado.estado,'BORRADOR');assert.equal(resultado.revision,1);assert.equal(resultado.version,1);
 assert.equal(resultado.pruebaId,prueba.id);assert.equal(resultado.pacienteId,orden.pacienteId);
 assert.deepEqual(resultado.componentes[0],componentes[0]);assert.equal(resultado.procedencia[0]?.muestraId,id(20));
 const catalogoModificado={...prueba,parametros:[{...prueba.parametros[0]!,unidad:'mg/L'},...prueba.parametros.slice(1)]};
 assert.notEqual(catalogoModificado.parametros[0]?.unidad,orden.items[0]?.prueba.parametros[0]?.unidad);
});

test('rechaza muestra ajena, rechazada, tipo incompatible y componente incompatible',()=>{
 const apta=muestraApta();
 for(const muestra of [{...apta,ordenId:id(99)},{...apta,itemIds:[id(99)]},{...apta,estado:'RECHAZADA' as const},{...apta,tipoMuestraId:id(99)}])
  assert.throws(()=>crearBorradorResultado(captura,orden,[muestra],tiposMuestra));
 assert.throws(()=>crearBorradorResultado({...captura,componentes:componentes.slice(0,1)},orden,[apta],tiposMuestra));
 assert.throws(()=>crearBorradorResultado({...captura,componentes:[{...componentes[0]!,valorNumerico:undefined,valorTexto:'13.5'},componentes[1]!] as typeof componentes},orden,[apta],tiposMuestra));
 assert.throws(()=>crearBorradorResultado({...captura,componentes:[{...componentes[0]!,unidadAplicada:'mg/L'},componentes[1]!]},orden,[apta],tiposMuestra));
 assert.throws(()=>crearBorradorResultado({...captura,componentes:[componentes[0]!,{...componentes[1]!,valorTexto:'DESCONOCIDA'}]},orden,[apta],tiposMuestra));
});

test('borrador usa revisión optimista y un VALIDADO nunca se sobrescribe',()=>{
 const borrador=crearBorradorResultado(captura,orden,[muestraApta()],tiposMuestra);
 const editado=guardarBorradorResultado(borrador,1,{analistaId:id(32),instante:'2026-11-04T12:05:00.000Z',componentes,observaciones:'Revisado'},orden,[muestraApta()],tiposMuestra);
 assert.equal(editado.revision,2);assert.equal(editado.observaciones,'Revisado');assert.equal(editado.serieId,borrador.serieId);
 assert.throws(()=>guardarBorradorResultado(borrador,2,{analistaId:id(32),instante:'2026-11-04T12:05:00.000Z',componentes},orden,[muestraApta()],tiposMuestra),{codigo:'VERSION_DESACTUALIZADA'});
 const validado=validarResultado(editado,2,id(40),'2026-11-04T12:06:00.000Z');
 assert.equal(validado.estado,'VALIDADO');assert.equal(validado.revision,3);assert.equal(validado.validadorId,id(40));
 assert.throws(()=>validarResultado(editado,1,id(40),'2026-11-04T12:06:00.000Z'),{codigo:'VERSION_DESACTUALIZADA'});
 assert.throws(()=>guardarBorradorResultado(validado,3,{analistaId:id(32),instante:'2026-11-04T12:07:00.000Z',componentes},orden,[muestraApta()],tiposMuestra),{codigo:'ESTADO_INVALIDO'});
 assert.throws(()=>validarResultado(validado,3,id(40),'2026-11-04T12:07:00.000Z'),{codigo:'ESTADO_INVALIDO'});
});

test('corrección crea siguiente versión en la misma serie y repetición crea serie nueva',()=>{
 const anterior=validarResultado(crearBorradorResultado(captura,orden,[muestraApta()],tiposMuestra),1,id(40),'2026-11-04T12:06:00.000Z');
 const correccion=crearCorreccionResultado(anterior,{...captura,id:id(41),serieId:id(99),instante:'2026-11-04T12:07:00.000Z'},'Ajuste verificado',orden,[muestraApta()],tiposMuestra);
 assert.equal(correccion.serieId,anterior.serieId);assert.equal(correccion.version,2);assert.equal(correccion.resultadoAnteriorId,anterior.id);assert.equal(correccion.estado,'BORRADOR');
 const repeticion=crearRepeticionResultado(anterior,{...captura,id:id(42),serieId:id(43),instante:'2026-11-04T12:08:00.000Z'},orden,[muestraApta({id:id(44),codigo:'M-44'})],tiposMuestra);
 assert.equal(repeticion.version,1);assert.equal(repeticion.serieId,id(43));assert.equal(repeticion.resultadoRepetidoDeId,anterior.id);
 assert.notEqual(repeticion.procedencia[0]?.muestraId,anterior.procedencia[0]?.muestraId);
 assert.throws(()=>crearCorreccionResultado(anterior,{...captura,id:id(41)},' ',orden,[muestraApta()],tiposMuestra));
 assert.throws(()=>crearRepeticionResultado(anterior,{...captura,id:id(42),serieId:anterior.serieId},orden,[muestraApta()],tiposMuestra));
});

test('validación revalida procedencia y completa ítem y orden de forma derivada',()=>{
 const muestra=muestraApta();
 const validado=validarResultado(crearBorradorResultado(captura,orden,[muestra],tiposMuestra),1,id(40),'2026-11-04T12:06:00.000Z');
 assert.doesNotThrow(()=>verificarProcedenciaResultado(validado,orden,[muestra],tiposMuestra));
 assert.throws(()=>verificarProcedenciaResultado(validado,orden,[{...muestra,codigo:'CAMBIADO'}],tiposMuestra));
 assert.throws(()=>verificarProcedenciaResultado(validado,orden,[{...muestra,estado:'RECHAZADA'}],tiposMuestra));
 const completada=completarOrdenPorResultado(orden,validado);
 assert.equal(completada.items[0]?.estado,'COMPLETADO');assert.equal(completada.estado,'COMPLETADA');assert.equal(completada.version,orden.version+1);
 assert.equal(completarOrdenPorResultado(completada,validado),completada);
});

test('mapper Mongo conserva revisión, serie, referencias e historia de validación',()=>{
 const validado=validarResultado(crearBorradorResultado(captura,orden,[muestraApta()],tiposMuestra),1,id(40),'2026-11-04T12:06:00.000Z');
 const doc=documentoResultadoLaboratorio(validado);
 assert.equal(doc.revision,2);assert.equal(doc.serie_resultado_id,id(31));assert.equal(doc.componentes[0]?.referencia_inferior,12);
 assert.deepEqual(mapearResultadoLaboratorio(doc),validado);
 assert.throws(()=>mapearResultadoLaboratorio({...doc,paciente_id:undefined} as unknown as typeof doc));
 assert.throws(()=>mapearResultadoLaboratorio({...doc,estado:'BORRADOR'}));
 assert.throws(()=>mapearResultadoLaboratorio({...doc,componentes:[doc.componentes[0]!,doc.componentes[0]!]}));
});

test('caso de uso separa rol de analista/validador y rechaza autoridad enviada por cliente',async()=>{
 const cuenta=(rol:'ANALISTA_LABORATORIO'|'VALIDADOR_LABORATORIO',permiso:'resultados.analizar'|'resultados.validar'):CuentaAutorizada=>({id:uuidPublico(id(80)),uid:`uid-${rol}`,institucion:'LABORATORIO_CLINICO',estado:'ACTIVA',roles:[rol],permisos:[permiso],version:versionPositiva(1)});
 const ahora=instanteUtc('2026-11-04T12:00:00.000Z');
 const contexto=(c:CuentaAutorizada)=>crearContextoAutenticado({uid:c.uid,institucion:'LABORATORIO_CLINICO',emitidoEn:ahora},c,uuidPublico(id(81)));
 const caso=new GestionarResultadoLaboratorio({reloj:{ahora:()=>ahora},ids:{nuevo:()=>uuidPublico(id(82))},hash:{sha256:async()=> 'a'.repeat(64)}});
 const bundle={institucion:'LABORATORIO_CLINICO' as const,estadoPersistencia:'DISPONIBLE' as const};
 const analista=cuenta('ANALISTA_LABORATORIO','resultados.analizar'),validador=cuenta('VALIDADOR_LABORATORIO','resultados.validar');
 await assert.rejects(()=>caso.ejecutar('validar',{contexto:contexto(analista),bundle,id:uuidPublico(id(30)),claveIdempotencia:uuidPublico(id(83)),entrada:{versionEsperada:1}}),{codigo:'SIN_PERMISO'});
 await assert.rejects(()=>caso.ejecutar('capturar',{contexto:contexto(validador),bundle,claveIdempotencia:uuidPublico(id(83)),entrada:{}}),{codigo:'SIN_PERMISO'});
 await assert.rejects(()=>caso.ejecutar('capturar',{contexto:contexto(analista),bundle,claveIdempotencia:uuidPublico(id(83)),entrada:{ordenId:id(10),itemId:id(14),muestraIds:[id(20)],componentes,analistaId:id(99)}}),{codigo:'SOLICITUD_INVALIDA'});
});
